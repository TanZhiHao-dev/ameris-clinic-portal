import { CalendarHeart, Sparkles, Star, Zap, type LucideIcon } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'

type Stat = {
  value: string
  Icon: LucideIcon
  labelKey: DictKey
  noteKey: DictKey
  image: string
}

const STATS: Stat[] = [
  {
    value: '5.0',
    Icon: Star,
    labelKey: 'stats.ratingLabel',
    noteKey: 'stats.ratingNote',
    image: '/about/why-main.jpg',
  },
  {
    value: '50+',
    Icon: Sparkles,
    labelKey: 'stats.treatmentsLabel',
    noteKey: 'stats.treatmentsNote',
    image: '/about/clinic.jpg',
  },
  {
    value: '2026',
    Icon: CalendarHeart,
    labelKey: 'stats.sinceLabel',
    noteKey: 'stats.sinceNote',
    image: '/about/banner.jpg',
  },
  {
    value: 'Pico',
    Icon: Zap,
    labelKey: 'stats.techLabel',
    noteKey: 'stats.techNote',
    image: '/about/why-tech.jpg',
  },
]

export function Statistics() {
  const { t } = useI18n()

  return (
    <section id="statistics" className="relative overflow-hidden py-24 sm:py-28">
      <div className="aura-soft" aria-hidden />
      <div className="shell-x relative">
        {/* Header */}
        <div className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">{t('stats.eyebrow')}</span>
          <h2 className="mt-3 max-w-3xl text-[2.4rem] leading-[1.08] sm:text-[3rem]">
            {t('stats.title1')} <span className="gold-text italic">{t('stats.titleAccent')}</span> {t('stats.title3')}
          </h2>
          <p className="mt-5 max-w-2xl text-[1.02rem]" style={{ color: 'var(--color-ink-muted)' }}>
            {t('stats.desc')}
          </p>
        </div>

        {/* Stat cards */}
        <div className="reveal mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ value, Icon, labelKey, noteKey, image }) => (
            <article
              key={labelKey}
              className="group relative min-h-[18rem] overflow-hidden rounded-[2rem] transition-all duration-500 ease-out hover:-translate-y-1.5"
              style={{
                border: '1px solid var(--color-line)',
                boxShadow: '0 18px 40px -28px rgba(42,37,32,0.45)',
              }}
            >
              {/* Background image */}
              <img
                src={image}
                alt={t(labelKey)}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-110"
              />

              {/* Light glassmorphic overlay keeps the cream content readable */}
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    'linear-gradient(160deg, rgba(253,250,244,0.95) 0%, rgba(253,250,244,0.88) 55%, rgba(253,250,244,0.82) 100%)',
                  backdropFilter: 'blur(2px)',
                }}
              />

              {/* Content */}
              <div className="relative flex h-full flex-col p-7">
                <span
                  className="grid h-12 w-12 place-items-center rounded-full transition-transform duration-500 group-hover:scale-105"
                  style={{
                    background: 'var(--grad-gold)',
                    color: 'var(--color-ink)',
                    boxShadow: '0 8px 20px -8px rgba(213,173,85,0.6)',
                  }}
                  aria-hidden
                >
                  <Icon size={22} strokeWidth={2} />
                </span>

                <div className="mt-auto pt-8">
                  <div className="text-5xl leading-none sm:text-6xl">{value}</div>
                  <div className="mt-3 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {t(labelKey)}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                    {t(noteKey)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
