import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookings } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireOwner } from './_session'
import { assemble, attachNames } from './_appointments'

// Demo reference "today" (matches the seeded schedule).
const TODAY = '2026-06-20'

export const ownerDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const allBks = await db.select().from(bookings)
  const all = await attachNames(await assemble(allBks))

  const today = all.filter((b) => b.date === TODAY && b.status !== 'Batal')
  const revenueToday = today.filter((b) => b.payStatus === 'Lunas').reduce((s, b) => s + b.total, 0)
  const waitingCount = all.filter((b) => b.status === 'Menunggu').length
  const [{ count: totalPatients }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, 'pasien'))
  const pendingPayments = all.filter((b) => b.payStatus === 'Pending' && b.status !== 'Batal')

  return {
    date: TODAY,
    todayArrivals: today.length,
    revenueToday,
    waitingCount,
    totalPatients,
    todaySchedule: today.sort((a, b) => a.time.localeCompare(b.time)),
    pendingPayments,
  }
})

const RANGES: Record<string, { label: string; data: { label: string; value: number }[] }> = {
  '7h': {
    label: '7 Hari',
    data: [
      { label: 'Sen', value: 2_100_000 }, { label: 'Sel', value: 3_400_000 },
      { label: 'Rab', value: 1_800_000 }, { label: 'Kam', value: 4_200_000 },
      { label: 'Jum', value: 3_050_000 }, { label: 'Sab', value: 6_300_000 },
      { label: 'Min', value: 2_700_000 },
    ],
  },
  '4w': {
    label: '4 Minggu',
    data: [
      { label: 'Mg 1', value: 14_200_000 }, { label: 'Mg 2', value: 18_600_000 },
      { label: 'Mg 3', value: 12_900_000 }, { label: 'Mg 4', value: 23_550_000 },
    ],
  },
  '6m': {
    label: '6 Bulan',
    data: [
      { label: 'Jan', value: 12_400_000 }, { label: 'Feb', value: 34_800_000 },
      { label: 'Mar', value: 41_200_000 }, { label: 'Apr', value: 38_500_000 },
      { label: 'Mei', value: 52_300_000 }, { label: 'Jun', value: 47_900_000 },
    ],
  },
}

export const ownerRevenue = createServerFn({ method: 'GET' })
  .validator(z.object({ range: z.enum(['7h', '4w', '6m']) }))
  .handler(async ({ data }) => {
    await requireOwner()
    const r = RANGES[data.range]
    return { data: r.data, total: r.data.reduce((s, p) => s + p.value, 0) }
  })
