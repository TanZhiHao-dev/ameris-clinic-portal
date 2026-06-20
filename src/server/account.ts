import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { notifications } from '#/db/schema'
import { user } from '#/db/auth-schema'
import { requireUser } from './_session'

export const myProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireUser()
  const [row] = await db.select().from(user).where(eq(user.id, u.id)).limit(1)
  if (!row) return null
  return {
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    birthDate: row.birthDate ?? '',
    points: row.loyaltyPoints ?? 0,
    role: row.role,
    memberSince: row.createdAt.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
  }
})

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const u = await requireUser()
    await db.update(user).set(data).where(eq(user.id, u.id))
    return { ok: true }
  })

export const myNotifications = createServerFn({ method: 'GET' }).handler(async () => {
  const u = await requireUser()
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, u.id))
    .orderBy(desc(notifications.createdAt))
  const unreadCount = rows.filter((r) => !r.isRead).length
  return {
    unreadCount,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      unread: !r.isRead,
      time: r.createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    })),
  }
})

export const markNotificationsRead = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const u = await requireUser()
    if (data?.id) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, data.id))
    } else {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, u.id))
    }
    return { ok: true }
  })
