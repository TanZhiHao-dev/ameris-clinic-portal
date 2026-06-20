import { createFileRoute } from '@tanstack/react-router'
import { seedDatabase } from '#/server/seed'

// Dev-only convenience: seed the DB from the original mock data via the
// running server (so it reuses the live PGlite connection).
export const Route = createFileRoute('/api/seed')({
  server: {
    handlers: {
      GET: async () => {
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
