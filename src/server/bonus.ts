import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { assists, beauticians, bookingItems, bookings, closings, products, transactions, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireOwner, requireStaff } from './_session'

// Closing/upsell bonus rate: 1% of a treatment's price, 5% of a skincare's.
const CLOSING_PCT = { treatment: 0.01, skincare: 0.05 } as const
// Assist bonus (non-facial): flat by the booking's total.
const assistBonus = (total: number) => (total > 1_000_000 ? 10_000 : 5_000)
// Monthly clinic-revenue milestone: at ≥Rp100jt every staff (incl doctors) gets this.
const TARGET_REVENUE = 100_000_000
const TARGET_BONUS = 500_000
const monthWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date())

// Everyone eligible for a bonus: the staff roster (beautician/perawat/FO/terapis)
// + doctors (login users). staffId in closings/assists is one of these ids.
export const ownerBonusPeople = createServerFn({ method: 'GET' }).handler(async () => {
  await requireStaff()
  const staff = await db.select().from(beauticians).where(eq(beauticians.isActive, true)).orderBy(asc(beauticians.name))
  const docs = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.role, 'dokter'))
  return [
    ...staff.map((s) => ({ id: s.id, name: s.name, role: s.role })),
    ...docs.map((d) => ({ id: d.id, name: d.name ?? 'Dokter', role: 'dokter' })),
  ].sort((a, b) => a.name.localeCompare(b.name))
})

// Closings + assists recorded on a booking, with resolved staff names.
export const ownerBookingBonus = createServerFn({ method: 'GET' })
  .validator(z.object({ bookingId: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [staff, docs, cls, ast] = await Promise.all([
      db.select({ id: beauticians.id, name: beauticians.name }).from(beauticians),
      db.select({ id: user.id, name: user.name }).from(user).where(eq(user.role, 'dokter')),
      db.select().from(closings).where(eq(closings.bookingId, data.bookingId)).orderBy(desc(closings.createdAt)),
      db.select().from(assists).where(eq(assists.bookingId, data.bookingId)).orderBy(desc(assists.createdAt)),
    ])
    const nameById = new Map<string, string>([...staff.map((s) => [s.id, s.name] as const), ...docs.map((d) => [d.id, d.name ?? 'Dokter'] as const)])
    return {
      closings: cls.map((c) => ({ id: c.id, staffName: nameById.get(c.staffId) ?? '(staf)', kind: c.kind, itemName: c.itemName, price: c.price, bonus: c.bonus })),
      assists: ast.map((a) => ({ id: a.id, staffName: nameById.get(a.staffId) ?? '(staf)', bonus: a.bonus })),
    }
  })

export const ownerRecordClosing = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string(), staffId: z.string().min(1), kind: z.enum(['treatment', 'skincare']), itemId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireStaff()
    let itemName = ''
    let price = 0
    if (data.kind === 'treatment') {
      const [t] = await db.select().from(treatments).where(eq(treatments.id, data.itemId)).limit(1)
      if (!t) throw new Error('Treatment tidak ditemukan.')
      itemName = t.name
      price = t.isPromo && t.promoNow != null && t.promoNow < t.price ? t.promoNow : t.price
    } else {
      const [p] = await db.select().from(products).where(eq(products.id, data.itemId)).limit(1)
      if (!p) throw new Error('Produk skincare tidak ditemukan.')
      itemName = p.name
      price = p.price
    }
    const bonus = Math.round(price * CLOSING_PCT[data.kind])
    const id = 'cls-' + crypto.randomUUID().slice(0, 8)
    await db.insert(closings).values({ id, bookingId: data.bookingId, staffId: data.staffId, kind: data.kind, itemId: data.itemId, itemName, price, bonus })
    return { id, bonus }
  })

export const ownerRemoveClosing = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    await db.delete(closings).where(eq(closings.id, data.id))
    return { ok: true }
  })

export const ownerRecordAssist = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string(), staffId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [b] = await db.select({ total: bookings.total }).from(bookings).where(eq(bookings.id, data.bookingId)).limit(1)
    if (!b) throw new Error('Booking tidak ditemukan.')
    const bonus = assistBonus(b.total)
    const id = 'ast-' + crypto.randomUUID().slice(0, 8)
    await db.insert(assists).values({ id, bookingId: data.bookingId, staffId: data.staffId, bonus })
    return { id, bonus }
  })

