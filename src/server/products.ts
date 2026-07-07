import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { products } from '#/db/schema'
import { requireOwner, requireStaff } from './_session'

// Skincare / retail products. Staff read the active list to record a
// closing/upsell; owner manages the catalog.
export const ownerProducts = createServerFn({ method: 'GET' })
  .validator(z.object({ activeOnly: z.boolean().optional() }).optional())
  .handler(async ({ data }) => {
    await requireStaff()
    const rows = await db.select().from(products).orderBy(asc(products.name))
    return data?.activeOnly ? rows.filter((p) => p.isActive) : rows
  })

export const ownerSaveProduct = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().optional(), name: z.string().min(1), price: z.number().int().nonnegative(), isActive: z.boolean().optional() }))
  .handler(async ({ data }) => {
    await requireOwner()
    const name = data.name.trim()
    if (data.id) {
      const [row] = await db
        .update(products)
        .set({ name, price: data.price, ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) })
        .where(eq(products.id, data.id))
        .returning()
      return row ?? null
    }
    const id = 'prd-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 9999)
    const [row] = await db.insert(products).values({ id, name, price: data.price, isActive: data.isActive ?? true }).returning()
    return row
  })
