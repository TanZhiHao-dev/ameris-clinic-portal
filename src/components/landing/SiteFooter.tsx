import { Link } from '@tanstack/react-router'
import { MapPin, Navigation } from 'lucide-react'
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

// `showLocation` defaults to true; the landing passes false because its Contact
// section already shows the clinic address + map (no need to repeat it here).
export function SiteFooter({ showLocation = true }: { showLocation?: boolean }) {
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
                {col.links.map((l) =>
                  l === 'footer.link.about' ? (
                    <li key={l}>
                      <Link to="/tentang" className="text-sm transition" style={{ color: 'var(--color-ink-soft)' }}>
                        {t(l)}
                      </Link>
                    </li>
                  ) : (
                    <li key={l}>
                      <a href="#" className="text-sm transition" style={{ color: 'var(--color-ink-soft)' }}>
                        {t(l)}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        {showLocation && (
          <>
            <div className="hairline-gold" />

            <div className="grid gap-8 py-12 md:grid-cols-[1fr_1.1fr] md:items-stretch">
              <div className="flex flex-col">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-ink-muted)' }}>
                  {t('footer.address.title')}
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--color-gold-deep)' }} />
                  <address className="not-italic text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                    <span className="block font-medium" style={{ color: 'var(--color-ink)' }}>{clinic.name}</span>
                    {clinic.address.line1}
                    <br />
                    {clinic.address.line2}
                    <br />
                    {clinic.address.line3}
                    <br />
                    <span style={{ color: 'var(--color-ink-muted)' }}>Plus Code: {clinic.address.plusCode}</span>
                  </address>
                </div>
                <a
                  href={clinic.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-90"
                  style={{ background: 'var(--color-gold)', color: 'var(--color-espresso)' }}
                >
                  <Navigation size={15} /> {t('footer.address.directions')}
                </a>
              </div>

              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ border: '1px solid var(--color-line)', minHeight: '220px' }}
              >
                <iframe
                  title={t('footer.address.mapTitle')}
                  src={clinic.address.mapsEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full min-h-[220px] w-full"
                  style={{ border: 0, filter: 'grayscale(0.15)' }}
                />
              </div>
            </div>
          </>
        )}

        <div className="hairline-gold" />

        <div
          className="flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <a
            href={clinic.address.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[0.8rem] transition hover:opacity-80"
          >
            <MapPin size={14} /> {clinic.name} · {clinic.location}
          </a>
          <span className="text-[0.8rem]">© 2026 {clinic.name} · {clinic.instagram}</span>
        </div>
      </div>
    </footer>
  )
}
