import { useState, type ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronRight,
  Leaf,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from 'lucide-react'
import { SiteHeader } from '../components/landing/SiteHeader'
import { SiteFooter } from '../components/landing/SiteFooter'
import { FinalCta } from '../components/landing/FinalCta'
import { clinic } from '../data/clinic'
import { pickLang, useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/tentang')({
  component: AboutPage,
})

// Image with a graceful brand-gradient fallback. Drop real photos at the
// documented public/ paths and they replace the placeholder automatically.
function PhotoFrame({
  src,
  alt,
  className,
  style,
  children,
}: {
  src?: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}) {
  // The brand placeholder sits underneath; a real photo layers on top and shows
  // immediately. If the file is missing the image errors out and hides itself,
  // revealing the placeholder — no dependence on onLoad timing or cache state.
  const [failed, setFailed] = useState(false)
  const show = Boolean(src) && !failed
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, var(--color-champagne), var(--color-blush-soft) 55%, var(--color-cream-2))',
        border: '1px solid var(--color-line)',
        ...style,
      }}
    >
      <div className="absolute inset-0 grid place-items-center">{children}</div>
      {show && (
        <img
          src={src}
          alt={alt ?? ''}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  )
}

function Monogram({ size = 56 }: { size?: number }) {
  return (
    <span className="script gold-text leading-none" style={{ fontSize: size }} aria-hidden>
      A
    </span>
  )
}

// ── Banner ─────────────────────────────────────────────────────────────────
function Banner() {
  const { t } = useI18n()
  return (
    <section
      id="top"
      className="relative overflow-hidden"
      style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}
    >
      <img
        src="/about/banner.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.45 }}
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'linear-gradient(180deg, rgba(18,13,8,0.82) 0%, rgba(18,13,8,0.7) 55%, rgba(18,13,8,0.9) 100%)',
        }}
      />
      <div className="radiance-gold" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="shell-x relative py-24 text-center sm:py-28">
        <span className="eyebrow" style={{ color: 'var(--color-gold-light)' }}>
          {t('about.tag')}
        </span>
        <h1 className="mt-4 text-[2.8rem] leading-tight sm:text-[3.8rem]" style={{ color: '#faf3e6' }}>
          {t('about.title')}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[1.02rem]" style={{ color: 'rgba(246,237,220,0.78)' }}>
          {t('about.lead')}
        </p>

        {/* breadcrumb */}
        <nav
          className="mt-7 inline-flex items-center gap-2 text-sm"
          style={{ color: 'rgba(246,237,220,0.7)' }}
          aria-label="Breadcrumb"
        >
          <Link to="/" className="transition hover:text-[var(--color-gold-light)]">
            {t('nav.home')}
          </Link>
          <ChevronRight size={14} aria-hidden />
          <span style={{ color: 'var(--color-gold-light)' }}>{t('about.title')}</span>
        </nav>
      </div>
    </section>
  )
}

