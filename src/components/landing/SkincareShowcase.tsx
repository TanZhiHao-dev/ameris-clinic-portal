import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Package, Plus, ShoppingBag } from 'lucide-react'
import { publicProducts } from '../../server/products'
import { useCart } from '../../lib/cart'
import { formatRp } from '../../data/clinic'

// Landing showcase for retail skincare — a few products with a clear path into
// the /skincare shop. Buying flows through the same cart as treatments.
export function SkincareShowcase() {
  const { data: products = [] } = useQuery({ queryKey: ['public-products'], queryFn: () => publicProducts() })
  const { addProduct, items } = useCart()
  const qtyOf = (id: string) => items.find((i) => i.id === id)?.qty ?? 0
  const shown = products.slice(0, 6)

  return (
    <section id="skincare" className="relative overflow-hidden py-24 sm:py-28" style={{ background: 'var(--color-shell)' }}>
      <div className="shell-x relative">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">Katalog Produk</span>
            <h2 className="mt-3 text-[2.4rem] leading-[1.08] sm:text-[3rem]">
              Skincare <span className="gold-text italic">pilihan</span> Ameris
            </h2>
          </div>
          <p className="max-w-sm text-[1.02rem] md:text-right" style={{ color: 'var(--color-ink-muted)' }}>
            Produk perawatan yang direkomendasikan dokter. Pesan online, ambil di klinik — checkout jadi satu dengan treatment.
          </p>
        </div>

        {shown.length > 0 && (
          <div className="reveal mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => {
              const n = qtyOf(p.id)
              return (
                <article key={p.id} className="card-luxe flex h-full flex-col p-3">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl" style={{ background: 'var(--color-muted)' }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center" style={{ color: 'var(--color-gold-deep)' }}><Package size={38} /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-3 pb-2 pt-5">
                    <h3 className="text-lg leading-snug">{p.name}</h3>
                    {p.description && <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>{p.description}</p>}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5" style={{ borderColor: 'var(--color-line)' }}>
                      <span className="mono text-lg font-extrabold gold-text">{formatRp(p.price)}</span>
                      {p.stock === 0 ? (
                        <span className="rounded-full px-3 py-2 text-sm font-bold" style={{ background: 'var(--color-muted)', color: 'var(--color-destructive)' }}>Habis</span>
                      ) : n === 0 ? (
                        <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => addProduct(p)}>
                          <Plus size={16} /> Keranjang
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold" style={{ background: 'rgba(44,88,72,0.1)', color: '#2c5848' }}>
                          <Check size={15} /> {n} di keranjang
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="reveal mt-10 flex justify-center">
          <Link to="/skincare" className="btn btn-primary px-6">
            <ShoppingBag size={18} /> Belanja semua skincare <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
