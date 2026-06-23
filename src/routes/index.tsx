import { createFileRoute } from '@tanstack/react-router'
import { promosQuery, redeemTiersQuery, treatmentsQuery } from '../server/queries'
import { SiteHeader } from '../components/landing/SiteHeader'
import { Hero } from '../components/landing/Hero'
import { Catalog } from '../components/landing/Catalog'
import { Promo } from '../components/landing/Promo'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Loyalty } from '../components/landing/Loyalty'
import { ValueProps } from '../components/landing/ValueProps'
import { Testimonials } from '../components/landing/Testimonials'
import { FinalCta } from '../components/landing/FinalCta'
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

function Home() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Hero />
        <Catalog />
        <Promo />
        <HowItWorks />
        <Loyalty />
        <ValueProps />
        <Testimonials />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
