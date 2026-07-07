import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'

// The Chromium `beforeinstallprompt` event (not in the standard lib types).
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'ameris-install-dismissed'

// A single "Pasang aplikasi" button that adapts to the platform:
//   • Android / desktop Chrome → real one-tap install via beforeinstallprompt.
//   • iPhone / iPad (Safari has no install API) → opens step-by-step guidance.
// Renders nothing when already installed (standalone) or after the user
// dismisses it for the session.
export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(true) // assume installed until we know
  const [dismissed, setDismissed] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    // Register the SW so Chrome will offer installation (best-effort).
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})

    const nav = navigator as Navigator & { standalone?: boolean }
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    setStandalone(isStandalone)

    const ua = navigator.userAgent
    setIsIOS(/iphone|ipad|ipod/i.test(ua))
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Hidden when already installed, dismissed, or (on non-iOS) no install offer yet.
  if (standalone || dismissed) return null
  if (!deferred && !isIOS) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      if (choice.outcome === 'accepted') setStandalone(true)
    } else {
      setShowHelp(true)
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4" style={{ pointerEvents: 'none' }}>
        <div
          className="flex items-center gap-3 rounded-full py-2 pl-4 pr-2 shadow-lg"
          style={{ background: 'var(--color-espresso)', color: '#f6eddc', pointerEvents: 'auto', boxShadow: '0 10px 30px -10px rgba(33,28,23,0.6)' }}
        >
          <Download size={18} style={{ color: 'var(--color-gold)' }} />
          <span className="text-sm font-semibold">Pasang aplikasi Ameris di HP</span>
          <button
            type="button"
            onClick={onClick}
            className="rounded-full px-4 py-1.5 text-sm font-bold transition"
            style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}
          >
            Pasang
          </button>
          <button type="button" aria-label="Tutup" onClick={dismiss} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-[rgba(246,237,220,0.12)]">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS guidance — Safari can't install programmatically. */}
      {showHelp && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" style={{ background: 'rgba(33,28,23,0.55)', backdropFilter: 'blur(3px)' }} onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl" style={{ background: 'var(--color-cream)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
              <span className="font-bold">Pasang ke Layar Utama</span>
              <button type="button" aria-label="Tutup" onClick={() => setShowHelp(false)} className="opacity-80 hover:opacity-100"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Di iPhone/iPad, buka lewat <b style={{ color: 'var(--color-ink)' }}>Safari</b>, lalu:
              </p>
              <ol className="mt-4 flex flex-col gap-3">
                <Step n="1" icon={<Share size={17} />} text={<>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bawah layar.</>} />
                <Step n="2" icon={<SquarePlus size={17} />} text={<>Pilih <b>“Tambahkan ke Layar Utama” / “Add to Home Screen”</b>.</>} />
                <Step n="3" icon={<Download size={17} />} text={<>Ketuk <b>Tambah</b> — ikon Ameris muncul di layar utama.</>} />
              </ol>
              <button type="button" onClick={() => setShowHelp(false)} className="btn btn-gold mt-5 w-full">Mengerti</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Step({ n, icon, text }: { n: string; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>{n}</span>
      <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
        <span style={{ color: 'var(--color-gold-deep)' }}>{icon}</span>
        <span>{text}</span>
      </span>
    </li>
  )
}
