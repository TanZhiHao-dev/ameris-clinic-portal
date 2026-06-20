// Shared patient detail + EMR view — used by the owner and doctor consoles.
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, ImagePlus, Plus, Stethoscope, X } from 'lucide-react'
import { BeforeAfter } from '../owner/BeforeAfter'
import { fmtDate, fmtDateLong, formatRp, type OwnerStatus, statusTone } from '../../data/owner'
import { createMedicalRecord, ownerPatient } from '#/server/patients'

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-gold)]'

export function PatientDetail({ id, basePath }: { id: string; basePath: '/owner' | '/dokter' }) {
  const qc = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['owner-patient', id],
    queryFn: () => ownerPatient({ data: { id } }),
  })

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ treatment: '', skin: '', notes: '' })

  const saveMut = useMutation({
    mutationFn: (v: { patientId: string; treatment: string; skin: string; notes: string }) => createMedicalRecord({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-patient', id] })
      setDraft({ treatment: '', skin: '', notes: '' })
      setAdding(false)
    },
  })

  if (!isPending && data === null) {
    return (
      <div>
        <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>
        <div className="card-soft mt-6 p-10 text-center"><p className="font-bold">Pasien tidak ditemukan</p></div>
      </div>
    )
  }

  const patient = data?.patient
  if (!patient) {
    return (
      <div>
        <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali</Link>
      </div>
    )
  }

  const history = (data?.history ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
  const records = (data?.records ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))

  const save = () => {
    if (!draft.treatment.trim() || !draft.notes.trim()) return
    saveMut.mutate({
      patientId: patient.id,
      treatment: draft.treatment.trim(),
      skin: draft.skin.trim(),
      notes: draft.notes.trim(),
    })
  }

  return (
    <div>
      <Link to={`${basePath}/pasien`} className="nav-link inline-flex items-center gap-1.5 text-sm"><ArrowLeft size={16} /> Kembali ke daftar pasien</Link>

      {/* Patient header */}
      <div className="card-soft mt-4 flex flex-wrap items-center gap-5 p-6">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            <span>{patient.phone}</span>
            <span>Lahir {fmtDate(patient.birthDate)}</span>
            <span>Member sejak {fmtDate(patient.joined)}</span>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Poin</div>
            <div className="mono text-2xl font-extrabold gold-text">{patient.points}</div>
          </div>
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Kunjungan</div>
            <div className="mono text-2xl font-extrabold gold-text">{patient.visits}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* History */}
        <div>
          <h2 className="text-xl">Riwayat booking</h2>
          <div className="mt-4 flex flex-col gap-3">
            {history.map((b) => (
              <div key={b.id} className="card-soft p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{fmtDate(b.date)} · {b.time}</span>
                  <span className="badge" style={{ background: statusTone[b.status as OwnerStatus].bg, color: statusTone[b.status as OwnerStatus].color }}>{b.status}</span>
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>{b.items.map((i) => i.name).join(', ')}</div>
                <div className="mono mt-1 text-sm font-bold gold-text">{formatRp(b.total)}</div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada riwayat.</p>}
          </div>
        </div>

        {/* EMR */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl"><Stethoscope size={20} style={{ color: 'var(--color-gold-deep)' }} /> Rekam Medis</h2>
            <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => setAdding((v) => !v)}>
              {adding ? <X size={16} /> : <Plus size={16} />} {adding ? 'Tutup' : 'Catatan baru'}
            </button>
          </div>

          {adding && (
            <div className="card-soft mt-4 flex flex-col gap-3 p-5">
              <input className={inp} placeholder="Treatment yang dilakukan" value={draft.treatment} onChange={(e) => setDraft({ ...draft, treatment: e.target.value })} />
              <input className={inp} placeholder="Kondisi kulit hari ini" value={draft.skin} onChange={(e) => setDraft({ ...draft, skin: e.target.value })} />
              <textarea className={inp} rows={3} placeholder="Catatan dokter/terapis…" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <div className="flex gap-3">
                {['Before', 'After'].map((l) => (
                  <div key={l} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed py-5 text-[0.78rem]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-ink-muted)' }}>
                    <ImagePlus size={18} /> Foto {l} <span className="text-[0.68rem]">(opsional)</span>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary self-start" onClick={save}>Simpan catatan</button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {records.length === 0 ? (
              <div className="card-soft flex flex-col items-center p-8 text-center">
                <FileText size={24} style={{ color: 'var(--color-ink-muted)' }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada rekam medis.</p>
              </div>
            ) : (
              records.map((m) => (
                <div key={m.id} className="card-soft p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{m.treatment}</span>
                    <span className="text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{fmtDateLong(m.date)}</span>
                  </div>
                  {m.skin && (
                    <div className="mt-2 text-sm">
                      <span className="font-semibold" style={{ color: 'var(--color-gold-deep)' }}>Kondisi kulit: </span>
                      <span style={{ color: 'var(--color-ink-soft)' }}>{m.skin}</span>
                    </div>
                  )}
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>{m.notes}</p>
                  <div className="my-4 hairline-gold" />
                  <BeforeAfter record={m} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
