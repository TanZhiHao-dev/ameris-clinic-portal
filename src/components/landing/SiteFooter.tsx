import { MapPin } from 'lucide-react'
import { Brand } from './Brand'
import { clinic } from '../../data/clinic'
import { SocialLinks } from '../app/SocialLinks'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'

const COLS: { title: DictKey; links: DictKey[] }[] = [
  {
    title: 'footer.col.treatment',
    links: ['footer.link.facialPeeling', 'footer.link.picoLaser', 'footer.link.skinbooster', 'footer.link.injeksiBotox', 'footer.link.paketSignature'],
  },
  {
    title: 'footer.col.account',
    links: ['footer.link.loginRegister', 'footer.link.cart', 'footer.link.privilege', 'footer.link.bookingHistory'],
  },
  {
    title: 'footer.col.clinic',
    links: ['footer.link.about', 'footer.link.hours', 'footer.link.location', 'footer.link.privacy'],
  },
]

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="pt-16" style={{ background: 'var(--color-shell)', borderTop: '1px solid var(--color-line)' }}>
      <div className="shell-x">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" aria-label="Ameris — beranda">
              <Brand withTagline />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {clinic.by}. {t('footer.tagline', { location: clinic.location })}
            </p>
            <div className="mt-5">
              <SocialLinks showContact />
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-ink-muted)' }}>
                {t(col.title)}
              </div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm transition" style={{ color: 'var(--color-ink-soft)' }}>
                      {t(l)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline-gold" />

        <div
          className="flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <span className="inline-flex items-center gap-2 text-[0.8rem]">
            <MapPin size={14} /> {clinic.name} · {clinic.location}
          </span>
          <span className="text-[0.8rem]">© 2026 {clinic.name} · {clinic.instagram}</span>
        </div>
      </div>
    </footer>
  )
}
