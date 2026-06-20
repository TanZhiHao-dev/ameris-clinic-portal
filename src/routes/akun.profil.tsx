import { type ReactNode, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { myProfile, updateProfile } from '../server/account'

export const Route = createFileRoute('/akun/profil')({ component: ProfilePage })

function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    birth: '',
  })
  const [saved, setSaved] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => myProfile(),
  })

  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      birth: profile.birthDate ?? '',
    })
  }, [profile])

  const save = useMutation({
    mutationFn: (v: { name: string; phone: string; birthDate: string }) =>
      updateProfile({ data: v }),
    onSuccess: () => setSaved(true),
  })

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }

  return (
    <div>
      <h1 className="text-[2rem]">Profil</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Kelola data akunmu di Ameris.
      </p>

      <div className="card-soft mt-6 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nama lengkap">
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Tanggal lahir">
            <input type="date" className={inputCls} value={form.birth} onChange={(e) => set('birth', e.target.value)} />
          </Field>
          <Field label="Nomor WhatsApp">
            <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} inputMode="email" />
          </Field>
        </div>

        <p className="mt-5 text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
          🎁 Tanggal lahir dipakai untuk kejutan promo ulang tahun dari Ameris.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-gold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={save.isPending || form.name.trim().length < 2}
            onClick={() => save.mutate({ name: form.name.trim(), phone: form.phone, birthDate: form.birth })}
          >
            {save.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
              <Check size={16} /> Tersimpan
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border bg-[var(--color-shell)] border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-gold)]'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
