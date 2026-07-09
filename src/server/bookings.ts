import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, loyaltyTransactions, transactions, treatments, voucherRedemptions } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { loyaltyPointsFor } from '#/data/clinic'
import { requireOwner, requireStaff, requireUser } from './_session'
import { assemble } from './_appointments'
import { decrementProductStock, resolveProductItems } from './_products'
import { loadUsableVoucher, voucherDiscountFor, voucherTreatmentScope } from './_vouchers'

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

// ── Patient: checkout ──
export const createBooking = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(z.object({ treatmentId: z.string(), qty: z.number().int().positive() })).min(1),
      // Skincare products bought together with the treatment(s) — no voucher, no
      // slot of their own; they ride along and are picked up at the visit.
      productItems: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })).optional(),
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      bookingTime: z.string(),
      paymentMethod: z.enum(['Online', 'Offline', 'Transfer']),
      paymentPlan: z.enum(['full', 'dp']).optional(),
      voucherId: z.string().optional(),
      // Chosen target for a 'one_treatment' voucher (server re-validates / falls
      // back to the best target). Ignored for cart-wide vouchers.
      voucherTargetTreatmentId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const u = await requireUser()
    const ids = data.items.map((i) => i.treatmentId)
    const catalog = await db.select().from(treatments).where(inArray(treatments.id, ids))
    const byId = new Map(catalog.map((t) => [t.id, t]))

    let subtotal = 0
    const rows = data.items.map((i) => {
      const t = byId.get(i.treatmentId)
      if (!t) throw new Error(`Treatment ${i.treatmentId} tidak ditemukan.`)
      // Enforce the per-unit minimum server-side; the client UI prevents this but
      // the price/qty sent by the browser is never trusted.
      if (t.pricePerUnit && i.qty < t.minUnits) {
        throw new Error(`${t.name} minimal ${t.minUnits} unit.`)
      }
      // Authoritative price: charge the promo price when the treatment is on a
      // valid promo, regardless of what the client sent.
      const promoApplied = t.isPromo && t.promoNow != null && t.promoNow < t.price
      const unit = promoApplied ? t.promoNow! : t.price
      subtotal += unit * i.qty
      return { treatmentId: t.id, name: t.name, price: unit, qty: i.qty, promoApplied }
    })

    const today = new Date().toISOString().slice(0, 10)
    if (data.bookingDate < today) throw new Error('Tanggal booking sudah lewat.')
    if (!SLOTS.includes(data.bookingTime)) throw new Error('Waktu booking tidak valid.')
    const [takenSlot] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.bookingDate, data.bookingDate), eq(bookings.bookingTime, data.bookingTime), sql`${bookings.status} <> 'Batal'`))
      .limit(1)
    if (takenSlot) throw new Error('Slot sudah terisi, pilih waktu lain.')

    const id = 'AMR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

    // ── Voucher (optional). Discount is computed authoritatively here; the
    // client-sent price is never trusted. Promo lines are excluded. The voucher
    // is consumed atomically so it can never exceed its per-user cap. ──
    let discount = 0
    let appliedVoucherId: string | null = null
    let redemptionId: string | null = null
    if (data.voucherId) {
      const [urow] = await db.select().from(user).where(eq(user.id, u.id)).limit(1)
      const voucher = urow ? await loadUsableVoucher(data.voucherId, urow) : null
      if (voucher) {
        const scope = await voucherTreatmentScope(voucher)
        const d = voucherDiscountFor(
          voucher,
          scope,
          rows.map((r) => ({ treatmentId: r.treatmentId, unit: r.price, qty: r.qty, promoApplied: r.promoApplied })),
          data.voucherTargetTreatmentId,
        )
        if (d > 0) {
          redemptionId = crypto.randomUUID()
          await db.insert(voucherRedemptions).values({
            id: redemptionId, voucherId: voucher.id, userId: u.id, bookingId: id, amountDiscounted: d,
          })
          // Verify we didn't race past the cap; if so, undo and drop the discount.
          const used = await db
            .select({ id: voucherRedemptions.id })
            .from(voucherRedemptions)
            .where(and(eq(voucherRedemptions.voucherId, voucher.id), eq(voucherRedemptions.userId, u.id)))
          if (used.length > voucher.maxUsesPerUser) {
            await db.delete(voucherRedemptions).where(eq(voucherRedemptions.id, redemptionId))
            redemptionId = null
          } else {
            discount = d
            appliedVoucherId = voucher.id
          }
        }
      }
    }
    // Skincare ride-along items — validated (stock-checked) against the catalog,
    // added to the total after the (treatment-only) voucher discount.
    const productRows = data.productItems?.length ? await resolveProductItems(data.productItems) : []
    const productSubtotal = productRows.reduce((s, r) => s + r.price * r.qty, 0)
    const total = Math.max(0, subtotal - discount) + productSubtotal

    try {
      await db.insert(bookings).values({
        id,
        userId: u.id,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime,
        status: 'Menunggu',
        total,
        voucherId: appliedVoucherId,
        discountAmount: discount,
      })
      await db.insert(bookingItems).values([
        ...rows.map((r) => ({
          id: crypto.randomUUID(),
          bookingId: id,
          treatmentId: r.treatmentId,
          nameAtBooking: r.name,
          priceAtBooking: r.price,
          qty: r.qty,
        })),
        ...productRows.map((r) => ({
          id: crypto.randomUUID(),
          bookingId: id,
          treatmentId: null,
          nameAtBooking: r.name,
          priceAtBooking: r.price,
          qty: r.qty,
        })),
      ])
      await db.insert(transactions).values({
        id: crypto.randomUUID(),
        bookingId: id,
        amount: total,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'Pending',
        paymentPlan: data.paymentPlan ?? 'full',
      })
      if (data.productItems?.length) await decrementProductStock(data.productItems)
    } catch (e) {
      // Don't leave a consumed voucher behind if booking creation failed.
      if (redemptionId) await db.delete(voucherRedemptions).where(eq(voucherRedemptions.id, redemptionId))
      throw e
    }
    return { id, total, subtotal, discount, date: data.bookingDate, time: data.bookingTime, status: 'Menunggu' as const }
  })

