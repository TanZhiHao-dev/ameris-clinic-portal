import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Camera, Check, GitCompareArrows, Images, Loader2, Rows3, Search, Trash2, UserPlus, X } from 'lucide-react'
import { createPhotoPatient, deletePhotoSet, listPatientPhotoSets, photoPatients, savePhotoSet } from '#/server/photos'
import { fileToCompressedDataUrl } from '#/lib/image'

type Patient = { id: string; name: string; phone: string }
type AngleKey = 'front' | 'left' | 'right'
const ANGLES: { key: AngleKey; label: string; hint: string }[] = [
  { key: 'front', label: 'Depan', hint: 'Hadap kamera' },
  { key: 'left', label: 'Serong Kiri', hint: '¾ kiri' },
  { key: 'right', label: 'Serong Kanan', hint: '¾ kanan' },
]

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'

// Before/After photo studio — shared by the admin console and the owner console.
// Flow: pick (or register) a patient → capture up to 3 standard angles tagged
// Before or After → it's saved with today's date and shown in a tidy history.
export function BeforeAfterStudio() {
  const qc = useQueryClient()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Dokumentasi</span>
          <h1 className="mt-2 text-[2rem]">Before / After</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Pilih pasien, ambil 3 angle (depan · serong kiri · serong kanan), tandai <b>Before</b> atau <b>After</b>. Otomatis tercatat tanggalnya.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PatientPicker patient={patient} onPick={setPatient} />
      </div>

      {patient && (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
          <CapturePanel
            patient={patient}
            onSaved={() => qc.invalidateQueries({ queryKey: ['patient-photo-sets', patient.id] })}
          />
          <GalleryPanel patient={patient} onZoom={setLightbox} />
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4" style={{ background: 'rgba(20,16,12,0.9)' }} onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.caption} className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="mt-3 flex items-center gap-3 text-sm" style={{ color: '#f6eddc' }}>
            <span>{lightbox.caption}</span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} onClick={() => setLightbox(null)}><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 1 — patient ──
function PatientPicker({ patient, onPick }: { patient: Patient | null; onPick: (p: Patient | null) => void }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', birth: '' })
  const [err, setErr] = useState('')

  const { data: results = [] } = useQuery({
    queryKey: ['photo-patients', q],
    queryFn: () => photoPatients({ data: { q } }),
    enabled: !patient && q.trim().length > 0,
  })

  const create = useMutation({
    mutationFn: () => createPhotoPatient({ data: { name: form.name.trim(), phone: form.phone.trim() || undefined, birthDate: form.birth || undefined } }),
    onSuccess: (p) => {
      onPick({ id: p.id, name: p.name, phone: p.phone })
      setAdding(false); setForm({ name: '', phone: '', birth: '' }); setQ('')
      qc.invalidateQueries({ queryKey: ['photo-patients'] })
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal menambah pasien.'),
  })

  if (patient) {
    return (
      <div className="card-soft flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>{patient.name.charAt(0)}</div>
          <div>
            <div className="font-bold">{patient.name}</div>
            {patient.phone && <div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{patient.phone}</div>}
          </div>
        </div>
        <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => onPick(null)}>Ganti pasien</button>
      </div>
    )
  }

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>1</span><h2 className="text-lg">Pilih pasien</h2></div>

      {adding ? (
        <div className="mt-4 flex flex-col gap-3">
          <input className={inp} placeholder="Nama pasien" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <input className={inp} placeholder="No. WhatsApp (opsional)" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={inp} type="date" value={form.birth} onChange={(e) => setForm({ ...form, birth: e.target.value })} />
          </div>
          {err && <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{err}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-gold px-4 py-2 text-sm disabled:opacity-50" disabled={create.isPending || form.name.trim().length < 2} onClick={() => { setErr(''); create.mutate() }}>
              {create.isPending ? 'Menyimpan…' : 'Simpan & pilih'}
            </button>
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={() => { setAdding(false); setErr('') }}>Batal</button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
            <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / no. HP pasien…" className="w-full bg-transparent text-sm outline-none" autoFocus />
          </div>
          {q.trim() && (
            <div className="mt-2 flex flex-col overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-line)' }}>
              {results.slice(0, 8).map((p) => (
                <button key={p.id} type="button" onClick={() => { onPick({ id: p.id, name: p.name, phone: p.phone }); setQ('') }}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--color-muted)]" style={{ borderBottom: '1px solid var(--color-line)' }}>
                  <span className="min-w-0"><span className="font-semibold">{p.name}</span>{p.phone && <span className="ml-2" style={{ color: 'var(--color-ink-muted)' }}>{p.phone}</span>}</span>
                  {p.sets > 0 && <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-semibold" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}>{p.sets} sesi · {p.lastPhoto}</span>}
                </button>
              ))}
              {results.length === 0 && <div className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Tidak ada pasien cocok.</div>}
            </div>
          )}
          <button type="button" className="btn btn-ghost mt-3 px-4 py-2 text-sm" onClick={() => { setAdding(true); setForm((f) => ({ ...f, name: q.trim() })) }}>
            <UserPlus size={15} /> Pasien belum terdaftar? Tambah
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 2 — capture ──
type Shots = Record<AngleKey, string | null>
const EMPTY_SHOTS: Shots = { front: null, left: null, right: null }

function CapturePanel({ patient, onSaved }: { patient: Patient; onSaved: () => void }) {
  const [phase, setPhase] = useState<'before' | 'after'>('before')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [shots, setShots] = useState<Shots>(EMPTY_SHOTS)
  const [busyAngle, setBusyAngle] = useState<AngleKey | null>(null)
  const [err, setErr] = useState('')
  const [flash, setFlash] = useState('')

  const filled = ANGLES.filter((a) => shots[a.key]).length

  const save = useMutation({
    mutationFn: () =>
      savePhotoSet({
        data: {
          patientId: patient.id,
          phase,
          label: label.trim() || undefined,
          note: note.trim() || undefined,
          frontImage: shots.front ?? undefined,
          leftImage: shots.left ?? undefined,
          rightImage: shots.right ?? undefined,
        },
      }),
    onSuccess: () => {
      setFlash(`Foto ${phase === 'before' ? 'Before' : 'After'} tersimpan.`)
      setShots(EMPTY_SHOTS); setNote('')
      onSaved()
      setTimeout(() => setFlash(''), 3500)
    },
    onError: (e) => setErr((e as Error)?.message || 'Gagal menyimpan foto.'),
  })

  const onPick = async (angle: AngleKey, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setBusyAngle(angle)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setShots((s) => ({ ...s, [angle]: dataUrl }))
    } catch (ex) {
      setErr((ex as Error)?.message || 'Gagal memproses gambar.')
    } finally {
      setBusyAngle(null)
    }
  }

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>2</span><h2 className="text-lg">Ambil foto</h2></div>

      {/* Phase */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['before', 'after'] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPhase(p)}
            className="rounded-xl py-2.5 text-sm font-bold transition"
            style={phase === p
              ? (p === 'before'
                ? { background: 'rgba(195,154,68,0.16)', border: '1.5px solid var(--color-gold)', color: 'var(--color-espresso)' }
                : { background: 'rgba(44,88,72,0.12)', border: '1.5px solid #2c5848', color: '#2c5848' })
              : { background: 'var(--color-shell)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)' }}>
            {p === 'before' ? 'Before (sebelum)' : 'After (sesudah)'}
          </button>
        ))}
      </div>

      {/* Label + note */}
      <input className={`${inp} mt-3`} placeholder="Area / treatment — mis. Wajah — Acne (opsional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <p className="mt-1 text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>Pakai label sama untuk Before & After biar otomatis berpasangan di riwayat.</p>

      {/* 3 angles */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {ANGLES.map((a) => (
          <AngleSlot key={a.key} angle={a} value={shots[a.key]} busy={busyAngle === a.key}
            onPick={(e) => onPick(a.key, e)} onClear={() => setShots((s) => ({ ...s, [a.key]: null }))} />
        ))}
      </div>

      <textarea className={`${inp} mt-3 h-16 resize-none`} placeholder="Catatan (opsional) — mis. sesi ke-2, area dahi" value={note} onChange={(e) => setNote(e.target.value)} />

      {err && <p className="mt-3 flex items-start gap-1.5 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}</p>}
      {flash && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#2c5848' }}><Check size={15} /> {flash}</p>}

      <button type="button" className="btn btn-gold mt-4 w-full disabled:opacity-50" disabled={filled === 0 || save.isPending || !!busyAngle}
        onClick={() => { setErr(''); save.mutate() }}>
        {save.isPending ? 'Menyimpan…' : `Simpan ${phase === 'before' ? 'Before' : 'After'}${filled ? ` · ${filled} foto` : ''}`}
      </button>
    </div>
  )
}

function AngleSlot({ angle, value, busy, onPick, onClear }: { angle: { key: AngleKey; label: string; hint: string }; value: string | null; busy: boolean; onPick: (e: ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl" style={{ background: 'var(--color-cream)', border: value ? '1.5px solid var(--color-gold)' : '1.5px dashed var(--color-line)' }}>
        {value ? (
          <>
            <img src={value} alt={angle.label} className="h-full w-full object-cover" />
            <button type="button" aria-label={`Hapus ${angle.label}`} onClick={onClear} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full" style={{ background: 'rgba(20,16,12,0.6)', color: '#fff' }}><X size={14} /></button>
            <button type="button" onClick={() => inputRef.current?.click()} className="absolute inset-x-1.5 bottom-1.5 rounded-lg py-1 text-[0.68rem] font-semibold" style={{ background: 'rgba(20,16,12,0.55)', color: '#fff' }}>Ganti</button>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="grid h-full w-full place-items-center gap-1 transition hover:bg-[var(--color-muted)]" disabled={busy}>
            {busy ? <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-gold-deep)' }} /> : <Camera size={22} style={{ color: 'var(--color-gold-deep)' }} />}
            <span className="text-[0.68rem]" style={{ color: 'var(--color-ink-muted)' }}>{busy ? 'Memproses…' : 'Ambil'}</span>
          </button>
        )}
      </div>
      <div className="mt-1 text-center">
        <div className="text-[0.76rem] font-semibold">{angle.label}</div>
        <div className="text-[0.64rem]" style={{ color: 'var(--color-ink-muted)' }}>{angle.hint}</div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
    </div>
  )
}

// ── Gallery / history ──
type PhotoSet = Awaited<ReturnType<typeof listPatientPhotoSets>>[number]

function GalleryPanel({ patient, onZoom }: { patient: Patient; onZoom: (v: { src: string; caption: string }) => void }) {
  const qc = useQueryClient()
  const [compare, setCompare] = useState(false)
  const { data: sets = [], isPending } = useQuery({ queryKey: ['patient-photo-sets', patient.id], queryFn: () => listPatientPhotoSets({ data: { patientId: patient.id } }) })

  const del = useMutation({
    mutationFn: (id: string) => deletePhotoSet({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-photo-sets', patient.id] }),
  })

  // Group by label for the compare view (before ↔ after under the same label).
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; before: PhotoSet[]; after: PhotoSet[] }>()
    for (const s of sets) {
      const key = s.label || '__none__'
      const g = m.get(key) ?? { label: s.label || 'Tanpa label', before: [], after: [] }
      ;(s.phase === 'before' ? g.before : g.after).push(s)
      m.set(key, g)
    }
    return [...m.values()]
  }, [sets])

  return (
    <div className="card-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Images size={18} style={{ color: 'var(--color-gold-deep)' }} /><h2 className="text-lg">Riwayat {patient.name.split(' ')[0]}</h2></div>
        {sets.length > 0 && (
          <div className="flex overflow-hidden rounded-full" style={{ border: '1px solid var(--color-line)' }}>
            <button type="button" onClick={() => setCompare(false)} className="flex items-center gap-1 px-3 py-1.5 text-[0.76rem] font-semibold" style={!compare ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { color: 'var(--color-ink-muted)' }}><Rows3 size={13} /> Linimasa</button>
            <button type="button" onClick={() => setCompare(true)} className="flex items-center gap-1 px-3 py-1.5 text-[0.76rem] font-semibold" style={compare ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { color: 'var(--color-ink-muted)' }}><GitCompareArrows size={13} /> Bandingkan</button>
          </div>
        )}
      </div>

      {isPending ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</p>
      ) : sets.length === 0 ? (
        <p className="mt-4 rounded-xl px-4 py-8 text-center text-sm" style={{ background: 'var(--color-cream)', color: 'var(--color-ink-muted)' }}>
          Belum ada foto. Ambil set <b>Before</b> dulu di panel kiri.
        </p>
      ) : compare ? (
        <div className="mt-4 flex flex-col gap-5">
          {groups.map((g, i) => (
            <CompareGroup key={i} group={g} onZoom={onZoom} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {sets.map((s) => (
            <SetCard key={s.id} set={s} onZoom={onZoom} onDelete={() => { if (confirm('Hapus set foto ini?')) del.mutate(s.id) }} deleting={del.isPending} />
          ))}
        </div>
      )}
    </div>
  )
}

function PhaseBadge({ phase }: { phase: 'before' | 'after' }) {
  const before = phase === 'before'
  return <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide" style={before ? { background: 'rgba(195,154,68,0.16)', color: 'var(--color-gold-deep)' } : { background: 'rgba(44,88,72,0.14)', color: '#2c5848' }}>{before ? 'Before' : 'After'}</span>
}

function Thumb({ src, caption, onZoom }: { src: string | null; caption: string; onZoom: (v: { src: string; caption: string }) => void }) {
  if (!src) return <div className="grid aspect-[3/4] place-items-center rounded-lg text-[0.62rem]" style={{ background: 'var(--color-cream)', border: '1px dashed var(--color-line)', color: 'var(--color-line)' }}>—</div>
  return <button type="button" onClick={() => onZoom({ src, caption })} className="aspect-[3/4] overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-line)' }}><img src={src} alt={caption} className="h-full w-full object-cover transition hover:scale-105" /></button>
}

function SetCard({ set, onZoom, onDelete, deleting }: { set: PhotoSet; onZoom: (v: { src: string; caption: string }) => void; onDelete: () => void; deleting: boolean }) {
  const cap = `${set.phase === 'before' ? 'Before' : 'After'}${set.label ? ` · ${set.label}` : ''} · ${set.date}`
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PhaseBadge phase={set.phase} />
          <span className="text-sm font-semibold">{set.label || 'Tanpa label'}</span>
          <span className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{set.date}</span>
        </div>
        <button type="button" aria-label="Hapus set" onClick={onDelete} disabled={deleting} style={{ color: 'var(--color-rose)' }}><Trash2 size={15} /></button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ANGLES.map((a) => <Thumb key={a.key} src={set[a.key]} caption={`${a.label} — ${cap}`} onZoom={onZoom} />)}
      </div>
      {set.note && <p className="mt-2 text-[0.74rem] italic" style={{ color: 'var(--color-ink-muted)' }}>{set.note}</p>}
    </div>
  )
}

// Side-by-side: latest Before vs latest After per angle, for one label.
function CompareGroup({ group, onZoom }: { group: { label: string; before: PhotoSet[]; after: PhotoSet[] }; onZoom: (v: { src: string; caption: string }) => void }) {
  const before = group.before[0] // sets are newest-first
  const after = group.after[0]
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
      <div className="mb-2 text-sm font-bold">{group.label}</div>
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-2">
        <div />
        {ANGLES.map((a) => <div key={a.key} className="text-center text-[0.66rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>{a.label}</div>)}

        <div className="flex items-center"><PhaseBadge phase="before" /></div>
        {ANGLES.map((a) => <Thumb key={a.key} src={before?.[a.key] ?? null} caption={`Before ${a.label} · ${before?.date ?? ''}`} onZoom={onZoom} />)}

        <div className="flex items-center"><PhaseBadge phase="after" /></div>
        {ANGLES.map((a) => <Thumb key={a.key} src={after?.[a.key] ?? null} caption={`After ${a.label} · ${after?.date ?? ''}`} onZoom={onZoom} />)}
      </div>
      {(!before || !after) && <p className="mt-2 text-[0.7rem]" style={{ color: 'var(--color-ink-muted)' }}>{!before ? 'Belum ada foto Before untuk label ini.' : 'Belum ada foto After — ambil saat kontrol berikutnya.'}</p>}
    </div>
  )
}
