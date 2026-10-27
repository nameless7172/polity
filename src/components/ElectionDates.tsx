import type { Country } from '../data/types'
import { daysBetween, fmtDate, todayIso } from '../format'

export function ElectionDates({ country }: { country: Country }) {
  const { election } = country
  const today = todayIso()
  return (
    <div className="module span-12 dates-strip">
      <div className="dates-countdown">
        <span className="dates-number">{daysBetween(today, election.firstRound)}</span>
        <span className="dates-unit">days to go</span>
      </div>
      <dl className="dates-list">
        <div>
          <dt>First round</dt>
          <dd>{fmtDate(election.firstRound)}</dd>
        </div>
        {election.secondRound && (
          <div>
            <dt>Second round</dt>
            <dd>{fmtDate(election.secondRound)}</dd>
          </div>
        )}
      </dl>
      <p className="dates-note">{election.note}</p>
    </div>
  )
}
