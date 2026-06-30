import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray } from 'drizzle-orm'
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
import {
  type VoucherRow,
  parseDate,
  fmtDateWIB,
  listUsableVouchers,
  voucherTreatmentScope,
  rawVoucherDiscount,
  voucherDiscountFor,
  voucherTargetOptions,
  bestTargetId,
  cartSubtotal,
  buildVoucherLines,
} from './_vouchers'

// ── Customer: auto-detect the best voucher for the current cart ──
export const previewBestVoucher = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(z.object({ treatmentId: z.string(), qty: z.number().int().positive() })).min(1),
      // Patient's chosen target for 'one_treatment' vouchers (ignored otherwise).
      targetTreatmentId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const su = await requireUser()
    const [u] = await db.select().from(user).where(eq(user.id, su.id)).limit(1)
    const empty = {
      subtotal: 0,
      discount: 0,
      total: 0,
      voucher: null as null | { id: string; name: string; discountType: 'pct' | 'amount'; discountValue: number; minSpend: number; applyScope: 'cart' | 'one_treatment' },
      // For 'one_treatment' vouchers: the treatments the discount can land on.
      targets: [] as { treatmentId: string; name: string; discount: number }[],
      targetTreatmentId: null as string | null,
      // A voucher that WOULD apply if the patient spent a bit more (blocked only
      // by its minimum spend). Shown as an upsell nudge when nothing applies.
      nudge: null as null | { name: string; needed: number; minSpend: number; discountType: 'pct' | 'amount'; discountValue: number },
    }
    if (!u) return empty

    const lines = await buildVoucherLines(data.items)
    const subtotal = cartSubtotal(lines)
    if (lines.length === 0) return { ...empty, subtotal, total: subtotal }

    const usable = await listUsableVouchers(u)
    let best: { v: VoucherRow; scope: Set<string> | 'all'; discount: number } | null = null
    let nudge: { v: VoucherRow; needed: number } | null = null
    for (const v of usable) {
      const scope = await voucherTreatmentScope(v)
      const raw = rawVoucherDiscount(v, scope, lines) // best-case (one_treatment → best target)
      if (raw <= 0) continue
      const meetsMin = v.minSpend <= 0 || subtotal >= v.minSpend
      if (meetsMin) {
        if (raw > (best?.discount ?? 0)) best = { v, scope, discount: raw }
      } else {
        const needed = v.minSpend - subtotal
        if (!nudge || needed < nudge.needed) nudge = { v, needed }
      }
    }

    let targets: { treatmentId: string; name: string; discount: number }[] = []
    let targetTreatmentId: string | null = null
    let discount = best?.discount ?? 0

    // For a 'one_treatment' voucher, expose the eligible treatments + honor the
    // patient's pick (default = the biggest-saving treatment).
    if (best && best.v.applyScope === 'one_treatment') {
      const opts = voucherTargetOptions(best.v, best.scope, lines)
      const names = opts.length
        ? await db.select({ id: treatments.id, name: treatments.name }).from(treatments).where(inArray(treatments.id, opts.map((o) => o.treatmentId)))
        : []
      const nameById = new Map(names.map((n) => [n.id, n.name]))
      targets = opts.map((o) => ({ treatmentId: o.treatmentId, name: nameById.get(o.treatmentId) ?? '', discount: o.discount }))
      const wanted =
        data.targetTreatmentId && opts.some((o) => o.treatmentId === data.targetTreatmentId)
          ? data.targetTreatmentId
          : bestTargetId(best.v, best.scope, lines)
      targetTreatmentId = wanted
      discount = voucherDiscountFor(best.v, best.scope, lines, wanted)
    }

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
            minSpend: best.v.minSpend,
            applyScope: (best.v.applyScope === 'one_treatment' ? 'one_treatment' : 'cart') as 'cart' | 'one_treatment',
          }
        : null,
      targets,
      targetTreatmentId,
      // Only surface the nudge when no voucher applied, to avoid clutter.
      nudge: !best && nudge
        ? {
            name: nudge.v.name,
            needed: nudge.needed,
            minSpend: nudge.v.minSpend,
            discountType: nudge.v.discountType as 'pct' | 'amount',
            discountValue: nudge.v.discountValue,
          }
        : null,
    }
  })

// ── Customer: list all vouchers the signed-in patient currently holds ──
// Used by the patient dashboard so users can see what they've been granted,
// independent of any cart. The actual discount is still computed at checkout.
export const myVouchers = createServerFn({ method: 'GET' }).handler(async () => {
  const su = await requireUser()
  const [u] = await db.select().from(user).where(eq(user.id, su.id)).limit(1)
  if (!u) return []

  const usable = await listUsableVouchers(u)
  if (usable.length === 0) return []

  // Resolve treatment names for vouchers scoped to specific treatments.
  const out: {
    id: string
    name: string
    discountType: 'pct' | 'amount'
    discountValue: number
    appliesToAll: boolean
    treatmentNames: string[]
    minSpend: number
    validUntil: string
  }[] = []
  for (const v of usable) {
    const scope = await voucherTreatmentScope(v)
    let treatmentNames: string[] = []
    if (scope !== 'all' && scope.size > 0) {
      const rows = await db
        .select({ name: treatments.name })
        .from(treatments)
        .where(inArray(treatments.id, Array.from(scope)))
      treatmentNames = rows.map((r) => r.name)
    }
    out.push({
      id: v.id,
      name: v.name,
      discountType: v.discountType as 'pct' | 'amount',
      discountValue: v.discountValue,
      appliesToAll: scope === 'all',
      treatmentNames,
      minSpend: v.minSpend,
      validUntil: fmtDateWIB(v.validUntil),
    })
  }
  return out
})

// ── Owner: management ──
const voucherInput = z.object({
  name: z.string().min(1),
  discountType: z.enum(['pct', 'amount']),
  discountValue: z.number().int().positive(),
  audience: z.enum(['new_user', 'all', 'specific']),
  appliesToAllNormal: z.boolean(),
  applyScope: z.enum(['cart', 'one_treatment']).optional(),
  newUserWindowDays: z.number().int().positive().max(365).optional(),
  minSpend: z.number().int().nonnegative().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  treatmentIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
})

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
    applyScope: (v.applyScope === 'one_treatment' ? 'one_treatment' : 'cart') as 'cart' | 'one_treatment',
    newUserWindowDays: v.newUserWindowDays,
    minSpend: v.minSpend,
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
        applyScope: data.applyScope ?? 'cart',
        newUserWindowDays: data.newUserWindowDays ?? 7,
        minSpend: data.minSpend ?? 0,
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
    await db.transaction(async (tx) => {
      await tx
        .update(vouchers)
        .set({
          name: data.name.trim(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          audience: data.audience,
          appliesToAllNormal: data.appliesToAllNormal,
          applyScope: data.applyScope ?? 'cart',
          newUserWindowDays: data.newUserWindowDays ?? 7,
          minSpend: data.minSpend ?? 0,
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
    await db.delete(vouchers).where(eq(vouchers.id, data.id))
    return { ok: true }
  })

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
