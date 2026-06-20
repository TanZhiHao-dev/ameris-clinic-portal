// Server-only Midtrans Snap helper. Reads MIDTRANS_SERVER_KEY and touches the
// DB, so it must never be imported by a client component (underscore prefix =
// server-only, same rule as _appointments.ts).
import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { bookings, transactions } from '#/db/schema'

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? ''
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? ''
const IS_PROD = process.env.MIDTRANS_IS_PRODUCTION === 'true'

// The real gateway is active only when a server key is configured. Without one
// we fall back to "simulation" mode so checkout stays demoable (the frontend
// shows an in-app sandbox dialog instead of the hosted Snap popup).
export const midtransConfigured = SERVER_KEY.length > 0
export const clientKey = CLIENT_KEY
export const isProduction = IS_PROD

const SNAP_BASE = IS_PROD ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
const API_BASE = IS_PROD ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'

// snap.js script the browser loads to open the hosted payment popup.
export const snapJsUrl = `${SNAP_BASE}/snap/snap.js`

const basicAuth = () => 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64')

export type SnapItem = { id: string; name: string; price: number; quantity: number }
export type SnapCustomer = { first_name: string; email: string; phone?: string }

// Open a Snap transaction → { token, redirectUrl }. Throws on a non-2xx.
export async function createSnapTransaction(input: {
  orderId: string
  grossAmount: number
  items: SnapItem[]
  customer: SnapCustomer
  finishUrl?: string
}): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: basicAuth(),
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.grossAmount },
      item_details: input.items,
      customer_details: input.customer,
      ...(input.finishUrl ? { callbacks: { finish: input.finishUrl } } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Midtrans Snap error ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { token: string; redirect_url: string }
  return { token: json.token, redirectUrl: json.redirect_url }
}

// Query the authoritative status of an order from Midtrans. Used to verify a
// client-reported success when no webhook reached us (e.g. local dev).
export async function fetchMidtransStatus(
  orderId: string,
): Promise<{ transaction_status?: string; fraud_status?: string } | null> {
  const res = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: basicAuth() },
  })
  if (!res.ok) return null
  return (await res.json()) as { transaction_status?: string; fraud_status?: string }
}

// Verify the SHA-512 signature Midtrans attaches to every webhook notification.
export function verifySignature(p: {
  order_id: string
  status_code: string
  gross_amount: string
  signature_key: string
}): boolean {
  const expected = createHash('sha512')
    .update(p.order_id + p.status_code + p.gross_amount + SERVER_KEY)
    .digest('hex')
  return expected === p.signature_key
}

const PAID = new Set(['capture', 'settlement'])

// Apply a Midtrans transaction status to our DB. Idempotent. Shared by the
// webhook, the post-popup confirm call, and the dev simulator.
export async function settlePayment(args: {
  orderId: string
  transactionStatus: string
  fraudStatus?: string
}): Promise<{ bookingId: string; paymentStatus: string; settled: boolean } | null> {
  const { orderId, transactionStatus, fraudStatus } = args
  // Resolve the transaction: prefer the stored order_id, fall back to the
  // bookingId encoded as the order_id prefix (AMR-1234-<suffix>).
  let [txn] = await db.select().from(transactions).where(eq(transactions.midtransOrderId, orderId))
  if (!txn) {
    const bookingId = orderId.slice(0, orderId.lastIndexOf('-'))
    if (bookingId) [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, bookingId))
  }
  if (!txn) return null

  const isPaid = PAID.has(transactionStatus) && fraudStatus !== 'deny' && fraudStatus !== 'challenge'

  if (isPaid) {
    // 'full' plan → fully paid (Lunas); 'dp' → DP recorded, balance settled at
    // the clinic on completion (keeps the existing Pending → Lunas model).
    const fullyPaid = (txn.paymentPlan ?? 'full') === 'full'
    await db
      .update(transactions)
      .set({
        midtransStatus: transactionStatus,
        paidAt: txn.paidAt ?? new Date(),
        ...(fullyPaid ? { paymentStatus: 'Lunas' } : {}),
      })
      .where(eq(transactions.id, txn.id))
    // A paid booking is confirmed — only promote from the initial 'Menunggu'
    // state so we never downgrade Hadir/Selesai.
    await db
      .update(bookings)
      .set({ status: 'Dikonfirmasi' })
      .where(sql`${bookings.id} = ${txn.bookingId} and ${bookings.status} = 'Menunggu'`)
    return { bookingId: txn.bookingId, paymentStatus: fullyPaid ? 'Lunas' : 'Pending', settled: true }
  }

  // pending / failed → record the latest status, leave paymentStatus untouched.
  await db.update(transactions).set({ midtransStatus: transactionStatus }).where(eq(transactions.id, txn.id))
  return { bookingId: txn.bookingId, paymentStatus: txn.paymentStatus, settled: false }
}
