import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Phone, Calendar, User } from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { profileNeedsCompletion } from '../lib/profile'
import { safeInternalPath } from '../lib/redirect'
import { updateProfile } from '../server/account'
import { Brand } from '../components/landing/Brand'

// ?redirect= keeps the booking-gate round-trip intact: sign-up → onboarding →
// straight back to /booking instead of stranding the patient on /akun.
export const Route = createFileRoute('/lengkapi-profil')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: CompleteProfilePage,
})

function CompleteProfilePage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const backTo = safeInternalPath(redirect)
  const qc = useQueryClient()
  const { data: session, isPending } = authClient.useSession()
  const userExt = session?.user as { phone?: string | null; birthDate?: string | null; role?: string } | undefined

  const [form, setForm] = useState({ name: '', phone: '', birth: '' })
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState('')

  // Seed whatever the account already has (name from Google, birth date from an
  // email signup, etc.) so the patient only fills in what's actually missing.
  useEffect(() => {
    if (seeded || !session?.user) return
    setForm({
      name: session.user.name ?? '',
      phone: userExt?.phone ?? '',
      birth: userExt?.birthDate ?? '',
    })
    setSeeded(true)
  }, [seeded, session?.user, userExt?.phone, userExt?.birthDate])

  // Redirect guards
  useEffect(() => {
    if (isPending) return
    if (!session) {
      navigate({ to: '/masuk', search: { redirect: backTo } })
      return
    }
    // Staff go to their own console
    const role = userExt?.role
    if (role === 'owner') { navigate({ to: '/owner' }); return }
    if (role === 'dokter') { navigate({ to: '/dokter' }); return }
    // Already complete → no need to onboard.
    if (!profileNeedsCompletion(session.user)) {
      navigate({ to: (backTo ?? '/akun') as '/' })
    }
  }, [isPending, session, userExt, navigate, backTo])

  const save = useMutation({
    mutationFn: (v: { name: string; phone: string; birthDate: string }) =>
      updateProfile({ data: v }),
    onSuccess: () => {
      // Drop the cached profile so akun.tsx re-reads fresh data from DB.
      qc.removeQueries({ queryKey: ['my-profile'] })
      navigate({ to: (backTo ?? '/akun') as '/' })
    },
    onError: () => setError('Terjadi kesalahan. Coba lagi ya.'),
  })

  const submit = () => {
    setError('')
    const name = form.name.trim()
    const phone = form.phone.trim()
    const birth = form.birth.trim()
    if (name.length < 2) { setError('Nama minimal 2 karakter.'); return }
    if (!phone) { setError('Nomor WhatsApp wajib diisi.'); return }
    if (!birth) { setError('Tanggal lahir wajib diisi.'); return }
    save.mutate({ name, phone, birthDate: birth })
  }

  if (isPending || !session) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: 'var(--color-cream)' }}>
        <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</span>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--color-cream)' }}
    >
      {/* Logo */}
      <a href="/" className="mb-8 inline-block">
        <Brand withTagline tone="dark" />
      </a>

      {/* Card */}
      <div
        className="w-full max-w-[440px] rounded-2xl p-8"
        style={{
          background: 'var(--color-shell)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-lift)',
        }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="eyebrow">Satu langkah lagi</span>
          <h1 className="mt-2 text-[1.6rem] leading-tight">
            Lengkapi profil <span className="gold-text">Anda</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Kami perlu beberapa informasi agar bisa memberikan pelayanan terbaik untukmu.
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <Field label="Nama Lengkap" icon={<User size={15} />}>
            <input
              className={inputCls}
              placeholder="Nama lengkap kamu"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="No. WhatsApp" icon={<Phone size={15} />}>
            <input
              className={inputCls}
              placeholder="08xxxxxxxxxx"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>

          <Field label="Tanggal Lahir" icon={<Calendar size={15} />}>
            <input
              type="date"
              className={inputCls}
              value={form.birth}
              onChange={(e) => setForm((f) => ({ ...f, birth: e.target.value }))}
            />
          </Field>

          {error && (
            <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--color-rose)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn btn-gold mt-1 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={save.isPending}
            onClick={submit}
          >
            {save.isPending ? (
              'Menyimpan…'
            ) : (
              <>
                <Check size={16} /> Simpan &amp; Masuk ke Akun
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-[0.75rem]" style={{ color: 'var(--color-ink-muted)' }}>
          Data ini digunakan untuk keperluan booking dan program Privilege Club.
        </p>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border bg-[var(--color-cream)] border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-gold)] transition'

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-ink-soft)' }}>
        {icon} {label}
      </span>
      {children}
    </label>
  )
}
