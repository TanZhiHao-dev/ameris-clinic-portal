import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Brand } from '../components/landing/Brand'
import { authClient } from '../lib/auth-client'
import { useI18n } from '../lib/i18n'

// Post-login landing. OAuth (Google) redirects here after sign-in; we then route
// to the role-appropriate console. Email+password login routes by role inline,
// but a social callbackURL is fixed, so this is where Google sign-ins get sorted.
export const Route = createFileRoute('/lanjut')({ component: PostLogin })

function PostLogin() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const { t } = useI18n()

  useEffect(() => {
    if (isPending) return
    if (!session) {
      navigate({ to: '/masuk', replace: true })
      return
    }
    const role = (session.user as { role?: string }).role
    navigate({ to: role === 'owner' ? '/owner' : role === 'dokter' ? '/dokter' : '/akun', replace: true })
  }, [isPending, session, navigate])

  return (
    <div className="grid min-h-screen place-items-center" style={{ background: 'var(--color-cream)' }}>
      <div className="flex flex-col items-center gap-4">
        <Brand withTagline />
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-gold)]" />
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{t('common.redirecting')}</p>
      </div>
    </div>
  )
}
