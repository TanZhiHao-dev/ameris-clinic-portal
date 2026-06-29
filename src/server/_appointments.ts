// Server-only helpers that read the DB. Kept OUT of any file that client
// components import directly, so the TanStack Start compiler can keep the
// `db` import (Node-only PGlite) off the client bundle.
import { inArray } from 'drizzle-orm'
import { db } from '#/db'
import { bookingItems, bookings, transactions } from '#/db/schema'
import { user } from '#/db/auth-schema'

type ItemRow = typeof bookingItems.$inferSelect
const payLabel = (m: string) => (m === 'Offline' ? 'Klinik' : m === 'Transfer' ? 'Transfer Bank' : 'Online')

// Assemble UI-shaped appointments for a set of booking rows.
export async function assemble(bks: (typeof bookings.$inferSelect)[]) {
  if (bks.length === 0) return []
  const ids = bks.map((b) => b.id)
  const items = await db.select().from(bookingItems).where(inArray(bookingItems.bookingId, ids))
  const txns = await db.select().from(transactions).where(inArray(transactions.bookingId, ids))
  const itemsByBk = new Map<string, ItemRow[]>()
  for (const it of items) {
    const arr = itemsByBk.get(it.bookingId) ?? []
    arr.push(it)
    itemsByBk.set(it.bookingId, arr)
  }
  const txnByBk = new Map(txns.map((t) => [t.bookingId, t]))
  return bks.map((b) => {
    const txn = txnByBk.get(b.id)
    return {
      id: b.id,
      userId: b.userId,
      items: (itemsByBk.get(b.id) ?? []).map((i) => ({ name: i.nameAtBooking, price: i.priceAtBooking, qty: i.qty })),
      date: b.bookingDate,
      time: b.bookingTime,
      status: b.status,
      payment: txn ? payLabel(txn.paymentMethod) : 'Online',
      payStatus: txn?.paymentStatus ?? 'Pending',
      paymentPlan: txn?.paymentPlan ?? 'full',
      paidAt: txn?.paidAt ? txn.paidAt.toISOString() : null,
      total: b.total, // already net of any voucher discount
      discount: b.discountAmount ?? 0,
    }
  })
}

export type Assembled = Awaited<ReturnType<typeof assemble>>[number]

// Attach patientId/patientName for owner-facing views.
export async function attachNames(list: Assembled[]) {
  const names = await db.select({ id: user.id, name: user.name }).from(user)
  const nameById = new Map(names.map((n) => [n.id, n.name]))
  return list.map((b) => ({ ...b, patientId: b.userId, patientName: nameById.get(b.userId) ?? 'Pasien' }))
}
