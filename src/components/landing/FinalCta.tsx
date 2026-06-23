import { Link } from '@tanstack/react-router'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { clinic } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'

export function FinalCta() {
  const { t } = useI18n()
  return (
    <section id="daftar" className="py-24">
      <div className="shell-x">
        <div
          className="reveal relative overflow-hidden rounded-[2rem] px-8 py-16 text-center sm:px-12"
          style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}
        >
          <div className="radiance-gold" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <span className="eyebrow" style={{ color: 'var(--color-gold-light)' }}>
              {clinic.motto}
            </span>
            <h2 className="mt-4 text-[2.6rem] sm:text-[3.4rem]" style={{ color: '#faf3e6' }}>
              {t('cta.title1')}
              <br />
              <span className="gold-text">{t('cta.titleAccent')}</span>
            </h2>
            <p className="mt-5 text-[1.05rem]" style={{ color: 'rgba(246,237,220,0.78)' }}>
              {t('cta.desc', { location: clinic.location, hashtag: clinic.hashtag })}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/masuk" className="btn btn-gold">
                {t('cta.registerFree')} <ArrowRight size={18} />
              </Link>
              <a
                href={`https://wa.me/${clinic.whatsappRaw}`}
                className="btn btn-onink"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} /> Chat {clinic.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
