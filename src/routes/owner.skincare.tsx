import { type ChangeEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ImagePlus, Package, Pencil, Plus, X } from 'lucide-react'
import { ownerProducts, ownerSaveProduct } from '#/server/products'
import { formatRp } from '#/data/clinic'

export const Route = createFileRoute('/owner/skincare')({ component: SkincareAdmin })

type Row = Awaited<ReturnType<typeof ownerProducts>>[number]
const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'
const digits = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0
const MAX_KB = 600

function SkincareAdmin() {
  const qc = useQueryClient()
  const { data: list = [], isError, error, refetch } = useQuery({ queryKey: ['owner-products'], queryFn: () => ownerProducts(), retry: false })
  const [dialog, setDialog] = useState<Row | 'new' | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const toggle = useMutation({
    mutationFn: (p: Row) => ownerSaveProduct({ data: { id: p.id, name: p.name, price: p.price, isActive: !p.isActive } }),
    onSuccess: () => { setErrMsg(null); qc.invalidateQueries({ queryKey: ['owner-products'] }) },
    onError: (e) => setErrMsg((e as Error)?.message || 'Gagal menyimpan produk.'),
  })

  const active = list.filter((p) => p.isActive)
  const inactive = list.filter((p) => !p.isActive)

  const card = (p: Row) => (
    <div key={p.id} className="card-soft flex flex-wrap items-center justify-between gap-3 p-4" style={p.isActive ? undefined : { opacity: 0.65 }}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}>
          {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Package size={20} />}
        </div>
        <div className="min-w-0">
          <div className="truncate font-bold">{p.name}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-sm font-bold gold-text">{formatRp(p.price)}</span>
            {p.stock == null ? (
              <span className="text-[0.72rem]" style={{ color: 'var(--color-line)' }}>· stok tidak dilacak</span>
            ) : p.stock === 0 ? (
              <span className="rounded-full px-2 py-0.5 text-[0.66rem] font-bold" style={{ background: 'rgba(179,73,47,0.12)', color: 'var(--color-destructive)' }}>Habis</span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-[0.66rem] font-semibold" style={{ background: 'var(--color-muted)', color: p.stock <= 5 ? 'var(--color-rose)' : 'var(--color-ink-muted)' }}>Stok: {p.stock}{p.stock <= 5 ? ' · menipis' : ''}</span>
            )}
          </div>
          {p.description && <div className="mt-0.5 line-clamp-1 text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{p.description}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => setDialog(p)}><Pencil size={15} /> Ubah</button>
        <button type="button" className="btn btn-ghost px-3 py-2 text-sm" disabled={toggle.isPending} onClick={() => { setErrMsg(null); toggle.mutate(p) }} style={{ color: p.isActive ? 'var(--color-rose)' : 'var(--color-gold-deep)' }}>
          {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Katalog Produk</span>
          <h1 className="mt-2 text-[2rem]">Skincare</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Produk skincare yang dijual — tampil dengan foto di toko pasien (<span className="mono">/skincare</span>) &amp; dipakai untuk bonus <b>closing/upselling</b> (5%).
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setDialog('new')}><Plus size={18} /> Tambah produk</button>
      </div>

      {(errMsg || isError) && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{errMsg ?? `Gagal memuat: ${(error as Error)?.message ?? 'kesalahan'}.`}{isError && <button type="button" className="ml-1 font-bold underline" onClick={() => refetch()}>Coba lagi</button>}</span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {active.length === 0 && <div className="card-soft p-8 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada produk. Klik “Tambah produk”.</div>}
        {active.map(card)}
      </div>
      {inactive.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-ink-muted)' }}>Nonaktif ({inactive.length})</h2>
          <div className="mt-3 flex flex-col gap-3">{inactive.map(card)}</div>
        </div>
      )}

      {dialog && <ProductDialog product={dialog === 'new' ? null : dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); qc.invalidateQueries({ queryKey: ['owner-products'] }) }} />}
    </div>
  )
}

function ProductDialog({ product, onClose, onSaved }: { product: Row | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [image, setImage] = useState<string>(product?.image ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : '')
  const [err, setErr] = useState('')

  const save = useMutation({
    mutationFn: () => ownerSaveProduct({ data: { id: product?.id, name: name.trim(), price: digits(price), image, description, stock: stock.trim() === '' ? null : Math.max(0, digits(stock)) } }),
    onSuccess: onSaved,
    onError: (e) => setErr((e as Error)?.message || 'Gagal menyimpan.'),
  })

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErr('')
    if (!f.type.startsWith('image/')) return setErr('File harus berupa gambar.')
    if (f.size > MAX_KB * 1024) return setErr(`Gambar terlalu besar (maks ${MAX_KB} KB). Kompres dulu.`)
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2"><Package size={18} style={{ color: 'var(--color-gold)' }} /><span className="font-bold">{product ? `Ubah — ${product.name}` : 'Produk baru'}</span></div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 transition hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3 p-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
              {image ? <img src={image} alt="Foto produk" className="h-full w-full object-cover" /> : <Package size={24} style={{ color: 'var(--color-ink-muted)' }} />}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <label className="btn btn-ghost cursor-pointer px-3 py-2 text-sm"><ImagePlus size={15} /> {image ? 'Ganti foto' : 'Upload foto'}<input type="file" accept="image/*" className="hidden" onChange={onFile} /></label>
              {image && <button type="button" className="text-[0.78rem] font-semibold" style={{ color: 'var(--color-rose)' }} onClick={() => setImage('')}>Hapus foto</button>}
              <span className="text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>JPG/PNG, maks {MAX_KB} KB.</span>
            </div>
          </div>
          <input className={inp} placeholder="Nama produk skincare" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)' }}>
              <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
              <input className="mono w-full bg-transparent text-sm font-bold outline-none" inputMode="numeric" placeholder="Harga" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <input className={inp} inputMode="numeric" placeholder="Stok" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <p className="-mt-1 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Stok berkurang otomatis tiap checkout. Kosongkan kalau tidak mau dilacak.</p>
          <textarea className={`${inp} h-20 resize-none`} placeholder="Deskripsi singkat (opsional) — mis. manfaat, ukuran, cara pakai" value={description} onChange={(e) => setDescription(e.target.value)} />
          {err && <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={save.isPending || !name.trim() || !digits(price)} onClick={() => { setErr(''); save.mutate() }}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
