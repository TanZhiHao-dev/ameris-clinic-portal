import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookings } from '#/db/schema'
import { account, user } from '#/db/auth-schema'
import { auth } from '#/lib/auth'
import { requireOwner } from './_session'

// The three account roles the clinic portal recognises.
const ROLES = ['owner', 'dokter', 'pasien'] as const
type Role = (typeof ROLES)[number]
const roleOrder: Record<string, number> = { owner: 0, dokter: 1, pasien: 2 }

const normalizeRole = (r: string | null): Role => (r === 'owner' || r === 'dokter' ? r : 'pasien')
const normalizeEmail = (e: string) => e.trim().toLowerCase()

function accountShape(u: typeof user.$inferSelect, bookingCount: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    role: normalizeRole(u.role),
    birthDate: u.birthDate ?? '',
    points: u.loyaltyPoints ?? 0,
    bookingCount,
    joined: u.createdAt.toISOString().slice(0, 10),
  }
}

async function countOwners(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, 'owner'))
  return n
}

// Email + password auth: a login needs a Better-Auth-hashed `credential` account
// row. Upsert it so created accounts can sign in and the owner can reset a
// forgotten password.
async function setCredentialPassword(userId: string, plain: string) {
  const ctx = await auth.$context
  const password = await ctx.password.hash(plain)
  const [existing] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1)
  if (existing) {
    await db.update(account).set({ password, updatedAt: new Date() }).where(eq(account.id, existing.id))
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

// ── Owner: list every account (owner / doctor / patient) ──
export const ownerListAccounts = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional(), role: z.enum(ROLES).optional() }).optional())
  .handler(async ({ data }) => {
    await requireOwner()
    const users = await db.select().from(user).orderBy(asc(user.name))

    // One grouped pass for booking counts instead of N queries.
    const counts = await db
      .select({ userId: bookings.userId, n: sql<number>`count(*)::int` })
      .from(bookings)
      .groupBy(bookings.userId)
    const countById = new Map(counts.map((c) => [c.userId, c.n]))

    let list = users.map((u) => accountShape(u, countById.get(u.id) ?? 0))

    if (data?.role) list = list.filter((u) => u.role === data.role)
    const q = data?.q?.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q),
      )
    }
    return list.sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name))
  })

// ── Owner: create an account ──
// Email + password auth: insert the user row, then a hashed credential so the
// holder can sign in at /masuk with the password the owner sets here.
export const ownerCreateAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(2, 'Nama minimal 2 karakter.'),
      email: z.string().trim().email('Email tidak valid.'),
      password: z.string().min(6, 'Password minimal 6 karakter.'),
      role: z.enum(ROLES),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      loyaltyPoints: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const email = normalizeEmail(data.email)
    const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
    if (taken) throw new Error('Email sudah dipakai akun lain.')

    const id = 'u-' + crypto.randomUUID().slice(0, 8)
    const [row] = await db
      .insert(user)
      .values({
        id,
        name: data.name.trim(),
        email,
        emailVerified: true,
        role: data.role,
        phone: data.phone?.trim() || null,
        birthDate: data.birthDate || null,
        loyaltyPoints: data.loyaltyPoints ?? 0,
      })
      .returning()
    await setCredentialPassword(id, data.password)
    return accountShape(row, 0)
  })

// ── Owner: edit an account ──
export const ownerUpdateAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      name: z.string().trim().min(2).optional(),
      email: z.string().trim().email('Email tidak valid.').optional(),
      password: z.string().min(6, 'Password minimal 6 karakter.').optional(),
      role: z.enum(ROLES).optional(),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      loyaltyPoints: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const me = await requireOwner()
    const [target] = await db.select().from(user).where(eq(user.id, data.id)).limit(1)
    if (!target) throw new Error('Akun tidak ditemukan.')

    // Guard against locking the clinic out of its owner console.
    if (data.role && data.role !== 'owner' && normalizeRole(target.role) === 'owner') {
      if (data.id === me.id) throw new Error('Tidak bisa mengubah role akun Anda sendiri.')
      if ((await countOwners()) <= 1) throw new Error('Minimal harus ada satu owner.')
    }

    const patch: Partial<typeof user.$inferInsert> = {}
    if (data.name !== undefined) patch.name = data.name.trim()
    if (data.role !== undefined) patch.role = data.role
    if (data.phone !== undefined) patch.phone = data.phone.trim() || null
    if (data.birthDate !== undefined) patch.birthDate = data.birthDate || null
    if (data.loyaltyPoints !== undefined) patch.loyaltyPoints = data.loyaltyPoints
    if (data.email !== undefined) {
      const email = normalizeEmail(data.email)
      const [taken] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`${user.email} = ${email} and ${user.id} <> ${data.id}`)
        .limit(1)
      if (taken) throw new Error('Email sudah dipakai akun lain.')
      patch.email = email
    }

    const [row] = await db.update(user).set(patch).where(eq(user.id, data.id)).returning()
    if (data.password) await setCredentialPassword(data.id, data.password)
    const [{ n: bookingCount }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.userId, row.id))
    return accountShape(row, bookingCount)
  })

// ── Owner: delete an account ──
// FKs to user.id all cascade, so this also removes the holder's bookings,
// transactions, medical records, loyalty ledger, and notifications.
export const ownerDeleteAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const me = await requireOwner()
    if (data.id === me.id) throw new Error('Tidak bisa menghapus akun Anda sendiri.')

    const [target] = await db.select().from(user).where(eq(user.id, data.id)).limit(1)
    if (!target) throw new Error('Akun tidak ditemukan.')
    if (normalizeRole(target.role) === 'owner' && (await countOwners()) <= 1) {
      throw new Error('Minimal harus ada satu owner.')
    }

    await db.delete(user).where(eq(user.id, data.id))
    return { ok: true, id: data.id }
  })
