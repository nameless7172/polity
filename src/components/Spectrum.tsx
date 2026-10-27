import { useState } from 'react'
import type { Country } from '../data/types'
import { pct } from '../format'
import { Card } from './Card'

const W = 560
const H = 440
const M = 34

export function Spectrum({ country }: { country: Country }) {
  const avg = country.election.polls.firstRound.average
  const [selected, setSelected] = useState<string | null>(null)

  const parties = country.parties
    .filter((p) => p.econ !== undefined && p.social !== undefined)
    .map((p) => {
      const candidate = country.election.candidates.find((c) => c.partyId === p.id)
      const share = candidate ? avg[candidate.name] ?? 0 : 0
      return { ...p, econ: p.econ!, social: p.social!, candidate: candidate?.name, share }
    })
    // Only parties that are polling or in government; minor historical parties add noise.
    .filter((p) => p.share > 0 || p.inGovernment)
    .sort((a, b) => b.share - a.share)

  // Half a point of padding on each axis so edge bubbles stay inside the plot.
  const x = (v: number) => M + ((v + 0.5) / 11) * (W - 2 * M)
  const y = (v: number) => M + (1 - (v + 0.5) / 11) * (H - 2 * M)
  const radius = (share: number) => 5 + Math.sqrt(share) * 3.4
  const labelLeft = (p: (typeof parties)[number]) =>
    parties.some((o) => o !== p && o.econ > p.econ && o.econ - p.econ < 1.5 && Math.abs(o.social - p.social) < 0.8)

  const rightConservative = parties.filter((p) => p.econ >= 4.5 && p.social >= 7).reduce((s, p) => s + p.share, 0)
  const active = parties.find((p) => p.id === selected)
  return (
    <Card
      span={5}
      kicker="Political spectrum"
      title={`Conservative and nationalist right polls ${Math.round(rightConservative)}% combined`}
      foot={`${country.spectrumSource} Bubble size: candidate's first-round polling. Outlined: in government.`}
    >
      <div className="spectrum">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart"
          role="img"
          aria-label="Party positions"
          onMouseLeave={() => setSelected(null)}
        >
          <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} className="plot-bg" />
          <line x1={x(5)} x2={x(5)} y1={M} y2={H - M} className="axis" />
          <line x1={M} x2={W - M} y1={y(5)} y2={y(5)} className="axis" />
          <text x={W / 2} y={M - 10} className="axis-label" textAnchor="middle">↑ Traditionalist, authoritarian</text>
          <text x={W / 2} y={H - M + 18} className="axis-label" textAnchor="middle">↓ Progressive, libertarian</text>
          <text x={M} y={H - M + 18} className="axis-label">← Economic left</text>
          <text x={W - M} y={H - M + 18} className="axis-label" textAnchor="end">Economic right →</text>

          {parties.map((p) => (
            <g
              key={p.id}
              className="bubble"
              onMouseEnter={() => setSelected(p.id)}
              onClick={() => setSelected(p.id)}
              opacity={selected && selected !== p.id ? 0.35 : 1}
            >
              <circle
                cx={x(p.econ)}
                cy={y(p.social)}
                r={radius(p.share)}
                fill={p.color}
                fillOpacity={0.85}
                stroke={p.inGovernment ? '#1b1b1b' : '#fff'}
                strokeWidth={p.inGovernment ? 2 : 1}
              />
              <text
                x={x(p.econ) + (labelLeft(p) ? -1 : 1) * (radius(p.share) + 4)}
                y={y(p.social) + 4}
                textAnchor={labelLeft(p) ? 'end' : 'start'}
                className="bubble-label"
              >
                {p.short}
              </text>
            </g>
          ))}
        </svg>

        <p className="meta spectrum-detail">
          {active
            ? `${active.name}${active.candidate ? ` · ${active.candidate}, ${pct(active.share)}` : ''}${active.inGovernment ? ' · in government' : ''}`
            : 'Hover a party for details.'}
        </p>
      </div>
    </Card>
  )
}
