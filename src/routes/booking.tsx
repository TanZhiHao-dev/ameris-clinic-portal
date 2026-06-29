import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Ticket,
} from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { BankTransferInstructions } from '../components/app/BankTransferInstructions'
import { useCart, type CartItem } from '../lib/cart'
import { clinic, formatRp, loyaltyPointsFor, treatments } from '../data/clinic'
import { createBooking } from '../server/bookings'
import { previewBestVoucher } from '../server/vouchers'
import { useMidtransPay, type PayOutcome } from '../lib/useMidtransPay'
import { getVisual } from '../components/landing/TreatmentThumb'

export const Route = createFileRoute('/booking')({ component: BookingPage })

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const WD = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_WEEK = 4

const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const slotFull = (iso: string, idx: number) => {
  let h = 0
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h + idx * 5) % 7 === 0
}
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
}

function BookingPage() {
  const { items, subtotal, clear, hydrated } = useCart()
  const qc = useQueryClient()
  const { pay, dialog, busy } = useMidtransPay()

  const [today, setToday] = useState('')
  const [monday, setMonday] = useState<Date | null>(null)
  const [week, setWeek] = useState(0)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [payment, setPayment] = useState<'online' | 'klinik' | 'transfer'>('transfer')
  const [plan, setPlan] = useState<'full' | 'dp'>('full')
  const [done, setDone] = useState<Confirmation | null>(null)

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

  const ready = date && time && items.length > 0

  // Auto-detect the best voucher for the current cart + signed-in user. Returns
  // null when none applies or the user isn't signed in (query error is ignored).
  const itemsKey = items.map((i) => `${i.id}:${i.qty}`).join(',')
  const { data: preview } = useQuery({
    queryKey: ['best-voucher', itemsKey],
    queryFn: () => previewBestVoucher({ data: { items: items.map((i) => ({ treatmentId: i.id, qty: i.qty })) } }),
    enabled: hydrated && items.length > 0,
    retry: false,
  })
  const voucher = preview?.voucher ?? null
  const discount = preview?.discount ?? 0
  // Prefer authoritative server numbers; fall back to the cart estimate while loading.
  const displaySubtotal = preview?.subtotal ?? subtotal
  const discountedTotal = preview?.total ?? Math.max(0, subtotal - discount)

  const payNow =
    payment === 'klinik' ? 0 : payment === 'transfer' ? discountedTotal : plan === 'dp' ? Math.round(discountedTotal / 2) : discountedTotal

  const createMut = useMutation({
    mutationFn: (v: Parameters<typeof createBooking>[0]['data']) =>
      createBooking({ data: v }),
  })
  const submitting = createMut.isPending || busy

  const confirm = async () => {
    if (!ready) return
    const res = await createMut.mutateAsync({
      items: items.map((i) => ({ treatmentId: i.id, qty: i.qty })),
      bookingDate: date,
      bookingTime: time,
      paymentMethod: payment === 'online' ? 'Online' : payment === 'transfer' ? 'Transfer' : 'Offline',
      paymentPlan: payment === 'online' ? plan : 'full',
      voucherId: voucher?.id,
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
                  <Row label="Tanggal" value={prettyDate(done.date)} />
                  <Row label="Jam" value={`${done.time} WIB`} />
                  <Row label="Pembayaran" value={payValue} />
                </dl>
                <div className="my-4 hairline-gold" />
                {done.items.map((i) => (
                  <div key={i.id} className="flex justify-between py-1 text-sm">
                    <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}</span>
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
          <span className="eyebrow">Booking</span>
          <h1 className="mt-2 text-[2.2rem] sm:text-[2.8rem]">Atur jadwal kunjunganmu</h1>
          <p className="mt-2 text-[1rem]" style={{ color: 'var(--color-ink-soft)' }}>
            Pilih tanggal &amp; jam, lalu metode pembayaran. Hanya butuh satu menit.
          </p>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
            {/* ── Form ── */}
            <div className="flex flex-col gap-6">
              {/* Step 1 — Schedule */}
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
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {SLOTS.map((s, si) => {
                      const full = slotFull(date, si)
                      const active = time === s
                      return (
                        <button key={s} type="button" disabled={full} onClick={() => setTime(s)}
                          className="rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                          style={
                            active
                              ? { background: 'var(--grad-gold)', color: '#3a2c0f' }
                              : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink)' }
                          }>
                          {full ? '—' : s}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Step 2 — Payment */}
              <div className="card-soft p-6 sm:p-7">
                <StepHead n="2" title="Metode pembayaran" icon={<CreditCard size={17} />} />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <PayOption active={payment === 'transfer'} onClick={() => setPayment('transfer')} icon={<Landmark size={20} />} title="Transfer Bank" sub="BCA / QRIS" />
                  <PayOption active={payment === 'online'} onClick={() => setPayment('online')} icon={<CreditCard size={20} />} title="Bayar online" sub="Kartu / e-wallet" />
                  <PayOption active={payment === 'klinik'} onClick={() => setPayment('klinik')} icon={<MapPin size={20} />} title="Bayar di klinik" sub="Saat datang" />
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
                        {i.qty > 1 && <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>×{i.qty}</div>}
                      </div>
                      <span className="mono shrink-0 text-sm font-semibold">{formatRp(i.price * i.qty)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="my-4 hairline-gold" />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>Tanggal</dt>
                  <dd className="font-semibold">{date ? prettyDate(date) : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>Jam</dt>
                  <dd className="font-semibold">{time ? `${time} WIB` : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>Estimasi poin</dt>
                  <dd className="mono font-semibold" style={{ color: 'var(--color-gold-deep)' }}>+{loyaltyPointsFor(discountedTotal)}</dd>
                </div>
              </dl>

              {voucher && discount > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(195,154,68,0.1)', border: '1px solid var(--color-gold)' }}>
                  <Ticket size={16} style={{ color: 'var(--color-gold-deep)' }} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 text-[0.8rem]">
                    <div className="font-semibold" style={{ color: 'var(--color-gold-deep)' }}>Voucher diterapkan</div>
                    <div style={{ color: 'var(--color-ink-muted)' }}>{voucher.name} · hemat {formatRp(discount)}</div>
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

              <button type="button" className="btn btn-gold mt-5 hidden w-full lg:inline-flex disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
                {submitting ? 'Memproses…' : 'Konfirmasi booking'} {!submitting && <ArrowRight size={18} />}
              </button>
              <div className="mt-3 hidden items-center justify-center gap-1.5 text-[0.76rem] lg:flex" style={{ color: 'var(--color-ink-muted)' }}>
                <ShieldCheck size={13} /> Pembayaran aman · bisa dijadwalkan ulang
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Sticky confirm bar (narrow screens) */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ background: 'rgba(253,250,244,0.95)', borderTop: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}>
        <div className="shell-x flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Total</div>
            <div className="mono text-lg font-extrabold gold-text">{formatRp(discountedTotal)}</div>
            {discount > 0 && <div className="text-[0.66rem]" style={{ color: 'var(--color-gold-deep)' }}>Voucher −{formatRp(discount)}</div>}
          </div>
          <button type="button" className="btn btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
            {submitting ? 'Memproses…' : ready ? 'Konfirmasi' : 'Pilih tanggal & jam'} {ready && !submitting && <ArrowRight size={18} />}
          </button>
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
