export interface Party {
  id: string
  name: string
  short: string
  color: string
  /** 0 = far left, 10 = far right (economic); absent when no expert position exists */
  econ?: number
  /** 0 = libertarian / progressive, 10 = authoritarian / traditionalist */
  social?: number
  inGovernment?: boolean
}

export interface Person {
  name: string
  role: string
  partyId: string
  since: string
  note?: string
}

export interface ApprovalPoint {
  date: string
  approve: number
  disapprove?: number
}

export interface SeatGroup {
  id: string
  name: string
  seats: number
  color: string
  bloc: 'government' | 'opposition'
}

export interface Candidate {
  name: string
  partyId: string
}

export interface PollData {
  asOf: string
  firstRound: {
    windowStart: string
    windowEnd: string
    pollCount: number
    pollsters: string[]
    average: Record<string, number>
    fourWeeksAgo: Record<string, number>
  }
  trend: { date: string; values: Record<string, number> }[]
  runoffs: { a: string; b: string; polls: number; aPct: number; bPct: number }[]
}

export interface TimelineEvent {
  date: string
  label: string
  upcoming?: boolean
  /** Only the month is known */
  approx?: boolean
}

export interface SectionStatus {
  ok: boolean
  updatedAt?: string
  error?: string
  lastGood?: string | null
}

export interface Country {
  id: string
  name: string
  flag: string[]
  system: string
  updated: string
  dataStatus: Record<string, SectionStatus>
  unknownParties: string[]
  headOfState: Person
  headOfGovernment: Person
  government: {
    name: string
    formed: string
    summary: string
    ministers: { role: string; name: string; partyId: string }[]
  }
  powers: {
    offices: { office: string; holder: string; chosen: string; powers: string[] }[]
    rightNow: string
    source: { label: string; url: string }
  }
  approval: { source: { label: string; url: string }; series: { label: string; points: ApprovalPoint[] }[] }
  election: {
    title: string
    firstRound: string
    secondRound?: string
    note: string
    candidates: Candidate[]
    polls: PollData
    pollSource: { label: string; url: string }
  }
  parliament: { name: string; total: number; majority: number; asOf: string; groups: SeatGroup[]; note: string }
  parties: Party[]
  spectrumSource: string
  timeline: TimelineEvent[]
  sources: { label: string; url: string }[]
}
