import { bookingSteps } from '../../data/clinic'

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="py-24">
      <div className="shell-x">
        <div className="reveal max-w-xl">
          <span className="eyebrow">Cara Kerja</span>
          <h2 className="mt-3 text-[2.4rem] sm:text-[3rem]">
            Dari pilih treatment sampai <span className="gold-text">bersinar</span> — empat langkah.
          </h2>
        </div>

        <ol
          className="reveal mt-14 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: 'var(--color-line)', background: 'var(--color-line)' }}
        >
          {bookingSteps.map((step) => (
            <li key={step.n} className="relative flex flex-col p-7" style={{ background: 'var(--color-shell)' }}>
              <span
                className="font-display text-6xl font-bold gold-text"
                style={{ fontVariantNumeric: 'lining-nums' }}
              >
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
