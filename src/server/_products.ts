// Server-only helpers that read the DB. Kept OUT of any file a client component
// imports directly (products.ts is imported by the /skincare shop), so the
// TanStack Start compiler keeps the Node-only `db`/PGlite import off the client
// bundle. Same pattern as _appointments.ts.
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '#/db'
import { inventoryItems, inventoryMovements, products } from '#/db/schema'

type ProductRow = typeof products.$inferSelect
export type ResolvedProductItem = { productId: string; name: string; price: number; qty: number; inventoryItemId: string | null }

// A product's effective stock: the linked inventory item's stock when linked,
// otherwise the product's own standalone stock. null = untracked / unlimited.
export async function effectiveStockFor(rows: ProductRow[]): Promise<Map<string, { stock: number | null; invId: string | null; invName: string | null }>> {
  const invIds = [...new Set(rows.map((p) => p.inventoryItemId).filter((x): x is string => !!x))]
  const invItems = invIds.length ? await db.select().from(inventoryItems).where(inArray(inventoryItems.id, invIds)) : []
  const invById = new Map(invItems.map((it) => [it.id, it]))
  return new Map(
    rows.map((p) => {
      const inv = p.inventoryItemId ? invById.get(p.inventoryItemId) : null
      const stock = inv ? inv.stock : p.stock
      return [p.id, { stock: stock ?? null, invId: p.inventoryItemId ?? null, invName: inv?.name ?? null }]
    }),
  )
}

// Validate skincare products for an order: they exist, are active, and — when
// stock is tracked (linked inventory or standalone) — have enough on hand.
// Returns priced rows carrying the inventory link so decrement knows the source.
export async function resolveProductItems(items: { productId: string; qty: number }[]): Promise<ResolvedProductItem[]> {
  const ids = [...new Set(items.map((i) => i.productId))]
  const catalog = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : []
  const byId = new Map(catalog.map((p) => [p.id, p]))
  const stockBy = await effectiveStockFor(catalog)
  return items.map((i) => {
    const p = byId.get(i.productId)
    if (!p || !p.isActive) throw new Error('Produk skincare tidak tersedia.')
    const stock = stockBy.get(p.id)?.stock ?? null
    if (stock != null && stock < i.qty) throw new Error(`Stok ${p.name} tidak cukup (tersisa ${stock}).`)
    return { productId: p.id, name: p.name, price: p.price, qty: i.qty, inventoryItemId: p.inventoryItemId ?? null }
  })
}

// Apply a signed change in SOLD quantity for products, used when an existing
// sale's lines are edited: delta > 0 = more sold (stock goes down), delta < 0 =
// returned/removed (stock comes back). Keeps the inventory link + movement
// trail consistent either way. Unknown/untracked products are skipped.
export async function applyProductSaleDelta(deltas: { productId: string; delta: number }[], orderId: string) {
  for (const d of deltas) {
    if (!d.delta) continue
    const [p] = await db.select().from(products).where(eq(products.id, d.productId)).limit(1)
    if (!p) continue
    if (p.inventoryItemId) {
      const [it] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, p.inventoryItemId)).limit(1)
      if (!it) continue
      const after = Math.max(0, Math.round((it.stock - d.delta) * 100) / 100)
      await db.update(inventoryItems).set({ stock: after, updatedAt: new Date() }).where(eq(inventoryItems.id, p.inventoryItemId))
      await db.insert(inventoryMovements).values({
        id: crypto.randomUUID(),
        itemId: p.inventoryItemId,
        delta: -d.delta,
        reason: d.delta > 0 ? 'penjualan' : 'penyesuaian',
        note: `Edit ${orderId}`,
        balanceAfter: after,
      })
    } else if (p.stock != null) {
      await db
        .update(products)
        .set({ stock: sql`GREATEST(0, ${products.stock} - ${d.delta})` })
        .where(eq(products.id, d.productId))
    }
  }
}

// Decrement stock once an order is committed. A linked product draws down the
// inventory item (and logs a 'penjualan' movement for the audit trail); an
// unlinked product decrements its own standalone stock. Clamped at 0.
export async function decrementProductStock(rows: ResolvedProductItem[], orderId: string) {
  for (const r of rows) {
    if (r.inventoryItemId) {
      const [it] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, r.inventoryItemId)).limit(1)
      if (!it) continue
      const after = Math.max(0, Math.round((it.stock - r.qty) * 100) / 100)
      await db.update(inventoryItems).set({ stock: after, updatedAt: new Date() }).where(eq(inventoryItems.id, r.inventoryItemId))
      await db.insert(inventoryMovements).values({ id: crypto.randomUUID(), itemId: r.inventoryItemId, delta: -r.qty, reason: 'penjualan', note: `Order ${orderId}`, balanceAfter: after })
    } else {
      await db
        .update(products)
        .set({ stock: sql`GREATEST(0, ${products.stock} - ${r.qty})` })
        .where(and(eq(products.id, r.productId), isNotNull(products.stock)))
    }
  }
}
