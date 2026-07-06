// Google Analytics 4 — funnel tracking for the public site & booking flow.
//
// Entirely inert unless VITE_GA_MEASUREMENT_ID is set (a "G-XXXXXXXXXX" id from
// analytics.google.com → Admin → Data streams). Local dev and preview builds
// therefore never send hits. VITE_ vars are baked at build time, so production
// needs the var set in Coolify *before* the deploy build.
//
// Events use GA4's standard e-commerce names (view_item, add_to_cart,
// begin_checkout, purchase) so the built-in Monetization funnel reports work
// without extra setup, plus two custom events that measure the leaks this was
// added to watch: login_gate_shown and slot_taken_error.

const GA_ID = (import.meta.env as Record<string, string | undefined>).VITE_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function initAnalytics() {
  if (!GA_ID || typeof window === 'undefined' || window.gtag) return
  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  // Page views are sent manually on router navigation (see __root.tsx) so SPA
  // transitions count too — not just the first document load.
  window.gtag('config', GA_ID, { send_page_view: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', event, params)
}

export function trackPageView(path: string) {
  track('page_view', { page_path: path, page_location: window.location.href })
}

/** GA4 e-commerce `items` array from cart-shaped rows. */
export const gaItems = (rows: Array<{ id: string; name: string; price: number; qty?: number }>) =>
  rows.map((r) => ({ item_id: r.id, item_name: r.name, price: r.price, quantity: r.qty ?? 1 }))
