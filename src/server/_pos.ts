// Server-only POS helpers (read the DB) — kept out of pos.ts's top level since
// owner.pos.tsx imports that module directly; same pattern as _products.ts.
import { inArray } from 'drizzle-orm'
import { db } from '#/db'
import { treatments } from '#/db/schema'

export type PosItemInput = {
  treatmentId: string
  qty: number
  discountMode?: 'rp' | 'pct'
  discountValue?: number
}

export type PosChargedRow = {
  treatmentId: string
  name: string
  /** Unit price actually charged: catalog (promo-aware) minus the manual walk-in discount. */
  price: number
  qty: number
  /** Whether the catalog promo price was in effect (vouchers never stack on promo lines). */
  promoApplied: boolean
}

// Clamp a manual walk-in discount off a catalog unit price — it can only ever
// lower the price, never mark it up.
export function discountedUnit(catalogUnit: number, mode: 'rp' | 'pct' | undefined, value: number | undefined) {
  const dv = value ?? 0
  const off = mode === 'pct'
    ? Math.round((catalogUnit * Math.min(Math.max(dv, 0), 100)) / 100)
    : Math.min(Math.max(dv, 0), catalogUnit)
  return Math.max(0, catalogUnit - off)
}

// Authoritative charged lines for a POS sale — catalog prices (promo-aware)
// with the staff's manual discount clamped so it can only lower the price.
export async function posChargedRows(items: PosItemInput[]): Promise<PosChargedRow[]> {
  const ids = items.map((i) => i.treatmentId)
  const catalog = ids.length ? await db.select().from(treatments).where(inArray(treatments.id, ids)) : []
  const byId = new Map(catalog.map((t) => [t.id, t]))
  return items.map((i) => {
    const t = byId.get(i.treatmentId)
    if (!t) throw new Error('Treatment tidak ditemukan.')
    const promo = !!(t.isPromo && t.promoNow != null && t.promoNow < t.price)
    const catalogUnit = promo ? t.promoNow! : t.price
    const unit = discountedUnit(catalogUnit, i.discountMode, i.discountValue)
    return { treatmentId: t.id, name: t.name, price: unit, qty: i.qty, promoApplied: promo }
  })
}
