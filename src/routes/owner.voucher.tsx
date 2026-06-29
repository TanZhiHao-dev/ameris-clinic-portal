import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Ticket, Trash2, X } from 'lucide-react'
import {
  createVoucher,
  deleteVoucher,
  listVouchersAdmin,
  searchVoucherUsers,
  updateVoucher,
} from '#/server/vouchers'
import { listTreatmentsAdmin } from '#/server/treatments'

export const Route = createFileRoute('/owner/voucher')({ component: VoucherAdmin })

type VoucherRow = Awaited<ReturnType<typeof listVouchersAdmin>>[number]

const inp =
  'rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'
const fmtRp = (n: number) => 'Rp' + n.toLocaleString('id-ID')

const discountLabel = (v: { discountType: 'pct' | 'amount'; discountValue: number }) =>
  v.discountType === 'pct' ? `${v.discountValue}%` : fmtRp(v.discountValue)

const AUDIENCE: Record<VoucherRow['audience'], string> = {
  new_user: 'Member baru',
  all: 'Semua user',
  specific: 'User tertentu',
}

function VoucherAdmin() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['owner-vouchers'], queryFn: () => listVouchersAdmin() })
  const [editing, setEditing] = useState<VoucherRow | null>(null)
  const [creating, setCreating] = useState(false)

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVoucher({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-vouchers'] }),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['owner-vouchers'] })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow inline-flex items-center gap-1.5">
            <Ticket size={14} /> Voucher
          </span>
          <h1 className="mt-2 text-[2rem]">Voucher Diskon</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Buat voucher diskon yang otomatis muncul di checkout untuk audiens yang kamu pilih. Voucher tidak berlaku untuk
            treatment yang sedang promo — harga promo tetap utuh.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setCreating(true)}>
          <Plus size={18} /> Buat Voucher
        </button>
      </div>

      {data.length === 0 ? (
        <div className="card-soft mt-6 grid place-items-center p-10 text-center">
          <Ticket size={28} style={{ color: 'var(--color-ink-muted)' }} />
          <p className="mt-3 text-sm font-semibold">Belum ada voucher</p>
          <p className="mt-1 text-[0.82rem]" style={{ color: 'var(--color-ink-muted)' }}>
            Buat voucher pertama untuk memberi diskon ke member baru atau pelanggan tertentu.
          </p>
        </div>
      ) : (
        <div className="card-soft mt-6 overflow-x-auto">
          <table className="stack w-full text-sm sm:min-w-[760px]">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Voucher</th>
                <th className="px-3 py-4 font-semibold">Diskon</th>
                <th className="px-3 py-4 font-semibold">Audiens</th>
                <th className="px-3 py-4 font-semibold">Berlaku</th>
                <th className="px-3 py-4 font-semibold">Dipakai</th>
                <th className="px-3 py-4 font-semibold">Status</th>
                <th className="px-3 py-4" />
              </tr>
            </thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                  <td data-label="Voucher" className="px-5 py-4">
                    <div className="font-semibold">{v.name}</div>
                    <div className="text-[0.74rem]" style={{ color: 'var(--color-ink-muted)' }}>
                      {v.appliesToAllNormal ? 'Semua treatment normal' : `${v.treatmentIds.length} treatment terpilih`}
                    </div>
                  </td>
                  <td data-label="Diskon" className="px-3 py-4">
                    <span className="mono font-bold gold-text">{discountLabel(v)}</span>
                    {v.minSpend > 0 && (
                      <div className="text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>min {fmtRp(v.minSpend)}</div>
                    )}
                  </td>
                  <td data-label="Audiens" className="px-3 py-4">
                    {AUDIENCE[v.audience]}
                    {v.audience === 'specific' && (
                      <span className="text-[0.74rem]" style={{ color: 'var(--color-ink-muted)' }}> · {v.users.length} org</span>
                    )}
                    {v.audience === 'new_user' && (
                      <span className="text-[0.74rem]" style={{ color: 'var(--color-ink-muted)' }}> · {v.newUserWindowDays} hari</span>
                    )}
                  </td>
                  <td data-label="Berlaku" className="px-3 py-4 text-[0.82rem]" style={{ color: 'var(--color-ink-muted)' }}>
                    {v.validFrom || v.validUntil ? `${v.validFrom || '…'} → ${v.validUntil || '…'}` : 'Tanpa batas tanggal'}
                  </td>
                  <td data-label="Dipakai" className="px-3 py-4">
                    <span className="mono">{v.redemptionCount}×</span>
                  </td>
                  <td data-label="Status" className="px-3 py-4">
                    <span
                      className="rounded-full px-2.5 py-1 text-[0.72rem] font-semibold"
                      style={
                        v.isActive
                          ? { background: 'rgba(22,163,74,0.12)', color: '#15803d' }
                          : { background: 'var(--color-muted)', color: 'var(--color-ink-muted)' }
                      }
                    >
                      {v.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(v)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.74rem] font-semibold transition hover:bg-[var(--color-muted)]"
                        aria-label={`Edit ${v.name}`}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Hapus voucher "${v.name}"? Riwayat pemakaiannya juga ikut terhapus.`)) deleteMut.mutate(v.id) }}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.74rem] font-semibold transition hover:bg-[var(--color-muted)]"
                        style={{ color: 'var(--color-rose)' }}
                        aria-label={`Hapus ${v.name}`}
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <VoucherDialog
          voucher={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { refresh(); setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function VoucherDialog({
  voucher,
  onClose,
  onSaved,
}: {
  voucher?: VoucherRow
  onClose: () => void
  onSaved: () => void
}) {
  const { data: treatments = [] } = useQuery({
    queryKey: ['owner-treatments'],
    queryFn: () => listTreatmentsAdmin(),
  })

  const [form, setForm] = useState({
    name: voucher?.name ?? '',
    discountType: (voucher?.discountType ?? 'pct') as 'pct' | 'amount',
    discountValue: voucher ? String(voucher.discountValue) : '',
    audience: (voucher?.audience ?? 'new_user') as 'new_user' | 'all' | 'specific',
    appliesToAllNormal: voucher?.appliesToAllNormal ?? false,
    newUserWindowDays: String(voucher?.newUserWindowDays ?? 7),
    minSpend: voucher?.minSpend ? String(voucher.minSpend) : '',
    validFrom: voucher?.validFrom ?? '',
    validUntil: voucher?.validUntil ?? '',
    maxUsesPerUser: String(voucher?.maxUsesPerUser ?? 1),
    isActive: voucher?.isActive ?? true,
    treatmentIds: voucher?.treatmentIds ?? ([] as string[]),
    users: (voucher?.users ?? []) as { id: string; name: string }[],
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const [treatmentFilter, setTreatmentFilter] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const { data: userResults = [] } = useQuery({
    queryKey: ['voucher-user-search', userQuery],
    queryFn: () => searchVoucherUsers({ data: { q: userQuery } }),
    enabled: form.audience === 'specific' && userQuery.trim().length >= 2,
  })

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: Math.max(1, parseInt(form.discountValue.replace(/\D/g, '') || '0', 10)),
        audience: form.audience,
        appliesToAllNormal: form.appliesToAllNormal,
        newUserWindowDays: Math.min(365, Math.max(1, parseInt(form.newUserWindowDays.replace(/\D/g, '') || '7', 10))),
        minSpend: Math.max(0, parseInt(form.minSpend.replace(/\D/g, '') || '0', 10)),
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
        maxUsesPerUser: Math.max(1, parseInt(form.maxUsesPerUser.replace(/\D/g, '') || '1', 10)),
        isActive: form.isActive,
        treatmentIds: form.appliesToAllNormal ? [] : form.treatmentIds,
        userIds: form.audience === 'specific' ? form.users.map((u) => u.id) : [],
      }
      return voucher ? updateVoucher({ data: { id: voucher.id, ...payload } }) : createVoucher({ data: payload })
    },
    onSuccess: onSaved,
  })

  const pctValue = parseInt(form.discountValue.replace(/\D/g, '') || '0', 10)
  const valid =
    form.name.trim().length >= 2 &&
    pctValue > 0 &&
    (form.discountType !== 'pct' || pctValue <= 100) &&
    (form.appliesToAllNormal || form.treatmentIds.length > 0) &&
    (form.audience !== 'specific' || form.users.length > 0)

  const toggleTreatment = (id: string) =>
    set({
      treatmentIds: form.treatmentIds.includes(id)
        ? form.treatmentIds.filter((t) => t !== id)
        : [...form.treatmentIds, id],
    })

  const filtered = treatments.filter((t) => t.name.toLowerCase().includes(treatmentFilter.trim().toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div className="card-soft flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <span className="font-bold">{voucher ? 'Edit Voucher' : 'Buat Voucher Baru'}</span>
          <button type="button" aria-label="Tutup" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Name */}
          <label className="block">
            <span className="text-sm font-semibold">Nama voucher *</span>
            <input className={`${inp} mt-1 w-full`} placeholder="mis. Diskon Member Baru" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </label>

          {/* Discount type + value */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Tipe diskon *</span>
              <select className={`${inp} mt-1 w-full`} value={form.discountType} onChange={(e) => set({ discountType: e.target.value as 'pct' | 'amount' })}>
                <option value="pct">Persentase (%)</option>
                <option value="amount">Nominal (Rp)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Nilai diskon *</span>
              <div className="mt-1 flex items-center gap-1 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)' }}>
                {form.discountType === 'amount' && <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>}
                <input
                  className="mono w-full bg-transparent py-2.5 text-sm font-bold outline-none"
                  inputMode="numeric"
                  placeholder={form.discountType === 'pct' ? '20' : '50000'}
                  value={form.discountValue}
                  onChange={(e) => set({ discountValue: e.target.value })}
                />
                {form.discountType === 'pct' && <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>%</span>}
              </div>
            </label>
          </div>

          {/* Minimum transaction */}
          <label className="block">
            <span className="text-sm font-semibold">Minimum transaksi (opsional)</span>
            <div className="mt-1 flex items-center gap-1 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)', maxWidth: '16rem' }}>
              <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Rp</span>
              <input
                className="mono w-full bg-transparent py-2.5 text-sm font-bold outline-none"
                inputMode="numeric"
                placeholder="0 = tanpa minimum"
                value={form.minSpend}
                onChange={(e) => set({ minSpend: e.target.value })}
              />
            </div>
            <span className="mt-1 block text-[0.74rem]" style={{ color: 'var(--color-ink-muted)' }}>
              Voucher hanya terpakai jika total treatment pasien mencapai nominal ini.
            </span>
          </label>

          {/* Audience */}
          <div>
            <span className="text-sm font-semibold">Siapa yang bisa pakai? *</span>
            <div className="mt-2 grid gap-2">
              {(['new_user', 'all', 'specific'] as const).map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: form.audience === a ? 'var(--color-gold)' : 'var(--color-line)' }}>
                  <input type="radio" name="audience" checked={form.audience === a} onChange={() => set({ audience: a })} />
                  <span className="text-sm">{AUDIENCE[a]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* new_user window */}
          {form.audience === 'new_user' && (
            <label className="block">
              <span className="text-sm font-semibold">Berlaku berapa hari setelah daftar?</span>
              <div className="mt-1 flex items-center gap-1 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)', maxWidth: '12rem' }}>
                <input className="mono w-full bg-transparent py-2.5 text-sm font-bold outline-none" inputMode="numeric" value={form.newUserWindowDays} onChange={(e) => set({ newUserWindowDays: e.target.value })} />
                <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>hari</span>
              </div>
            </label>
          )}

          {/* specific user search */}
          {form.audience === 'specific' && (
            <div>
              <span className="text-sm font-semibold">Cari & pilih user</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)' }}>
                <Search size={15} style={{ color: 'var(--color-ink-muted)' }} />
                <input className="w-full bg-transparent py-2.5 text-sm outline-none" placeholder="Ketik nama / no. WA…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
              </div>
              {userResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--color-line)' }}>
                  {userResults.map((u) => {
                    const picked = form.users.some((x) => x.id === u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => !picked && set({ users: [...form.users, { id: u.id, name: u.name }] })}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-[var(--color-muted)] disabled:opacity-40"
                        disabled={picked}
                      >
                        <span>{u.name}</span>
                        <span className="text-[0.74rem]" style={{ color: 'var(--color-ink-muted)' }}>{u.phone || (picked ? 'sudah dipilih' : '')}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {form.users.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.users.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.74rem]" style={{ background: 'var(--color-muted)' }}>
                      {u.name}
                      <button type="button" aria-label={`Hapus ${u.name}`} onClick={() => set({ users: form.users.filter((x) => x.id !== u.id) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Treatment scope */}
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.appliesToAllNormal} onChange={(e) => set({ appliesToAllNormal: e.target.checked })} />
              <span className="text-sm font-semibold">Berlaku untuk semua treatment harga normal</span>
            </label>
            {!form.appliesToAllNormal && (
              <div className="mt-2">
                <span className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>Pilih treatment yang berlaku ({form.treatmentIds.length} dipilih)</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: 'var(--color-line)', background: 'var(--color-cream)' }}>
                  <Search size={15} style={{ color: 'var(--color-ink-muted)' }} />
                  <input className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Cari treatment…" value={treatmentFilter} onChange={(e) => setTreatmentFilter(e.target.value)} />
                </div>
                <div className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-xl border p-2 sm:grid-cols-2" style={{ borderColor: 'var(--color-line)' }}>
                  {filtered.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--color-muted)]">
                      <input type="checkbox" checked={form.treatmentIds.includes(t.id)} onChange={() => toggleTreatment(t.id)} />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{fmtRp(t.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Validity dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Mulai berlaku (opsional)</span>
              <input className={`${inp} mt-1 w-full`} type="date" value={form.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Berakhir (opsional)</span>
              <input className={`${inp} mt-1 w-full`} type="date" value={form.validUntil} onChange={(e) => set({ validUntil: e.target.value })} />
            </label>
          </div>

          {/* Max uses + active */}
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Maksimal pakai per user</span>
              <input className={`${inp} mono mt-1 w-full`} inputMode="numeric" value={form.maxUsesPerUser} onChange={(e) => set({ maxUsesPerUser: e.target.value })} />
            </label>
            <label className="flex cursor-pointer items-center gap-2 pt-5">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
              <span className="text-sm font-semibold">Voucher aktif</span>
            </label>
          </div>

          {mut.error instanceof Error && (
            <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--color-rose)' }}>
              {mut.error.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
          <button type="button" className="btn btn-ghost px-5 py-2 text-sm" onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Menyimpan…' : voucher ? 'Simpan Perubahan' : 'Buat Voucher'}
          </button>
        </div>
      </div>
    </div>
  )
}
