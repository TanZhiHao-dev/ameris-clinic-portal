import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookings, transactions } from '#/db/schema'
import { requireOwner } from './_session'
import { assemble, attachNames } from './_appointments'

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
