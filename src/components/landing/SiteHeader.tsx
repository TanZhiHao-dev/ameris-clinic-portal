import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { Brand } from './Brand'
import { authClient } from '../../lib/auth-client'

const NAV = [
  { label: 'Treatment', href: '#treatment' },
  { label: 'Promo', href: '#promo' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Privilege Club', href: '#privilege' },
]

const TICKER = [
  'Promo Hydra Renewal Premium — hemat Rp1.200.000',
  'Setiap transaksi Rp1.000.000 = 1 poin Privilege',
  'Best Seller: Korean Pico Glow Therapy',
  'Gratis konsultasi kulit untuk pasien baru',
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { data: session, isPending } = authClient.useSession()

  const role = (session?.user as { role?: string } | undefined)?.role
  const dashboardTo = role === 'owner' ? '/owner' : role === 'dokter' ? '/dokter' : '/akun'
  const dashboardLabel = role === 'owner' || role === 'dokter' ? 'Dashboard' : 'Akun saya'

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
                  {item}
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
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {isPending ? null : session ? (
              <>
                <Link to={dashboardTo} className="btn btn-primary">
                  {dashboardLabel}
                </Link>
                <button type="button" onClick={logout} className="btn btn-ghost">
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/masuk" className="btn btn-ghost">
                  Masuk
                </Link>
                <Link to="/treatment" className="btn btn-primary">
                  Daftar
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost p-2 lg:hidden"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Tutup menu"
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
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {isPending ? null : session ? (
                <>
                  <Link to={dashboardTo} className="btn btn-primary" onClick={() => setOpen(false)}>
                    {dashboardLabel}
                  </Link>
                  <button type="button" onClick={logout} className="btn btn-ghost inline-flex items-center justify-center gap-2">
                    <LogOut size={18} /> Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link to="/masuk" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    Masuk
                  </Link>
                  <Link to="/treatment" className="btn btn-primary" onClick={() => setOpen(false)}>
                    Daftar
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
