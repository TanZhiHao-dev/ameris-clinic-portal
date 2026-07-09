// Server-only helpers that read the DB. Kept OUT of any file a client component
// imports directly (products.ts is imported by the /skincare shop), so the
// TanStack Start compiler keeps the Node-only `db`/PGlite import off the client
// bundle. Same pattern as _appointments.ts.
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '#/db'
import { products } from '#/db/schema'

// Validate skincare products for an order: they exist, are active, and — when a
// product tracks stock (stock != null) — have enough on hand. Returns priced
// rows; throws a clear, patient-facing error otherwise. Shared by both checkout
// paths (pickup order + skincare riding along a treatment booking).
export async function resolveProductItems(items: { productId: string; qty: number }[]) {
  const ids = [...new Set(items.map((i) => i.productId))]
  const catalog = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : []
  const byId = new Map(catalog.map((p) => [p.id, p]))
  return items.map((i) => {
    const p = byId.get(i.productId)
    if (!p || !p.isActive) throw new Error('Produk skincare tidak tersedia.')
    if (p.stock != null && p.stock < i.qty) throw new Error(`Stok ${p.name} tidak cukup (tersisa ${p.stock}).`)
    return { productId: p.id, name: p.name, price: p.price, qty: i.qty }
  })
}

// Decrement tracked stock once an order is committed. Clamped at 0 so a race can
// never drive it negative; untracked products (stock null) are left untouched.
export async function decrementProductStock(items: { productId: string; qty: number }[]) {
  for (const i of items) {
    await db
      .update(products)
      .set({ stock: sql`GREATEST(0, ${products.stock} - ${i.qty})` })
      .where(and(eq(products.id, i.productId), isNotNull(products.stock)))
  }
}
