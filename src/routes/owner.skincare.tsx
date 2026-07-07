import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Package, Pencil, Plus, X } from 'lucide-react'
import { ownerProducts, ownerSaveProduct } from '#/server/products'
import { formatRp } from '#/data/clinic'

export const Route = createFileRoute('/owner/skincare')({ component: SkincareAdmin })

type Row = Awaited<ReturnType<typeof ownerProducts>>[number]
const inp = 'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'
const digits = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0

function SkincareAdmin() {
  const qc = useQueryClient()
  const { data: list = [], isError, error, refetch } = useQuery({ queryKey: ['owner-products'], queryFn: () => ownerProducts(), retry: false })

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ name: '', price: '' })
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (v: { id?: string; name: string; price: number; isActive?: boolean }) => ownerSaveProduct({ data: v }),
    onSuccess: () => { setErrMsg(null); qc.invalidateQueries({ queryKey: ['owner-products'] }) },
    onError: (e) => setErrMsg((e as Error)?.message || 'Gagal menyimpan produk.'),
  })

  const add = () => {
    if (!name.trim() || !digits(price)) return
    setErrMsg(null)
    save.mutate({ name: name.trim(), price: digits(price) })
    setName(''); setPrice('')
  }

  const active = list.filter((p) => p.isActive)
  const inactive = list.filter((p) => !p.isActive)

  const card = (p: Row) => (
    <div key={p.id} className="card-soft flex flex-wrap items-center justify-between gap-3 p-4" style={p.isActive ? undefined : { opacity: 0.7 }}>
      {editId === p.id ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input autoFocus className={`${inp} min-w-0 flex-1`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <div className="flex items-center gap-1 rounded-xl px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'white' }}>
            <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
            <input className="mono w-24 bg-transparent text-sm font-bold outline-none" inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
          </div>
          <button type="button" className="btn btn-gold px-3 py-2 text-sm" disabled={save.isPending} onClick={() => { save.mutate({ id: p.id, name: edit.name.trim(), price: digits(edit.price) }); setEditId(null) }}><Check size={15} /> Simpan</button>
          <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => setEditId(null)}><X size={15} /></button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}><Package size={18} /></div>
            <div className="min-w-0">
              <div className="truncate font-bold">{p.name}</div>
              <div className="mono text-sm font-bold gold-text">{formatRp(p.price)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => { setEditId(p.id); setEdit({ name: p.name, price: String(p.price) }) }}><Pencil size={15} /> Ubah</button>
            <button type="button" className="btn btn-ghost px-3 py-2 text-sm" disabled={save.isPending} onClick={() => save.mutate({ id: p.id, name: p.name, price: p.price, isActive: !p.isActive })} style={{ color: p.isActive ? 'var(--color-rose)' : 'var(--color-gold-deep)' }}>
              {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
      <span className="eyebrow">Katalog Produk</span>
      <h1 className="mt-2 text-[2rem]">Skincare</h1>
      <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Produk skincare yang dijual. Dipakai untuk bonus <b>closing/upselling</b> (5% dari harga skincare).
      </p>

      {(errMsg || isError) && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{errMsg ?? `Gagal memuat: ${(error as Error)?.message ?? 'kesalahan'}.`}{isError && <button type="button" className="ml-1 font-bold underline" onClick={() => refetch()}>Coba lagi</button>}</span>
        </div>
      )}

      <div className="card-soft mt-6 flex flex-wrap items-center gap-3 p-4">
        <input className={`${inp} min-w-0 flex-1`} placeholder="Nama produk skincare…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <div className="flex items-center gap-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
          <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
          <input className="mono w-28 bg-transparent text-sm font-bold outline-none" inputMode="numeric" placeholder="Harga" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        </div>
        <button type="button" className="btn btn-gold" disabled={save.isPending || !name.trim() || !digits(price)} onClick={add}><Plus size={18} /> Tambah</button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {active.length === 0 && <div className="card-soft p-8 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada produk. Tambah lewat kolom di atas.</div>}
        {active.map(card)}
      </div>
      {inactive.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-ink-muted)' }}>Nonaktif ({inactive.length})</h2>
          <div className="mt-3 flex flex-col gap-3">{inactive.map(card)}</div>
        </div>
      )}
    </div>
  )
}
