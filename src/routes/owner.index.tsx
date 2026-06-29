import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarCheck, CreditCard, TrendingUp, Users } from 'lucide-react'
import { RevenueChart } from '../components/owner/RevenueChart'
import { fmtDateLong, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone } from '../data/owner'
import { ownerDashboard, ownerRevenue } from '#/server/dashboard'

export const Route = createFileRoute('/owner/')({ component: OwnerDashboard })

const RANGES = [
  { key: '7h', label: '7 Hari' },
  { key: '4w', label: '4 Minggu' },
  { key: '6m', label: '6 Bulan' },
] as const

function OwnerDashboard() {
  const { data: dash } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => ownerDashboard(),
  })

  const today = dash?.todaySchedule ?? []
  const pendingPay = dash?.pendingPayments ?? []

  const [rangeIdx, setRangeIdx] = useState(0)
  const range = RANGES[rangeIdx]
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['owner-revenue', range.key],
    queryFn: () => ownerRevenue({ data: { range: range.key } }),
  })
  const rangeData = revenue?.data ?? []
  const rangeTotal = revenue?.total ?? 0

  const kpis = [
    { label: 'Kedatangan hari ini', value: String(dash?.todayArrivals ?? 0), icon: CalendarCheck },
    { label: 'Pendapatan hari ini', value: formatRp(dash?.revenueToday ?? 0), icon: TrendingUp },
    { label: 'Menunggu konfirmasi', value: String(dash?.waitingCount ?? 0), icon: CreditCard },
    { label: 'Total pasien', value: String(dash?.totalPatients ?? 0), icon: Users },
  ]

  return (
    <div>
      <span className="eyebrow">Owner</span>
      <h1 className="mt-2 text-[2rem]">Dashboard</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        {dash ? fmtDateLong(dash.date) : ''}
      </p>

      {/* KPI */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="card-soft p-5">
              <div className="flex items-center justify-between">
                <span className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>{k.label}</span>
                <Icon size={18} style={{ color: 'var(--color-gold-deep)' }} />
              </div>
              <div className="mono mt-3 text-2xl font-extrabold gold-text">{k.value}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Revenue chart */}
        <div className="card-soft p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg">Pendapatan</h2>
              <div className="mono mt-1 text-2xl font-extrabold gold-text">{formatRp(rangeTotal)}</div>
            </div>
            <div className="inline-flex rounded-full p-1" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
              {RANGES.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRangeIdx(i)}
                  className="rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition"
                  style={rangeIdx === i ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { color: 'var(--color-ink-muted)' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <RevenueChart key={range.key} data={rangeData} loading={revenueLoading} />
          </div>
        </div>

        {/* Today schedule */}
        <div className="card-soft p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Jadwal hari ini</h2>
            <Link to="/owner/jadwal" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
              Kelola <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {today.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada kedatangan hari ini.</p>
            ) : (
              today.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="mono w-12 shrink-0 text-sm font-bold" style={{ color: 'var(--color-ink-soft)' }}>{b.time}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{b.patientName}</div>
                    <div className="truncate text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{b.items.map((i) => i.name).join(', ')}</div>
                  </div>
                  <span className="badge shrink-0" style={{ background: statusTone[b.status as OwnerStatus].bg, color: statusTone[b.status as OwnerStatus].color }}>{b.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending payments */}
      <div className="card-soft mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Pembayaran menunggu persetujuan</h2>
          <Link to="/owner/transaksi" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
            Semua transaksi <ArrowRight size={14} />
          </Link>
        </div>
        {pendingPay.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada pembayaran tertunda. 🎉</p>
        ) : (
          <div className="mt-4 flex flex-col divide-y" style={{ borderColor: 'var(--color-line)' }}>
            {pendingPay.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-semibold">{b.patientName} · <span className="mono">{b.id}</span></div>
                  <div className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{b.items.map((i) => i.name).join(', ')} · {b.payment}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="mono text-sm font-bold gold-text">{formatRp(b.total)}</span>
                  <span className="badge" style={{ background: payTone[b.payStatus as PayStatus].bg, color: payTone[b.payStatus as PayStatus].color }}>{b.payStatus === 'Pending' ? 'Transfer sudah masuk?' : b.payStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
