import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Coins, Stethoscope, TrendingUp, User } from 'lucide-react'
import { formatRp } from '../data/clinic'
import { fmtDateLong } from '../data/owner'
import { doctorEarnings } from '#/server/doctors'

export const Route = createFileRoute('/dokter/profil')({ component: DoctorProfile })

function DoctorProfile() {
  const { data, isPending } = useQuery({
    queryKey: ['doctor-earnings'],
    queryFn: () => doctorEarnings(),
  })

  if (isPending || !data) return <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</p>

  return (
    <div>
      <span className="eyebrow">Profil &amp; Bagi Hasil</span>
      <h1 className="mt-2 text-[2rem]">{data.name}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Treatment yang kamu kerjakan tiap hari dan total bagi hasil tiap bulan.
      </p>

      {/* Totals */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-soft p-6" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-gold-light)' }}>
            <Coins size={15} /> Bagi hasil bulan ini{data.thisMonthLabel ? ` · ${data.thisMonthLabel}` : ''}
          </div>
          <div className="mono mt-2 text-3xl font-extrabold gold-text">{formatRp(data.thisMonthTotal)}</div>
        </div>
        <div className="card-soft flex flex-col justify-center p-6">
          <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
            <TrendingUp size={15} /> Total bagi hasil (semua waktu)
          </div>
          <div className="mono mt-2 text-3xl font-extrabold gold-text">{formatRp(data.allTimeTotal)}</div>
        </div>
      </div>

      {/* Monthly breakdown */}
      <h2 className="mt-8 flex items-center gap-2 text-xl"><CalendarDays size={20} style={{ color: 'var(--color-gold-deep)' }} /> Bagi hasil per bulan</h2>
      {data.months.length === 0 ? (
        <div className="card-soft mt-4 p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada treatment selesai yang tercatat.</p>
        </div>
      ) : (
        <div className="card-soft mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Bulan</th>
                <th className="px-3 py-3 font-semibold">Treatment</th>
                <th className="px-3 py-3 text-right font-semibold">Total bagi hasil</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="px-5 py-3 font-semibold">{m.label}</td>
                  <td className="px-3 py-3" style={{ color: 'var(--color-ink-soft)' }}>{m.count}×</td>
                  <td className="px-3 py-3 text-right mono font-bold gold-text">{formatRp(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-day treatments */}
      <h2 className="mt-8 flex items-center gap-2 text-xl"><Stethoscope size={20} style={{ color: 'var(--color-gold-deep)' }} /> Treatment yang dikerjakan per hari</h2>
      {data.days.length === 0 ? (
        <div className="card-soft mt-4 p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada riwayat treatment.</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {data.days.map((d) => (
            <div key={d.date} className="card-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <CalendarDays size={16} style={{ color: 'var(--color-gold-deep)' }} /> {fmtDateLong(d.date)}
                </div>
                <span className="badge" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
                  {formatRp(d.total)}
                </span>
              </div>
              <div className="my-3 hairline-gold" />
              <div className="flex flex-col gap-2">
                {d.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{it.treatment}</span>
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-ink-muted)' }}>
                      <User size={13} /> {it.patient}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
