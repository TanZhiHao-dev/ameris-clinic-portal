import { createServerFn } from '@tanstack/react-start'
import { eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, loyaltyTransactions, transactions, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { loyaltyPointsFor } from '#/data/clinic'
import { requireStaff } from './_session'

// Clinic-local (WIB) date + time so a late-night walk-in lands on the correct
// calendar day even when the server clock is UTC.
const wibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
const wibTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })

// POS / walk-in sale — staff (owner or doctor) records an in-clinic visit that
// never went through online booking. Reuses the booking/item/transaction tables.
//   settleNow = true  → kasir took payment now: Selesai + Lunas + loyalty points.
//   settleNow = false → doctor logged the treatment during consultation: Hadir +
//                        Pending, so the owner settles it later via Transaksi.
export const posCreateSale = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      patientId: z.string(),
      items: z
        .array(
          z.object({
            treatmentId: z.string(),
            qty: z.number().int().positive(),
            // Manual walk-in discount off the unit: 'rp' = rupiah, 'pct' = percent.
            discountMode: z.enum(['rp', 'pct']).optional(),
            discountValue: z.number().min(0).optional(),
          }),
        )
        .min(1),
      beauticianId: z.string().nullable().optional(),
      doctorId: z.string().nullable().optional(),
      // Tunai (cash) = Offline; QRIS/transfer = Transfer.
      paymentMethod: z.enum(['Offline', 'Transfer']),
      settleNow: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaff()

    const [p] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, data.patientId)).limit(1)
    if (!p || p.role !== 'pasien') throw new Error('Pasien tidak ditemukan.')

    // Authoritative prices from the catalog — never trust client-sent amounts.
    const ids = data.items.map((i) => i.treatmentId)
    const catalog = await db.select().from(treatments).where(inArray(treatments.id, ids))
    const byId = new Map(catalog.map((t) => [t.id, t]))
    let total = 0
    const rows = data.items.map((i) => {
      const t = byId.get(i.treatmentId)
      if (!t) throw new Error('Treatment tidak ditemukan.')
      const promo = t.isPromo && t.promoNow != null && t.promoNow < t.price
      const catalogUnit = promo ? t.promoNow! : t.price
      // Manual discount is authoritative-clamped from the catalog price, so it
      // can only ever lower the price (a discount) — never mark it up. The net
      // price is what we persist as the line's priceAtBooking (the amount the
      // patient actually pays), so receipts stay consistent (subtotal = total).
      const dv = i.discountValue ?? 0
      const discPerUnit =
        i.discountMode === 'pct'
          ? Math.round((catalogUnit * Math.min(Math.max(dv, 0), 100)) / 100)
          : Math.min(Math.max(dv, 0), catalogUnit)
      const unit = Math.max(0, catalogUnit - discPerUnit)
      total += unit * i.qty
      return { treatmentId: t.id, name: t.name, price: unit, qty: i.qty }
    })

    const now = new Date()
    const id = 'AMR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
    const settled = data.settleNow

    await db.insert(bookings).values({
      id,
      userId: data.patientId,
      bookingDate: wibDate.format(now),
      bookingTime: wibTime.format(now),
      status: settled ? 'Selesai' : 'Hadir',
      total,
      beauticianId: data.beauticianId ?? null,
      doctorId: data.doctorId ?? null,
      source: 'walkin',
    })
    await db.insert(bookingItems).values(
      rows.map((r) => ({ id: crypto.randomUUID(), bookingId: id, treatmentId: r.treatmentId, nameAtBooking: r.name, priceAtBooking: r.price, qty: r.qty })),
    )
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      bookingId: id,
      amount: total,
      paymentMethod: data.paymentMethod,
      paymentStatus: settled ? 'Lunas' : 'Pending',
      paymentPlan: 'full',
      paidAt: settled ? now : null,
    })

    // Points are granted only when the visit is settled — mirrors
    // ownerCompleteBooking so a later manual settle doesn't double-grant (a
    // walk-in left Pending gets its points when the owner completes it normally).
    let pointsAdded = 0
    if (settled) {
      pointsAdded = loyaltyPointsFor(total)
      if (pointsAdded > 0) {
        await db.update(user).set({ loyaltyPoints: sql`coalesce(${user.loyaltyPoints}, 0) + ${pointsAdded}` }).where(eq(user.id, data.patientId))
        await db.insert(loyaltyTransactions).values({
          id: crypto.randomUUID(),
          userId: data.patientId,
          label: rows[0]?.name ?? 'Kunjungan walk-in',
          delta: pointsAdded,
          bookingId: id,
        })
      }
    }

    return { id, total, pointsAdded, settled }
  })
