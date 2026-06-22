import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, loyaltyTransactions, transactions, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { loyaltyPointsFor } from '#/data/clinic'
import { requireStaff, requireUser } from './_session'
import { assemble } from './_appointments'

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

// ── Patient: checkout ──
export const createBooking = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(z.object({ treatmentId: z.string(), qty: z.number().int().positive() })).min(1),
      bookingDate: z.string(),
      bookingTime: z.string(),
      paymentMethod: z.enum(['Online', 'Offline', 'Transfer']),
      paymentPlan: z.enum(['full', 'dp']).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const u = await requireUser()
    const ids = data.items.map((i) => i.treatmentId)
    const catalog = await db.select().from(treatments).where(inArray(treatments.id, ids))
    const byId = new Map(catalog.map((t) => [t.id, t]))

    let total = 0
    const rows = data.items.map((i) => {
      const t = byId.get(i.treatmentId)
      if (!t) throw new Error(`Treatment ${i.treatmentId} tidak ditemukan.`)
      total += t.price * i.qty
      return { treatmentId: t.id, name: t.name, price: t.price, qty: i.qty }
    })

    const id = 'AMR-' + (2520 + Math.floor(Math.random() * 7000))
    await db.insert(bookings).values({
      id,
      userId: u.id,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      status: 'Menunggu',
      total,
    })
    await db.insert(bookingItems).values(
      rows.map((r) => ({
        id: crypto.randomUUID(),
        bookingId: id,
        treatmentId: r.treatmentId,
        nameAtBooking: r.name,
        priceAtBooking: r.price,
        qty: r.qty,
      })),
    )
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      bookingId: id,
      amount: total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pending',
      paymentPlan: data.paymentPlan ?? 'full',
    })
    return { id, total, date: data.bookingDate, time: data.bookingTime, status: 'Menunggu' as const }
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
    await db.update(bookings).set({ status: 'Batal' }).where(eq(bookings.id, data.id))
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
    const all = await db.select().from(bookings).orderBy(desc(bookings.bookingDate))
    const dates = Array.from(new Set(all.map((b) => b.bookingDate))).sort()
    const targetDate = data?.date ?? dates[dates.length - 1] ?? ''
    const dayRows = all.filter((b) => b.bookingDate === targetDate)
    const assembled = await assemble(dayRows)
    const names = await db.select({ id: user.id, name: user.name }).from(user)
    const nameById = new Map(names.map((n) => [n.id, n.name]))
    const list = assembled
      .map((b) => ({ ...b, patientId: b.userId, patientName: nameById.get(b.userId) ?? 'Pasien' }))
      .sort((a, b) => a.time.localeCompare(b.time))
    return { date: targetDate, dates, bookings: list }
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
    return { id: data.id, status: data.status }
  })

// Hadir → Selesai: settle payment + grant loyalty points atomically.
export const ownerCompleteBooking = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    const [b] = await db.select().from(bookings).where(eq(bookings.id, data.id))
    if (!b) throw new Error('Booking tidak ditemukan.')
    if (b.status === 'Batal') throw new Error('Booking dibatalkan.')
    // Idempotent: never re-grant loyalty for an already-completed booking.
    if (b.status === 'Selesai') return { id: data.id, status: 'Selesai' as const, pointsAdded: 0 }

    await db.update(bookings).set({ status: 'Selesai' }).where(eq(bookings.id, data.id))
    await db.update(transactions).set({ paymentStatus: 'Lunas' }).where(eq(transactions.bookingId, data.id))

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
