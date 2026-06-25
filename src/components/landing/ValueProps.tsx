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
          <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
            {t('value.title1')} <span className="gold-text">{t('value.titleAccent')}</span> {t('value.title3')}
          </h2>
        </div>

        <div className="reveal mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => {
            const Icon = ICONS[v.icon]
            return (
              <div key={v.icon} className="card-soft p-6">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: 'rgba(195,154,68,0.14)', color: 'var(--color-gold-deep)' }}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{t(`value.${v.icon}.title` as DictKey)}</h3>
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
