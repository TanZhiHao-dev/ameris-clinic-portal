import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '#/lib/auth'

// In the browser, ALWAYS call our own origin — the auth API is same-origin, so
// the page's origin is always correct. We must NOT use the build-time
// VITE_APP_URL here: it's inlined at build and defaults to http://localhost:3000
// (per the Dockerfile), which on the live https site causes mixed-content
// ("Not Secure") and blocked auth requests. VITE_APP_URL is only a server-side
// fallback (SSR), where window is unavailable.
const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env.VITE_APP_URL || undefined

export const authClient = createAuthClient({
  baseURL,
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, signOut, useSession } = authClient
