import { clinic, formatRp } from '../../data/clinic'

export type ReceiptData = {
  id: string
  patientName: string
  patientPhone: string
  date: string
  time: string
  items: { name: string; price: number; qty: number }[]
  subtotal: number
  discount: number
  total: number
  payment: string
  payStatus: string
  paymentPlan: string
  paidAt: string | null
}

const dtFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const dFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// A printable kwitansi (proof of payment). Designed to print legibly without
// relying on background-color fills (browsers strip those by default) — uses
// borders + colored text/borders that survive print.
export function Receipt({ data }: { data: ReceiptData }) {
  const paidAtLabel = data.paidAt ? dtFmt.format(new Date(data.paidAt)) : null
  const apptLabel = `${dFmt.format(new Date(data.date + 'T00:00:00+07:00'))} · ${data.time} WIB`

  return (
    <div
      className="receipt mx-auto max-w-md overflow-hidden rounded-2xl bg-white"
      style={{ border: '1px solid var(--color-line)', color: 'var(--color-ink)' }}
    >
      {/* Header */}
      <div className="px-7 pt-7 text-center">
        <div className="text-xl font-extrabold tracking-tight">{clinic.name}</div>
        <div className="mt-0.5 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{clinic.by}</div>
        <div className="mt-2 text-[0.72rem] leading-snug" style={{ color: 'var(--color-ink-muted)' }}>
          {clinic.address.line1}
          <br />
          {clinic.address.line2}, {clinic.address.line3}
          <br />
          WA {clinic.whatsapp} · {clinic.email}
        </div>
      </div>

      <div className="mx-7 my-5" style={{ borderTop: '1px dashed var(--color-line)' }} />

      {/* Title + meta */}
      <div className="px-7">
        <div className="flex items-center justify-between">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-ink-muted)' }}>
            Kwitansi
          </span>
          <span className="mono text-sm font-extrabold tracking-wider">{data.id}</span>
        </div>
        <dl className="mt-3 flex flex-col gap-1.5 text-[0.82rem]">
          <div className="flex justify-between gap-3">
            <dt style={{ color: 'var(--color-ink-muted)' }}>Tanggal treatment</dt>
            <dd className="text-right font-semibold">{apptLabel}</dd>
          </div>
          {paidAtLabel && (
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--color-ink-muted)' }}>Dibayar</dt>
              <dd className="text-right font-semibold">{paidAtLabel}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt style={{ color: 'var(--color-ink-muted)' }}>Pasien</dt>
            <dd className="text-right font-semibold">
              {data.patientName}
              {data.patientPhone ? ` · ${data.patientPhone}` : ''}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mx-7 my-5" style={{ borderTop: '1px dashed var(--color-line)' }} />

      {/* Items */}
      <div className="px-7">
        {data.items.map((it, i) => (
          <div key={`${it.name}-${i}`} className="flex items-start justify-between gap-3 py-1.5 text-[0.86rem]">
            <span>
              {it.name}
              {it.qty > 1 && <span style={{ color: 'var(--color-ink-muted)' }}> × {it.qty}</span>}
            </span>
            <span className="mono shrink-0">{formatRp(it.price * it.qty)}</span>
          </div>
        ))}
      </div>

      <div className="mx-7 my-5" style={{ borderTop: '1px dashed var(--color-line)' }} />

      {/* Totals */}
      <div className="px-7 text-[0.86rem]">
        <div className="flex justify-between py-1">
          <span style={{ color: 'var(--color-ink-muted)' }}>Subtotal</span>
          <span className="mono">{formatRp(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between py-1" style={{ color: 'var(--color-gold-deep)' }}>
            <span>Diskon voucher</span>
            <span className="mono">−{formatRp(data.discount)}</span>
          </div>
        )}
        <div className="mt-1 flex items-end justify-between border-t pt-2" style={{ borderColor: 'var(--color-line)' }}>
          <span className="font-bold">Total</span>
          <span className="mono text-2xl font-extrabold">{formatRp(data.total)}</span>
        </div>
      </div>

      {/* Payment method + LUNAS stamp */}
      <div className="mt-5 flex items-center justify-between px-7">
        <span className="text-[0.82rem]" style={{ color: 'var(--color-ink-muted)' }}>
          Metode: <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{data.payment}</span>
        </span>
        {data.payStatus === 'Lunas' ? (
          <span
            className="rounded-md px-3 py-1 text-sm font-extrabold uppercase tracking-widest"
            style={{ border: '2px solid #2c5848', color: '#2c5848', transform: 'rotate(-4deg)' }}
          >
            Lunas
          </span>
        ) : (
          <span
            className="rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider"
            style={{ border: '1px solid var(--color-rose)', color: 'var(--color-rose)' }}
          >
            Belum Lunas
          </span>
        )}
      </div>

      <div className="mx-7 my-5" style={{ borderTop: '1px dashed var(--color-line)' }} />

      {/* Footer */}
      <div className="px-7 pb-7 text-center text-[0.72rem] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
        Terima kasih atas kepercayaan Anda kepada {clinic.short}.
        <br />
        Kwitansi ini sah sebagai bukti pembayaran. {clinic.hashtag}
      </div>
    </div>
  )
}
