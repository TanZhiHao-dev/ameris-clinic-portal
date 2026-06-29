import { type ChangeEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CheckCheck, QrCode, Upload } from 'lucide-react'
import { fmtDate, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone } from '../data/owner'
import { ownerApprovePayment, ownerTransactions } from '#/server/transactions'
import { ownerCompleteBooking } from '#/server/bookings'
import { getPaymentInfo, ownerSetQris } from '#/server/settings'

export const Route = createFileRoute('/owner/transaksi')({ component: TransactionsPage })

const TABS = ['Semua', 'Pending', 'Lunas'] as const

function TransactionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Semua')
  const [flash, setFlash] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['owner-transaksi', tab],
    queryFn: () => ownerTransactions({ data: { tab } }),
  })

  const list = (data?.rows ?? [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
  const totalLunas = data?.totalLunas ?? 0
  const totalPending = data?.totalPending ?? 0

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['owner-transaksi'] })
    qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
    qc.invalidateQueries({ queryKey: ['owner-jadwal'] })
  }

  const approveMut = useMutation({
    mutationFn: (id: string) => ownerApprovePayment({ data: { bookingId: id } }),
    onSuccess: (res) => {
      invalidate()
      setFlash(`Pembayaran ${res.bookingId} ditandai Lunas.`)
      setTimeout(() => setFlash(null), 3000)
    },
  })
  const approve = (id: string) => approveMut.mutate(id)

  const completeMut = useMutation({
    mutationFn: (id: string) => ownerCompleteBooking({ data: { id } }),
    onSuccess: (res) => {
      invalidate()
      setFlash(`${res.id} selesai${res.pointsAdded > 0 ? ` — +${res.pointsAdded} poin` : ''}.`)
      setTimeout(() => setFlash(null), 3500)
    },
  })
  const complete = (b: { id: string }) => completeMut.mutate(b.id)

  // ── QRIS payment image (owner-managed) ──
  const { data: payInfo } = useQuery({ queryKey: ['payment-info'], queryFn: () => getPaymentInfo() })
  const [qrisErr, setQrisErr] = useState('')
  const qrisMut = useMutation({
    mutationFn: (image: string | null) => ownerSetQris({ data: { image } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-info'] }),
  })
  const onQrisFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!f) return
    setQrisErr('')
    if (!f.type.startsWith('image/')) return setQrisErr('File harus berupa gambar.')
    if (f.size > 600 * 1024) return setQrisErr('Gambar terlalu besar (maks 600 KB). Kompres dulu.')
    const reader = new FileReader()
    reader.onload = () => qrisMut.mutate(String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <div>
      <span className="eyebrow">Manajemen Transaksi</span>
      <h1 className="mt-2 text-[2rem]">Transaksi</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Tandai pembayaran Lunas dan konfirmasi penyelesaian treatment.
      </p>

      {flash && (
        <div className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(44,88,72,0.12)', color: '#2c5848' }}>
          <CheckCheck size={16} /> {flash}
        </div>
      )}

      {/* QRIS payment image */}
      <div className="card-soft mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-2 font-bold">
          <QrCode size={18} style={{ color: 'var(--color-gold-deep)' }} /> QRIS Pembayaran
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Foto QRIS klinik yang ditampilkan saat customer memilih “Transfer Bank” di checkout.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
            {payInfo?.qrisImage ? (
              <img src={payInfo.qrisImage} alt="QRIS Ameris" className="h-full w-full object-contain" />
            ) : (
              <span className="px-3 text-center text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Belum ada QRIS</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <label className="btn btn-gold cursor-pointer">
              <Upload size={16} /> {payInfo?.qrisImage ? 'Ganti QRIS' : 'Upload QRIS'}
              <input type="file" accept="image/*" className="hidden" onChange={onQrisFile} />
            </label>
            {payInfo?.qrisImage && (
              <button type="button" onClick={() => qrisMut.mutate(null)} className="text-sm font-semibold" style={{ color: 'var(--color-rose)' }}>
                Hapus QRIS
              </button>
            )}
            <p className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>JPG/PNG, maks 600 KB.</p>
            {qrisMut.isPending && <p className="text-[0.72rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>Menyimpan…</p>}
            {qrisErr && <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{qrisErr}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-soft p-5">
          <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Total lunas</div>
          <div className="mono mt-2 text-2xl font-extrabold gold-text">{formatRp(totalLunas)}</div>
        </div>
        <div className="card-soft p-5">
          <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Menunggu pembayaran</div>
          <div className="mono mt-2 text-2xl font-extrabold" style={{ color: 'var(--color-rose)' }}>{formatRp(totalPending)}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={tab === t ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="card-soft mt-5 overflow-x-auto">
        <table className="stack w-full text-sm sm:min-w-[820px]">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Transaksi</th>
              <th className="px-3 py-4 font-semibold">Tanggal</th>
              <th className="px-3 py-4 font-semibold">Metode</th>
              <th className="px-3 py-4 font-semibold">Jumlah</th>
              <th className="px-3 py-4 font-semibold">Status</th>
              <th className="px-3 py-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                <td className="px-5 py-4">
                  <div className="font-bold">{b.patientName}</div>
                  <div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>
                    <span className="mono">{b.id}</span> · {b.items.map((i) => i.name).join(', ')}
                  </div>
                </td>
                <td data-label="Tanggal" className="px-3 py-4 whitespace-nowrap" style={{ color: 'var(--color-ink-soft)' }}>{fmtDate(b.date)}</td>
                <td data-label="Metode" className="px-3 py-4">{b.payment}</td>
                <td data-label="Jumlah" className="px-3 py-4 mono font-bold gold-text whitespace-nowrap">{formatRp(b.total)}</td>
                <td data-label="Status" className="px-3 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="badge w-fit" style={{ background: payTone[b.payStatus as PayStatus].bg, color: payTone[b.payStatus as PayStatus].color }}>{b.payStatus === 'Pending' ? 'Transfer sudah masuk?' : b.payStatus}</span>
                    <span className="badge w-fit" style={{ background: statusTone[b.status as OwnerStatus].bg, color: statusTone[b.status as OwnerStatus].color }}>{b.status}</span>
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-col items-end gap-2">
                    {b.payStatus === 'Pending' && (
                      <button type="button" className="btn btn-primary whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => approve(b.id)}>
                        <BadgeCheck size={14} /> Lunas
                      </button>
                    )}
                    {b.status !== 'Selesai' && (
                      <button type="button" className="btn btn-gold whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => complete(b)}>
                        Selesaikan
                      </button>
                    )}
                    {b.status === 'Selesai' && b.payStatus === 'Lunas' && (
                      <span className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Selesai</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
