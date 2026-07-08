import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Ban, Banknote, CheckCheck, Minus, Pencil, Plus, QrCode, ReceiptText, Search, Ticket, Trash2, Upload, X } from 'lucide-react'
import { fmtDate, formatRp, type OwnerStatus, type PayStatus, payTone, statusTone } from '../data/owner'
import { effectivePrice } from '#/data/clinic'
import { ownerApprovePayment, ownerBookingDetail, ownerTransactions, ownerUpdateBooking } from '#/server/transactions'
import { ownerCompleteBooking, ownerMarkUnpaid } from '#/server/bookings'
import { listTreatments } from '#/server/treatments'
import { getPaymentInfo, ownerSetQris } from '#/server/settings'

export const Route = createFileRoute('/owner/transaksi')({ component: TransactionsPage })

const TABS = ['Semua', 'Pending', 'Lunas'] as const

function TransactionsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Semua')
  const [flash, setFlash] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const flashFor = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3500)
  }

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

  const unpaidMut = useMutation({
    mutationFn: (id: string) => ownerMarkUnpaid({ data: { id } }),
    onSuccess: (res) => {
      invalidate()
      setFlash(`Pesanan ${res.id} ditandai tidak bayar & dihapus dari daftar.`)
      setTimeout(() => setFlash(null), 3500)
    },
  })
  const markUnpaid = (b: { id: string; patientName: string }) => {
    if (
      window.confirm(
        `Tandai pesanan ${b.id} (${b.patientName}) sebagai TIDAK BAYAR?\n\nPesanan akan dibatalkan dan hilang dari daftar transaksi. Tindakan ini tidak bisa dibatalkan.`,
      )
    ) {
      unpaidMut.mutate(b.id)
    }
  }

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
                    {!b.hasVoucher && (
                      <button type="button" className="btn btn-ghost whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => setEditId(b.id)}>
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    {b.payStatus === 'Pending' && (
                      <button type="button" className="btn btn-primary whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => approve(b.id)}>
                        <BadgeCheck size={14} /> Lunas
                      </button>
                    )}
                    {b.payStatus === 'Pending' && b.status !== 'Selesai' && (
                      <button
                        type="button"
                        className="btn btn-ghost whitespace-nowrap px-3 py-1.5 text-xs"
                        style={{ color: 'var(--color-rose)' }}
                        onClick={() => markUnpaid(b)}
                      >
                        <Ban size={14} /> Tidak Bayar
                      </button>
                    )}
                    {b.status !== 'Selesai' && (
                      <button type="button" className="btn btn-gold whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => complete(b)}>
                        Selesaikan
                      </button>
                    )}
                    {b.payStatus === 'Lunas' && (
                      <Link
                        to="/kwitansi/$id"
                        params={{ id: b.id }}
                        target="_blank"
                        className="btn btn-ghost whitespace-nowrap px-3 py-1.5 text-xs"
                      >
                        <ReceiptText size={14} /> Kwitansi
                      </Link>
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

      {editId && (
        <EditTxnDialog
          bookingId={editId}
          onClose={() => setEditId(null)}
          onSaved={(msg) => {
            setEditId(null)
            invalidate()
            flashFor(msg)
          }}
        />
      )}
    </div>
  )
}

type EditLine = { treatmentId: string; name: string; unitPrice: number; qty: number }

function EditTxnDialog({ bookingId, onClose, onSaved }: { bookingId: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const { data: detail, isPending } = useQuery({ queryKey: ['owner-booking-detail', bookingId], queryFn: () => ownerBookingDetail({ data: { id: bookingId } }) })
  const { data: treatments = [] } = useQuery({ queryKey: ['pos-treatments'], queryFn: () => listTreatments() })

  const [lines, setLines] = useState<EditLine[] | null>(null)
  const [payMethod, setPayMethod] = useState<'Offline' | 'Transfer'>('Offline')
  const [tq, setTq] = useState('')
  const [err, setErr] = useState<string | null>(null)

  // Seed local state once the booking detail arrives. Legacy items with a missing
  // treatmentId are matched back to the catalog by name so they stay editable.
  useEffect(() => {
    if (!detail || lines !== null) return
    const byName = new Map(treatments.map((t) => [t.name.toLowerCase(), t.id]))
    setLines(
      detail.items.map((i) => ({
        treatmentId: i.treatmentId || byName.get(i.name.toLowerCase()) || '',
        name: i.name,
        unitPrice: i.unitPrice,
        qty: i.qty,
      })),
    )
    setPayMethod(detail.paymentMethod === 'Transfer' ? 'Transfer' : 'Offline')
  }, [detail, treatments, lines])

  const available = useMemo(
    () => treatments.filter((t) => t.available && t.name.toLowerCase().includes(tq.toLowerCase())).slice(0, 30),
    [treatments, tq],
  )
  const addLine = (t: { id: string; name: string; price: number; isPromo: boolean; promoPrice: number | null }) => {
    const price = effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice })
    setLines((cur) => {
      const ls = cur ?? []
      const ex = ls.find((l) => l.treatmentId === t.id)
      if (ex) return ls.map((l) => (l.treatmentId === t.id ? { ...l, qty: l.qty + 1 } : l))
      return [...ls, { treatmentId: t.id, name: t.name, unitPrice: price, qty: 1 }]
    })
    setTq('')
  }
  const patchLine = (i: number, patch: Partial<EditLine>) => setLines((cur) => (cur ? cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) : cur))
  const removeLine = (i: number) => setLines((cur) => (cur ? cur.filter((_, idx) => idx !== i) : cur))
  const total = (lines ?? []).reduce((s, l) => s + l.unitPrice * l.qty, 0)

  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () =>
      ownerUpdateBooking({
        data: {
          bookingId,
          items: (lines ?? []).map((l) => ({ treatmentId: l.treatmentId, qty: l.qty, unitPrice: l.unitPrice })),
          paymentMethod: payMethod,
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['owner-booking-detail', bookingId] })
      const pts = r.pointsDelta ? ` · poin ${r.pointsDelta > 0 ? '+' : ''}${r.pointsDelta}` : ''
      onSaved(`Transaksi ${r.id} diperbarui — total ${formatRp(r.total)}${pts}.`)
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal menyimpan perubahan.'),
  })

  const canSave = !!lines && lines.length > 0 && lines.every((l) => l.treatmentId) && !save.isPending
  const submit = () => {
    setErr(null)
    if (lines && lines.some((l) => !l.treatmentId)) return setErr('Ada item lama tanpa treatment terkait — hapus item itu lalu tambah dari daftar.')
    save.mutate()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" className="absolute inset-0" style={{ background: 'rgba(33,28,23,0.5)' }} onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-shell)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <div>
            <h2 className="text-lg font-bold">Edit transaksi</h2>
            <p className="mono text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{bookingId}</p>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isPending || !lines ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</p>
          ) : (
            <>
              {detail?.payStatus === 'Lunas' && (
                <div className="mb-4 rounded-xl px-3 py-2 text-[0.76rem]" style={{ background: 'rgba(195,154,68,0.1)', color: 'var(--color-gold-deep)' }}>
                  Transaksi sudah <b>Lunas</b>. Menambah/mengubah item akan menyesuaikan total & poin — pastikan selisih pembayaran sudah ditagih.
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {lines.map((l, i) => (
                  <div key={`${l.treatmentId}-${i}`} className="rounded-xl p-3" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-sm font-semibold">{l.name}</div>
                      <button type="button" aria-label={`Hapus ${l.name}`} onClick={() => removeLine(i)} style={{ color: 'var(--color-rose)' }}><Trash2 size={15} /></button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-sm" style={{ border: '1px solid var(--color-line)' }}>
                        <span className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
                        <input
                          type="number" min={0} inputMode="numeric" aria-label={`Harga ${l.name}`}
                          value={l.unitPrice} onChange={(e) => patchLine(i, { unitPrice: Math.max(0, Math.round(Number(e.target.value)) || 0) })}
                          className="w-24 bg-transparent text-right outline-none"
                        />
                      </label>
                      <div className="ml-auto flex items-center gap-1.5">
                        <button type="button" aria-label="Kurangi" onClick={() => patchLine(i, { qty: Math.max(1, l.qty - 1) })} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Minus size={13} /></button>
                        <span className="mono w-6 text-center text-sm font-bold">{l.qty}</span>
                        <button type="button" aria-label="Tambah" onClick={() => patchLine(i, { qty: l.qty + 1 })} className="grid h-7 w-7 place-items-center rounded-full" style={{ border: '1px solid var(--color-line)' }}><Plus size={13} /></button>
                      </div>
                      <span className="mono w-24 shrink-0 text-right text-sm font-semibold">{formatRp(l.unitPrice * l.qty)}</span>
                    </div>
                  </div>
                ))}
                {lines.length === 0 && <p className="rounded-xl px-3 py-4 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>Belum ada item. Tambah treatment di bawah.</p>}
              </div>

              {/* Add / upsell */}
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
                  <Search size={15} style={{ color: 'var(--color-ink-muted)' }} />
                  <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Tambah / upsell treatment…" className="w-full bg-transparent text-sm outline-none" />
                </div>
                {tq.trim() && (
                  <div className="mt-2 grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto">
                    {available.map((t) => (
                      <button key={t.id} type="button" onClick={() => addLine(t)} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ border: '1px solid var(--color-line)' }}>
                        <span className="min-w-0 truncate">{t.name}</span>
                        <span className="mono shrink-0 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>{formatRp(effectivePrice({ price: t.price, isPromo: t.isPromo, promoPrice: t.promoPrice }))}</span>
                      </button>
                    ))}
                    {available.length === 0 && <p className="px-3 py-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada treatment cocok.</p>}
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="mt-5">
                <div className="text-[0.72rem] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ink-muted)' }}>Metode pembayaran</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['Offline', 'Transfer'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition"
                      style={payMethod === m ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)', color: 'var(--color-ink)' } : { background: 'var(--color-cream)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
                      {m === 'Offline' ? <><Banknote size={15} /> Tunai / Klinik</> : <><Ticket size={15} /> QRIS / Transfer</>}
                    </button>
                  ))}
                </div>
              </div>

              {err && <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-line)' }}>
          <div>
            <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Total baru</div>
            <div className="mono text-xl font-extrabold gold-text">{formatRp(total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={!canSave} onClick={submit}>
              {save.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
