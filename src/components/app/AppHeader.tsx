import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, ShoppingBag, User, X } from 'lucide-react'
import { Brand } from '../landing/Brand'
import { useCart } from '../../lib/cart'
import { authClient } from '../../lib/auth-client'

const NAV = [
  { label: 'Beranda', to: '/' },
  { label: 'Treatment', to: '/treatment' },
  { label: 'Privilege', to: '/akun/privilege' },
]

export function AppHeader() {
  const { count, hydrated } = useCart()
  const [open, setOpen] = useState(false)
  const { data: session } = authClient.useSession()

  // Route the account button to the role's own console — a doctor/owner who
  // taps "Akun" should land in their dashboard, not the patient area.
  const role = (session?.user as { role?: string } | undefined)?.role
  const accountTo = role === 'owner' ? '/owner' : role === 'dokter' ? '/dokter' : '/akun'
  const accountLabel = role === 'owner' || role === 'dokter' ? 'Dashboard' : 'Akun'

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(253, 250, 244, 0.86)',
        borderBottom: '1px solid var(--color-line)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav className="shell-x flex items-center justify-between py-4">
        <Link to="/" aria-label="Ameris — beranda">
          <Brand withTagline />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="nav-link"
              activeProps={{ style: { color: 'var(--color-ink)' } }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/keranjang"
            className="relative grid h-11 w-11 place-items-center rounded-full"
            style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}
            aria-label="Keranjang"
          >
            <ShoppingBag size={18} />
            {hydrated && count > 0 && (
              <span
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.65rem] font-bold"
                style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
              >
                {count}
              </span>
            )}
          </Link>

          <Link to={accountTo} className="btn btn-primary hidden sm:inline-flex">
            <User size={17} /> {accountLabel}
          </Link>

          <button
            type="button"
            className="btn btn-ghost p-2 md:hidden"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="md:hidden"
          style={{ borderTop: '1px solid var(--color-line)', background: 'var(--color-shell)' }}
        >
          <div className="shell-x flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-3 text-base font-medium"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={accountTo}
              className="btn btn-primary mt-2"
              onClick={() => setOpen(false)}
            >
              <User size={17} /> {accountLabel === 'Dashboard' ? 'Dashboard' : 'Akun saya'}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
