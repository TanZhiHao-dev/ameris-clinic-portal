import { type KeyboardEvent, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'
import { Brand } from '../components/landing/Brand'
import { authClient } from '../lib/auth-client'
import { useI18n } from '../lib/i18n'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (s: Record<string, unknown>): { token: string } => ({
    token: typeof s.token === 'string' ? s.token : '',
  }),
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const mismatch = confirm.length > 0 && pw !== confirm
  const valid = pw.length >= 6 && pw === confirm && token.length > 0

  async function submit() {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await authClient.resetPassword({ newPassword: pw, token })
      if (res.error) throw new Error(res.error.message)
      setDone(true)
    } catch (e) {
      setError((e as Error).message || t('rp.errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="grid min-h-screen place-items-center px-6 py-12" style={{ background: 'var(--color-cream)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/"><Brand withTagline /></Link>
        </div>

        <div className="card-soft p-7 sm:p-9">
          {!token ? (
            <Notice
              icon={<ShieldAlert size={22} />}
              title={t('rp.invalidTitle')}
              body={t('rp.invalidBody')}
            />
          ) : done ? (
            <Notice
              icon={<Check size={22} />}
              title={t('rp.doneTitle')}
              body={t('rp.doneBody')}
              action={
                <button type="button" onClick={() => navigate({ to: '/masuk' })} className="btn btn-gold mt-6 w-full">
                  {t('rp.signinNow')} <ArrowRight size={18} />
                </button>
              }
            />
          ) : (
            <>
              <h1 className="text-[1.9rem]">{t('rp.title')}</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {t('rp.sub')}
              </p>

              <label className="mt-7 block text-sm font-semibold">{t('rp.newPw')}</label>
              <Field>
                <Lock size={16} style={{ color: 'var(--color-ink-muted)' }} />
                <input
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={onEnter}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('au.passwordPlaceholder')}
                  className="w-full bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('au.hidePw') : t('au.showPw')} style={{ color: 'var(--color-ink-muted)' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              <label className="mt-5 block text-sm font-semibold">{t('rp.confirmPw')}</label>
              <Field>
                <Lock size={16} style={{ color: 'var(--color-ink-muted)' }} />
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={onEnter}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('rp.confirmPlaceholder')}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </Field>

              {mismatch && <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>{t('rp.mismatch')}</p>}
              {error && <p className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(179,73,47,0.1)', color: 'var(--color-destructive)' }}>{error}</p>}

              <button
                type="button"
                disabled={busy || !valid}
                onClick={submit}
                className="btn btn-gold mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('common.saving') : t('rp.save')} <ArrowRight size={18} />
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/masuk" className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
              <ArrowLeft size={15} /> {t('au.backToSignin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Notice({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' }}>
        {icon}
      </div>
      <h1 className="mt-4 text-[1.6rem]">{title}</h1>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--color-ink-muted)' }}>{body}</p>
      {action}
    </div>
  )
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
      {children}
    </div>
  )
}
