import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarCheck, Sparkles } from 'lucide-react'
import { clinic } from '../../data/clinic'
import { listTreatments } from '../../server/treatments'
import { TreatmentThumb } from './TreatmentThumb'
import { PriceTag } from '../app/PriceTag'

const STATS = [
  { value: '24/7', label: 'Booking mandiri' },
  { value: '50+', label: 'Pilihan treatment' },
  { value: '4.9', label: 'Rating pasien' },
  { value: 'Pico', label: 'Korean technology' },
]

export function Hero() {
  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => listTreatments(),
  })
  // Feature a real best-seller — prefer one with a photo so the hero shows an
  // actual treatment image, not a placeholder.
  const featured =
    treatments.find((t) => t.bestSeller && t.image && t.available) ??
    treatments.find((t) => t.bestSeller && t.image) ??
    treatments.find((t) => t.image) ??
    treatments.find((t) => t.bestSeller) ??
    treatments[0]

  return (
    <section id="top" className="relative overflow-hidden" style={{ background: 'var(--color-cream)' }}>
      <div className="radiance-light" aria-hidden />

      <div className="shell-x relative grid items-center gap-14 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* Left — thesis */}
        <div>
          <span className="rise rise-1 eyebrow inline-flex items-center gap-2">
            <span className="glow-dot" aria-hidden />
            {clinic.location} · {clinic.by}
          </span>

          <h1 className="rise rise-2 mt-6 text-[3rem] leading-[1.02] sm:text-[3.8rem] lg:text-[4.4rem]">
            Refine your beauty,
            <br />
            <span className="gold-text italic">tampil percaya diri</span>
            <br />
            mulai hari ini.
          </h1>

          <p
            className="rise rise-2 mt-6 max-w-xl text-[1.05rem] leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Portal mandiri Ameris — lihat menu treatment, cek slot kosong, dan
            booking sendiri tanpa antre chat. Bayar online atau di klinik, dan
            kumpulkan poin Privilege di tiap perawatan.
          </p>

          <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-3">
            <Link to="/treatment" className="btn btn-gold">
              Booking sekarang <ArrowRight size={18} />
            </Link>
            <Link to="/treatment" className="btn btn-outline">
              Lihat treatment
            </Link>
          </div>

          <div className="rise rise-4 mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold gold-text">{s.value}</div>
                <div
                  className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--color-ink-muted)' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — treatment card preview */}
        <div className="rise rise-3 relative mx-auto w-full max-w-sm">
          <div
            className="absolute -inset-6 -z-10 rounded-[2rem] opacity-80"
            aria-hidden
            style={{
              background: 'radial-gradient(60% 60% at 70% 30%, rgba(213,173,85,0.45), transparent 70%)',
              filter: 'blur(16px)',
            }}
          />
          <div
            className="overflow-hidden rounded-[1.6rem]"
            style={{
              background: 'var(--color-shell)',
              boxShadow: 'var(--shadow-lift)',
              border: '1px solid var(--color-line)',
            }}
          >
            {/* visual header — a real best-seller photo (or motif fallback) */}
            <div className="relative aspect-[16/10] overflow-hidden">
              {featured ? (
                <TreatmentThumb t={featured} className="h-full w-full" />
              ) : (
                <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, #edd9a6, #cb9f4f)' }} aria-hidden />
              )}
              {(featured?.bestSeller ?? true) && (
                <span className="badge badge-best absolute left-3 top-3">
                  <Sparkles size={12} /> BEST SELLER
                </span>
              )}
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl leading-snug">{featured?.name ?? 'Korean Pico Glow'}</h3>
                <span className="shrink-0 text-[0.7rem] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
                  {featured?.duration ?? '30 min'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {featured?.blurb ?? 'Laser Pico Second Technology — cerahkan kulit & ratakan warna.'}
              </p>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                {featured ? (
                  <PriceTag t={featured} numClass="text-2xl" />
                ) : (
                  <div className="mono text-2xl font-extrabold gold-text">Rp550.000</div>
                )}
                <span className="badge badge-ok">
                  <span className="glow-dot" aria-hidden /> Tersedia
                </span>
              </div>

              {featured ? (
                <Link to="/treatment/$id" params={{ id: featured.id }} className="btn btn-primary mt-5 w-full">
                  <CalendarCheck size={18} /> Pilih jadwal
                </Link>
              ) : (
                <Link to="/treatment" className="btn btn-primary mt-5 w-full">
                  <CalendarCheck size={18} /> Pilih jadwal
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
