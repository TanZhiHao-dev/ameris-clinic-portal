import { ArrowRight, Timer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatRp, offPct } from '../../data/clinic'
import { promosQuery } from '../../server/queries'

export function Promo() {
  const { data: weeklyPromos = [] } = useQuery(promosQuery)

  return (
    <section id="promo" className="py-24" style={{ background: 'var(--color-blush-soft)' }}>
      <div className="shell-x">
        <div className="reveal flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">Promo Paket Spesial</span>
            <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
              Paket signature, <span className="gold-text">harga spesial</span>.
            </h2>
          </div>
          <div
            className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold md:self-end"
            style={{ background: 'rgba(197,135,108,0.18)', color: 'var(--color-rose)' }}
          >
            <Timer size={15} /> Berlaku selama promo
          </div>
        </div>

        <div className="reveal mt-12 grid gap-5 md:grid-cols-3">
          {weeklyPromos.map((p) => (
            <article key={p.name} className="card-soft relative overflow-hidden p-6">
              <div
                className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2rem] opacity-70"
                aria-hidden
                style={{ background: 'radial-gradient(70% 70% at 80% 20%, rgba(213,173,85,0.4), transparent 70%)' }}
              />
              <div className="badge badge-promo">HEMAT {offPct(p)}%</div>
              <h3 className="mt-4 text-xl font-bold leading-snug">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {p.detail}
              </p>

              <div className="mt-5 flex items-end gap-3">
                <span className="mono text-2xl font-extrabold gold-text">
                  {formatRp(p.now)}
                </span>
                <span className="mono text-sm line-through" style={{ color: 'var(--color-ink-muted)' }}>
                  {formatRp(p.was)}
                </span>
              </div>

              <a
                href="#daftar"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: 'var(--color-gold-deep)' }}
              >
                Ambil promo ini <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
