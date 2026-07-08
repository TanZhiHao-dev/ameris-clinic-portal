import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, FileSpreadsheet, History, PackageOpen, Pencil, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { ownerArchiveItem, ownerImportInventory, ownerInventory, ownerItemMovements, ownerSaveItem, ownerStockMove } from '#/server/inventory'

const CATS = ['Alat', 'Bahan', 'Bahan - Treatment Baru', 'Skincare Retail', 'Obat', 'P3K & Emergency'] as const
type Cat = (typeof CATS)[number]
type Item = Awaited<ReturnType<typeof ownerInventory>>['items'][number]

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'
const fmtStock = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function InventoryManager() {
  const qc = useQueryClient()
  const [cat, setCat] = useState<'Semua' | Cat>('Semua')
  const [q, setQ] = useState('')
  const { data } = useQuery({ queryKey: ['owner-inventory'], queryFn: () => ownerInventory() })
  const items = data?.items ?? []
  const counts = data?.counts

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return items.filter((i) => (cat === 'Semua' || i.category === cat) && (!qq || i.name.toLowerCase().includes(qq) || i.spec.toLowerCase().includes(qq)))
  }, [items, cat, q])

  const [edit, setEdit] = useState<Item | 'new' | null>(null)
  const [move, setMove] = useState<{ item: Item; dir: 'in' | 'out' } | null>(null)
  const [history, setHistory] = useState<Item | null>(null)
  const [importing, setImporting] = useState(false)

  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-inventory'] })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Stok Klinik</span>
          <h1 className="mt-2 text-[2rem]">Inventory</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Alat · bahan · treatment baru · skincare retail · obat · P3K — dengan riwayat keluar-masuk penuh.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setImporting(true)}><FileSpreadsheet size={18} /> Import Excel</button>
          <button type="button" className="btn btn-gold" onClick={() => setEdit('new')}><Plus size={18} /> Tambah item</button>
        </div>
      </div>

      {/* Alert strip */}
      {counts && (counts.expired > 0 || counts.soon > 0 || counts.low > 0) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {counts.expired > 0 && <Alert tone="danger" icon={<TriangleAlert size={15} />} text={`${counts.expired} item kadaluarsa`} />}
          {counts.soon > 0 && <Alert tone="warn" icon={<Clock size={15} />} text={`${counts.soon} hampir kadaluarsa (≤60 hari)`} />}
          {counts.low > 0 && <Alert tone="warn" icon={<AlertTriangle size={15} />} text={`${counts.low} stok menipis`} />}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-2 rounded-full px-4 py-2.5" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
          <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari item…" className="w-full bg-transparent text-sm outline-none" />
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
        <table className="stack w-full text-sm sm:min-w-[720px]">
          <thead>
            <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
              <th className="px-5 py-4 font-semibold">Item</th>
              <th className="px-3 py-4 font-semibold">Kategori</th>
              <th className="px-3 py-4 font-semibold">Stok</th>
              <th className="px-3 py-4 font-semibold">Kadaluarsa</th>
              <th className="px-3 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada item. Tambah manual atau import dari Excel.</td></tr>
            ) : (
              list.map((it) => (
                <tr key={it.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td data-label="Item" className="px-5 py-4">
                    <div className="font-bold">{it.name}</div>
                    {it.spec && <div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{it.spec}</div>}
                    {it.notes && <div className="text-[0.72rem] italic" style={{ color: 'var(--color-ink-muted)' }}>{it.notes}</div>}
                  </td>
                  <td data-label="Kategori" className="px-3 py-4">{it.category}</td>
                  <td data-label="Stok" className="px-3 py-4">
                    <span className="mono text-base font-bold">{fmtStock(it.stock)}</span> <span style={{ color: 'var(--color-ink-muted)' }}>{it.unit}</span>
                    {it.low && <span className="ml-2 rounded-full px-2 py-0.5 text-[0.66rem] font-bold" style={{ background: 'var(--color-muted)', color: 'var(--color-rose)' }}>menipis</span>}
                    {it.rawCount && <div className="mono text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>asli: {it.rawCount}</div>}
                  </td>
                  <td data-label="Kadaluarsa" className="px-3 py-4">
                    {it.expiry ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span>{it.expiry}</span>
                        {it.expStatus === 'expired' && <Badge tone="danger">expired</Badge>}
                        {it.expStatus === 'soon' && <Badge tone="warn">≤60 hari</Badge>}
                      </span>
                    ) : <span style={{ color: 'var(--color-line)' }}>—</span>}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn label="Stok masuk" onClick={() => setMove({ item: it, dir: 'in' })}><ArrowUpCircle size={17} style={{ color: '#2c5848' }} /></IconBtn>
                      <IconBtn label="Stok keluar" onClick={() => setMove({ item: it, dir: 'out' })}><ArrowDownCircle size={17} style={{ color: 'var(--color-rose)' }} /></IconBtn>
                      <IconBtn label="Riwayat" onClick={() => setHistory(it)}><History size={16} style={{ color: 'var(--color-ink-muted)' }} /></IconBtn>
                      <IconBtn label="Edit" onClick={() => setEdit(it)}><Pencil size={15} style={{ color: 'var(--color-ink-muted)' }} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {edit && <ItemDialog item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />}
      {move && <MoveDialog item={move.item} dir={move.dir} onClose={() => setMove(null)} onDone={() => { setMove(null); refresh() }} />}
      {history && <HistoryDialog item={history} onClose={() => setHistory(null)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={() => { setImporting(false); refresh() }} />}
    </div>
  )
}

function Alert({ tone, icon, text }: { tone: 'danger' | 'warn'; icon: React.ReactNode; text: string }) {
  const c = tone === 'danger' ? { bg: 'rgba(179,73,47,0.1)', fg: 'var(--color-destructive)' } : { bg: 'rgba(197,135,108,0.14)', fg: 'var(--color-rose)' }
  return <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: c.bg, color: c.fg }}>{icon} {text}</span>
}
function Badge({ tone, children }: { tone: 'danger' | 'warn'; children: React.ReactNode }) {
  const c = tone === 'danger' ? { bg: 'rgba(179,73,47,0.12)', fg: 'var(--color-destructive)' } : { bg: 'rgba(197,135,108,0.16)', fg: 'var(--color-rose)' }
  return <span className="rounded-full px-2 py-0.5 text-[0.66rem] font-bold" style={{ background: c.bg, color: c.fg }}>{children}</span>
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)]">{children}</button>
}

