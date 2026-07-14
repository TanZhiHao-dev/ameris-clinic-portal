import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, loyaltyTransactions, transactions, treatments, voucherRedemptions, vouchers } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { loyaltyPointsFor } from '#/data/clinic'
import { requireOwner } from './_session'
import { assemble, attachNames } from './_appointments'
import { voucherDiscountFor, voucherTreatmentScope } from './_vouchers'

export const ownerTransactions = createServerFn({ method: 'GET' })
  .validator(z.object({ tab: z.enum(['Semua', 'Pending', 'Lunas']).optional() }).optional())
  .handler(async ({ data }) => {
    await requireOwner()
    const bks = await db
      .select()
      .from(bookings)
      .where(sql`${bookings.status} <> 'Batal'`)
      .orderBy(desc(bookings.bookingDate))
    const rows = await attachNames(await assemble(bks))
    const totalLunas = rows.filter((r) => r.payStatus === 'Lunas').reduce((s, r) => s + r.total, 0)
    const totalPending = rows.filter((r) => r.payStatus === 'Pending').reduce((s, r) => s + r.total, 0)
    const tab = data?.tab ?? 'Semua'
    const filtered = tab === 'Semua' ? rows : rows.filter((r) => r.payStatus === tab)
    return { rows: filtered, totalLunas, totalPending }
  })

// Full item detail for the edit dialog — treatmentId + the charged unit price so
// the owner can correct a mis-keyed walk-in or bolt on an upsell.
export const ownerBookingDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id)).limit(1)
    if (!b) throw new Error('Transaksi tidak ditemukan.')
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, b.id))
    const [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, b.id)).limit(1)
    const [v] = b.voucherId ? await db.select({ name: vouchers.name }).from(vouchers).where(eq(vouchers.id, b.voucherId)).limit(1) : []
    return {
      id: b.id,
      status: b.status,
      payStatus: txn?.paymentStatus ?? 'Pending',
      paymentMethod: (txn?.paymentMethod ?? 'Offline') as 'Online' | 'Offline' | 'Transfer',
      hasVoucher: !!b.voucherId,
      voucherName: b.voucherId ? (v?.name ?? 'Voucher') : null,
      discountAmount: b.discountAmount,
      editable: b.status !== 'Batal',
      items: items.map((i) => ({ treatmentId: i.treatmentId, name: i.nameAtBooking, unitPrice: i.priceAtBooking, qty: i.qty })),
    }
  })

// Edit a transaction's line items (fix a wrong entry / add an upsell). Prices are
// clamped to the catalog so a line can only be discounted, never marked up. The
// booking total, the linked transaction amount, and (if already settled) the
// patient's loyalty points are all reconciled to the new total.
export const ownerUpdateBooking = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      bookingId: z.string(),
      items: z
        .array(z.object({ treatmentId: z.string().min(1), qty: z.number().int().positive(), unitPrice: z.number().int().min(0) }))
        .min(1),
      paymentMethod: z.enum(['Offline', 'Transfer']).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1)
    if (!b) throw new Error('Transaksi tidak ditemukan.')
    if (b.status === 'Batal') throw new Error('Transaksi dibatalkan — tidak bisa diedit.')

    const ids = [...new Set(data.items.map((i) => i.treatmentId))]
    const catalog = await db.select().from(treatments).where(inArray(treatments.id, ids))
    const byId = new Map(catalog.map((t) => [t.id, t]))
    let subtotal = 0
    const rows = data.items.map((i) => {
      const t = byId.get(i.treatmentId)
      if (!t) throw new Error('Treatment tidak ditemukan.')
      const promo = !!(t.isPromo && t.promoNow != null && t.promoNow < t.price)
      const catalogUnit = promo ? t.promoNow! : t.price
      const unit = Math.min(Math.max(0, Math.round(i.unitPrice)), catalogUnit)
      subtotal += unit * i.qty
      return { treatmentId: t.id, name: t.name, price: unit, qty: i.qty, promoApplied: promo }
    })

    // A voucher redeemed on this booking is recomputed against the NEW items
    // under its own terms (scope, %, minimum spend) — an upsell inside a
    // cart-wide % voucher gets the discount too, and the redemption ledger is
    // kept in sync so the patient's account still shows the true amount. The
    // voucher's validity window is NOT re-checked: it was valid when redeemed.
    let discount = 0
    if (b.voucherId) {
      const [v] = await db.select().from(vouchers).where(eq(vouchers.id, b.voucherId)).limit(1)
      if (v) {
        const scope = await voucherTreatmentScope(v)
        discount = voucherDiscountFor(v, scope, rows.map((r) => ({ treatmentId: r.treatmentId, unit: r.price, qty: r.qty, promoApplied: r.promoApplied })))
      } else {
        // Voucher since deleted — keep the recorded rupiah discount, clamped.
        discount = Math.min(b.discountAmount, subtotal)
      }
      await db
        .update(voucherRedemptions)
        .set({ amountDiscounted: discount })
        .where(and(eq(voucherRedemptions.bookingId, b.id), eq(voucherRedemptions.userId, b.userId)))
    }
    const total = Math.max(0, subtotal - discount)

    // Swap the items out wholesale, then re-point the money at the new total.
    await db.delete(bookingItems).where(eq(bookingItems.bookingId, b.id))
    await db.insert(bookingItems).values(
      rows.map((r) => ({ id: crypto.randomUUID(), bookingId: b.id, treatmentId: r.treatmentId, nameAtBooking: r.name, priceAtBooking: r.price, qty: r.qty })),
    )
    await db.update(bookings).set({ total, discountAmount: discount }).where(eq(bookings.id, b.id))
    const [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, b.id)).limit(1)
    await db
      .update(transactions)
      .set({ amount: total, ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}) })
      .where(eq(transactions.bookingId, b.id))

    // Reconcile loyalty only when points were already granted (settled). A still
    // -Pending booking grants points later at completion, using the new total.
    let pointsDelta = 0
    if (txn?.paymentStatus === 'Lunas') {
      const grants = await db.select({ delta: loyaltyTransactions.delta }).from(loyaltyTransactions).where(eq(loyaltyTransactions.bookingId, b.id))
      const granted = grants.reduce((s, g) => s + g.delta, 0)
      pointsDelta = loyaltyPointsFor(total) - granted
      if (pointsDelta !== 0) {
        await db.update(user).set({ loyaltyPoints: sql`coalesce(${user.loyaltyPoints}, 0) + ${pointsDelta}` }).where(eq(user.id, b.userId))
        await db.insert(loyaltyTransactions).values({ id: crypto.randomUUID(), userId: b.userId, label: 'Penyesuaian transaksi', delta: pointsDelta, bookingId: b.id })
      }
    }
    return { id: b.id, total, discount, pointsDelta }
  })

export const ownerApprovePayment = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const [b] = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, data.bookingId))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status === 'Batal') throw new Error('Tidak bisa approve pembayaran untuk booking yang dibatalkan.')
    await db.update(transactions).set({ paymentStatus: 'Lunas' }).where(and(eq(transactions.bookingId, data.bookingId), sql`${transactions.paymentStatus} <> 'Lunas'`))
    return { bookingId: data.bookingId, paymentStatus: 'Lunas' as const }
  })
