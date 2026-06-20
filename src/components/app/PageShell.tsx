import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { SiteFooter } from '../landing/SiteFooter'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
