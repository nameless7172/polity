import { useMemo, useState } from 'react'
import type { Country } from '../data/types'
import { fmtDate } from '../format'
import { Card } from './Card'

const ROWS = 12
const INNER = 0.42
const SIZE = 300

function seatPositions(total: number) {
  const radii = Array.from({ length: ROWS }, (_, i) => INNER + ((1 - INNER) * i) / (ROWS - 1))
  const sum = radii.reduce((a, b) => a + b, 0)
  const perRow = radii.map((r) => Math.round((total * r) / sum))
  perRow[ROWS - 1] += total - perRow.reduce((a, b) => a + b, 0)

  const seats = radii.flatMap((r, row) =>
    Array.from({ length: perRow[row] }, (_, j) => {
      const angle = Math.PI * (1 - j / (perRow[row] - 1))
      return { angle, x: r * Math.cos(angle), y: r * Math.sin(angle), r }
    }),
  )
  // Sweep left to right so each group fills a wedge.
  return seats.sort((a, b) => b.angle - a.angle || a.r - b.r)
}

export function Hemicycle({ country }: { country: Country }) {
  const { parliament } = country
  const [hover, setHover] = useState<string | null>(null)
  const groupOfSeat = parliament.groups.flatMap((g) => Array<typeof g>(g.seats).fill(g))
  // Vacant seats are possible, so lay out only the seats that are filled.
  const positions = useMemo(() => seatPositions(groupOfSeat.length), [groupOfSeat.length])
  const gov = parliament.groups.filter((g) => g.bloc === 'government').reduce((s, g) => s + g.seats, 0)
  const short = parliament.majority - gov
  const dot = ((1 - INNER) / (ROWS - 1)) * 0.36 * SIZE

  return (
    <Card
      span={5}
      kicker={parliament.name}
      title={short > 0 ? `${gov} of ${parliament.total} seats: ${short} short of a majority` : `Government holds a majority with ${gov} seats`}
      foot={
        <>
          Seats by parliamentary group as of {fmtDate(parliament.asOf)}. {parliament.note} Source:{' '}
          <a href="https://en.wikipedia.org/wiki/National_Assembly_(France)" target="_blank" rel="noreferrer">
            Wikipedia, National Assembly
          </a>
        </>
      }
    >
      <div className="hemicycle-wrap">
        <svg viewBox={`${-SIZE - 8} ${-SIZE - 8} ${2 * SIZE + 16} ${SIZE + 16}`} className="hemicycle" role="img" aria-label="Seat distribution">
          {positions.map((p, i) => {
            const g = groupOfSeat[i]
            return (
              <circle
                key={i}
                cx={p.x * SIZE}
                cy={-p.y * SIZE}
                r={dot}
                fill={g.color}
                opacity={hover && hover !== g.id ? 0.18 : 1}
                onMouseEnter={() => setHover(g.id)}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
          <text x={0} y={-24} textAnchor="middle" className="hemi-total">{parliament.total}</text>
          <text x={0} y={-4} textAnchor="middle" className="axis-label">{parliament.majority} for majority</text>
        </svg>

        <div className="bloc-bar" aria-hidden>
          <span className="gov" style={{ width: `${(gov / parliament.total) * 100}%` }}>Government {gov}</span>
          <span className="opp">Opposition {parliament.total - gov}</span>
          <i className="majority" style={{ left: `${(parliament.majority / parliament.total) * 100}%` }} />
        </div>

        <ul className="legend">
          {parliament.groups.map((g) => (
            <li
              key={g.id}
              className={hover === g.id ? 'active' : undefined}
              onMouseEnter={() => setHover(g.id)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="swatch" style={{ background: g.color }} />
              <span className="legend-name">
                {g.name}
                {g.bloc === 'government' && <em className="tag">gov</em>}
              </span>
              <span className="legend-seats">{g.seats}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
