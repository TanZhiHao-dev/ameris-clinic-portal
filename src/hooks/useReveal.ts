import { useEffect } from 'react'

/**
 * Adds `.is-in` to any element with `.reveal` once it scrolls into view.
 * Runs after hydration. `.reveal` is only hidden once this effect "arms" it by
 * adding `.reveal-on` to <html> — so if the client JS never runs (failed
 * hydration / blocked bundle), the content stays visible instead of being
 * invisible forever.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('reveal-on')

    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (!els.length) return

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
