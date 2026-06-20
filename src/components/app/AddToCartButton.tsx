import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useCart } from '../../lib/cart'
import type { Treatment } from '../../data/clinic'

export function AddToCartButton({
  t,
  className = 'btn btn-ghost px-4 py-2 text-sm',
  label = 'Keranjang',
}: {
  t: Treatment
  className?: string
  label?: string
}) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <button
      type="button"
      disabled={!t.available}
      onClick={() => {
        add(t)
        setAdded(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setAdded(false), 1500)
      }}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
      aria-label={`Tambah ${t.name} ke keranjang`}
    >
      {added ? (
        <>
          <Check size={16} /> Ditambahkan
        </>
      ) : (
        <>
          <Plus size={16} /> {label}
        </>
      )}
    </button>
  )
}
