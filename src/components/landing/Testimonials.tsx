import { ArrowRight, BadgeCheck, Quote, Star } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { googleReview, testimonials } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'
import type { Testimonial } from '../../data/clinic'

// "Client Love" social-proof block: a centred header, a rating-summary card +
// one large featured testimonial (portrait, quote, CTAs), then a row of shorter
// quotes. Content lives in data/clinic.ts (testimonials + googleReview) so the
// owner can swap in real Google reviews without touching this component.
export function Testimonials() {
  // Aliased to `tr` — kept consistent with the rest of the landing components.
  const { t: tr } = useI18n()
  const count = testimonials.length
  if (count === 0) return null

  // Virgilia S. is the featured spotlight; the others fill the shorter quotes.
  const featured = testimonials.find((x) => x.name.startsWith('Virgilia')) ?? testimonials[0]
  const rest = testimonials.filter((x) => x.name !== featured.name).slice(0, 3)

  return (
    <section
      id="testimoni"
      className="relative overflow-hidden py-24 sm:py-28"
      style={{ background: 'var(--color-shell)' }}
    >
      <div className="aura-soft" aria-hidden />

      <div className="shell-x relative">
        {/* Header — centred */}
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="eyebrow">{tr('testi.eyebrow')}</span>
          <h2 className="mt-3 text-[2.4rem] leading-[1.05] sm:text-[3.1rem]">
            {tr('testi.title1')} <span className="gold-text italic">{tr('testi.titleAccent')}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
            {tr('testi.subtitle')}
          </p>
        </div>

        {/* Feature row — rating summary + large featured testimonial */}
        <div className="reveal mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {/* Rating summary */}
          <div className="card-luxe flex flex-col p-7 sm:p-8">
            <Stars value={5} size={18} />
            <h3 className="mt-5 text-xl leading-snug">{tr('testi.statHeading')}</h3>

            <div className="my-6 h-px w-full" style={{ background: 'var(--color-line)' }} />

            <div className="mt-auto">
              <span className="eyebrow" style={{ fontSize: '0.66rem' }}>{tr('testi.avgLabel')}</span>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-[3.2rem] leading-none">{googleReview.rating.toFixed(1)}</span>
                <span className="mb-1.5 text-lg" style={{ color: 'var(--color-ink-muted)' }}>/5</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {tr('testi.statBody')}
              </p>
              <a
                href={googleReview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                <GoogleG /> {tr('testi.viaGoogle')}
              </a>
            </div>
          </div>

          {/* Featured testimonial */}
          <div className="card-luxe group p-5 sm:p-7 lg:col-span-2">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8">
              {/* portrait + author */}
              <div className="flex flex-col">
                <div className="relative overflow-hidden rounded-[1.6rem]" style={{ aspectRatio: '3 / 4' }}>
                  <FeaturedImage item={featured} />
                  <span
                    className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full"
                    style={{ background: 'rgba(253,250,244,0.92)', color: 'var(--color-gold-deep)', backdropFilter: 'blur(2px)' }}
                    aria-hidden
                  >
                    <Quote size={16} style={{ fill: 'currentColor' }} />
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-base font-bold">{featured.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-gold-deep)' }}>{featured.role}</p>
                </div>
              </div>

              {/* quote + actions */}
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Stars value={featured.rating} size={18} />
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#5e8b6d' }}>
                    <BadgeCheck size={16} aria-hidden /> {tr('testi.verified')}
                  </span>
                </div>

                <blockquote className="mt-5 font-display text-[1.6rem] leading-snug sm:text-[1.9rem]" style={{ color: 'var(--color-ink)' }}>
                  “{featured.body}”
                </blockquote>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                  <Link
                    to="/treatment"
                    className="btn-split"
                    style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
                  >
                    <span>{tr('testi.bookCta')}</span>
                    <span className="btn-split-ic" aria-hidden>
                      <ArrowRight size={18} />
                    </span>
                  </Link>
                  <a href={googleReview.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                    {tr('testi.moreStories')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shorter quotes */}
        {rest.length > 0 && (
          <div className="reveal mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item) => (
              <MiniQuote key={item.name} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function FeaturedImage({ item }: { item: Testimonial }) {
  const fallback = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=f0e6d3`
  return (
    <img
      src={item.photo ?? fallback}
      alt={item.name}
      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      style={{ objectPosition: 'center 25%' }}
      onError={(e) => {
        if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
      }}
    />
  )
}

function MiniQuote({ item }: { item: Testimonial }) {
  const src =
    item.photo
    ?? `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=f0e6d3&radius=50`
  return (
    <figure className="card-luxe group flex h-full flex-col rounded-[2rem] p-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
          <img
            src={src}
            alt={item.name}
            width={44}
            height={44}
            className="h-full w-full object-cover"
            onError={(e) => {
              const fallback = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=f0e6d3&radius=50`
              if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
            }}
          />
        </div>
        <figcaption className="min-w-0">
          <p className="truncate text-sm font-bold">{item.name}</p>
          <p className="truncate text-xs" style={{ color: 'var(--color-ink-muted)' }}>{item.role}</p>
        </figcaption>
        <Quote size={18} className="ml-auto shrink-0" style={{ color: 'var(--color-gold)', fill: 'var(--color-gold)' }} aria-hidden />
      </div>

      <div className="mt-4">
        <Stars value={item.rating} size={14} />
      </div>
      <blockquote className="mt-3 text-[0.92rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
        “{item.body}”
      </blockquote>
    </figure>
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
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
