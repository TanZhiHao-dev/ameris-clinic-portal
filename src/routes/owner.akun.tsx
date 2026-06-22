import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Plus, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { fmtDate } from '../data/owner'
import {
  ownerCreateAccount,
  ownerDeleteAccount,
  ownerListAccounts,
  ownerUpdateAccount,
} from '#/server/accounts'

export const Route = createFileRoute('/owner/akun')({ component: AccountsAdmin })

type Role = 'owner' | 'dokter' | 'pasien'
type Account = {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  birthDate: string
  points: number
  bookingCount: number
  joined: string
}

const ROLE_META: Record<Role, { label: string; bg: string; color: string }> = {
  owner: { label: 'Owner', bg: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' },
  dokter: { label: 'Dokter', bg: 'rgba(47,111,106,0.14)', color: '#2f6f6a' },
  pasien: { label: 'Pasien', bg: 'rgba(140,124,106,0.16)', color: 'var(--color-ink-soft)' },
}
const ROLE_FILTERS = ['Semua', 'owner', 'dokter', 'pasien'] as const

const inp = 'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-gold)]'

function AccountsAdmin() {
  const qc = useQueryClient()
  const { data: session } = authClient.useSession()
  const myId = session?.user?.id

  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('Semua')
  const [editing, setEditing] = useState<Account | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDel, setConfirmDel] = useState<Account | null>(null)

  const { data: accounts = [] } = useQuery({
    queryKey: ['owner-accounts'],
    queryFn: () => ownerListAccounts({ data: {} }),
  })

  // Changing accounts ripples into the patient/doctor/dashboard views too.
  const invalidate = () => {
    for (const key of [['owner-accounts'], ['owner-patients'], ['owner-doctors'], ['owner-dashboard']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => ownerDeleteAccount({ data: { id } }),
    onSuccess: () => {
      invalidate()
      setConfirmDel(null)
    },
  })

  const counts = {
    owner: accounts.filter((a) => a.role === 'owner').length,
    dokter: accounts.filter((a) => a.role === 'dokter').length,
    pasien: accounts.filter((a) => a.role === 'pasien').length,
  }

  const ql = q.trim().toLowerCase()
  const list = accounts.filter((a) => {
    if (roleFilter !== 'Semua' && a.role !== roleFilter) return false
    if (!ql) return true
    return a.name.toLowerCase().includes(ql) || a.email.toLowerCase().includes(ql) || a.phone.includes(ql)
  })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Kelola Akun</span>
          <h1 className="mt-2 text-[2rem]">Akun &amp; akses</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {accounts.length} akun — {counts.owner} owner · {counts.dokter} dokter · {counts.pasien} pasien.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setCreating(true)}>
          <Plus size={18} /> Tambah akun
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-2 rounded-full px-4 py-2.5" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
          <Search size={16} style={{ color: 'var(--color-ink-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, atau telepon…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((r) => {
            const active = roleFilter === r
            const label = r === 'Semua' ? 'Semua' : ROLE_META[r].label
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className="rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition"
                style={active ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {list.length === 0 ? (
        <div className="card-soft mt-5 flex flex-col items-center p-10 text-center">
          <UserPlus size={26} style={{ color: 'var(--color-gold-deep)' }} />
          <p className="mt-3 font-bold">Akun tidak ditemukan</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {q ? `Tidak ada akun cocok dengan "${q}".` : 'Belum ada akun pada filter ini.'}
          </p>
        </div>
      ) : (
        <div className="card-soft mt-5 overflow-x-auto">
          <table className="stack w-full text-sm sm:min-w-[820px]">
            <thead>
              <tr style={{ color: 'var(--color-ink-muted)' }} className="text-left text-[0.72rem] uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Akun</th>
                <th className="px-3 py-4 font-semibold">Role</th>
                <th className="px-3 py-4 font-semibold">Telepon</th>
                <th className="px-3 py-4 font-semibold">Booking</th>
                <th className="px-3 py-4 font-semibold">Bergabung</th>
                <th className="px-3 py-4" />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const isSelf = a.id === myId
                const meta = ROLE_META[a.role]
                return (
                  <tr key={a.id} className="border-t transition hover:bg-[var(--color-cream)]" style={{ borderColor: 'var(--color-line)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-bold">
                            {a.name}
                            {isSelf && <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide" style={{ background: 'var(--color-shell)', color: 'var(--color-ink-muted)' }}>Anda</span>}
                          </div>
                          <div className="truncate text-[0.76rem]" style={{ color: 'var(--color-ink-muted)' }}>{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Role" className="px-3 py-4">
                      <span className="badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </td>
                    <td data-label="Telepon" className="px-3 py-4 whitespace-nowrap" style={{ color: 'var(--color-ink-soft)' }}>{a.phone || '—'}</td>
                    <td data-label="Booking" className="px-3 py-4">{a.bookingCount}×</td>
                    <td data-label="Bergabung" className="px-3 py-4 whitespace-nowrap" style={{ color: 'var(--color-ink-soft)' }}>{fmtDate(a.joined)}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setEditing(a)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)]" style={{ color: 'var(--color-ink-soft)' }} aria-label={`Edit ${a.name}`}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDel(a)}
                          disabled={isSelf}
                          className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-30"
                          style={{ color: 'var(--color-rose)' }}
                          aria-label={isSelf ? 'Tidak bisa menghapus akun sendiri' : `Hapus ${a.name}`}
                          title={isSelf ? 'Tidak bisa menghapus akun sendiri' : undefined}
                        >
                          <Trash2 size={15} />
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

      <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
        Akun baru bisa langsung masuk lewat OTP email di halaman /masuk. Menghapus akun juga menghapus seluruh data terkait (booking, rekam medis, poin).
      </p>

      {creating && <AccountDialog onClose={() => setCreating(false)} onSaved={invalidate} />}
      {editing && <AccountDialog account={editing} isSelf={editing.id === myId} onClose={() => setEditing(null)} onSaved={invalidate} />}
      {confirmDel && (
        <ConfirmDelete
          account={confirmDel}
          pending={deleteMut.isPending}
          error={deleteMut.error instanceof Error ? deleteMut.error.message : ''}
          onCancel={() => { deleteMut.reset(); setConfirmDel(null) }}
          onConfirm={() => deleteMut.mutate(confirmDel.id)}
        />
      )}
    </div>
  )
}

// ── Create / edit modal ──
function AccountDialog({
  account,
  isSelf = false,
  onClose,
  onSaved,
}: {
  account?: Account
  isSelf?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    password: '',
    role: (account?.role ?? 'pasien') as Role,
    phone: account?.phone ?? '',
    birthDate: account?.birthDate ?? '',
    points: account?.points ?? 0,
  })

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
        loyaltyPoints: form.role === 'pasien' ? form.points : undefined,
      }
      return account
        ? ownerUpdateAccount({ data: { id: account.id, ...payload, ...(form.password ? { password: form.password } : {}) } })
        : ownerCreateAccount({ data: { ...payload, password: form.password } })
    },
    onSuccess: () => {
      onSaved()
      onClose()
    },
  })

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const pwOk = account ? form.password === '' || form.password.length >= 6 : form.password.length >= 6
  const valid = form.name.trim().length >= 2 && emailValid && pwOk
  const err = mut.error instanceof Error ? mut.error.message : ''

  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card-soft w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: 'var(--color-gold)' }} />
            <span className="font-bold">{account ? `Edit akun — ${account.name}` : 'Akun baru'}</span>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="opacity-80 transition hover:opacity-100"><X size={18} /></button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Nama lengkap *</span>
              <input className={`${inp} mt-1.5`} placeholder="Nama" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Email *</span>
              <input className={`${inp} mt-1.5`} type="email" placeholder="nama@email.com" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">{account ? 'Reset password' : 'Password *'}</span>
              <input
                className={`${inp} mt-1.5`}
                type="password"
                autoComplete="new-password"
                placeholder={account ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Role</span>
              <select
                className={`${inp} mt-1.5 disabled:opacity-60`}
                value={form.role}
                disabled={isSelf}
                title={isSelf ? 'Tidak bisa mengubah role akun sendiri' : undefined}
                onChange={(e) => set({ role: e.target.value as Role })}
              >
                <option value="owner">Owner</option>
                <option value="dokter">Dokter</option>
                <option value="pasien">Pasien</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Telepon</span>
              <input className={`${inp} mt-1.5`} placeholder="0812…" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Tanggal lahir</span>
              <input className={`${inp} mt-1.5`} type="date" value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
            </label>
            {form.role === 'pasien' && (
              <label className="block">
                <span className="text-sm font-semibold">Poin privilege</span>
                <input className={`${inp} mt-1.5`} inputMode="numeric" value={String(form.points)} onChange={(e) => set({ points: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
              </label>
            )}
          </div>

          {isSelf && (
            <p className="mt-4 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
              Ini akun Anda — role dikunci agar tidak mengunci diri dari konsol owner.
            </p>
          )}
          {err && (
            <p className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{err}</p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-gold px-5 py-2 text-sm disabled:opacity-50" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? 'Menyimpan…' : account ? 'Simpan perubahan' : 'Buat akun'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation ──
function ConfirmDelete({
  account,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  account: Account
  pending: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={onCancel}>
      <div className="card-soft w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'rgba(179,73,47,0.12)', color: 'var(--color-destructive)' }}>
            <AlertTriangle size={20} />
          </div>
          <h2 className="mt-4 text-lg font-bold">Hapus akun {account.name}?</h2>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Tindakan ini permanen. Seluruh data terkait{account.bookingCount > 0 ? ` (${account.bookingCount} booking, transaksi, rekam medis, poin)` : ''} ikut terhapus dan tidak bisa dikembalikan.
          </p>

          {error && (
            <p className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{error}</p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-ghost px-4 py-2 text-sm" onClick={onCancel}>Batal</button>
            <button
              type="button"
              className="btn px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-destructive)' }}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? 'Menghapus…' : 'Hapus akun'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
