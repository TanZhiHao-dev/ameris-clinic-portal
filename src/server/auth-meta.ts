import { createServerFn } from '@tanstack/react-start'

// Public auth config the login page needs — currently just which social
// providers are wired. Reads env directly (no DB/auth import) so it stays cheap.
export const authConfig = createServerFn({ method: 'GET' }).handler(async () => ({
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
}))
