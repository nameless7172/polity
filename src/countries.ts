import { france } from './data/france'
import type { Country } from './data/types'
import { countryPath } from './seo'

export const COUNTRIES: Country[] = [france]
export const DEFAULT_COUNTRY = france

export const countryForPath = (pathname: string) =>
  COUNTRIES.find((c) => pathname.startsWith(countryPath(c))) ?? DEFAULT_COUNTRY
