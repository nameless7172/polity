// Everything here is either stable reference data (party colours, spectrum positions, the
// constitution) or derived from france-live.json, which the daily job refreshes.
import type { ApprovalPoint, Country, Party, PollData, SeatGroup, TimelineEvent } from './types'
import live from './france-live.json'
import reference from './france-reference.json'
import { fmtDate } from '../format'

const TOTAL_SEATS = 577
const MAJORITY = 289
const TERM_YEARS = 5
const KEY_PORTFOLIOS = [/interior/i, /econom(y|ics)|financ/i, /foreign/i, /armed forces|defen/i, /justice/i, /labour/i]

const parties = reference.parties as Party[]
const partyName = (id: string) => parties.find((p) => p.id === id)?.name ?? id.replace(/^unknown:/, '')
const wikiUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURI(title.replace(/ /g, '_'))}`
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

const { leaders, government: gov, parliament: assembly, election: dates } = live
const polls = { ...live.polls, candidates: undefined } as unknown as PollData
const candidates = Object.entries(live.polls.candidates as Record<string, string>).map(([name, partyId]) => ({ name, partyId }))

// Government bloc: Assembly groups whose party holds at least one ministry.
const ministerParties = new Set(gov.ministers.map((m) => m.partyId))
const groups: SeatGroup[] = reference.groups.map((g) => ({
  id: g.id,
  name: g.name,
  color: g.color,
  seats: (assembly.seats as Record<string, number>)[g.id] ?? 0,
  bloc: g.parties.some((p) => ministerParties.has(p)) ? 'government' : 'opposition',
}))
const govSeats = groups.filter((g) => g.bloc === 'government').reduce((s, g) => s + g.seats, 0)
const hasMajority = govSeats >= MAJORITY

const namedGovParties = [...ministerParties].filter((p) => !['ind', 'dvd', 'dvg'].includes(p) && !p.startsWith('unknown:'))
const hasIndependents = [...ministerParties].some((p) => ['ind', 'dvd', 'dvg'].includes(p))
const coalition = listJoin([...namedGovParties.map(partyName), ...(hasIndependents ? ['independents'] : [])])

const presidentInGovernment = ministerParties.has(leaders.headOfState.partyId)
const rightNow = hasMajority
  ? `The government's parties hold a majority in the Assembly (${govSeats} of ${TOTAL_SEATS} seats), so the President and Prime Minister can pass their programme.`
  : !presidentInGovernment
    ? `Cohabitation: the government comes from outside the President's camp, so the Prime Minister leads domestic policy while the President keeps foreign affairs and defence.`
    : `No majority: the government's parties hold ${govSeats} of ${TOTAL_SEATS} seats. It passes laws bill by bill and survives only while the opposition does not unite behind a censure motion (${MAJORITY} votes).`

const yearsAtElection = (Date.parse(dates.firstRound) - Date.parse(leaders.headOfState.since)) / (365.25 * 86_400_000)
const termNote =
  yearsAtElection >= TERM_YEARS
    ? `${leaders.headOfState.name} has served two terms and cannot run.`
    : `${leaders.headOfState.name} can seek a second term.`

const roleLabel = (role: string) =>
  role.replace(/^Minister (of|for) (the )?/i, '').split(',')[0].trim()
const keyMinisters = KEY_PORTFOLIOS.flatMap((re) => {
  const m = gov.ministers.find((x) => re.test(x.role))
  return m ? [{ ...m, role: roleLabel(m.role) }] : []
})

const approvalSeries = Object.entries(live.approval.series as Record<string, ApprovalPoint[]>)
  .filter(([name]) => name === leaders.headOfState.name || name === leaders.headOfGovernment.name)
  .map(([label, points]) => ({ label, points }))

const THREE_YEARS_AGO = new Date(Date.now() - 3 * 365.25 * 86_400_000).toISOString().slice(0, 10)
const timeline: TimelineEvent[] = [
  { date: assembly.lastElection, label: 'Last legislative election' },
  { date: leaders.headOfState.since, label: `${leaders.headOfState.name} takes office as President` },
  { date: leaders.headOfGovernment.since, label: `${leaders.headOfGovernment.name} appointed Prime Minister` },
  ...(gov.formed !== leaders.headOfGovernment.since ? [{ date: gov.formed, label: `${gov.name} formed` }] : []),
  { date: dates.firstRound, label: 'Presidential election, first round' },
  ...(dates.secondRound ? [{ date: dates.secondRound, label: 'Presidential election, runoff' }] : []),
  ...(live.events as TimelineEvent[]),
].filter((e) => e.date && e.date >= THREE_YEARS_AGO)

