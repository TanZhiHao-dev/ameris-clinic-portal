import { Bell, Clock, FileText, Wallet } from 'lucide-react'
import { valueProps } from '../../data/clinic'

const ICONS = { clock: Clock, wallet: Wallet, file: FileText, bell: Bell }

export function ValueProps() {
  return (
    <section className="py-24">
      <div className="shell-x">
        <div className="reveal max-w-xl">
          <span className="eyebrow">Kenapa Ameris</span>
          <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
            Portal mandiri yang <span className="gold-text">mengurus detailnya</span> untukmu.
          </h2>
        </div>

        <div className="reveal mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => {
            const Icon = ICONS[v.icon]
            return (
              <div key={v.title} className="card-soft p-6">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: 'rgba(195,154,68,0.14)', color: 'var(--color-gold-deep)' }}
                >
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {v.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
