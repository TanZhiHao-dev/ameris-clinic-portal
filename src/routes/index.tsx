import { createFileRoute } from '@tanstack/react-router'
import { promosQuery, redeemTiersQuery, treatmentsQuery } from '../server/queries'
import { SiteHeader } from '../components/landing/SiteHeader'
import { Hero } from '../components/landing/Hero'
import { Catalog } from '../components/landing/Catalog'
import { Promo } from '../components/landing/Promo'
import { AboutMe } from '../components/landing/AboutMe'
import { Loyalty } from '../components/landing/Loyalty'
import { Statistics } from '../components/landing/Statistics'
import { Testimonials } from '../components/landing/Testimonials'
import { Contact } from '../components/landing/Contact'
import { SiteFooter } from '../components/landing/SiteFooter'

export const Route = createFileRoute('/')({
  // Prefetch on the server so the menu/promos/tiers are in the initial HTML.
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(treatmentsQuery),
      queryClient.ensureQueryData(promosQuery),
      queryClient.ensureQueryData(redeemTiersQuery),
    ]),
  component: Home,
})

// Landing section order:
// Hero · Treatment menu · Weekly promos · About Me · Privilege Club ·
// Statistics · Client Love · Contact
function Home() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Hero />
        <Catalog />
        <Promo />
        <AboutMe />
        <Loyalty />
        <Statistics />
        <Testimonials />
        <Contact />
      </main>
      <SiteFooter showLocation={false} />
    </div>
  )
}
