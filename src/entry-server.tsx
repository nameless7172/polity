import { renderToString } from 'react-dom/server'
import { App } from './App'
import { COUNTRIES, DEFAULT_COUNTRY } from './countries'
import { countryPath, headTags } from './seo'

export { COUNTRIES, DEFAULT_COUNTRY, countryPath }

export function render(countryId: string, siteUrl: string) {
  const country = COUNTRIES.find((c) => c.id === countryId)!
  return { html: renderToString(<App country={country} />), head: headTags(country, siteUrl) }
}
