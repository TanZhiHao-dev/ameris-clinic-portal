import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { effectivePrice, type Treatment } from '../data/clinic'
import { gaItems, track } from './analytics'

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  // Per-unit treatments (e.g. Botox): qty means units, with an enforced minimum.
  pricePerUnit?: boolean
  minUnits?: number
}

type CartCtx = {
  items: CartItem[]
  add: (t: Treatment, qty?: number) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  count: number
  subtotal: number
  hydrated: boolean
}

// Lowest quantity allowed for a treatment: its unit minimum for per-unit
// treatments (clamped to ≥1), otherwise 1.
export const minQtyFor = (t: { pricePerUnit?: boolean; minUnits?: number }) =>
  t.pricePerUnit ? Math.max(1, t.minUnits ?? 1) : 1

const Ctx = createContext<CartCtx | null>(null)
const KEY = 'ameris-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items, hydrated])

  const add = (t: Treatment, qty?: number) => {
    const min = minQtyFor(t)
    // Per-unit: default to the minimum (or the explicit qty, floored at min).
    // Normal treatments: default to one session.
    const addQty = Math.max(qty ?? min, t.pricePerUnit ? min : 1)
    const price = effectivePrice(t)
    track('add_to_cart', { currency: 'IDR', value: price * addQty, items: gaItems([{ id: t.id, name: t.name, price, qty: addQty }]) })
    setItems((cur) => {
      const ex = cur.find((i) => i.id === t.id)
      if (ex) return cur.map((i) => (i.id === t.id ? { ...i, qty: i.qty + addQty } : i))
      // Store the effective (promo-aware) price so the cart subtotal reflects the discount.
      return [...cur, { id: t.id, name: t.name, price, qty: addQty, pricePerUnit: t.pricePerUnit, minUnits: min }]
    })
  }

  const remove = (id: string) => setItems((cur) => cur.filter((i) => i.id !== id))

  const setQty = (id: string, qty: number) =>
    setItems((cur) =>
      cur.flatMap((i) => {
        if (i.id !== id) return [i]
        // Clamp per-unit items to their minimum; only a true zero removes them.
        const min = minQtyFor(i)
        if (qty <= 0) return i.pricePerUnit ? [{ ...i, qty: min }] : []
        return [{ ...i, qty: Math.max(min, qty) }]
      }),
    )

  const clear = () => setItems([])

  const count = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, count, subtotal, hydrated }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used within CartProvider')
  return c
}
