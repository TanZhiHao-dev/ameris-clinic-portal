import { useState } from 'react'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { googleReview, testimonials } from '../../data/clinic'

// Social-proof carousel of customer reviews, tied to the clinic's Google
// listing. Content lives in data/clinic.ts (testimonials + googleReview) so the
// owner can swap in real Google reviews without touching this component.
export function Testimonials() {
  const [active, setActive] = useState(0)
  const count = testimonials.length
  if (count === 0) return null

  const go = (i: number) => setActive(((i % count) + count) % count)
  const t = testimonials[active]

  return (
    <section id="testimoni" className="py-24" style={{ background: 'var(--color-shell)' }}>
      <div className="shell-x">
        {/* Header */}
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="eyebrow">Testimoni</span>
          <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
            Apa kata <br className="hidden sm:block" />
            <span className="gold-text">pelanggan setia kami</span>
          </h2>

          <a
            href={googleReview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-cream)]"
            style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}
          >
            <GoogleG />
            <Stars value={Math.round(googleReview.rating)} size={14} />
            <span className="mono">{googleReview.rating.toFixed(1)}</span>
            <span style={{ color: 'var(--color-ink-muted)' }}>
              {googleReview.count > 0 ? `· ${googleReview.count} ulasan Google` : '· ulasan di Google'}
            </span>
          </a>
        </div>

        {/* Avatars */}
        <div className="mt-10 flex items-center justify-center gap-3 sm:gap-4">
          {testimonials.map((item, i) => {
            const isActive = i === active
            const size = isActive ? 78 : 54
            return (
              <button
                key={item.name + i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Lihat testimoni dari ${item.name}`}
                aria-pressed={isActive}
                className="shrink-0 overflow-hidden rounded-full transition-all duration-300"
                style={{
                  height: size,
                  width: size,
                  opacity: isActive ? 1 : 0.6,
                  boxShadow: isActive ? '0 0 0 3px var(--color-shell), 0 0 0 5px var(--color-gold), var(--shadow-gold)' : 'none',
                }}
              >
                <img
                  src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=f0e6d3&radius=50`}
                  alt={item.name}
                  width={size}
                  height={size}
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const btn = e.currentTarget.parentElement
                    if (btn) {
                      btn.style.background = 'var(--grad-gold)'
                      btn.style.display = 'grid'
                      btn.style.placeItems = 'center'
                      btn.style.color = '#3a2c0f'
                      btn.style.fontWeight = 'bold'
                      e.currentTarget.replaceWith(document.createTextNode(initials(item.name)))
                    }
                  }}
                />
              </button>
            )
          })}
        </div>

        {/* Quote + controls */}
        <div className="relative mx-auto mt-10 max-w-2xl">
          {/* Desktop arrows flank the quote */}
          <NavButton
            dir="prev"
            onClick={() => go(active - 1)}
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 -translate-x-[150%] md:grid"
          />
          <NavButton
            dir="next"
            onClick={() => go(active + 1)}
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-[150%] md:grid"
          />

          <div key={active} className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-xl font-bold sm:text-2xl">{t.title}</h3>
            <p className="mx-auto mt-4 max-w-xl text-[0.98rem] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
              “{t.body}”
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <Stars value={t.rating} size={18} />
              <span className="mono text-sm font-semibold" style={{ color: 'var(--color-ink-soft)' }}>
                {t.rating.toFixed(1)}
              </span>
            </div>

            <p className="mt-5 text-lg font-bold">{t.name}</p>
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{t.role}</p>
          </div>
        </div>

        {/* Mobile arrows */}
        <div className="mt-8 flex justify-center gap-4 md:hidden">
          <NavButton dir="prev" onClick={() => go(active - 1)} />
          <NavButton dir="next" onClick={() => go(active + 1)} />
        </div>
      </div>
    </section>
  )
}

function NavButton({ dir, onClick, className = '' }: { dir: 'prev' | 'next'; onClick: () => void; className?: string }) {
  const isNext = dir === 'next'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isNext ? 'Testimoni berikutnya' : 'Testimoni sebelumnya'}
      className={`grid h-12 w-12 place-items-center rounded-full transition hover:brightness-105 active:translate-y-px ${className}`}
      style={
        isNext
          ? { background: 'var(--grad-gold)', color: '#3a2c0f', boxShadow: 'var(--shadow-gold)' }
          : { background: 'var(--color-espresso)', color: '#f6eddc' }
      }
    >
      {isNext ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
    </button>
  )
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} dari 5 bintang`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i < value
        return (
          <Star
            key={i}
            size={size}
            style={{ color: 'var(--color-gold)' }}
            fill={on ? 'var(--color-gold)' : 'none'}
            strokeWidth={on ? 0 : 1.5}
            aria-hidden
          />
        )
      })}
    </span>
  )
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
