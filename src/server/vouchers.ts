import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import {
  treatments,
  vouchers,
  voucherTreatments,
  voucherUsers,
  voucherRedemptions,
} from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireOwner, requireUser } from './_session'

export type VoucherRow = typeof vouchers.$inferSelect

// A single cart line with the AUTHORITATIVE unit price already resolved and a
// flag marking whether the promo price was applied (promo items never receive a
// voucher discount — the two never stack).
export type VoucherLine = { treatmentId: string; unit: number; qty: number; promoApplied: boolean }

const DAY_MS = 86_400_000

// ── Eligibility (shared by checkout preview + createBooking) ──

// Is this voucher currently usable by this user? Checks active flag, calendar
// window, audience, and the per-user usage cap. Pure read — no mutation.
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
  // audience 'all' → no extra gate

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

async function listUsableVouchers(u: { id: string; createdAt: Date }): Promise<VoucherRow[]> {
  const active = await db.select().from(vouchers).where(eq(vouchers.isActive, true))
  const out: VoucherRow[] = []
  for (const v of active) {
    if (await isVoucherUsable(v, u)) out.push(v)
  }
  return out
}

// The treatments a voucher covers — 'all' for non-promo treatments, else the
// owner's selected set.
export async function voucherTreatmentScope(v: VoucherRow): Promise<Set<string> | 'all'> {
  if (v.appliesToAllNormal) return 'all'
  const rows = await db
    .select({ treatmentId: voucherTreatments.treatmentId })
    .from(voucherTreatments)
    .where(eq(voucherTreatments.voucherId, v.id))
  return new Set(rows.map((r) => r.treatmentId))
}

// Pure: rupiah discount for the given cart lines. Promo lines are excluded; the
// discount only ever touches normal-priced eligible items.
export function voucherDiscountFor(
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

// Build authoritative cart lines from raw {treatmentId, qty} items. Mirrors the
// pricing rule in createBooking so previews match the charged total exactly.
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

// ── Customer: auto-detect the best voucher for the current cart ──
export const previewBestVoucher = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(z.object({ treatmentId: z.string(), qty: z.number().int().positive() })).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const su = await requireUser()
    const [u] = await db.select().from(user).where(eq(user.id, su.id)).limit(1)
    // Always returns the AUTHORITATIVE subtotal/total (from live DB prices) so the
    // checkout summary matches exactly what createBooking charges, even if the
    // client's cached cart prices are stale.
    const empty = { subtotal: 0, discount: 0, total: 0, voucher: null as null | { id: string; name: string; discountType: 'pct' | 'amount'; discountValue: number } }
    if (!u) return empty

    const lines = await buildVoucherLines(data.items)
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0)
    if (lines.length === 0) return { ...empty, subtotal, total: subtotal }

    const usable = await listUsableVouchers(u)
    let best: { v: VoucherRow; discount: number } | null = null
    for (const v of usable) {
      const scope = await voucherTreatmentScope(v)
      const discount = voucherDiscountFor(v, scope, lines)
      if (discount > 0 && discount > (best?.discount ?? 0)) best = { v, discount }
    }
    const discount = best?.discount ?? 0
    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      voucher: best
        ? {
            id: best.v.id,
            name: best.v.name,
            discountType: best.v.discountType as 'pct' | 'amount',
            discountValue: best.v.discountValue,
          }
        : null,
    }
  })

// ── Owner: management ──
const voucherInput = z.object({
  name: z.string().min(1),
  discountType: z.enum(['pct', 'amount']),
  discountValue: z.number().int().positive(),
  audience: z.enum(['new_user', 'all', 'specific']),
  appliesToAllNormal: z.boolean(),
  newUserWindowDays: z.number().int().positive().max(365).optional(),
  validFrom: z.string().optional(), // YYYY-MM-DD (inclusive)
  validUntil: z.string().optional(), // YYYY-MM-DD (inclusive)
  maxUsesPerUser: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  treatmentIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
})

// Clinic timezone is WIB (UTC+7). Build + read voucher window boundaries with an
// explicit offset so they're independent of the server's timezone (prod = UTC).
const WIB = '+07:00'
const dateFmtWIB = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Parse a YYYY-MM-DD into a Date in WIB, or null. validUntil is end-of-day inclusive.
function parseDate(s: string | undefined, endOfDay = false): Date | null {
  if (!s) return null
  const d = new Date(s + (endOfDay ? `T23:59:59.999${WIB}` : `T00:00:00${WIB}`))
  return isNaN(d.getTime()) ? null : d
}

// Serialize a stored instant back to a WIB calendar date (YYYY-MM-DD) so the
// owner UI round-trips the exact date that was entered, regardless of server TZ.
function fmtDateWIB(d: Date | null): string {
  return d ? dateFmtWIB.format(d) : ''
}

