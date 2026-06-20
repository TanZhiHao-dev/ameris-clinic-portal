import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Search, Star } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { TreatmentThumb } from '../components/landing/TreatmentThumb'
import { AddToCartButton } from '../components/app/AddToCartButton'
import { formatRp } from '../data/clinic'
import { listTreatments } from '../server/treatments'

export const Route = createFileRoute('/treatment/')({ component: MenuPage })

const FILTERS = [
  'Semua',
  'Best Seller',
  'Facial',
  'Peeling',
  'Laser',
  'Skinbooster',
  'Injeksi',
  'Paket',
] as const

function MenuPage() {
  const [cat, setCat] = useState<(typeof FILTERS)[number]>('Semua')
  const [q, setQ] = useState('')
  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => listTreatments(),
  })

  const list = treatments.filter((t) => {
    const matchCat =
      cat === 'Semua'
        ? true
        : cat === 'Best Seller'
          ? t.bestSeller
          : t.category === cat
    const matchQ =
      q.trim() === '' || t.name.toLowerCase().includes(q.trim().toLowerCase())
    return matchCat && matchQ
  })

  return (
    <PageShell>
      <section className="py-12 sm:py-16" style={{ background: 'var(--color-cream)' }}>
        <div className="shell-x">
          <span className="eyebrow">Menu Treatment</span>
          <h1 className="mt-3 text-[2.4rem] sm:text-[3.2rem]">
            Pilih perawatan <span className="gold-text italic">terbaikmu</span>.
          </h1>
          <p className="mt-3 max-w-xl text-[1.02rem]" style={{ color: 'var(--color-ink-soft)' }}>
            Semua treatment Ameris lengkap dengan harga, durasi, dan status
            ketersediaan.
          </p>

          {/* Search */}
          <div className="mt-7 flex max-w-md items-center gap-2 rounded-full px-4 py-3"
            style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}
          >
            <Search size={18} style={{ color: 'var(--color-ink-muted)' }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari treatment…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-ink)' }}
            />
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={
                  cat === c
                    ? { background: 'var(--color-ink)', color: 'var(--color-cream)' }
                    : {
                        background: 'var(--color-shell)',
                        color: 'var(--color-ink-muted)',
                        border: '1px solid var(--color-line)',
                      }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24" style={{ background: 'var(--color-cream)' }}>
        <div className="shell-x">
          <p className="mb-6 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {list.length} treatment ditemukan
          </p>

          {list.length === 0 ? (
            <div className="card-soft p-12 text-center">
              <p className="text-lg font-bold">Treatment tidak ditemukan</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Coba kata kunci atau kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <article
                  key={t.id}
                  className="card-soft flex flex-col overflow-hidden"
                  style={!t.available ? { opacity: 0.82 } : undefined}
                >
                  <Link to="/treatment/$id" params={{ id: t.id }} className="relative block aspect-[16/10]">
                    <TreatmentThumb t={t} className="h-full w-full" />
                    {t.bestSeller && (
                      <span
                        className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-bold tracking-wide"
                        style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
                      >
                        <Star size={11} style={{ fill: '#3a2c0f' }} /> BEST SELLER
                      </span>
                    )}
                    <span
                      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold"
                      style={{
                        background: 'rgba(253,250,244,0.92)',
                        color: t.available ? 'var(--color-gold-deep)' : 'var(--color-ink-muted)',
                      }}
                    >
                      <span className={`glow-dot ${t.available ? '' : 'is-muted'}`} style={{ width: '0.42rem', height: '0.42rem' }} />
                      {t.available ? 'Tersedia' : 'Tidak tersedia'}
                    </span>
                    <span
                      className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide"
                      style={{ background: 'rgba(42,37,32,0.62)', color: '#f6eddc' }}
                    >
                      {t.category} · {t.duration}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <Link to="/treatment/$id" params={{ id: t.id }}>
                      <h3 className="text-lg leading-snug transition hover:opacity-80">{t.name}</h3>
                    </Link>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                      {t.blurb}
                    </p>
                    <div className="mt-4 flex items-end justify-between border-t pt-4">
                      <div className="mono text-lg font-extrabold gold-text">{formatRp(t.price)}</div>
                      <AddToCartButton t={t} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
            *Harga belum termasuk promo/diskon · berlaku sesuai ketersediaan di klinik.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
