// Client-side Midtrans Snap orchestration. Calls the payment server functions,
// loads snap.js on demand, opens the hosted popup, and — when no real keys are
// configured — drives an in-app sandbox dialog instead. Returns a `pay()` that
// resolves to the payment outcome, plus a `dialog` node to render.
import { useCallback, useState } from 'react'
import { CreditCard, Loader2, ShieldCheck, X } from 'lucide-react'
import { formatRp } from '../data/clinic'
import { confirmPayment, createSnapPayment, simulatePaymentResult } from '../server/payments'

export type PayOutcome = 'success' | 'pending' | 'closed' | 'error'

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: (result: unknown) => void
          onPending?: (result: unknown) => void
          onError?: (result: unknown) => void
          onClose?: () => void
        },
      ) => void
    }
  }
}

let snapPromise: Promise<void> | null = null
function loadSnapScript(src: string, clientKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.snap) return Promise.resolve()
  if (snapPromise) return snapPromise
  snapPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.setAttribute('data-client-key', clientKey)
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      snapPromise = null
      reject(new Error('Gagal memuat Midtrans Snap.'))
    }
    document.head.appendChild(s)
  })
  return snapPromise
}

type SimState = {
  orderId: string
  amount: number
  plan: string
  resolve: (o: PayOutcome) => void
}

export function useMidtransPay() {
  const [busy, setBusy] = useState(false)
  const [sim, setSim] = useState<SimState | null>(null)

  const pay = useCallback(async (bookingId: string): Promise<PayOutcome> => {
    setBusy(true)
    try {
      const res = await createSnapPayment({ data: { bookingId } })

      // No real keys → resolve through the in-app sandbox dialog.
      if (res.simulated) {
        return await new Promise<PayOutcome>((resolve) =>
          setSim({ orderId: res.orderId, amount: res.amount, plan: res.plan, resolve }),
        )
      }

      // Real Snap popup.
      await loadSnapScript(res.snapJsUrl, res.clientKey)
      if (!window.snap) return 'error'
      return await new Promise<PayOutcome>((resolve) => {
        window.snap!.pay(res.token, {
          onSuccess: async () => {
            try {
              await confirmPayment({ data: { bookingId } })
            } catch {
              /* webhook will reconcile */
            }
            resolve('success')
          },
          onPending: async () => {
            try {
              await confirmPayment({ data: { bookingId } })
            } catch {
              /* ignore */
            }
            resolve('pending')
          },
          onError: () => resolve('error'),
          onClose: () => resolve('closed'),
        })
      })
    } finally {
      setBusy(false)
    }
  }, [])

  const finishSim = async (outcome: 'success' | 'pending' | 'cancel') => {
    if (!sim) return
    const { orderId, resolve } = sim
    if (outcome === 'cancel') {
      setSim(null)
      resolve('closed')
      return
    }
    try {
      await simulatePaymentResult({ data: { orderId, outcome } })
    } catch {
      /* ignore */
    }
    setSim(null)
    resolve(outcome)
  }

  const dialog = sim ? <SimDialog sim={sim} onFinish={finishSim} /> : null

  return { pay, dialog, busy }
}

// ── In-app sandbox dialog (simulation mode only) ──
function SimDialog({
  sim,
  onFinish,
}: {
  sim: SimState
  onFinish: (o: 'success' | 'pending' | 'cancel') => Promise<void>
}) {
  const [working, setWorking] = useState<'success' | 'pending' | null>(null)
  const run = async (o: 'success' | 'pending') => {
    setWorking(o)
    await onFinish(o)
  }
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }}
    >
      <div className="card-soft w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="flex items-center gap-2">
            <CreditCard size={18} style={{ color: 'var(--color-gold)' }} />
            <span className="font-bold">Midtrans Sandbox</span>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => onFinish('cancel')} disabled={!!working} className="opacity-80 transition hover:opacity-100 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Mode simulasi — belum ada kunci Midtrans asli. Pilih hasil pembayaran untuk menguji alur.
          </p>
          <div className="my-4 flex items-end justify-between rounded-2xl p-4" style={{ background: 'var(--color-cream)' }}>
            <div>
              <div className="text-[0.72rem] uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
                {sim.plan === 'dp' ? 'DP 50%' : 'Bayar penuh'}
              </div>
              <div className="mono text-xs" style={{ color: 'var(--color-ink-muted)' }}>{sim.orderId}</div>
            </div>
            <span className="mono text-2xl font-extrabold gold-text">{formatRp(sim.amount)}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={() => run('success')} disabled={!!working} className="btn btn-gold w-full disabled:opacity-60">
              {working === 'success' ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              Bayar sekarang — Sukses
            </button>
            <button type="button" onClick={() => run('pending')} disabled={!!working} className="btn btn-ghost w-full disabled:opacity-60">
              {working === 'pending' ? <Loader2 size={17} className="animate-spin" /> : null}
              Tandai sebagai Pending
            </button>
            <button type="button" onClick={() => onFinish('cancel')} disabled={!!working} className="py-1 text-sm font-semibold disabled:opacity-40" style={{ color: 'var(--color-rose)' }}>
              Batalkan pembayaran
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
