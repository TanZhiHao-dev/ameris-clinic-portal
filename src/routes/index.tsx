import { createFileRoute } from '@tanstack/react-router'
import { SiteHeader } from '../components/landing/SiteHeader'
import { Hero } from '../components/landing/Hero'
import { Catalog } from '../components/landing/Catalog'
import { Promo } from '../components/landing/Promo'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Loyalty } from '../components/landing/Loyalty'
import { ValueProps } from '../components/landing/ValueProps'
import { FinalCta } from '../components/landing/FinalCta'
import { SiteFooter } from '../components/landing/SiteFooter'
import { useReveal } from '../hooks/useReveal'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  useReveal()
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
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
