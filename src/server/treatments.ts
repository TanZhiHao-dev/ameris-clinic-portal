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
  blurbEn: string | null // optional English subtitle; falls back to `blurb`
  category: Category
  duration: string
  price: number
  pricePerUnit: boolean // when true, price is shown as "Rp.../unit"
  minUnits: number // per-unit treatments: minimum units a patient must book (1 = none)
  unitPresets: UnitPreset[] // per-unit quick-pick options, e.g. 50 "daerah tertentu", 100 "full face"
  available: boolean
  bestSeller: boolean
  heroFeatured: boolean // the single treatment shown in the landing hero card
  isPromo: boolean
  pointCost: number | null
  beauticianBonus: number // fixed Rp bonus for the beautician who performs it
  promoPrice: number | null // owner-set promo price; discount derived vs `price`
  image?: string
}

type Row = typeof treatments.$inferSelect

// A per-unit quick-pick: a unit count with an optional descriptive label
// (e.g. 50 "daerah tertentu", 100 "full face").
export type UnitPreset = { units: number; label: string | null }

// Parse the owner's free-text preset field into a clean, sorted, de-duplicated
// list. Comma-separated entries; each is a unit count optionally followed by a
// label after "=" / ":" (or just a space). Examples that all parse:
//   "50, 100"                            → [{50}, {100}]
//   "50=daerah tertentu, 100=full face"  → [{50,'daerah tertentu'}, {100,'full face'}]
//   "50 unit (daerah tertentu)"          → [{50,'daerah tertentu'}]
export function parseUnitPresets(raw: string | null | undefined): UnitPreset[] {
  if (!raw) return []
  const seen = new Set<number>()
  const out: UnitPreset[] = []
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(\d+)\s*(?:unit\b)?\s*[=:]?\s*(.*)$/i)
    if (!m) continue
    const units = parseInt(m[1], 10)
    if (!Number.isFinite(units) || units <= 0 || seen.has(units)) continue
    seen.add(units)
    const label = m[2].trim().replace(/^\((.*)\)$/, '$1').trim()
    out.push({ units, label: label || null })
  }
  return out.sort((a, b) => a.units - b.units)
}

// Serialize a preset list back to the stored/displayed text form
// ("50=daerah tertentu, 100=full face").
export function serializeUnitPresets(list: UnitPreset[]): string {
  return list.map((p) => (p.label ? `${p.units}=${p.label}` : String(p.units))).join(', ')
}

const toClient = (t: Row): ClientTreatment => ({
  id: t.id,
  name: t.name,
  blurb: t.blurb,
  blurbEn: t.blurbEn ?? null,
  category: t.category as Category,
  duration: t.duration,
  price: t.price,
  pricePerUnit: t.pricePerUnit,
  minUnits: t.minUnits,
  unitPresets: parseUnitPresets(t.unitPresets),
  available: t.isAvailable,
  bestSeller: t.isBestSeller,
  heroFeatured: t.isHeroFeatured,
  isPromo: t.isPromo,
  pointCost: t.pointCost,
  beauticianBonus: t.beauticianBonus,
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
      blurb: z.string().optional(), // Indonesian description
      blurbEn: z.string().optional(), // English description
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const id = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 9999)
    const [row] = await db
      .insert(treatments)
      .values({
        id,
        name: data.name,
        category: data.category,
        duration: data.duration,
        price: data.price,
        blurb: data.blurb?.trim() || '',
        blurbEn: data.blurbEn?.trim() || null,
      })
      .returning()
    return toClient(row)
  })

export const updateTreatment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      price: z.number().int().nonnegative().optional(),
      name: z.string().optional(),
      blurb: z.string().optional(), // Indonesian subtitle
      blurbEn: z.string().nullable().optional(), // English subtitle (null clears)
      category: z.string().optional(),
      duration: z.string().optional(),
      pricePerUnit: z.boolean().optional(),
      minUnits: z.number().int().positive().optional(),
      unitPresets: z.string().nullable().optional(), // raw "50, 100"; null clears
      isAvailable: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isHeroFeatured: z.boolean().optional(),
      isPromo: z.boolean().optional(),
      promoNow: z.number().int().nonnegative().nullable().optional(), // owner-set promo price (null clears)
      pointCost: z.number().int().nullable().optional(),
      beauticianBonus: z.number().int().nonnegative().optional(), // fixed Rp bonus per treatment

      image: z.string().max(3_000_000).nullable().optional(), // URL or data URL; null clears it
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const { id, ...patch } = data
    // Normalise the preset field to a clean canonical string (or null) so the DB
    // never holds the owner's raw whitespace/garbage.
    if (patch.unitPresets !== undefined) {
      const cleaned = parseUnitPresets(patch.unitPresets)
      patch.unitPresets = cleaned.length ? serializeUnitPresets(cleaned) : null
    }
    // A non-best-seller can't be the hero pick.
    if (patch.isBestSeller === false) patch.isHeroFeatured = false
    // The hero is single-select: turning it on clears it from every other row.
    if (patch.isHeroFeatured === true) {
      await db.update(treatments).set({ isHeroFeatured: false }).where(ne(treatments.id, id))
    }
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
