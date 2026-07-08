import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, Minus, Package, Plus, ShoppingBag } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { useCart } from '../lib/cart'
import { formatRp } from '../data/clinic'
import { publicProducts } from '../server/products'

export const Route = createFileRoute('/skincare')({ component: SkincareShop })

function SkincareShop() {
  const { data: products = [], isPending } = useQuery({ queryKey: ['public-products'], queryFn: () => publicProducts() })
  const { addProduct, setQty, items, count, hydrated } = useCart()
  const qtyOf = (id: string) => items.find((i) => i.id === id)?.qty ?? 0

  return (
    <PageShell>
      <section className="py-10 sm:py-14" style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
        <div className="shell-x">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Katalog Produk</span>
              <h1 className="mt-2 text-[2.4rem] leading-none">Skincare</h1>
              <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Produk perawatan pilihan Ameris. Masuk keranjang &amp; checkout bareng treatment — atau beli sendiri untuk diambil di klinik.
              </p>
            </div>
            {hydrated && count > 0 && (
              <Link to="/keranjang" className="btn btn-gold">
                <ShoppingBag size={18} /> Lihat keranjang ({count})
              </Link>
            )}
          </div>

          <div className="mt-8">
            {isPending ? (
              <p className="py-16 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat produk…</p>
            ) : products.length === 0 ? (
              <div className="card-soft p-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada produk skincare.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => {
                  const n = qtyOf(p.id)
                  return (
                    <div key={p.id} className="card-soft flex flex-col overflow-hidden">
                      <div className="relative aspect-[16/10] w-full" style={{ background: 'var(--color-muted)' }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center" style={{ color: 'var(--color-gold-deep)' }}><Package size={34} /></div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="font-bold">{p.name}</div>
                        {p.description && <p className="mt-1 line-clamp-2 text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>{p.description}</p>}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="mono font-extrabold gold-text">{formatRp(p.price)}</span>
                          {n === 0 ? (
                            <button type="button" className="btn btn-gold px-3 py-1.5 text-sm" onClick={() => addProduct(p)}><Plus size={15} /> Keranjang</button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button type="button" aria-label="Kurangi" onClick={() => setQty(p.id, n - 1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={14} /></button>
                              <span className="mono w-6 text-center font-bold">{n}</span>
                              <button type="button" aria-label="Tambah" onClick={() => addProduct(p)} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={14} /></button>
                            </div>
                          )}
                        </div>
                        {n > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1 text-[0.72rem] font-semibold" style={{ color: '#2c5848' }}>
                            <Check size={13} /> {n} di keranjang
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
            Produk skincare diambil di klinik. Kalau dibeli bareng treatment, otomatis mengikuti jadwal kunjunganmu.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
