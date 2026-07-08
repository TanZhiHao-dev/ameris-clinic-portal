import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { inventoryItems, inventoryMovements } from '#/db/schema'
import { requireOwner, requireStaff } from './_session'

const CATEGORIES = ['Alat', 'Bahan', 'Bahan - Treatment Baru', 'Skincare Retail', 'Obat', 'P3K & Emergency'] as const
const REASONS = ['pembelian', 'pemakaian', 'penyesuaian', 'opname', 'import'] as const

const wibToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

// 'expired' | 'soon' (≤60 days) | 'ok' from a 'YYYY-MM' or 'YYYY-MM-DD' string.
export function expiryStatus(expiry: string | null): 'expired' | 'soon' | 'ok' | null {
  if (!expiry) return null
  let iso = expiry.trim()
  if (/^\d{4}-\d{2}$/.test(iso)) {
    const [y, m] = iso.split('-').map(Number)
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    iso = `${iso}-${String(lastDay).padStart(2, '0')}`
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const today = wibToday()
  if (iso < today) return 'expired'
  const soonCutoff = new Date(new Date(today + 'T00:00:00Z').getTime() + 60 * 86_400_000).toISOString().slice(0, 10)
  return iso <= soonCutoff ? 'soon' : 'ok'
}

const decorate = (r: typeof inventoryItems.$inferSelect) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  spec: r.spec ?? '',
  unit: r.unit,
  stock: r.stock,
  rawCount: r.rawCount ?? '',
  minStock: r.minStock,
  expiry: r.expiry ?? '',
  notes: r.notes ?? '',
  expStatus: expiryStatus(r.expiry),
  low: r.minStock > 0 && r.stock <= r.minStock,
})

export const ownerInventory = createServerFn({ method: 'GET' })
  .validator(z.object({ category: z.enum(CATEGORIES).optional(), q: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    await requireStaff()
    const rows = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.archived, false))
      .orderBy(asc(inventoryItems.category), asc(inventoryItems.name))
    let list = rows.map(decorate)
    if (data?.category) list = list.filter((r) => r.category === data.category)
    const q = data?.q?.trim().toLowerCase()
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.spec.toLowerCase().includes(q))
    // Clinic-wide counters for the alert strip.
    const all = rows.map(decorate)
    return {
      items: list,
      counts: {
        total: all.length,
        expired: all.filter((r) => r.expStatus === 'expired').length,
        soon: all.filter((r) => r.expStatus === 'soon').length,
        low: all.filter((r) => r.low).length,
      },
    }
  })

export const ownerSaveItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      category: z.enum(CATEGORIES),
      spec: z.string().optional(),
      unit: z.string().min(1),
      rawCount: z.string().optional(), // '' clears
      minStock: z.number().nonnegative().optional(),
      expiry: z.string().optional(), // '' clears
      notes: z.string().optional(),
      initialStock: z.number().nonnegative().optional(), // new items only
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const patch = {
      name: data.name.trim(),
      category: data.category,
      spec: data.spec?.trim() || null,
      unit: data.unit.trim(),
      rawCount: data.rawCount?.trim() || null,
      minStock: data.minStock ?? 0,
      expiry: data.expiry?.trim() || null,
      notes: data.notes?.trim() || null,
      updatedAt: new Date(),
    }
    if (data.id) {
      const [row] = await db.update(inventoryItems).set(patch).where(eq(inventoryItems.id, data.id)).returning()
      return row ? decorate(row) : null
    }
    const id = 'inv-' + crypto.randomUUID().slice(0, 8)
    const stock = data.initialStock ?? 0
    const [row] = await db.insert(inventoryItems).values({ id, ...patch, stock }).returning()
    if (stock > 0) {
      await db.insert(inventoryMovements).values({ id: crypto.randomUUID(), itemId: id, delta: stock, reason: 'penyesuaian', note: 'Stok awal', balanceAfter: stock })
    }
    return decorate(row)
  })

