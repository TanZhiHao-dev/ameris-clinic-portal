import { type ChangeEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import type { Category } from '../data/clinic'
import {
  createTreatment,
  deleteTreatment,
  listTreatmentsAdmin,
  updateTreatment,
} from '#/server/treatments'

export const Route = createFileRoute('/owner/treatment')({ component: CatalogAdmin })

type Row = {
  id: string
  name: string
  category: Category
  duration: string
  price: number
  available: boolean
  promo: boolean
  image?: string
}

const CATS: Category[] = ['Facial', 'Peeling', 'Laser', 'Skinbooster', 'Injeksi', 'Paket']

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition"
      style={{ background: on ? 'var(--color-gold)' : 'var(--color-line)' }}
    >
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? '1.375rem' : '0.125rem' }} />
    </button>
  )
}

function CatalogAdmin() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['owner-treatments'],
    queryFn: () => listTreatmentsAdmin(),
  })
  const rows: Row[] = data.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category as Category,
    duration: t.duration,
    price: t.price,
    available: t.available,
    promo: t.promo,
    image: t.image,
  }))

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'Semua' | Category>('Semua')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: 'Facial' as Category, duration: '60 min', price: '' })
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})
  const [imgEdit, setImgEdit] = useState<Row | null>(null)

  // Refresh the owner table AND every public-facing cache the catalog feeds:
  // landing (Catalog/Promo/Loyalty) + the /treatment menu & detail pages.
  const invalidate = () => {
    for (const key of [['owner-treatments'], ['treatments'], ['promos'], ['redeem-tiers'], ['treatment']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  const updateMut = useMutation({
    mutationFn: (v: { id: string; price?: number; isAvailable?: boolean; isPromo?: boolean; image?: string | null }) =>
      updateTreatment({ data: v }),
    onSuccess: invalidate,
  })
  const saveImage = (id: string, image: string | null) => {
    updateMut.mutate({ id, image })
    setImgEdit(null)
  }
  const createMut = useMutation({
    mutationFn: (v: { name: string; category: string; duration: string; price: number }) =>
      createTreatment({ data: v }),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTreatment({ data: { id } }),
    onSuccess: invalidate,
  })

  const list = rows.filter((r) => (cat === 'Semua' || r.category === cat) && r.name.toLowerCase().includes(q.toLowerCase()))

  const patch = (id: string, p: Partial<Row>) => {
    if ('available' in p && p.available !== undefined) updateMut.mutate({ id, isAvailable: p.available })
    if ('promo' in p && p.promo !== undefined) updateMut.mutate({ id, isPromo: p.promo })
  }
  const commitPrice = (id: string) => {
    const raw = priceEdits[id]
    if (raw === undefined) return
    const price = parseInt(raw.replace(/\D/g, ''), 10) || 0
    setPriceEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    updateMut.mutate({ id, price })
  }
  const remove = (id: string) => deleteMut.mutate(id)
  const add = () => {
    const price = parseInt(draft.price.replace(/\D/g, ''), 10)
    if (!draft.name.trim() || !price) return
    createMut.mutate({ name: draft.name.trim(), category: draft.category, duration: draft.duration, price })
    setDraft({ name: '', category: 'Facial', duration: '60 min', price: '' })
    setAdding(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Kelola Katalog</span>
          <h1 className="mt-2 text-[2rem]">Treatment</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Ubah harga, status ketersediaan, dan promo. {rows.length} treatment.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setAdding((v) => !v)}>
          {adding ? <X size={18} /> : <Plus size={18} />} {adding ? 'Tutup' : 'Tambah treatment'}
        </button>
      </div>

      {adding && (
        <div className="card-soft mt-5 grid gap-3 p-5 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input className={inp} placeholder="Nama treatment" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className={inp} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className={inp} placeholder="Durasi" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
          <input className={inp} inputMode="numeric" placeholder="Harga" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={add}>Simpan</button>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-2 rounded-full px-4 py-2.5" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
          <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['Semua', ...CATS] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className="rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition"
              style={cat === c ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-soft mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Treatment</th>
              <th className="px-3 py-4 font-semibold">Gambar</th>
              <th className="px-3 py-4 font-semibold">Harga</th>
              <th className="px-3 py-4 font-semibold">Tersedia</th>
              <th className="px-3 py-4 font-semibold">Promo</th>
              <th className="px-3 py-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                <td className="px-5 py-4">
                  <div className="font-bold">{r.name}</div>
                  <div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{r.category} · {r.duration}</div>
                </td>
                <td className="px-3 py-4">
                  <button
                    type="button"
                    onClick={() => setImgEdit(r)}
                    className="group relative grid h-11 w-16 place-items-center overflow-hidden rounded-lg transition"
                    style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}
                    aria-label={`Atur gambar ${r.name}`}
                  >
                    {r.image ? (
                      <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus size={16} style={{ color: 'var(--color-ink-muted)' }} />
                    )}
                    <span className="absolute inset-0 hidden place-items-center bg-[rgba(33,28,23,0.45)] group-hover:grid">
                      <ImagePlus size={15} style={{ color: '#fff' }} />
                    </span>
                  </button>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
                    <span className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
                    <input
                      className="mono w-24 bg-transparent text-sm font-bold outline-none"
                      value={(priceEdits[r.id] ?? r.price.toLocaleString('id-ID'))}
                      onChange={(e) => setPriceEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                      onBlur={() => commitPrice(r.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      inputMode="numeric"
                      aria-label={`Harga ${r.name}`}
                    />
                  </div>
                </td>
                <td className="px-3 py-4"><Switch on={r.available} onChange={() => patch(r.id, { available: !r.available })} label={`Tersedia ${r.name}`} /></td>
                <td className="px-3 py-4"><Switch on={r.promo} onChange={() => patch(r.id, { promo: !r.promo })} label={`Promo ${r.name}`} /></td>
                <td className="px-3 py-4 text-right">
                  <button type="button" onClick={() => remove(r.id)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)]" style={{ color: 'var(--color-rose)' }} aria-label={`Hapus ${r.name}`}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
        Perubahan harga, ketersediaan, promo, dan gambar tersimpan langsung ke database.
      </p>

      {imgEdit && <ImageDialog row={imgEdit} saving={updateMut.isPending} onClose={() => setImgEdit(null)} onSave={saveImage} />}
    </div>
  )
}

const inp = 'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'

const MAX_KB = 600

// Per-treatment image editor. Stores a URL or a data-URL (file upload) in
// `treatments.image`. Displayed object-cover at 16:10 (cards) and 4:3 (detail).
function ImageDialog({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: Row
  saving: boolean
  onClose: () => void
  onSave: (id: string, image: string | null) => void
}) {
  const [val, setVal] = useState(row.image ?? '')
  const [err, setErr] = useState('')

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    if (!f.type.startsWith('image/')) return setErr('File harus berupa gambar.')
    if (f.size > MAX_KB * 1024) return setErr(`Gambar terlalu besar (maks ${MAX_KB} KB). Kompres dulu.`)
    const reader = new FileReader()
    reader.onload = () => setVal(String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2">
            <ImagePlus size={18} style={{ color: 'var(--color-gold)' }} />
            <span className="font-bold">Atur gambar — {row.name}</span>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 transition hover:opacity-100"><X size={18} /></button>
        </div>

        <div className="p-6">
          {/* Live previews at both display ratios */}
          <div className="grid grid-cols-2 gap-3">
            {([['16 / 10', 'Kartu menu'], ['4 / 3', 'Halaman detail']] as const).map(([ratio, label]) => (
              <div key={ratio}>
                <div className="overflow-hidden rounded-xl" style={{ aspectRatio: ratio, border: '1px solid var(--color-line)', background: 'var(--color-muted)' }}>
                  {val ? (
                    <img src={val} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Tanpa gambar</div>
                  )}
                </div>
                <div className="mt-1 text-center text-[0.68rem]" style={{ color: 'var(--color-ink-muted)' }}>{label} ({ratio.replace(/ /g, '')})</div>
              </div>
            ))}
          </div>

          <label className="mt-5 block text-sm font-semibold">URL gambar</label>
          <input className={`${inp} mt-2 w-full`} placeholder="https://… atau tempel data URL" value={val} onChange={(e) => setVal(e.target.value)} />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="btn btn-ghost cursor-pointer px-4 py-2 text-sm">
              <Upload size={15} /> Unggah dari perangkat
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            {val && (
              <button type="button" className="text-sm font-semibold" style={{ color: 'var(--color-rose)' }} onClick={() => setVal('')}>
                Kosongkan
              </button>
            )}
          </div>

          {err && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}

          <p className="mt-4 rounded-xl px-4 py-3 text-[0.78rem] leading-relaxed" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-soft)' }}>
            <strong>Ukuran ideal: 1200 × 800 px</strong> (rasio 3:2, landscape) · format JPG/WebP · &lt; {MAX_KB} KB.
            Letakkan objek di tengah — gambar dipotong otomatis (object-cover) ke 16:10 di kartu dan 4:3 di halaman detail.
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={saving} onClick={() => onSave(row.id, val.trim() ? val.trim() : null)}>
              {saving ? 'Menyimpan…' : 'Simpan gambar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
