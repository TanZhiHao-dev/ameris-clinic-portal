import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarCheck, Sparkles } from 'lucide-react'
import { clinic } from '../../data/clinic'
import { treatmentsQuery } from '../../server/queries'
import { pickLang, useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'
import { TreatmentThumb } from './TreatmentThumb'
import { PriceTag } from '../app/PriceTag'

const STATS: { value: string; label: DictKey }[] = [
  { value: '24/7', label: 'hero.stat.booking' },
  { value: '50+', label: 'hero.stat.treatment' },
  { value: '4.9', label: 'hero.stat.rating' },
  { value: 'Pico', label: 'hero.stat.tech' },
]

export function Hero() {
  const { data: treatments = [] } = useQuery(treatmentsQuery)
  const { t, lang } = useI18n()
  // The owner's hero pick wins; otherwise fall back to a real best-seller —
  // preferring one with a photo so the hero shows an actual treatment image.
  const featured =
    treatments.find((t) => t.heroFeatured) ??
    treatments.find((t) => t.bestSeller && t.image && t.available) ??
    treatments.find((t) => t.bestSeller && t.image) ??
    treatments.find((t) => t.image) ??
    treatments.find((t) => t.bestSeller) ??
    treatments[0]

  return (
    <section id="top" className="hero-dark relative overflow-hidden">
      {/* full-bleed clinic photo */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: 'url(/about/banner.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="hero-veil" aria-hidden />
      <div className="radiance-gold" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="shell-x relative grid items-center gap-14 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
        {/* Left — thesis */}
        <div>
          <span
            className="rise rise-1 eyebrow inline-flex items-center gap-2"
            style={{ color: 'var(--color-gold-light)' }}
          >
            <span className="glow-dot" aria-hidden />
            {clinic.location} · {clinic.by}
          </span>

          <h1
            className="rise rise-2 mt-6 text-[3rem] leading-[1.04] sm:text-[3.8rem] lg:text-[4.6rem]"
            style={{ color: '#f6ecda' }}
          >
            {t('hero.titleLine1')}
            <br />
            <span className="gold-text italic">{t('hero.titleAccent')}</span>
            <br />
            {t('hero.titleLine3')}
          </h1>

          <p
            className="rise rise-2 mt-6 max-w-xl text-[1.05rem] leading-relaxed"
            style={{ color: 'rgba(246,237,220,0.82)' }}
          >
            {t('hero.desc')}
          </p>

          <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
            <Link to="/treatment" className="btn-split">
              <span>{t('common.bookNow')}</span>
              <span className="btn-split-ic" aria-hidden>
                <ArrowRight size={18} />
              </span>
            </Link>
            <Link to="/treatment" className="btn btn-onink">
              {t('common.viewTreatments')}
            </Link>
          </div>

          <div className="rise rise-4 mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold gold-text">{s.value}</div>
                <div
                  className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(246,237,220,0.62)' }}
                >
                  {t(s.label)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — treatment card preview */}
        <div className="rise rise-3 relative mx-auto w-full max-w-sm">
          <div
            className="absolute -inset-6 -z-10 rounded-[2rem] opacity-80"
            aria-hidden
            style={{
              background: 'radial-gradient(60% 60% at 70% 30%, rgba(213,173,85,0.45), transparent 70%)',
              filter: 'blur(16px)',
            }}
          />
          <div
            className="overflow-hidden rounded-[2rem]"
            style={{
              background: 'var(--color-shell)',
              boxShadow: 'var(--shadow-lift)',
              border: '1px solid var(--color-line)',
            }}
          >
            {/* visual header — a real best-seller photo (or motif fallback) */}
            <div className="relative aspect-[16/10] overflow-hidden">
              {featured ? (
                <TreatmentThumb t={featured} className="h-full w-full" />
              ) : (
                <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #edd9a6, #cb9f4f)' }} aria-hidden />
              )}
              {(featured?.bestSeller ?? true) && (
                <span className="badge badge-best absolute left-3 top-3">
                  <Sparkles size={12} /> BEST SELLER
                </span>
              )}
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl leading-snug">{featured?.name ?? 'Korean Pico Glow'}</h3>
                <span className="shrink-0 text-[0.7rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
                  {featured?.duration ?? '30 min'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {featured ? pickLang(lang, featured.blurb, featured.blurbEn) : 'Laser Pico Second Technology — cerahkan kulit & ratakan warna.'}
              </p>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                {featured ? (
                  <PriceTag t={featured} numClass="text-2xl" />
                ) : (
                  <div className="mono text-2xl font-extrabold gold-text">Rp550.000</div>
                )}
                <span className="badge badge-ok">
                  <span className="glow-dot" aria-hidden /> {t('common.available')}
                </span>
              </div>

              {featured ? (
                <Link to="/treatment/$id" params={{ id: featured.id }} className="btn btn-primary mt-5 w-full">
                  <CalendarCheck size={18} /> {t('common.selectSchedule')}
                </Link>
              ) : (
                <Link to="/treatment" className="btn btn-primary mt-5 w-full">
                  <CalendarCheck size={18} /> {t('common.selectSchedule')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
