import { useEffect, useState } from 'react'
import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { CalendarDays, LogOut, Menu, Stethoscope, Users, X } from 'lucide-react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/dokter')({ component: DoctorLayout })

const NAV = [
  { to: '/dokter/jadwal', label: 'Jadwal', icon: CalendarDays },
  { to: '/dokter/pasien', label: 'Pasien & ERM', icon: Users },
  { to: '/dokter/profil', label: 'Profil & Bagi Hasil', icon: Stethoscope },
] as const

function SidebarContent({ onNavigate, userName, onSignOut }: { onNavigate?: () => void; userName: string; onSignOut: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link to="/dokter/jadwal" onClick={onNavigate} className="inline-flex flex-col">
          <span className="script gold-text text-3xl leading-none">Ameris</span>
          <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--color-gold-light)' }}>
            Doctor Console
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {NAV.map((n) => {
          const Icon = n.icon
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              activeProps={{ style: { background: 'var(--grad-gold)', color: '#3a2c0f' } }}
              inactiveProps={{ style: { color: 'rgba(246,237,220,0.78)' } }}
            >
              <Icon size={18} /> {n.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4" style={{ borderColor: 'rgba(246,237,220,0.12)' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
            {userName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: '#f6eddc' }}>{userName}</div>
            <div className="text-[0.7rem]" style={{ color: 'rgba(246,237,220,0.5)' }}>Dokter</div>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition" style={{ color: 'rgba(246,237,220,0.7)' }}>
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </div>
  )
}

function DoctorLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && (!session || session.user.role !== 'dokter')) {
      navigate({ to: '/masuk' })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const userName = session?.user.name ?? ''
  const handleSignOut = async () => {
    await authClient.signOut()
    navigate({ to: '/masuk' })
  }

  // Don't flash the console to non-doctors / while the session resolves.
  if (isPending || !session || session.user.role !== 'dokter') {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: 'var(--color-cream)' }}>
        <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Memuat…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block" style={{ background: 'var(--color-espresso)' }}>
        <SidebarContent userName={userName} onSignOut={handleSignOut} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0" style={{ background: 'rgba(33,28,23,0.5)' }} onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px]" style={{ background: 'var(--color-espresso)' }}>
            <button type="button" aria-label="Tutup" className="absolute right-3 top-4 text-[#f6eddc]" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} userName={userName} onSignOut={handleSignOut} />
          </div>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 sm:px-8" style={{ background: 'rgba(247,240,230,0.85)', borderBottom: '1px solid var(--color-line)', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost p-2 lg:hidden" aria-label="Buka menu" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
                Ameris Aesthetic Clinic
              </div>
              <div className="text-sm font-bold">Doctor Console</div>
            </div>
          </div>
          <Link to="/" className="btn btn-ghost px-4 py-2 text-sm">Lihat situs</Link>
        </header>

        <main className="p-5 sm:p-8">
          <div className="mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
