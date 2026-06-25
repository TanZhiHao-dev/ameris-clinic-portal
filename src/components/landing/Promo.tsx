import { ArrowRight, Timer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatRp, offPct } from '../../data/clinic'
import { promosQuery } from '../../server/queries'
import { useI18n } from '../../lib/i18n'

export function Promo() {
  const { data: weeklyPromos = [] } = useQuery(promosQuery)
  const { t } = useI18n()

  return (
    <section
      id="promo"
      className="relative overflow-hidden py-24 md:py-28"
      style={{ background: 'var(--color-blush-soft)' }}
    >
      <div className="aura-soft" aria-hidden />

      <div className="shell-x relative">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">{t('promo.eyebrow')}</span>
            <h2 className="mt-3 text-[2.4rem] leading-[1.05] sm:text-[3rem]">
              {t('promo.title1')} <span className="gold-text italic">{t('promo.titleAccent')}</span>.
            </h2>
          </div>
          <div
            className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold md:self-end"
            style={{ background: 'rgba(197,135,108,0.18)', color: 'var(--color-rose)' }}
          >
            <Timer size={15} /> {t('promo.badgeDuration')}
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {weeklyPromos.map((p, i) => (
            <article
              key={p.name}
              className={`card-luxe rise rise-${(i % 4) + 1} group relative flex flex-col overflow-hidden rounded-[2rem] p-7`}
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-[2rem] opacity-70 transition-transform duration-700 group-hover:scale-110"
                aria-hidden
                style={{ background: 'radial-gradient(70% 70% at 80% 20%, rgba(213,173,85,0.4), transparent 70%)' }}
              />

              <div className="flex items-center gap-2">
                <span className="badge badge-promo">{t('common.save')} {offPct(p)}%</span>
                <span className="glow-dot" aria-hidden />
              </div>

              <h3 className="mt-5 text-xl font-bold leading-snug">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {p.detail}
              </p>

              <div className="mt-6 flex items-end gap-3">
                <span className="mono text-3xl font-extrabold gold-text">
                  {formatRp(p.now)}
                </span>
                <span className="mono pb-1 text-sm line-through" style={{ color: 'var(--color-ink-muted)' }}>
                  {formatRp(p.was)}
                </span>
              </div>

              <a href="#daftar" className="btn-split mt-7 self-start">
                <span>{t('promo.take')}</span>
                <span className="btn-split-ic" aria-hidden>
                  <ArrowRight size={18} />
                </span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
