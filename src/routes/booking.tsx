import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  LogIn,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Ticket,
} from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { BankTransferInstructions } from '../components/app/BankTransferInstructions'
import { useCart, type CartItem } from '../lib/cart'
import { useSession } from '../lib/auth-client'
import { gaItems, track } from '../lib/analytics'
import { clinic, formatRp, loyaltyPointsFor, treatments } from '../data/clinic'
import { createBooking, slotAvailability } from '../server/bookings'
import { createProductOrder } from '../server/products'
import { previewBestVoucher } from '../server/vouchers'
import { useMidtransPay, type PayOutcome } from '../lib/useMidtransPay'
import { getVisual } from '../components/landing/TreatmentThumb'

export const Route = createFileRoute('/booking')({ component: BookingPage })

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const WD = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_WEEK = 4

const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const prettyDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
const monthLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

type Confirmation = {
  id: string
  items: CartItem[]
  total: number // authoritative total from the server (net of any voucher)
  discount: number
  voucherName: string | null
  date: string
  time: string
  payment: 'online' | 'klinik' | 'transfer'
  payOutcome: PayOutcome | null // null = transfer bank / bayar di klinik (tidak ada gateway)
  pickup?: boolean // skincare-only order — no slot, picked up at the clinic
}

function BookingPage() {
  const { items, subtotal, clear, hydrated } = useCart()
  // Split the unified cart: treatments need a slot; skincare rides along (or, on
  // its own, becomes a pickup order with no slot at all).
  const treatItems = useMemo(() => items.filter((i) => i.kind !== 'skincare'), [items])
  const skinItems = useMemo(() => items.filter((i) => i.kind === 'skincare'), [items])
  const skincareOnly = items.length > 0 && treatItems.length === 0
  const qc = useQueryClient()
  const { pay, dialog, busy } = useMidtransPay()
  // createBooking() requires a signed-in user; gate the confirm CTA client-side
  // so guests get a clear "masuk dulu" path instead of a silent server 401.
  const { data: session, isPending: sessionPending } = useSession()
  const guest = !sessionPending && !session

  const [today, setToday] = useState('')
  const [monday, setMonday] = useState<Date | null>(null)
  const [week, setWeek] = useState(0)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [payment, setPayment] = useState<'online' | 'klinik' | 'transfer'>('transfer')
  const [plan, setPlan] = useState<'full' | 'dp'>('full')
  const [done, setDone] = useState<Confirmation | null>(null)
  const [errMsg, setErrMsg] = useState('')
  // Patient's chosen treatment for a 'one_treatment' voucher (null = server picks best).
  const [voucherTarget, setVoucherTarget] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    setToday(localIso(now))
    const dow = (now.getDay() + 6) % 7 // 0 = Monday
    const mon = new Date(now)
    mon.setDate(now.getDate() - dow)
    mon.setHours(0, 0, 0, 0)
    setMonday(mon)
  }, [])

  const days = useMemo(() => {
    if (!monday) return []
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + week * 7 + i)
      const iso = localIso(d)
      return { iso, num: d.getDate(), past: iso < today }
    })
  }, [monday, week, today])

  // Real availability for the selected date (replaces the old fake hash-based
  // "full" markers). Short staleTime + refetch-on-focus keeps it honest while
  // the patient hesitates; the server still re-checks at submit for races.
  const slotsQ = useQuery({
    queryKey: ['slot-availability', date],
    queryFn: () => slotAvailability({ data: { date } }),
    enabled: !!date,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
  const takenSet = useMemo(
    () => new Set((slotsQ.data?.slots ?? []).filter((s) => !s.available).map((s) => s.time)),
    [slotsQ.data],
  )
  const allFull = !!slotsQ.data && slotsQ.data.slots.every((s) => !s.available)
  // A refetch can reveal that the picked time was just taken — unpick it.
  useEffect(() => {
    if (time && takenSet.has(time)) setTime('')
  }, [takenSet, time])

  // Skincare-only orders are pickup — no slot needed; treatment carts still need date+time.
  const ready = items.length > 0 && (skincareOnly || Boolean(date && time))
  // The online gateway needs a treatment booking — skincare pickup uses transfer/klinik.
  useEffect(() => { if (skincareOnly && payment === 'online') setPayment('transfer') }, [skincareOnly, payment])

  // Funnel events — one hit per visit, not per re-render.
  const trackedCheckout = useRef(false)
  useEffect(() => {
    if (trackedCheckout.current || !hydrated || items.length === 0) return
    trackedCheckout.current = true
    track('begin_checkout', { currency: 'IDR', value: subtotal, items: gaItems(items) })
  }, [hydrated, items, subtotal])
  const trackedGate = useRef(false)
  useEffect(() => {
    if (trackedGate.current || !guest || !hydrated || items.length === 0) return
    trackedGate.current = true
    track('login_gate_shown', { page: 'booking' })
  }, [guest, hydrated, items.length])

  // Auto-detect the best voucher for the current cart + signed-in user. Returns
  // null when none applies or the user isn't signed in (query error is ignored).
  const itemsKey = items.map((i) => `${i.id}:${i.qty}`).join(',')
  // Cart changes → let the server re-pick the best target.
  useEffect(() => { setVoucherTarget(null) }, [itemsKey])
  const { data: preview } = useQuery({
    queryKey: ['best-voucher', itemsKey, voucherTarget],
    queryFn: () =>
      previewBestVoucher({
        data: { items: treatItems.map((i) => ({ treatmentId: i.id, qty: i.qty })), targetTreatmentId: voucherTarget ?? undefined },
      }),
    enabled: hydrated && treatItems.length > 0,
    retry: false,
  })
  const voucher = preview?.voucher ?? null
  const nudge = preview?.nudge ?? null
  const discount = preview?.discount ?? 0
  const targets = preview?.targets ?? []
  const appliedTarget = preview?.targetTreatmentId ?? null
  // Prefer authoritative server numbers; fall back to the cart estimate while
  // loading. The voucher only touches treatments — skincare is added on top.
  const skincareSubtotal = skinItems.reduce((s, i) => s + i.price * i.qty, 0)
  const treatSubtotal = preview?.subtotal ?? treatItems.reduce((s, i) => s + i.price * i.qty, 0)
  const displaySubtotal = treatSubtotal + skincareSubtotal
  const discountedTotal = (preview?.total ?? Math.max(0, treatSubtotal - discount)) + skincareSubtotal

  const payNow =
    payment === 'klinik' ? 0 : payment === 'transfer' ? discountedTotal : plan === 'dp' ? Math.round(discountedTotal / 2) : discountedTotal
  // A fully free cart (e.g. the Konsultasi Dokter slot) skips the payment step —
  // there's nothing to charge; it's just confirmed and handled at the clinic.
  const isFree = !skincareOnly && items.length > 0 && discountedTotal === 0
  useEffect(() => { if (isFree && payment !== 'klinik') setPayment('klinik') }, [isFree, payment])

  const createMut = useMutation({
    mutationFn: (v: Parameters<typeof createBooking>[0]['data']) =>
      createBooking({ data: v }),
  })
  const productOrderMut = useMutation({
    mutationFn: (v: Parameters<typeof createProductOrder>[0]['data']) => createProductOrder({ data: v }),
  })
  const submitting = createMut.isPending || productOrderMut.isPending || busy

  const confirm = async () => {
    if (!ready || submitting) return
    setErrMsg('')

    // Skincare-only → a pickup order: no slot, no voucher, no payment gateway.
    if (skincareOnly) {
      let pres
      try {
        pres = await productOrderMut.mutateAsync({
          items: skinItems.map((i) => ({ productId: i.id, qty: i.qty })),
          paymentMethod: payment === 'transfer' ? 'Transfer' : 'Offline',
        })
      } catch (e) {
        const msg = (e as Error)?.message ?? ''
        setErrMsg(msg.includes('masuk') ? 'Sesi kamu sudah berakhir. Silakan masuk lagi — keranjangmu tetap tersimpan.' : msg || 'Terjadi kesalahan. Coba lagi ya.')
        return
      }
      track('purchase', { transaction_id: pres.id, currency: 'IDR', value: pres.total, payment_method: payment, items: gaItems(items) })
      setDone({ id: pres.id, items: [...items], total: pres.total, discount: 0, voucherName: null, date: '', time: '', payment: payment === 'transfer' ? 'transfer' : 'klinik', payOutcome: null, pickup: true })
      clear()
      qc.invalidateQueries()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    let res
    try {
      res = await createMut.mutateAsync({
        items: treatItems.map((i) => ({ treatmentId: i.id, qty: i.qty })),
        productItems: skinItems.length ? skinItems.map((i) => ({ productId: i.id, qty: i.qty })) : undefined,
        bookingDate: date,
        bookingTime: time,
        paymentMethod: payment === 'online' ? 'Online' : payment === 'transfer' ? 'Transfer' : 'Offline',
        paymentPlan: payment === 'online' ? plan : 'full',
        voucherId: voucher?.id,
        voucherTargetTreatmentId:
          voucher?.applyScope === 'one_treatment' ? appliedTarget ?? undefined : undefined,
      })
    } catch (e) {
      const msg = (e as Error)?.message ?? ''
      if (msg.includes('Slot sudah terisi')) {
        // Race: someone grabbed the slot between render and submit. Refresh the
        // grid and make the patient re-pick — their date & cart stay intact.
        track('slot_taken_error', { date, time })
        setTime('')
        qc.invalidateQueries({ queryKey: ['slot-availability', date] })
        setErrMsg('Jam ini baru saja terisi oleh pasien lain. Pilih jam lain ya — tanggal & keranjangmu tidak berubah.')
      } else if (msg.includes('masuk')) {
        setErrMsg('Sesi kamu sudah berakhir. Silakan masuk lagi untuk menyelesaikan booking — keranjangmu tetap tersimpan.')
      } else {
        setErrMsg(msg || 'Terjadi kesalahan saat membuat booking. Coba lagi ya.')
      }
      return
    }
    track('purchase', {
      transaction_id: res.id,
      currency: 'IDR',
      value: res.total,
      payment_method: payment,
      items: gaItems(items),
    })
    // Online → open Midtrans Snap (or the sandbox dialog). Transfer Bank shows
    // manual instructions; Offline pays at the clinic — neither hits a gateway.
    const outcome = payment === 'online' ? await pay(res.id) : null
    setDone({ id: res.id, items: [...items], total: res.total, discount: res.discount, voucherName: res.discount > 0 ? voucher?.name ?? null : null, date, time, payment, payOutcome: outcome })
    clear()
    qc.invalidateQueries() // refresh my-bookings / upcoming after checkout
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Resume payment from the confirmation screen (closed/pending/error).
  const retryPay = async () => {
    if (!done) return
    const outcome = await pay(done.id)
    setDone({ ...done, payOutcome: outcome })
    qc.invalidateQueries()
  }

  // ── Success ──
  if (done) {
    const online = done.payment === 'online'
    const transfer = done.payment === 'transfer'
    const paid = done.payOutcome === 'success'
    const pendingPay = done.payOutcome === 'pending'
    const head = transfer
      ? { title: 'Booking dibuat ✦', sub: 'Selesaikan transfer agar booking-mu dikonfirmasi.' }
      : paid
        ? { title: 'Pembayaran berhasil!', sub: `Bukti janji temu sudah terbit. Sampai jumpa di ${clinic.location} ✦` }
        : pendingPay
          ? { title: 'Menunggu pembayaran', sub: 'Selesaikan pembayaran agar booking-mu dikonfirmasi.' }
          : online
            ? { title: 'Booking dibuat ✦', sub: 'Pembayaran belum selesai — bisa dilanjutkan kapan saja.' }
            : { title: 'Booking berhasil!', sub: `Bukti janji temu sudah terbit. Sampai jumpa di ${clinic.location} ✦` }
    const payValue = transfer
      ? 'Transfer Bank · Menunggu'
      : !online
        ? 'Bayar di klinik'
        : paid
          ? 'Online · Lunas'
          : pendingPay
            ? 'Online · Menunggu'
            : 'Online · Belum dibayar'
    return (
      <PageShell>
        {dialog}
        <section className="py-16" style={{ background: 'var(--color-cream)', minHeight: '70vh' }}>
          <div className="shell-x max-w-2xl">
            <div className="card-soft overflow-hidden">
              <div className="px-8 py-10 text-center" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
                {paid || done.payment === 'klinik' ? (
                  <CheckCircle2 size={48} className="mx-auto" style={{ color: 'var(--color-gold)' }} />
                ) : (
                  <CreditCard size={48} className="mx-auto" style={{ color: 'var(--color-gold)' }} />
                )}
                <h1 className="mt-4 text-3xl" style={{ color: '#faf3e6' }}>{head.title}</h1>
                <p className="mt-2 text-sm" style={{ color: 'rgba(246,237,220,0.75)' }}>{head.sub}</p>
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No. Booking</span>
                  <span className="mono font-bold">{done.id}</span>
                </div>
                <div className="my-4 hairline-gold" />
                <dl className="flex flex-col gap-3 text-sm">
                  {done.pickup ? (
                    <Row label="Pengambilan" value="Ambil di klinik" />
                  ) : (
                    <>
                      <Row label="Tanggal" value={prettyDate(done.date)} />
                      <Row label="Jam" value={`${done.time} WIB`} />
                    </>
                  )}
                  <Row label="Pembayaran" value={payValue} />
                </dl>
                <div className="my-4 hairline-gold" />
                {done.items.map((i) => (
                  <div key={i.id} className="flex justify-between py-1 text-sm">
                    <span>{i.name}{i.pricePerUnit ? ` · ${i.qty} unit` : i.qty > 1 ? ` ×${i.qty}` : ''}</span>
                    <span className="mono">{formatRp(i.price * i.qty)}</span>
                  </div>
                ))}
                {done.discount > 0 && (
                  <div className="flex justify-between py-1 text-sm" style={{ color: 'var(--color-gold-deep)' }}>
                    <span>Voucher{done.voucherName ? ` · ${done.voucherName}` : ''}</span>
                    <span className="mono">−{formatRp(done.discount)}</span>
                  </div>
                )}
                <div className="my-4 hairline-gold" />
                <div className="flex items-end justify-between">
                  <span className="font-bold">Total</span>
                  <span className="mono text-2xl font-extrabold gold-text">{formatRp(done.total)}</span>
                </div>
                {online && !paid && (
                  <button type="button" onClick={retryPay} disabled={busy} className="btn btn-gold mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60">
                    <CreditCard size={17} /> {busy ? 'Memproses…' : pendingPay ? 'Cek / lanjutkan pembayaran' : 'Bayar sekarang'}
                  </button>
                )}
                {transfer && (
                  <div className="mt-6">
                    <BankTransferInstructions amount={done.total} bookingId={done.id} />
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Link to="/akun/booking" className="btn btn-primary flex-1">Lihat di akun saya</Link>
                  <Link to="/treatment" className="btn btn-ghost flex-1">Booking lagi</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
    )
  }

  // ── Empty cart ──
  if (hydrated && items.length === 0) {
    return (
      <PageShell>
        <section className="py-16" style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
          <div className="shell-x">
            <div className="card-soft mx-auto flex max-w-lg flex-col items-center p-14 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--color-muted)' }}>
                <ShoppingBag size={26} style={{ color: 'var(--color-gold-deep)' }} />
              </div>
              <p className="mt-5 text-xl font-bold">Belum ada treatment dipilih</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Pilih treatment dulu sebelum mengatur jadwal booking.
              </p>
              <Link to="/treatment" className="btn btn-gold mt-6">Lihat menu treatment <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {dialog}
      <section className="py-10 pb-28 sm:py-14 lg:pb-14" style={{ background: 'var(--color-cream)' }}>
        <div className="shell-x">
          <span className="eyebrow">{skincareOnly ? 'Pesanan skincare' : 'Booking'}</span>
          <h1 className="mt-2 text-[2.2rem] sm:text-[2.8rem]">{skincareOnly ? 'Konfirmasi pesanan' : 'Atur jadwal kunjunganmu'}</h1>
          <p className="mt-2 text-[1rem]" style={{ color: 'var(--color-ink-soft)' }}>
            {skincareOnly ? 'Produk skincare diambil di klinik — cukup pilih metode pembayaran.' : 'Pilih tanggal & jam, lalu metode pembayaran. Hanya butuh satu menit.'}
          </p>

          {guest && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'rgba(195,154,68,0.1)', border: '1px solid var(--color-gold)' }}>
              <div className="flex items-start gap-2.5">
                <LogIn size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--color-gold-deep)' }} />
                <div className="text-sm">
                  <div className="font-bold">Masuk dulu untuk menyelesaikan booking</div>
                  <div style={{ color: 'var(--color-ink-muted)' }}>
                    Kamu tetap bisa memilih jadwal sekarang — keranjang &amp; pilihanmu aman, dan setelah masuk kamu langsung kembali ke halaman ini.
                  </div>
                </div>
              </div>
              <Link to="/masuk" search={{ redirect: '/booking' }} className="btn btn-primary shrink-0">
                Masuk / daftar <ArrowRight size={16} />
              </Link>
            </div>
          )}

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
            {/* ── Form ── */}
            <div className="flex flex-col gap-6">
              {/* Step 1 — Schedule (treatments need a slot; skincare-only = pickup) */}
              {!skincareOnly ? (
              <div className="card-soft p-6 sm:p-7">
                <StepHead n="1" title="Pilih tanggal & jam" icon={<CalendarCheck size={17} />} />

                {/* Week calendar */}
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold">{days[0] ? monthLabel(days[0].iso) : '—'}</span>
                    <div className="flex gap-1.5">
                      <button type="button" aria-label="Minggu sebelumnya" disabled={week === 0}
                        onClick={() => setWeek((w) => Math.max(0, w - 1))}
                        className="grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30"
                        style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}>
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" aria-label="Minggu berikutnya" disabled={week >= MAX_WEEK - 1}
                        onClick={() => setWeek((w) => Math.min(MAX_WEEK - 1, w + 1))}
                        className="grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30"
                        style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {WD.map((d) => (
                      <div key={d} className="pb-1 text-center text-[0.66rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>
                        {d}
                      </div>
                    ))}
                    {days.map((d) => {
                      const active = date === d.iso
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          disabled={d.past}
                          onClick={() => { setDate(d.iso); setTime('') }}
                          className="grid aspect-square place-items-center rounded-xl text-sm font-bold transition disabled:cursor-not-allowed"
                          style={
                            active
                              ? { background: 'var(--color-ink)', color: 'var(--color-cream)' }
                              : d.past
                                ? { color: 'var(--color-line)' }
                                : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink)' }
                          }
                        >
                          {d.num}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="my-6 hairline-gold" />

                {/* Time slots */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Pilih jam</span>
                  {date && <span className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{prettyDate(date)}</span>}
                </div>
                {!date ? (
                  <p className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
                    Pilih tanggal dulu untuk melihat slot yang tersedia.
                  </p>
                ) : slotsQ.isPending ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
                    {SLOTS.map((s) => (
                      <div key={s} className="animate-pulse rounded-xl py-2.5 text-sm" style={{ background: 'var(--color-muted)' }}>
                        &nbsp;
                      </div>
                    ))}
                  </div>
                ) : slotsQ.isError ? (
                  <p className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
                    Gagal memuat ketersediaan slot.{' '}
                    <button type="button" className="font-bold underline" onClick={() => slotsQ.refetch()}>Coba lagi</button>
                  </p>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {SLOTS.map((s) => {
                        const full = takenSet.has(s)
                        const active = time === s
                        return (
                          <button key={s} type="button" disabled={full} onClick={() => setTime(s)}
                            aria-label={full ? `${s} sudah penuh` : `Pilih jam ${s}`}
                            className="rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                            style={
                              active
                                ? { background: 'var(--grad-gold)', color: '#3a2c0f' }
                                : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink)' }
                            }>
                            <span className={full ? 'line-through' : ''}>{s}</span>
                          </button>
                        )
                      })}
                    </div>
                    {allFull && (
                      <p className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
                        Semua slot di tanggal ini sudah penuh — coba pilih tanggal lain ya.
                      </p>
                    )}
                  </>
                )}
              </div>
              ) : (
                <div className="card-soft p-6 sm:p-7">
                  <StepHead n="1" title="Ambil di klinik" icon={<ShoppingBag size={17} />} />
                  <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
                    🛍️ Pesanan skincare <b>tanpa perlu pilih jadwal</b> — cukup selesaikan pembayaran, lalu ambil produkmu di {clinic.location}.
                  </p>
                </div>
              )}

              {/* Step 2 — Payment (hidden when the booking is fully free) */}
              {!isFree ? (
              <div className="card-soft p-6 sm:p-7">
                <StepHead n="2" title="Metode pembayaran" icon={<CreditCard size={17} />} />
                <div className={`mt-5 grid gap-3 ${skincareOnly ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                  <PayOption active={payment === 'transfer'} onClick={() => setPayment('transfer')} icon={<Landmark size={20} />} title="Transfer Bank" sub="BCA / QRIS" />
                  {!skincareOnly && <PayOption active={payment === 'online'} onClick={() => setPayment('online')} icon={<CreditCard size={20} />} title="Bayar online" sub="Kartu / e-wallet" />}
                  <PayOption active={payment === 'klinik'} onClick={() => setPayment('klinik')} icon={<MapPin size={20} />} title="Bayar di klinik" sub={skincareOnly ? 'Saat ambil' : 'Saat datang'} />
                </div>
                {payment === 'online' && (
                  <div className="mt-3 flex gap-2">
                    {([['full', 'Bayar penuh'], ['dp', 'DP 50%']] as const).map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setPlan(k)}
                        className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
                        style={plan === k ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)', color: 'var(--color-ink)' } : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              ) : (
                <div className="card-soft p-6 sm:p-7">
                  <StepHead n="2" title="Konsultasi gratis" icon={<CheckCircle2 size={17} />} />
                  <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(44,88,72,0.1)', color: '#2c5848' }}>
                    ✓ Tidak ada biaya — cukup konfirmasi jadwal. Konsultasi &amp; rekomendasi treatment dilakukan langsung oleh dokter saat kamu datang.
                  </p>
                </div>
              )}
            </div>

            {/* ── Summary ── */}
            <aside className="card-soft p-6 lg:sticky lg:top-28">
              <h2 className="text-lg">Ringkasan booking</h2>
              <div className="mt-4 flex flex-col gap-3">
                {items.map((i) => {
                  const t = treatments.find((x) => x.id === i.id)
                  const v = t ? getVisual(t) : null
                  const Icon = v?.Icon
                  return (
                    <div key={i.id} className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: v ? `linear-gradient(135deg, ${v.from}, ${v.to})` : 'var(--color-muted)' }}>
                        {Icon && <Icon size={16} strokeWidth={1.6} style={{ color: 'rgba(58,44,15,0.72)' }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{i.name}</div>
                        {i.pricePerUnit ? (
                          <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{i.qty} unit</div>
                        ) : i.qty > 1 ? (
                          <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>×{i.qty}</div>
                        ) : null}
                      </div>
                      <span className="mono shrink-0 text-sm font-semibold">{formatRp(i.price * i.qty)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="my-4 hairline-gold" />
              <dl className="flex flex-col gap-2 text-sm">
                {skincareOnly ? (
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--color-ink-muted)' }}>Pengambilan</dt>
                    <dd className="font-semibold">Ambil di klinik</dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--color-ink-muted)' }}>Tanggal</dt>
                      <dd className="font-semibold">{date ? prettyDate(date) : '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--color-ink-muted)' }}>Jam</dt>
                      <dd className="font-semibold">{time ? `${time} WIB` : '—'}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>Estimasi poin</dt>
                  <dd className="mono font-semibold" style={{ color: 'var(--color-gold-deep)' }}>+{loyaltyPointsFor(discountedTotal)}</dd>
                </div>
              </dl>

              {voucher && discount > 0 && (
                <div className="mt-4 rounded-xl px-3 py-2.5" style={{ background: 'rgba(195,154,68,0.1)', border: '1px solid var(--color-gold)' }}>
                  <div className="flex items-start gap-2">
                    <Ticket size={16} style={{ color: 'var(--color-gold-deep)' }} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 text-[0.8rem]">
                      <div className="font-semibold" style={{ color: 'var(--color-gold-deep)' }}>Voucher diterapkan</div>
                      <div style={{ color: 'var(--color-ink-muted)' }}>
                        {voucher.name} · hemat {formatRp(discount)}
                        {voucher.minSpend > 0 && ` · min. ${formatRp(voucher.minSpend)}`}
                      </div>
                    </div>
                  </div>

                  {/* 'one_treatment' voucher → let the patient pick which treatment it lands on */}
                  {voucher.applyScope === 'one_treatment' && targets.length > 0 && (
                    <div className="mt-2.5">
                      <div className="text-[0.72rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
                        {targets.length > 1 ? 'Pilih treatment untuk diskon:' : 'Diterapkan ke:'}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {targets.map((t) => {
                          const active = t.treatmentId === appliedTarget
                          return (
                            <button
                              key={t.treatmentId}
                              type="button"
                              onClick={() => setVoucherTarget(t.treatmentId)}
                              disabled={targets.length <= 1}
                              className="rounded-full px-2.5 py-1 text-[0.74rem] font-semibold transition disabled:cursor-default"
                              style={active ? { background: 'var(--grad-gold)', color: '#3a2c0f' } : { background: 'var(--color-shell)', color: 'var(--color-ink)', border: '1px solid var(--color-line)' }}
                            >
                              {t.name} <span className="opacity-70">−{formatRp(t.discount)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!voucher && nudge && (
                <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-muted)', border: '1px dashed var(--color-line)' }}>
                  <Ticket size={16} style={{ color: 'var(--color-ink-muted)' }} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 text-[0.8rem]">
                    <div className="font-semibold">{nudge.name}</div>
                    <div style={{ color: 'var(--color-ink-muted)' }}>
                      Tambah {formatRp(nudge.needed)} lagi untuk diskon{' '}
                      {nudge.discountType === 'pct' ? `${nudge.discountValue}%` : formatRp(nudge.discountValue)} (min. {formatRp(nudge.minSpend)})
                    </div>
                  </div>
                </div>
              )}

              <div className="my-4 hairline-gold" />
              {discount > 0 && (
                <div className="mb-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between" style={{ color: 'var(--color-ink-muted)' }}>
                    <span>Subtotal</span>
                    <span className="mono">{formatRp(displaySubtotal)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--color-gold-deep)' }}>
                    <span>Diskon voucher</span>
                    <span className="mono">−{formatRp(discount)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-end justify-between">
                <span className="font-bold">Total</span>
                <span className="mono text-2xl font-extrabold gold-text">{formatRp(discountedTotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
                <span>Bayar sekarang</span>
                <span className="mono font-semibold">{payNow === 0 ? 'di klinik' : formatRp(payNow)}</span>
              </div>

              {errMsg && (
                <p className="mt-4 hidden items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium lg:flex" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{errMsg}</span>
                </p>
              )}
              {guest ? (
                <Link to="/masuk" search={{ redirect: '/booking' }} className="btn btn-gold mt-5 hidden w-full lg:inline-flex">
                  <LogIn size={17} /> Masuk untuk konfirmasi
                </Link>
              ) : (
                <button type="button" className="btn btn-gold mt-5 hidden w-full lg:inline-flex disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
                  {submitting ? 'Memproses…' : 'Konfirmasi booking'} {!submitting && <ArrowRight size={18} />}
                </button>
              )}
              <div className="mt-3 hidden items-center justify-center gap-1.5 text-[0.76rem] lg:flex" style={{ color: 'var(--color-ink-muted)' }}>
                <ShieldCheck size={13} /> Pembayaran aman · bisa dijadwalkan ulang
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Sticky confirm bar (narrow screens) */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ background: 'rgba(253,250,244,0.95)', borderTop: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}>
        {errMsg && (
          <div className="shell-x pt-2.5">
            <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-[0.8rem] font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{errMsg}</span>
            </p>
          </div>
        )}
        <div className="shell-x flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Total</div>
            <div className="mono text-lg font-extrabold gold-text">{formatRp(discountedTotal)}</div>
            {discount > 0 && <div className="text-[0.66rem]" style={{ color: 'var(--color-gold-deep)' }}>Voucher −{formatRp(discount)}</div>}
          </div>
          {guest ? (
            <Link to="/masuk" search={{ redirect: '/booking' }} className="btn btn-gold flex-1">
              <LogIn size={16} /> Masuk untuk konfirmasi
            </Link>
          ) : (
            <button type="button" className="btn btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
              {submitting ? 'Memproses…' : ready ? 'Konfirmasi' : 'Pilih tanggal & jam'} {ready && !submitting && <ArrowRight size={18} />}
            </button>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function StepHead({ n, title, icon }: { n: string; title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>{n}</span>
      <h2 className="flex items-center gap-2 text-lg">{icon} {title}</h2>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: 'var(--color-ink-muted)' }}>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

function PayOption({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-3 rounded-2xl p-4 text-left transition"
      style={{ background: active ? 'rgba(195,154,68,0.1)' : 'var(--color-shell)', border: active ? '1.5px solid var(--color-gold)' : '1px solid var(--color-line)' }}>
      <span style={{ color: 'var(--color-gold-deep)' }}>{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{sub}</span>
      </span>
    </button>
  )
}
