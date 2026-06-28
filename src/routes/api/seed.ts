import { createFileRoute } from '@tanstack/react-router'
import { seedDatabase } from '#/server/seed'

// Seed the DB from the original mock data via the running server (reuses the
// live DB connection — PGlite in dev, real Postgres when DATABASE_URL is set).
//
// ⚠️ DESTRUCTIVE: seedDatabase() wipes EVERY table before re-inserting. On a
// permanent production DB this must not be reachable anonymously. Guard:
//   • SEED_TOKEN set  → request must pass ?token=<SEED_TOKEN> (or an
//     `x-seed-token` header) that matches. Required to seed in production.
//   • SEED_TOKEN unset → allowed only outside production (local dev
//     convenience); refused when NODE_ENV=production.
export const Route = createFileRoute('/api/seed')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const expected = process.env.SEED_TOKEN
        const isProd = process.env.NODE_ENV === 'production'
        const provided =
          new URL(request.url).searchParams.get('token') ??
          request.headers.get('x-seed-token')

        // Also block when a real Postgres is connected (DATABASE_URL set) even if
        // NODE_ENV is not 'production' — staging/preview deploys use real DBs too.
        const hasRealDb = !!process.env.DATABASE_URL
        if (expected) {
          if (!provided || provided !== expected) {
            return Response.json(
              { ok: false, error: 'invalid or missing seed token' },
              { status: 401 },
            )
          }
        } else if (isProd || hasRealDb) {
          return Response.json(
            { ok: false, error: 'seeding disabled when DATABASE_URL is set — configure SEED_TOKEN to enable' },
            { status: 403 },
          )
        }

        try {
          const counts = await seedDatabase()
          return Response.json({ ok: true, ...counts })
        } catch (e) {
          return Response.json(
            { ok: false, error: String(e), cause: String((e as any)?.cause ?? '') },
            { status: 500 },
          )
        }
      },
    },
  },
})
