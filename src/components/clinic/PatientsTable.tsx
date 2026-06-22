// Shared patient database table — used by the owner and doctor consoles.
// `basePath` controls where the "Detail" link points ('/owner' | '/dokter').
import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Search, UserPlus, X } from 'lucide-react'
import { fmtDate } from '../../data/owner'
import { createPatient, ownerPatients } from '#/server/patients'

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'

export function PatientsTable({ basePath }: { basePath: '/owner' | '/dokter' }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', phone: '', birthDate: '' })

  const { data: patients = [] } = useQuery({
    queryKey: ['owner-patients'],
    queryFn: () => ownerPatients({ data: {} }),
  })
  const list = patients.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q))

  const createMut = useMutation({
    mutationFn: (v: { name: string; phone?: string; birthDate?: string }) => createPatient({ data: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['owner-patients'] })
      navigate({ to: `${basePath}/pasien/$id`, params: { id: res.id } })
    },
  })

  const openAdd = (prefillName = '') => {
    setDraft({ name: prefillName, phone: '', birthDate: '' })
    setAdding(true)
  }
  const submit = () => {
    if (draft.name.trim().length < 2) return
    createMut.mutate({ name: draft.name.trim(), phone: draft.phone.trim() || undefined, birthDate: draft.birthDate || undefined })
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Pasien &amp; Rekam Medis</span>
          <h1 className="mt-2 text-[2rem]">Database pasien</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {patients.length} pasien terdaftar. Klik untuk melihat riwayat &amp; rekam medis.
          </p>
        </div>
        <button type="button" className="btn btn-gold px-4 py-2 text-sm" onClick={() => (adding ? setAdding(false) : openAdd())}>
          {adding ? <X size={16} /> : <UserPlus size={16} />} {adding ? 'Tutup' : 'Tambah pasien'}
        </button>
      </div>

      {/* New patient form */}
      {adding && (
        <div className="card-soft mt-5 p-5">
          <div className="flex items-center gap-2 text-sm font-bold"><UserPlus size={16} style={{ color: 'var(--color-gold-deep)' }} /> Pasien baru</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input className={inp} placeholder="Nama lengkap *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input className={inp} placeholder="Nomor telepon (opsional)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <input className={inp} type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} />
          </div>
          <button type="button" className="btn btn-primary mt-3 disabled:opacity-50" disabled={draft.name.trim().length < 2 || createMut.isPending} onClick={submit}>
            {createMut.isPending ? 'Menyimpan…' : 'Simpan & buka rekam medis'}
          </button>
        </div>
      )}

      <div className="mt-6 flex w-full max-w-sm items-center gap-2 rounded-full px-4 py-2.5" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
        <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau nomor…" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {/* Empty state when a search finds nothing → offer to add that patient */}
      {list.length === 0 ? (
        <div className="card-soft mt-5 flex flex-col items-center p-10 text-center">
          <UserPlus size={26} style={{ color: 'var(--color-gold-deep)' }} />
          <p className="mt-3 font-bold">Pasien tidak ditemukan</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {q ? `Tidak ada pasien cocok dengan "${q}".` : 'Belum ada pasien.'} Tambahkan sebagai pasien baru.
          </p>
          <button type="button" className="btn btn-gold mt-5" onClick={() => openAdd(q)}>
            <UserPlus size={16} /> Tambah {q ? `"${q}"` : 'pasien baru'}
          </button>
        </div>
      ) : (
        <div className="card-soft mt-5 overflow-x-auto">
          <table className="stack w-full text-sm sm:min-w-[720px]">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Pasien</th>
                <th className="px-3 py-4 font-semibold">Poin</th>
                <th className="px-3 py-4 font-semibold">Kunjungan</th>
                <th className="px-3 py-4 font-semibold">Terakhir</th>
                <th className="px-3 py-4" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t transition hover:bg-[var(--color-cream)]" style={{ borderColor: 'var(--color-line)' }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{p.phone || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Poin" className="px-3 py-4 mono font-bold gold-text">{p.points}</td>
                  <td data-label="Kunjungan" className="px-3 py-4">{p.visits}×</td>
                  <td data-label="Terakhir" className="px-3 py-4 whitespace-nowrap" style={{ color: 'var(--color-ink-soft)' }}>{fmtDate(p.lastVisit)}</td>
                  <td className="px-3 py-4 text-right">
                    <Link to={`${basePath}/pasien/$id`} params={{ id: p.id }} className="btn btn-ghost px-3 py-1.5 text-xs">
                      Detail <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
