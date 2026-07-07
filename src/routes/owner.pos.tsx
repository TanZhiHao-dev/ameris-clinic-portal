import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, HandHeart, Minus, Plus, Search, ShoppingBag, Ticket, UserPlus } from 'lucide-react'
import { effectivePrice, formatRp, loyaltyPointsFor } from '#/data/clinic'
import { listTreatments } from '#/server/treatments'
import { ownerBeauticians } from '#/server/beauticians'
import { ownerPatients, createPatient } from '#/server/patients'
import { posCreateSale } from '#/server/pos'

export const Route = createFileRoute('/owner/pos')({ component: PosScreen })

type CartLine = { id: string; name: string; price: number; qty: number }
type Done = { id: string; total: number; pointsAdded: number; settled: boolean }

function PosScreen() {
  const qc = useQueryClient()

  // ── Patient ──
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null)
  const [pq, setPq] = useState('')
  const [addingPatient, setAddingPatient] = useState(false)
  const [newP, setNewP] = useState({ name: '', phone: '', birth: '' })

  const { data: patients = [] } = useQuery({
    queryKey: ['owner-patients', pq],
    queryFn: () => ownerPatients({ data: { q: pq } }),
    enabled: !patient && pq.trim().length > 0,
  })

  const createP = useMutation({
    mutationFn: (v: { name: string; phone?: string; birthDate?: string }) => createPatient({ data: v }),
    onSuccess: (r) => {
      setPatient({ id: r.id, name: r.name })
      setAddingPatient(false)
      setNewP({ name: '', phone: '', birth: '' })
      qc.invalidateQueries({ queryKey: ['owner-patients'] })
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal menambah pasien.'),
  })

  // ── Treatments / cart ──
  const [tq, setTq] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const { data: treatments = [] } = useQuery({ queryKey: ['pos-treatments'], queryFn: () => listTreatments() })
  const available = useMemo(
    () => treatments.filter((t) => t.available && t.name.toLowerCase().includes(tq.toLowerCase())).slice(0, 40),
    [treatments, tq],
  )
  const addToCart = (t: { id: string; name: string; price: number; isPromo: boolean; promoPrice: number | null }) => {
    const price = effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice })
    setCart((c) => {
      const ex = c.find((l) => l.id === t.id)
      if (ex) return c.map((l) => (l.id === t.id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { id: t.id, name: t.name, price, qty: 1 }]
    })
  }
  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))))
  const total = cart.reduce((s, l) => s + l.price * l.qty, 0)

  // ── Beautician + payment ──
  const { data: beauticians = [] } = useQuery({ queryKey: ['owner-beauticians'], queryFn: () => ownerBeauticians() })
  const activeBeauticians = beauticians.filter((b) => b.isActive)
  const [beauticianId, setBeauticianId] = useState('')
  const [payMethod, setPayMethod] = useState<'Offline' | 'Transfer'>('Offline')

  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)

  const sale = useMutation({
    mutationFn: (settleNow: boolean) =>
      posCreateSale({
        data: {
          patientId: patient!.id,
          items: cart.map((l) => ({ treatmentId: l.id, qty: l.qty })),
          beauticianId: beauticianId || null,
          paymentMethod: payMethod,
          settleNow,
        },
      }),
    onSuccess: (r) => {
      setDone(r)
      // Refresh every surface a new sale touches.
      qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
      qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
      qc.invalidateQueries({ queryKey: ['owner-transaksi'] })
      qc.invalidateQueries({ queryKey: ['owner-visit-report'] })
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal membuat transaksi.'),
  })
  const submit = (settleNow: boolean) => {
    setErr(null)
    if (!patient || cart.length === 0) return
    sale.mutate(settleNow)
  }

  const reset = () => {
    setPatient(null); setPq(''); setCart([]); setTq(''); setBeauticianId(''); setPayMethod('Offline'); setDone(null); setErr(null)
  }

  // ── Success ──
  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card-soft overflow-hidden">
          <div className="px-8 py-9 text-center" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
            <CheckCircle2 size={46} className="mx-auto" style={{ color: 'var(--color-gold)' }} />
            <h1 className="mt-3 text-2xl" style={{ color: '#faf3e6' }}>{done.settled ? 'Transaksi selesai' : 'Tagihan dibuat'}</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(246,237,220,0.75)' }}>
              {done.settled ? 'Pembayaran diterima & kunjungan selesai.' : 'Tersimpan sebagai tagihan — selesaikan pembayaran di menu Transaksi.'}
            </p>
          </div>
          <div className="p-7">
            <Row label="No." value={done.id} mono />
            <Row label="Total" value={formatRp(done.total)} />
            <Row label="Status" value={done.settled ? 'Lunas · Selesai' : 'Pending · Hadir'} />
            {done.settled && <Row label="Poin diberikan" value={`+${done.pointsAdded}`} />}
            <button type="button" className="btn btn-gold mt-6 w-full" onClick={reset}>
              <ShoppingBag size={17} /> Transaksi baru
            </button>
            <Link to="/owner/transaksi" className="btn btn-ghost mt-3 w-full">Lihat di Transaksi</Link>
          </div>
        </div>
      </div>
    )
  }

  const ready = !!patient && cart.length > 0
  const busy = sale.isPending

  return (
    <div>
      <span className="eyebrow">Kasir / Walk-in</span>
      <h1 className="mt-2 text-[2rem]">POS — kunjungan langsung</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Untuk pasien yang datang tanpa booking online. Pilih pasien, tambah treatment, lalu terima pembayaran.
      </p>

      {err && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{err}</span>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: patient + treatments */}
        <div className="flex flex-col gap-6">
          {/* Step 1 — patient */}
          <div className="card-soft p-6">
            <StepHead n="1" title="Pilih pasien" />
            {patient ? (
              <div className="mt-4 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(195,154,68,0.1)', border: '1px solid var(--color-gold)' }}>
                <span className="font-bold">{patient.name}</span>
                <button type="button" className="text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }} onClick={() => setPatient(null)}>Ganti</button>
              </div>
            ) : addingPatient ? (
              <div className="mt-4 flex flex-col gap-3">
                <input className={inp} placeholder="Nama pasien" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inp} placeholder="No. WhatsApp (opsional)" inputMode="tel" value={newP.phone} onChange={(e) => setNewP({ ...newP, phone: e.target.value })} />
                  <input className={inp} type="date" value={newP.birth} onChange={(e) => setNewP({ ...newP, birth: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-gold px-4 py-2 text-sm disabled:opacity-50" disabled={createP.isPending || newP.name.trim().length < 2}
                    onClick={() => createP.mutate({ name: newP.name.trim(), phone: newP.phone.trim() || undefined, birthDate: newP.birth || undefined })}>
                    {createP.isPending ? 'Menyimpan…' : 'Simpan & pilih'}
                  </button>
                  <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={() => setAddingPatient(false)}>Batal</button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
                  <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
                  <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Cari nama / no. HP pasien…" className="w-full bg-transparent text-sm outline-none" />
                </div>
                {pq.trim() && (
                  <div className="mt-2 flex flex-col overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-line)' }}>
                    {patients.slice(0, 6).map((p) => (
                      <button key={p.id} type="button" onClick={() => { setPatient({ id: p.id, name: p.name }); setPq('') }}
                        className="flex items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ borderBottom: '1px solid var(--color-line)' }}>
                        <span className="font-semibold">{p.name}</span>
                        <span style={{ color: 'var(--color-ink-muted)' }}>{p.phone || '—'}</span>
                      </button>
                    ))}
                    {patients.length === 0 && <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada pasien cocok.</div>}
                  </div>
                )}
                <button type="button" className="btn btn-ghost mt-3 px-4 py-2 text-sm" onClick={() => setAddingPatient(true)}>
                  <UserPlus size={15} /> Pasien baru (walk-in)
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — treatments */}
          <div className="card-soft p-6">
            <StepHead n="2" title="Tambah treatment" />
            <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
              <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
              <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Cari treatment…" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-3 grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {available.map((t) => (
                <button key={t.id} type="button" onClick={() => addToCart(t)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ border: '1px solid var(--color-line)' }}>
                  <span className="min-w-0 truncate">{t.name}</span>
                  <span className="mono shrink-0 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice }))}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: cart + payment */}
        <aside className="card-soft p-6 lg:sticky lg:top-6">
          <h2 className="text-lg">Ringkasan</h2>
          {cart.length === 0 ? (
            <p className="mt-4 rounded-xl px-4 py-6 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
              Belum ada treatment dipilih.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {cart.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.name}</div>
                    <div className="mono text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{formatRp(l.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" aria-label="Kurangi" onClick={() => setQty(l.id, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={13} /></button>
                    <span className="mono w-6 text-center text-sm font-bold">{l.qty}</span>
                    <button type="button" aria-label="Tambah" onClick={() => setQty(l.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={13} /></button>
                  </div>
                  <span className="mono w-20 shrink-0 text-right text-sm font-semibold">{formatRp(l.price * l.qty)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="my-4 hairline-gold" />

          {/* Beautician */}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <HandHeart size={15} style={{ color: 'var(--color-gold-deep)' }} /> Dikerjakan
          </label>
          <select value={beauticianId} onChange={(e) => setBeauticianId(e.target.value)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--color-line)' }}>
            <option value="">— pilih beautician —</option>
            {activeBeauticians.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Payment */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(['Offline', 'Transfer'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPayMethod(m)}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition"
                style={payMethod === m ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)', color: 'var(--color-ink)' } : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
                {m === 'Offline' ? <><Banknote size={15} /> Tunai</> : <><Ticket size={15} /> QRIS / Transfer</>}
              </button>
            ))}
          </div>

          <div className="my-4 hairline-gold" />
          <div className="flex items-end justify-between">
            <span className="font-bold">Total</span>
            <span className="mono text-2xl font-extrabold gold-text">{formatRp(total)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
            <span>Estimasi poin</span>
            <span className="mono font-semibold" style={{ color: 'var(--color-gold-deep)' }}>+{loyaltyPointsFor(total)}</span>
          </div>

          <button type="button" className="btn btn-gold mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || busy} onClick={() => submit(true)}>
            {busy ? 'Memproses…' : 'Bayar & selesai'} {!busy && <ArrowRight size={18} />}
          </button>
          <button type="button" className="btn btn-ghost mt-2 w-full text-sm disabled:opacity-50" disabled={!ready || busy} onClick={() => submit(false)}>
            Simpan sebagai tagihan (bayar nanti)
          </button>
        </aside>
      </div>
    </div>
  )
}

const inp = 'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'

function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>{n}</span>
      <h2 className="text-lg">{title}</h2>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span className={`font-bold ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}
