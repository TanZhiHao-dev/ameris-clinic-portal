// Shared patient detail + EMR view — used by the owner and doctor consoles.
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, HandHeart, ImagePlus, Minus, Plus, Receipt, Search, Stethoscope, X } from 'lucide-react'
import { BeforeAfter } from '../owner/BeforeAfter'
import { effectivePrice } from '#/data/clinic'
import { fmtDate, fmtDateLong, formatRp, type OwnerStatus, statusTone } from '../../data/owner'
import { createMedicalRecord, ownerPatient } from '#/server/patients'
import { ownerBeauticians } from '#/server/beauticians'
import { listTreatments } from '#/server/treatments'
import { posCreateSale } from '#/server/pos'

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-gold)]'

export function PatientDetail({ id, basePath }: { id: string; basePath: '/owner' | '/dokter' }) {
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['owner-patient', id],
    queryFn: () => ownerPatient({ data: { id } }),
  })

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ treatment: '', skin: '', notes: '' })

  const saveMut = useMutation({
    mutationFn: (v: { patientId: string; treatment: string; skin: string; notes: string }) => createMedicalRecord({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-patient', id] })
      setDraft({ treatment: '', skin: '', notes: '' })
      setAdding(false)
    },
  })

  if (!isPending && data === null) {
    return (
      <div>
        <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>
        <div className="card-soft mt-6 p-10 text-center"><p className="font-bold">Pasien tidak ditemukan</p></div>
      </div>
    )
  }

  const patient = data?.patient
  if (!patient) {
    return (
      <div>
        <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>
      </div>
    )
  }

  const history = (data?.history ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
  const records = (data?.records ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))

  const save = () => {
    if (!draft.treatment.trim() || !draft.notes.trim()) return
    saveMut.mutate({
      patientId: patient.id,
      treatment: draft.treatment.trim(),
      skin: draft.skin.trim(),
      notes: draft.notes.trim(),
    })
  }

  return (
    <div>
      <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali ke daftar pasien</Link>

      {/* Patient header */}
      <div className="card-soft mt-4 flex flex-wrap items-center gap-5 p-6">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            <span>{patient.phone}</span>
            <span>Lahir {fmtDate(patient.birthDate)}</span>
            <span>Member sejak {fmtDate(patient.joined)}</span>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Poin</div>
            <div className="mono text-2xl font-extrabold gold-text">{patient.points}</div>
          </div>
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Kunjungan</div>
            <div className="mono text-2xl font-extrabold gold-text">{patient.visits}</div>
          </div>
        </div>
      </div>

      {/* Consultation billing — doctor/owner records today's treatments as a
          bill the kasir settles later (Hadir + Pending). */}
      <ConsultBill patientId={patient.id} onCreated={() => qc.invalidateQueries({ queryKey: ['owner-patient', id] })} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* History */}
        <div>
          <h2 className="text-xl">Riwayat booking</h2>
          <div className="mt-4 flex flex-col gap-3">
            {history.map((b) => (
              <div key={b.id} className="card-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{fmtDate(b.date)} · {b.time}</span>
                  <span className="badge" style={{ background: statusTone[b.status as OwnerStatus].bg, color: statusTone[b.status as OwnerStatus].color }}>{b.status}</span>
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>{b.items.map((i) => i.name).join(', ')}</div>
                <div className="mono mt-1 text-sm font-bold gold-text">{formatRp(b.total)}</div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada riwayat.</p>}
          </div>
        </div>

        {/* EMR */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl"><Stethoscope size={20} style={{ color: 'var(--color-gold-deep)' }} /> Rekam Medis</h2>
            <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => setAdding((v) => !v)}>
              {adding ? <X size={16} /> : <Plus size={16} />} {adding ? 'Tutup' : 'Catatan baru'}
            </button>
          </div>

          {adding && (
            <div className="card-soft mt-4 flex flex-col gap-3 p-5">
              <input className={inp} placeholder="Treatment yang dilakukan" value={draft.treatment} onChange={(e) => setDraft({ ...draft, treatment: e.target.value })} />
              <input className={inp} placeholder="Kondisi kulit hari ini" value={draft.skin} onChange={(e) => setDraft({ ...draft, skin: e.target.value })} />
              <textarea className={inp} rows={3} placeholder="Catatan dokter/terapis…" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <div className="flex gap-3">
                {['Before', 'After'].map((l) => (
                  <div key={l} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed py-5 text-[0.78rem]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-muted)' }}>
                    <ImagePlus size={18} /> Foto {l} <span className="text-[0.68rem]">(opsional)</span>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary self-start" onClick={save}>Simpan catatan</button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {records.length === 0 ? (
              <div className="card-soft flex flex-col items-center p-8 text-center">
                <FileText size={24} style={{ color: 'var(--color-ink-muted)' }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada rekam medis.</p>
              </div>
            ) : (
              records.map((m) => (
                <div key={m.id} className="card-soft p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{m.treatment}</span>
                    <span className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{fmtDateLong(m.date)}</span>
                  </div>
                  {m.skin && (
                    <div className="mt-2 text-sm">
                      <span className="font-semibold" style={{ color: 'var(--color-gold-deep)' }}>Kondisi kulit: </span>
                      <span style={{ color: 'var(--color-ink-soft)' }}>{m.skin}</span>
                    </div>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>{m.notes}</p>
                  <div className="my-4 hairline-gold" />
                  <BeforeAfter record={m} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// "Tindakan hari ini" — pick treatments performed during the consultation +
// the beautician, then create a Pending bill (status Hadir) that the owner
// settles at the kasir. Deliberately does NOT take payment here.
function ConsultBill({ patientId, onCreated }: { patientId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [tq, setTq] = useState('')
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([])
  const [beauticianId, setBeauticianId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const { data: treatments = [] } = useQuery({ queryKey: ['pos-treatments'], queryFn: () => listTreatments(), enabled: open })
  const { data: beauticians = [] } = useQuery({ queryKey: ['owner-beauticians'], queryFn: () => ownerBeauticians(), enabled: open })
  const available = useMemo(
    () => treatments.filter((t) => t.available && t.name.toLowerCase().includes(tq.toLowerCase())).slice(0, 30),
    [treatments, tq],
  )
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0)

  const add = (t: { id: string; name: string; price: number; isPromo: boolean; promoPrice: number | null }) => {
    const price = effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice })
    setCart((c) => {
      const ex = c.find((l) => l.id === t.id)
      if (ex) return c.map((l) => (l.id === t.id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { id: t.id, name: t.name, price, qty: 1 }]
    })
  }
  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))))

  const create = useMutation({
    mutationFn: () =>
      posCreateSale({
        data: {
          patientId,
          items: cart.map((l) => ({ treatmentId: l.id, qty: l.qty })),
          beauticianId: beauticianId || null,
          paymentMethod: 'Offline',
          settleNow: false,
        },
      }),
    onSuccess: (r) => {
      setFlash(`Tagihan ${r.id} dibuat (${formatRp(r.total)}) — selesaikan pembayaran di kasir/Transaksi.`)
      setCart([]); setBeauticianId(''); setTq(''); setOpen(false)
      onCreated()
      setTimeout(() => setFlash(null), 6000)
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal membuat tagihan.'),
  })

  return (
    <div className="mt-6">
      {flash && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(44,88,72,0.12)', color: '#2c5848' }}>
          <CheckCircle2 size={16} /> {flash}
        </div>
      )}
      <div className="card-soft p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl"><Receipt size={20} style={{ color: 'var(--color-gold-deep)' }} /> Tindakan hari ini</h2>
          <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => { setOpen((v) => !v); setErr(null) }}>
            {open ? <X size={16} /> : <Plus size={16} />} {open ? 'Tutup' : 'Buat tagihan'}
          </button>
        </div>

        {open && (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {/* Treatment picker */}
            <div>
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
                <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
                <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Cari treatment…" className="w-full bg-transparent text-sm outline-none" />
              </div>
              <div className="mt-2 grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto">
                {available.map((t) => (
                  <button key={t.id} type="button" onClick={() => add(t)}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ border: '1px solid var(--color-line)' }}>
                    <span className="min-w-0 truncate">{t.name}</span>
                    <span className="mono shrink-0 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice }))}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart + create */}
            <div>
              {cart.length === 0 ? (
                <p className="rounded-xl px-4 py-6 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>Pilih treatment di kiri.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {cart.map((l) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-sm font-semibold">{l.name}</div>
                      <button type="button" aria-label="Kurangi" onClick={() => setQty(l.id, l.qty - 1)} className="grid h-6 w-6 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={12} /></button>
                      <span className="mono w-5 text-center text-sm font-bold">{l.qty}</span>
                      <button type="button" aria-label="Tambah" onClick={() => setQty(l.id, l.qty + 1)} className="grid h-6 w-6 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={12} /></button>
                      <span className="mono w-20 shrink-0 text-right text-sm font-semibold">{formatRp(l.price * l.qty)}</span>
                    </div>
                  ))}
                </div>
              )}

              <label className="mt-4 flex items-center gap-2 text-sm font-semibold"><HandHeart size={15} style={{ color: 'var(--color-gold-deep)' }} /> Dikerjakan</label>
              <select value={beauticianId} onChange={(e) => setBeauticianId(e.target.value)} className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--color-line)' }}>
                <option value="">— pilih beautician —</option>
                {beauticians.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <div className="mt-4 flex items-end justify-between">
                <span className="font-bold">Total</span>
                <span className="mono text-xl font-extrabold gold-text">{formatRp(total)}</span>
              </div>
              {err && (
                <p className="mt-3 flex items-start gap-2 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
                </p>
              )}
              <button type="button" className="btn btn-gold mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={cart.length === 0 || create.isPending} onClick={() => { setErr(null); create.mutate() }}>
                {create.isPending ? 'Menyimpan…' : 'Buat tagihan (bayar di kasir)'}
              </button>
              <p className="mt-2 text-center text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>
                Tersimpan sebagai tagihan Pending — pembayaran diselesaikan owner di kasir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
