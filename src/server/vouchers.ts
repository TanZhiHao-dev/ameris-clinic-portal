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
  voucherDiscountFor,
  buildVoucherLines,
} from './_vouchers'

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
  newUserWindowDays: z.number().int().positive().max(365).optional(),
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
