import {
  Atom,
  Crown,
  Droplets,
  type LucideIcon,
  Sparkles,
  Syringe,
  Zap,
} from 'lucide-react'
import type { Treatment } from '../../data/clinic'

// Brand-tone gradients keyed by treatment modality.
const GRADS = {
  blush: ['#f7e0d2', '#e7bda6'],
  champagne: ['#f4ebd3', '#e0cd9f'],
  gold: ['#f0ddad', '#d3a850'],
  rose: ['#f1dacb', '#d8aa8f'],
  goldsoft: ['#f4e7bf', '#ddc17b'],
  paket: ['#eedcb3', '#ccac64'],
} as const

type Kind = 'bloom' | 'ripple' | 'radiance' | 'drop' | 'molecule' | 'arcs'

const ICON: Record<Kind, LucideIcon> = {
  bloom: Sparkles,
  ripple: Droplets,
  radiance: Zap,
  drop: Syringe,
  molecule: Atom,
  arcs: Crown,
}

function classify(t: Treatment): { kind: Kind; from: string; to: string } {
  const n = t.name.toLowerCase()
  let kind: Kind = 'bloom'
  let key: keyof typeof GRADS = 'blush'
  switch (t.category) {
    case 'Facial': kind = 'bloom'; key = 'blush'; break
    case 'Peeling': kind = 'ripple'; key = 'champagne'; break
    case 'Laser': kind = 'radiance'; key = 'gold'; break
    case 'Skinbooster': kind = 'drop'; key = 'rose'; break
    case 'Injeksi': kind = 'molecule'; key = 'goldsoft'; break
    case 'Paket': kind = 'arcs'; key = 'paket'; break
  }
  if (n.includes('exosome')) { kind = 'radiance'; key = 'gold' }
  else if (n.includes('dna') || n.includes('salmon') || n.includes('pdrn')) { kind = 'molecule' }
  else if (t.id.startsWith('iv-') || n.includes('infusion')) { kind = 'drop'; key = 'goldsoft' }
  return { kind, from: GRADS[key][0], to: GRADS[key][1] }
}

/** Kept for small icon chips elsewhere (e.g. booking summary). */
export function getVisual(t: Treatment) {
  const { kind, from, to } = classify(t)
  return { Icon: ICON[kind], from, to, kind }
}

const STROKE = 'rgba(58,44,15,0.5)'
const FILL = 'rgba(58,44,15,0.07)'
const GOLD = 'rgba(154,115,32,0.6)'
const SHINE = 'rgba(255,255,255,0.8)'

function Sparkle({ x, y, s = 1, c = SHINE }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <path
      transform={`translate(${x},${y}) scale(${s})`}
      d="M0,-5 C0.7,-1.6 1.6,-0.7 5,0 C1.6,0.7 0.7,1.6 0,5 C-0.7,1.6 -1.6,0.7 -5,0 C-1.6,-0.7 -0.7,-1.6 0,-5 Z"
      fill={c}
    />
  )
}

