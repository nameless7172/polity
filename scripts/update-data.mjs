// Fetches fresh data for France and writes src/data/france-live.json. No AI, no manual input:
// every value comes from Wikipedia, Wikidata or the Ipsos barometer page.
// Each section is validated on its own; a failing section keeps its last good value and is
// marked stale, so a changed source degrades to slightly old data instead of a broken site.
// Pass --strict to exit non-zero when any section fails.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const OUT = new URL('../src/data/france-live.json', import.meta.url)
const REF = JSON.parse(readFileSync(new URL('../src/data/france-reference.json', import.meta.url), 'utf8'))
const UA = 'polity/0.1 (static site data refresh)'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const TODAY = new Date().toISOString().slice(0, 10)

// ---------- helpers ----------

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${res.status} for ${url}`)
  return res.text()
}

async function wikiRaw(title, depth = 0) {
  const text = await fetchText(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`)
  const redirect = text.match(/^#REDIRECT\s*\[\[([^\]#|]+)/i)
  if (redirect && depth < 3) return wikiRaw(redirect[1].trim().replace(/ /g, '_'), depth + 1)
  return text
}

async function sparql(query) {
  const json = JSON.parse(
    await fetchText(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
      Accept: 'application/sparql-results+json',
    }),
  )
  return json.results.bindings
}

const addDays = (isoDate, n) => new Date(Date.parse(isoDate) + n * 86_400_000).toISOString().slice(0, 10)
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const round1 = (n) => Math.round(n * 10) / 10
const pad = (n) => String(n).padStart(2, '0')

function englishDate(text) {
  const m = text.match(/(\d{1,2}) ([A-Z][a-z]+) (\d{4})/)
  if (!m || !MONTHS.includes(m[2].slice(0, 3))) return null
  return `${m[3]}-${pad(MONTHS.indexOf(m[2].slice(0, 3)) + 1)}-${pad(m[1])}`
}

const partyByWiki = new Map(REF.parties.flatMap((p) => p.wiki.map((w) => [w.toLowerCase(), p.id])))
const unknownParties = new Set()
function partyIdFor(article) {
  const key = article.replace(/_/g, ' ').trim()
  const id = partyByWiki.get(key.toLowerCase())
  if (id) return id
  unknownParties.add(key)
  return `unknown:${key}`
}

function parseOpdrts(text) {
  const m = text.match(/\{\{Opdrts\|([^}]*)\}\}/)
  if (!m) return null
  const parts = m[1].split('|').filter((p) => p && p !== 'year')
  const nums = parts.filter((p) => /^\d+$/.test(p))
  const mon = parts.find((p) => MONTHS.includes(p.slice(0, 3)))
  if (!mon || !nums.length) return null
  const day = nums.length >= 2 ? nums[nums.length - 2] : '15'
  return `${nums[nums.length - 1]}-${pad(MONTHS.indexOf(mon.slice(0, 3)) + 1)}-${pad(day)}`
}

function pct(v) {
  const s = v.replace('%', '').trim()
  if (s.startsWith('<')) return 0.25
  const n = Number(s)
  return s !== '' && Number.isFinite(n) ? n : null
}

// ---------- polls ----------

