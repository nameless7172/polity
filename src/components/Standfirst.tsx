import type { Country } from '../data/types'
import { standfirstText } from '../seo'

export function Standfirst({ country }: { country: Country }) {
  return <p className="standfirst">{standfirstText(country)}</p>
}
