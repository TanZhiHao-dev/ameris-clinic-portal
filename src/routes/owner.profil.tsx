import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Mail, Phone } from 'lucide-react'
import { ChangePasswordCard } from '../components/app/ChangePasswordCard'
import { myProfile } from '#/server/account'

export const Route = createFileRoute('/owner/profil')({ component: OwnerProfile })

function OwnerProfile() {
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => myProfile(),
  })

  return (
    <div>
      <span className="eyebrow">Akun Saya</span>
      <h1 className="mt-2 text-[2rem]">Profil</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Informasi akun dan keamanan login owner.
      </p>

      <div className="card-soft mt-6 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
            {(profile?.name ?? 'O').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold">{profile?.name ?? '—'}</div>
            <span className="badge mt-1" style={{ background: 'rgba(154,115,32,0.14)', color: 'var(--color-gold-deep)' }}>Owner</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <InfoRow icon={<Mail size={15} />} label="Email" value={profile?.email ?? '—'} />
          <InfoRow icon={<Phone size={15} />} label="Telepon" value={profile?.phone || '—'} />
          <InfoRow icon={<CalendarClock size={15} />} label="Bergabung" value={profile?.memberSince ?? '—'} />
        </div>
      </div>

      <div className="mt-6">
        <ChangePasswordCard />
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-line)' }}>
      <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
        {icon} {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  )
}
