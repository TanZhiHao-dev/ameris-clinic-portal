import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BadgePercent, Banknote, CheckCircle2, HandHeart, Minus, Package, Plus, Search, ShoppingBag, Sparkles, Ticket, UserPlus } from 'lucide-react'
import { effectivePrice, formatRp, loyaltyPointsFor } from '#/data/clinic'
import { authClient } from '#/lib/auth-client'
import { listTreatments } from '#/server/treatments'
import { posCatalog, posCreatePatient, posCreateSale, posPatientVouchers, posPatients } from '#/server/pos'

// price = catalog unit (promo-aware). disc = manual discount the staff grants
// during a walk-in (doctor's special price / patient nego); discMode picks
// whether disc is a rupiah amount or a percent off the unit. `kind` decides
// whether the line is billed as a treatment or a skincare product (which also
// draws down stock on sale).
type CartLine = { id: string; kind: 'treatment' | 'skincare'; name: string; price: number; qty: number; disc: number; discMode: 'rp' | 'pct' }
type Done = { id: string; total: number; subtotal: number; voucherDiscount: number; pointsAdded: number; settled: boolean }

// The register — shared by the owner console (/owner/pos) and the admin console
// (/admin/pos). The admin is input-only: they can ring a sale up but it always
// lands as an unpaid tagihan for the owner to confirm (enforced server-side in
// posCreateSale too, not just here).
export function PosScreen() {
  const { data: session } = authClient.useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const qc = useQueryClient()

  // ── Patient ──
  const [patient, setPatient] = useState<{ id: string; name: string } | null>(null)
  const [pq, setPq] = useState('')
  const [addingPatient, setAddingPatient] = useState(false)
  const [newP, setNewP] = useState({ name: '', phone: '', birth: '' })

  const { data: patients = [] } = useQuery({
    queryKey: ['owner-patients', pq],
    queryFn: () => posPatients({ data: { q: pq } }),
    enabled: !patient && pq.trim().length > 0,
  })

  const createP = useMutation({
    mutationFn: (v: { name: string; phone?: string; birthDate?: string }) => posCreatePatient({ data: v }),
    onSuccess: (r) => {
      setPatient({ id: r.id, name: r.name })
      setAddingPatient(false)
      setNewP({ name: '', phone: '', birth: '' })
      qc.invalidateQueries({ queryKey: ['owner-patients'] })
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal menambah pasien.'),
  })

  // ── Catalog / cart ── (treatments AND skincare — the register sells both)
  const [pickKind, setPickKind] = useState<'treatment' | 'skincare'>('treatment')
  const [tq, setTq] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const { data: treatments = [] } = useQuery({ queryKey: ['pos-treatments'], queryFn: () => listTreatments() })
  const { data: catalog } = useQuery({ queryKey: ['pos-catalog'], queryFn: () => posCatalog() })
  const skincare = catalog?.products ?? []
  const available = useMemo(
    () => treatments.filter((t) => t.available && t.name.toLowerCase().includes(tq.toLowerCase())).slice(0, 40),
    [treatments, tq],
  )
  const availableSkincare = useMemo(
    () => skincare.filter((p) => p.name.toLowerCase().includes(tq.toLowerCase())).slice(0, 40),
    [skincare, tq],
  )
  // Lines are identified by kind+id so a treatment and a product can never
  // collide on a shared id.
  const keyOf = (kind: CartLine['kind'], id: string) => `${kind}:${id}`
  const addLine = (kind: CartLine['kind'], id: string, name: string, price: number) =>
    setCart((c) => {
      const ex = c.find((l) => l.kind === kind && l.id === id)
      if (ex) return c.map((l) => (l.kind === kind && l.id === id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { id, kind, name, price, qty: 1, disc: 0, discMode: 'rp' }]
    })
  const addToCart = (t: { id: string; name: string; price: number; isPromo: boolean; promoPrice: number | null }) =>
    addLine('treatment', t.id, t.name, effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice }))
  const addSkincare = (p: { id: string; name: string; price: number }) => addLine('skincare', p.id, p.name, p.price)

  const patchLine = (key: string, fn: (l: CartLine) => CartLine) =>
    setCart((c) => c.map((l) => (keyOf(l.kind, l.id) === key ? fn(l) : l)))
  const setQty = (key: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => keyOf(l.kind, l.id) !== key) : c.map((l) => (keyOf(l.kind, l.id) === key ? { ...l, qty } : l))))
  // Clamp the discount to its mode (0..100 for %, 0..unit price for Rp) so a
  // line can never go negative or above 100%.
  const setDisc = (key: string, raw: number) =>
    patchLine(key, (l) => ({ ...l, disc: Math.min(Math.max(0, Math.round(raw) || 0), l.discMode === 'pct' ? 100 : l.price) }))
  const setDiscMode = (key: string, mode: 'rp' | 'pct') => patchLine(key, (l) => ({ ...l, discMode: mode, disc: 0 }))
  // Effective unit price after the manual discount.
  const effUnit = (l: CartLine) => {
    const d = l.discMode === 'pct' ? Math.round((l.price * l.disc) / 100) : l.disc
    return Math.max(0, l.price - Math.max(0, d))
  }
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0)
  const total = cart.reduce((s, l) => s + effUnit(l) * l.qty, 0)
  const totalDiscount = subtotal - total

  // ── Patient's vouchers (registered accounts only) ──
  // Server prices every usable voucher against the CURRENT cart, so the kasir
  // sees the real saving. Applying one at submit writes the redemption to the
  // patient's account — the same ledger online checkout uses.
  const [voucherId, setVoucherId] = useState<string | null>(null)
  // Vouchers only ever apply to treatment lines, so only those are priced here.
  const itemsPayload = useMemo(
    () => cart.filter((l) => l.kind === 'treatment').map((l) => ({ treatmentId: l.id, qty: l.qty, discountMode: l.discMode, discountValue: l.disc })),
    [cart],
  )
  const productItemsPayload = useMemo(
    () => cart.filter((l) => l.kind === 'skincare').map((l) => ({ productId: l.id, qty: l.qty, discountMode: l.discMode, discountValue: l.disc })),
    [cart],
  )
  const { data: vouchers = [], isPending: vouchersPending } = useQuery({
    queryKey: ['pos-vouchers', patient?.id, JSON.stringify(itemsPayload)],
    queryFn: () => posPatientVouchers({ data: { patientId: patient!.id, items: itemsPayload } }),
    enabled: !!patient,
  })
  const chosenVoucher = vouchers.find((v) => v.id === voucherId) ?? null
  const voucherDiscount = chosenVoucher?.discount ?? 0
  // Deselect automatically when the chosen voucher stops applying (cart edited
  // below its minimum, items changed out of scope, patient switched, …).
  useEffect(() => {
    if (voucherId && !vouchers.some((v) => v.id === voucherId && v.discount > 0)) setVoucherId(null)
  }, [vouchers, voucherId])
  const grandTotal = Math.max(0, total - voucherDiscount)

  // ── Performer (doctor OR beautician) + payment ──
  const doctors = catalog?.doctors ?? []
  const activeBeauticians = catalog?.beauticians ?? []
  // Encoded performer: '' = none/asistensi only, 'doc:<id>' = doctor-led,
  // 'bt:<id>' = beautician/terapis. Kept as one value so the picker is a single
  // dropdown but maps to the two separate booking columns on submit.
  const [performer, setPerformer] = useState('')
  const [payMethod, setPayMethod] = useState<'Offline' | 'Transfer'>('Offline')

  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)

  const sale = useMutation({
    mutationFn: (settleNow: boolean) =>
      posCreateSale({
        data: {
          patientId: patient!.id,
          items: itemsPayload,
          productItems: productItemsPayload,
          beauticianId: performer.startsWith('bt:') ? performer.slice(3) : null,
          doctorId: performer.startsWith('doc:') ? performer.slice(4) : null,
          paymentMethod: payMethod,
          settleNow,
          voucherId: voucherId ?? undefined,
        },
      }),
    onSuccess: (r) => {
      setDone(r)
      // Refresh every surface a new sale touches.
      qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
      qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
      qc.invalidateQueries({ queryKey: ['owner-transaksi'] })
      qc.invalidateQueries({ queryKey: ['owner-visit-report'] })
      qc.invalidateQueries({ queryKey: ['pos-vouchers'] })
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal membuat transaksi.'),
  })
  const submit = (settleNow: boolean) => {
    setErr(null)
    if (!patient || cart.length === 0) return
    sale.mutate(settleNow)
  }

  const reset = () => {
    setPatient(null); setPq(''); setCart([]); setTq(''); setPerformer(''); setPayMethod('Offline'); setDone(null); setErr(null); setVoucherId(null)
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
              {done.settled
                ? 'Pembayaran diterima & kunjungan selesai.'
                : isAdmin
                  ? 'Tersimpan sebagai tagihan — owner yang mengonfirmasi pembayarannya.'
                  : 'Tersimpan sebagai tagihan — selesaikan pembayaran di menu Transaksi.'}
            </p>
          </div>
          <div className="p-7">
            <Row label="No." value={done.id} mono />
            {done.voucherDiscount > 0 && <Row label="Subtotal" value={formatRp(done.subtotal)} />}
            {done.voucherDiscount > 0 && <Row label="Diskon voucher" value={`−${formatRp(done.voucherDiscount)}`} />}
            <Row label="Total" value={formatRp(done.total)} />
            <Row label="Status" value={done.settled ? 'Lunas · Selesai' : 'Pending · Hadir'} />
            {done.settled && <Row label="Poin diberikan" value={`+${done.pointsAdded}`} />}
            <button type="button" className="btn btn-gold mt-6 w-full" onClick={reset}>
              <ShoppingBag size={17} /> Transaksi baru
            </button>
            {!isAdmin && <Link to="/owner/transaksi" className="btn btn-ghost mt-3 w-full">Lihat di Transaksi</Link>}
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
                <button type="button" className="text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }} onClick={() => { setPatient(null); setVoucherId(null) }}>Ganti</button>
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
                      <button key={p.id} type="button" onClick={() => { setPatient({ id: p.id, name: p.name }); setPq(''); setVoucherId(null) }}
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

          {/* Step 2 — treatments + skincare (the register sells both) */}
          <div className="card-soft p-6">
            <StepHead n="2" title="Tambah treatment / skincare" />
            <div className="mt-4 flex gap-2">
              {(['treatment', 'skincare'] as const).map((k) => (
                <button key={k} type="button" onClick={() => { setPickKind(k); setTq('') }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition"
                  style={pickKind === k ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
                  {k === 'treatment' ? <><Sparkles size={14} /> Treatment</> : <><Package size={14} /> Skincare</>}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
              <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
              <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder={pickKind === 'treatment' ? 'Cari treatment…' : 'Cari skincare…'} className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-3 grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {pickKind === 'treatment'
                ? available.map((t) => (
                    <button key={t.id} type="button" onClick={() => addToCart(t)}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ border: '1px solid var(--color-line)' }}>
                      <span className="min-w-0 truncate">{t.name}</span>
                      <span className="mono shrink-0 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice }))}</span>
                    </button>
                  ))
                : availableSkincare.map((p) => {
                    const out = p.stock === 0
                    return (
                      <button key={p.id} type="button" disabled={out} onClick={() => addSkincare(p)}
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50" style={{ border: '1px solid var(--color-line)' }}>
                        <span className="min-w-0 truncate">
                          {p.name}
                          {p.stock != null && <span className="ml-1.5 text-[0.7rem]" style={{ color: out ? 'var(--color-destructive)' : 'var(--color-ink-muted)' }}>{out ? 'habis' : `sisa ${p.stock}`}</span>}
                        </span>
                        <span className="mono shrink-0 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(p.price)}</span>
                      </button>
                    )
                  })}
              {pickKind === 'skincare' && availableSkincare.length === 0 && (
                <p className="px-3 py-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada skincare cocok.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: cart + payment */}
        <aside className="card-soft p-6 lg:sticky lg:top-6">
          <h2 className="text-lg">Ringkasan</h2>
          {cart.length === 0 ? (
            <p className="mt-4 rounded-xl px-4 py-6 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
              Belum ada treatment / skincare dipilih.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3.5">
              {cart.map((l) => {
                const eff = effUnit(l)
                const discounted = eff < l.price
                const key = keyOf(l.kind, l.id)
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{l.name}</span>
                          {l.kind === 'skincare' && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}>SKINCARE</span>}
                        </div>
                        <div className="mono text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>
                          {discounted ? (
                            <><span className="line-through">{formatRp(l.price)}</span> <span className="font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(eff)}</span></>
                          ) : (
                            formatRp(l.price)
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label="Kurangi" onClick={() => setQty(key, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={13} /></button>
                        <span className="mono w-6 text-center text-sm font-bold">{l.qty}</span>
                        <button type="button" aria-label="Tambah" onClick={() => setQty(key, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={13} /></button>
                      </div>
                      <span className="mono w-20 shrink-0 text-right text-sm font-semibold">{formatRp(eff * l.qty)}</span>
                    </div>
                    {/* Manual discount — nominal (Rp) or percent (%) off the unit */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>Diskon</span>
                      <input
                        type="number" min={0} max={l.discMode === 'pct' ? 100 : l.price} inputMode="numeric"
                        value={l.disc || ''} onChange={(e) => setDisc(key, Number(e.target.value))}
                        placeholder="0" aria-label={`Diskon ${l.name}`}
                        className="w-16 rounded-md border bg-white px-2 py-1 text-right text-[0.78rem] outline-none focus:border-[var(--color-gold)]"
                        style={{ borderColor: 'var(--color-line)' }}
                      />
                      <div className="flex overflow-hidden rounded-md" style={{ border: '1px solid var(--color-line)' }}>
                        {(['rp', 'pct'] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setDiscMode(key, m)} aria-pressed={l.discMode === m}
                            className="px-2 py-1 text-[0.72rem] font-semibold transition"
                            style={l.discMode === m ? { background: 'var(--color-gold)', color: '#3a2c0f' } : { color: 'var(--color-ink-muted)' }}>
                            {m === 'rp' ? 'Rp' : '%'}
                          </button>
                        ))}
                      </div>
                      {discounted && <span className="mono ml-auto text-[0.7rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>−{formatRp((l.price - eff) * l.qty)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Patient's vouchers — only registered accounts have these. The header
              stays visible even with zero vouchers so the kasir can tell "this
              patient has none" apart from "the panel didn't load". */}
          {patient && !vouchersPending && (
            <>
              <div className="my-4 hairline-gold" />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <BadgePercent size={15} style={{ color: 'var(--color-gold-deep)' }} /> Voucher pasien
              </label>
              {vouchers.length === 0 && (
                <p className="mt-1.5 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>
                  Tidak ada voucher aktif untuk pasien ini.
                </p>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                {vouchers.map((v) => {
                  const selected = v.id === voucherId
                  const usableNow = v.discount > 0
                  const valueLabel = v.discountType === 'pct' ? `${v.discountValue}%` : formatRp(v.discountValue)
                  return (
                    <button
                      key={v.id} type="button" aria-pressed={selected} disabled={!usableNow}
                      onClick={() => setVoucherId(selected ? null : v.id)}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed"
                      style={selected
                        ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)' }
                        : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', opacity: usableNow ? 1 : 0.6 }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{v.name}</span>
                        <span className="block text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>
                          {valueLabel}
                          {v.minSpend > 0 ? ` · min. ${formatRp(v.minSpend)}` : ''}
                          {v.validUntil ? ` · s/d ${v.validUntil}` : ''}
                        </span>
                      </span>
                      <span className="mono shrink-0 text-[0.8rem] font-bold" style={{ color: usableNow ? 'var(--color-gold-deep)' : 'var(--color-ink-muted)' }}>
                        {usableNow
                          ? `−${formatRp(v.discount)}`
                          : cart.length === 0
                            ? '—'
                            : v.blockedByMinSpend
                              ? `kurang ${formatRp(v.neededForMin)}`
                              : 'tidak berlaku'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {vouchers.length > 0 && (
                <p className="mt-1.5 text-[0.7rem] leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
                  Voucher milik akun pasien — kalau dipakai di sini, otomatis tercatat terpakai di akunnya.
                </p>
              )}
            </>
          )}

          <div className="my-4 hairline-gold" />

          {/* Performer — doctor OR beautician/terapis */}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <HandHeart size={15} style={{ color: 'var(--color-gold-deep)' }} /> Dikerjakan
          </label>
          <select value={performer} onChange={(e) => setPerformer(e.target.value)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--color-line)' }}>
            <option value="">— tidak ada / hanya asistensi —</option>
            {doctors.length > 0 && (
              <optgroup label="Dokter">
                {doctors.map((d) => <option key={d.id} value={`doc:${d.id}`}>{d.name ?? 'Dokter'}</option>)}
              </optgroup>
            )}
            {activeBeauticians.length > 0 && (
              <optgroup label="Beautician / Terapis">
                {activeBeauticians.map((b) => <option key={b.id} value={`bt:${b.id}`}>{b.name}</option>)}
              </optgroup>
            )}
          </select>
          <p className="mt-1.5 text-[0.72rem] leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
            Treatment tanpa facial dikerjakan dokter — pilih dokter atau kosongkan. Beautician/perawat yang membantu cukup dicatat sebagai asistensi di Jadwal.
          </p>

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
          {(totalDiscount > 0 || voucherDiscount > 0) && (
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              <span>Subtotal</span>
              <span className="mono">{formatRp(subtotal)}</span>
            </div>
          )}
          {totalDiscount > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
              <span>Diskon manual</span>
              <span className="mono">−{formatRp(totalDiscount)}</span>
            </div>
          )}
          {voucherDiscount > 0 && chosenVoucher && (
            <div className="mt-1 flex items-center justify-between gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
              <span className="min-w-0 truncate">Voucher — {chosenVoucher.name}</span>
              <span className="mono shrink-0">−{formatRp(voucherDiscount)}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-end justify-between">
            <span className="font-bold">Total</span>
            <span className="mono text-2xl font-extrabold gold-text">{formatRp(grandTotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
            <span>Estimasi poin</span>
            <span className="mono font-semibold" style={{ color: 'var(--color-gold-deep)' }}>+{loyaltyPointsFor(grandTotal)}</span>
          </div>

          {isAdmin ? (
            // Input-only: the admin records the sale, the owner confirms payment.
            <>
              <button type="button" className="btn btn-gold mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || busy} onClick={() => submit(false)}>
                {busy ? 'Memproses…' : 'Simpan tagihan'} {!busy && <ArrowRight size={18} />}
              </button>
              <p className="mt-2 text-center text-[0.72rem] leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
                Tersimpan sebagai <b>tagihan</b> — pembayaran dikonfirmasi owner di menu Transaksi.
              </p>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-gold mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || busy} onClick={() => submit(true)}>
                {busy ? 'Memproses…' : 'Bayar & selesai'} {!busy && <ArrowRight size={18} />}
              </button>
              <button type="button" className="btn btn-ghost mt-2 w-full text-sm disabled:opacity-50" disabled={!ready || busy} onClick={() => submit(false)}>
                Simpan sebagai tagihan (bayar nanti)
              </button>
            </>
          )}
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
