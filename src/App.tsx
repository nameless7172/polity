import { Approval } from './components/Approval'
import { Section } from './components/Card'
import { FirstRound } from './components/Election'
import { Flag } from './components/Flag'
import { ElectionDates } from './components/ElectionDates'
import { Hemicycle } from './components/Hemicycle'
import { Leadership } from './components/Leadership'
import { Powers } from './components/Powers'
import { Runoffs } from './components/Runoffs'
import { Spectrum } from './components/Spectrum'
import { Standfirst } from './components/Standfirst'
import { Timeline } from './components/Timeline'
import { TrendChart } from './components/TrendChart'
import { COUNTRIES } from './countries'
import type { Country } from './data/types'
import { fmtDate, todayIso } from './format'
import { SITE_NAME, SITE_TAGLINE, countryPath } from './seo'

export function App({ country }: { country: Country }) {
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-row">
          <a className="brand" href="/">{SITE_NAME}</a>
          <p className="masthead-tagline">{SITE_TAGLINE}</p>
          <p className="masthead-date">{fmtDate(todayIso())}</p>
        </div>
        <nav className="tabs" aria-label="Countries">
          {COUNTRIES.map((c) => (
            <a
              key={c.id}
              href={countryPath(c)}
              className="tab"
              aria-current={c.id === country.id ? 'page' : undefined}
            >
              <Flag colors={c.flag} size="small" />
              {c.name}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <header className="country-head">
          <h1>
            <Flag colors={country.flag} size="large" />
            {country.name}
          </h1>
          <Standfirst country={country} />
        </header>

        <Section id="government" title="Government">
          <Leadership country={country} />
          <Hemicycle country={country} />
          <Approval country={country} />
          <Powers country={country} />
        </Section>

        <Section id="election" title={`${country.election.title} ${country.election.firstRound.slice(0, 4)}`}>
          <ElectionDates country={country} />
          <FirstRound country={country} />
          <div className="span-5 stack">
            <Runoffs country={country} />
            <Spectrum country={country} />
          </div>
          <TrendChart country={country} />
        </Section>

        <Section id="dates" title="Key dates">
          <Timeline country={country} />
        </Section>

        <footer className="colophon">
          <div>
            <p className="label">Data</p>
            <ul>
              {Object.entries(country.dataStatus).map(([name, s]) => (
                <li key={name} className={s.ok ? undefined : 'stale'}>
                  {name}:{' '}
                  {s.ok
                    ? `updated ${fmtDate(s.updatedAt!.slice(0, 10))}`
                    : `update failed, showing data from ${s.lastGood ? fmtDate(s.lastGood.slice(0, 10)) : 'an earlier build'}`}
                </li>
              ))}
              {country.unknownParties.length > 0 && (
                <li className="stale">Parties without a colour yet, shown in grey: {country.unknownParties.join(', ')}</li>
              )}
            </ul>
            <p className="meta">Refreshed automatically every day. Spectrum positions are fixed expert estimates.</p>
          </div>
          <div>
            <p className="label">Sources</p>
            <ul>
              {country.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </main>
    </div>
  )
}
