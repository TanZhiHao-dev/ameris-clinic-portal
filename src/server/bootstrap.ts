import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { account, user } from '#/db/auth-schema'
import { auth } from '#/lib/auth'

// Non-destructive owner bootstrap: ensure an owner account exists with the given
// email + password (email/password login). Idempotent — if the email already
// exists it is promoted to owner and its password reset; otherwise a new owner
// is created. Used by the token-guarded /api/bootstrap-owner route so a fresh
// owner can be provisioned on a permanent prod DB without a destructive re-seed.
export async function ensureOwner({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name?: string
}): Promise<{ ok: true; created: boolean; userId: string; email: string }> {
  const normEmail = email.trim().toLowerCase()
  const [existing] = await db.select().from(user).where(eq(user.email, normEmail)).limit(1)

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  let userId: string
  let created: boolean
  if (existing) {
    userId = existing.id
    created = false
    if (existing.role !== 'owner') {
      await db.update(user).set({ role: 'owner' }).where(eq(user.id, userId))
    }
  } else {
    userId = 'ow-' + randomUUID().slice(0, 8)
    created = true
    await db.insert(user).values({
      id: userId,
      name: name?.trim() || 'Owner',
      email: normEmail,
      emailVerified: true,
      role: 'owner',
      loyaltyPoints: 0,
    })
  }

  // Upsert the credential row so the holder can sign in with `password`.
  const [cred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1)
  if (cred) {
    await db.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, cred.id))
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return { ok: true, created, userId, email: normEmail }
}
