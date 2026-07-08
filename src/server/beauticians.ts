import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { beauticians, bookingItems, bookings, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireOwner, requireStaff } from './_session'

// ── List — staff (owner + doctor) read it to attribute visits on the board ──
export const ownerBeauticians = createServerFn({ method: 'GET' }).handler(async () => {
  await requireStaff()
  return db.select().from(beauticians).orderBy(asc(beauticians.name))
})

// ── Create / rename / activate-deactivate (owner only) ──
// No hard delete: a removed beautician would orphan the attribution on historical
// bookings, so "menonaktifkan" (isActive=false) is the way to retire someone.
const ROLES = ['beautician', 'perawat', 'frontoffice', 'terapis'] as const

export const ownerSaveBeautician = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().optional(), name: z.string().min(1), role: z.enum(ROLES).optional(), isActive: z.boolean().optional() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const name = data.name.trim()
    if (data.id) {
      const [row] = await db
        .update(beauticians)
        .set({ name, ...(data.role !== undefined ? { role: data.role } : {}), ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) })
        .where(eq(beauticians.id, data.id))
        .returning()
      return row ?? null
    }
    const id =
      'bt-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 9999)
    const [row] = await db.insert(beauticians).values({ id, name, role: data.role ?? 'beautician', isActive: data.isActive ?? true }).returning()
    return row
  })

// ── Attribute a visit to the beautician who performed it (owner or doctor) ──
export const ownerSetBookingBeautician = createServerFn({ method: 'POST' })
  .validator(z.object({ bookingId: z.string(), beauticianId: z.string().nullable(), noFacial: z.boolean().optional() }))
  .handler(async ({ data }) => {
    await requireStaff()
    // Picking a beautician clears the "no facial" mark; marking "no facial"
    // clears any beautician — the two are mutually exclusive.
    const noFacial = data.noFacial ?? false
    await db.update(bookings).set({ beauticianId: noFacial ? null : data.beauticianId, noFacial }).where(eq(bookings.id, data.bookingId))
    return { bookingId: data.bookingId, beauticianId: noFacial ? null : data.beauticianId, noFacial }
  })

// Completed visits in a date range, decorated with patient name, treatments, the
// performing beautician, and the bonus that visit earned. Bonus per item resolves
// the treatment by id first, then by name (booking_items keep a name snapshot and
// older rows may lack a treatmentId) — same fallback the doctor earnings use.
async function completedVisits(from?: string, to?: string) {
  const conds = [eq(bookings.status, 'Selesai')]
  if (from) conds.push(gte(bookings.bookingDate, from))
  if (to) conds.push(lte(bookings.bookingDate, to))
  // Skincare pickup orders are retail sales, not clinic visits — keep them out
  // of the visit report (they still count in Transaksi + the bonus revenue).
  const bks = (await db
    .select()
    .from(bookings)
    .where(and(...conds))
    .orderBy(desc(bookings.bookingDate), asc(bookings.bookingTime))
  ).filter((b) => b.source !== 'skincare')

  const [bts, trs, users] = await Promise.all([
    db.select().from(beauticians),
    db.select({ id: treatments.id, name: treatments.name, bonus: treatments.beauticianBonus }).from(treatments),
    db.select({ id: user.id, name: user.name }).from(user),
  ])
  const btName = new Map(bts.map((b) => [b.id, b.name]))
  const bonusById = new Map(trs.map((t) => [t.id, t.bonus]))
  const bonusByName = new Map(trs.map((t) => [t.name.toLowerCase(), t.bonus]))
  const patientName = new Map(users.map((u) => [u.id, u.name]))

  const ids = bks.map((b) => b.id)
  const items = ids.length ? await db.select().from(bookingItems).where(inArray(bookingItems.bookingId, ids)) : []
  const itemsByBooking = new Map<string, typeof items>()
  for (const it of items) {
    const arr = itemsByBooking.get(it.bookingId) ?? []
    arr.push(it)
    itemsByBooking.set(it.bookingId, arr)
  }

  return bks.map((b) => {
    const its = itemsByBooking.get(b.id) ?? []
    const bonus = its.reduce((s, it) => {
      const per = (it.treatmentId ? bonusById.get(it.treatmentId) : undefined) ?? bonusByName.get(it.nameAtBooking.toLowerCase()) ?? 0
      return s + per * it.qty
    }, 0)
    return {
      id: b.id,
      date: b.bookingDate,
      time: b.bookingTime,
      patientName: patientName.get(b.userId) ?? 'Pasien',
      treatments: its.map((it) => (it.qty > 1 ? `${it.nameAtBooking} ×${it.qty}` : it.nameAtBooking)),
      total: b.total,
      beauticianId: b.beauticianId ?? null,
      beauticianName: b.beauticianId ? btName.get(b.beauticianId) ?? '(dihapus)' : null,
      doctorId: b.doctorId ?? null,
      doctorName: b.doctorId ? patientName.get(b.doctorId) ?? '(dokter)' : null,
      noFacial: b.noFacial ?? false,
      bonus,
    }
  })
}

// ── Management report: rows + per-beautician bonus summary in one round-trip ──
export const ownerVisitReport = createServerFn({ method: 'GET' })
  .validator(z.object({ from: z.string().optional(), to: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    await requireOwner()
    const rows = await completedVisits(data?.from, data?.to)
    const byBt = new Map<string, { id: string; name: string; visits: number; revenue: number; bonus: number }>()
    let unattributed = 0
    for (const r of rows) {
      if (!r.beauticianId) {
        // Doctor-led or explicitly marked "no facial" visits are intentionally
        // beauticianless — only genuinely unresolved facial visits are flagged.
        if (!r.doctorId && !r.noFacial) unattributed++
        continue
      }
      const cur = byBt.get(r.beauticianId) ?? { id: r.beauticianId, name: r.beauticianName ?? '—', visits: 0, revenue: 0, bonus: 0 }
      cur.visits++
      cur.revenue += r.total
      cur.bonus += r.bonus
      byBt.set(r.beauticianId, cur)
    }
    return {
      rows,
      summary: [...byBt.values()].sort((a, b) => b.bonus - a.bonus),
      unattributed,
      totalRevenue: rows.reduce((s, r) => s + r.total, 0),
      // Per-treatment bonus is only earned by an actual beautician performer —
      // doctor-led / no-facial visits earn none even if the treatment lists one.
      totalBonus: rows.reduce((s, r) => s + (r.beauticianId ? r.bonus : 0), 0),
    }
  })
