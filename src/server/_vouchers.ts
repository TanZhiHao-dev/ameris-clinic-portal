import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { treatments, vouchers, voucherTreatments, voucherUsers, voucherRedemptions } from '#/db/schema'

export type VoucherRow = typeof vouchers.$inferSelect

export type VoucherLine = { treatmentId: string; unit: number; qty: number; promoApplied: boolean }

const DAY_MS = 86_400_000

export const WIB = '+07:00'
export const dateFmtWIB = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function parseDate(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null
  const d = new Date(s + (endOfDay ? `T23:59:59.999${WIB}` : `T00:00:00${WIB}`))
  return isNaN(d.getTime()) ? null : d
}

export function fmtDateWIB(d: Date | null): string {
  return d ? dateFmtWIB.format(d) : ''
}

async function isVoucherUsable(v: VoucherRow, u: { id: string; createdAt: Date }): Promise<boolean> {
  if (!v.isActive) return false
  const now = Date.now()
  if (v.validFrom && now < v.validFrom.getTime()) return false
  if (v.validUntil && now > v.validUntil.getTime()) return false

  if (v.audience === 'new_user') {
    if (now > u.createdAt.getTime() + v.newUserWindowDays * DAY_MS) return false
  } else if (v.audience === 'specific') {
    const [link] = await db
      .select()
      .from(voucherUsers)
      .where(and(eq(voucherUsers.voucherId, v.id), eq(voucherUsers.userId, u.id)))
      .limit(1)
    if (!link) return false
  }

  const reds = await db
    .select()
    .from(voucherRedemptions)
    .where(and(eq(voucherRedemptions.voucherId, v.id), eq(voucherRedemptions.userId, u.id)))
  if (reds.length >= v.maxUsesPerUser) return false

  return true
}

export async function loadUsableVoucher(
  voucherId: string,
  u: { id: string; createdAt: Date },
): Promise<VoucherRow | null> {
  const [v] = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1)
  if (!v) return null
  return (await isVoucherUsable(v, u)) ? v : null
}

export async function listUsableVouchers(u: { id: string; createdAt: Date }): Promise<VoucherRow[]> {
  const active = await db.select().from(vouchers).where(eq(vouchers.isActive, true))
  const out: VoucherRow[] = []
  for (const v of active) {
    if (await isVoucherUsable(v, u)) out.push(v)
  }
  return out
}

export async function voucherTreatmentScope(v: VoucherRow): Promise<Set<string> | 'all'> {
  if (v.appliesToAllNormal) return 'all'
  const rows = await db
    .select({ treatmentId: voucherTreatments.treatmentId })
    .from(voucherTreatments)
    .where(eq(voucherTreatments.voucherId, v.id))
  return new Set(rows.map((r) => r.treatmentId))
}

// Full cart subtotal (every selected line at the price actually paid — promo
// prices included). This is what the voucher's minimum-spend is measured against.
export function cartSubtotal(lines: VoucherLine[]): number {
  return lines.reduce((s, l) => s + l.unit * l.qty, 0)
}

// Pure: rupiah discount for the given cart lines, IGNORING the minimum-spend
// gate. Promo lines are excluded; the discount only ever touches normal-priced
// eligible items. Used directly for the "spend a bit more to unlock" nudge.
export function rawVoucherDiscount(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
): number {
  const eligible = lines.filter(
    (l) => !l.promoApplied && (scope === 'all' || scope.has(l.treatmentId)),
  )
  const sub = eligible.reduce((s, l) => s + l.unit * l.qty, 0)
  if (sub <= 0) return 0
  if (v.discountType === 'amount') return Math.min(v.discountValue, sub)
  const pct = Math.min(Math.max(v.discountValue, 0), 100)
  return Math.floor((sub * pct) / 100)
}

// Pure: the discount actually applied — zero until the cart subtotal reaches the
// voucher's minimum spend (minSpend = 0 means no minimum).
export function voucherDiscountFor(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
): number {
  if (v.minSpend > 0 && cartSubtotal(lines) < v.minSpend) return 0
  return rawVoucherDiscount(v, scope, lines)
}

export async function buildVoucherLines(
  items: { treatmentId: string; qty: number }[],
): Promise<VoucherLine[]> {
  const ids = items.map((i) => i.treatmentId)
  if (ids.length === 0) return []
  const catalog = await db.select().from(treatments).where(inArray(treatments.id, ids))
  const byId = new Map(catalog.map((t) => [t.id, t]))
  const lines: VoucherLine[] = []
  for (const i of items) {
    const t = byId.get(i.treatmentId)
    if (!t) continue
    const promoApplied = t.isPromo && t.promoNow != null && t.promoNow < t.price
    const unit = promoApplied ? t.promoNow! : t.price
    lines.push({ treatmentId: t.id, unit, qty: i.qty, promoApplied })
  }
  return lines
}
