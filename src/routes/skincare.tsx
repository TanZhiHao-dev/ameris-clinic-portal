import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Banknote, CheckCircle2, Minus, Package, Plus, ShoppingBag, Ticket } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { BankTransferInstructions } from '../components/app/BankTransferInstructions'
import { authClient } from '../lib/auth-client'
import { formatRp } from '../data/clinic'
import { createProductOrder, publicProducts } from '../server/products'

export const Route = createFileRoute('/skincare')({ component: SkincareShop })

type Line = { id: string; name: string; price: number; qty: number }
type Done = { id: string; total: number; paymentMethod: 'Offline' | 'Transfer' }

function SkincareShop() {
  const { data: products = [], isPending } = useQuery({ queryKey: ['public-products'], queryFn: () => publicProducts() })
  const { data: session } = authClient.useSession()
  const loggedIn = !!session?.user && session.user.role !== 'owner' && session.user.role !== 'dokter' && session.user.role !== 'admin'

  const [cart, setCart] = useState<Line[]>([])
  const [pay, setPay] = useState<'Transfer' | 'Offline'>('Transfer')
  const [done, setDone] = useState<Done | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const add = (p: { id: string; name: string; price: number }) =>
    setCart((c) => {
      const ex = c.find((l) => l.id === p.id)
      if (ex) return c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }]
    })
  const setQty = (id: string, qty: number) => setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))))
  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart])
  const qtyOf = (id: string) => cart.find((l) => l.id === id)?.qty ?? 0

  const order = useMutation({
    mutationFn: () => createProductOrder({ data: { items: cart.map((l) => ({ productId: l.id, qty: l.qty })), paymentMethod: pay } }),
    onSuccess: (r) => { setDone(r); setCart([]) },
    onError: (e) => setErr((e as Error)?.message || 'Gagal membuat pesanan.'),
  })

  // ── Success ──
  if (done) {
    return (
      <PageShell>
        <div className="shell-x py-12">
          <div className="mx-auto max-w-lg">
            <div className="card-soft overflow-hidden">
              <div className="px-8 py-9 text-center" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
                <CheckCircle2 size={46} className="mx-auto" style={{ color: 'var(--color-gold)' }} />
                <h1 className="mt-3 text-2xl" style={{ color: '#faf3e6' }}>Pesanan diterima ✦</h1>
                <p className="mt-1 text-sm" style={{ color: 'rgba(246,237,220,0.78)' }}>
                  {done.paymentMethod === 'Transfer' ? 'Selesaikan pembayaran, lalu ambil produkmu di klinik.' : 'Bayar saat ambil produk di klinik.'}
                </p>
              </div>
              <div className="p-7">
                <div className="flex items-center justify-between py-1.5 text-sm"><span style={{ color: 'var(--color-ink-muted)' }}>No. pesanan</span><span className="mono font-bold">{done.id}</span></div>
                <div className="flex items-center justify-between py-1.5 text-sm"><span style={{ color: 'var(--color-ink-muted)' }}>Total</span><span className="font-bold">{formatRp(done.total)}</span></div>
                {done.paymentMethod === 'Transfer' && <div className="mt-4"><BankTransferInstructions amount={done.total} bookingId={done.id} /></div>}
                <div className="mt-5 rounded-xl px-4 py-3 text-[0.82rem]" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
                  🛍️ Produk bisa <b>diambil di klinik</b>. Kami siapkan setelah pesanan dikonfirmasi.
                </div>
                <button type="button" className="btn btn-gold mt-5 w-full" onClick={() => setDone(null)}><ShoppingBag size={17} /> Belanja lagi</button>
                <Link to="/akun" className="btn btn-ghost mt-3 w-full">Lihat pesanan saya</Link>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="shell-x py-10 sm:py-12">
        <span className="eyebrow">Katalog Produk</span>
        <h1 className="mt-2 text-[2.4rem] leading-none">Skincare</h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Produk perawatan pilihan Ameris. Pesan online, <b>ambil di klinik</b>.
        </p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Product grid */}
          <div>
            {isPending ? (
              <p className="py-16 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat produk…</p>
            ) : products.length === 0 ? (
              <div className="card-soft p-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada produk skincare.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
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
                            <button type="button" className="btn btn-gold px-3 py-1.5 text-sm" onClick={() => add(p)}><Plus size={15} /> Keranjang</button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button type="button" aria-label="Kurangi" onClick={() => setQty(p.id, n - 1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={14} /></button>
                              <span className="mono w-6 text-center font-bold">{n}</span>
                              <button type="button" aria-label="Tambah" onClick={() => setQty(p.id, n + 1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Order summary */}
          <aside className="card-soft p-6 lg:sticky lg:top-24">
            <h2 className="text-lg">Keranjang</h2>
            {cart.length === 0 ? (
              <p className="mt-4 rounded-xl px-4 py-6 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>Belum ada produk dipilih.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {cart.map((l) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{l.name}</div>
                      <div className="mono text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{formatRp(l.price)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" aria-label="Kurangi" onClick={() => setQty(l.id, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={13} /></button>
                      <span className="mono w-6 text-center text-sm font-bold">{l.qty}</span>
                      <button type="button" aria-label="Tambah" onClick={() => setQty(l.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={13} /></button>
                    </div>
                    <span className="mono w-20 shrink-0 text-right text-sm font-semibold">{formatRp(l.price * l.qty)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="my-4 hairline-gold" />

            <div className="text-[0.72rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>Pembayaran</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['Transfer', 'Offline'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setPay(m)} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition"
                  style={pay === m ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)', color: 'var(--color-ink)' } : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
                  {m === 'Transfer' ? <><Ticket size={15} /> QRIS / Transfer</> : <><Banknote size={15} /> Bayar saat ambil</>}
                </button>
              ))}
            </div>

            <div className="my-4 hairline-gold" />
            <div className="flex items-end justify-between">
              <span className="font-bold">Total</span>
              <span className="mono text-2xl font-extrabold gold-text">{formatRp(total)}</span>
            </div>

            {err && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}

            {loggedIn ? (
              <button type="button" className="btn btn-gold mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={cart.length === 0 || order.isPending} onClick={() => { setErr(null); order.mutate() }}>
                {order.isPending ? 'Memproses…' : 'Pesan · ambil di klinik'}
              </button>
            ) : (
              <Link to="/masuk" search={{ redirect: '/skincare' }} className="btn btn-gold mt-5 w-full">
                Masuk untuk memesan
              </Link>
            )}
            <p className="mt-2 text-center text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Tanpa perlu pilih jadwal — produk diambil di klinik.</p>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
