import type { Country } from '../data/types'
import { candidateParty, fmtDate, fmtShortMonth, signed, surname } from '../format'
import { Card } from './Card'

const W = 1100
const H = 250
const M = { top: 12, right: 130, bottom: 26, left: 32 }
const SHOWN = 5
const LABEL_GAP = 14

export function TrendChart({ country }: { country: Country }) {
  const { trend, firstRound } = country.election.polls
  const names = Object.keys(firstRound.average).slice(0, SHOWN)
  const t0 = Date.parse(trend[0].date)
  const t1 = Date.parse(trend[trend.length - 1].date)
  const yMax = Math.ceil((Math.max(...trend.flatMap((p) => names.map((n) => p.values[n] ?? 0))) + 2) / 10) * 10

  const x = (iso: string) => M.left + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - M.left - M.right)
  const y = (v: number) => M.top + (1 - v / yMax) * (H - M.top - M.bottom)

  const series = names.map((name) => {
    const pts = trend.filter((p) => p.values[name] !== undefined)
    return { name, pts, color: candidateParty(country, name).color }
  })

  // End labels: keep them from overlapping by pushing apart top to bottom.
  const labels = series
    .map((s) => {
      const last = s.pts[s.pts.length - 1]
      return { ...s, value: last.values[s.name], ly: y(last.values[s.name]) }
    })
    .sort((a, b) => a.ly - b.ly)
  labels.forEach((l, i) => {
    if (i > 0 && l.ly - labels[i - 1].ly < LABEL_GAP) l.ly = labels[i - 1].ly + LABEL_GAP
  })

  const months = Array.from(new Set(trend.map((p) => p.date.slice(0, 7))))
    .map((m) => `${m}-01`)
    .filter((d) => Date.parse(d) >= t0)

  const movers = series
    .map((s) => ({ name: s.name, change: s.pts[s.pts.length - 1].values[s.name] - s.pts[0].values[s.name] }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  const top = movers[0]

  return (
    <Card
      span={12}
      kicker="First round · trend"
      title={`Biggest mover since ${fmtShortMonth(trend[0].date)}: ${surname(top.name)}, ${signed(top.change)} pts`}
      foot={
        <>
          Rolling 14-day average of published polls, weekly from {fmtDate(trend[0].date)}. Source:{' '}
          <a href={country.election.pollSource.url} target="_blank" rel="noreferrer">
            {country.election.pollSource.label}
          </a>
        </>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Polling trend">
        {Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={M.left - 6} y={y(v) + 4} className="axis-label" textAnchor="end">{v}</text>
          </g>
        ))}
        {months.map((m) => (
          <text key={m} x={x(m)} y={H - 8} className="axis-label" textAnchor="middle">{fmtShortMonth(m)}</text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.pts.map((p) => `${x(p.date)},${y(p.values[s.name])}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={2.25}
            strokeLinejoin="round"
          />
        ))}
        {labels.map((l) => (
          <g key={l.name}>
            <circle cx={W - M.right} cy={y(l.value)} r={3} fill={l.color} />
            <text x={W - M.right + 8} y={l.ly + 4} className="line-label">
              <tspan fontWeight={600}>{l.value.toFixed(0)}</tspan> {surname(l.name)}
            </text>
          </g>
        ))}
      </svg>
    </Card>
  )
}