// ── Patient: my bookings ──
export const listMyBookings = createServerFn({ method: 'GET' })
  .validator(z.object({ tab: z.enum(['Semua', 'Mendatang', 'Selesai']).optional() }).optional())
  .handler(async ({ data }) => {
    const u = await requireUser()
    const bks = await db.select().from(bookings).where(eq(bookings.userId, u.id)).orderBy(desc(bookings.bookingDate))
    const list = await assemble(bks)
    const tab = data?.tab ?? 'Semua'
    if (tab === 'Mendatang') return list.filter((b) => b.status === 'Menunggu' || b.status === 'Dikonfirmasi')
    if (tab === 'Selesai') return list.filter((b) => b.status === 'Selesai')
    return list
  })

export const getMyBooking = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const bks = await db.select().from(bookings).where(and(eq(bookings.id, data.id), eq(bookings.userId, u.id)))
    return (await assemble(bks))[0] ?? null
  })

// Receipt / kwitansi for a booking. Viewable by the booking's own patient OR by
// clinic staff (owner/dokter) — so an owner can pull up & download any patient's
// proof of payment. The UI only presents it as a valid kwitansi when Lunas.
export const getReceipt = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Transaksi tidak ditemukan.')
    const isStaff = u.role === 'owner' || u.role === 'dokter'
    if (!isStaff && b.userId !== u.id) throw new Error('Tidak diizinkan melihat kwitansi ini.')
    const [appt] = await assemble([b])
    const [p] = await db
      .select({ name: user.name, phone: user.phone })
      .from(user)
      .where(eq(user.id, b.userId))
      .limit(1)
    const subtotal = appt.items.reduce((s, it) => s + it.price * it.qty, 0)
    return {
      id: appt.id,
      patientName: p?.name ?? 'Pasien',
      patientPhone: p?.phone ?? '',
      date: appt.date,
      time: appt.time,
      items: appt.items,
      subtotal,
      discount: appt.discount,
      total: appt.total,
      payment: appt.payment,
      payStatus: appt.payStatus,
      paymentPlan: appt.paymentPlan,
      paidAt: appt.paidAt,
    }
  })

