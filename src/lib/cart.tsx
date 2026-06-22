import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { effectivePrice, type Treatment } from '../data/clinic'

export type CartItem = { id: string; name: string; price: number; qty: number }

type CartCtx = {
  items: CartItem[]
  add: (t: Treatment) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  count: number
  subtotal: number
  hydrated: boolean
}

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

  const add = (t: Treatment) =>
    setItems((cur) => {
      const ex = cur.find((i) => i.id === t.id)
      if (ex) return cur.map((i) => (i.id === t.id ? { ...i, qty: i.qty + 1 } : i))
      // Store the effective (promo-aware) price so the cart subtotal reflects the discount.
      return [...cur, { id: t.id, name: t.name, price: effectivePrice(t), qty: 1 }]
    })

  const remove = (id: string) => setItems((cur) => cur.filter((i) => i.id !== id))

  const setQty = (id: string, qty: number) =>
    setItems((cur) =>
      qty <= 0
        ? cur.filter((i) => i.id !== id)
        : cur.map((i) => (i.id === id ? { ...i, qty } : i)),
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
