import type { ApprovalPoint, Country } from '../data/types'
import { fmtMonth, fmtShortMonth, signed } from '../format'
import { Card } from './Card'

const W = 200
const H = 90
const PAD = 8
const GAP_DAYS = 60

function Sparkline({ points }: { points: ApprovalPoint[] }) {
  const t = points.map((p) => Date.parse(p.date))
  // Evenly spaced by reading; long gaps are drawn dashed instead of stretched.
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD)
  const y = (v: number) => H - PAD - (v / 50) * (H - 2 * PAD)

  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="sparkline" role="img" aria-label="Approval trend">
      <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} className="axis" />
      {points.slice(1).map((p, i) => {
        const gap = (t[i + 1] - t[i]) / 86_400_000 > GAP_DAYS
        return (
          <line
            key={p.date}
            x1={x(i)} y1={y(points[i].approve)} x2={x(i + 1)} y2={y(p.approve)}
            className={gap ? 'spark-gap' : 'spark-line'}
          />
        )
      })}
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.approve)} r={3} className="spark-dot" />
          <text x={x(i)} y={y(p.approve) - 7} className="spark-value" textAnchor="middle">{p.approve}</text>
        </g>
      ))}
      <text x={PAD} y={H + 12} className="axis-label">{fmtMonth(points[0].date)}</text>
      <text x={W - PAD} y={H + 12} className="axis-label" textAnchor="end">
        {fmtMonth(points[points.length - 1].date)}
      </text>
    </svg>
  )
}

export function Approval({ country }: { country: Country }) {
  const { series, source } = country.approval
  const latest = series.map((s) => s.points[s.points.length - 1].approve)
  const title =
    Math.max(...latest) < 25
      ? 'Fewer than one in four approve of either leader'
      : 'Executive approval'

  return (
    <Card
      span={3}
      kicker="Approval"
      title={title}
      foot={
        <>
          Dashed line: no data published. Source:{' '}
          <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
        </>
      }
    >
      <div className="approval-list">
        {series.map((s) => {
          const pts = s.points
          const last = pts[pts.length - 1]
          const prev = pts[pts.length - 2]
          return (
            <div key={s.label} className="approval-row">
              <div>
                <p className="approval-name">{s.label}</p>
                <p className="approval-value">
                  {last.approve}%<span className="approval-unit"> approve</span>
                </p>
                <p className="meta">
                  {signed(last.approve - prev.approve)} vs {fmtShortMonth(prev.date)}
                  {last.disapprove && ` · ${last.disapprove}% disapprove`}
                </p>
              </div>
              <Sparkline points={pts} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