export const upcomingMyBooking = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireUser()
  const bks = await db.select().from(bookings).where(eq(bookings.userId, u.id))
  const list = (await assemble(bks)).filter((b) => b.status === 'Menunggu' || b.status === 'Dikonfirmasi')
  list.sort((a, b) => a.date.localeCompare(b.date))
  return list[0] ?? null
})

export const cancelMyBooking = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const [b] = await db.select().from(bookings).where(and(eq(bookings.id, data.id), eq(bookings.userId, u.id)))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status === 'Selesai' || b.status === 'Batal') throw new Error('Booking tidak bisa dibatalkan.')
    // Already checked in at the clinic — self-cancel would orphan an in-progress
    // visit; the UI hides the button here, this guards direct calls.
    if (b.status === 'Hadir') throw new Error('Kamu sudah ditandai hadir di klinik — hubungi klinik untuk pembatalan.')
    await db.update(bookings).set({ status: 'Batal' }).where(eq(bookings.id, data.id))
    // Free the voucher so a cancelled booking doesn't permanently consume a
    // one-time voucher (re-use is still gated by its window / audience / cap).
    if (b.voucherId) {
      await db
        .delete(voucherRedemptions)
        .where(and(eq(voucherRedemptions.bookingId, data.id), eq(voucherRedemptions.userId, u.id)))
    }
    return { ok: true, status: 'Batal' as const }
  })

// ── Slots ──
export const slotAvailability = createServerFn({ method: 'GET' })
  .validator(z.object({ date: z.string() }))
  .handler(async ({ data }) => {
    const taken = await db
      .select({ time: bookings.bookingTime })
      .from(bookings)
      .where(and(eq(bookings.bookingDate, data.date), sql`${bookings.status} <> 'Batal'`))
    const takenSet = new Set(taken.map((t) => t.time))
    return { date: data.date, slots: SLOTS.map((time) => ({ time, available: !takenSet.has(time) })) }
  })

// ── Owner: schedule ──
export const ownerBookingsByDate = createServerFn({ method: 'GET' })
  .validator(z.object({ date: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    await requireStaff()
    // The active schedule and its date navigation exclude Batal — a freed slot
    // must not linger as a ghost appointment. Cancelled rows for the selected
    // date still ride along separately so the board can offer "Pulihkan"
    // (recovery from an accidental cancellation).
    // Skincare pickup orders (source 'skincare') are retail sales, not
    // appointments — they live in Transaksi only, never on the schedule board.
    const allRows = (await db.select().from(bookings).orderBy(desc(bookings.bookingDate))).filter((b) => b.source !== 'skincare')
    const active = allRows.filter((b) => b.status !== 'Batal')
    const dates = Array.from(new Set(active.map((b) => b.bookingDate))).sort()
    const targetDate = data?.date ?? dates[dates.length - 1] ?? ''
    const names = await db.select({ id: user.id, name: user.name }).from(user)
    const nameById = new Map(names.map((n) => [n.id, n.name]))
    const decorate = async (rows: typeof allRows) =>
      (await assemble(rows))
        .map((b) => ({ ...b, patientId: b.userId, patientName: nameById.get(b.userId) ?? 'Pasien' }))
        .sort((a, b) => a.time.localeCompare(b.time))
    return {
      date: targetDate,
      dates,
      bookings: await decorate(active.filter((b) => b.bookingDate === targetDate)),
      cancelled: await decorate(allRows.filter((b) => b.bookingDate === targetDate && b.status === 'Batal')),
    }
  })

const ALLOWED: Record<string, string[]> = {
  Menunggu: ['Dikonfirmasi', 'Batal'],
  Dikonfirmasi: ['Hadir', 'Batal'],
  Hadir: ['Selesai', 'Batal'],
}

export const ownerSetBookingStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), status: z.enum(['Dikonfirmasi', 'Hadir', 'Batal']) }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (!ALLOWED[b.status]?.includes(data.status)) {
      throw new Error(`Transisi ${b.status} → ${data.status} tidak diizinkan.`)
    }
    await db.update(bookings).set({ status: data.status }).where(eq(bookings.id, data.id))
    // Cancelling frees a consumed one-time voucher — parity with cancelMyBooking
    // and ownerMarkUnpaid, which already did this.
    if (data.status === 'Batal' && b.voucherId) {
      await db
        .delete(voucherRedemptions)
        .where(and(eq(voucherRedemptions.bookingId, data.id), eq(voucherRedemptions.userId, b.userId)))
    }
    return { id: data.id, status: data.status }
  })

