import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '#/db'
import { runMigrations } from '#/db/migrate'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await runMigrations()
          const r = await db.execute(sql`select 1 as ok`)
          return new Response(
            JSON.stringify({ ok: true, db: 'pglite', result: (r as any).rows ?? r }),
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