// ── Founder ────────────────────────────────────────────────────────────────
function Founder() {
  const { t, lang } = useI18n()
  return (
    <section className="py-20 sm:py-24">
      <div className="shell-x grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        {/* portrait + supporting */}
        <div className="reveal relative mx-auto w-full max-w-sm">
          <PhotoFrame
            src="/about/founder.jpg"
            alt="dr. Meriana — Founder Ameris"
            className="rounded-[1.8rem]"
            style={{ aspectRatio: '4 / 5', boxShadow: 'var(--shadow-lift)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <Monogram size={84} />
              <span className="badge badge-best">
                <Sparkles size={12} /> FOUNDER
              </span>
            </div>
          </PhotoFrame>

          {/* floating signature card */}
          <div
            className="absolute -bottom-6 -right-3 rounded-2xl px-5 py-4 text-center sm:-right-6"
            style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-soft)' }}
          >
            <div className="script gold-text text-[1.7rem] leading-none">dr. Meriana</div>
            <div className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--color-ink-muted)' }}>
              {t('about.founder.role')}
            </div>
          </div>
        </div>

        {/* text */}
        <div className="reveal">
          <span className="eyebrow">{t('about.founder.eyebrow')}</span>
          <h2 className="mt-3 text-[2.2rem] leading-tight sm:text-[2.9rem]">
            {t('about.founder.title1')} <span className="gold-text italic">{t('about.founder.titleAccent')}</span>
          </h2>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            {t('about.founder.body')}
          </p>

          <figure className="mt-8 border-l-2 pl-5" style={{ borderColor: 'var(--color-gold)' }}>
            <blockquote className="font-display text-[1.5rem] italic leading-snug" style={{ color: 'var(--color-ink)' }}>
              “{pickLang(lang, clinic.mottoId, clinic.motto)}”
            </blockquote>
            <figcaption className="mt-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              {clinic.by}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

// ── Our Story ──────────────────────────────────────────────────────────────
const STORY_STATS: { value: string; label: DictKey }[] = [
  { value: '5.0', label: 'about.story.statRating' },
  { value: '50+', label: 'about.story.statTreatments' },
  { value: '2026', label: 'about.story.statSince' },
]

function Story() {
  const { t } = useI18n()
  return (
    <section className="py-20 sm:py-24" style={{ background: 'var(--color-shell)' }}>
      <div className="shell-x grid items-center gap-12 lg:grid-cols-2">
        {/* media */}
        <div className="reveal relative order-2 lg:order-1">
          <PhotoFrame
            src="/about/clinic.jpg"
            alt="Ameris Aesthetic Clinic — Gading Serpong"
            className="rounded-[1.8rem]"
            style={{ aspectRatio: '4 / 3', boxShadow: 'var(--shadow-lift)' }}
          >
            <div className="flex flex-col items-center gap-3" style={{ color: 'var(--color-gold-deep)' }}>
              <Sparkles size={40} />
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">{clinic.location}</span>
            </div>
          </PhotoFrame>

          {/* floating badge */}
          <div
            className="absolute -left-3 -top-5 rounded-2xl px-4 py-3 sm:-left-6"
            style={{ background: 'var(--color-espresso)', color: '#f6eddc', boxShadow: 'var(--shadow-lift)' }}
          >
            <div className="script gold-text text-2xl leading-none">{clinic.tagline}</div>
            <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(246,237,220,0.7)' }}>
              {clinic.hashtag}
            </div>
          </div>
        </div>

        {/* text */}
        <div className="reveal order-1 lg:order-2">
          <span className="eyebrow">{t('about.story.eyebrow')}</span>
          <h2 className="mt-3 text-[2.2rem] leading-tight sm:text-[2.9rem]">
            {t('about.story.title1')} <span className="gold-text">{t('about.story.titleAccent')}</span>
          </h2>
          <p className="mt-6 text-[1.02rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            {t('about.story.body1')}
          </p>
          <p className="mt-4 text-[1.02rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            {t('about.story.body2')}
          </p>

          <Link to="/treatment" className="btn btn-gold mt-8">
            {t('about.story.cta')} <ArrowRight size={18} />
          </Link>

          {/* stats */}
          <div className="mt-10 grid grid-cols-3 gap-4 border-t pt-8" style={{ borderColor: 'var(--color-line)' }}>
            {STORY_STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-[2.4rem] font-bold leading-none gold-text" style={{ fontVariantNumeric: 'lining-nums' }}>
                  {s.value}
                </div>
                <div className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-ink-muted)' }}>
                  {t(s.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Why Choose Us ──────────────────────────────────────────────────────────
// Reference layout: feature blocks (photo + text) flanking one large central
// image. Each thumbnail falls back to its icon until a real photo is dropped in.
type WhyItem = {
  icon: typeof Stethoscope
  key: 'doctor' | 'hygiene' | 'tech' | 'natural'
  img: string
}
const WHY_LEFT: WhyItem[] = [
  { icon: Stethoscope, key: 'doctor', img: '/about/why-doctor.jpg' },
  { icon: ShieldCheck, key: 'hygiene', img: '/about/why-hygiene.jpg' },
]
const WHY_RIGHT: WhyItem[] = [
  { icon: Zap, key: 'tech', img: '/about/why-tech.jpg' },
  { icon: Leaf, key: 'natural', img: '/about/why-natural.jpg' },
]

function WhyFeature({ item, side }: { item: WhyItem; side: 'left' | 'right' }) {
  const { t } = useI18n()
  const { icon: Icon, key, img } = item
  const isLeft = side === 'left'
  return (
    <div className={`flex items-center gap-4 ${isLeft ? 'lg:flex-row-reverse lg:justify-end lg:text-right' : 'lg:text-left'}`}>
      <PhotoFrame src={img} alt="" className="shrink-0 rounded-2xl" style={{ height: 92, width: 92 }}>
        <span style={{ color: 'var(--color-gold-deep)' }}>
          <Icon size={26} />
        </span>
      </PhotoFrame>
      <div className="max-w-[220px]">
        <h3 className="text-base font-bold">{t(`about.why.${key}.title` as DictKey)}</h3>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
          {t(`about.why.${key}.body` as DictKey)}
        </p>
      </div>
    </div>
  )
}

function WhyChoose() {
  const { t } = useI18n()
  return (
    <section className="py-20 sm:py-24">
      <div className="shell-x">
        <div className="reveal mx-auto max-w-xl text-center">
          <span className="eyebrow">{t('about.why.eyebrow')}</span>
          <h2 className="mt-3 text-[2.2rem] sm:text-[2.9rem]">
            {t('about.why.title1')} <span className="gold-text">{t('about.why.titleAccent')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[0.98rem]" style={{ color: 'var(--color-ink-muted)' }}>
            {t('about.why.subtitle')}
          </p>
        </div>

        <div className="reveal mt-14 grid items-center gap-10 lg:grid-cols-[1fr_0.82fr_1fr] lg:gap-8">
          {/* left features */}
          <div className="flex flex-col gap-10 lg:gap-12">
            {WHY_LEFT.map((item) => (
              <WhyFeature key={item.key} item={item} side="left" />
            ))}
          </div>

          {/* central image */}
          <PhotoFrame
            src="/about/why-main.jpg"
            alt="Ameris Aesthetic Clinic"
            className="order-first mx-auto w-full max-w-xs rounded-[2rem] lg:order-none"
            style={{ aspectRatio: '3 / 4', boxShadow: 'var(--shadow-lift)' }}
          >
            <div className="flex flex-col items-center gap-4">
              <Monogram size={76} />
              <span className="badge badge-best">
                <Sparkles size={12} /> AMERIS
              </span>
            </div>
          </PhotoFrame>

          {/* right features */}
          <div className="flex flex-col gap-10 lg:gap-12">
            {WHY_RIGHT.map((item) => (
              <WhyFeature key={item.key} item={item} side="right" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Professional Team ──────────────────────────────────────────────────────
const TEAM = [
  { photo: '/about/team-meriana.jpg', name: null as null, nameKey: null as DictKey | null, roleKey: 'about.founder.role', founder: true },
  { photo: '/about/team-doctor.jpg', name: null, nameKey: 'about.team.doctorName' as DictKey, roleKey: 'about.team.role.doctor', founder: false },
  { photo: '/about/team-therapist.jpg', name: null, nameKey: 'about.team.therapistName' as DictKey, roleKey: 'about.team.role.therapist', founder: false },
  { photo: '/about/team-care.jpg', name: null, nameKey: 'about.team.careName' as DictKey, roleKey: 'about.team.role.care', founder: false },
] as const

function Team() {
  const { t } = useI18n()
  return (
    <section className="py-20 sm:py-24" style={{ background: 'var(--color-shell)' }}>
      <div className="shell-x">
        <div className="reveal mx-auto max-w-xl text-center">
          <span className="eyebrow">{t('about.team.eyebrow')}</span>
          <h2 className="mt-3 text-[2.2rem] sm:text-[2.9rem]">
            {t('about.team.title1')} <span className="gold-text">{t('about.team.titleAccent')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[0.98rem]" style={{ color: 'var(--color-ink-muted)' }}>
            {t('about.team.subtitle')}
          </p>
        </div>

        <div className="reveal mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => {
            const displayName = m.founder ? 'dr. Meriana' : m.nameKey ? t(m.nameKey) : ''
            return (
              <div key={i} className="text-center">
                <PhotoFrame
                  src={m.photo}
                  alt={displayName}
                  className="mx-auto rounded-full"
                  style={{ height: 168, width: 168, borderRadius: '9999px' }}
                >
                  <Monogram size={56} />
                </PhotoFrame>
                <h3 className="mt-5 text-lg font-bold">{displayName}</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-gold-deep)' }}>
                  {t(m.roleKey as DictKey)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function AboutPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Banner />
        <Founder />
        <Story />
        <WhyChoose />
        <Team />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
