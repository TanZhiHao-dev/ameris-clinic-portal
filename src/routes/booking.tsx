import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
} from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { useCart, type CartItem } from '../lib/cart'
import { clinic, formatRp, loyaltyPointsFor, treatments } from '../data/clinic'
import { createBooking } from '../server/bookings'
import { useMidtransPay, type PayOutcome } from '../lib/useMidtransPay'
import { getVisual } from '../components/landing/TreatmentThumb'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/booking')({ component: BookingPage })

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const WD: DictKey[] = ['wd.mon', 'wd.tue', 'wd.wed', 'wd.thu', 'wd.fri', 'wd.sat', 'wd.sun']
const MAX_WEEK = 4

const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const slotFull = (iso: string, idx: number) => {
  let h = 0
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h + idx * 5) % 7 === 0
}
const prettyDate = (iso: string, loc: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })
const monthLabel = (iso: string, loc: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(loc, { month: 'long', year: 'numeric' })

type Confirmation = {
  id: string
  items: CartItem[]
  total: number
  date: string
  time: string
  payment: 'online' | 'klinik' | 'transfer'
  payOutcome: PayOutcome | null // null hanya untuk "Bayar di klinik" (tanpa gateway)
}

function BookingPage() {
  const { items, subtotal, clear, hydrated } = useCart()
  const qc = useQueryClient()
  const { pay, dialog, busy } = useMidtransPay()
  // Aliased to `tr` — a treatment is named `t` in the summary map below.
  const { t: tr, lang } = useI18n()
  const loc = lang === 'en' ? 'en-US' : 'id-ID'

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
  const payNow =
    payment === 'klinik' ? 0 : payment === 'transfer' ? subtotal : plan === 'dp' ? Math.round(subtotal / 2) : subtotal

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
    })
    // Online & Transfer Bank both open Midtrans Snap (or the sandbox dialog) and
    // settle automatically via the webhook. Only "Bayar di klinik" skips the gateway.
    const outcome = payment === 'klinik' ? null : await pay(res.id)
    setDone({ id: res.id, items: [...items], total: subtotal, date, time, payment, payOutcome: outcome })
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
    // Online & Transfer Bank both settle through Midtrans Snap.
    const gateway = done.payment !== 'klinik'
    const methodLabel = done.payment === 'transfer' ? tr('bk.s.methodTransfer') : tr('bk.s.methodOnline')
    const paid = done.payOutcome === 'success'
    const pendingPay = done.payOutcome === 'pending'
    const head = paid
      ? { title: tr('bk.s.paidTitle'), sub: tr('bk.s.paidSub', { location: clinic.location }) }
      : pendingPay
        ? { title: tr('bk.s.pendingTitle'), sub: tr('bk.s.pendingSub') }
        : gateway
          ? { title: tr('bk.s.createdTitle'), sub: tr('bk.s.createdSub') }
          : { title: tr('bk.s.successTitle'), sub: tr('bk.s.paidSub', { location: clinic.location }) }
    const payValue = !gateway
      ? tr('bk.s.payAtClinic')
      : paid
        ? `${methodLabel} · ${tr('bk.s.statusPaid')}`
        : pendingPay
          ? `${methodLabel} · ${tr('bk.s.statusPending')}`
          : `${methodLabel} · ${tr('bk.s.statusUnpaid')}`
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
                  <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{tr('bk.s.bookingNo')}</span>
                  <span className="mono font-bold">{done.id}</span>
                </div>
                <div className="my-4 hairline-gold" />
                <dl className="flex flex-col gap-3 text-sm">
                  <Row label={tr('bk.date')} value={prettyDate(done.date, loc)} />
                  <Row label={tr('bk.time')} value={`${done.time} WIB`} />
                  <Row label={tr('bk.s.payment')} value={payValue} />
                </dl>
                <div className="my-4 hairline-gold" />
                {done.items.map((i) => (
                  <div key={i.id} className="flex justify-between py-1 text-sm">
                    <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}</span>
                    <span className="mono">{formatRp(i.price * i.qty)}</span>
                  </div>
                ))}
                <div className="my-4 hairline-gold" />
                <div className="flex items-end justify-between">
                  <span className="font-bold">{tr('bk.total')}</span>
                  <span className="mono text-2xl font-extrabold gold-text">{formatRp(done.total)}</span>
                </div>
                {gateway && !paid && (
                  <button type="button" onClick={retryPay} disabled={busy} className="btn btn-gold mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60">
                    <CreditCard size={17} /> {busy ? tr('bk.processing') : pendingPay ? tr('bk.s.retryPending') : tr('bk.payNow')}
                  </button>
                )}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Link to="/akun/booking" className="btn btn-primary flex-1">{tr('bk.s.viewInAccount')}</Link>
                  <Link to="/treatment" className="btn btn-ghost flex-1">{tr('bk.s.bookAgain')}</Link>
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
              <p className="mt-5 text-xl font-bold">{tr('bk.emptyTitle')}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {tr('bk.emptyBody')}
              </p>
              <Link to="/treatment" className="btn btn-gold mt-6">{tr('bk.emptyCta')} <ArrowRight size={18} /></Link>
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
          <span className="eyebrow">{tr('bk.eyebrow')}</span>
          <h1 className="mt-2 text-[2.2rem] sm:text-[2.8rem]">{tr('bk.title')}</h1>
          <p className="mt-2 text-[1rem]" style={{ color: 'var(--color-ink-soft)' }}>
            {tr('bk.subtitle')}
          </p>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
            {/* ── Form ── */}
            <div className="flex flex-col gap-6">
              {/* Step 1 — Schedule */}
              <div className="card-soft p-6 sm:p-7">
                <StepHead n="1" title={tr('bk.step1')} icon={<CalendarCheck size={17} />} />

                {/* Week calendar */}
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold">{days[0] ? monthLabel(days[0].iso, loc) : '—'}</span>
                    <div className="flex gap-1.5">
                      <button type="button" aria-label={tr('bk.prevWeek')} disabled={week === 0}
                        onClick={() => setWeek((w) => Math.max(0, w - 1))}
                        className="grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30"
                        style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}>
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" aria-label={tr('bk.nextWeek')} disabled={week >= MAX_WEEK - 1}
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
                        {tr(d)}
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
                  <span className="text-sm font-bold">{tr('bk.chooseTime')}</span>
                  {date && <span className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{prettyDate(date, loc)}</span>}
                </div>
                {!date ? (
                  <p className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
                    {tr('bk.pickDateFirst')}
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
                <StepHead n="2" title={tr('bk.step2')} icon={<CreditCard size={17} />} />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <PayOption active={payment === 'transfer'} onClick={() => setPayment('transfer')} icon={<Landmark size={20} />} title={tr('pay.transfer.title')} sub={tr('pay.transfer.sub')} />
                  <PayOption active={payment === 'online'} onClick={() => setPayment('online')} icon={<CreditCard size={20} />} title={tr('pay.online.title')} sub={tr('pay.online.sub')} />
                  <PayOption active={payment === 'klinik'} onClick={() => setPayment('klinik')} icon={<MapPin size={20} />} title={tr('pay.klinik.title')} sub={tr('pay.klinik.sub')} />
                </div>
                {payment === 'online' && (
                  <div className="mt-3 flex gap-2">
                    {([['full', tr('bk.payFull')], ['dp', tr('bk.payDp')]] as const).map(([k, label]) => (
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
              <h2 className="text-lg">{tr('bk.summary')}</h2>
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
                  <dt style={{ color: 'var(--color-ink-muted)' }}>{tr('bk.date')}</dt>
                  <dd className="font-semibold">{date ? prettyDate(date, loc) : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>{tr('bk.time')}</dt>
                  <dd className="font-semibold">{time ? `${time} WIB` : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-ink-muted)' }}>{tr('bk.estPoints')}</dt>
                  <dd className="mono font-semibold" style={{ color: 'var(--color-gold-deep)' }}>+{loyaltyPointsFor(subtotal)}</dd>
                </div>
              </dl>

              <div className="my-4 hairline-gold" />
              <div className="flex items-end justify-between">
                <span className="font-bold">{tr('bk.total')}</span>
                <span className="mono text-2xl font-extrabold gold-text">{formatRp(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
                <span>{tr('bk.payNow')}</span>
                <span className="mono font-semibold">{payNow === 0 ? tr('bk.atClinic') : formatRp(payNow)}</span>
              </div>

              <button type="button" className="btn btn-gold mt-5 hidden w-full lg:inline-flex disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
                {submitting ? tr('bk.processing') : tr('bk.confirm')} {!submitting && <ArrowRight size={18} />}
              </button>
              <div className="mt-3 hidden items-center justify-center gap-1.5 text-[0.76rem] lg:flex" style={{ color: 'var(--color-ink-muted)' }}>
                <ShieldCheck size={13} /> {tr('bk.secure')}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Sticky confirm bar (narrow screens) */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ background: 'rgba(253,250,244,0.95)', borderTop: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}>
        <div className="shell-x flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{tr('bk.total')}</div>
            <div className="mono text-lg font-extrabold gold-text">{formatRp(subtotal)}</div>
          </div>
          <button type="button" className="btn btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || submitting} onClick={confirm}>
            {submitting ? tr('bk.processing') : ready ? tr('bk.confirmShort') : tr('bk.pickDateTime')} {ready && !submitting && <ArrowRight size={18} />}
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
