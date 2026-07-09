import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { bookingItems, bookings, products, transactions } from '#/db/schema'
import { requireOwner, requireStaff, requireUser } from './_session'
import { decrementProductStock, effectiveStockFor, resolveProductItems } from './_products'

// Clinic-local (WIB) date so an evening order lands on the right calendar day.
const wibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })

// Skincare / retail products. Staff read the active list to record a
// closing/upsell; owner manages the catalog.
export const ownerProducts = createServerFn({ method: 'GET' })
  .validator(z.object({ activeOnly: z.boolean().optional() }).optional())
  .handler(async ({ data }) => {
    await requireStaff()
    const rows = await db.select().from(products).orderBy(asc(products.name))
    const list = data?.activeOnly ? rows.filter((p) => p.isActive) : rows
    const stockBy = await effectiveStockFor(list)
    // Override `stock` with the effective (inventory-linked) value + surface the
    // linked item's name so the editor can show where the stock comes from.
    return list.map((p) => ({ ...p, stock: stockBy.get(p.id)?.stock ?? null, inventoryName: stockBy.get(p.id)?.invName ?? null }))
  })

// Patient-facing shop list — active products only, with photo + blurb.
export const publicProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name))
  const stockBy = await effectiveStockFor(rows)
  return rows.map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.image ?? null, description: p.description ?? null, stock: stockBy.get(p.id)?.stock ?? null }))
})

export const ownerSaveProduct = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      price: z.number().int().nonnegative(),
      image: z.string().optional(), // '' clears
      description: z.string().optional(),
      stock: z.number().int().min(0).nullable().optional(), // null = untracked
      inventoryItemId: z.string().nullable().optional(), // link to Skincare Retail stock
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const name = data.name.trim()
    const meta = {
      name,
      price: data.price,
      ...(data.image !== undefined ? { image: data.image.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.inventoryItemId !== undefined ? { inventoryItemId: data.inventoryItemId || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    }
    if (data.id) {
      const [row] = await db.update(products).set(meta).where(eq(products.id, data.id)).returning()
      return row ?? null
    }
    const id = 'prd-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 9999)
    const [row] = await db.insert(products).values({ id, ...meta, isActive: data.isActive ?? true }).returning()
    return row
  })

// Patient buys skincare for pickup at the clinic — a retail order that reuses the
// booking/transaction tables so it flows into Transaksi + revenue, but reserves
// NO appointment slot (source 'skincare', excluded from the schedule board).
export const createProductOrder = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })).min(1),
      paymentMethod: z.enum(['Offline', 'Transfer']),
    }),
  )
  .handler(async ({ data }) => {
    const u = await requireUser()

    // Validate + price against the catalog (stock-checked) — never trust client amounts.
    const rows = await resolveProductItems(data.items)
    const total = rows.reduce((s, r) => s + r.price * r.qty, 0)

    const now = new Date()
    const id = 'AMR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
    // status 'Hadir' + Pending mirrors an unsettled POS bill, so the owner settles
    // it from Transaksi (approve payment, then "Selesaikan" on handover).
    await db.insert(bookings).values({
      id,
      userId: u.id,
      bookingDate: wibDate.format(now),
      bookingTime: '—',
      status: 'Hadir',
      total,
      source: 'skincare',
    })
    await db.insert(bookingItems).values(
      rows.map((r) => ({ id: crypto.randomUUID(), bookingId: id, treatmentId: null, nameAtBooking: r.name, priceAtBooking: r.price, qty: r.qty })),
    )
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      bookingId: id,
      amount: total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pending',
      paymentPlan: 'full',
    })
    await decrementProductStock(rows, id)
    return { id, total, paymentMethod: data.paymentMethod }
  })
