import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import type { DictKey } from '../../lib/i18n-dict'
import { useI18n } from '../../lib/i18n'

const CRED_KEYS: DictKey[] = ['aboutme.cred1', 'aboutme.cred2', 'aboutme.cred3']

export function AboutMe() {
  const { t } = useI18n()

  return (
    <section id="about-me" className="relative overflow-hidden py-24 sm:py-28">
      <div className="aura-soft" aria-hidden />
      <div className="shell-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT — floating profile card */}
          <div className="reveal lg:col-span-5">
            <div className="card-luxe group mx-auto max-w-md p-3">
              <div
                className="overflow-hidden rounded-[2rem]"
                style={{ background: 'radial-gradient(115% 95% at 50% 5%, var(--color-champagne), var(--color-shell) 72%)' }}
              >
                <img
                  src="/about/founder.png"
                  alt="dr. Meriana — Founder Ameris"
                  className="aspect-[4/5] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>

              <div className="px-4 pb-3 pt-6 text-center">
                <h3 className="text-2xl leading-tight">dr. Meriana</h3>
                <p
                  className="mt-1.5 text-sm font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--color-gold-deep)' }}
                >
                  {t('about.founder.role')}
                </p>

                <Link
                  to="/treatment"
                  className="btn-split mt-6 w-full justify-between"
                  style={{ background: 'var(--color-ink)', color: 'var(--color-cream)' }}
                >
                  <span>{t('common.bookNow')}</span>
                  <span className="btn-split-ic" aria-hidden>
                    <ArrowRight size={18} />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT — narrative + credentials */}
          <div className="reveal lg:col-span-7">
            <span className="eyebrow">{t('about.founder.eyebrow')}</span>
            <h2 className="mt-3 text-[2.4rem] leading-[1.08] sm:text-[3rem]">
              {t('about.founder.title1')} <span className="gold-text italic">{t('about.founder.titleAccent')}</span>
            </h2>

            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {t('about.founder.body')}
            </p>

            <ul className="mt-9 flex flex-col gap-4">
              {CRED_KEYS.map((key) => (
                <li
                  key={key}
                  className="group flex items-center gap-4 text-[1.02rem] transition-transform duration-300 hover:translate-x-1"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: 'rgba(213,173,85,0.14)',
                      border: '1px solid var(--color-line)',
                    }}
                    aria-hidden
                  >
                    <Check size={16} strokeWidth={3} style={{ color: 'var(--color-gold-deep)' }} />
                  </span>
                  <span className="transition-colors duration-300 group-hover:text-[color:var(--color-ink)]">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/tentang"
              className="group mt-10 inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--color-gold-deep)' }}
            >
              {t('aboutme.readStory')}
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
