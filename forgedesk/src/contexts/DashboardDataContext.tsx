import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getProjecten, getOffertes, getFacturen, getTaken, getMontageAfspraken, getKlanten, getMedewerkers, getEvents } from '@/services/supabaseService'
import { getCached, fetchQuery } from '@/lib/queryCache'
import type { Project, Offerte, Factuur, Taak, MontageAfspraak, Klant, Medewerker, CalendarEvent } from '@/types'

const VERS_MS = 60_000
const POLL_MS = 300_000

interface DashboardData {
  projecten: Project[]
  offertes: Offerte[]
  facturen: Factuur[]
  taken: Taak[]
  montages: MontageAfspraak[]
  klanten: Klant[]
  medewerkers: Medewerker[]
  events: CalendarEvent[]
  isLoading: boolean
  refresh: () => void
}

const DashboardDataContext = createContext<DashboardData | null>(null)

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>(() => getCached<Project[]>('projecten') ?? [])
  const [offertes, setOffertes] = useState<Offerte[]>(() => getCached<Offerte[]>('offertes') ?? [])
  const [facturen, setFacturen] = useState<Factuur[]>(() => getCached<Factuur[]>('facturen') ?? [])
  const [taken, setTaken] = useState<Taak[]>(() => getCached<Taak[]>('taken') ?? [])
  const [montages, setMontages] = useState<MontageAfspraak[]>(() => getCached<MontageAfspraak[]>('montageAfspraken') ?? [])
  const [klanten, setKlanten] = useState<Klant[]>(() => getCached<Klant[]>('klanten') ?? [])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>(() => getCached<Medewerker[]>('medewerkers') ?? [])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(() => getCached('klanten') === undefined)

  const laatsteFetchRef = useRef(0)

  // Een expliciete refresh() (na een mutatie) haalt altijd vers; de mount,
  // de timer en de focus-listener nemen genoegen met data jonger dan VERS_MS.
  const fetchAll = useCallback(async (geforceerd = false) => {
    if (!user?.id) return
    laatsteFetchRef.current = Date.now()
    const opties = geforceerd ? undefined : { maxAgeMs: VERS_MS }
    try {
      const [p, o, f, t, m, k, md, e] = await Promise.all([
        fetchQuery('projecten', getProjecten, opties),
        fetchQuery('offertes', getOffertes, opties),
        fetchQuery('facturen', getFacturen, opties),
        fetchQuery('taken', getTaken, opties),
        fetchQuery('montageAfspraken', getMontageAfspraken, opties),
        fetchQuery('klanten', getKlanten, opties),
        fetchQuery('medewerkers', getMedewerkers, opties),
        getEvents(),
      ])
      setProjecten(p)
      setOffertes(o)
      setFacturen(f)
      setTaken(t)
      setMontages(m)
      setKlanten(k)
      setMedewerkers(md)
      setEvents(e)
    } catch (err) {
      console.error('[DashboardData] fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Houd de dashboard-data fris zonder volledige page-refresh:
  //  - bij tab-/window-focus (gebruiker komt terug uit een andere tab),
  //    maar alleen als de laatste fetch ouder is dan VERS_MS
  //  - en als de tab > 5 min open blijft (achtergrond-polling)
  // Polling pauzeert wanneer de tab niet zichtbaar is, om onnodig
  // verkeer te voorkomen.
  useEffect(() => {
    if (!user?.id) return

    const bijTerugkeer = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - laatsteFetchRef.current < VERS_MS) return
      fetchAll()
    }
    document.addEventListener('visibilitychange', bijTerugkeer)
    window.addEventListener('focus', bijTerugkeer)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchAll()
    }, POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', bijTerugkeer)
      window.removeEventListener('focus', bijTerugkeer)
      window.clearInterval(interval)
    }
  }, [fetchAll, user?.id])

  const refresh = useCallback(() => { void fetchAll(true) }, [fetchAll])

  return (
    <DashboardDataContext.Provider value={{ projecten, offertes, facturen, taken, montages, klanten, medewerkers, events, isLoading, refresh }}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider')
  return ctx
}
