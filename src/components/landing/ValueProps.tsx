import { Bell, Clock, FileText, Wallet } from 'lucide-react'
import { valueProps } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'

const ICONS = { clock: Clock, wallet: Wallet, file: FileText, bell: Bell }

export function ValueProps() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden py-24">
      <div className="aura-soft" aria-hidden />
      <div className="shell-x relative">
        <div className="reveal max-w-xl">
          <span className="eyebrow">{t('value.eyebrow')}</span>
          <h2 className="mt-3 text-[2.4rem] leading-[1.05] sm:text-[3rem]">
            {t('value.title1')} <span className="gold-text italic">{t('value.titleAccent')}</span> {t('value.title3')}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v, i) => {
            const Icon = ICONS[v.icon]
            return (
              <div key={v.icon} className={`card-luxe group rounded-[2rem] p-7 rise rise-${i + 1}`}>
                <span
                  className="grid h-14 w-14 place-items-center rounded-full shadow-sm transition-all duration-500 ease-out [background:rgba(195,154,68,0.14)] [color:var(--color-gold-deep)] group-hover:scale-110 group-hover:shadow-md group-hover:[background:var(--grad-gold)] group-hover:[color:var(--color-cream)]"
                  aria-hidden
                >
                  <Icon size={22} className="transition-transform duration-500 ease-out group-hover:scale-110" />
                </span>
                <h3 className="mt-6 text-lg font-bold">{t(`value.${v.icon}.title` as DictKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {t(`value.${v.icon}.body` as DictKey)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
