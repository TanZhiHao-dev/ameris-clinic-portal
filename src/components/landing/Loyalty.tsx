import { Check, Crown, Gift } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { redeemTiersQuery } from '../../server/queries'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'

const BENEFIT_KEYS: DictKey[] = [
  'privilege.benefit.1',
  'privilege.benefit.2',
  'privilege.benefit.3',
  'privilege.benefit.4',
  'privilege.benefit.5',
]

function GoldRing({ points = 14, target = 20 }: { points?: number; target?: number }) {
  const { t } = useI18n()
  const r = 82
  const c = 2 * Math.PI * r
  const pct = Math.min(points / target, 1)
  const offset = c * (1 - pct)

  return (
    <div className="relative grid place-items-center">
      <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
        <defs>
          <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#efdca6" />
            <stop offset="55%" stopColor="#d4ad55" />
            <stop offset="100%" stopColor="#b58a32" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(246,237,220,0.12)" strokeWidth="14" />
        <circle
          cx="110"
          cy="110"
          r={r}
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: 'drop-shadow(0 0 10px rgba(213,173,85,0.55))' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-6xl font-extrabold" style={{ color: '#f7eed9' }}>
          {points}
        </div>
        <div className="text-[0.62rem] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-gold-light)' }}>
          {t('loyalty.pointsLabel')}
        </div>
      </div>
    </div>
  )
}

export function Loyalty() {
  const { data: tiers = [] } = useQuery(redeemTiersQuery)
  const { t } = useI18n()

  return (
    <section
      id="privilege"
      className="relative overflow-hidden py-24"
      style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}
    >
      <div className="radiance-gold" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="shell-x relative">
        {/* Heading */}
        <div className="reveal flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 eyebrow" style={{ color: 'var(--color-gold-light)' }}>
            <Crown size={15} /> Ameris Privilege Club
          </span>
          <h2 className="mt-4 max-w-2xl text-[2.4rem] leading-[1.05] sm:text-[3.1rem]" style={{ color: '#faf3e6' }}>
            Every treatment, <span className="gold-text italic">every reward</span>.
          </h2>
          <p className="mt-5 max-w-xl text-[1.02rem]" style={{ color: 'rgba(246,237,220,0.72)' }}>
            {t('loyalty.desc1')}<strong style={{ color: '#faf3e6' }}>{t('loyalty.descStrong')}</strong>{t('loyalty.desc2')}
          </p>
        </div>

        <div className="mt-14 grid items-start gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Ring + benefits */}
          <div className="reveal flex flex-col items-center gap-8">
            <GoldRing points={14} target={20} />
            <ul className="flex w-full max-w-xs flex-col gap-3">
              {BENEFIT_KEYS.map((key) => (
                <li
                  key={key}
                  className="group flex items-center gap-3 text-sm transition-transform duration-300 hover:translate-x-1"
                  style={{ color: 'rgba(246,237,220,0.86)' }}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105"
                    style={{ background: 'var(--grad-gold)', color: '#3a2c0f', boxShadow: '0 4px 12px rgba(213,173,85,0.3)' }}
                    aria-hidden
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {/* Redemption ladder */}
          <div className="reveal">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-light)' }}>
              <Gift size={16} /> {t('loyalty.redeemTitle')}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {tiers.map((t) => (
                <li
                  key={t.treatmentId}
                  className="group flex items-center gap-3 rounded-full px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'rgba(246,237,220,0.05)', border: '1px solid rgba(231,211,156,0.14)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(231,211,156,0.4)'
                    e.currentTarget.style.boxShadow = '0 12px 28px -16px rgba(213,173,85,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(231,211,156,0.14)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold transition-transform duration-300 group-hover:scale-105"
                    style={{ background: 'var(--grad-gold)', color: '#3a2c0f', boxShadow: '0 6px 16px -6px rgba(213,173,85,0.6)' }}
                  >
                    {t.point}
                  </span>
                  <span className="text-[0.82rem] leading-tight" style={{ color: 'rgba(246,237,220,0.9)' }}>
                    {t.name}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.78rem]" style={{ color: 'rgba(246,237,220,0.5)' }}>
              {t('loyalty.note')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
