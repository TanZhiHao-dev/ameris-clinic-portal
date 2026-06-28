import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { loyaltyTransactions, treatments } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireUser } from './_session'

// Redemption ladder: treatments that have a point_cost, ordered by cost.
export const redeemTiers = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db
    .select()
    .from(treatments)
    .where(isNotNull(treatments.pointCost))
    .orderBy(asc(treatments.pointCost))
  return rows.map((t) => ({ point: t.pointCost!, name: t.name, treatmentId: t.id }))
})

export const loyaltySummary = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireUser()
  const points = u.loyaltyPoints ?? 0
  const tiers = await db
    .select()
    .from(treatments)
    .where(isNotNull(treatments.pointCost))
    .orderBy(asc(treatments.pointCost))
  const next = tiers.find((t) => (t.pointCost ?? 0) > points)
  return { points, nextTier: next ? { point: next.pointCost!, name: next.name } : null }
})

export const loyaltyHistory = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireUser()
  const rows = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, u.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
  return rows.map((r) => ({
    label: r.label,
    delta: r.delta,
    date: r.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
  }))
})

export const redeemPoints = createServerFn({ method: 'POST' })
  .validator(z.object({ treatmentId: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireUser()
    const [t] = await db.select().from(treatments).where(eq(treatments.id, data.treatmentId)).limit(1)
    if (!t || t.pointCost == null) throw new Error('Treatment tidak bisa ditukar dengan poin.')
    const pointCost = t.pointCost

    // Atomic check-and-deduct: only succeeds if user still has enough points at
    // update time, preventing double-spend under concurrent requests.
    const result = await db
      .update(user)
      .set({ loyaltyPoints: sql`coalesce(${user.loyaltyPoints}, 0) - ${pointCost}` })
      .where(and(eq(user.id, u.id), sql`coalesce(${user.loyaltyPoints}, 0) >= ${pointCost}`))
      .returning()
    if (result.length === 0) throw new Error('Poin tidak mencukupi.')

    const newPoints = result[0].loyaltyPoints ?? 0
    await db.insert(loyaltyTransactions).values({
      id: crypto.randomUUID(),
      userId: u.id,
      label: `Tukar poin — ${t.name}`,
      delta: -pointCost,
      treatmentId: t.id,
    })
    return { pointsAfter: newPoints, redeemed: t.name }
  })
