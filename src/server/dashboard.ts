import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookings } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireOwner } from './_session'
import { assemble, attachNames } from './_appointments'

// Clinic timezone is WIB (UTC+7). Compute "today" in WIB so it's correct on a
// UTC production server (booking dates are stored as WIB calendar dates).
const dateFmtWIB = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
function todayWIB(): string {
  return dateFmtWIB.format(new Date())
}
// Absolute instant for WIB midnight of a YYYY-MM-DD string (for day arithmetic).
function wibMidnight(ymd: string): number {
  return new Date(ymd + 'T00:00:00+07:00').getTime()
}

const DAY_MS = 86_400_000
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const ownerDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const TODAY = todayWIB()
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

// Revenue series computed from real settled (Lunas) bookings, attributed to the
// appointment date. Empty/zero when there are no paid bookings yet.
export const ownerRevenue = createServerFn({ method: 'GET' })
  .validator(z.object({ range: z.enum(['7h', '4w', '6m']) }))
  .handler(async ({ data }) => {
    await requireOwner()
    const allBks = await db.select().from(bookings)
    const all = await assemble(allBks)
    const paid = all.filter((b) => b.payStatus === 'Lunas' && b.status !== 'Batal')
    const byDate = new Map<string, number>()
    for (const b of paid) byDate.set(b.date, (byDate.get(b.date) ?? 0) + b.total)

    const today = todayWIB()
    const anchor = wibMidnight(today)
    const out: { label: string; value: number }[] = []

    if (data.range === '7h') {
      // Last 7 days, one bucket per day.
      for (let i = 6; i >= 0; i--) {
        const ds = dateFmtWIB.format(new Date(anchor - i * DAY_MS))
        const dow = new Date(ds + 'T12:00:00Z').getUTCDay()
        out.push({ label: DOW[dow], value: byDate.get(ds) ?? 0 })
      }
    } else if (data.range === '4w') {
      // Last 4 weeks (7-day buckets), Mg 1 = oldest, Mg 4 = most recent.
      for (let k = 3; k >= 0; k--) {
        let value = 0
        for (let d = 0; d < 7; d++) {
          const ds = dateFmtWIB.format(new Date(anchor - (k * 7 + d) * DAY_MS))
          value += byDate.get(ds) ?? 0
        }
        out.push({ label: `Mg ${4 - k}`, value })
      }
    } else {
      // Last 6 calendar months including the current month.
      const [yy, mm] = today.split('-').map(Number) // mm: 1-12
      for (let i = 5; i >= 0; i--) {
        let m = mm - 1 - i
        let y = yy
        while (m < 0) {
          m += 12
          y -= 1
        }
        const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
        let value = 0
        for (const [ds, v] of byDate) if (ds.startsWith(prefix)) value += v
        out.push({ label: MON[m], value })
      }
    }
    return { data: out, total: out.reduce((s, p) => s + p.value, 0) }
  })
