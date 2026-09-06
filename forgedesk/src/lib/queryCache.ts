// In-memory stale-while-revalidate cache voor lijst-queries, met
// in-flight dedup en prefetch.
//
// Bewust géén localStorage: data van organisatie A mag niet op schijf
// achterblijven. De cache leeft per tab/sessie en wordt gewist bij
// logout en bij org-wissel (zie AuthContext :: clearQueryCache()).
//
// Patroon in een module:
//   const [data, setData] = useState(() => getCached<T[]>(key) ?? [])
//   const [loading, setLoading] = useState(() => getCached(key) === undefined)
//   useEffect(() => { fetchQuery(key, fetcher).then(setData)... }, [])
//
// Prefetch (bv. op app-load of sidebar-hover):
//   prefetchQuery(key, fetcher)   // fire-and-forget, slaat over als al gecachet

const cache = new Map<string, unknown>()
const cachedAt = new Map<string, number>()
const inflight = new Map<string, Promise<unknown>>()

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value)
  cachedAt.set(key, Date.now())
}

export function clearQueryCache(): void {
  cache.clear()
  cachedAt.clear()
  inflight.clear()
}

// Dedup-bewuste fetch: bestaat er al een vlucht voor deze key, deel die;
// anders fetchen, cachen en de vlucht opruimen. Zonder maxAgeMs altijd vers
// (alleen gelijktijdige calls worden gedeeld) — geschikt voor revalidatie.
// Met maxAgeMs wordt een cache-waarde jonger dan die leeftijd teruggegeven
// zonder request.
export function fetchQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opties?: { maxAgeMs?: number },
): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const maxAgeMs = opties?.maxAgeMs
  if (maxAgeMs !== undefined && cache.has(key)) {
    const leeftijd = Date.now() - (cachedAt.get(key) ?? 0)
    if (leeftijd < maxAgeMs) return Promise.resolve(cache.get(key) as T)
  }
  const p = fetcher()
    .then((v) => { setCached(key, v); inflight.delete(key); return v })
    .catch((e) => { inflight.delete(key); throw e })
  inflight.set(key, p)
  return p
}

// Fire-and-forget: warm de cache vooruit. Slaat over als er al data of
// een lopende vlucht is. Fouten worden genegeerd (de echte load probeert
// het later opnieuw).
export function prefetchQuery<T>(key: string, fetcher: () => Promise<T>): void {
  if (cache.has(key) || inflight.has(key)) return
  void fetchQuery(key, fetcher).catch(() => {})
}
