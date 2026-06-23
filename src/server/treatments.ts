import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { treatments } from '#/db/schema'
import type { Category } from '#/data/clinic'
import { requireOwner } from './_session'

export type ClientTreatment = {
  id: string
  name: string
  blurb: string
  category: Category
  duration: string
  price: number
  pricePerUnit: boolean // when true, price is shown as "Rp.../unit"
  available: boolean
  bestSeller: boolean
  isPromo: boolean
  pointCost: number | null
  promoPrice: number | null // owner-set promo price; discount derived vs `price`
  image?: string
}

type Row = typeof treatments.$inferSelect

const toClient = (t: Row): ClientTreatment => ({
  id: t.id,
  name: t.name,
  blurb: t.blurb,
  category: t.category as Category,
  duration: t.duration,
  price: t.price,
  pricePerUnit: t.pricePerUnit,
  available: t.isAvailable,
  bestSeller: t.isBestSeller,
  isPromo: t.isPromo,
  pointCost: t.pointCost,
  promoPrice: t.promoNow ?? null,
  image: t.image ?? undefined,
})

// Public variant: swap the (possibly huge data-URL) image for a lightweight URL
// to the image endpoint so list/detail payloads stay small. `v` (image length)
// busts the browser cache when the owner uploads a different image.
const toPublic = (t: Row): ClientTreatment => ({
  ...toClient(t),
  image: t.image
    ? `/api/treatment-image?id=${encodeURIComponent(t.id)}&v=${t.image.length}`
    : undefined,
})

export const listTreatments = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(treatments).orderBy(asc(treatments.name))
  return rows.map(toPublic)
})

export const getTreatment = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [row] = await db.select().from(treatments).where(eq(treatments.id, data.id)).limit(1)
    if (!row) return null
    const related = await db
      .select()
      .from(treatments)
      .where(and(eq(treatments.category, row.category), ne(treatments.id, row.id)))
      .limit(3)
    return { ...toPublic(row), related: related.map(toPublic) }
  })

// A treatment is "on promo" when isPromo is on AND the owner set a promo price
// below the regular price. The strikethrough "was" is always the regular price,
// so the discount stays correct even if the regular price changes later.
export const listPromos = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(treatments).where(eq(treatments.isPromo, true))
  return rows
    .filter((r) => r.promoNow != null && r.promoNow < r.price)
    .map((r) => ({ name: r.name, detail: r.blurb, was: r.price, now: r.promoNow! }))
})

// ── Owner catalog management ──
export const listTreatmentsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const rows = await db.select().from(treatments).orderBy(asc(treatments.category), asc(treatments.name))
  return rows.map((t) => ({ ...toClient(t), promo: t.isPromo }))
})

export const createTreatment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(1),
      category: z.string(),
      duration: z.string(),
      price: z.number().int().nonnegative(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 9999)
    const [row] = await db
      .insert(treatments)
      .values({ id, name: data.name, category: data.category, duration: data.duration, price: data.price })
      .returning()
    return toClient(row)
  })

export const updateTreatment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      price: z.number().int().nonnegative().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      duration: z.string().optional(),
      pricePerUnit: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      isPromo: z.boolean().optional(),
      promoNow: z.number().int().nonnegative().nullable().optional(), // owner-set promo price (null clears)
      pointCost: z.number().int().nullable().optional(),
      image: z.string().nullable().optional(), // URL or data URL; null clears it
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const { id, ...patch } = data
    const [row] = await db.update(treatments).set(patch).where(eq(treatments.id, id)).returning()
    return row ? toClient(row) : null
  })

export const deleteTreatment = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    await db.delete(treatments).where(eq(treatments.id, data.id))
    return { ok: true }
  })
