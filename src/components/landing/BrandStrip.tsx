import { clinic } from '../../data/clinic'

// Brand positioning "take line" — a slim strip under the hero stating the
// clinic's mindful-beauty promise. Copy lives in clinic.brand* (data/clinic.ts).
export function BrandStrip() {
  return (
    <section
      className="relative"
      style={{ background: 'var(--color-shell)', borderBottom: '1px solid var(--color-line)' }}
    >
      <div className="shell-x">
        <div className="reveal flex flex-col items-center gap-3.5 py-12 text-center sm:py-14">
          <p className="font-display text-[1.85rem] leading-tight tracking-tight sm:text-[2.5rem]">
            <span className="gold-text italic">{clinic.brandExpert}</span>
          </p>
          <div
            className="flex flex-col items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] sm:flex-row sm:gap-4"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <span>{clinic.brandPillars[0]}</span>
            <span className="glow-dot hidden sm:inline-block" aria-hidden />
            <span>{clinic.brandPillars[1]}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
