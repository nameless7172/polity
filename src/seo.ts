import type { Country } from './data/types'
import { daysBetween, pct, todayIso } from './format'

export const SITE_NAME = 'Polity'
export const SITE_TAGLINE = 'Politics at a glance, country by country'

export const countryPath = (country: Country) => `/${country.name.toLowerCase().replace(/\s+/g, '-')}/`

export function standfirstText(country: Country) {
  const { headOfGovernment, parliament, election } = country
  const govSeats = parliament.groups.filter((g) => g.bloc === 'government').reduce((s, g) => s + g.seats, 0)
  const majority = govSeats >= parliament.majority
  const [[leader, leaderPct], [runnerUp, runnerUpPct]] = Object.entries(election.polls.firstRound.average)
  const days = daysBetween(todayIso(), election.firstRound)
  return (
    `${majority ? 'The government' : 'A minority government'} led by ${headOfGovernment.name} holds ${govSeats} of ` +
    `${parliament.total} seats in the National Assembly. The presidential election is ${days} days away: ` +
    `${leader} leads the first-round polls with ${pct(leaderPct)}, ahead of ${runnerUp} (${pct(runnerUpPct)}).`
  )
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Tags for <head>, rendered into the static HTML at build time. */
export function headTags(country: Country, siteUrl: string) {
  const year = country.election.firstRound.slice(0, 4)
  const title = `${country.name} politics today: government, polls and the ${year} election | ${SITE_NAME}`
  const description = standfirstText(country)
  const url = `${siteUrl}${countryPath(country)}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    dateModified: country.updated,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${siteUrl}/` },
    about: [
      { '@type': 'Country', name: country.name },
      { '@type': 'Event', name: `${year} ${country.name} ${country.election.title.toLowerCase()}`, startDate: country.election.firstRound },
    ],
  }
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}