function parseFirstRound(src) {
  const firstRound = src.split('== Second round ==')[0]
  const sections = firstRound.split(/^=== (.+?) ===\s*$/m)
  const rows = []
  const candidateParty = {}
  for (let i = 1; i < sections.length; i += 2) {
    for (const [, table] of sections[i + 1].matchAll(/\{\|([\s\S]*?)\n\|\}/g)) {
      const names = [...table.matchAll(/vert header\|[^[]*\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g)].map((m) => m[1])
      if (!names.length) continue
      // The row under the names gives each column's party: {{party color|National Rally (France)}}
      const colors = [...table.matchAll(/^!\s*style="background:\{\{party colou?r\|([^}|]+)/gm)].map((m) => m[1])
      if (colors.length === names.length) {
        names.forEach((n, j) => (candidateParty[n] ??= partyIdFor(colors[j])))
      }
      let pollster = null
      let date = null
      let cells = []
      const flush = () => {
        if (pollster && date && cells.length === names.length) {
          const values = {}
          names.forEach((n, j) => {
            const v = pct(cells[j])
            if (v !== null) values[n] = v
          })
          rows.push({ pollster, date, values })
        }
      }
      for (const line of table.split('\n')) {
        if (line.startsWith('|-')) {
          flush()
          cells = []
          continue
        }
        if (!line.startsWith('|') || line.startsWith('|+')) continue
        const cell = line.slice(1)
        const link = cell.match(/\[https?:\/\/\S+ ([^\]]+)\]/)
        if (link) {
          pollster = link[1].trim()
          continue
        }
        if (cell.includes('Opdrts')) {
          date = parseOpdrts(cell)
          continue
        }
        if (!cells.length && !cell.includes('%') && /^\s*(rowspan="\d+"\s*)?\|?\s*[\d,]+\s*$/.test(cell)) continue
        const raw = /^\s*(rowspan|style|colspan)/.test(cell) ? cell.split('|').pop() : cell
        cells.push(raw.replace(/'''|\[\[|\]\]/g, '').trim())
      }
      flush()
    }
  }
  return { rows, candidateParty }
}

function aggregate(rows) {
  const pollKey = (r) => `${r.pollster}|${r.date}`
  const latestDate = rows.map((r) => r.date).sort().pop()
  // "Core" candidates: those tested in most recent polls. Each poll contributes the scenario
  // that includes the most core candidates (first listed wins ties).
  const recent = rows.filter((r) => r.date > addDays(latestDate, -30))
  const recentPolls = new Set(recent.map(pollKey))
  const testedIn = {}
  for (const r of recent) for (const n of Object.keys(r.values)) (testedIn[n] ??= new Set()).add(pollKey(r))
  const core = Object.keys(testedIn).filter((n) => testedIn[n].size >= 0.6 * recentPolls.size)

  const byPoll = new Map()
  for (const r of rows) {
    const score = core.filter((c) => c in r.values).length
    if (!byPoll.has(pollKey(r)) || score > byPoll.get(pollKey(r)).score) byPoll.set(pollKey(r), { score, r })
  }
  const polls = [...byPoll.values()].map((x) => x.r).sort((a, b) => a.date.localeCompare(b.date))

  const average = (end, days) => {
    const start = addDays(end, -days)
    const sample = polls.filter((p) => p.date > start && p.date <= end)
    const names = new Set(sample.flatMap((p) => Object.keys(p.values)))
    const avg = {}
    for (const n of names) {
      const vals = sample.filter((p) => n in p.values).map((p) => p.values[n])
      if (vals.length >= Math.max(2, Math.floor(sample.length / 2))) avg[n] = round1(mean(vals))
    }
    return { avg, sample }
  }

  const latest = average(latestDate, 14)
  const previous = average(addDays(latestDate, -28), 14)
  const trend = []
  for (let week = addDays(latestDate, -7 * 15); week < latestDate; week = addDays(week, 7)) {
    const { avg, sample } = average(week, 14)
    if (sample.length >= 3 && Object.keys(avg).length) trend.push({ date: week, values: avg })
  }
  trend.push({ date: latestDate, values: latest.avg })

  return {
    asOf: latestDate,
    firstRound: {
      windowStart: latest.sample[0].date,
      windowEnd: latestDate,
      pollCount: latest.sample.length,
      pollsters: [...new Set(latest.sample.map((p) => p.pollster))].sort(),
      average: Object.fromEntries(Object.entries(latest.avg).sort((a, b) => b[1] - a[1])),
      fourWeeksAgo: previous.avg,
    },
    trend,
  }
}

function parseRunoffs(src) {
  const second = src.split('== Second round ==')[1]?.split('=== Declined to be candidates ===')[0] ?? ''
  const parts = second.split(/^===\s*(.+?)\s*===\s*$/m)
  const matchups = []
  for (let i = 1; i < parts.length; i += 2) {
    if (!parts[i].includes('vs.')) continue
    const [a, b] = parts[i].split('vs.').map((s) => s.trim())
    const results = []
    for (const block of parts[i + 1].split('\n|-').slice(1)) {
      const date = parseOpdrts(block)
      const pcts = [...block.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]))
      if (date && pcts.length >= 2) results.push({ date, a: pcts[pcts.length - 2], b: pcts[pcts.length - 1] })
    }
    matchups.push({ a, b, results })
  }
  const latest = matchups.flatMap((m) => m.results.map((r) => r.date)).sort().pop()
  const cutoff = addDays(latest, -30)
  return matchups
    .map(({ a, b, results }) => {
      const recent = results.filter((r) => r.date > cutoff)
      return recent.length >= 2
        ? { a, b, polls: recent.length, aPct: round1(mean(recent.map((r) => r.a))), bPct: round1(mean(recent.map((r) => r.b))) }
        : null
    })
    .filter(Boolean)
    .sort((x, y) => (y.aPct - y.bPct) - (x.aPct - x.bPct))
}

async function updatePolls() {
  const src = await wikiRaw(REF.sources.polls)
  const { rows, candidateParty } = parseFirstRound(src)
  const polls = { ...aggregate(rows), runoffs: parseRunoffs(src) }
  polls.candidates = Object.fromEntries(Object.keys(polls.firstRound.average).map((n) => [n, candidateParty[n] ?? 'ind']))

  const sum = Object.values(polls.firstRound.average).reduce((a, b) => a + b, 0)
  if (sum < 90 || sum > 105) throw new Error(`first-round average sums to ${sum.toFixed(1)}%`)
  if (polls.firstRound.pollCount < 3) throw new Error(`only ${polls.firstRound.pollCount} polls in window`)
  if (polls.trend.length < 4) throw new Error(`only ${polls.trend.length} trend points`)
  if (!polls.runoffs.length) throw new Error('no runoff matchups parsed')
  for (const r of polls.runoffs) {
    if (Math.abs(r.aPct + r.bPct - 100) > 1.5) throw new Error(`runoff ${r.a}–${r.b} sums to ${r.aPct + r.bPct}`)
  }
  return polls
}

// ---------- parliament ----------

async function updateParliament() {
  const src = await wikiRaw(REF.sources.assembly)
  const section = src.split('=== Parliamentary groups ===')[1]
  if (!section) throw new Error('parliamentary groups section not found')
  const caption = section.match(/as of (\d{1,2} [A-Z][a-z]+ \d{4})/)
  const asOf = caption && englishDate(caption[1])
  const table = section.split('Parliamentary group')[1].split('\n|}')[0]
  const alias = new Map(REF.groups.flatMap((g) => [[g.id, g.id], ...(g.aliases ?? []).map((a) => [a, g.id])]))
  const seats = {}
  for (const row of table.split('\n|-').slice(1)) {
    const cells = row.split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1).trim())
    const abbr = cells.find((c) => /^[A-Za-z][A-Za-z-]{1,9}$/.test(c))
    const numbers = cells.filter((c) => /^\d+$/.test(c)).map(Number)
    if (!abbr || !numbers.length) continue
    if (!alias.has(abbr)) throw new Error(`unknown parliamentary group "${abbr}"`)
    seats[alias.get(abbr)] = numbers.length >= 3 ? numbers[2] : numbers[numbers.length - 1]
  }
  const lastElectionLine = src.match(/^\|\s*last_election1\s*=\s*(.+)$/m)?.[1] ?? ''
  const lastElection = englishDate(lastElectionLine.replace(/\[\[[^|\]]*\|/g, ''))

  const total = Object.values(seats).reduce((a, b) => a + b, 0)
  const missing = REF.groups.map((g) => g.id).filter((id) => !(id in seats))
  if (missing.length) throw new Error(`groups missing: ${missing}`)
  if (total < 560 || total > 577) throw new Error(`seats sum to ${total}`)
  if (!asOf) throw new Error('no "as of" date in caption')
  return { asOf, seats, lastElection }
}

// ---------- leaders & government ----------

async function infoboxParty(personName) {
  const src = await wikiRaw(personName.replace(/ /g, '_'))
  const line = src.match(/^\|\s*party\s*=\s*(.+)$/m)?.[1]
  const article = line?.match(/\[\[([^\]|]+)/)?.[1]
  return article ? partyIdFor(article) : 'ind'
}

async function updateLeaders() {
  const rows = await sparql(`SELECT ?prop ?personLabel ?start WHERE {
    VALUES ?prop { p:P35 p:P6 }
    wd:Q142 ?prop ?st . ?st wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
    { ?st ps:P35 ?person } UNION { ?st ps:P6 ?person }
    OPTIONAL { ?st pq:P580 ?start }
    FILTER NOT EXISTS { ?st pq:P582 ?end }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`)
  const pick = async (p) => {
    const found = rows.filter((b) => b.prop.value.endsWith(p))
    if (found.length !== 1) throw new Error(`expected one holder for ${p}, got ${found.length}`)
    const name = found[0].personLabel.value
    return { name, since: found[0].start?.value.slice(0, 10) ?? null, partyId: await infoboxParty(name) }
  }
  return { headOfState: await pick('P35'), headOfGovernment: await pick('P6') }
}

async function updateGovernment() {
  // The current government is the most recently formed "Government of the French Republic".
  const [gov] = await sparql(`SELECT ?govLabel ?inception ?article WHERE {
    ?gov wdt:P31 ?class ; wdt:P17 wd:Q142 ; wdt:P571 ?inception .
    ?class rdfs:label "Government of the French Republic"@en .
    FILTER NOT EXISTS { ?gov wdt:P576 ?dissolved }
    ?article schema:about ?gov ; schema:isPartOf <https://en.wikipedia.org/> .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } ORDER BY DESC(?inception) LIMIT 1`)
  if (!gov) throw new Error('no current government found on Wikidata')
  const name = gov.govLabel.value
  const formed = gov.inception.value.slice(0, 10)
  const article = decodeURIComponent(gov.article.value.split('/wiki/')[1])
  let src = await wikiRaw(article)

  // Articles covering several governments have one "====<name>====" subsection each.
  const ministersSection = src.split(/^===\s*Ministers\s*===\s*$/m)[1] ?? src
  const sub = ministersSection.split(new RegExp(`^====\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*====\\s*$`, 'mi'))
  src = (sub.length > 1 ? sub[1] : ministersSection).split(/^===?[^=]/m)[0]
  const table = src.match(/\{\|([\s\S]*?)\n\|\}/)?.[1]
  if (!table) throw new Error(`no ministers table in ${article}`)

  const ministers = []
  let role = null
  for (const row of table.split('\n|-').slice(1)) {
    const cells = row.split('\n').filter((l) => l.startsWith('|')).map((l) => l.slice(1).trim())
    if (cells.length < 2) continue
    const links = (c) => [...c.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map((m) => (m[2] ?? m[1]).trim())
    const partyCell = cells[cells.length - 1]
    const party = partyCell.match(/\{\{abbrev party name with colou?r\|([^}|]+)/)?.[1]
    const person = links(cells[cells.length - 2])[0]
    if (cells.length >= 3) role = links(cells[0])[0] ?? cells[0].replace(/^.*\|/, '')
    if (!person || !role) continue
    // A portfolio with several rows lists successive holders; the last one is current.
    const existing = ministers.findIndex((m) => m.role === role)
    const entry = { role, name: person, partyId: party ? partyIdFor(party) : 'ind' }
    if (existing >= 0) ministers[existing] = entry
    else ministers.push(entry)
  }
  if (ministers.length < 8) throw new Error(`only ${ministers.length} ministers parsed`)
  const required = [/interior/i, /foreign/i, /justice/i, /armed forces|defen/i, /econom|financ/i]
  const missing = required.filter((re) => !ministers.some((m) => re.test(m.role)))
  if (missing.length) throw new Error(`key portfolios missing: ${missing.map(String)}`)
  return { name, formed, article, ministers }
}

// ---------- election ----------

async function updateElection() {
  const src = await wikiRaw(REF.sources.election)
  const firstRound = englishDate(src.match(/^\|\s*election_date\s*=\s*(.+)$/m)?.[1] ?? '')
  if (!firstRound) throw new Error('no election_date in infobox')
  const second = src.match(/second round on (\d{1,2} [A-Z][a-z]+)(?: (\d{4}))?/)
  const secondRound = second ? englishDate(`${second[1]} ${second[2] ?? firstRound.slice(0, 4)}`) : null
  return { firstRound, secondRound }
}

// ---------- approval ----------

function decodeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|\u00a0|\u202f/g, ' ')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

async function updateApproval(leaders, previousApproval) {
  const text = decodeHtml(await fetchText(REF.sources.approval))
  const wave = text.match(/Tribune Dimanche\s*[-–]\s*([A-Za-zéû]+)\s+(\d{4})/i)
  if (!wave) throw new Error('wave month not found')
  const month = MOIS.indexOf(wave[1].toLowerCase()) + 1
  if (month < 1) throw new Error(`unknown month "${wave[1]}"`)
  const date = `${wave[2]}-${pad(month)}-01`

  const series = { ...(previousApproval?.series ?? {}) }
  for (const person of [leaders.headOfState.name, leaders.headOfGovernment.name]) {
    const start = text.search(new RegExp(`Cote de popularité d[e’'] ?${person}`, 'i'))
    if (start < 0) throw new Error(`no section for ${person}`)
    const section = text.slice(start, start + 900)
    const percents = [...section.matchAll(/(\d{1,2})\s?%/g)]
    if (!percents.length) throw new Error(`no figures for ${person}`)
    const approve = Number(percents[0][1])
    const dis = percents.find((m) => /d[ée]favorable/i.test(section.slice(m.index, m.index + 60)))
    const disapprove = dis ? Number(dis[1]) : undefined
    if (approve < 1 || approve > 90 || (disapprove && approve + disapprove > 100)) {
      throw new Error(`implausible figures for ${person}: ${approve}/${disapprove}`)
    }
    const points = (series[person] ?? []).filter((p) => p.date.slice(0, 7) !== date.slice(0, 7))
    points.push(disapprove === undefined ? { date, approve } : { date, approve, disapprove })
    series[person] = points.sort((a, b) => a.date.localeCompare(b.date))
  }
  return { latestWave: date, series }
}

// ---------- events ----------

function detectEvents(prev, next) {
  const events = []
  const add = (label) => events.push({ date: TODAY, label })
  for (const [key, label] of [['headOfState', 'President'], ['headOfGovernment', 'Prime Minister']]) {
    const a = prev.leaders?.[key]?.name
    const b = next.leaders?.[key]?.name
    if (a && b && a !== b) add(`${b} becomes ${label}, succeeding ${a}`)
  }
  if (prev.government?.name && next.government?.name && prev.government.name !== next.government.name) {
    add(`${next.government.name} takes office`)
  }
  const before = prev.polls?.firstRound?.average
  const after = next.polls?.firstRound?.average
  if (before && after) {
    const leaderBefore = Object.keys(before)[0]
    const leaderAfter = Object.keys(after)[0]
    if (leaderBefore !== leaderAfter) add(`${leaderAfter} overtakes ${leaderBefore} in the first-round polling average`)
    for (const n of Object.keys(after)) {
      if (!(n in before) && after[n] >= 3) add(`${n} enters the polls at ${after[n]}%`)
    }
    for (const n of Object.keys(before)) {
      if (!(n in after) && before[n] >= 3) add(`${n} is no longer included in polls`)
    }
  }
  return events
}

// ---------- main ----------

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const out = { ...previous, generatedAt: new Date().toISOString(), status: {} }
const failures = []

async function section(name, fn) {
  try {
    out[name] = await fn()
    out.status[name] = { ok: true, updatedAt: out.generatedAt }
    console.log(`✓ ${name}`)
  } catch (err) {
    failures.push(name)
    const prev = previous.status?.[name]
    out.status[name] = { ok: false, error: String(err.message ?? err), lastGood: prev?.updatedAt ?? prev?.lastGood ?? null }
    console.warn(`✗ ${name}: ${err.message ?? err} (keeping last good data)`)
  }
}

await section('polls', updatePolls)
await section('parliament', updateParliament)
await section('leaders', updateLeaders)
await section('government', updateGovernment)
await section('election', updateElection)
if (out.leaders) await section('approval', () => updateApproval(out.leaders, previous.approval))

out.unknownParties = [...unknownParties]
if (unknownParties.size) console.warn(`! Unmapped parties (add to france-reference.json): ${[...unknownParties].join(', ')}`)
out.events = [...(previous.events ?? []), ...detectEvents(previous, out)]

// Timestamps alone don't count as a change, so scheduled runs don't commit and redeploy for nothing.
const withoutTimestamps = ({ generatedAt, status = {}, ...rest }) =>
  JSON.stringify({ ...rest, status: Object.fromEntries(Object.entries(status).map(([k, { updatedAt, ...s }]) => [k, s])) })

if (withoutTimestamps(out) === withoutTimestamps(previous)) {
  console.log('No data changes; file left untouched.')
} else {
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
  console.log(`Wrote ${OUT.pathname}${failures.length ? ` with ${failures.length} stale section(s): ${failures}` : ''}`)
}
if ((failures.length || unknownParties.size) && process.argv.includes('--strict')) process.exit(1)
