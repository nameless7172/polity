import type { Country } from '../data/types'
import { Card } from './Card'

export function Powers({ country }: { country: Country }) {
  const { offices, rightNow, source } = country.powers
  return (
    <Card
      span={12}
      kicker="Institutions"
      title="Who holds which power"
      foot={
        <>
          Source: <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
        </>
      }
    >
      <div className="offices">
        {offices.map((o) => (
          <div key={o.office} className="office">
            <p className="leader-role">{o.office}</p>
            <p className="office-holder">{o.holder}</p>
            <p className="meta">{o.chosen}</p>
            <ul>
              {o.powers.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="right-now">
        <strong>Right now:</strong> {rightNow}
      </p>
    </Card>
  )
}
