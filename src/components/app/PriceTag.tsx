import { formatRp, promoOffPct } from '../../data/clinic'
import { useI18n } from '../../lib/i18n'

type PriceLike = { price: number; isPromo?: boolean; promoPrice?: number | null; pricePerUnit?: boolean }

// Promo-aware price display. When the treatment is on a valid promo it shows the
// promo price + struck-through regular price + an auto-computed "HEMAT X%" badge;
// otherwise just the price. Per-unit treatments (e.g. Botox) get a "/unit" suffix.
// Used on the menu, detail page, and landing catalog.
export function PriceTag({ t, numClass = 'text-lg' }: { t: PriceLike; numClass?: string }) {
  const { t: tr } = useI18n()
  const onPromo = !!(t.isPromo && t.promoPrice != null && t.promoPrice < t.price)
  const unit = t.pricePerUnit ? (
    <span className="text-[0.7em] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>/unit</span>
  ) : null

  // Free items (e.g. Konsultasi Dokter) read "Gratis", never "Rp0".
  if (!t.pricePerUnit && t.price === 0 && !onPromo) {
    return <span className={`font-extrabold gold-text ${numClass}`}>Gratis</span>
  }

  if (!onPromo) {
    return (
      <span className="inline-flex items-baseline gap-0.5">
        <span className={`mono font-extrabold gold-text ${numClass}`}>{formatRp(t.price)}</span>
        {unit}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="inline-flex items-baseline gap-0.5">
        <span className={`mono font-extrabold gold-text ${numClass}`}>{formatRp(t.promoPrice as number)}</span>
        {unit}
      </span>
      <span className="mono text-sm line-through" style={{ color: 'var(--color-ink-muted)' }}>{formatRp(t.price)}</span>
      <span className="badge badge-promo">{tr('common.save')} {promoOffPct(t.price, t.promoPrice as number)}%</span>
    </div>
  )
}
