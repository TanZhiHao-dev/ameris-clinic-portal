import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Crown, Gift } from 'lucide-react'
import { loyaltyHistory, loyaltySummary, redeemPoints, redeemTiers } from '../server/loyalty'

export const Route = createFileRoute('/akun/privilege')({ component: PrivilegePage })

function PrivilegePage() {
  const qc = useQueryClient()
  const { data: summary } = useQuery({
    queryKey: ['loyalty-summary'],
    queryFn: () => loyaltySummary(),
  })
  const { data: tiers = [] } = useQuery({
    queryKey: ['redeem-tiers'],
    queryFn: () => redeemTiers(),
  })
  const { data: history = [] } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => loyaltyHistory(),
  })

  const redeem = useMutation({
    mutationFn: (treatmentId: string) => redeemPoints({ data: { treatmentId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-summary'] })
      qc.invalidateQueries({ queryKey: ['loyalty-history'] })
    },
  })

  const pts = summary?.points ?? 0
  const nextTier = summary?.nextTier ?? null

  return (
    <div>
      <h1 className="text-[2rem]">Ameris Privilege Club</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Setiap transaksi Rp1.000.000 = 1 poin. Tukar dengan treatment gratis.
      </p>

      {/* Balance */}
      <div className="card-soft mt-6 overflow-hidden p-6" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
        <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-gold-light)' }}>
          <Crown size={14} /> Saldo poin kamu
        </div>
        <div className="mono mt-2 text-5xl font-extrabold" style={{ color: '#faf3e6' }}>{pts}</div>
        {nextTier && (
          <p className="mt-2 text-sm" style={{ color: 'rgba(246,237,220,0.72)' }}>
            {nextTier.point - pts} poin lagi untuk menukar{' '}
            <span className="font-semibold" style={{ color: '#faf3e6' }}>{nextTier.name}</span>.
          </p>
        )}
      </div>

      {/* Redeem ladder */}
      <div className="mt-8 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
        <Gift size={16} /> Tukarkan poin
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {tiers.map((t) => {
          const can = pts >= t.point
          return (
            <div
              key={t.treatmentId}
              className="card-soft flex items-center gap-3 p-4"
              style={can ? undefined : { opacity: 0.7 }}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold"
                style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
              >
                {t.point}
              </span>
              <span className="flex-1 text-sm leading-tight">{t.name}</span>
              <button
                type="button"
                disabled={!can || redeem.isPending}
                onClick={() => redeem.mutate(t.treatmentId)}
                className="btn btn-primary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                {can ? 'Tukar' : 'Terkunci'}
              </button>
            </div>
          )
        })}
      </div>

      {/* History */}
      <h2 className="mt-10 text-xl">Riwayat poin</h2>
      <div className="card-soft mt-4 divide-y" style={{ borderColor: 'var(--color-line)' }}>
        {history.map((h, i) => (
          <div key={i} className="flex items-center justify-between p-4" style={{ borderColor: 'var(--color-line)' }}>
            <div>
              <div className="text-sm font-semibold">{h.label}</div>
              <div className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{h.date}</div>
            </div>
            <div
              className="mono flex items-center gap-1 text-sm font-bold"
              style={{ color: h.delta >= 0 ? 'var(--color-gold-deep)' : 'var(--color-rose)' }}
            >
              {h.delta >= 0 ? <Check size={14} /> : null}
              {h.delta >= 0 ? `+${h.delta}` : h.delta} poin
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
