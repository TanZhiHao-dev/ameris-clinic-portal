import { type ChangeEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Languages, Plus, Search, Star, Trash2, Upload, X } from 'lucide-react'
import type { Category } from '../data/clinic'
import {
  createTreatment,
  deleteTreatment,
  listTreatmentsAdmin,
  updateTreatment,
} from '#/server/treatments'
import type { UnitPreset } from '#/server/treatments'

export const Route = createFileRoute('/owner/treatment')({ component: CatalogAdmin })

type Row = {
  id: string
  name: string
  blurb: string
  blurbEn: string | null
  category: Category
  duration: string
  price: number
  pricePerUnit: boolean
  minUnits: number
  unitPresets: UnitPreset[]
  available: boolean
  bestSeller: boolean
  heroFeatured: boolean
  promo: boolean
  promoPrice: number | null
  beauticianBonus: number
  image?: string
}

// Shape of one row in the ['owner-treatments'] cache (ClientTreatment + `promo`).
type AdminRow = Awaited<ReturnType<typeof listTreatmentsAdmin>>[number]
type UpdateVars = {
  id: string
  name?: string
  price?: number
  blurb?: string
  blurbEn?: string | null
  pricePerUnit?: boolean
  minUnits?: number
  unitPresets?: string | null // raw "50, 100"; null clears
  isAvailable?: boolean
  isBestSeller?: boolean
  isHeroFeatured?: boolean
  isPromo?: boolean
  promoNow?: number | null
  beauticianBonus?: number
  category?: string
  duration?: string
  image?: string | null
}

const CATS: Category[] = ['Facial', 'Peeling', 'Laser', 'Skinbooster', 'Injeksi', 'Paket']

