import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, CreditCard, MapPin, MessageCircle } from 'lucide-react'
import { formatDateId, statusTone, type BookingStatus } from '../data/account'
import { clinic, formatRp } from '../data/clinic'
import { getMyBooking } from '../server/bookings'
import { useMidtransPay } from '../lib/useMidtransPay'
import { BankTransferInstructions } from '../components/app/BankTransferInstructions'

export const Route = createFileRoute('/akun/booking/$id')({ component: TicketPage })

// Deterministic faux-QR (no external lib, SSR-safe via Math.sin hash).
function FauxQR({ value, size = 150 }: { value: string; size?: number }) {
  const N = 21
  const cell = size / N
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
  const rng = (i: number) => {
    const x = Math.sin((i + 1) * ((h % 97) + 3)) * 10000
    return x - Math.floor(x)
  }
  const finder = (r: number, c: number) => {
    const box = (r0: number, c0: number) => {
      const rr = r - r0
      const cc = c - c0
      if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return null
      const border = rr === 0 || rr === 6 || cc === 0 || cc === 6
      const center = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
      return border || center
    }
    return box(0, 0) ?? box(0, N - 7) ?? box(N - 7, 0)
  }
  const rects = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = finder(r, c)
      const on = f === null ? rng(r * N + c) > 0.55 : f
      if (on) rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#211c17" />)
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Kode booking ${value}`}>
      {rects}
    </svg>
  )
}

function TicketPage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const { pay, dialog, busy } = useMidtransPay()
  const { data: appt = null, isPending } = useQuery({
    queryKey: ['my-booking', id],
    queryFn: () => getMyBooking({ data: { id } }),
  })

  const handlePay = async () => {
    await pay(id)
    qc.invalidateQueries({ queryKey: ['my-booking', id] })
    qc.invalidateQueries({ queryKey: ['my-bookings'] })
  }

  if (isPending) return null

  if (!appt) {
    return (
      <div>
        <Link to="/akun/booking" className="nav-link inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> Kembali ke booking
        </Link>
        <div className="card-soft mt-6 p-10 text-center">
          <p className="text-lg font-bold">Bukti janji temu tidak ditemukan</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Booking dengan nomor {id} tidak tersedia.
          </p>
        </div>
      </div>
    )
  }

  const onlinePending = appt.payment === 'Online' && appt.payStatus === 'Pending'
  const dpPaid = onlinePending && appt.paidAt != null
  const needsPay = onlinePending && !appt.paidAt && appt.status !== 'Batal'
  const transferPending = appt.payment === 'Transfer Bank' && appt.payStatus === 'Pending' && appt.status !== 'Batal'

  return (
    <div>
      {dialog}
      <Link to="/akun/booking" className="nav-link inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft size={16} /> Kembali ke booking
      </Link>

      <h1 className="mt-4 text-[2rem]">Bukti janji temu</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Tunjukkan kode ini saat tiba di klinik.
      </p>

      <div className="mx-auto mt-6 max-w-xl">
        <div className="card-soft overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
            <span className="script gold-text text-3xl leading-none">Ameris</span>
            <span className="badge" style={{ background: statusTone[appt.status as BookingStatus].bg, color: statusTone[appt.status as BookingStatus].color }}>
              {appt.status}
            </span>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center px-7 pt-7">
            <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--color-line)' }}>
              <FauxQR value={appt.id} />
            </div>
            <div className="mono mt-3 text-lg font-extrabold tracking-wider">{appt.id}</div>
          </div>

          {/* Details */}
          <div className="px-7 pb-7 pt-5">
            <div className="my-2 hairline-gold" />
            <dl className="flex flex-col gap-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="inline-flex items-center gap-2" style={{ color: 'var(--color-ink-muted)' }}>
                  <CalendarPlus size={15} /> Tanggal
                </dt>
                <dd className="font-semibold">{formatDateId(appt.date)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="inline-flex items-center gap-2" style={{ color: 'var(--color-ink-muted)' }}>
                  <Clock size={15} /> Jam
                </dt>
                <dd className="font-semibold">{appt.time} WIB</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="inline-flex items-center gap-2" style={{ color: 'var(--color-ink-muted)' }}>
                  <MapPin size={15} /> Lokasi
                </dt>
                <dd className="font-semibold">{clinic.name}, {clinic.location}</dd>
              </div>
            </dl>

            <div className="my-2 hairline-gold" />
            <div className="py-2">
              {appt.items.map((it) => (
                <div key={it.name} className="flex justify-between py-1 text-sm">
                  <span className="pr-2">{it.name}</span>
                  <span className="mono shrink-0">{formatRp(it.price)}</span>
                </div>
              ))}
              {appt.discount > 0 && (
                <div className="flex justify-between py-1 text-sm" style={{ color: 'var(--color-gold-deep)' }}>
                  <span className="pr-2">Voucher diskon</span>
                  <span className="mono shrink-0">−{formatRp(appt.discount)}</span>
                </div>
              )}
            </div>

            <div className="my-2 hairline-gold" />
            <div className="flex items-end justify-between py-2">
              <div>
                <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                  Pembayaran {appt.payment === 'Online' ? 'online' : 'di klinik'}
                </div>
                <div className="font-bold">Total</div>
              </div>
              <span className="mono text-2xl font-extrabold gold-text">{formatRp(appt.total)}</span>
            </div>

            {needsPay && (
              <button type="button" onClick={handlePay} disabled={busy} className="btn btn-gold mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60">
                <CreditCard size={17} /> {busy ? 'Memproses…' : appt.paymentPlan === 'dp' ? 'Bayar DP sekarang' : 'Bayar sekarang'}
              </button>
            )}
            {dpPaid && (
              <div className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(154,115,32,0.12)', color: 'var(--color-gold-deep)' }}>
                <CheckCircle2 size={15} /> DP terbayar online · sisa dilunasi di klinik
              </div>
            )}
            {transferPending && (
              <div className="mt-5">
                <BankTransferInstructions amount={appt.total} bookingId={appt.id} />
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn btn-primary flex-1">
                <CalendarPlus size={17} /> Tambah ke kalender
              </button>
              <a href={`https://wa.me/${clinic.whatsappRaw}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex-1">
                <MessageCircle size={17} /> Hubungi klinik
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
