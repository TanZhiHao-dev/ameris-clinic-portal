import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { treatments } from '#/db/schema'

// Serves a treatment's image as real bytes. The public treatment list/detail
// return a URL to this endpoint instead of inlining the (up to ~600 KB) base64
// data URL into every response and the SSR HTML — which had bloated the landing
// page to several megabytes. Cached aggressively; the `v` query param (image
// length) busts the cache when the owner uploads a different image.
export const Route = createFileRoute('/api/treatment-image')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const id = new URL(request.url).searchParams.get('id')
        if (!id) return new Response('Missing id', { status: 400 })

        const [row] = await db
          .select({ image: treatments.image })
          .from(treatments)
          .where(eq(treatments.id, id))
          .limit(1)

        const img = row?.image
        if (!img) return new Response('Not found', { status: 404 })

        // External URL — redirect to it (kept https → no mixed content).
        if (/^https?:\/\//.test(img)) return Response.redirect(img, 302)

        // data:<mime>;base64,<payload>
        const m = /^data:([^;]+);base64,(.*)$/s.exec(img)
        if (!m) return new Response('Unsupported image', { status: 415 })
        const [, contentType, b64] = m
        const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
        if (!ALLOWED_TYPES.has(contentType)) return new Response('Unsupported image type', { status: 415 })
        const bytes = Buffer.from(b64, 'base64')
        return new Response(bytes, {
          headers: {
            'content-type': contentType,
            'x-content-type-options': 'nosniff',
            'cache-control': 'public, max-age=86400',
          },
        })
      },
    },
  },
})
