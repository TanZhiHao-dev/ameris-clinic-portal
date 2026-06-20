import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookings, medicalRecords } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireStaff } from './_session'
import { assemble } from './_appointments'

function patientShape(
  u: typeof user.$inferSelect,
  bks: { status: string; bookingDate: string }[],
) {
  const completed = bks.filter((b) => b.status === 'Selesai')
  const dates = bks.map((b) => b.bookingDate).sort()
  return {
    id: u.id,
    name: u.name,
    phone: u.phone ?? '',
    birthDate: u.birthDate ?? '',
    points: u.loyaltyPoints ?? 0,
    visits: completed.length,
    lastVisit: dates[dates.length - 1] ?? u.createdAt.toISOString().slice(0, 10),
    joined: u.createdAt.toISOString().slice(0, 10),
  }
}

export const ownerPatients = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    await requireStaff()
    const users = await db.select().from(user).where(eq(user.role, 'pasien'))
    const allBookings = await db.select({ userId: bookings.userId, status: bookings.status, bookingDate: bookings.bookingDate }).from(bookings)
    const byUser = new Map<string, { status: string; bookingDate: string }[]>()
    for (const b of allBookings) {
      const arr = byUser.get(b.userId) ?? []
      arr.push(b)
      byUser.set(b.userId, arr)
    }
    let list = users.map((u) => patientShape(u, byUser.get(u.id) ?? []))
    const q = data?.q?.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
    return list.sort((a, b) => a.name.localeCompare(b.name))
  })

export const ownerPatient = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [u] = await db.select().from(user).where(eq(user.id, data.id)).limit(1)
    if (!u) return null
    const bks = await db.select().from(bookings).where(eq(bookings.userId, u.id)).orderBy(desc(bookings.bookingDate))
    const history = await assemble(bks)
    const records = await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.userId, u.id))
      .orderBy(desc(medicalRecords.createdAt))
    return {
      patient: patientShape(u, bks),
      history,
      records: records.map((r) => ({
        id: r.id,
        patientId: r.userId,
        bookingId: r.bookingId ?? '—',
        treatment: r.treatment,
        skin: r.skin ?? '',
        notes: r.notes,
        beforeImage: r.beforeImage,
        afterImage: r.afterImage,
        date: r.createdAt.toISOString().slice(0, 10),
      })),
    }
  })

// Staff (owner/doctor) can register a new walk-in patient when the name isn't
// found — so an EMR can be started for them right away. No login credential is
// created (clinic record only); the owner can grant one later if needed.
export const createPatient = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(2),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaff()
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'pasien'
    const id = 'pt-' + crypto.randomUUID().slice(0, 8)
    const email = `${slug}.${crypto.randomUUID().slice(0, 4)}@walkin.ameris.local`
    const [row] = await db
      .insert(user)
      .values({
        id,
        name: data.name.trim(),
        email,
        emailVerified: false,
        role: 'pasien',
        phone: data.phone?.trim() || null,
        birthDate: data.birthDate || null,
        loyaltyPoints: 0,
      })
      .returning()
    return { id: row.id, name: row.name }
  })

export const createMedicalRecord = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      patientId: z.string(),
      bookingId: z.string().optional(),
      treatment: z.string().min(1),
      skin: z.string().optional(),
      notes: z.string().min(1),
      beforeImage: z.string().optional(),
      afterImage: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaff()
    const id = 'mr-' + crypto.randomUUID().slice(0, 8)
    const [row] = await db
      .insert(medicalRecords)
      .values({
        id,
        userId: data.patientId,
        bookingId: data.bookingId === '—' ? null : data.bookingId ?? null,
        treatment: data.treatment,
        skin: data.skin ?? null,
        notes: data.notes,
        beforeImage: data.beforeImage ?? null,
        afterImage: data.afterImage ?? null,
      })
      .returning()
    return {
      id: row.id,
      patientId: row.userId,
      bookingId: row.bookingId ?? '—',
      treatment: row.treatment,
      skin: row.skin ?? '',
      notes: row.notes,
      beforeImage: row.beforeImage,
      afterImage: row.afterImage,
      date: row.createdAt.toISOString().slice(0, 10),
    }
  })
