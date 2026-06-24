import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
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
    <section id="treatment" className="py-24">
      <div className="shell-x">
        <div className="reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">{tr('catalog.eyebrow')}</span>
            <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
              {tr('catalog.title1')} <span className="gold-text">{tr('catalog.titleAccent')}</span> {tr('catalog.title3')}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: 'var(--color-ink-soft)' }}>
              {tr('catalog.desc')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={
                  active === c
                    ? { background: 'var(--color-ink)', color: 'var(--color-cream)' }
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
        </div>

        <div className="reveal mt-12 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <article
              key={t.id}
              className="card-soft flex h-full flex-col overflow-hidden"
              style={!t.available ? { opacity: 0.82 } : undefined}
            >
              {/* Visual */}
              <div className="relative aspect-[16/10]">
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
                  {tr(`cat.${t.category}` as DictKey)} · {t.duration}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <Link to="/treatment/$id" params={{ id: t.id }}>
                  <h3 className="text-lg leading-snug transition hover:opacity-80">{t.name}</h3>
                </Link>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {pickLang(lang, t.blurb, t.blurbEn)}
                </p>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t pt-4">
                  <PriceTag t={t} />
                  <AddToCartButton t={t} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="reveal mt-8 text-center text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
          {tr('catalog.note')}
        </p>
      </div>
    </section>
  )
}
