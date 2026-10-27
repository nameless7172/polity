import type { Country } from '../data/types'
import { daysBetween, fmtDate, todayIso } from '../format'

export function Timeline({ country }: { country: Country }) {
  const today = todayIso()
  const events = [...country.timeline].sort((a, b) => a.date.localeCompare(b.date))
  const items = [
    ...events.filter((e) => e.date <= today).map((e) => ({ ...e, kind: 'past' as const })),
    { date: today, label: 'Today', kind: 'today' as const },
    ...events.filter((e) => e.date > today).map((e) => ({ ...e, kind: 'upcoming' as const })),
  ]

  return (
    <div className="module span-12">
      <ol className="timeline" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((e) => (
          <li key={e.date + e.label} className={e.kind}>
            <time>{fmtDate(e.date)}</time>
            <p>{e.label}</p>
            {e.kind === 'upcoming' && <p className="in-days">in {daysBetween(today, e.date)} days</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
