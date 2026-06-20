import { MapPin } from 'lucide-react'
import { Brand } from './Brand'
import { clinic } from '../../data/clinic'
import { SocialLinks } from '../app/SocialLinks'

const COLS = [
  { title: 'Treatment', links: ['Facial & Peeling', 'Korean Pico Laser', 'Skinbooster', 'Injeksi & Botox', 'Paket Signature'] },
  { title: 'Akun', links: ['Masuk / Daftar', 'Keranjang', 'Privilege Club', 'Riwayat booking'] },
  { title: 'Klinik', links: ['Tentang Ameris', 'Jam operasional', 'Lokasi Gading Serpong', 'Kebijakan privasi'] },
]

export function SiteFooter() {
  return (
    <footer className="pt-16" style={{ background: 'var(--color-shell)', borderTop: '1px solid var(--color-line)' }}>
      <div className="shell-x">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" aria-label="Ameris — beranda">
              <Brand withTagline />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              {clinic.by}. Estetika yang terarah, presisi, dan berorientasi pada
              hasil — di {clinic.location}.
            </p>
            <div className="mt-5">
              <SocialLinks showContact />
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-ink-muted)' }}>
                {col.title}
              </div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm transition" style={{ color: 'var(--color-ink-soft)' }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline-gold" />

        <div
          className="flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <span className="inline-flex items-center gap-2 text-[0.8rem]">
            <MapPin size={14} /> {clinic.name} · {clinic.location}
          </span>
          <span className="text-[0.8rem]">© 2026 {clinic.name} · {clinic.instagram}</span>
        </div>
      </div>
    </footer>
  )
}
