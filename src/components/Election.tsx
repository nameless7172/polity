import type { Country } from '../data/types'
import { candidateParty, fmtDate, pct, signed, surname } from '../format'
import { Card } from './Card'

export function FirstRound({ country }: { country: Country }) {
  const { election } = country
  const fr = election.polls.firstRound
  const rows = Object.entries(fr.average)
  const max = rows[0][1]
  const [first, second, third] = rows
  const title =
    second[1] - third[1] < 5
      ? `${surname(first[0])} leads clearly; second place is open`
      : `${surname(first[0])} and ${surname(second[0])} on course for the runoff`

  return (
    <Card
      span={7}
      kicker="First round · polling average"
      title={title}
      foot={
        <>
          Average of {fr.pollCount} polls, {fmtDate(fr.windowStart)} – {fmtDate(fr.windowEnd)} ({fr.pollsters.join(', ')}).
          Change against four weeks earlier. Source:{' '}
          <a href={election.pollSource.url} target="_blank" rel="noreferrer">{election.pollSource.label}</a>
        </>
      }
    >
      <ol className="candidates">
        {rows.flatMap(([name, value], i) => {
          const party = candidateParty(country, name)
          const before = fr.fourWeeksAgo[name]
          const delta = before === undefined ? undefined : value - before
          const row = (
            <li key={name} className="candidate">
              <span className="candidate-name">
                <span className="swatch" style={{ background: party.color }} />
                {name}
                <span className="candidate-party">{party.name}</span>
              </span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(value / max) * 100}%`, background: party.color }} />
              </span>
              <span className="bar-value">{pct(value)}</span>
              <span className={`bar-delta${delta === undefined ? '' : delta >= 1 ? ' up' : delta <= -1 ? ' down' : ''}`}>
                {delta === undefined ? 'new' : signed(delta)}
              </span>
            </li>
          )
          return i === 1
            ? [row, <li key="cutoff" className="cutoff-line"><span>Qualify for the second round</span></li>]
            : [row]
        })}
      </ol>
    </Card>
  )
}
