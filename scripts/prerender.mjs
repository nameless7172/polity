// Runs after `vite build`: renders every country page to static HTML so search engines see the
// full content, and writes sitemap.xml and robots.txt for the deployed URL.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const ssr = new URL('../dist-ssr/entry-server.js', import.meta.url)
const siteUrl = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4173').replace(/\/$/, '')

const { render, COUNTRIES, DEFAULT_COUNTRY, countryPath } = await import(ssr.href)
const template = readFileSync(new URL('index.html', dist), 'utf8')
const page = (countryId) => {
  const { html, head } = render(countryId, siteUrl)
  return template.replace('<!--head-->', head).replace('<!--app-->', html)
}

for (const country of COUNTRIES) {
  const dir = new URL(`.${countryPath(country)}`, dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('index.html', dir), page(country.id))
}
// The home page shows the default country; its canonical tag points at the country URL.
writeFileSync(new URL('index.html', dist), page(DEFAULT_COUNTRY.id))

const urls = COUNTRIES.map(
  (c) => `  <url><loc>${siteUrl}${countryPath(c)}</loc><lastmod>${c.updated}</lastmod><changefreq>daily</changefreq></url>`,
)
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)

rmSync(new URL('../dist-ssr/', import.meta.url), { recursive: true, force: true })
console.log(`Pre-rendered ${COUNTRIES.length} country page(s) for ${siteUrl}`)
