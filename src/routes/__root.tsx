import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRouteWithContext, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'

import { CartProvider } from '../lib/cart'
import { I18nProvider } from '../lib/i18n'
import { initAnalytics, trackPageView } from '../lib/analytics'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Ameris Aesthetic Clinic — Refine Your Beauty | Booking Online',
      },
      {
        name: 'description',
        content:
          'Portal mandiri Ameris Aesthetic Clinic (Gading Serpong): lihat menu treatment, promo paket, booking jadwal online, dan kumpulkan poin Ameris Privilege Club. #RefineYourBeauty',
      },
      {
        name: 'theme-color',
        content: '#c39a44',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '48x48 32x32',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
})

// GA4 bootstrap + SPA page views. Renders nothing; no-ops entirely when
// VITE_GA_MEASUREMENT_ID is unset (see lib/analytics.ts).
function Analytics() {
  const router = useRouter()
  useEffect(() => {
    initAnalytics()
    trackPageView(window.location.pathname)
    return router.subscribe('onResolved', ({ fromLocation, toLocation }) => {
      if (fromLocation?.pathname !== toLocation.pathname) trackPageView(toLocation.pathname)
    })
  }, [router])
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <CartProvider>{children}</CartProvider>
        </I18nProvider>
        <Analytics />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
