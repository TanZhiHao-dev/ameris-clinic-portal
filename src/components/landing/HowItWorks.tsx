import { ArrowRight } from 'lucide-react'
import { bookingSteps } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'

export function HowItWorks() {
  const { t } = useI18n()
  return (
    <section id="cara-kerja" className="relative overflow-hidden py-24 sm:py-28">
      <div className="aura-soft" aria-hidden />
      <div className="shell-x relative">
        <div className="reveal max-w-xl">
          <span className="eyebrow">{t('how.eyebrow')}</span>
          <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
            {t('how.title1')} <span className="gold-text">{t('how.titleAccent')}</span> {t('how.title3')}
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bookingSteps.map((step, i) => (
            <li
              key={step.n}
              className={`card-luxe rise rise-${i + 1} group flex flex-col rounded-[2rem] p-8`}
            >
              <span
                className="font-display text-7xl font-bold leading-none gold-text transition-transform duration-500 group-hover:scale-105"
                style={{ fontVariantNumeric: 'lining-nums' }}
              >
                {step.n}
              </span>
              <span className="glow-dot mt-6" aria-hidden />
              <h3 className="mt-4 text-lg font-bold">{t(`step.${step.n}.title` as DictKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {t(`step.${step.n}.body` as DictKey)}
              </p>
              <ArrowRight
                size={20}
                aria-hidden
                className="mt-6 transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: 'var(--color-gold)' }}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
