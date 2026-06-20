import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, doctorTreatments, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireDoctor, requireOwner } from './_session'

const monthLabel = (ym: string) =>
  new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

export type DoctorTreatment = {
  treatmentId: string
  name: string
  category: string
  price: number
  sharePct: number
}

// Assigned treatments + share % for a given doctor, joined to the catalog.
async function treatmentsForDoctor(doctorId: string): Promise<DoctorTreatment[]> {
  const rows = await db
    .select({
      treatmentId: doctorTreatments.treatmentId,
      sharePct: doctorTreatments.sharePct,
      name: treatments.name,
      category: treatments.category,
      price: treatments.price,
    })
    .from(doctorTreatments)
    .innerJoin(treatments, eq(doctorTreatments.treatmentId, treatments.id))
    .where(eq(doctorTreatments.doctorId, doctorId))
    .orderBy(asc(treatments.category), asc(treatments.name))
  return rows
}

// ── Doctor: my profile (treatments I perform + my revenue share) ──
export const doctorProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireDoctor()
  const items = await treatmentsForDoctor(u.id)
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    treatments: items,
    avgShare: items.length ? Math.round(items.reduce((s, t) => s + t.sharePct, 0) / items.length) : 0,
  }
})

// ── Doctor: my earnings — treatments done per day + revenue share per month ──
// The doctor never sees per-treatment %, only the treatments they worked on and
// the rupiah totals. Share = price × (owner-set %) summed over completed bookings
// whose treatments are assigned to this doctor.
export const doctorEarnings = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireDoctor()

  const assigned = await db
    .select({ treatmentId: doctorTreatments.treatmentId, sharePct: doctorTreatments.sharePct, name: treatments.name })
    .from(doctorTreatments)
    .innerJoin(treatments, eq(doctorTreatments.treatmentId, treatments.id))
    .where(eq(doctorTreatments.doctorId, u.id))
  const byId = new Map(assigned.map((a) => [a.treatmentId, a]))
  const byName = new Map(assigned.map((a) => [a.name.toLowerCase(), a]))

  const completed = await db.select().from(bookings).where(eq(bookings.status, 'Selesai'))
  const empty = { name: u.name, thisMonthLabel: '', thisMonthTotal: 0, allTimeTotal: 0, months: [], days: [] }
  if (completed.length === 0) return empty

  const items = await db.select().from(bookingItems).where(inArray(bookingItems.bookingId, completed.map((b) => b.id)))
  const names = await db.select({ id: user.id, name: user.name }).from(user)
  const nameById = new Map(names.map((n) => [n.id, n.name]))
  const bkById = new Map(completed.map((b) => [b.id, b]))

  type Entry = { date: string; treatment: string; patient: string; share: number }
  const entries: Entry[] = []
  for (const it of items) {
    const match = (it.treatmentId ? byId.get(it.treatmentId) : undefined) ?? byName.get(it.nameAtBooking.toLowerCase())
    if (!match) continue
    const bk = bkById.get(it.bookingId)
    if (!bk) continue
    entries.push({
      date: bk.bookingDate,
      treatment: it.nameAtBooking,
      patient: nameById.get(bk.userId) ?? 'Pasien',
      share: Math.round((it.priceAtBooking * it.qty * match.sharePct) / 100),
    })
  }

  const dayMap = new Map<string, Entry[]>()
  for (const e of entries) dayMap.set(e.date, [...(dayMap.get(e.date) ?? []), e])
  const days = [...dayMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      total: list.reduce((s, x) => s + x.share, 0),
      items: list.map((x) => ({ treatment: x.treatment, patient: x.patient })),
    }))

  const monMap = new Map<string, { total: number; count: number }>()
  for (const e of entries) {
    const k = e.date.slice(0, 7)
    const cur = monMap.get(k) ?? { total: 0, count: 0 }
    monMap.set(k, { total: cur.total + e.share, count: cur.count + 1 })
  }
  const months = [...monMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({ month, label: monthLabel(month), total: v.total, count: v.count }))

  return {
    name: u.name,
    thisMonthLabel: months[0]?.label ?? '',
    thisMonthTotal: months[0]?.total ?? 0,
    allTimeTotal: entries.reduce((s, e) => s + e.share, 0),
    months,
    days,
  }
})

// ── Owner: list doctors ──
export const ownerDoctors = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const docs = await db.select().from(user).where(eq(user.role, 'dokter')).orderBy(asc(user.name))
  const links = await db.select().from(doctorTreatments)
  const countById = new Map<string, number>()
  const avgById = new Map<string, number[]>()
  for (const l of links) {
    countById.set(l.doctorId, (countById.get(l.doctorId) ?? 0) + 1)
    avgById.set(l.doctorId, [...(avgById.get(l.doctorId) ?? []), l.sharePct])
  }
  return docs.map((d) => {
    const shares = avgById.get(d.id) ?? []
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone ?? '',
      treatmentCount: countById.get(d.id) ?? 0,
      avgShare: shares.length ? Math.round(shares.reduce((s, v) => s + v, 0) / shares.length) : 0,
    }
  })
})

// ── Owner: one doctor's assignments + the full catalog to add from ──
export const ownerDoctorDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const [doc] = await db.select().from(user).where(and(eq(user.id, data.id), eq(user.role, 'dokter'))).limit(1)
    if (!doc) return null
    const assigned = await treatmentsForDoctor(doc.id)
    const catalog = await db
      .select({ id: treatments.id, name: treatments.name, category: treatments.category, price: treatments.price })
      .from(treatments)
      .orderBy(asc(treatments.category), asc(treatments.name))
    return {
      doctor: { id: doc.id, name: doc.name, email: doc.email, phone: doc.phone ?? '' },
      assigned,
      catalog,
    }
  })

// ── Owner: assign / update a treatment's share % for a doctor (upsert) ──
export const ownerSetDoctorTreatment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      doctorId: z.string(),
      treatmentId: z.string(),
      sharePct: z.number().int().min(0).max(100),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const [existing] = await db
      .select()
      .from(doctorTreatments)
      .where(and(eq(doctorTreatments.doctorId, data.doctorId), eq(doctorTreatments.treatmentId, data.treatmentId)))
      .limit(1)
    if (existing) {
      await db.update(doctorTreatments).set({ sharePct: data.sharePct }).where(eq(doctorTreatments.id, existing.id))
    } else {
      await db.insert(doctorTreatments).values({
        id: crypto.randomUUID(),
        doctorId: data.doctorId,
        treatmentId: data.treatmentId,
        sharePct: data.sharePct,
      })
    }
    return { ok: true }
  })

// ── Owner: remove a treatment from a doctor ──
export const ownerRemoveDoctorTreatment = createServerFn({ method: 'POST' })
  .validator(z.object({ doctorId: z.string(), treatmentId: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    await db
      .delete(doctorTreatments)
      .where(and(eq(doctorTreatments.doctorId, data.doctorId), eq(doctorTreatments.treatmentId, data.treatmentId)))
    return { ok: true }
  })
