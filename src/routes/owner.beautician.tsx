import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, HandHeart, Pencil, Plus, X } from 'lucide-react'
import { ownerBeauticians, ownerSaveBeautician } from '#/server/beauticians'

export const Route = createFileRoute('/owner/beautician')({ component: BeauticianAdmin })

type Row = Awaited<ReturnType<typeof ownerBeauticians>>[number]

function BeauticianAdmin() {
  const qc = useQueryClient()
  const { data: list = [], isError: listError, error: listErr, refetch } = useQuery({
    queryKey: ['owner-beauticians'],
    queryFn: () => ownerBeauticians(),
    retry: false,
  })

  const [name, setName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-beauticians'] })
  const save = useMutation({
    mutationFn: (v: { id?: string; name: string; isActive?: boolean }) => ownerSaveBeautician({ data: v }),
    onSuccess: () => { setErrMsg(null); refresh() },
    // Never fail silently — a swallowed error here is exactly why "klik tombol
    // tidak terjadi apapun" happened. Surface the server message.
    onError: (e) => setErrMsg((e as Error)?.message || 'Gagal menyimpan beautician. Coba lagi.'),
  })

  const add = () => {
    const n = name.trim()
    if (!n) return
    setErrMsg(null)
    save.mutate({ name: n })
    setName('')
  }
  const commitEdit = () => {
    const n = editName.trim()
    if (editId && n) save.mutate({ id: editId, name: n })
    setEditId(null)
    setEditName('')
  }

  const active = list.filter((b) => b.isActive)
  const inactive = list.filter((b) => !b.isActive)

  return (
    <div>
      <span className="eyebrow">Tim Klinik</span>
      <h1 className="mt-2 text-[2rem]">Beautician</h1>
      <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Daftar beautician yang menangani treatment. Saat menyelesaikan kunjungan di <b>Jadwal</b>, pilih siapa yang mengerjakan — bonus &amp; laporan otomatis mengikuti. Bonus per treatment diatur di menu <b>Treatment</b> (kolom “Bonus BT”).
      </p>

      {(errMsg || listError) && (
        <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {errMsg ?? `Gagal memuat daftar beautician: ${(listErr as Error)?.message ?? 'kesalahan tidak diketahui'}.`}
            {listError && (
              <button type="button" className="ml-1 font-bold underline" onClick={() => refetch()}>Coba lagi</button>
            )}
          </span>
        </div>
      )}

      {/* Add */}
      <div className="card-soft mt-6 flex flex-wrap items-center gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
          <HandHeart size={16} style={{ color: 'var(--color-gold-deep)' }} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            placeholder="Nama beautician baru…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button type="button" className="btn btn-gold" disabled={save.isPending || !name.trim()} onClick={add}>
          <Plus size={18} /> Tambah
        </button>
      </div>

      {/* Active list */}
      <div className="mt-6 flex flex-col gap-3">
        {active.length === 0 && (
          <div className="card-soft p-8 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Belum ada beautician aktif. Tambah lewat kolom di atas.
          </div>
        )}
        {active.map((b) => (
          <BeauticianCard
            key={b.id}
            b={b}
            editing={editId === b.id}
            editName={editName}
            setEditName={setEditName}
            onStartEdit={() => { setEditId(b.id); setEditName(b.name) }}
            onCommit={commitEdit}
            onCancel={() => { setEditId(null); setEditName('') }}
            onToggle={() => save.mutate({ id: b.id, name: b.name, isActive: !b.isActive })}
            busy={save.isPending}
          />
        ))}
      </div>

      {/* Inactive list */}
      {inactive.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-ink-muted)' }}>Nonaktif ({inactive.length})</h2>
          <div className="mt-3 flex flex-col gap-3">
            {inactive.map((b) => (
              <BeauticianCard
                key={b.id}
                b={b}
                editing={editId === b.id}
                editName={editName}
                setEditName={setEditName}
                onStartEdit={() => { setEditId(b.id); setEditName(b.name) }}
                onCommit={commitEdit}
                onCancel={() => { setEditId(null); setEditName('') }}
                onToggle={() => save.mutate({ id: b.id, name: b.name, isActive: !b.isActive })}
                busy={save.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BeauticianCard({
  b, editing, editName, setEditName, onStartEdit, onCommit, onCancel, onToggle, busy,
}: {
  b: Row
  editing: boolean
  editName: string
  setEditName: (v: string) => void
  onStartEdit: () => void
  onCommit: () => void
  onCancel: () => void
  onToggle: () => void
  busy: boolean
}) {
  return (
    <div className="card-soft flex flex-wrap items-center justify-between gap-3 p-4" style={b.isActive ? undefined : { opacity: 0.7 }}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
          {b.name.charAt(0).toUpperCase()}
        </div>
        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel() }}
            className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-gold)' }}
          />
        ) : (
          <div className="min-w-0">
            <div className="truncate font-bold">{b.name}</div>
            <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{b.isActive ? 'Aktif' : 'Nonaktif'}</div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button type="button" className="btn btn-gold px-3 py-2 text-sm" disabled={busy} onClick={onCommit}><Check size={15} /> Simpan</button>
            <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={onCancel}><X size={15} /></button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={onStartEdit}><Pencil size={15} /> Ubah</button>
            <button type="button" className="btn btn-ghost px-3 py-2 text-sm" disabled={busy} onClick={onToggle} style={{ color: b.isActive ? 'var(--color-rose)' : 'var(--color-gold-deep)' }}>
              {b.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