// Batal → Menunggu: recover a booking that was cancelled by mistake (e.g. a
// stray tap on Batalkan). The paid transaction row is untouched, so an approved
// payment stays Lunas. Blocked when another active booking has taken the slot.
export const ownerRestoreBooking = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status !== 'Batal') throw new Error('Hanya booking berstatus Batal yang bisa dipulihkan.')
    const clash = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingDate, b.bookingDate),
          eq(bookings.bookingTime, b.bookingTime),
          ne(bookings.status, 'Batal'),
        ),
      )
      .limit(1)
    if (clash.length) throw new Error('Slot ini sudah terisi booking lain — tidak bisa dipulihkan.')
    await db.update(bookings).set({ status: 'Menunggu' }).where(eq(bookings.id, data.id))
    return { id: data.id, status: 'Menunggu' as const }
  })

// Owner: mark an unpaid order as "tidak bayar" — cancels the booking so it
// leaves the pending-transaction list and frees the slot. Only valid while the
// payment is still Pending; a settled (Lunas) or finished booking can't be voided.
export const ownerMarkUnpaid = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status === 'Selesai') throw new Error('Booking sudah selesai, tidak bisa ditandai tidak bayar.')
    if (b.status === 'Batal') throw new Error('Booking sudah dibatalkan.')
    const [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, data.id)).limit(1)
    if (txn && txn.paymentStatus === 'Lunas') {
      throw new Error('Pembayaran sudah lunas, tidak bisa ditandai tidak bayar.')
    }
    await db.update(bookings).set({ status: 'Batal' }).where(eq(bookings.id, data.id))
    // A no-pay shouldn't permanently consume a one-time voucher.
    if (b.voucherId) {
      await db
        .delete(voucherRedemptions)
        .where(and(eq(voucherRedemptions.bookingId, data.id), eq(voucherRedemptions.userId, b.userId)))
    }
    return { id: data.id, status: 'Batal' as const }
  })

// Hadir → Selesai: settle payment + grant loyalty points atomically.
export const ownerCompleteBooking = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status === 'Batal') throw new Error('Booking dibatalkan.')
    // Idempotent: never re-grant loyalty for an already-completed booking.
    if (b.status === 'Selesai') return { id: data.id, status: 'Selesai' as const, pointsAdded: 0 }
    if (b.status !== 'Hadir') throw new Error('Booking harus berstatus Hadir sebelum bisa diselesaikan.')

    // For non-cash bookings, payment must be confirmed before completion.
    const [txn] = await db.select().from(transactions).where(eq(transactions.bookingId, data.id)).limit(1)
    if (txn && txn.paymentMethod !== 'Offline' && txn.paymentStatus !== 'Lunas') {
      throw new Error('Pembayaran belum lunas. Setujui pembayaran terlebih dahulu.')
    }

    await db.update(bookings).set({ status: 'Selesai' }).where(eq(bookings.id, data.id))
    // Offline bookings are settled here (cash at clinic); others already marked Lunas.
    if (!txn || txn.paymentMethod === 'Offline') {
      await db.update(transactions).set({ paymentStatus: 'Lunas' }).where(eq(transactions.bookingId, data.id))
    }

    const points = loyaltyPointsFor(b.total)
    if (points > 0) {
      await db
        .update(user)
        .set({ loyaltyPoints: sql`coalesce(${user.loyaltyPoints}, 0) + ${points}` })
        .where(eq(user.id, b.userId))
      const [firstItem] = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, data.id)).limit(1)
      await db.insert(loyaltyTransactions).values({
        id: crypto.randomUUID(),
        userId: b.userId,
        label: firstItem?.nameAtBooking ?? 'Treatment selesai',
        delta: points,
        bookingId: data.id,
      })
    }
    return { id: data.id, status: 'Selesai' as const, pointsAdded: points }
  })
