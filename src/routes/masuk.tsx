import { type KeyboardEvent, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, MailCheck, User } from 'lucide-react'
import { Brand } from '../components/landing/Brand'
import { clinic } from '../data/clinic'
import { authClient } from '../lib/auth-client'
import { authConfig } from '../server/auth-meta'

export const Route = createFileRoute('/masuk')({ component: AuthPage })

type Mode = 'masuk' | 'daftar' | 'lupa'

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('masuk')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birth, setBirth] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const { data: cfg } = useQuery({ queryKey: ['auth-config'], queryFn: () => authConfig() })
  const googleOn = !!cfg?.google

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

  async function sendReset() {
    if (busy || email.trim().length < 4) return
    setBusy(true)
    setError('')
    try {
      const res = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: '/reset-password' })
      if (res.error) throw new Error(res.error.message)
      setSent(true)
    } catch (e) {
      setError((e as Error).message || 'Gagal mengirim link reset.')
    } finally {
      setBusy(false)
    }
  }

  async function signInGoogle() {
    setBusy(true)
    setError('')
    try {
      // Redirects the browser to Google; on success it returns to callbackURL.
      const res = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/lanjut',
        errorCallbackURL: '/masuk',
      })
      if (res.error) throw new Error(res.error.message)
    } catch (e) {
      setError((e as Error).message || 'Gagal masuk dengan Google.')
      setBusy(false)
    }
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (mode === 'lupa' ? sendReset() : submit())
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setSent(false)
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
            {mode === 'lupa' ? (
              <ForgotView
                email={email}
                setEmail={setEmail}
                onSubmit={sendReset}
                onEnter={onEnter}
                onBack={() => switchMode('masuk')}
                busy={busy}
                sent={sent}
                error={error}
              />
            ) : (
              <>
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

                {googleOn && (
                  <>
                    <button
                      type="button"
                      onClick={signInGoogle}
                      disabled={busy}
                      className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-[var(--color-shell)] disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ background: '#fff', border: '1px solid var(--color-line)', color: 'var(--color-ink)' }}
                    >
                      <GoogleIcon /> {mode === 'masuk' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
                    </button>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1" style={{ background: 'var(--color-line)' }} />
                      <span className="text-[0.72rem] uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>atau</span>
                      <div className="h-px flex-1" style={{ background: 'var(--color-line)' }} />
                    </div>
                  </>
                )}

                {mode === 'daftar' && (
                  <>
                    <label className={`${googleOn ? 'mt-1' : 'mt-7'} block text-sm font-semibold`}>Nama lengkap</label>
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

                {mode === 'masuk' && (
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => switchMode('lupa')} className="text-[0.8rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
                      Lupa password?
                    </button>
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ForgotView({
  email,
  setEmail,
  onSubmit,
  onEnter,
  onBack,
  busy,
  sent,
  error,
}: {
  email: string
  setEmail: (v: string) => void
  onSubmit: () => void
  onEnter: (e: KeyboardEvent<HTMLInputElement>) => void
  onBack: () => void
  busy: boolean
  sent: boolean
  error: string
}) {
  return (
    <>
      <h1 className="text-[2.2rem]">Lupa password</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Masukkan email akunmu — kami kirim link untuk atur ulang password.
      </p>

      {sent ? (
        <div className="mt-7">
          <div className="flex flex-col items-center rounded-2xl px-6 py-8 text-center" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
            <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' }}>
              <MailCheck size={22} />
            </div>
            <p className="mt-4 font-bold">Cek email kamu</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              Kalau <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{email}</span> terdaftar, link reset password sudah dikirim.
            </p>
            <p className="mt-3 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>
              Dev: link reset tampil di konsol server.
            </p>
          </div>
        </div>
      ) : (
        <>
          <label className="mt-7 block text-sm font-semibold">Alamat email</label>
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

          <button
            type="button"
            disabled={busy || email.trim().length < 4}
            onClick={onSubmit}
            className="btn btn-gold mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Mengirim…' : 'Kirim link reset'} <ArrowRight size={18} />
          </button>

          {error && (
            <p className="mt-5 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>
              {error}
            </p>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
          <ArrowLeft size={15} /> Kembali ke masuk
        </button>
      </div>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
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
