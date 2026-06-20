import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db'

// Email + password auth. Sessions & roles via additionalFields (role drives
// Pasien/Owner routing). Email verification is off for this self-service portal.
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me-0123456789abcdef',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },

  // App columns on the user table (role drives Pasien/Owner routing).
  user: {
    additionalFields: {
      phone: { type: 'string', required: false, input: true },
      birthDate: { type: 'string', required: false, input: true },
      role: { type: 'string', required: false, defaultValue: 'pasien', input: false },
      loyaltyPoints: { type: 'number', required: false, defaultValue: 0, input: false },
    },
  },

  plugins: [tanstackStartCookies()], // must be last
})

export type Session = typeof auth.$Infer.Session
