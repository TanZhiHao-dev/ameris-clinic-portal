// Shared "Jadwal kedatangan" board — used by both the owner and doctor consoles.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, Clock, UserCheck, X } from 'lucide-react'
import { fmtDate, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone, TODAY } from '../../data/owner'
import { ownerBookingsByDate, ownerCompleteBooking, ownerSetBookingStatus } from '#/server/bookings'

export function ScheduleBoard() {
  const qc = useQueryClient()
  const [flash, setFlash] = useState<string | null>(null)
  const [date, setDate] = useState(TODAY)

  const { data } = useQuery({
    queryKey: ['owner-jadwal', date],
    queryFn: () => ownerBookingsByDate({ data: { date } }),
  })

  const dates = data?.dates ?? []
  const list = (data?.bookings ?? []).slice().sort((a, b) => a.time.localeCompare(b.time))

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
    qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
    qc.invalidateQueries({ queryKey: ['owner-transaksi'] })
  }

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: 'Dikonfirmasi' | 'Hadir' | 'Batal' }) => ownerSetBookingStatus({ data: v }),
    onSuccess: refresh,
  })
  const setStatus = (id: string, status: 'Dikonfirmasi' | 'Hadir' | 'Batal') => statusMut.mutate({ id, status })

  const completeMut = useMutation({
    mutationFn: (id: string) => ownerCompleteBooking({ data: { id } }),
    onSuccess: (res) => {
      refresh()
      setFlash(`${res.id} selesai${res.pointsAdded > 0 ? ` — +${res.pointsAdded} poin` : ''}.`)
      setTimeout(() => setFlash(null), 3500)
    },
  })
  const complete = (b: { id: string }) => completeMut.mutate(b.id)

  return (
    <div>
      <span className="eyebrow">Manajemen Jadwal</span>
      <h1 className="mt-2 text-[2rem]">Jadwal kedatangan</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Konfirmasi booking, tandai kehadiran, dan selesaikan treatment.
      </p>

      {flash && (
        <div className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(44,88,72,0.12)', color: '#2c5848' }}>
          <CheckCheck size={16} /> {flash}
        </div>
      )}

      {/* Date filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={date === d ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}
          >
            {d === TODAY ? 'Hari ini' : fmtDate(d)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {list.length === 0 ? (
          <div className="card-soft p-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada jadwal pada tanggal ini.</p>
          </div>
        ) : (
          list.map((b) => (
            <div key={b.id} className="card-soft p-5" style={b.status === 'Batal' ? { opacity: 0.7 } : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center rounded-xl px-3 py-2" style={{ background: 'var(--color-muted)' }}>
                    <Clock size={14} style={{ color: 'var(--color-gold-deep)' }} />
                    <span className="mono mt-1 text-sm font-bold">{b.time}</span>
                  </div>
                  <div>
                    <div className="font-bold">{b.patientName}</div>
                    <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                      {b.items.map((i) => i.name).join(', ')}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="mono text-sm font-bold gold-text">{formatRp(b.total)}</span>
                      <span className="badge" style={{ background: payTone[b.payStatus as PayStatus].bg, color: payTone[b.payStatus as PayStatus].color }}>{b.payment} · {b.payStatus}</span>
                    </div>
                  </div>
                </div>
                <span className="badge shrink-0" style={{ background: statusTone[b.status as OwnerStatus].bg, color: statusTone[b.status as OwnerStatus].color }}>{b.status}</span>
              </div>

              {b.status !== 'Selesai' && b.status !== 'Batal' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  {b.status === 'Menunggu' && (
                    <button type="button" className="btn btn-primary px-4 py-2 text-sm" onClick={() => setStatus(b.id, 'Dikonfirmasi')}>
                      <Check size={15} /> Konfirmasi
                    </button>
                  )}
                  {b.status === 'Dikonfirmasi' && (
                    <button type="button" className="btn btn-primary px-4 py-2 text-sm" onClick={() => setStatus(b.id, 'Hadir')}>
                      <UserCheck size={15} /> Tandai hadir
                    </button>
                  )}
                  {b.status === 'Hadir' && (
                    <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => complete(b)}>
                      <CheckCheck size={15} /> Selesai &amp; cairkan poin
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost px-4 py-2 text-sm" style={{ color: 'var(--color-rose)' }} onClick={() => setStatus(b.id, 'Batal')}>
                    <X size={15} /> Batalkan
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
