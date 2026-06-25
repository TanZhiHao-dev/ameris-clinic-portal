import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, transactions } from '#/db/schema'
import { requireUser } from './_session'
import {
  clientKey,
  createSnapTransaction,
  fetchMidtransStatus,
  isProduction,
  midtransConfigured,
  settlePayment,
  simulationEnabled,
  snapJsUrl,
} from './_midtrans'

// What the patient pays online now: full total, or 50% for the DP plan.
const payNowAmount = (total: number, plan: string | null) =>
  plan === 'dp' ? Math.round(total / 2) : total

// Snap channels offered for the "Transfer Bank" method: QRIS + every Virtual
// Account bank. Both settle automatically via the webhook — no manual verify.
const QRIS_VA_CHANNELS = [
  'qris',
  'other_qris',
  'bca_va',
  'bni_va',
  'bri_va',
  'cimb_va',
  'permata_va',
  'echannel', // Mandiri Bill Payment
  'other_va',
]

// Load a patient's payable booking + its transaction, enforcing ownership.
// Both Online and Transfer Bank pay through Snap; only Offline (pay at clinic)
// has no gateway session.
async function loadOwnedPayableTxn(userId: string, bookingId: string) {
  const [bk] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)))
  if (!bk) throw new Error('Booking tidak ditemukan.')
  const [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, bookingId))
  if (!txn) throw new Error('Transaksi tidak ditemukan.')
  if (txn.paymentMethod === 'Offline') throw new Error('Booking ini dibayar di klinik.')
  return { bk, txn }
}

// ── Open a Snap payment session for a pending online booking ──
export const createSnapPayment = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const { bk, txn } = await loadOwnedPayableTxn(u.id, data.bookingId)
    if (txn.paymentStatus === 'Lunas') throw new Error('Pembayaran sudah lunas.')

    const amount = payNowAmount(bk.total, txn.paymentPlan)
    // Fresh order_id per attempt so Midtrans never rejects a retry of an
    // expired/cancelled session.
    const orderId = `${bk.id}-${crypto.randomUUID().slice(0, 8)}`

    if (!midtransConfigured) {
      // No real keys → the gateway can't actually charge. In dev we fall back to
      // the in-app sandbox dialog; in production we REFUSE rather than let a
      // visitor fake a paid booking. Configure MIDTRANS_SERVER_KEY to go live.
      if (!simulationEnabled) {
        throw new Error('Pembayaran online belum aktif. Silakan hubungi klinik untuk menyelesaikan pembayaran.')
      }
      await db.update(transactions).set({ midtransOrderId: orderId }).where(eq(transactions.id, txn.id))
      return { simulated: true as const, orderId, amount, bookingId: bk.id, plan: txn.paymentPlan ?? 'full' }
    }

    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bk.id))
    const snapItems =
      txn.paymentPlan === 'dp'
        ? [{ id: bk.id, name: `DP 50% · ${bk.id}`, price: amount, quantity: 1 }]
        : items.map((it) => ({
            id: it.treatmentId ?? it.id,
            name: it.nameAtBooking.slice(0, 50), // Midtrans caps item name at 50 chars
            price: it.priceAtBooking,
            quantity: it.qty,
          }))

    const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:3000'
    const { token, redirectUrl } = await createSnapTransaction({
      orderId,
      grossAmount: amount,
      items: snapItems,
      customer: { first_name: u.name, email: u.email, phone: u.phone ?? undefined },
      finishUrl: `${appUrl}/akun/booking/${bk.id}`,
      // "Transfer Bank" → QRIS + Virtual Account only; "Online" → all channels.
      ...(txn.paymentMethod === 'Transfer' ? { enabledPayments: QRIS_VA_CHANNELS } : {}),
    })

    await db
      .update(transactions)
      .set({ midtransOrderId: orderId, snapToken: token })
      .where(eq(transactions.id, txn.id))

    return {
      simulated: false as const,
      token,
      redirectUrl,
      orderId,
      amount,
      bookingId: bk.id,
      plan: txn.paymentPlan ?? 'full',
      clientKey,
      snapJsUrl,
      isProduction,
    }
  })

// ── Verify a client-reported success against Midtrans, then return DB status ──
// onSuccess from snap.js is client-side; with real keys we re-check server-side
// so the DB is authoritative even if the async webhook hasn't arrived yet.
export const confirmPayment = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const { txn } = await loadOwnedPayableTxn(u.id, data.bookingId)
    if (midtransConfigured && txn.midtransOrderId) {
      const status = await fetchMidtransStatus(txn.midtransOrderId)
      if (status?.transaction_status) {
        await settlePayment({
          orderId: txn.midtransOrderId,
          transactionStatus: status.transaction_status,
          fraudStatus: status.fraud_status,
        })
      }
    }
    const [fresh] = await db.select().from(transactions).where(eq(transactions.id, txn.id))
    return {
      paymentStatus: fresh.paymentStatus,
      paid: fresh.paidAt != null,
      midtransStatus: fresh.midtransStatus,
    }
  })

// ── Dev-only: resolve a simulated Snap session (no real Midtrans keys) ──
export const simulatePaymentResult = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), outcome: z.enum(['success', 'pending']) }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    // Only the dev sandbox may settle a fake payment — never with real keys, and
    // never in production (where !simulationEnabled even without keys).
    if (!simulationEnabled) throw new Error('Simulasi pembayaran nonaktif.')
    // Ownership: the order_id prefix must be a booking owned by this user.
    const bookingId = data.orderId.slice(0, data.orderId.lastIndexOf('-'))
    const [bk] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, u.id)))
    if (!bk) throw new Error('Booking tidak ditemukan.')
    const res = await settlePayment({
      orderId: data.orderId,
      transactionStatus: data.outcome === 'success' ? 'settlement' : 'pending',
    })
    return { paymentStatus: res?.paymentStatus ?? 'Pending', settled: res?.settled ?? false }
  })
