import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '#/db'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Migrations already run once at boot (see src/db/index.ts), so keep
          // this probe cheap — it's polled every 30s by the container healthcheck.
          // Report the live driver so a deploy can be confirmed on real Postgres.
          const driver = process.env.DATABASE_URL ? 'postgres' : 'pglite'
          const r = await db.execute(sql`select 1 as ok`)
          return new Response(
            JSON.stringify({ ok: true, db: driver, result: (r as any).rows ?? r }),
            { headers: { 'content-type': 'application/json' } },
          )
        } catch (e) {
          const err = e as any
          return new Response(
            JSON.stringify({
              ok: false,
              error: String(e),
              cause: err?.cause ? String(err.cause) : null,
              causeStack: err?.cause?.stack ?? null,
            }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          )
        }
      },
    },
  },
})
