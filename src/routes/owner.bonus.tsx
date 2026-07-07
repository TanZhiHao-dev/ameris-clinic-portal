import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Download, Target, Wallet } from 'lucide-react'
import { ownerBonusReport } from '#/server/bonus'
import { formatRp } from '#/data/clinic'

export const Route = createFileRoute('/owner/bonus')({ component: BonusReport })

const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date())
const csvCell = (v: string | number | null) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function BonusReport() {
  const [month, setMonth] = useState(thisMonth())
  const { data, isPending } = useQuery({ queryKey: ['owner-bonus-report', month], queryFn: () => ownerBonusReport({ data: { month } }) })
  const rows = data?.rows ?? []

  const exportCsv = () => {
    const header = ['Nama', 'Jenis', 'Per-tindakan', 'Closing', 'Asistensi', 'Bonus target', 'Total']
    const body = rows.map((r) => [r.name, r.role, r.procedure, r.closing, r.assist, r.target, r.total])
    const csv = [header, ...body].map((row) => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bonus-ameris-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Laporan Bonus</span>
          <h1 className="mt-2 text-[2rem]">Bonus staf bulanan</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Per-tindakan + closing/upsell + asistensi + bonus target omzet.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--color-line)' }} />
          <button type="button" className="btn btn-gold" disabled={rows.length === 0} onClick={exportCsv}><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Target banner */}
      <div className="mt-6 rounded-2xl p-5" style={{ background: data?.targetHit ? 'rgba(44,88,72,0.1)' : 'var(--color-shell)', border: `1px solid ${data?.targetHit ? '#2c5848' : 'var(--color-line)'}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {data?.targetHit ? <CheckCircle2 size={22} style={{ color: '#2c5848' }} /> : <Target size={22} style={{ color: 'var(--color-gold-deep)' }} />}
            <div>
              <div className="text-sm font-bold">{data?.targetHit ? 'Target omzet Rp100jt tercapai! 🎉' : 'Target omzet bulanan'}</div>
              <div className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
                {data?.targetHit ? 'Semua staf & dokter dapat bonus Rp500.000.' : 'Kalau tembus Rp100jt, semua staf & dokter dapat Rp500.000.'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[0.72rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>Omzet bulan ini (Lunas)</div>
            <div className="mono text-xl font-extrabold gold-text">{formatRp(data?.revenue ?? 0)}</div>
          </div>
        </div>
        {/* progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-muted)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(((data?.revenue ?? 0) / (data?.targetRevenue ?? 1)) * 100))}%`, background: 'var(--grad-gold)' }} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Total bonus bulan ini" value={formatRp(data?.grandTotal ?? 0)} accent icon={<Wallet size={18} />} />
        <Stat label="Staf/dokter dapat bonus" value={String(rows.length)} />
      </div>

      <div className="card-soft mt-6 overflow-x-auto">
        <table className="stack w-full text-sm sm:min-w-[720px]">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Nama</th>
              <th className="px-3 py-4 font-semibold">Jenis</th>
              <th className="px-3 py-4 font-semibold text-right">Per-tindakan</th>
              <th className="px-3 py-4 font-semibold text-right">Closing</th>
              <th className="px-3 py-4 font-semibold text-right">Asistensi</th>
              <th className="px-3 py-4 font-semibold text-right">Target</th>
              <th className="px-3 py-4 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada bonus di bulan ini.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td data-label="Nama" className="px-5 py-4 font-bold">{r.name}</td>
                  <td data-label="Jenis" className="px-3 py-4">{r.role}</td>
                  <td data-label="Per-tindakan" className="mono px-3 py-4 text-right">{r.procedure ? formatRp(r.procedure) : '—'}</td>
                  <td data-label="Closing" className="mono px-3 py-4 text-right">{r.closing ? formatRp(r.closing) : '—'}</td>
                  <td data-label="Asistensi" className="mono px-3 py-4 text-right">{r.assist ? formatRp(r.assist) : '—'}</td>
                  <td data-label="Target" className="mono px-3 py-4 text-right">{r.target ? formatRp(r.target) : '—'}</td>
                  <td data-label="Total" className="mono px-3 py-4 text-right font-extrabold gold-text">{formatRp(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="card-soft flex items-center justify-between p-5">
      <div>
        <div className="text-[0.78rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{label}</div>
        <div className={`mono mt-1.5 text-2xl font-extrabold ${accent ? 'gold-text' : ''}`}>{value}</div>
      </div>
      {icon && <span style={{ color: 'var(--color-gold-deep)' }}>{icon}</span>}
    </div>
  )
}
