import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { Brand } from './Brand'
import { authClient } from '../../lib/auth-client'
import { useI18n } from '../../lib/i18n'
import type { DictKey } from '../../lib/i18n-dict'
import { LanguageToggle } from '../app/LanguageToggle'

const NAV: { key: DictKey; href: string }[] = [
  { key: 'nav.treatment', href: '#treatment' },
  { key: 'nav.promo', href: '#promo' },
  { key: 'nav.howItWorks', href: '#cara-kerja' },
  { key: 'nav.privilege', href: '#privilege' },
]

const TICKER: DictKey[] = ['ticker.1', 'ticker.2', 'ticker.3', 'ticker.4']

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { data: session } = authClient.useSession()
  const { t } = useI18n()

  const role = (session?.user as { role?: string } | undefined)?.role
  const dashboardTo = role === 'owner' ? '/owner' : role === 'dokter' ? '/dokter' : '/akun'
  const dashboardLabel = role === 'owner' || role === 'dokter' ? t('header.dashboard') : t('header.myAccount')

  async function logout() {
    setOpen(false)
    await authClient.signOut()
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Announcement bar */}
      <div
        className="relative overflow-hidden text-[#f6eddc]"
        style={{ background: 'var(--color-espresso)' }}
      >
        <div className="marquee py-2 text-[0.74rem]">
          {Array.from({ length: 2 }).map((_, group) => (
            <span key={group} className="flex items-center" aria-hidden={group === 1}>
              {TICKER.map((item) => (
                <span key={item} className="mx-6 inline-flex items-center gap-2">
                  <span className="glow-dot" aria-hidden />
                  {t(item)}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(253, 250, 244, 0.85)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--color-line)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <nav className="shell-x flex items-center justify-between py-4">
          <a href="#top" aria-label="Ameris — beranda">
            <Brand withTagline />
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="nav-link">
                {t(item.key)}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageToggle />
            {session ? (
              <>
                <Link to={dashboardTo} className="btn btn-primary">
                  {dashboardLabel}
                </Link>
                <button type="button" onClick={logout} className="btn btn-ghost">
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/masuk" className="btn btn-ghost">
                  {t('header.login')}
                </Link>
                <Link to="/treatment" className="btn btn-primary">
                  {t('header.register')}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageToggle />
            <button
              type="button"
              className="btn btn-ghost p-2"
              aria-label={open ? t('header.closeMenu') : t('header.openMenu')}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t('header.closeMenu')}
            className="absolute inset-0"
            style={{ background: 'rgba(33, 28, 23, 0.45)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-3 top-24 rounded-2xl p-5"
            style={{
              background: 'var(--color-shell)',
              border: '1px solid var(--color-line)',
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-base font-medium"
                  onClick={() => setOpen(false)}
                >
                  {t(item.key)}
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {session ? (
                <>
                  <Link to={dashboardTo} className="btn btn-primary" onClick={() => setOpen(false)}>
                    {dashboardLabel}
                  </Link>
                  <button type="button" onClick={logout} className="btn btn-ghost inline-flex items-center justify-center gap-2">
                    <LogOut size={18} /> {t('header.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/masuk" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    {t('header.login')}
                  </Link>
                  <Link to="/treatment" className="btn btn-primary" onClick={() => setOpen(false)}>
                    {t('header.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
