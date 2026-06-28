import { createFileRoute } from '@tanstack/react-router'
import { midtransConfigured, settlePayment, verifySignature } from '#/server/_midtrans'

// Midtrans HTTP(S) notification (webhook). Configure the URL in the Midtrans
// dashboard → Settings → Configuration → Payment Notification URL:
//   https://<your-host>/api/midtrans/notification
// Every status change (settlement, pending, expire, …) is POSTed here.
export const Route = createFileRoute('/api/midtrans/notification')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Without a server key, signatures can't be trusted — refuse to settle.
        if (!midtransConfigured) {
          return Response.json({ ok: false, error: 'gateway not configured' }, { status: 503 })
        }
        let body: any
        try {
          body = await request.json()
        } catch {
          return Response.json({ ok: false, error: 'invalid json' }, { status: 400 })
        }

        const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } =
          body ?? {}
        if (!order_id || !transaction_status) {
          return Response.json({ ok: false, error: 'missing fields' }, { status: 400 })
        }
        if (!verifySignature({ order_id, status_code, gross_amount, signature_key })) {
          return Response.json({ ok: false, error: 'invalid signature' }, { status: 403 })
        }

        const res = await settlePayment({
          orderId: order_id,
          transactionStatus: transaction_status,
          fraudStatus: fraud_status,
          grossAmount: gross_amount,
        })
        if (!res) return Response.json({ ok: false, error: 'order not found' }, { status: 404 })
        return Response.json({ ok: true, ...res })
      },
    },
  },
})
