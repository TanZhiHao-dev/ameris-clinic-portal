import { useEffect, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import type { MedicalRecord } from '../../data/owner'

/**
 * Deterministic faux clinical skin photo (SSR-safe via Math.sin hash — no
 * Math.random). "after" reads brighter, smoother, with fewer blemishes.
 * Swap for a real <img src={record.before/after}> once photos exist.
 */
function SkinPhoto({ seed, variant }: { seed: string; variant: 'before' | 'after' }) {
  const after = variant === 'after'
  const gid = `skin-${seed}-${variant}`.replace(/[^a-z0-9-]/gi, '')

  let h = 0
  for (const c of seed + variant) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const rng = (i: number) => {
    const x = Math.sin((i + 1) * ((h % 97) + 7)) * 10000
    return x - Math.floor(x)
  }

  const count = after ? 5 : 15
  const spots = Array.from({ length: count }, (_, i) => ({
    cx: 12 + rng(i * 3) * 76,
    cy: 14 + rng(i * 3 + 1) * 74,
    r: (after ? 1.6 : 2.6) + rng(i * 3 + 2) * (after ? 1.4 : 3.6),
    o: after ? 0.08 + rng(i) * 0.05 : 0.16 + rng(i) * 0.16,
  }))

  const c0 = after ? '#f8e1d3' : '#edc7b3'
  const c1 = after ? '#e7bda7' : '#cb997f'
  const spot = after ? '#cf9279' : '#9a5b46'

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={`Foto ${variant}`}>
      <defs>
        <radialGradient id={gid} cx="42%" cy="36%" r="78%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="100%" stopColor={c1} />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {spots.map((s, i) => (
        <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.r} ry={s.r * 0.82} fill={spot} opacity={s.o} />
      ))}
      {after && <ellipse cx="40" cy="30" rx="44" ry="38" fill="#ffffff" opacity="0.16" />}
    </svg>
  )
}

function PhotoTile({ seed, variant, onOpen }: { seed: string; variant: 'before' | 'after'; onOpen: () => void }) {
  const after = variant === 'after'
  return (
    <button type="button" onClick={onOpen} className="group relative aspect-[4/5] overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-line)' }}>
      <SkinPhoto seed={seed} variant={variant} />
      <span
        className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide"
        style={after ? { background: 'var(--grad-gold)', color: '#3a2c0f' } : { background: 'rgba(33,28,23,0.62)', color: '#f6eddc' }}
      >
        {after ? 'After' : 'Before'}
      </span>
      <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100" style={{ background: 'rgba(33,28,23,0.25)' }}>
        <Maximize2 size={20} style={{ color: '#fff' }} />
      </span>
    </button>
  )
}

export function BeforeAfter({ record }: { record: MedicalRecord }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div>
      <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
        Foto before &amp; after
      </div>
      <div className="grid max-w-[260px] grid-cols-2 gap-2">
        <PhotoTile seed={record.id} variant="before" onOpen={() => setOpen(true)} />
        <PhotoTile seed={record.id} variant="after" onOpen={() => setOpen(true)} />
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" style={{ background: 'rgba(33,28,23,0.82)' }} onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6" style={{ background: 'var(--color-shell)', boxShadow: 'var(--shadow-lift)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{record.treatment}</div>
                <div className="text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>{record.skin}</div>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[var(--color-muted)]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(['before', 'after'] as const).map((v) => (
                <div key={v} className="relative aspect-[4/5] overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-line)' }}>
                  <SkinPhoto seed={record.id} variant={v} />
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-3 py-1 text-[0.66rem] font-bold uppercase tracking-wide"
                    style={v === 'after' ? { background: 'var(--grad-gold)', color: '#3a2c0f' } : { background: 'rgba(33,28,23,0.62)', color: '#f6eddc' }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[0.78rem]" style={{ color: 'var(--color-ink-muted)' }}>
              Representasi kondisi kulit (demo). Foto asli akan tampil di sini bila diunggah.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
