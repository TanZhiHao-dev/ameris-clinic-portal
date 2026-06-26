import { useEffect } from 'react'
import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { CalendarDays, Crown, LayoutDashboard, LogOut, UserCog } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { SocialLinks } from '../components/app/SocialLinks'
import { authClient } from '../lib/auth-client'
import { profileNeedsCompletion } from '../lib/profile'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/akun')({ component: AccountLayout })

const NAV: { to: string; label: DictKey; icon: typeof LayoutDashboard; exact: boolean }[] = [
  { to: '/akun', label: 'ac.nav.overview', icon: LayoutDashboard, exact: true },
  { to: '/akun/booking', label: 'ac.nav.bookings', icon: CalendarDays, exact: false },
  { to: '/akun/privilege', label: 'ac.nav.privilege', icon: Crown, exact: false },
  { to: '/akun/profil', label: 'ac.nav.profile', icon: UserCog, exact: false },
]

function AccountLayout() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const { t } = useI18n()
  const role = (session?.user as { role?: string } | undefined)?.role

  // Any patient missing name / WhatsApp / birth date (Google sign-ups, and
  // existing email patients who never had a phone collected) must finish
  // onboarding before using the app. See lib/profile.ts.
  const needsOnboarding = role !== 'owner' && role !== 'dokter' && profileNeedsCompletion(session?.user)

  // Patient area. Send staff (owner/dokter) to their own console instead of
  // stranding them here — otherwise a freshly promoted doctor still sees the
  // patient dashboard. Mirrors the role guard in dokter.tsx / owner.tsx.
  useEffect(() => {
    if (isPending) return
    if (!session) navigate({ to: '/masuk' })
    else if (role === 'owner') navigate({ to: '/owner' })
    else if (role === 'dokter') navigate({ to: '/dokter' })
    else if (needsOnboarding) navigate({ to: '/lengkapi-profil' })
  }, [isPending, session, role, needsOnboarding, navigate])

  const userName = session?.user.name ?? '—'
  const memberLine = session ? t('ac.member') : '—'

  // Avoid flashing the patient dashboard (and firing 401 queries) before auth
  // resolves, or while any redirect is pending.
  if (isPending || !session || role === 'owner' || role === 'dokter' || needsOnboarding) {
    return (
      <PageShell>
        <div className="grid min-h-[60vh] place-items-center">
          <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{t('ac.loading')}</span>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="py-10 sm:py-12" style={{ background: 'var(--color-cream)', minHeight: '70vh' }}>
        <div className="shell-x grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit lg:sticky lg:top-28">
            <div className="card-soft p-5">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-extrabold"
                  style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
                >
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{userName}</div>
                  <div className="truncate text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
                    {memberLine}
                  </div>
                </div>
              </div>

              <nav className="mt-5 flex flex-col gap-1">
                {NAV.map((n) => {
                  const Icon = n.icon
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      activeOptions={{ exact: n.exact }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                      activeProps={{ style: { background: 'var(--color-ink)', color: 'var(--color-cream)' } }}
                      inactiveProps={{ style: { color: 'var(--color-ink-soft)' } }}
                    >
                      <Icon size={18} /> {t(n.label)}
                    </Link>
                  )
                })}
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut()
                    navigate({ to: '/masuk' })
                  }}
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                  style={{ color: 'var(--color-rose)' }}
                >
                  <LogOut size={18} /> {t('header.logout')}
                </button>
              </nav>

              <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--color-line)' }}>
                <div className="px-1 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
                  {t('ac.followUs')}
                </div>
                <div className="mt-3 px-1">
                  <SocialLinks size={18} />
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </section>
    </PageShell>
  )
}
