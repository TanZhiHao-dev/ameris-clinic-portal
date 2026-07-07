import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Download, HandHeart } from 'lucide-react'
import { ownerVisitReport } from '#/server/beauticians'
import { formatRp } from '#/data/clinic'
import { fmtDate } from '#/data/owner'

export const Route = createFileRoute('/owner/laporan')({ component: OwnerReport })

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Quote a cell only when needed; prefix the file with a BOM so Excel reads UTF-8.
const csvCell = (v: string | number | null) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function OwnerReport() {
  const now = new Date()
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(iso(now))

  const { data, isPending } = useQuery({
    queryKey: ['owner-visit-report', from, to],
    queryFn: () => ownerVisitReport({ data: { from, to } }),
  })
  const rows = data?.rows ?? []
  const summary = data?.summary ?? []

  const exportCsv = () => {
    const header = ['Tanggal', 'Waktu', 'Nama Pasien', 'Treatment', 'Harga Treatment', 'Beautician', 'Bonus']
    const body = rows.map((r) => [r.date, r.time, r.patientName, r.treatments.join('; '), r.total, r.beauticianName ?? '', r.bonus])
    const csv = [header, ...body].map((row) => row.map(csvCell).join(',')).join('\n')
    // Prepend a UTF-8 BOM so Excel opens Indonesian names in the right encoding.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-ameris-${from}_sd_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dInp = 'rounded-lg border bg-white px-3 py-2 text-sm outline-none'

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Laporan Management</span>
          <h1 className="mt-2 text-[2rem]">Laporan kunjungan</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Kunjungan yang sudah <b>selesai</b> — tanggal, pasien, treatment, harga, dan beautician yang mengerjakan.
          </p>
        </div>
        <button type="button" className="btn btn-gold" disabled={rows.length === 0} onClick={exportCsv}>
          <Download size={18} /> Export Excel (CSV)
        </button>
      </div>

      {/* Date filter */}
      <div className="card-soft mt-6 flex flex-wrap items-center gap-4 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span style={{ color: 'var(--color-ink-muted)' }}>Dari</span>
          <input type="date" className={dInp} style={{ borderColor: 'var(--color-line)' }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span style={{ color: 'var(--color-ink-muted)' }}>Sampai</span>
          <input type="date" className={dInp} style={{ borderColor: 'var(--color-line)' }} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          {([['Bulan ini', new Date(now.getFullYear(), now.getMonth(), 1), now], ['30 hari', new Date(now.getTime() - 29 * 86400000), now], ['Tahun ini', new Date(now.getFullYear(), 0, 1), now]] as const).map(([label, f, t]) => (
            <button key={label} type="button" onClick={() => { setFrom(iso(f)); setTo(iso(t)) }}
              className="rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition"
              style={{ background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total kunjungan" value={String(rows.length)} />
        <Stat label="Total pendapatan" value={formatRp(data?.totalRevenue ?? 0)} />
        <Stat label="Total bonus beautician" value={formatRp(data?.totalBonus ?? 0)} accent />
      </div>

      {/* Per-beautician bonus summary */}
      {summary.length > 0 && (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-bold"><HandHeart size={16} style={{ color: 'var(--color-gold-deep)' }} /> Bonus per beautician</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((s) => (
              <div key={s.id} className="card-soft flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>{s.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="truncate font-bold">{s.name}</div>
                    <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{s.visits} kunjungan · {formatRp(s.revenue)}</div>
                  </div>
                </div>
                <div className="mono shrink-0 text-lg font-extrabold gold-text">{formatRp(s.bonus)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.unattributed > 0 && (
        <div className="mt-6 flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(197,135,108,0.12)', color: 'var(--color-rose)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span><b>{data.unattributed} kunjungan</b> belum ada beauticiannya. Buka menu <b>Jadwal</b>, pilih tanggalnya, lalu set “Dikerjakan” agar bonus &amp; laporan lengkap.</span>
        </div>
      )}

      {/* Table */}
      <div className="card-soft mt-6 overflow-x-auto">
        <table className="stack w-full text-sm sm:min-w-[720px]">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Tanggal &amp; Waktu</th>
              <th className="px-3 py-4 font-semibold">Nama Pasien</th>
              <th className="px-3 py-4 font-semibold">Treatment</th>
              <th className="px-3 py-4 font-semibold">Harga</th>
              <th className="px-3 py-4 font-semibold">Beautician</th>
              <th className="px-3 py-4 font-semibold">Bonus</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada kunjungan selesai di rentang tanggal ini.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td data-label="Tanggal & Waktu" className="px-5 py-4"><div className="font-semibold">{fmtDate(r.date)}</div><div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{r.time} WIB</div></td>
                  <td data-label="Pasien" className="px-3 py-4">{r.patientName}</td>
                  <td data-label="Treatment" className="px-3 py-4">{r.treatments.join(', ')}</td>
                  <td data-label="Harga" className="mono px-3 py-4">{formatRp(r.total)}</td>
                  <td data-label="Beautician" className="px-3 py-4">
                    {r.beauticianName ? (
                      <span className="font-semibold">{r.beauticianName}</span>
                    ) : (
                      <span className="text-[0.8rem] italic" style={{ color: 'var(--color-rose)' }}>belum diisi</span>
                    )}
                  </td>
                  <td data-label="Bonus" className="mono px-3 py-4 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{r.bonus > 0 ? formatRp(r.bonus) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-soft p-5">
      <div className="text-[0.78rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>{label}</div>
      <div className={`mono mt-1.5 text-2xl font-extrabold ${accent ? 'gold-text' : ''}`}>{value}</div>
    </div>
  )
}
