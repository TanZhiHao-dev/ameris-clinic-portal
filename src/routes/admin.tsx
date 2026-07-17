import { useEffect } from 'react'
import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Boxes, Camera, LogOut, ShoppingBag } from 'lucide-react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/admin')({ component: AdminLayout })

const TABS = [
  { to: '/admin', label: 'Inventory', icon: Boxes, exact: true },
  { to: '/admin/pos', label: 'POS / Kasir', icon: ShoppingBag, exact: false },
  { to: '/admin/foto', label: 'Before / After', icon: Camera, exact: false },
] as const

// Inventory-only console for the 'admin' role (owner may use it too). Everything
// else in the app stays gated behind the owner/doctor consoles.
function AdminLayout() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  const allowed = session?.user.role === 'admin' || session?.user.role === 'owner'

  useEffect(() => {
    if (!isPending && !allowed) navigate({ to: '/masuk' })
  }, [isPending, allowed, navigate])

  const userName = session?.user.name ?? ''
  const handleSignOut = async () => {
    await authClient.signOut()
    navigate({ to: '/masuk' })
  }

  if (isPending || !allowed) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: 'var(--color-cream)' }}>
        <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 sm:px-8"
        style={{ background: 'rgba(247,240,230,0.85)', borderBottom: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}
      >
        <Link to="/admin" className="inline-flex flex-col leading-none">
          <span className="script gold-text text-2xl">Ameris</span>
          <span className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--color-gold-light)' }}>
            Admin Inventory
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
            {userName.charAt(0) || 'A'}
          </div>
          <span className="hidden text-sm font-semibold sm:inline">{userName}</span>
          <button type="button" onClick={handleSignOut} className="btn btn-ghost px-3 py-2 text-sm">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </header>

      <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto px-5 py-2 sm:px-8" style={{ background: 'rgba(247,240,230,0.85)', borderBottom: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.exact }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition"
              activeProps={{ style: { background: 'var(--color-ink)', color: 'var(--color-cream)' } }}
              inactiveProps={{ style: { color: 'var(--color-ink-muted)' } }}
            >
              <Icon size={15} /> {t.label}
            </Link>
          )
        })}
      </nav>

      <main className="p-5 sm:p-8">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
