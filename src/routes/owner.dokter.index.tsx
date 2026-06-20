import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Percent, Stethoscope } from 'lucide-react'
import { ownerDoctors } from '#/server/doctors'

export const Route = createFileRoute('/owner/dokter/')({ component: DoctorsPage })

function DoctorsPage() {
  const { data: doctors = [] } = useQuery({
    queryKey: ['owner-doctors'],
    queryFn: () => ownerDoctors(),
  })

  return (
    <div>
      <span className="eyebrow">Manajemen Dokter</span>
      <h1 className="mt-2 text-[2rem]">Dokter &amp; bagi hasil</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        Atur treatment yang dilakukan tiap dokter dan persentase bagi hasilnya.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {doctors.map((d) => (
          <Link
            key={d.id}
            to="/owner/dokter/$id"
            params={{ id: d.id }}
            className="card-soft flex items-center gap-4 p-5 transition hover:shadow-md"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
              {d.name.replace(/^dr\.?\s*/i, '').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-bold">
                <Stethoscope size={15} style={{ color: 'var(--color-gold-deep)' }} /> {d.name}
              </div>
              <div className="truncate text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>{d.email}</div>
              <div className="mt-1.5 flex items-center gap-3 text-[0.78rem]">
                <span style={{ color: 'var(--color-ink-soft)' }}>{d.treatmentCount} treatment</span>
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
                  <Percent size={12} /> rata-rata {d.avgShare}%
                </span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--color-ink-muted)' }} />
          </Link>
        ))}
        {doctors.length === 0 && (
          <div className="card-soft p-8 text-center sm:col-span-2">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Belum ada dokter terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
