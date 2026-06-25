import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Gift, Plus, Trash2 } from 'lucide-react'
import { listTreatmentsAdmin, updateTreatment } from '#/server/treatments'

export const Route = createFileRoute('/owner/privilege')({ component: PrivilegeAdmin })

// One row of the ['owner-treatments'] cache (shared with the Treatment page).
type AdminRow = Awaited<ReturnType<typeof listTreatmentsAdmin>>[number]

const inp =
  'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'
const fmtRp = (n: number) => 'Rp' + n.toLocaleString('id-ID')

function PrivilegeAdmin() {
  const qc = useQueryClient()
  // Shares the same cache key as the Treatment page so edits stay consistent
  // across both screens.
  const { data = [] } = useQuery({
    queryKey: ['owner-treatments'],
    queryFn: () => listTreatmentsAdmin(),
  })

  // The redeemable ladder = treatments with a point_cost, low → high (exactly
  // what the landing Loyalty section and the patient Privilege page render).
  const redeemable = data
    .filter((t) => t.pointCost != null)
    .sort((a, b) => (a.pointCost ?? 0) - (b.pointCost ?? 0))
  const available = data
    .filter((t) => t.pointCost == null)
    .sort((a, b) => a.name.localeCompare(b.name))

  // After any edit, refresh every place the ladder is shown: landing
  // (redeem-tiers), the patient app (privilege summary), and the public menu.
  const invalidatePublic = () => {
    for (const key of [['redeem-tiers'], ['treatments'], ['treatment'], ['loyalty-summary']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  const updateMut = useMutation({
    mutationFn: (v: { id: string; name?: string; pointCost?: number | null }) => updateTreatment({ data: v }),
    // Flip the owner cache immediately so name/points feel instant, then
    // reconcile with the row the server returns.
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['owner-treatments'] })
      const prev = qc.getQueryData<AdminRow[]>(['owner-treatments'])
      qc.setQueryData<AdminRow[]>(['owner-treatments'], (old) =>
        old?.map((t) =>
          t.id === v.id
            ? {
                ...t,
                ...(v.name !== undefined && { name: v.name }),
                ...(v.pointCost !== undefined && { pointCost: v.pointCost }),
              }
            : t,
        ),
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

  // Local edit buffers (commit on blur / Enter) so typing doesn't fire a save
  // per keystroke.
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({})
  const [pointEdits, setPointEdits] = useState<Record<string, string>>({})
  const [addId, setAddId] = useState('')
  const [addPoint, setAddPoint] = useState('')

  const commitName = (id: string, current: string) => {
    const raw = nameEdits[id]
    setNameEdits((c) => {
      const n = { ...c }
      delete n[id]
      return n
    })
    if (raw === undefined) return
    const name = raw.trim()
    if (!name || name === current) return
    updateMut.mutate({ id, name })
  }
  const commitPoint = (id: string) => {
    const raw = pointEdits[id]
    setPointEdits((c) => {
      const n = { ...c }
      delete n[id]
      return n
    })
    if (raw === undefined) return
    const digits = raw.replace(/\D/g, '')
    if (digits === '') return // empty → keep current (use the trash button to remove)
    updateMut.mutate({ id, pointCost: Math.max(1, parseInt(digits, 10)) })
  }
  const removeFromLadder = (id: string) => updateMut.mutate({ id, pointCost: null })
  const addToLadder = () => {
    if (!addId) return
    const digits = addPoint.replace(/\D/g, '')
    const pointCost = digits === '' ? 1 : Math.max(1, parseInt(digits, 10))
    updateMut.mutate({ id: addId, pointCost })
    setAddId('')
    setAddPoint('')
  }

  return (
    <div>
      <div>
        <span className="eyebrow inline-flex items-center gap-1.5">
          <Crown size={14} /> Ameris Privilege Club
        </span>
        <h1 className="mt-2 text-[2rem]">Penukaran Poin</h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Atur treatment apa saja yang bisa ditukar dengan poin Privilege, beserta jumlah poinnya. Perubahan langsung
          tampil di <strong>landing</strong> (section Privilege Club) dan di <strong>akun pasien</strong>. {redeemable.length} treatment aktif.
        </p>
      </div>

      {/* Add to ladder */}
      <div className="card-soft mt-6 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
          <Plus size={16} /> Tambah treatment ke daftar tukar poin
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <select className={inp} value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Pilih treatment">
            <option value="">Pilih treatment…</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {fmtRp(t.price)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)' }}>
            <input
              className="mono w-full bg-transparent py-2.5 text-sm font-bold outline-none"
              inputMode="numeric"
              placeholder="Jumlah poin"
              value={addPoint}
              onChange={(e) => setAddPoint(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addToLadder() }}
              aria-label="Jumlah poin"
            />
            <span className="text-[0.78rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>poin</span>
          </div>
          <button type="button" className="btn btn-gold" onClick={addToLadder} disabled={!addId || updateMut.isPending}>
            <Plus size={18} /> Tambah
          </button>
        </div>
        {available.length === 0 && (
          <p className="mt-2 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
            Semua treatment sudah masuk daftar tukar poin.
          </p>
        )}
      </div>

      {/* Active ladder */}
      <div className="mt-8 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
        <Gift size={16} /> Daftar tukar poin
      </div>

      {redeemable.length === 0 ? (
        <div className="card-soft mt-4 grid place-items-center p-10 text-center">
          <Gift size={28} style={{ color: 'var(--color-ink-muted)' }} />
          <p className="mt-3 text-sm font-semibold">Belum ada treatment yang bisa ditukar poin</p>
          <p className="mt-1 text-[0.82rem]" style={{ color: 'var(--color-ink-muted)' }}>
            Tambahkan treatment di atas untuk mulai mengisi ladder Privilege Club.
          </p>
        </div>
      ) : (
        <div className="card-soft mt-4 overflow-x-auto">
          <table className="stack w-full text-sm sm:min-w-[640px]">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Poin</th>
                <th className="px-3 py-4 font-semibold">Nama treatment</th>
                <th className="px-3 py-4 font-semibold">Harga normal</th>
                <th className="px-3 py-4" />
              </tr>
            </thead>
            <tbody>
              {redeemable.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td data-label="Poin" className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold"
                        style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
                      >
                        {t.pointCost}
                      </span>
                      <div className="flex items-center gap-1 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-line)', background: 'var(--color-cream)' }}>
                        <input
                          className="mono w-14 bg-transparent text-sm font-bold outline-none"
                          inputMode="numeric"
                          value={pointEdits[t.id] ?? String(t.pointCost ?? '')}
                          onChange={(e) => setPointEdits((cur) => ({ ...cur, [t.id]: e.target.value }))}
                          onBlur={() => commitPoint(t.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                          aria-label={`Poin untuk ${t.name}`}
                        />
                        <span className="text-[0.72rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>poin</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Nama" className="px-3 py-4">
                    <input
                      className={`${inp} w-full min-w-[12rem]`}
                      value={nameEdits[t.id] ?? t.name}
                      onChange={(e) => setNameEdits((cur) => ({ ...cur, [t.id]: e.target.value }))}
                      onBlur={() => commitName(t.id, t.name)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      aria-label={`Nama ${t.name}`}
                    />
                  </td>
                  <td data-label="Harga normal" className="px-3 py-4">
                    <span className="mono text-[0.82rem]" style={{ color: 'var(--color-ink-muted)' }}>{fmtRp(t.price)}</span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => removeFromLadder(t.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.74rem] font-semibold transition hover:bg-[var(--color-muted)]"
                      style={{ color: 'var(--color-rose)' }}
                      aria-label={`Keluarkan ${t.name} dari daftar tukar poin`}
                    >
                      <Trash2 size={14} /> Keluarkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
        Mengubah nama di sini juga mengubah nama treatment di seluruh situs (menu & landing). “Keluarkan” hanya menghapus
        treatment dari daftar tukar poin — treatment-nya tetap ada di menu.
      </p>
    </div>
  )
}
