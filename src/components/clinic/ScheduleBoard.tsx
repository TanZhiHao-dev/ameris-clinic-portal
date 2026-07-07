// Shared "Jadwal kedatangan" board — used by both the owner and doctor consoles.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCheck, ChevronDown, Clock, HandHeart, RotateCcw, UserCheck, X } from 'lucide-react'
import { fmtDate, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone } from '../../data/owner'
import { ownerBookingsByDate, ownerCompleteBooking, ownerRestoreBooking, ownerSetBookingStatus } from '#/server/bookings'
import { ownerBeauticians, ownerSetBookingBeautician } from '#/server/beauticians'

// Real "today" in clinic time (WIB) — the old static TODAY constant was a seed
// reference date, which made the board open on the wrong day in production.
const todayWIB = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export function ScheduleBoard() {
  const qc = useQueryClient()
  const [realToday] = useState(() => todayWIB())
  const [flash, setFlash] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [date, setDate] = useState(realToday)
  // Card whose Batalkan is awaiting inline confirmation (one at a time).
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)

  const { data } = useQuery({
    queryKey: ['owner-jadwal', date],
    queryFn: () => ownerBookingsByDate({ data: { date } }),
  })
  const { data: beauticians = [] } = useQuery({ queryKey: ['owner-beauticians'], queryFn: () => ownerBeauticians() })
  const activeBeauticians = beauticians.filter((b) => b.isActive)
  // Keep an already-attributed (but since-deactivated) beautician selectable so
  // the dropdown can still show who did a past visit.
  const beauticianOptions = (currentId: string | null) => {
    const extra = currentId && !activeBeauticians.some((b) => b.id === currentId) ? beauticians.filter((b) => b.id === currentId) : []
    return [...activeBeauticians, ...extra]
  }

  const setBeauticianMut = useMutation({
    mutationFn: (v: { bookingId: string; beauticianId: string | null }) => ownerSetBookingBeautician({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
      qc.invalidateQueries({ queryKey: ['owner-visit-report'] })
    },
    onError: (e) => showError(e),
  })

  const dates = data?.dates ?? []
  const list = (data?.bookings ?? []).slice().sort((a, b) => a.time.localeCompare(b.time))
  const cancelled = data?.cancelled ?? []

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
    qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
    qc.invalidateQueries({ queryKey: ['owner-transaksi'] })
  }
  // Every mutation surfaces its server message — a silent failure here is how a
  // paid booking once ended up cancelled with nobody understanding why.
  const showError = (e: unknown) =>
    setErrMsg((e as Error)?.message || 'Terjadi kesalahan. Coba lagi.')

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: 'Dikonfirmasi' | 'Hadir' | 'Batal' }) => ownerSetBookingStatus({ data: v }),
    onSuccess: (res) => {
      refresh()
      setConfirmCancelId(null)
      if (res.status === 'Batal') {
        setShowCancelled(true)
        setFlash(`${res.id} dibatalkan — bisa dipulihkan dari bagian "Dibatalkan" di bawah.`)
        setTimeout(() => setFlash(null), 5000)
      }
    },
    onError: showError,
  })
  const setStatus = (id: string, status: 'Dikonfirmasi' | 'Hadir' | 'Batal') => {
    setErrMsg(null)
    statusMut.mutate({ id, status })
  }

  const completeMut = useMutation({
    mutationFn: (id: string) => ownerCompleteBooking({ data: { id } }),
    onSuccess: (res) => {
      refresh()
      setFlash(`${res.id} selesai${res.pointsAdded > 0 ? ` — +${res.pointsAdded} poin` : ''}.`)
      setTimeout(() => setFlash(null), 3500)
    },
    onError: showError,
  })
  const complete = (b: { id: string }) => {
    setErrMsg(null)
    completeMut.mutate(b.id)
  }

  const restoreMut = useMutation({
    mutationFn: (id: string) => ownerRestoreBooking({ data: { id } }),
    onSuccess: (res) => {
      refresh()
      setFlash(`${res.id} dipulihkan — kembali ke status Menunggu.`)
      setTimeout(() => setFlash(null), 3500)
    },
    onError: showError,
  })
  const restore = (id: string) => {
    setErrMsg(null)
    restoreMut.mutate(id)
  }

  const busy = statusMut.isPending || completeMut.isPending || restoreMut.isPending

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
      {errMsg && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{errMsg}</span>
        </div>
      )}

      {/* Date filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {!dates.includes(realToday) && (
          <button
            type="button"
            onClick={() => setDate(realToday)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={date === realToday ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}
          >
            Hari ini
          </button>
        )}
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={date === d ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}
          >
            {d === realToday ? 'Hari ini' : fmtDate(d)}
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
            <div key={b.id} className="card-soft p-5">
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

              {/* Who performed this visit — drives the beautician's bonus + the
                  management report. Assignable any time before/after Selesai. */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <HandHeart size={15} style={{ color: 'var(--color-gold-deep)' }} />
                <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Dikerjakan:</span>
                {activeBeauticians.length === 0 && !b.beauticianId ? (
                  <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                    belum ada beautician — tambah di menu Beautician
                  </span>
                ) : (
                  <select
                    value={b.beauticianId ?? ''}
                    disabled={setBeauticianMut.isPending}
                    onChange={(e) => setBeauticianMut.mutate({ bookingId: b.id, beauticianId: e.target.value || null })}
                    className="rounded-lg border bg-white px-2.5 py-1.5 text-sm font-semibold outline-none disabled:opacity-60"
                    style={{ borderColor: b.beauticianId ? 'var(--color-line)' : 'var(--color-gold)', color: 'var(--color-ink)' }}
                    aria-label={`Beautician untuk ${b.patientName}`}
                  >
                    <option value="">— pilih beautician —</option>
                    {beauticianOptions(b.beauticianId).map((bt) => (
                      <option key={bt.id} value={bt.id}>{bt.name}{bt.isActive ? '' : ' (nonaktif)'}</option>
                    ))}
                  </select>
                )}
              </div>

              {b.status !== 'Selesai' && b.status !== 'Batal' && (
                confirmCancelId === b.id ? (
                  <div className="mt-4 rounded-2xl border-t p-4 pt-4" style={{ background: 'rgba(179,73,47,0.08)', border: '1px solid rgba(179,73,47,0.25)' }}>
                    <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-destructive)' }}>
                      <AlertTriangle size={16} /> Batalkan booking {b.patientName} ({b.time})? Pembayaran yang sudah masuk tidak ikut terhapus.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(b.id, 'Batal')}
                        className="btn px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: 'var(--color-destructive)' }}
                      >
                        <X size={15} /> Ya, batalkan
                      </button>
                      <button type="button" disabled={busy} onClick={() => setConfirmCancelId(null)} className="btn btn-ghost px-4 py-2 text-sm">
                        Kembali
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    {b.status === 'Menunggu' && (
                      <button type="button" disabled={busy} className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStatus(b.id, 'Dikonfirmasi')}>
                        <Check size={15} /> Konfirmasi
                      </button>
                    )}
                    {b.status === 'Dikonfirmasi' && (
                      <button type="button" disabled={busy} className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" onClick={() => setStatus(b.id, 'Hadir')}>
                        <UserCheck size={15} /> Tandai hadir
                      </button>
                    )}
                    {b.status === 'Hadir' && (
                      <button type="button" disabled={busy} className="btn btn-gold px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" onClick={() => complete(b)}>
                        <CheckCheck size={15} /> Selesai &amp; cairkan poin
                      </button>
                    )}
                    <button type="button" disabled={busy} className="btn btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" style={{ color: 'var(--color-rose)' }} onClick={() => { setErrMsg(null); setConfirmCancelId(b.id) }}>
                      <X size={15} /> Batalkan
                    </button>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>

      {/* Cancelled bookings for this date — recoverable, so an accidental
          cancellation is never a dead end. */}
      {cancelled.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <ChevronDown size={16} className="transition-transform" style={{ transform: showCancelled ? 'rotate(180deg)' : 'none' }} />
            Dibatalkan pada tanggal ini ({cancelled.length})
          </button>
          {showCancelled && (
            <div className="mt-4 flex flex-col gap-4">
              {cancelled.map((b) => (
                <div key={b.id} className="card-soft p-5" style={{ opacity: 0.85 }}>
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
                    <span className="badge shrink-0" style={{ background: statusTone.Batal.bg, color: statusTone.Batal.color }}>Batal</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    <button type="button" disabled={busy} className="btn btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" onClick={() => restore(b.id)}>
                      <RotateCcw size={15} /> Pulihkan booking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