// Record a stock in/out and update the running balance atomically-ish. Rejects a
// move that would drive the balance below zero (except an explicit penyesuaian).
export const ownerStockMove = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      itemId: z.string(),
      delta: z.number().refine((n) => n !== 0, 'Jumlah tidak boleh 0'),
      reason: z.enum(REASONS),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaff()
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, data.itemId)).limit(1)
    if (!item) throw new Error('Item tidak ditemukan.')
    const balanceAfter = Math.round((item.stock + data.delta) * 100) / 100
    if (balanceAfter < 0 && data.reason !== 'penyesuaian') {
      throw new Error(`Stok tidak cukup — tersisa ${item.stock} ${item.unit}.`)
    }
    await db.update(inventoryItems).set({ stock: Math.max(0, balanceAfter), updatedAt: new Date() }).where(eq(inventoryItems.id, data.itemId))
    await db.insert(inventoryMovements).values({
      id: crypto.randomUUID(),
      itemId: data.itemId,
      delta: data.delta,
      reason: data.reason,
      note: data.note?.trim() || null,
      balanceAfter: Math.max(0, balanceAfter),
    })
    return { itemId: data.itemId, stock: Math.max(0, balanceAfter) }
  })

export const ownerItemMovements = createServerFn({ method: 'GET' })
  .validator(z.object({ itemId: z.string() }))
  .handler(async ({ data }) => {
    await requireStaff()
    const rows = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.itemId, data.itemId))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(100)
    return rows.map((m) => ({
      id: m.id,
      delta: m.delta,
      reason: m.reason,
      note: m.note ?? '',
      balanceAfter: m.balanceAfter,
      date: m.createdAt.toISOString(),
    }))
  })

export const ownerArchiveItem = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), archived: z.boolean() }))
  .handler(async ({ data }) => {
    await requireOwner()
    await db.update(inventoryItems).set({ archived: data.archived, updatedAt: new Date() }).where(eq(inventoryItems.id, data.id))
    return { id: data.id, archived: data.archived }
  })

// Bulk upsert from a parsed Excel (client parses the .xlsx and sends rows).
// Key = category + name + spec (case-insensitive). Existing item whose stock
// differs gets an 'opname' movement (delta = new − old); a new item is created
// with an 'import' opening movement. Metadata (unit/expiry/notes) is refreshed
// when provided so a re-upload with corrections updates in place.
export const ownerImportInventory = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      rows: z
        .array(
          z.object({
            category: z.enum(CATEGORIES),
            name: z.string().min(1),
            spec: z.string().optional(),
            unit: z.string().optional(),
            stock: z.number().nonnegative().optional(),
            rawCount: z.string().optional(),
            expiry: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .min(1)
        .max(2000),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner()
    const existing = await db.select().from(inventoryItems)
    const key = (c: string, n: string, s: string | null | undefined) => `${c}||${n.trim().toLowerCase()}||${(s ?? '').trim().toLowerCase()}`
    const byKey = new Map(existing.map((r) => [key(r.category, r.name, r.spec), r]))

    let created = 0
    let updated = 0
    let unchanged = 0
    for (const row of data.rows) {
      const found = byKey.get(key(row.category, row.name, row.spec))
      const newStock = row.stock ?? 0
      if (found) {
        // Refresh metadata when the sheet provides it.
        const meta: Partial<typeof inventoryItems.$inferInsert> = { updatedAt: new Date() }
        if (row.unit) meta.unit = row.unit.trim()
        if (row.rawCount !== undefined) meta.rawCount = row.rawCount.trim() || null
        if (row.spec !== undefined && row.spec.trim()) meta.spec = row.spec.trim()
        if (row.expiry !== undefined) meta.expiry = row.expiry.trim() || null
        if (row.notes !== undefined) meta.notes = row.notes.trim() || null
        const stockChanged = row.stock !== undefined && Math.abs(newStock - found.stock) > 1e-9
        if (stockChanged) meta.stock = newStock
        await db.update(inventoryItems).set(meta).where(eq(inventoryItems.id, found.id))
        if (stockChanged) {
          await db.insert(inventoryMovements).values({
            id: crypto.randomUUID(), itemId: found.id, delta: Math.round((newStock - found.stock) * 100) / 100,
            reason: 'opname', note: 'Import Excel', balanceAfter: newStock,
          })
          updated++
        } else {
          unchanged++
        }
      } else {
        const id = 'inv-' + crypto.randomUUID().slice(0, 8)
        await db.insert(inventoryItems).values({
          id, name: row.name.trim(), category: row.category, spec: row.spec?.trim() || null,
          unit: row.unit?.trim() || 'pcs', stock: newStock, rawCount: row.rawCount?.trim() || null,
          expiry: row.expiry?.trim() || null, notes: row.notes?.trim() || null,
        })
        if (newStock > 0) {
          await db.insert(inventoryMovements).values({
            id: crypto.randomUUID(), itemId: id, delta: newStock, reason: 'import', note: 'Import Excel (item baru)', balanceAfter: newStock,
          })
        }
        created++
      }
    }
    return { created, updated, unchanged, total: data.rows.length }
  })