export const listVouchersAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const vs = await db.select().from(vouchers).orderBy(desc(vouchers.createdAt))
  const vt = await db.select().from(voucherTreatments)
  const vu = await db.select().from(voucherUsers)
  const reds = await db.select().from(voucherRedemptions)
  const userIdsNeeded = Array.from(new Set(vu.map((r) => r.userId)))
  const names = userIdsNeeded.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIdsNeeded))
    : []
  const nameById = new Map(names.map((n) => [n.id, n.name]))

  return vs.map((v) => ({
    id: v.id,
    name: v.name,
    discountType: v.discountType as 'pct' | 'amount',
    discountValue: v.discountValue,
    audience: v.audience as 'new_user' | 'all' | 'specific',
    appliesToAllNormal: v.appliesToAllNormal,
    newUserWindowDays: v.newUserWindowDays,
    validFrom: fmtDateWIB(v.validFrom),
    validUntil: fmtDateWIB(v.validUntil),
    maxUsesPerUser: v.maxUsesPerUser,
    isActive: v.isActive,
    treatmentIds: vt.filter((r) => r.voucherId === v.id).map((r) => r.treatmentId),
    users: vu
      .filter((r) => r.voucherId === v.id)
      .map((r) => ({ id: r.userId, name: nameById.get(r.userId) ?? 'Pasien' })),
    redemptionCount: reds.filter((r) => r.voucherId === v.id).length,
  }))
})

// dbx is the db handle or a transaction handle (same query API). Typed loosely
// because the db is a PGlite|Postgres union whose tx types don't unify cleanly.
async function writeLinks(dbx: any, voucherId: string, treatmentIds: string[], userIds: string[], audience: string) {
  if (treatmentIds.length) {
    await dbx.insert(voucherTreatments).values(
      treatmentIds.map((tid: string) => ({ id: crypto.randomUUID(), voucherId, treatmentId: tid })),
    )
  }
  if (audience === 'specific' && userIds.length) {
    await dbx.insert(voucherUsers).values(
      userIds.map((uid: string) => ({ id: crypto.randomUUID(), voucherId, userId: uid })),
    )
  }
}

export const createVoucher = createServerFn({ method: 'POST' })
  .validator(voucherInput)
  .handler(async ({ data }) => {
    await requireOwner()
    const id = 'vc-' + crypto.randomUUID().slice(0, 8)
    await db.transaction(async (tx) => {
      await tx.insert(vouchers).values({
        id,
        name: data.name.trim(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        audience: data.audience,
        appliesToAllNormal: data.appliesToAllNormal,
        newUserWindowDays: data.newUserWindowDays ?? 7,
        validFrom: parseDate(data.validFrom),
        validUntil: parseDate(data.validUntil, true),
        maxUsesPerUser: data.maxUsesPerUser ?? 1,
        isActive: data.isActive ?? true,
      })
      await writeLinks(tx, id, data.appliesToAllNormal ? [] : data.treatmentIds ?? [], data.userIds ?? [], data.audience)
    })
    return { id }
  })

export const updateVoucher = createServerFn({ method: 'POST' })
  .validator(voucherInput.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    // Atomic: update + re-write link tables together so a link-write failure
    // can't leave the voucher with zero links (which would silently disable it).
    await db.transaction(async (tx) => {
      await tx
        .update(vouchers)
        .set({
          name: data.name.trim(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          audience: data.audience,
          appliesToAllNormal: data.appliesToAllNormal,
          newUserWindowDays: data.newUserWindowDays ?? 7,
          validFrom: parseDate(data.validFrom),
          validUntil: parseDate(data.validUntil, true),
          maxUsesPerUser: data.maxUsesPerUser ?? 1,
          isActive: data.isActive ?? true,
        })
        .where(eq(vouchers.id, data.id))
      await tx.delete(voucherTreatments).where(eq(voucherTreatments.voucherId, data.id))
      await tx.delete(voucherUsers).where(eq(voucherUsers.voucherId, data.id))
      await writeLinks(tx, data.id, data.appliesToAllNormal ? [] : data.treatmentIds ?? [], data.userIds ?? [], data.audience)
    })
    return { id: data.id }
  })

export const deleteVoucher = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    await db.delete(vouchers).where(eq(vouchers.id, data.id)) // cascades to links + redemptions
    return { ok: true }
  })

// Owner: search patients by name to attach to a 'specific'-audience voucher.
export const searchVoucherUsers = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const q = data.q.trim().toLowerCase()
    if (q.length < 2) return []
    const rows = await db
      .select({ id: user.id, name: user.name, phone: user.phone })
      .from(user)
      .where(eq(user.role, 'pasien'))
    return rows
      .filter((r) => r.name.toLowerCase().includes(q) || (r.phone ?? '').includes(q))
      .slice(0, 20)
      .map((r) => ({ id: r.id, name: r.name, phone: r.phone ?? '' }))
  })
