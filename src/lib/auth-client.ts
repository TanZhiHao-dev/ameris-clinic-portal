import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '#/lib/auth'

// Prefer the build-time public URL, but fall back to the current origin so the
// client always calls its OWN domain. Hardcoding localhost silently broke
// production auth (mixed-content / failed session) whenever VITE_APP_URL wasn't
// set as a build variable.
const baseURL =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : undefined)

export const authClient = createAuthClient({
  baseURL,
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, signOut, useSession } = authClient
