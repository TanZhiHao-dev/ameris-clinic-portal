import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, loyaltyTransactions, transactions, voucherRedemptions } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { loyaltyPointsFor } from '#/data/clinic'
import { requireStaff } from './_session'
import { posChargedRows } from './_pos'
import {
  cartSubtotal,
  fmtDateWIB,
  listUsableVouchers,
  loadUsableVoucher,
  rawVoucherDiscount,
  voucherDiscountFor,
  voucherTreatmentScope,
} from './_vouchers'

// Clinic-local (WIB) date + time so a late-night walk-in lands on the correct
// calendar day even when the server clock is UTC.
const wibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
const wibTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })

const posItemSchema = z.object({
  treatmentId: z.string(),
  qty: z.number().int().positive(),
  // Manual walk-in discount off the unit: 'rp' = rupiah, 'pct' = percent.
  discountMode: z.enum(['rp', 'pct']).optional(),
  discountValue: z.number().min(0).optional(),
})

// The registered patient's usable vouchers, each priced against the CURRENT
// POS cart so the kasir sees the real rupiah saving before applying one.
// Empty cart is fine — discounts just come back 0 with the voucher terms shown.
export const posPatientVouchers = createServerFn({ method: 'POST' })
  .validator(z.object({ patientId: z.string(), items: z.array(posItemSchema) }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [u] = await db.select().from(user).where(eq(user.id, data.patientId)).limit(1)
    if (!u || u.role !== 'pasien') return []
    const usable = await listUsableVouchers(u)
    if (usable.length === 0) return []

    const rows = data.items.length ? await posChargedRows(data.items) : []
    const lines = rows.map((r) => ({ treatmentId: r.treatmentId, unit: r.price, qty: r.qty, promoApplied: r.promoApplied }))
    const subtotal = cartSubtotal(lines)

    const out: {
      id: string
      name: string
      discountType: 'pct' | 'amount'
      discountValue: number
      applyScope: 'cart' | 'one_treatment'
      minSpend: number
      validUntil: string
      /** Rupiah saved against the current cart (0 = not applicable right now). */
      discount: number
      /** True when only the minimum spend blocks it — nudge the kasir to upsell. */
      blockedByMinSpend: boolean
      neededForMin: number
    }[] = []
    for (const v of usable) {
      const scope = await voucherTreatmentScope(v)
      const discount = lines.length ? voucherDiscountFor(v, scope, lines) : 0
      const raw = lines.length ? rawVoucherDiscount(v, scope, lines) : 0
      out.push({
        id: v.id,
        name: v.name,
        discountType: v.discountType as 'pct' | 'amount',
        discountValue: v.discountValue,
        applyScope: v.applyScope === 'one_treatment' ? 'one_treatment' : 'cart',
        minSpend: v.minSpend,
        validUntil: fmtDateWIB(v.validUntil),
        discount,
        blockedByMinSpend: discount === 0 && raw > 0 && v.minSpend > 0 && subtotal < v.minSpend,
        neededForMin: v.minSpend > 0 ? Math.max(0, v.minSpend - subtotal) : 0,
      })
    }
    return out.sort((a, b) => b.discount - a.discount)
  })

// POS / walk-in sale — staff (owner or doctor) records an in-clinic visit that
// never went through online booking. Reuses the booking/item/transaction tables.
//   settleNow = true  → kasir took payment now: Selesai + Lunas + loyalty points.
//   settleNow = false → doctor logged the treatment during consultation: Hadir +
//                        Pending, so the owner settles it later via Transaksi.
export const posCreateSale = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      patientId: z.string(),
      items: z.array(posItemSchema).min(1),
      beauticianId: z.string().nullable().optional(),
      doctorId: z.string().nullable().optional(),
      // Tunai (cash) = Offline; QRIS/transfer = Transfer.
      paymentMethod: z.enum(['Offline', 'Transfer']),
      settleNow: z.boolean(),
      // A voucher the PATIENT owns, applied by the kasir on their behalf. The
      // discount is recomputed server-side and the redemption is written to the
      // patient's account (same ledger the online checkout uses).
      voucherId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaff()

    const [p] = await db.select().from(user).where(eq(user.id, data.patientId)).limit(1)
    if (!p || p.role !== 'pasien') throw new Error('Pasien tidak ditemukan.')

    // Authoritative prices from the catalog — never trust client-sent amounts.
    const rows = await posChargedRows(data.items)
    const subtotal = rows.reduce((s, r) => s + r.price * r.qty, 0)

    const id = 'AMR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

    // ── Voucher (optional). Mirrors createBooking: recompute the discount
    // authoritatively, write the redemption to the patient's ledger, and guard
    // maxUsesPerUser against concurrent use. The kasir picked it deliberately,
    // so an unusable voucher is a loud error — never a silent full-price sale.
    let voucherDiscount = 0
    let appliedVoucherId: string | null = null
    let redemptionId: string | null = null
    if (data.voucherId) {
      const voucher = await loadUsableVoucher(data.voucherId, p)
      if (!voucher) throw new Error('Voucher tidak berlaku untuk pasien ini (habis terpakai / kedaluwarsa / tidak aktif).')
      const scope = await voucherTreatmentScope(voucher)
      const lines = rows.map((r) => ({ treatmentId: r.treatmentId, unit: r.price, qty: r.qty, promoApplied: r.promoApplied }))
      const d = voucherDiscountFor(voucher, scope, lines)
      if (d <= 0) {
        throw new Error(
          voucher.minSpend > 0 && cartSubtotal(lines) < voucher.minSpend
            ? `Voucher butuh minimal belanja ${voucher.minSpend.toLocaleString('id-ID')} — belum tercapai.`
            : 'Voucher tidak berlaku untuk treatment di keranjang ini.',
        )
      }
      redemptionId = crypto.randomUUID()
      await db.insert(voucherRedemptions).values({ id: redemptionId, voucherId: voucher.id, userId: data.patientId, bookingId: id, amountDiscounted: d })
      const used = await db
        .select({ id: voucherRedemptions.id })
        .from(voucherRedemptions)
        .where(and(eq(voucherRedemptions.voucherId, voucher.id), eq(voucherRedemptions.userId, data.patientId)))
      if (used.length > voucher.maxUsesPerUser) {
        await db.delete(voucherRedemptions).where(eq(voucherRedemptions.id, redemptionId))
        throw new Error('Voucher sudah habis terpakai (limit penggunaan tercapai).')
      }
      voucherDiscount = d
      appliedVoucherId = voucher.id
    }

    const total = Math.max(0, subtotal - voucherDiscount)
    const now = new Date()
    const settled = data.settleNow

    try {
      await db.insert(bookings).values({
        id,
        userId: data.patientId,
        bookingDate: wibDate.format(now),
        bookingTime: wibTime.format(now),
        status: settled ? 'Selesai' : 'Hadir',
        total,
        voucherId: appliedVoucherId,
        discountAmount: voucherDiscount,
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
    } catch (e) {
      // Don't leave a consumed voucher behind if the sale failed to persist.
      if (redemptionId) await db.delete(voucherRedemptions).where(eq(voucherRedemptions.id, redemptionId))
      throw e
    }

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

    return { id, total, subtotal, voucherDiscount, pointsAdded, settled }
  })
