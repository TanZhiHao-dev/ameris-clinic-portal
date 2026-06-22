import { formatRp, promoOffPct } from '../../data/clinic'

type PriceLike = { price: number; isPromo?: boolean; promoPrice?: number | null }

// Promo-aware price display. When the treatment is on a valid promo it shows the
// promo price + struck-through regular price + an auto-computed "HEMAT X%" badge;
// otherwise just the price. Used on the menu, detail page, and landing catalog.
export function PriceTag({ t, numClass = 'text-lg' }: { t: PriceLike; numClass?: string }) {
  const onPromo = !!(t.isPromo && t.promoPrice != null && t.promoPrice < t.price)

  if (!onPromo) {
    return <span className={`mono font-extrabold gold-text ${numClass}`}>{formatRp(t.price)}</span>
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`mono font-extrabold gold-text ${numClass}`}>{formatRp(t.promoPrice as number)}</span>
      <span className="mono text-sm line-through" style={{ color: 'var(--color-ink-muted)' }}>{formatRp(t.price)}</span>
      <span className="badge badge-promo">HEMAT {promoOffPct(t.price, t.promoPrice as number)}%</span>
    </div>
  )
}
