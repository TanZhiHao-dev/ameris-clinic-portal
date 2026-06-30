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

const clampPct = (n: number) => Math.min(Math.max(n, 0), 100)

// Eligible (in-scope, non-promo) cart lines — the only lines a voucher can touch.
function eligibleLines(scope: Set<string> | 'all', lines: VoucherLine[]): VoucherLine[] {
  return lines.filter((l) => !l.promoApplied && (scope === 'all' || scope.has(l.treatmentId)))
}

// Discount a voucher yields against a single line (used in 'one_treatment' mode).
function lineDiscount(v: VoucherRow, line: VoucherLine): number {
  const sub = line.unit * line.qty
  if (sub <= 0) return 0
  if (v.discountType === 'amount') return Math.min(v.discountValue, sub)
  return Math.floor((sub * clampPct(v.discountValue)) / 100)
}

// 'one_treatment' targets: each eligible line + the discount it would yield.
export function voucherTargetOptions(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
): { treatmentId: string; discount: number }[] {
  return eligibleLines(scope, lines)
    .map((l) => ({ treatmentId: l.treatmentId, discount: lineDiscount(v, l) }))
    .filter((o) => o.discount > 0)
}

// Default target (max saving) for a 'one_treatment' voucher; null if none apply.
export function bestTargetId(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
): string | null {
  const opts = voucherTargetOptions(v, scope, lines)
  if (opts.length === 0) return null
  return opts.reduce((a, b) => (b.discount > a.discount ? b : a)).treatmentId
}

// Pure: rupiah discount for the cart, IGNORING the minimum-spend gate. Respects
// applyScope: 'cart' = across all eligible lines; 'one_treatment' = one chosen
// line (best-saving line when no/invalid target given). Promo lines excluded.
export function rawVoucherDiscount(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
  targetTreatmentId?: string | null,
): number {
  if (v.applyScope === 'one_treatment') {
    const opts = voucherTargetOptions(v, scope, lines)
    if (opts.length === 0) return 0
    const chosen =
      (targetTreatmentId && opts.find((o) => o.treatmentId === targetTreatmentId)) ||
      opts.reduce((a, b) => (b.discount > a.discount ? b : a))
    return chosen.discount
  }
  const eligible = eligibleLines(scope, lines)
  const sub = eligible.reduce((s, l) => s + l.unit * l.qty, 0)
  if (sub <= 0) return 0
  if (v.discountType === 'amount') return Math.min(v.discountValue, sub)
  return Math.floor((sub * clampPct(v.discountValue)) / 100)
}

// Pure: the discount actually applied — zero until the cart subtotal reaches the
// voucher's minimum spend (minSpend = 0 means no minimum).
export function voucherDiscountFor(
  v: VoucherRow,
  scope: Set<string> | 'all',
  lines: VoucherLine[],
  targetTreatmentId?: string | null,
): number {
  if (v.minSpend > 0 && cartSubtotal(lines) < v.minSpend) return 0
  return rawVoucherDiscount(v, scope, lines, targetTreatmentId)
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
