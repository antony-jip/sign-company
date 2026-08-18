// Kern-datasets die de meest-bezochte modules delen. Eén keer vooraf
// laden (na login) → daarna leest elke module uit de in-memory cache en
// voelt navigatie instant. Background-revalidatie houdt het vers.
//
// De keys hier MOETEN matchen met wat de modules in getCached()/fetchQuery()
// gebruiken, anders warmt de prefetch de verkeerde la.

import {
  getKlanten,
  getProjecten,
  getProjectCountsByKlant,
  getOffertes,
  getFacturen,
  getTaken,
  getMontageAfspraken,
} from '@/services/supabaseService'
import { prefetchQuery } from './queryCache'

type CoreQuery = { key: string; fetcher: () => Promise<unknown> }

export const CORE_QUERIES: CoreQuery[] = [
  { key: 'klanten', fetcher: getKlanten },
  { key: 'projectCounts', fetcher: getProjectCountsByKlant },
  { key: 'projecten', fetcher: getProjecten },
  { key: 'offertes', fetcher: getOffertes },
  { key: 'facturen', fetcher: getFacturen },
  { key: 'taken', fetcher: getTaken },
  { key: 'montageAfspraken', fetcher: getMontageAfspraken },
]

// Warmt alle kern-lijsten op de achtergrond. Fire-and-forget; prefetchQuery
// slaat keys over die al gecachet zijn of al onderweg.
export function prefetchCore(): void {
  for (const q of CORE_QUERIES) prefetchQuery(q.key, q.fetcher)
}
