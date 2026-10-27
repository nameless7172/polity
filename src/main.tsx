import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/source-serif-4/opsz.css'
import '@fontsource-variable/source-sans-3'
import { App } from './App'
import { countryForPath } from './countries'
import './styles.css'

// The HTML is pre-rendered at build time for search engines; the client render replaces it so
// date-based values (days to go, today's date) reflect the visitor's day, not the build day.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App country={countryForPath(window.location.pathname)} />
  </StrictMode>,
)
