import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Percent, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { formatRp } from '../data/clinic'
import { ownerDoctorDetail, ownerRemoveDoctorTreatment, ownerSetDoctorTreatment } from '#/server/doctors'

export const Route = createFileRoute('/owner/dokter/$id')({ component: DoctorManage })

const fieldCls = 'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-gold)]'
const clampPct = (s: string) => Math.max(0, Math.min(100, parseInt(s || '0', 10) || 0))

function DoctorManage() {
  const { id } = Route.useParams()
  const qc = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: ['owner-doctor', id],
    queryFn: () => ownerDoctorDetail({ data: { id } }),
  })

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [addId, setAddId] = useState('')
  const [addPct, setAddPct] = useState('30')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['owner-doctor', id] })
    qc.invalidateQueries({ queryKey: ['owner-doctors'] })
    qc.invalidateQueries({ queryKey: ['doctor-profile'] })
  }

  const setMut = useMutation({
    mutationFn: (v: { treatmentId: string; sharePct: number }) =>
      ownerSetDoctorTreatment({ data: { doctorId: id, treatmentId: v.treatmentId, sharePct: v.sharePct } }),
    onSuccess: invalidate,
  })
  const removeMut = useMutation({
    mutationFn: (treatmentId: string) => ownerRemoveDoctorTreatment({ data: { doctorId: id, treatmentId } }),
    onSuccess: invalidate,
  })

  if (!isPending && data === null) {
    return (
      <div>
        <Link to="/owner/dokter" className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>
        <div className="card-soft mt-6 p-10 text-center"><p className="font-bold">Dokter tidak ditemukan</p></div>
      </div>
    )
  }
  if (!data) return <Link to="/owner/dokter" className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>

  const assignedIds = new Set(data.assigned.map((a) => a.treatmentId))
  const available = data.catalog.filter((t) => !assignedIds.has(t.id))

  const saveShare = (treatmentId: string) => setMut.mutate({ treatmentId, sharePct: clampPct(edits[treatmentId] ?? '') })
  const add = () => {
    if (!addId) return
    setMut.mutate({ treatmentId: addId, sharePct: clampPct(addPct) })
    setAddId('')
    setAddPct('30')
  }

  return (
    <div>
      <Link to="/owner/dokter" className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali ke daftar dokter</Link>

      <div className="card-soft mt-4 flex flex-wrap items-center gap-5 p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
          {data.doctor.name.replace(/^dr\.?\s*/i, '').charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl"><Stethoscope size={20} style={{ color: 'var(--color-gold-deep)' }} /> {data.doctor.name}</h1>
          <div className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>{data.doctor.email} · {data.doctor.phone || '—'}</div>
        </div>
      </div>

      {/* Add a treatment */}
      <div className="card-soft mt-6 p-5">
        <div className="flex items-center gap-2 text-sm font-bold"><Plus size={16} style={{ color: 'var(--color-gold-deep)' }} /> Tambah treatment</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className={`${fieldCls} min-w-[240px] flex-1`}>
            <option value="">Pilih treatment…</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>{t.category} · {t.name} ({formatRp(t.price)})</option>
            ))}
          </select>
          <div className="inline-flex items-center gap-1.5">
            <input type="number" min={0} max={100} value={addPct} onChange={(e) => setAddPct(e.target.value)} className={`${fieldCls} w-20`} />
            <Percent size={15} style={{ color: 'var(--color-ink-muted)' }} />
          </div>
          <button type="button" className="btn btn-gold px-4 py-2 text-sm disabled:opacity-50" disabled={!addId || setMut.isPending} onClick={add}>
            <Plus size={15} /> Tambah
          </button>
        </div>
      </div>

      {/* Assigned treatments */}
      <h2 className="mt-8 text-xl">Treatment &amp; bagi hasil ({data.assigned.length})</h2>
      {data.assigned.length === 0 ? (
        <div className="card-soft mt-4 p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada treatment. Tambahkan di atas.</p>
        </div>
      ) : (
        <div className="card-soft mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Treatment</th>
                <th className="px-3 py-3 font-semibold">Harga</th>
                <th className="px-3 py-3 font-semibold">Bagi hasil (%)</th>
                <th className="px-3 py-3 font-semibold">Per treatment</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.assigned.map((t) => {
                const val = edits[t.treatmentId] ?? String(t.sharePct)
                const dirty = clampPct(val) !== t.sharePct
                return (
                  <tr key={t.treatmentId} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{t.category}</div>
                    </td>
                    <td className="px-3 py-3 mono whitespace-nowrap" style={{ color: 'var(--color-ink-soft)' }}>{formatRp(t.price)}</td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => setEdits((cur) => ({ ...cur, [t.treatmentId]: e.target.value }))}
                        className={`${fieldCls} w-20`}
                      />
                    </td>
                    <td className="px-3 py-3 mono whitespace-nowrap" style={{ color: 'var(--color-gold-deep)' }}>
                      {formatRp(Math.round((t.price * clampPct(val)) / 100))}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-40" disabled={!dirty || setMut.isPending} onClick={() => saveShare(t.treatmentId)}>
                          <Check size={14} /> Simpan
                        </button>
                        <button type="button" aria-label="Hapus" className="btn btn-ghost px-2.5 py-1.5 text-xs" style={{ color: 'var(--color-rose)' }} onClick={() => removeMut.mutate(t.treatmentId)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
