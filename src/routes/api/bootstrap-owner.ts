import { createFileRoute } from '@tanstack/react-router'
import { ensureOwner } from '#/server/bootstrap'

// Provision (or repair) an owner login on a permanent DB without a destructive
// re-seed. NON-destructive: only touches the one owner account. Credentials are
// passed in the request (never committed), so nothing secret lives in git.
//
// Guard (same scheme as /api/seed):
//   • SEED_TOKEN set   → request must pass ?token=<SEED_TOKEN> (or x-seed-token header)
//   • SEED_TOKEN unset → allowed only outside production (local dev convenience)
//
//   curl -X POST 'https://host/api/bootstrap-owner?token=TOKEN' \
//     -H 'content-type: application/json' \
//     -d '{"email":"owner@example.com","password":"...","name":"Owner"}'
export const Route = createFileRoute('/api/bootstrap-owner')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const expected = process.env.SEED_TOKEN
        const isProd = process.env.NODE_ENV === 'production'
        const url = new URL(request.url)
        const provided = url.searchParams.get('token') ?? request.headers.get('x-seed-token')

        if (expected) {
          if (!provided || provided !== expected) {
            return Response.json({ ok: false, error: 'invalid or missing token' }, { status: 401 })
          }
        } else if (isProd) {
          return Response.json(
            { ok: false, error: 'bootstrap disabled in production unless SEED_TOKEN is set' },
            { status: 403 },
          )
        }

        let body: { email?: string; password?: string; name?: string } = {}
        try {
          body = (await request.json()) as typeof body
        } catch {
          // allow query-param fallback below
        }
        const email = (body.email ?? url.searchParams.get('email') ?? '').trim()
        const password = body.password ?? url.searchParams.get('password') ?? ''
        const name = body.name ?? url.searchParams.get('name') ?? undefined

        if (!email || !email.includes('@')) {
          return Response.json({ ok: false, error: 'valid email required' }, { status: 400 })
        }
        if (password.length < 6) {
          return Response.json({ ok: false, error: 'password must be at least 6 characters' }, { status: 400 })
        }

        try {
          const res = await ensureOwner({ email, password, name })
          return Response.json(res)
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 })
        }
      },
    },
  },
})
