type BrandProps = {
  tone?: 'dark' | 'light'
  withTagline?: boolean
  /** Overrides the "Aesthetic Clinic" line — e.g. "Owner Console". */
  subtitle?: string
}

// The Ameris lockup: the gold circular mark + the AMERIS wordmark. The mark is a
// cream-background badge clipped to a circle, so it reads as a gold coin on dark
// surfaces and blends into cream ones. `tone` colours the sub-line for the
// background it sits on.
export function Brand({ tone = 'dark', withTagline = false, subtitle }: BrandProps) {
  const sub = tone === 'light' ? 'var(--color-gold-light)' : 'var(--color-ink-muted)'
  const line = subtitle ?? (withTagline ? 'Aesthetic Clinic' : null)
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/brand/ameris-mark.png"
        alt=""
        aria-hidden
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
      <span className="inline-flex flex-col leading-none">
        <span className="font-display gold-text text-[1.4rem] font-semibold uppercase leading-none tracking-[0.2em]">Ameris</span>
        {line && (
          <span className="mt-[0.35em] text-[0.56rem] font-semibold uppercase tracking-[0.32em]" style={{ color: sub }}>
            {line}
          </span>
        )}
      </span>
    </span>
  )
}