// Client-side mirror of the server's preset parser/serializer — kept local so
// this route never imports db-backed server utilities. `parsePresets` feeds the
// optimistic cache update; `serializePresets` renders the editable text field.
const parsePresets = (raw: string): UnitPreset[] => {
  const seen = new Set<number>()
  const out: UnitPreset[] = []
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(\d+)\s*(?:unit\b)?\s*[=:]?\s*(.*)$/i)
    if (!m) continue
    const units = parseInt(m[1], 10)
    if (!Number.isFinite(units) || units <= 0 || seen.has(units)) continue
    seen.add(units)
    const label = m[2].trim().replace(/^\((.*)\)$/, '$1').trim()
    out.push({ units, label: label || null })
  }
  return out.sort((a, b) => a.units - b.units)
}
const serializePresets = (list: UnitPreset[]): string =>
  list.map((p) => (p.label ? `${p.units}=${p.label}` : String(p.units))).join(', ')

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
    blurb: t.blurb,
    blurbEn: t.blurbEn,
    category: t.category as Category,
    duration: t.duration,
    price: t.price,
    pricePerUnit: t.pricePerUnit,
    minUnits: t.minUnits,
    unitPresets: t.unitPresets,
    available: t.available,
    bestSeller: t.bestSeller,
    heroFeatured: t.heroFeatured,
    promo: t.promo,
    promoPrice: t.promoPrice,
    beauticianBonus: t.beauticianBonus,
    image: t.image,
  }))

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'Semua' | Category>('Semua')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: 'Facial' as Category, duration: '60 min', price: '', blurb: '', blurbEn: '' })
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({})
  const [durationEdits, setDurationEdits] = useState<Record<string, string>>({})
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})
  const [promoEdits, setPromoEdits] = useState<Record<string, string>>({})
  const [minUnitEdits, setMinUnitEdits] = useState<Record<string, string>>({})
  const [presetEdits, setPresetEdits] = useState<Record<string, string>>({})
  const [bonusEdits, setBonusEdits] = useState<Record<string, string>>({})
  const [imgEdit, setImgEdit] = useState<Row | null>(null)
  const [subEdit, setSubEdit] = useState<Row | null>(null)

  // Refresh the owner table AND every public-facing cache the catalog feeds:
  // landing (Catalog/Promo/Loyalty) + the /treatment menu & detail pages.
  const invalidate = () => {
    for (const key of [['owner-treatments'], ['treatments'], ['promos'], ['redeem-tiers'], ['treatment']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }
  // Only the public-facing caches — used after an edit, since the owner table is
  // already updated optimistically (no need to refetch it on every toggle).
  const invalidatePublic = () => {
    for (const key of [['treatments'], ['promos'], ['redeem-tiers'], ['treatment']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }
  // Mirror an edit onto a cached owner row so the toggle/price flips instantly.
  const applyPatch = (t: AdminRow, v: UpdateVars): AdminRow => ({
    ...t,
    ...(v.name !== undefined && { name: v.name }),
    ...(v.price !== undefined && { price: v.price }),
    ...(v.blurb !== undefined && { blurb: v.blurb }),
    ...(v.blurbEn !== undefined && { blurbEn: v.blurbEn }),
    ...(v.pricePerUnit !== undefined && { pricePerUnit: v.pricePerUnit }),
    ...(v.minUnits !== undefined && { minUnits: v.minUnits }),
    ...(v.unitPresets !== undefined && { unitPresets: v.unitPresets ? parsePresets(v.unitPresets) : [] }),
    ...(v.isAvailable !== undefined && { available: v.isAvailable }),
    // Dropping best-seller also drops the hero pick (a non-best-seller can't be hero).
    ...(v.isBestSeller !== undefined && { bestSeller: v.isBestSeller, ...(v.isBestSeller === false && { heroFeatured: false }) }),
    ...(v.isHeroFeatured !== undefined && { heroFeatured: v.isHeroFeatured }),
    ...(v.isPromo !== undefined && { isPromo: v.isPromo, promo: v.isPromo }),
    ...(v.promoNow !== undefined && { promoPrice: v.promoNow }),
    ...(v.beauticianBonus !== undefined && { beauticianBonus: v.beauticianBonus }),
    ...(v.category !== undefined && { category: v.category as Category }),
    ...(v.duration !== undefined && { duration: v.duration }),
    ...(v.image !== undefined && { image: v.image ?? undefined }),
  })

  const updateMut = useMutation({
    mutationFn: (v: UpdateVars) => updateTreatment({ data: v }),
    // Flip the owner table immediately, then reconcile with the server's row.
    // Previously the switch waited on the POST + a full list refetch, which felt
    // sluggish (especially toggling Promo on a remote DB).
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['owner-treatments'] })
      const prev = qc.getQueryData<AdminRow[]>(['owner-treatments'])
      qc.setQueryData<AdminRow[]>(['owner-treatments'], (old) =>
        old?.map((t) => {
          if (t.id === v.id) return applyPatch(t, v)
          // Hero is single-select: turning one on clears it from the others.
          if (v.isHeroFeatured === true && t.heroFeatured) return { ...t, heroFeatured: false }
          return t
        }),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['owner-treatments'], ctx.prev)
    },
    onSuccess: (row) => {
      if (row) {
        qc.setQueryData<AdminRow[]>(['owner-treatments'], (old) =>
          old?.map((t) => (t.id === row.id ? { ...row, promo: row.isPromo } : t)),
        )
      }
      invalidatePublic()
    },
  })
  const saveImage = (id: string, image: string | null) => {
    updateMut.mutate({ id, image })
    setImgEdit(null)
  }
  const saveSubtitle = (id: string, blurb: string, blurbEn: string | null) => {
    updateMut.mutate({ id, blurb, blurbEn })
    setSubEdit(null)
  }
  const createMut = useMutation({
    mutationFn: (v: { name: string; category: string; duration: string; price: number; blurb: string; blurbEn: string }) =>
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
    if ('pricePerUnit' in p && p.pricePerUnit !== undefined) updateMut.mutate({ id, pricePerUnit: p.pricePerUnit })
    if ('bestSeller' in p && p.bestSeller !== undefined) updateMut.mutate({ id, isBestSeller: p.bestSeller })
    if ('heroFeatured' in p && p.heroFeatured !== undefined) updateMut.mutate({ id, isHeroFeatured: p.heroFeatured })
  }
  const commitName = (id: string, original: string) => {
    const raw = nameEdits[id]
    setNameEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    if (raw === undefined) return
    const name = raw.trim()
    // Ignore an empty name or a no-op edit (keeps the original).
    if (!name || name === original) return
    updateMut.mutate({ id, name })
  }
  const commitDuration = (id: string, original: string) => {
    const raw = durationEdits[id]
    setDurationEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    if (raw === undefined) return
    const duration = raw.trim()
    if (duration === original) return
    updateMut.mutate({ id, duration })
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
  const commitPromo = (id: string) => {
    const raw = promoEdits[id]
    if (raw === undefined) return
    const digits = raw.replace(/\D/g, '')
    const promoNow = digits === '' ? null : parseInt(digits, 10)
    setPromoEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    updateMut.mutate({ id, promoNow })
  }
  const commitMinUnits = (id: string) => {
    const raw = minUnitEdits[id]
    if (raw === undefined) return
    const minUnits = Math.max(1, parseInt(raw.replace(/\D/g, ''), 10) || 1)
    setMinUnitEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    updateMut.mutate({ id, minUnits })
  }
  const commitPresets = (id: string) => {
    const raw = presetEdits[id]
    if (raw === undefined) return
    setPresetEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    updateMut.mutate({ id, unitPresets: raw.trim() ? raw : null })
  }
  const commitBonus = (id: string) => {
    const raw = bonusEdits[id]
    if (raw === undefined) return
    const beauticianBonus = Math.max(0, parseInt(raw.replace(/\D/g, ''), 10) || 0)
    setBonusEdits((cur) => {
      const next = { ...cur }
      delete next[id]
      return next
    })
    updateMut.mutate({ id, beauticianBonus })
  }
  const remove = (id: string) => deleteMut.mutate(id)
  const add = () => {
    const price = parseInt(draft.price.replace(/\D/g, ''), 10)
    if (!draft.name.trim() || !price) return
    createMut.mutate({
      name: draft.name.trim(),
      category: draft.category,
      duration: draft.duration,
      price,
      blurb: draft.blurb.trim(),
      blurbEn: draft.blurbEn.trim(),
    })
    setDraft({ name: '', category: 'Facial', duration: '60 min', price: '', blurb: '', blurbEn: '' })
    setAdding(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Kelola Katalog</span>
          <h1 className="mt-2 text-[2rem]">Treatment</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Ubah harga, deskripsi (ID & English), ketersediaan, best seller, dan promo. Pilih 1 best seller jadi “hero” di landing. {rows.length} treatment.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setAdding((v) => !v)}>
          {adding ? <X size={18} /> : <Plus size={18} />} {adding ? 'Tutup' : 'Tambah treatment'}
        </button>
      </div>

      {adding && (
        <div className="card-soft mt-5 p-5">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <input className={inp} placeholder="Nama treatment" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <select className={inp} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className={inp} placeholder="Durasi" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
            <input className={inp} inputMode="numeric" placeholder="Harga" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold" style={{ color: 'var(--color-ink-soft)' }}>Deskripsi (Bahasa Indonesia)</label>
              <textarea className={`${inp} h-20 w-full resize-none leading-relaxed`} placeholder="Cth: Membersihkan kotoran, minyak & sel kulit mati." value={draft.blurb} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold" style={{ color: 'var(--color-ink-soft)' }}>Deskripsi (English) <span style={{ color: 'var(--color-ink-muted)' }}>— opsional</span></label>
              <textarea className={`${inp} h-20 w-full resize-none leading-relaxed`} placeholder="E.g: Deep-cleanses dirt, oil & dead skin." value={draft.blurbEn} onChange={(e) => setDraft({ ...draft, blurbEn: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={add}>Simpan treatment</button>
          </div>
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
        <table className="stack w-full text-sm sm:min-w-[760px]">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Treatment</th>
              <th className="px-3 py-4 font-semibold">Gambar</th>
              <th className="px-3 py-4 font-semibold">Harga</th>
              <th className="px-3 py-4 font-semibold">Bonus BT</th>
              <th className="px-3 py-4 font-semibold">Tersedia</th>
              <th className="px-3 py-4 font-semibold">Best Seller</th>
              <th className="px-3 py-4 font-semibold">Promo</th>
              <th className="px-3 py-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                <td className="px-5 py-4">
                  <input
                    className="w-full max-w-[15rem] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 -ml-1.5 font-bold outline-none transition hover:border-[var(--color-line)] focus:border-[var(--color-gold)] focus:bg-[var(--color-cream)]"
                    value={nameEdits[r.id] ?? r.name}
                    onChange={(e) => setNameEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                    onBlur={() => commitName(r.id, r.name)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setNameEdits((cur) => { const n = { ...cur }; delete n[r.id]; return n }); e.currentTarget.blur() } }}
                    aria-label={`Nama treatment ${r.name}`}
                    title="Klik untuk mengubah nama treatment"
                  />
                  <div className="mt-1 flex items-center gap-1.5">
                    <select
                      value={r.category}
                      onChange={(e) => updateMut.mutate({ id: r.id, category: e.target.value })}
                      className="rounded-md border border-transparent bg-transparent py-0.5 pl-1 pr-0.5 -ml-1 text-[0.76rem] outline-none transition hover:border-[var(--color-line)] focus:border-[var(--color-gold)] focus:bg-[var(--color-cream)]"
                      style={{ color: 'var(--color-ink-muted)' }}
                      aria-label={`Kategori ${r.name}`}
                    >
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="text-[0.76rem]" style={{ color: 'var(--color-line)' }}>·</span>
                    <input
                      value={durationEdits[r.id] ?? r.duration}
                      onChange={(e) => setDurationEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                      onBlur={() => commitDuration(r.id, r.duration)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDurationEdits((cur) => { const n = { ...cur }; delete n[r.id]; return n }); e.currentTarget.blur() } }}
                      className="w-16 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[0.76rem] outline-none transition hover:border-[var(--color-line)] focus:border-[var(--color-gold)] focus:bg-[var(--color-cream)]"
                      style={{ color: 'var(--color-ink-muted)' }}
                      placeholder="mis. 90 min"
                      aria-label={`Durasi ${r.name}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubEdit(r)}
                    className="mt-1.5 inline-flex max-w-[15rem] items-center gap-1.5 rounded-md px-2 py-1 text-left text-[0.72rem] transition hover:bg-[var(--color-muted)]"
                    style={{ color: 'var(--color-ink-soft)' }}
                    aria-label={`Atur deskripsi ${r.name}`}
                    title="Atur deskripsi (Indonesia & English)"
                  >
                    <Languages size={13} className="shrink-0" style={{ color: 'var(--color-gold-deep)' }} />
                    <span className="truncate">{r.blurb || 'Tambah deskripsi…'}</span>
                    {r.blurbEn ? (
                      <span className="shrink-0 rounded-sm px-1 text-[0.6rem] font-bold" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}>EN</span>
                    ) : (
                      <span className="shrink-0 rounded-sm px-1 text-[0.6rem] font-bold" style={{ background: 'rgba(197,135,108,0.18)', color: 'var(--color-rose)' }}>+EN</span>
                    )}
                  </button>
                </td>
                <td data-label="Gambar" className="px-3 py-4">
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
                <td data-label="Harga" className="px-3 py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
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
                      {r.pricePerUnit && (
                        <span className="text-[0.78rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>/unit</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[0.72rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
                      <Switch on={r.pricePerUnit} onChange={() => patch(r.id, { pricePerUnit: !r.pricePerUnit })} label={`Harga per unit ${r.name}`} />
                      <span>Harga per unit</span>
                    </div>
                    {r.pricePerUnit && (
                      <div className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
                        <label className="flex items-center justify-between gap-2 text-[0.72rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
                          <span>Min. unit</span>
                          <input
                            className="mono w-16 rounded-md border bg-white px-2 py-1 text-right text-sm font-bold outline-none"
                            style={{ borderColor: 'var(--color-line)' }}
                            value={minUnitEdits[r.id] ?? String(r.minUnits)}
                            onChange={(e) => setMinUnitEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                            onBlur={() => commitMinUnits(r.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            inputMode="numeric"
                            aria-label={`Minimum unit ${r.name}`}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[0.72rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
                          <span>Pilihan cepat (unit = label)</span>
                          <input
                            className="w-full rounded-md border bg-white px-2 py-1 text-sm outline-none"
                            style={{ borderColor: 'var(--color-line)' }}
                            value={presetEdits[r.id] ?? serializePresets(r.unitPresets)}
                            onChange={(e) => setPresetEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                            onBlur={() => commitPresets(r.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            placeholder="cth: 50=daerah tertentu, 100=full face"
                            aria-label={`Pilihan cepat unit ${r.name}`}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </td>
                <td data-label="Bonus BT" className="px-3 py-4">
                  <div className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
                    <span className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
                    <input
                      className="mono w-20 bg-transparent text-sm font-bold outline-none"
                      value={bonusEdits[r.id] ?? (r.beauticianBonus ? r.beauticianBonus.toLocaleString('id-ID') : '0')}
                      onChange={(e) => setBonusEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                      onBlur={() => commitBonus(r.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      inputMode="numeric"
                      aria-label={`Bonus beautician ${r.name}`}
                    />
                  </div>
                </td>
                <td data-label="Tersedia" className="px-3 py-4"><Switch on={r.available} onChange={() => patch(r.id, { available: !r.available })} label={`Tersedia ${r.name}`} /></td>
                <td data-label="Best Seller" className="px-3 py-4">
                  <div className="flex flex-col gap-2">
                    <Switch on={r.bestSeller} onChange={() => patch(r.id, { bestSeller: !r.bestSeller })} label={`Best seller ${r.name}`} />
                    {r.bestSeller && (
                      <button
                        type="button"
                        onClick={() => patch(r.id, { heroFeatured: !r.heroFeatured })}
                        aria-pressed={r.heroFeatured}
                        aria-label={`Tampilkan ${r.name} di hero`}
                        title="Hanya 1 treatment yang tampil di hero section"
                        className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition"
                        style={
                          r.heroFeatured
                            ? { background: 'var(--grad-gold)', color: '#3a2c0f' }
                            : { border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }
                        }
                      >
                        <Star size={12} style={r.heroFeatured ? { fill: '#3a2c0f' } : undefined} />
                        {r.heroFeatured ? 'Tampil di hero' : 'Jadikan hero'}
                      </button>
                    )}
                  </div>
                </td>
                <td data-label="Promo" className="px-3 py-4">
                  <div className="flex flex-col gap-2">
                    <Switch on={r.promo} onChange={() => patch(r.id, { promo: !r.promo })} label={`Promo ${r.name}`} />
                    {r.promo && (
                      <div>
                        <div className="flex w-fit items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
                          <span className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
                          <input
                            className="mono w-24 bg-transparent text-sm font-bold outline-none"
                            value={promoEdits[r.id] ?? (r.promoPrice != null ? r.promoPrice.toLocaleString('id-ID') : '')}
                            onChange={(e) => setPromoEdits((cur) => ({ ...cur, [r.id]: e.target.value }))}
                            onBlur={() => commitPromo(r.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            inputMode="numeric"
                            placeholder="harga promo"
                            aria-label={`Harga promo ${r.name}`}
                          />
                        </div>
                        {r.promoPrice != null && r.promoPrice < r.price && (
                          <span className="mt-1 inline-block text-[0.68rem] font-semibold" style={{ color: 'var(--color-rose)' }}>
                            Hemat {Math.round(((r.price - r.promoPrice) / r.price) * 100)}% dari {r.price.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
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
        Perubahan harga, deskripsi, ketersediaan, promo, dan gambar tersimpan langsung ke database.
      </p>

      {imgEdit && <ImageDialog row={imgEdit} saving={updateMut.isPending} onClose={() => setImgEdit(null)} onSave={saveImage} />}
      {subEdit && <SubtitleDialog row={subEdit} saving={updateMut.isPending} onClose={() => setSubEdit(null)} onSave={saveSubtitle} />}
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

// Description editor — the short text shown under each treatment name on the
// public site. `blurb` = Indonesian (shown by default), `blurbEn` = English
// (shown when the visitor switches the site to English; falls back to `blurb`).
function SubtitleDialog({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: Row
  saving: boolean
  onClose: () => void
  onSave: (id: string, blurb: string, blurbEn: string | null) => void
}) {
  const [id, setId] = useState(row.blurb)
  const [en, setEn] = useState(row.blurbEn ?? '')

  const ta = `${inp} mt-2 block h-24 w-full resize-none leading-relaxed`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2">
            <Languages size={18} style={{ color: 'var(--color-gold)' }} />
            <span className="font-bold">Atur deskripsi — {row.name}</span>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 transition hover:opacity-100"><X size={18} /></button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-semibold">
            Deskripsi <span style={{ color: 'var(--color-ink-muted)' }}>(Bahasa Indonesia)</span>
          </label>
          <textarea
            className={ta}
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Cth: Membersihkan kotoran, minyak & sel kulit mati — wajah lebih segar."
          />

          <label className="mt-4 block text-sm font-semibold">
            Deskripsi <span style={{ color: 'var(--color-ink-muted)' }}>(English)</span>
          </label>
          <textarea
            className={ta}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="E.g: Deep-cleanses dirt, oil & dead skin — for a fresher, healthier face."
          />

          <p className="mt-3 rounded-xl px-4 py-3 text-[0.78rem] leading-relaxed" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-soft)' }}>
            Deskripsi Indonesia tampil secara default. Deskripsi English hanya tampil saat pengunjung memilih bahasa <strong>EN</strong> — kalau dikosongkan, versi Indonesia yang dipakai.
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button
              type="button"
              className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50"
              disabled={saving}
              onClick={() => onSave(row.id, id.trim(), en.trim() ? en.trim() : null)}
            >
              {saving ? 'Menyimpan…' : 'Simpan deskripsi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
