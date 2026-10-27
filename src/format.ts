import type { Country, Party } from './data/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const parts = (iso: string) => iso.split('-').map(Number)

export const fmtDate = (iso: string) => {
  const [y, m, d] = parts(iso)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export const fmtMonth = (iso: string) => {
  const [y, m] = parts(iso)
  return `${MONTHS[m - 1]} ${y}`
}

export const fmtShortMonth = (iso: string) => MONTHS[parts(iso)[1] - 1]

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const surname = (name: string) =>
  name.startsWith('Marine Le Pen') ? 'Le Pen' : name.split(' ').slice(1).join(' ')

export const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`

export const signed = (n: number) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1))

export function partyOf(country: Country, partyId: string): Party {
  const name = partyId.replace(/^unknown:/, '')
  return country.parties.find((p) => p.id === partyId) ?? { id: partyId, name, short: name, color: '#a8a8a8' }
}

export function candidateParty(country: Country, name: string): Party {
  const c = country.election.candidates.find((c) => c.name === name || surname(c.name) === name)
  return c ? partyOf(country, c.partyId) : partyOf(country, 'ind')
}
