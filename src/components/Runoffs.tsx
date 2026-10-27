import type { Country } from '../data/types'
import { candidateParty, pct } from '../format'
import { Card } from './Card'

export function Runoffs({ country }: { country: Country }) {
  const { runoffs } = country.election.polls
  const common = runoffs[0].b
  const wins = runoffs.filter((r) => r.bPct > 50).length
  const title =
    wins === runoffs.length
      ? `${common} wins every runoff tested`
      : `${common} wins ${wins} of ${runoffs.length} runoffs tested`

  return (
    <Card
      span={5}
      kicker="Second round · head-to-heads"
      title={title}
      foot={
        <>
          Average of polls from the last 30 days for each matchup. Source:{' '}
          <a href={country.election.pollSource.url} target="_blank" rel="noreferrer">
            {country.election.pollSource.label}
          </a>
        </>
      }
    >
      <ul className="runoffs">
        {runoffs.map((r) => {
          const a = candidateParty(country, r.a)
          const b = candidateParty(country, r.b)
          return (
            <li key={r.a}>
              <div className="runoff-labels">
                <span>
                  <strong>{r.a}</strong> {pct(r.aPct)}
                </span>
                <span className="meta">{r.polls} polls</span>
                <span>
                  {pct(r.bPct)} <strong>{r.b}</strong>
                </span>
              </div>
              <div className="runoff-bar">
                <span style={{ width: `${r.aPct}%`, background: a.color }} />
                <span style={{ width: `${r.bPct}%`, background: b.color }} />
                <i className="midline" />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
