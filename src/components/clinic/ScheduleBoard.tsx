// Shared "Jadwal kedatangan" board — used by both the owner and doctor consoles.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCheck, ChevronDown, Clock, HandHeart, Plus, Receipt, RotateCcw, Trash2, UserCheck, X } from 'lucide-react'
import { fmtDate, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone } from '../../data/owner'
import { ownerBookingsByDate, ownerCompleteBooking, ownerRestoreBooking, ownerSetBookingStatus } from '#/server/bookings'
import { ownerBeauticians, ownerSetBookingBeautician } from '#/server/beauticians'
import { ownerBonusPeople, ownerBookingBonus, ownerRecordAssist, ownerRecordClosing, ownerRemoveAssist, ownerRemoveClosing } from '#/server/bonus'
import { ownerProducts } from '#/server/products'
import { listTreatments } from '#/server/treatments'

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
  // Booking whose closing/assist bonuses are being managed (opens a dialog).
  const [bonusFor, setBonusFor] = useState<{ id: string; patientName: string } | null>(null)
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
    mutationFn: (v: { bookingId: string; beauticianId: string | null; noFacial?: boolean }) => ownerSetBookingBeautician({ data: v }),
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
                {activeBeauticians.length === 0 && !b.beauticianId && !b.noFacial ? (
                  <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                    belum ada beautician — tambah di menu Beautician
                  </span>
                ) : (
                  <select
                    value={b.noFacial ? '__nofacial__' : (b.beauticianId ?? '')}
                    disabled={setBeauticianMut.isPending}
                    onChange={(e) => {
                      const v = e.target.value
                      setBeauticianMut.mutate({
                        bookingId: b.id,
                        beauticianId: v === '__nofacial__' || v === '' ? null : v,
                        noFacial: v === '__nofacial__',
                      })
                    }}
                    className="rounded-lg border bg-white px-2.5 py-1.5 text-sm font-semibold outline-none disabled:opacity-60"
                    style={{ borderColor: b.beauticianId || b.noFacial ? 'var(--color-line)' : 'var(--color-gold)', color: 'var(--color-ink)' }}
                    aria-label={`Beautician untuk ${b.patientName}`}
                  >
                    <option value="">— pilih beautician —</option>
                    <option value="__nofacial__">Tidak ada tindakan facial (dokter)</option>
                    {beauticianOptions(b.beauticianId).map((bt) => (
                      <option key={bt.id} value={bt.id}>{bt.name}{bt.isActive ? '' : ' (nonaktif)'}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => setBonusFor({ id: b.id, patientName: b.patientName })}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition hover:bg-[var(--color-muted)]"
                  style={{ border: '1px solid var(--color-line)', color: 'var(--color-gold-deep)' }}>
                  <Receipt size={15} /> Closing &amp; asistensi
                </button>
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

      {bonusFor && (
        <BonusDialog
          bookingId={bonusFor.id}
          patientName={bonusFor.patientName}
          onClose={() => setBonusFor(null)}
          onChange={() => qc.invalidateQueries({ queryKey: ['owner-visit-report'] })}
        />
      )}
    </div>
  )
}

// Manage a booking's closing/upsell + doctor-assist bonuses. Closing = a deal
// made after the patient left the doctor's room (any staff, 1% treatment / 5%
// skincare). Asistensi = flat by booking total (Rp10rb >1jt, else Rp5rb).
function BonusDialog({ bookingId, patientName, onClose, onChange }: { bookingId: string; patientName: string; onClose: () => void; onChange: () => void }) {
  const qc = useQueryClient()
  const [err, setErr] = useState<string | null>(null)
  const [staffId, setStaffId] = useState('')
  const [kind, setKind] = useState<'treatment' | 'skincare'>('treatment')
  const [itemId, setItemId] = useState('')
  const [assistStaffId, setAssistStaffId] = useState('')

  const { data } = useQuery({ queryKey: ['booking-bonus', bookingId], queryFn: () => ownerBookingBonus({ data: { bookingId } }) })
  const { data: people = [] } = useQuery({ queryKey: ['bonus-people'], queryFn: () => ownerBonusPeople() })
  const { data: treatments = [] } = useQuery({ queryKey: ['pos-treatments'], queryFn: () => listTreatments() })
  const { data: skincare = [] } = useQuery({ queryKey: ['owner-products'], queryFn: () => ownerProducts({ data: { activeOnly: true } }) })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['booking-bonus', bookingId] }); onChange() }
  const onErr = (e: unknown) => setErr((e as Error)?.message || 'Gagal menyimpan.')

  const addClosing = useMutation({
    mutationFn: () => ownerRecordClosing({ data: { bookingId, staffId, kind, itemId } }),
    onSuccess: () => { setErr(null); setStaffId(''); setItemId(''); refresh() },
    onError: onErr,
  })
  const delClosing = useMutation({ mutationFn: (id: string) => ownerRemoveClosing({ data: { id } }), onSuccess: refresh, onError: onErr })
  const addAssist = useMutation({
    mutationFn: () => ownerRecordAssist({ data: { bookingId, staffId: assistStaffId } }),
    onSuccess: () => { setErr(null); setAssistStaffId(''); refresh() },
    onError: onErr,
  })
  const delAssist = useMutation({ mutationFn: (id: string) => ownerRemoveAssist({ data: { id } }), onSuccess: refresh, onError: onErr })

  const items = kind === 'treatment'
    ? treatments.filter((t) => t.available).map((t) => ({ id: t.id, name: t.name }))
    : skincare.map((p) => ({ id: p.id, name: p.name }))
  const sel = 'rounded-lg border bg-white px-2.5 py-2 text-sm outline-none'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2"><Receipt size={18} style={{ color: 'var(--color-gold)' }} /><span className="font-bold">Closing &amp; asistensi — {patientName}</span></div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {err && <p className="mb-4 rounded-xl px-4 py-2.5 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{err}</p>}

          {/* Closing */}
          <h3 className="text-sm font-bold">Closing / Upsell <span className="font-normal" style={{ color: 'var(--color-ink-muted)' }}>· treatment 1% · skincare 5%</span></h3>
          <div className="mt-2 flex flex-col gap-2">
            {(data?.closings ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-cream)' }}>
                <span><b>{c.staffName}</b> · {c.itemName} <span style={{ color: 'var(--color-ink-muted)' }}>({c.kind})</span></span>
                <span className="flex items-center gap-2">
                  <span className="mono font-bold gold-text">{formatRp(c.bonus)}</span>
                  <button type="button" aria-label="Hapus" onClick={() => delClosing.mutate(c.id)} style={{ color: 'var(--color-rose)' }}><Trash2 size={14} /></button>
                </span>
              </div>
            ))}
            {(data?.closings ?? []).length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada closing.</p>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={sel} style={{ borderColor: 'var(--color-line)' }} aria-label="Staf closing">
              <option value="">— siapa —</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={kind} onChange={(e) => { setKind(e.target.value as 'treatment' | 'skincare'); setItemId('') }} className={sel} style={{ borderColor: 'var(--color-line)' }} aria-label="Jenis closing">
              <option value="treatment">Treatment</option>
              <option value="skincare">Skincare</option>
            </select>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={`${sel} min-w-0 flex-1`} style={{ borderColor: 'var(--color-line)' }} aria-label="Item closing">
              <option value="">— item —</option>
              {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
            <button type="button" className="btn btn-gold px-3 py-2 text-sm disabled:opacity-50" disabled={!staffId || !itemId || addClosing.isPending} onClick={() => { setErr(null); addClosing.mutate() }}><Plus size={15} /></button>
          </div>

          <div className="my-5 hairline-gold" />

          {/* Assist */}
          <h3 className="text-sm font-bold">Asistensi dokter <span className="font-normal" style={{ color: 'var(--color-ink-muted)' }}>· otomatis Rp10rb (&gt;1jt) / Rp5rb</span></h3>
          <div className="mt-2 flex flex-col gap-2">
            {(data?.assists ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-cream)' }}>
                <span><b>{a.staffName}</b></span>
                <span className="flex items-center gap-2">
                  <span className="mono font-bold gold-text">{formatRp(a.bonus)}</span>
                  <button type="button" aria-label="Hapus" onClick={() => delAssist.mutate(a.id)} style={{ color: 'var(--color-rose)' }}><Trash2 size={14} /></button>
                </span>
              </div>
            ))}
            {(data?.assists ?? []).length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada asistensi.</p>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={assistStaffId} onChange={(e) => setAssistStaffId(e.target.value)} className={`${sel} min-w-0 flex-1`} style={{ borderColor: 'var(--color-line)' }} aria-label="Staf asistensi">
              <option value="">— siapa asistensi —</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" className="btn btn-gold px-3 py-2 text-sm disabled:opacity-50" disabled={!assistStaffId || addAssist.isPending} onClick={() => { setErr(null); addAssist.mutate() }}><Plus size={15} /> Tambah</button>
          </div>
        </div>
      </div>
    </div>
  )
}
