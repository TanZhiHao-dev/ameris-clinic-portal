import { Check, Crown, Gift } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { privilegeBenefits } from '../../data/clinic'
import { redeemTiers } from '../../server/loyalty'

function GoldRing({ points = 14, target = 20 }: { points?: number; target?: number }) {
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
          Poin Privilege
        </div>
      </div>
    </div>
  )
}

export function Loyalty() {
  const { data: tiers = [] } = useQuery({
    queryKey: ['redeem-tiers'],
    queryFn: () => redeemTiers(),
  })

  return (
    <section
      id="privilege"
      className="relative overflow-hidden py-24"
      style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}
    >
      <div className="grain" aria-hidden />
      <div className="shell-x relative">
        {/* Heading */}
        <div className="reveal flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 eyebrow" style={{ color: 'var(--color-gold-light)' }}>
            <Crown size={15} /> Ameris Privilege Club
          </span>
          <h2 className="mt-3 max-w-2xl text-[2.4rem] sm:text-[3.1rem]" style={{ color: '#faf3e6' }}>
            Every treatment, <span className="gold-text">every reward</span>.
          </h2>
          <p className="mt-4 max-w-xl text-[1.02rem]" style={{ color: 'rgba(246,237,220,0.72)' }}>
            Setiap transaksi <strong style={{ color: '#faf3e6' }}>Rp1.000.000 = 1 poin</strong>.
            Kumpulkan dan tukarkan dengan treatment favoritmu secara gratis.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Ring + benefits */}
          <div className="reveal flex flex-col items-center gap-8">
            <GoldRing points={14} target={20} />
            <ul className="flex w-full max-w-xs flex-col gap-2.5">
              {privilegeBenefits.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(246,237,220,0.86)' }}>
                  <Check size={15} style={{ color: 'var(--color-gold)' }} className="shrink-0" /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Redemption ladder */}
          <div className="reveal">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-light)' }}>
              <Gift size={16} /> Tukarkan poin dengan treatment gratis
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {tiers.map((t) => (
                <li
                  key={t.treatmentId}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(246,237,220,0.05)', border: '1px solid rgba(231,211,156,0.14)' }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold"
                    style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
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
              Penukaran mengikuti nilai poin masing-masing treatment, tanpa batas akumulasi poin.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
