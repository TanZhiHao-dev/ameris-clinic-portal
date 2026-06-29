import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { PageShell } from '../components/app/PageShell'
import { useCart, minQtyFor } from '../lib/cart'
import { formatRp, loyaltyPointsFor } from '../data/clinic'
import { useI18n } from '../lib/i18n'

export const Route = createFileRoute('/keranjang')({ component: CartPage })

function CartPage() {
  const { items, setQty, remove, subtotal, count, hydrated } = useCart()
  const { t } = useI18n()

  return (
    <PageShell>
      <section className="py-12 sm:py-16" style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
        <div className="shell-x">
          <span className="eyebrow">{t('kr.eyebrow')}</span>
          <h1 className="mt-3 text-[2.4rem] sm:text-[3rem]">{t('kr.title')}</h1>

          {!hydrated ? null : items.length === 0 ? (
            <div className="card-soft mt-8 flex flex-col items-center p-14 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--color-muted)' }}>
                <ShoppingBag size={26} style={{ color: 'var(--color-gold-deep)' }} />
              </div>
              <p className="mt-5 text-xl font-bold">{t('kr.emptyTitle')}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {t('kr.emptyBody')}
              </p>
              <Link to="/treatment" className="btn btn-gold mt-6">
                {t('bk.emptyCta')} <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
              {/* Items */}
              <div className="flex flex-col gap-4">
                {items.map((i) => {
                  const min = minQtyFor(i)
                  return (
                  <div key={i.id} className="card-soft flex items-center gap-4 p-4 sm:p-5">
                    <div className="flex-1">
                      <h3 className="text-base leading-snug">{i.name}</h3>
                      <div className="mono mt-1 text-sm font-bold gold-text">
                        {formatRp(i.price)}{i.pricePerUnit && <span className="font-semibold" style={{ color: 'var(--color-ink-muted)' }}>/unit</span>}
                      </div>
                      {i.pricePerUnit && (
                        <div className="mt-1 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>
                          {i.qty} unit · {formatRp(i.price * i.qty)}{min > 1 ? ` · min. ${min}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 rounded-full p-1" style={{ border: '1px solid var(--color-line)' }}>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty - 1)}
                        disabled={i.pricePerUnit && i.qty <= min}
                        className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={t('kr.decrease')}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="mono w-9 text-center text-sm font-bold">{i.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-muted)]"
                        aria-label={t('kr.increase')}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(i.id)}
                      className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[var(--color-muted)]"
                      style={{ color: 'var(--color-rose)' }}
                      aria-label={t('kr.removeAria', { name: i.name })}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="card-soft h-fit p-6 lg:sticky lg:top-28">
                <h3 className="text-lg">{t('kr.summary')}</h3>
                <div className="mt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between" style={{ color: 'var(--color-ink-soft)' }}>
                    <span>{t('kr.subtotal', { count })}</span>
                    <span className="mono font-semibold">{formatRp(subtotal)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--color-ink-muted)' }}>
                    <span>{t('bk.estPoints')}</span>
                    <span className="mono">+{loyaltyPointsFor(subtotal)} {t('kr.pointsWord')}</span>
                  </div>
                </div>
                <div className="my-4 hairline-gold" />
                <div className="flex items-end justify-between">
                  <span className="font-bold">{t('bk.total')}</span>
                  <span className="mono text-2xl font-extrabold gold-text">{formatRp(subtotal)}</span>
                </div>
                <Link to="/booking" className="btn btn-gold mt-6 w-full">
                  {t('kr.continue')} <ArrowRight size={18} />
                </Link>
                <Link to="/treatment" className="btn btn-ghost mt-3 w-full">
                  {t('kr.addMore')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  )
}
