import { type KeyboardEvent, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { Brand } from '../components/landing/Brand'
import { clinic } from '../data/clinic'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/masuk')({ component: AuthPage })

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birth, setBirth] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit =
    email.trim().length > 3 && password.length >= 6 && (mode === 'masuk' || name.trim().length >= 2)

  async function routeByRole() {
    const { data } = await authClient.getSession()
    const role = (data?.user as { role?: string } | undefined)?.role
    navigate({ to: role === 'owner' ? '/owner' : role === 'dokter' ? '/dokter' : '/akun' })
  }

  async function submit() {
    if (!canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'masuk') {
        const res = await authClient.signIn.email({ email: email.trim(), password })
        if (res.error) throw new Error(res.error.message)
      } else {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
          ...(birth ? { birthDate: birth } : {}),
        })
        if (res.error) throw new Error(res.error.message)
      }
      await routeByRole()
    } catch (e) {
      setError(
        (e as Error).message ||
          (mode === 'masuk' ? 'Email atau password salah.' : 'Gagal membuat akun.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  const switchMode = (m: 'masuk' | 'daftar') => {
    setMode(m)
    setError('')
  }

  const fillOwner = () => {
    switchMode('masuk')
    setEmail('owner@ameris.local')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:block" style={{ background: 'var(--color-espresso)' }}>
        <div className="radiance-gold" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/"><Brand tone="light" withTagline /></Link>
          <div>
            <p className="script gold-text text-5xl leading-tight">Refine your beauty</p>
            <p className="mt-4 max-w-sm text-[1.05rem]" style={{ color: 'rgba(246,237,220,0.78)' }}>
              Masuk untuk booking treatment, kelola jadwal, dan kumpulkan poin
              Ameris Privilege Club.
            </p>
          </div>
          <p className="text-sm" style={{ color: 'rgba(246,237,220,0.5)' }}>
            {clinic.motto} — {clinic.location}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col" style={{ background: 'var(--color-cream)' }}>
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="nav-link inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} /> Beranda
          </Link>
          <span className="lg:hidden"><Brand withTagline /></span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md">
            {/* Mode toggle */}
            <div className="mb-8 inline-flex rounded-full p-1" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
              {(['masuk', 'daftar'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="rounded-full px-5 py-2 text-sm font-semibold capitalize transition"
                  style={mode === m ? { background: 'var(--color-ink)', color: 'var(--color-cream)' } : { color: 'var(--color-ink-muted)' }}
                >
                  {m}
                </button>
              ))}
            </div>

            <h1 className="text-[2.2rem]">{mode === 'masuk' ? 'Selamat datang kembali' : 'Buat akun Ameris'}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              {mode === 'masuk'
                ? 'Masuk dengan email & password akunmu.'
                : 'Daftar pakai email & password untuk mulai booking.'}
            </p>

            {mode === 'daftar' && (
              <>
                <label className="mt-7 block text-sm font-semibold">Nama lengkap</label>
                <Field icon={<User size={16} />}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder="Nama kamu"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </Field>
              </>
            )}

            <label className="mt-5 block text-sm font-semibold">Alamat email</label>
            <Field icon={<Mail size={16} />}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onEnter}
                inputMode="email"
                autoComplete="email"
                placeholder="nama@email.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </Field>

            <label className="mt-5 block text-sm font-semibold">Password</label>
            <Field icon={<Lock size={16} />}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onEnter}
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
                placeholder="Minimal 6 karakter"
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'} style={{ color: 'var(--color-ink-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {mode === 'daftar' && (
              <>
                <label className="mt-5 block text-sm font-semibold">
                  Tanggal lahir <span className="font-normal" style={{ color: 'var(--color-ink-muted)' }}>(opsional — untuk promo ulang tahun 🎁)</span>
                </label>
                <input
                  type="date"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                  className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}
                />
              </>
            )}

            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={submit}
              className="btn btn-gold mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Daftar & masuk'} <ArrowRight size={18} />
            </button>

            {error && (
              <p className="mt-5 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
                {error}
              </p>
            )}

            <p className="mt-8 text-center text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
              Dengan melanjutkan, kamu setuju dengan Ketentuan &amp; Kebijakan Privasi Ameris.
            </p>
            <div className="mt-4 border-t pt-4 text-center">
              <button type="button" onClick={fillOwner} className="text-[0.82rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
                Masuk sebagai Owner / Admin →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="mt-2 flex items-center gap-2.5 rounded-xl px-4 py-3"
      style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}
    >
      <span style={{ color: 'var(--color-ink-muted)' }}>{icon}</span>
      {children}
    </div>
  )
}