export const ownerRemoveAssist = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    await db.delete(assists).where(eq(assists.id, data.id))
    return { ok: true }
  })

// ── Monthly bonus report (per staff/doctor) ──
// Combines: per-treatment bonus for visits they performed (beauticianBonus on
// Selesai bookings), closing 1%/5%, assist flat, and the Rp500rb milestone that
// every active person gets when the month's Lunas revenue hits Rp100jt.
export const ownerBonusReport = createServerFn({ method: 'GET' })
  .validator(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
  .handler(async ({ data }) => {
    await requireOwner()
    const month = data?.month ?? monthWIB()

    const [allBookings, txns, trs, staff, docs] = await Promise.all([
      db.select().from(bookings),
      db.select({ bookingId: transactions.bookingId, payStatus: transactions.paymentStatus }).from(transactions),
      db.select({ id: treatments.id, name: treatments.name, bonus: treatments.beauticianBonus }).from(treatments),
      db.select().from(beauticians).where(eq(beauticians.isActive, true)),
      db.select({ id: user.id, name: user.name }).from(user).where(eq(user.role, 'dokter')),
    ])
    const monthBookings = allBookings.filter((b) => b.bookingDate.startsWith(month))
    const monthIds = monthBookings.map((b) => b.id)
    const lunas = new Map(txns.map((t) => [t.bookingId, t.payStatus]))
    const revenue = monthBookings.filter((b) => b.status !== 'Batal' && lunas.get(b.id) === 'Lunas').reduce((s, b) => s + b.total, 0)
    const targetHit = revenue >= TARGET_REVENUE

    // Per-treatment bonus (performer) for this month's completed visits.
    const bonusById = new Map(trs.map((t) => [t.id, t.bonus]))
    const bonusByName = new Map(trs.map((t) => [t.name.toLowerCase(), t.bonus]))
    const items = monthIds.length ? await db.select().from(bookingItems).where(inArray(bookingItems.bookingId, monthIds)) : []
    const itemsByBooking = new Map<string, typeof items>()
    for (const it of items) {
      const arr = itemsByBooking.get(it.bookingId) ?? []
      arr.push(it)
      itemsByBooking.set(it.bookingId, arr)
    }
    const procedure = new Map<string, number>()
    for (const b of monthBookings) {
      if (b.status !== 'Selesai' || !b.beauticianId) continue
      const bonus = (itemsByBooking.get(b.id) ?? []).reduce((s, it) => {
        const per = (it.treatmentId ? bonusById.get(it.treatmentId) : undefined) ?? bonusByName.get(it.nameAtBooking.toLowerCase()) ?? 0
        return s + per * it.qty
      }, 0)
      procedure.set(b.beauticianId, (procedure.get(b.beauticianId) ?? 0) + bonus)
    }

    // Closing + assist for this month's bookings.
    const monthIdSet = new Set(monthIds)
    const [cls, ast] = await Promise.all([db.select().from(closings), db.select().from(assists)])
    const closingBy = new Map<string, number>()
    for (const c of cls) if (monthIdSet.has(c.bookingId)) closingBy.set(c.staffId, (closingBy.get(c.staffId) ?? 0) + c.bonus)
    const assistBy = new Map<string, number>()
    for (const a of ast) if (monthIdSet.has(a.bookingId)) assistBy.set(a.staffId, (assistBy.get(a.staffId) ?? 0) + a.bonus)

    const roleLabel: Record<string, string> = { beautician: 'Beautician', perawat: 'Perawat', frontoffice: 'Front Office', terapis: 'Terapis', dokter: 'Dokter' }
    const people = [...staff.map((s) => ({ id: s.id, name: s.name, role: s.role })), ...docs.map((d) => ({ id: d.id, name: d.name ?? 'Dokter', role: 'dokter' }))]
    const rows = people
      .map((p) => {
        const proc = procedure.get(p.id) ?? 0
        const closing = closingBy.get(p.id) ?? 0
        const assist = assistBy.get(p.id) ?? 0
        const target = targetHit ? TARGET_BONUS : 0
        return { id: p.id, name: p.name, role: roleLabel[p.role] ?? p.role, procedure: proc, closing, assist, target, total: proc + closing + assist + target }
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)

    return {
      month,
      revenue,
      targetHit,
      targetRevenue: TARGET_REVENUE,
      rows,
      grandTotal: rows.reduce((s, r) => s + r.total, 0),
    }
  })
