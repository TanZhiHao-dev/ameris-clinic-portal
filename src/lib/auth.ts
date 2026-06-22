import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db'
import { resetPasswordEmail, sendEmail } from '#/server/_email'

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
    // Forgot-password delivery via Resend (src/server/_email.ts). The link points
    // at our own /reset-password page carrying the raw token. With no RESEND_API_KEY
    // set, sendEmail falls back to logging the message to the server console, so
    // the flow still works un-configured.
    sendResetPassword: async ({ user, token }) => {
      const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
      const link = `${base}/reset-password?token=${token}`
      const { subject, html, text } = resetPasswordEmail({ name: user.name, link })
      await sendEmail({ to: user.email, subject, html, text })
    },
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
