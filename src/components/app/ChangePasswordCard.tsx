import { useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Lock } from 'lucide-react'
import { authClient } from '#/lib/auth-client'

// Self-service "change my password" card. Drop into any account page (patient /
// doctor / owner) — it acts on the logged-in user's own session via Better Auth
// changePassword (verifies the current password, then rotates it).
export function ChangePasswordCard() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  const mismatch = confirm.length > 0 && next !== confirm
  const sameAsOld = next.length > 0 && next === cur
  const valid = cur.length >= 1 && next.length >= 6 && next === confirm && !sameAsOld

  async function submit() {
    if (!valid || busy) return
    setBusy(true)
    setErr('')
    setOk(false)
    try {
      const res = await authClient.changePassword({
        currentPassword: cur,
        newPassword: next,
        revokeOtherSessions: true,
      })
      if (res.error) {
        const code = res.error.code ?? ''
        const m = (res.error.message ?? '').toLowerCase()
        throw new Error(
          code === 'INVALID_PASSWORD' || m.includes('invalid password') || m.includes('incorrect')
            ? 'Password saat ini salah.'
            : res.error.message || 'Gagal mengubah password.',
        )
      }
      setOk(true)
      setCur('')
      setNext('')
      setConfirm('')
    } catch (e) {
      setErr((e as Error).message || 'Gagal mengubah password.')
    } finally {
      setBusy(false)
    }
  }

  const onChange = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setOk(false)
    setErr('')
  }

  return (
    <div className="card-soft p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <KeyRound size={18} style={{ color: 'var(--color-gold-deep)' }} />
        <h2 className="text-lg font-bold">Ubah password</h2>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Masukkan password saat ini, lalu password baru minimal 6 karakter.
      </p>

      <div className="mt-5 grid gap-4 sm:max-w-md">
        <PwField label="Password saat ini" value={cur} onChange={onChange(setCur)} show={show} autoComplete="current-password" />
        <PwField label="Password baru" value={next} onChange={onChange(setNext)} show={show} autoComplete="new-password" />
        <PwField label="Konfirmasi password baru" value={confirm} onChange={onChange(setConfirm)} show={show} autoComplete="new-password" />
      </div>

      <button type="button" onClick={() => setShow((v) => !v)} className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Sembunyikan' : 'Tampilkan'} password
      </button>

      {mismatch && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>Konfirmasi password tidak cocok.</p>}
      {sameAsOld && !mismatch && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>Password baru harus berbeda dari yang lama.</p>}
      {err && <p className="mt-3 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{err}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" className="btn btn-gold disabled:cursor-not-allowed disabled:opacity-50" disabled={!valid || busy} onClick={submit}>
          {busy ? 'Menyimpan…' : 'Ubah password'}
        </button>
        {ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
            <Check size={16} /> Password berhasil diubah
          </span>
        )}
      </div>
    </div>
  )
}

function PwField({
  label,
  value,
  onChange,
  show,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
        <Lock size={16} style={{ color: 'var(--color-ink-muted)' }} />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  )
}