function Modal({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2">{icon}<span className="font-bold">{title}</span></div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 transition hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ItemDialog({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: item?.name ?? '', category: (item?.category as Cat) ?? 'Alat', spec: item?.spec ?? '', unit: item?.unit ?? 'pcs',
    minStock: item ? String(item.minStock) : '0', rawCount: item?.rawCount ?? '', expiry: item?.expiry ?? '', notes: item?.notes ?? '', initialStock: '0',
  })
  const [err, setErr] = useState('')
  const save = useMutation({
    mutationFn: () => ownerSaveItem({ data: {
      id: item?.id, name: f.name.trim(), category: f.category, spec: f.spec.trim() || undefined, unit: f.unit.trim(),
      minStock: parseFloat(f.minStock) || 0, rawCount: f.rawCount.trim(), expiry: f.expiry.trim(), notes: f.notes.trim() || undefined,
      initialStock: item ? undefined : parseFloat(f.initialStock) || 0,
    } }),
    onSuccess: onSaved,
    onError: (e) => setErr((e as Error)?.message || 'Gagal menyimpan.'),
  })
  const archive = useMutation({
    mutationFn: () => ownerArchiveItem({ data: { id: item!.id, archived: true } }),
    onSuccess: onSaved,
    onError: (e) => setErr((e as Error)?.message || 'Gagal mengarsipkan.'),
  })
  return (
    <Modal title={item ? `Edit — ${item.name}` : 'Tambah item'} icon={<PackageOpen size={18} style={{ color: 'var(--color-gold)' }} />} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input className={inp} placeholder="Nama item" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Cat })}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <input className={inp} placeholder="Satuan (pcs/botol/…)" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
        </div>
        <input className={inp} placeholder="Spesifikasi / lini produk / kelompok (opsional)" value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          {!item && <input className={inp} inputMode="decimal" placeholder="Stok awal (angka)" value={f.initialStock} onChange={(e) => setF({ ...f, initialStock: e.target.value })} />}
          <input className={inp} placeholder="Stok tulisan asli (mis. 2 + 1 + 4)" value={f.rawCount} onChange={(e) => setF({ ...f, rawCount: e.target.value })} />
          <input className={inp} inputMode="decimal" placeholder="Batas stok menipis" value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} />
          <input className={inp} placeholder="Kadaluarsa (YYYY-MM)" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} />
        </div>
        <textarea className={`${inp} h-16 resize-none`} placeholder="Catatan (opsional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        {err && <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}
        <div className="flex items-center justify-between gap-3">
          {item ? (
            <button type="button" className="text-sm font-semibold disabled:opacity-50" style={{ color: 'var(--color-rose)' }} disabled={archive.isPending} onClick={() => { setErr(''); archive.mutate() }}>
              {archive.isPending ? 'Mengarsipkan…' : 'Arsipkan'}
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={save.isPending || f.name.trim().length < 1} onClick={() => { setErr(''); save.mutate() }}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function MoveDialog({ item, dir, onClose, onDone }: { item: Item; dir: 'in' | 'out'; onClose: () => void; onDone: () => void }) {
  const isIn = dir === 'in'
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState<'pembelian' | 'pemakaian' | 'penyesuaian'>(isIn ? 'pembelian' : 'pemakaian')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const mut = useMutation({
    mutationFn: () => ownerStockMove({ data: { itemId: item.id, delta: (isIn ? 1 : -1) * (parseFloat(amount) || 0), reason, note: note.trim() || undefined } }),
    onSuccess: onDone,
    onError: (e) => setErr((e as Error)?.message || 'Gagal.'),
  })
  const reasons = isIn ? (['pembelian', 'penyesuaian'] as const) : (['pemakaian', 'penyesuaian'] as const)
  return (
    <Modal title={`${isIn ? 'Stok masuk' : 'Stok keluar'} — ${item.name}`} icon={isIn ? <ArrowUpCircle size={18} style={{ color: 'var(--color-gold)' }} /> : <ArrowDownCircle size={18} style={{ color: 'var(--color-gold)' }} />} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>Stok sekarang: <b style={{ color: 'var(--color-ink)' }}>{fmtStock(item.stock)} {item.unit}</b></div>
        <label className="text-sm font-semibold">Jumlah {isIn ? 'masuk' : 'keluar'} ({item.unit})</label>
        <input className={inp} inputMode="decimal" autoFocus placeholder="cth: 10" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label className="text-sm font-semibold">Alasan</label>
        <div className="flex gap-2">
          {reasons.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className="flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition"
              style={reason === r ? { background: 'rgba(195,154,68,0.12)', border: '1.5px solid var(--color-gold)', color: 'var(--color-ink)' } : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>{r}</button>
          ))}
        </div>
        <input className={inp} placeholder="Catatan (opsional, mis. no. nota)" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={mut.isPending || !(parseFloat(amount) > 0)} onClick={() => { setErr(''); mut.mutate() }}>
            {mut.isPending ? 'Menyimpan…' : `Catat ${isIn ? 'masuk' : 'keluar'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function HistoryDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { data: moves = [], isPending } = useQuery({ queryKey: ['inv-moves', item.id], queryFn: () => ownerItemMovements({ data: { itemId: item.id } }) })
  return (
    <Modal title={`Riwayat — ${item.name}`} icon={<History size={18} style={{ color: 'var(--color-gold)' }} />} onClose={onClose}>
      {isPending ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</p>
      ) : moves.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada pergerakan stok.</p>
      ) : (
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {moves.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)' }}>
              <div>
                <div className="text-sm font-semibold capitalize">{m.reason}{m.note ? <span className="font-normal" style={{ color: 'var(--color-ink-muted)' }}> · {m.note}</span> : ''}</div>
                <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{new Date(m.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="text-right">
                <div className="mono font-bold" style={{ color: m.delta >= 0 ? '#2c5848' : 'var(--color-rose)' }}>{m.delta >= 0 ? '+' : ''}{fmtStock(m.delta)}</div>
                <div className="mono text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>→ {fmtStock(m.balanceAfter)} {item.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Excel import ──
const SHEET_CATEGORY: Record<string, Cat> = {
  alat: 'Alat',
  bahan: 'Bahan',
  'bahan - treatment baru': 'Bahan - Treatment Baru',
  'bahan treatment baru': 'Bahan - Treatment Baru',
  'skincare retail': 'Skincare Retail',
  skincare: 'Skincare Retail',
  obat: 'Obat',
  'p3k & emergency': 'P3K & Emergency',
  p3k: 'P3K & Emergency',
}
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, agt: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 }
function normalizeExpiry(raw: string): string | undefined {
  const s = raw.trim().toLowerCase()
  if (!s) return undefined
  const m = s.match(/([a-z]+|\d{1,2})[/\s-]+(\d{2,4})/)
  if (m) {
    const mo = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : MONTHS[m[1].slice(0, 3)]
    let yr = parseInt(m[2], 10)
    if (yr < 100) yr += 2000
    if (mo >= 1 && mo <= 12) return `${yr}-${String(mo).padStart(2, '0')}`
  }
  return raw.trim()
}
type ParsedRow = { category: Cat; name: string; spec?: string; unit?: string; stock?: number; rawCount?: string; expiry?: string; notes?: string }

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [parsing, setParsing] = useState(false)

  const parse = async (file: File) => {
    setErr(''); setParsing(true); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const out: ParsedRow[] = []
      for (const sheetName of wb.SheetNames) {
        const cat = SHEET_CATEGORY[sheetName.trim().toLowerCase()]
        if (!cat) continue
        const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[sheetName], { header: 1, blankrows: false })
        // The real header row carries a name/produk column AND a satuan/stok/total
        // column — this skips the title & subtitle rows (which also say "produk").
        const hIdx = aoa.findIndex((r) => {
          const cells = r.map((c) => (c == null ? '' : String(c)).trim().toLowerCase())
          const hasName = cells.some((c) => /^nama\b/.test(c) || c === 'produk')
          const hasQty = cells.some((c) => c === 'satuan' || c === 'total' || /^stok/.test(c))
          return hasName && hasQty
        })
        if (hIdx < 0) continue
        const header = aoa[hIdx].map((c) => (c == null ? '' : String(c)).trim().toLowerCase())
        const find = (pred: (h: string) => boolean) => header.findIndex(pred)
        // name = "Nama Item/Bahan/Obat" or (Skincare) "Produk"
        const iName = find((h) => /^nama\b/.test(h) || h === 'produk')
        // spec absorbs whichever grouping the sheet uses: Spesifikasi/Ukuran (Alat),
        // Lini Produk (Skincare), or Kelompok (P3K).
        const iSpec = find((h) => h.includes('spesifikasi') || h.includes('ukuran'))
        const iLini = find((h) => h.includes('lini'))
        const iKelompok = find((h) => h.includes('kelompok'))
        const iTotal = find((h) => h === 'total')
        const iStok = find((h) => /^stok/.test(h))
        const iUnit = find((h) => h.includes('satuan'))
        const iExp = find((h) => h.startsWith('exp'))
        const iNote = find((h) => h.includes('catatan'))
        const num = (v: unknown): number | undefined =>
          typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && /^\d+([.,]\d+)?$/.test(v.trim()) ? parseFloat(v.replace(',', '.')) : undefined
        const cell = (i: number, row: (string | number | null)[]) => (i >= 0 && row[i] != null ? String(row[i]).trim() : '')
        for (let r = hIdx + 1; r < aoa.length; r++) {
          const row = aoa[r]
          const name = cell(iName, row)
          if (!name) continue
          const spec = cell(iSpec, row) || cell(iLini, row) || cell(iKelompok, row)
          // Keep the handwritten tally only when it isn't already a plain number.
          const stokStr = cell(iStok, row)
          const rawCount = stokStr && !/^\d+([.,]\d+)?$/.test(stokStr) ? stokStr : ''
          out.push({
            category: cat,
            name,
            spec: spec || undefined,
            unit: cell(iUnit, row) || undefined,
            stock: num(iTotal >= 0 ? row[iTotal] : undefined) ?? num(iStok >= 0 ? row[iStok] : undefined),
            rawCount: rawCount || undefined,
            expiry: iExp >= 0 && row[iExp] != null ? normalizeExpiry(String(row[iExp])) : undefined,
            notes: cell(iNote, row) || undefined,
          })
        }
      }
      if (out.length === 0) throw new Error('Tidak menemukan data. Pastikan tiap sheet bernama sesuai kategori (Alat, Bahan, Skincare Retail, Obat, P3K & Emergency, …) dengan kolom "Nama…"/"Produk".')
      setRows(out)
    } catch (e) {
      setErr((e as Error)?.message || 'Gagal membaca file Excel.')
    } finally {
      setParsing(false)
    }
  }

  const doImport = useMutation({
    mutationFn: () => ownerImportInventory({ data: { rows: rows! } }),
    onSuccess: (r) => { setResult(r); },
    onError: (e) => setErr((e as Error)?.message || 'Gagal import.'),
  })
  const [result, setResult] = useState<{ created: number; updated: number; unchanged: number; total: number } | null>(null)

  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rows ?? []) m[r.category] = (m[r.category] ?? 0) + 1
    return m
  }, [rows])

  return (
    <Modal title="Import dari Excel" icon={<FileSpreadsheet size={18} style={{ color: 'var(--color-gold)' }} />} onClose={onClose}>
      {result ? (
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(44,88,72,0.14)', color: '#2c5848' }}><FileSpreadsheet size={22} /></div>
          <p className="mt-3 font-bold">Import selesai</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>{result.created} item baru · {result.updated} stok diperbarui · {result.unchanged} tanpa perubahan (dari {result.total} baris).</p>
          <button type="button" className="btn btn-gold mt-5 w-full" onClick={onDone}>Selesai</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-8 text-sm transition hover:bg-[var(--color-cream)]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-muted)' }}>
            <FileSpreadsheet size={26} style={{ color: 'var(--color-gold-deep)' }} />
            {fileName ? <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{fileName}</span> : <span>Pilih file .xlsx (Stock Opname)</span>}
            <span className="text-[0.72rem]">Sheet: Alat · Bahan · Bahan - Treatment Baru · Skincare Retail · Obat · P3K &amp; Emergency</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parse(f) }} />
          </label>

          {parsing && <p className="text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Membaca file…</p>}
          {err && <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{err}</p>}

          {rows && (
            <div className="rounded-xl p-4" style={{ background: 'var(--color-cream)' }}>
              <p className="text-sm font-bold">{rows.length} item terbaca</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
                {Object.entries(byCat).map(([c, n]) => <span key={c} className="rounded-full px-2.5 py-0.5" style={{ background: 'var(--color-shell)' }}>{c}: {n}</span>)}
              </div>
              <p className="mt-2 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>Item yang sudah ada akan disesuaikan stoknya (tercatat sebagai “opname”), item baru ditambahkan.</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={!rows || doImport.isPending} onClick={() => { setErr(''); doImport.mutate() }}>
              {doImport.isPending ? 'Mengimpor…' : `Import ${rows?.length ?? 0} item`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
