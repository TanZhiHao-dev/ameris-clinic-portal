import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, Star } from 'lucide-react'
import { categories } from '../../data/clinic'
import { treatmentsQuery } from '../../server/queries'
import { pickLang, useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'
import { TreatmentThumb } from './TreatmentThumb'
import { AddToCartButton } from '../app/AddToCartButton'
import { PriceTag } from '../app/PriceTag'

export function Catalog() {
  const [active, setActive] = useState<(typeof categories)[number]>('Best Seller')
  const { data: treatments = [] } = useQuery(treatmentsQuery)
  // Aliased to `tr` — the treatment map variable below is named `t`.
  const { t: tr, lang } = useI18n()

  // Guard against malformed rows (e.g. a treatment with no name) so they don't
  // render as an empty card in the grid.
  const named = treatments.filter((t) => t.name?.trim())
  const list =
    active === 'Best Seller'
      ? named.filter((t) => t.bestSeller)
      : named.filter((t) => t.category === active)

  return (
    <section id="treatment" className="relative overflow-hidden py-24 sm:py-28">
      <div className="aura-soft" aria-hidden />
      <div className="shell-x relative">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">{tr('catalog.eyebrow')}</span>
            <h2 className="mt-3 text-[2.4rem] leading-[1.08] sm:text-[3rem]">
              {tr('catalog.title1')} <span className="gold-text italic">{tr('catalog.titleAccent')}</span> {tr('catalog.title3')}
            </h2>
          </div>

          <p className="max-w-sm text-[1.02rem] md:text-right" style={{ color: 'var(--color-ink-muted)' }}>
            {tr('catalog.desc')}
          </p>
        </div>

        <div className="reveal mt-10 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
              style={
                active === c
                  ? {
                      background: 'var(--color-ink)',
                      color: 'var(--color-cream)',
                      boxShadow: '0 10px 24px -12px rgba(42,37,32,0.55)',
                    }
                  : {
                      background: 'var(--color-shell)',
                      color: 'var(--color-ink-muted)',
                      border: '1px solid var(--color-line)',
                    }
              }
            >
              {tr(`cat.${c}` as DictKey)}
            </button>
          ))}
        </div>

        <div className="reveal mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <article
              key={t.id}
              className="card-luxe group flex h-full flex-col p-3"
              style={!t.available ? { opacity: 0.82 } : undefined}
            >
              {/* Image well */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <TreatmentThumb
                  t={t}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />

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
                  <span
                    className={`glow-dot ${t.available ? '' : 'is-muted'}`}
                    style={{ width: '0.42rem', height: '0.42rem' }}
                  />
                  {t.available ? tr('common.available') : tr('common.unavailable')}
                </span>

                <span
                  className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide"
                  style={{ background: 'rgba(42,37,32,0.62)', color: '#f6eddc', backdropFilter: 'blur(2px)' }}
                >
                  {tr(`cat.${t.category}` as DictKey)}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col px-3 pb-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <Link to="/treatment/$id" params={{ id: t.id }} className="min-w-0">
                    <h3 className="text-lg leading-snug transition-colors duration-300 group-hover:text-[color:var(--color-gold-deep)]">
                      {t.name}
                    </h3>
                  </Link>
                  <span
                    className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                    style={{ color: 'var(--color-ink-muted)' }}
                  >
                    <Clock size={13} aria-hidden /> {t.duration}
                  </span>
                </div>

                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {pickLang(lang, t.blurb, t.blurbEn)}
                </p>

                <div
                  className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <PriceTag t={t} />
                  <AddToCartButton t={t} />
                </div>

                <Link
                  to="/treatment/$id"
                  params={{ id: t.id }}
                  className="btn-split mt-4 w-full justify-between"
                  style={{
                    background: 'var(--color-ink)',
                    color: 'var(--color-cream)',
                    boxShadow: '0 14px 30px -14px rgba(42,37,32,0.6)',
                  }}
                >
                  <span>{tr('common.selectSchedule')}</span>
                  <span className="btn-split-ic" aria-hidden>
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="reveal mt-10 text-center text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
          {tr('catalog.note')}
        </p>
      </div>
    </section>
  )
}