export const france: Country = {
  id: 'fr',
  name: 'France',
  flag: ['#002654', '#ffffff', '#ce1126'],
  system: 'Semi-presidential republic',
  updated: live.generatedAt.slice(0, 10),
  dataStatus: live.status,
  unknownParties: live.unknownParties,

  headOfState: { ...leaders.headOfState, role: 'President' },
  headOfGovernment: { ...leaders.headOfGovernment, role: 'Prime Minister' },

  government: {
    name: gov.name,
    formed: gov.formed,
    summary: `${hasMajority ? 'Majority' : 'Minority'} government of ${coalition}.`,
    ministers: keyMinisters,
  },

  powers: {
    offices: [
      {
        office: 'President',
        holder: leaders.headOfState.name,
        chosen: 'Direct popular vote, 5-year term, max. two in a row',
        powers: [
          'Appoints the Prime Minister and, on their proposal, the ministers',
          'Commander-in-chief; leads foreign and defence policy',
          'Can dissolve the National Assembly (at most once a year)',
          'Can call referendums and take emergency powers (Art. 16)',
        ],
      },
      {
        office: 'Prime Minister & government',
        holder: leaders.headOfGovernment.name,
        chosen: 'Appointed by the President, must survive the Assembly',
        powers: [
          'Runs day-to-day domestic policy and the administration',
          'Drafts the budget and most legislation',
          'Can force a bill through without a vote (Art. 49.3), at the risk of a censure motion',
          'Answerable to the Assembly; formally, the President cannot dismiss them',
        ],
      },
      {
        office: 'National Assembly',
        holder: `${TOTAL_SEATS} deputies${hasMajority ? '' : ', no majority'}`,
        chosen: 'Direct vote in single-member constituencies, two rounds, 5-year term',
        powers: [
          'Passes laws and the budget; has the final word over the Senate',
          `Can topple the government with a censure motion (${MAJORITY} votes)`,
          'Scrutinises ministers through questions and inquiries',
        ],
      },
      {
        office: 'Senate',
        holder: '348 senators',
        chosen: 'Indirect vote by local officials, 6-year term, half renewed every 3 years',
        powers: ['Reviews and amends all legislation', 'Must approve constitutional changes', 'Cannot topple the government'],
      },
    ],
    rightNow,
    source: { label: 'Constitution of France (Wikipedia)', url: wikiUrl('Constitution of France') },
  },

  approval: {
    source: { label: 'Ipsos BVA – La Tribune Dimanche monthly barometer', url: reference.sources.approval },
    series: approvalSeries,
  },

  election: {
    title: 'Presidential election',
    firstRound: dates.firstRound,
    secondRound: dates.secondRound ?? undefined,
    note: `If nobody wins a majority, the top two meet in a runoff. ${termNote}`,
    pollSource: {
      label: 'Wikipedia: Opinion polling for the 2027 French presidential election',
      url: wikiUrl(reference.sources.polls),
    },
    polls,
    candidates,
  },

  parliament: {
    name: 'National Assembly',
    total: TOTAL_SEATS,
    majority: MAJORITY,
    asOf: assembly.asOf,
    note: `${groups.some((g) => g.seats >= MAJORITY) ? 'One group holds a majority.' : 'No group holds a majority.'} Last election: ${fmtDate(assembly.lastElection)}.`,
    groups,
  },

  parties: parties.map((p) => ({ ...p, inGovernment: ministerParties.has(p.id) })),
  spectrumSource:
    'Approximate positions on 0–10 scales, modelled on the Chapel Hill Expert Survey. Indicative, not exact scores.',

  timeline,

  sources: [
    { label: 'Wikipedia: 2027 presidential election polling', url: wikiUrl(reference.sources.polls) },
    { label: 'Wikipedia: 2027 French presidential election', url: wikiUrl(reference.sources.election) },
    { label: 'Wikipedia: National Assembly', url: wikiUrl(reference.sources.assembly) },
    { label: `Wikipedia: ${gov.name}`, url: wikiUrl(gov.article) },
    { label: 'Wikidata: heads of state and government', url: 'https://www.wikidata.org/wiki/Q142' },
    { label: 'Ipsos BVA political barometer', url: reference.sources.approval },
  ],
}
