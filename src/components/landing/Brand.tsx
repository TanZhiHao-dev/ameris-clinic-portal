type BrandProps = {
  tone?: 'dark' | 'light'
  withTagline?: boolean
}

export function Brand({ tone = 'dark', withTagline = false }: BrandProps) {
  const sub = tone === 'light' ? 'rgba(246,237,220,0.62)' : 'var(--color-ink-muted)'
  return (
    <span className="inline-flex flex-col leading-none">
      <span className="inline-flex items-center gap-[0.15em]">
        <span className="glow-dot mb-1.5" aria-hidden />
        <span className="script gold-text text-[2.15rem] leading-[0.8]">Ameris</span>
      </span>
      {withTagline && (
        <span
          className="mt-1 pl-[0.1em] text-[0.58rem] font-semibold uppercase tracking-[0.34em]"
          style={{ color: sub }}
        >
          Aesthetic Clinic
        </span>
      )}
    </span>
  )
}
