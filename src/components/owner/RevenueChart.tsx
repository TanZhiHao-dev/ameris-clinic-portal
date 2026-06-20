import { useEffect, useMemo, useState } from 'react'
import { formatRp } from '../../data/owner'

type Point = { label: string; value: number }

const W = 720
const H = 240
const PAD_X = 26
const PAD_TOP = 46
const PAD_BOTTOM = 34

// Keep NaN/Infinity out of SVG attributes — a single non-finite coordinate
// corrupts the whole <path>/<circle> and renders nothing.
const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback)

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function ChartMessage({ message }: { message: string }) {
  return (
    <div className="grid h-40 place-items-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>
      {message}
    </div>
  )
}

export function RevenueChart({ data, loading = false }: { data: Point[]; loading?: boolean }) {
  // Tolerate a null/undefined prop instead of crashing on `.length`, and coerce
  // each value to a finite number so a stray NaN/Infinity/null from the data
  // source can never poison the coordinate math downstream.
  const series = useMemo<Point[]>(() => {
    const arr = Array.isArray(data) ? data : []
    return arr.map((d) => ({
      label: String(d?.label ?? ''),
      value: Number.isFinite(d?.value) ? (d.value as number) : 0,
    }))
  }, [data])

  // reduce with an explicit initial index of 0 => always a valid integer index,
  // never NaN (the empty case is short-circuited).
  const peak = useMemo(
    () => (series.length ? series.reduce((mi, d, i, a) => (d.value > a[mi].value ? i : mi), 0) : 0),
    [series],
  )
  const [hover, setHover] = useState(peak)

  // Re-sync the active point to the new peak whenever the dataset changes, so
  // hover can never point past a shrunken series even if the parent drops the
  // remount key.
  useEffect(() => {
    setHover(peak)
  }, [peak])

  // A line chart needs >= 2 points. Distinguish a still-loading fetch from a
  // genuinely empty/insufficient dataset instead of crashing or mislabeling.
  if (series.length === 0) {
    return <ChartMessage message={loading ? 'Memuat data…' : 'Belum ada data pendapatan.'} />
  }
  if (series.length === 1) {
    return <ChartMessage message="Belum cukup data untuk grafik." />
  }

  // Clamp both ends and null-coalesce the active point: pts[idx]/active.x/.y can
  // never read from undefined.
  const idx = Math.min(Math.max(hover, 0), series.length - 1)

  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const baseY = PAD_TOP + innerH

  // Vertical scale folds in a zero baseline so positive, negative, and
  // mixed-sign series all map sensibly. min/max via reduce (seeded at 0) avoids
  // both the Math.max(...spread) argument limit and the all-zero `0/0` divide;
  // `span` falls back to 1 when the range is degenerate (all-equal/all-zero).
  const lo = series.reduce((m, d) => Math.min(m, d.value), 0)
  const hiRaw = series.reduce((m, d) => Math.max(m, d.value), 0)
  const hi = hiRaw + Math.abs(hiRaw) * 0.12
  const span = hi - lo > 0 ? hi - lo : 1

  const denom = Math.max(series.length - 1, 1)
  const px = (i: number) => safe(PAD_X + (innerW * i) / denom, PAD_X)
  const py = (v: number) => safe(baseY - (innerH * (v - lo)) / span, baseY)
  // y of the value=0 line: the correct baseline for the area fill + hover guide.
  const zeroY = py(0)

  const pts = series.map((d, i) => ({ x: px(i), y: py(d.value), ...d }))

  const line = smoothPath(pts)
  const area = `${line} L ${px(series.length - 1)} ${zeroY} L ${px(0)} ${zeroY} Z`

  const active = pts[idx] ?? pts[0]
  const tipW = 132
  const tipX = safe(Math.min(Math.max(active.x - tipW / 2, PAD_X - 6), W - PAD_X - tipW + 6), PAD_X)
  const segW = innerW / denom

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Grafik pendapatan">
      <defs>
        <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4ad55" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#d4ad55" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rev-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e7d39c" />
          <stop offset="55%" stopColor="#c8a14a" />
          <stop offset="100%" stopColor="#b58a32" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD_X} x2={W - PAD_X} y1={PAD_TOP + innerH * (1 - f)} y2={PAD_TOP + innerH * (1 - f)} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 5" />
      ))}

      {/* area + line */}
      <path d={area} fill="url(#rev-fill)" />
      <path d={line} fill="none" stroke="url(#rev-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* hover guide */}
      <line x1={active.x} x2={active.x} y1={active.y} y2={zeroY} stroke="var(--color-gold)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />

      {/* dots */}
      {pts.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={p.x} cy={p.y} r={i === idx ? 6.5 : 4} fill="#fdfaf4" stroke="#c8a14a" strokeWidth={i === idx ? 3 : 2} />
          {/* hit area */}
          <rect
            x={p.x - segW / 2}
            y={0}
            width={segW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
            style={{ cursor: 'pointer' }}
          />
        </g>
      ))}

      {/* tooltip */}
      <g transform={`translate(${tipX}, ${safe(Math.max(active.y - 52, 4), 4)})`}>
        <rect width={tipW} height="38" rx="10" fill="var(--color-espresso)" />
        <text x={tipW / 2} y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e7d39c" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{active.label}</text>
        <text x={tipW / 2} y="30" textAnchor="middle" fontSize="14" fontWeight="800" fill="#faf3e6" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRp(active.value)}</text>
      </g>

      {/* x labels */}
      {pts.map((p, i) => (
        <text key={`l-${p.label}-${i}`} x={p.x} y={H - 10} textAnchor="middle" fontSize="13" fontWeight={i === idx ? 700 : 500} fill={i === idx ? 'var(--color-ink)' : 'var(--color-ink-muted)'}>
          {p.label}
        </text>
      ))}
    </svg>
  )
}
