import { Link } from '@tanstack/react-router'
import { ArrowRight, ExternalLink, Instagram, MapPin, MessageCircle, Music2 } from 'lucide-react'
import { clinic } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'

export function Contact() {
  const { t } = useI18n()

  const iconWell =
    'grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover/row:scale-105'
  const iconStyle = {
    background: 'var(--grad-gold)',
    color: 'var(--color-espresso)',
    boxShadow: '0 8px 20px -10px rgba(213,173,85,0.6)',
  }
  const sectionTitle = 'text-[0.72rem] font-semibold uppercase tracking-[0.18em]'
  const sectionTitleStyle = { color: 'var(--color-gold-light)' }
  const linkBase = 'transition-colors duration-300 hover:text-[color:var(--color-gold-light)]'

  return (
    <section
      id="contact"
      className="relative overflow-hidden py-24 sm:py-28"
      style={{ background: 'var(--color-espresso)', color: 'var(--color-cream)' }}
    >
      <div className="radiance-gold" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="shell-x relative">
        {/* Header */}
        <div className="reveal flex flex-col items-center text-center">
          <span className="eyebrow" style={{ color: 'var(--color-gold-light)' }}>
            {t('contact.eyebrow')}
          </span>
          <h2 className="mt-4 max-w-2xl text-[2.4rem] leading-[1.05] sm:text-[3.1rem]" style={{ color: 'var(--color-cream)' }}>
            {t('contact.title1')} <span className="gold-text">{t('contact.titleAccent')}</span>
          </h2>
          <p className="mt-5 max-w-2xl text-[1.02rem]" style={{ color: 'rgba(246,237,220,0.78)' }}>
            {t('contact.desc')}
          </p>
        </div>

        {/* Two columns */}
        <div className="mt-14 grid items-stretch gap-10 lg:grid-cols-2">
          {/* LEFT — info card */}
          <div
            className="reveal flex flex-col gap-7 rounded-[2rem] p-8"
            style={{ background: 'rgba(246,237,220,0.05)', border: '1px solid rgba(231,211,156,0.18)' }}
          >
            {/* Address */}
            <div className="group/row flex items-start gap-4">
              <span className={iconWell} style={iconStyle} aria-hidden>
                <MapPin size={20} />
              </span>
              <div className="min-w-0">
                <h3 className={sectionTitle} style={sectionTitleStyle}>
                  {t('contact.addressTitle')}
                </h3>
                <address className="mt-2 not-italic text-[0.96rem] leading-relaxed" style={{ color: 'rgba(246,237,220,0.9)' }}>
                  {clinic.address.line1}
                  <br />
                  {clinic.address.line2}
                  <br />
                  {clinic.address.line3}
                  <br />
                  <span style={{ color: 'rgba(246,237,220,0.6)' }}>Plus Code: {clinic.address.plusCode}</span>
                </address>
              </div>
            </div>

            {/* Reach us */}
            <div className="group/row flex items-start gap-4">
              <span className={iconWell} style={iconStyle} aria-hidden>
                <MessageCircle size={20} />
              </span>
              <div className="min-w-0">
                <h3 className={sectionTitle} style={sectionTitleStyle}>
                  {t('contact.reachTitle')}
                </h3>
                <p className="mt-2 flex flex-col gap-1 text-[0.96rem]" style={{ color: 'rgba(246,237,220,0.9)' }}>
                  <a
                    className={linkBase}
                    href={`https://wa.me/${clinic.whatsappRaw}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp {clinic.whatsapp}
                  </a>
                  <a className={linkBase} href={`mailto:${clinic.email}`}>
                    {clinic.email}
                  </a>
                </p>
              </div>
            </div>

            {/* Follow us */}
            <div className="group/row flex items-start gap-4">
              <span className={iconWell} style={iconStyle} aria-hidden>
                <Instagram size={20} />
              </span>
              <div className="min-w-0">
                <h3 className={sectionTitle} style={sectionTitleStyle}>
                  {t('contact.followTitle')}
                </h3>
                <p className="mt-2 flex flex-col gap-1 text-[0.96rem]" style={{ color: 'rgba(246,237,220,0.9)' }}>
                  <a
                    className={`${linkBase} inline-flex items-center gap-1.5`}
                    href={clinic.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram size={15} aria-hidden /> {clinic.instagram}
                  </a>
                  <a
                    className={`${linkBase} inline-flex items-center gap-1.5`}
                    href={clinic.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Music2 size={15} aria-hidden /> {clinic.tiktok}
                  </a>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div
              className="mt-1 flex flex-col gap-3 border-t pt-7 sm:flex-row"
              style={{ borderColor: 'rgba(231,211,156,0.18)' }}
            >
              <Link to="/treatment" className="btn-split is-glass flex-1 justify-between">
                <span>{t('contact.cta')}</span>
                <span className="btn-split-ic" aria-hidden>
                  <ArrowRight size={18} />
                </span>
              </Link>
              <a
                className="btn btn-onink justify-center"
                href={`https://wa.me/${clinic.whatsappRaw}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} aria-hidden /> {t('contact.chat')}
              </a>
            </div>
          </div>

          {/* RIGHT — map */}
          <div className="reveal relative flex flex-col">
            <div
              className="relative h-full min-h-[20rem] w-full overflow-hidden rounded-[2rem]"
              style={{ border: '1px solid rgba(231,211,156,0.18)' }}
            >
              <iframe
                src={clinic.address.mapsEmbed}
                title="Lokasi Ameris Aesthetic Clinic"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[20rem] w-full"
                style={{ border: 0 }}
                allowFullScreen
              />

              <a
                href={clinic.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-onink absolute bottom-4 left-1/2 -translate-x-1/2"
              >
                <MapPin size={16} aria-hidden /> {t('contact.openMaps')}
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