function Motif({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'bloom':
      return (
        <g>
          <g transform="translate(60,46)">
            {Array.from({ length: 6 }).map((_, i) => (
              <path key={i} transform={`rotate(${i * 60})`} d="M0,0 C9,-13 9,-30 0,-41 C-9,-30 -9,-13 0,0 Z" fill={FILL} stroke={STROKE} strokeWidth="1.4" />
            ))}
            <circle r="4.5" fill={STROKE} />
          </g>
          <Sparkle x={97} y={22} s={1.3} c={GOLD} />
          <Sparkle x={24} y={64} s={0.8} />
        </g>
      )
    case 'radiance':
      return (
        <g>
          <g transform="translate(60,45)">
            {Array.from({ length: 14 }).map((_, i) => {
              const a = (i * (360 / 14) * Math.PI) / 180
              const r2 = i % 2 ? 30 : 39
              return <line key={i} x1={Math.cos(a) * 15} y1={Math.sin(a) * 15} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={STROKE} strokeWidth="1.4" strokeLinecap="round" />
            })}
            <circle r="9.5" fill={FILL} stroke={STROKE} strokeWidth="1.4" />
            <circle r="3.2" fill={STROKE} />
          </g>
          <Sparkle x={99} y={26} s={1.1} c={GOLD} />
          <Sparkle x={22} y={68} s={0.8} />
        </g>
      )
    case 'ripple':
      return (
        <g fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round">
          {['M6,34 Q33,22 60,34 T114,34', 'M6,48 Q33,36 60,48 T114,48', 'M6,62 Q33,50 60,62 T114,62'].map((d, i) => (
            <path key={i} d={d} opacity={1 - i * 0.14} />
          ))}
          <Sparkle x={96} y={20} s={1.1} c={GOLD} />
        </g>
      )
    case 'drop':
      return (
        <g>
          <path d="M60,12 C72,30 79,40 60,48 C41,40 48,30 60,12 Z" fill={FILL} stroke={STROKE} strokeWidth="1.4" />
          <circle cx="60" cy="36" r="3" fill={STROKE} />
          <g fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round">
            <path d="M30,60 Q60,72 90,60" opacity="0.9" />
            <path d="M39,67 Q60,76 81,67" opacity="0.7" />
            <path d="M48,73 Q60,79 72,73" opacity="0.55" />
          </g>
          <Sparkle x={95} y={22} s={1} c={GOLD} />
        </g>
      )
    case 'molecule': {
      const nodes: [number, number][] = [
        [60, 44], [38, 27], [85, 29], [91, 57], [57, 67], [29, 54],
      ]
      return (
        <g>
          <g stroke={STROKE} strokeWidth="1.2">
            {nodes.slice(1).map((p, i) => (
              <line key={i} x1={nodes[0][0]} y1={nodes[0][1]} x2={p[0]} y2={p[1]} />
            ))}
            <line x1={nodes[1][0]} y1={nodes[1][1]} x2={nodes[2][0]} y2={nodes[2][1]} />
            <line x1={nodes[4][0]} y1={nodes[4][1]} x2={nodes[5][0]} y2={nodes[5][1]} />
          </g>
          {nodes.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 5 : 3.2} fill={i === 0 ? STROKE : FILL} stroke={STROKE} strokeWidth="1.2" />
          ))}
          <Sparkle x={20} y={30} s={0.8} c={GOLD} />
        </g>
      )
    }
    case 'arcs':
      return (
        <g>
          <path d="M44,44 A16,16 0 0,1 76,44 Z" fill={FILL} stroke={STROKE} strokeWidth="1.4" />
          <g fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round">
            {['M28,64 Q60,40 92,64', 'M38,66 Q60,48 82,66', 'M48,68 Q60,56 72,68'].map((d, i) => (
              <path key={i} d={d} opacity={1 - i * 0.16} />
            ))}
          </g>
          <Sparkle x={60} y={20} s={1.3} c={GOLD} />
          <Sparkle x={94} y={40} s={0.8} />
        </g>
      )
  }
}

export function TreatmentThumb({ t, className }: { t: Treatment; className?: string }) {
  const { kind, from, to } = classify(t)

  // Real photo when provided; artful motif otherwise.
  if (t.image) {
    return (
      <div className={`relative overflow-hidden ${className ?? ''}`}>
        <img src={t.image} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
      aria-hidden
    >
      {/* soft glow highlight */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(115% 85% at 14% 4%, rgba(255,255,255,0.6), transparent 55%)' }} />
      {/* fine grain */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(58,44,15,0.12) 0.6px, transparent 0.6px)',
          backgroundSize: '5px 5px',
          maskImage: 'radial-gradient(circle at 65% 40%, black, transparent 80%)',
        }}
      />
      <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" width="100%" height="100%">
        <Motif kind={kind} />
      </svg>
    </div>
  )
}
