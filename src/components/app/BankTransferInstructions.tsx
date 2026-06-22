import { useState } from 'react'
import { Check, Copy, Landmark, MessageCircle, QrCode } from 'lucide-react'
import { clinic, formatRp } from '../../data/clinic'

// Manual bank-transfer / QRIS payment instructions. Shown on the checkout
// confirmation and on a pending Transfer-Bank booking. The owner verifies the
// incoming transfer and marks it Lunas in /owner/transaksi.
export function BankTransferInstructions({ amount, bookingId }: { amount: number; bookingId: string }) {
  const bank = clinic.bank
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bank.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — number is still shown */
    }
  }

  const waMsg = encodeURIComponent(
    `Halo Ameris, saya sudah transfer untuk booking ${bookingId} sejumlah ${formatRp(amount)}. Berikut bukti transfernya:`,
  )

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
      <div className="flex items-center gap-2 font-bold">
        <Landmark size={18} style={{ color: 'var(--color-gold-deep)' }} /> Transfer ke rekening
      </div>

      <div className="mt-3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid var(--color-line)' }}>
        <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          Bank {bank.bankName}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="mono text-xl font-extrabold tracking-wide">{bank.accountNumber}</span>
          <button type="button" onClick={copy} className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs">
            {copied ? <><Check size={14} /> Tersalin</> : <><Copy size={14} /> Salin</>}
          </button>
        </div>
        <div className="mt-1 text-sm font-semibold">a.n. {bank.accountHolder}</div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#fff', border: '1px solid var(--color-line)' }}>
        <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Jumlah transfer</span>
        <span className="mono text-lg font-extrabold gold-text">{formatRp(amount)}</span>
      </div>

      {bank.qrisImage ? <QrisBlock src={bank.qrisImage} /> : null}

      <p className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
        Transfer sesuai jumlah di atas, lalu kirim bukti transfer via WhatsApp. Booking dikonfirmasi setelah pembayaran
        diverifikasi admin.
      </p>

      <a
        href={`https://wa.me/${clinic.whatsappRaw}?text=${waMsg}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-gold mt-3 w-full"
      >
        <MessageCircle size={17} /> Konfirmasi transfer via WhatsApp
      </a>
    </div>
  )
}

// QRIS image — hidden automatically if public/qris.png is not present.
function QrisBlock({ src }: { src: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <div className="mt-3 flex flex-col items-center rounded-xl p-4" style={{ background: '#fff', border: '1px solid var(--color-line)' }}>
      <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
        <QrCode size={13} /> atau scan QRIS
      </div>
      <img src={src} alt="QRIS Ameris" className="mt-2 h-44 w-44 object-contain" onError={() => setOk(false)} />
    </div>
  )
}
