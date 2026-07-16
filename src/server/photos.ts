import { createServerFn } from '@tanstack/react-start'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { patientPhotoSets } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requirePhotoAccess } from './_session'

// A data-URL image, capped so a compressed 3-angle set can't bloat the DB. The
// client downscales to ~1280px/JPEG (~200-400 KB); 3 MB is a defensive ceiling.
const MAX_IMAGE_CHARS = 3 * 1024 * 1024
const imageField = z
  .string()
  .refine((s) => s.startsWith('data:image/'), 'Format gambar tidak valid.')
  .refine((s) => s.length <= MAX_IMAGE_CHARS, 'Gambar terlalu besar.')
  .optional()
  .nullable()

// Patient picker for the photo studio — id/name/phone only, plus how many photo
// sets each already has + the most recent capture date. Deliberately excludes
// EMR / bookings / finance so the admin's scope stays narrow.
export const photoPatients = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    await requirePhotoAccess()
    const users = await db
      .select({ id: user.id, name: user.name, phone: user.phone })
      .from(user)
      .where(eq(user.role, 'pasien'))
    const counts = await db
      .select({
        userId: patientPhotoSets.userId,
        sets: sql<number>`count(*)::int`,
        last: sql<string | null>`max(${patientPhotoSets.createdAt})`,
      })
      .from(patientPhotoSets)
      .groupBy(patientPhotoSets.userId)
    const byUser = new Map(counts.map((c) => [c.userId, c]))
    let list = users.map((u) => {
      const c = byUser.get(u.id)
      return {
        id: u.id,
        name: u.name,
        phone: u.phone ?? '',
        sets: c?.sets ?? 0,
        lastPhoto: c?.last ? new Date(c.last).toISOString().slice(0, 10) : '',
      }
    })
    const q = data?.q?.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
    // Patients with photos first (most recent), then the rest alphabetically.
    return list.sort((a, b) => (b.lastPhoto > a.lastPhoto ? 1 : b.lastPhoto < a.lastPhoto ? -1 : a.name.localeCompare(b.name)))
  })

// Register a walk-in patient when the name isn't found — a clinic record only
// (no login credential), same as the POS/EMR createPatient but photo-scoped.
export const createPhotoPatient = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(2), phone: z.string().optional(), birthDate: z.string().optional() }))
  .handler(async ({ data }) => {
    await requirePhotoAccess()
    const id = 'pt-' + crypto.randomUUID().slice(0, 8)
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'pasien'
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
    return { id: row.id, name: row.name, phone: row.phone ?? '' }
  })

const setShape = (r: typeof patientPhotoSets.$inferSelect) => ({
  id: r.id,
  phase: (r.phase === 'after' ? 'after' : 'before') as 'before' | 'after',
  label: r.label ?? '',
  front: r.frontImage ?? null,
  left: r.leftImage ?? null,
  right: r.rightImage ?? null,
  note: r.note ?? '',
  date: r.createdAt.toISOString().slice(0, 10),
  createdAt: r.createdAt.toISOString(),
})

// Save one capture session (a patient's before OR after set, up to 3 angles).
export const savePhotoSet = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      patientId: z.string(),
      phase: z.enum(['before', 'after']),
      label: z.string().optional(),
      note: z.string().optional(),
      frontImage: imageField,
      leftImage: imageField,
      rightImage: imageField,
    }),
  )
  .handler(async ({ data }) => {
    const staff = await requirePhotoAccess()
    const [p] = await db.select({ role: user.role }).from(user).where(eq(user.id, data.patientId)).limit(1)
    if (!p || p.role !== 'pasien') throw new Error('Pasien tidak ditemukan.')
    if (!data.frontImage && !data.leftImage && !data.rightImage) throw new Error('Ambil minimal satu foto dulu.')
    const id = 'ph-' + crypto.randomUUID().slice(0, 10)
    const [row] = await db
      .insert(patientPhotoSets)
      .values({
        id,
        userId: data.patientId,
        phase: data.phase,
        label: data.label?.trim() || null,
        note: data.note?.trim() || null,
        frontImage: data.frontImage ?? null,
        leftImage: data.leftImage ?? null,
        rightImage: data.rightImage ?? null,
        takenById: staff.id,
      })
      .returning()
    return setShape(row)
  })

// All photo sets for a patient, newest first (for the gallery/compare view).
export const listPatientPhotoSets = createServerFn({ method: 'GET' })
  .validator(z.object({ patientId: z.string() }))
  .handler(async ({ data }) => {
    await requirePhotoAccess()
    const rows = await db
      .select()
      .from(patientPhotoSets)
      .where(eq(patientPhotoSets.userId, data.patientId))
      .orderBy(desc(patientPhotoSets.createdAt))
    return rows.map(setShape)
  })

// Remove a capture session (e.g. a blurry/wrong shot). Owner or admin.
export const deletePhotoSet = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requirePhotoAccess()
    await db.delete(patientPhotoSets).where(eq(patientPhotoSets.id, data.id))
    return { ok: true }
  })
