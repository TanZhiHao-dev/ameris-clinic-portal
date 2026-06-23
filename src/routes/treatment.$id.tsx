import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarCheck, Clock, Star } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { TreatmentThumb } from '../components/landing/TreatmentThumb'
import { AddToCartButton } from '../components/app/AddToCartButton'
import { PriceTag } from '../components/app/PriceTag'
import { useCart } from '../lib/cart'
import { treatmentQuery } from '../server/queries'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/treatment/$id')({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(treatmentQuery(id)),
  component: DetailPage,
})

function DetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const { data: t, isPending } = useQuery(treatmentQuery(id))
  // Aliased to `tr` — the treatment data is named `t`.
  const { t: tr } = useI18n()

  if (isPending) {
    return <PageShell><div className="shell-x py-24" /></PageShell>
  }

  if (!t) {
    return (
      <PageShell>
        <div className="shell-x py-24 text-center">
          <h1 className="text-3xl">{tr('tm.noneTitle')}</h1>
          <Link to="/treatment" className="btn btn-primary mt-6">
            <ArrowLeft size={18} /> {tr('td.backToMenu')}
          </Link>
        </div>
      </PageShell>
    )
  }

  const related = t.related

  const bookNow = () => {
    add(t)
    navigate({ to: '/booking' })
  }

  return (
    <PageShell>
      <div className="shell-x py-10 sm:py-14">
        <Link to="/treatment" className="nav-link inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> {tr('td.backToMenu')}
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Visual */}
          <div className="relative overflow-hidden rounded-[1.6rem]" style={{ border: '1px solid var(--color-line)' }}>
            <TreatmentThumb t={t} className="aspect-[4/3] w-full" />
            {t.bestSeller && (
              <span
                className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide"
                style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
              >
                <Star size={12} style={{ fill: '#3a2c0f' }} /> BEST SELLER
              </span>
            )}
          </div>

          {/* Info */}
          <div>
            <span className="eyebrow">{tr(`cat.${t.category}` as DictKey)}</span>
            <h1 className="mt-3 text-[2.4rem] leading-tight sm:text-[3rem]">{t.name}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="badge" style={{ background: 'var(--color-muted)', color: 'var(--color-ink-soft)' }}>
                <Clock size={13} /> {t.duration}
              </span>
              {t.available ? (
                <span className="badge badge-ok">
                  <span className="glow-dot" aria-hidden /> {tr('common.available')}
                </span>
              ) : (
                <span className="badge badge-off">
                  <span className="glow-dot is-muted" aria-hidden /> {tr('common.unavailable')}
                </span>
              )}
            </div>

            <p className="mt-6 text-[1.05rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
              {t.blurb}
            </p>

            <div className="mt-8 rounded-2xl p-6" style={{ background: 'var(--color-shell)', border: '1px solid var(--color-line)' }}>
              <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {t.isPromo && t.promoPrice != null && t.promoPrice < t.price ? tr('td.pricePromo') : tr('td.priceFrom')}
              </div>
              <div className="mt-1"><PriceTag t={t} numClass="text-3xl" /></div>
              <div className="mt-1 text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>
                {t.isPromo && t.promoPrice != null && t.promoPrice < t.price
                  ? tr('td.priceWithDiscount')
                  : tr('td.priceExcl')}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn btn-gold" disabled={!t.available} onClick={bookNow}>
                  <CalendarCheck size={18} /> {tr('common.bookNow')}
                </button>
                <AddToCartButton t={t} className="btn btn-outline px-5" label={tr('cart.addLong')} />
              </div>
            </div>

            <ul className="mt-6 flex flex-col gap-2 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              {(['td.bullet1', 'td.bullet2', 'td.bullet3'] as DictKey[]).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="glow-dot" aria-hidden /> {tr(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl">{tr('td.relatedTitle', { category: tr(`cat.${t.category}` as DictKey) })}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to="/treatment/$id"
                  params={{ id: r.id }}
                  className="card-soft flex flex-col overflow-hidden"
                >
                  <TreatmentThumb t={r} className="aspect-[16/10] w-full" />
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base leading-snug">{r.name}</h3>
                    <div className="mt-3"><PriceTag t={r} numClass="text-base" /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
