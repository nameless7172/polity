import type { Country, Person } from '../data/types'
import { daysBetween, fmtDate, partyOf, todayIso } from '../format'
import { Card } from './Card'

function tenure(since: string) {
  const days = daysBetween(since, todayIso())
  if (days < 365) return `${Math.round(days / 30.44)} months`
  const years = days / 365.25
  return `${years.toFixed(years < 10 ? 1 : 0)} years`
}

function Leader({ country, person }: { country: Country; person: Person }) {
  const party = partyOf(country, person.partyId)
  return (
    <div className="leader" style={{ borderColor: party.color }}>
      <p className="leader-role">{person.role}</p>
      <p className="leader-name">{person.name}</p>
      <p className="meta">
        {party.name} · since {fmtDate(person.since)} ({tenure(person.since)})
      </p>
      {person.note && <p className="meta">{person.note}</p>}
    </div>
  )
}

export function Leadership({ country }: { country: Country }) {
  const { government } = country
  return (
    <Card
      span={4}
      kicker={`Executive · ${country.system}`}
      title={government.name}
      foot={`Government formed ${fmtDate(government.formed)}. Key ministers shown.`}
    >
      <div className="leaders">
        <Leader country={country} person={country.headOfState} />
        <Leader country={country} person={country.headOfGovernment} />
      </div>
      <p className="body-text">{government.summary}</p>
      <dl className="ministers">
        {government.ministers.map((m) => (
          <div key={m.role}>
            <dt>{m.role}</dt>
            <dd>
              <span className="swatch" style={{ background: partyOf(country, m.partyId).color }} />
              {m.name}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
