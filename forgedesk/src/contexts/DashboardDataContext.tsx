import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getProjecten, getOffertes, getFacturen, getTaken, getMontageAfspraken, getKlanten, getMedewerkers, getEvents } from '@/services/supabaseService'
import type { Project, Offerte, Factuur, Taak, MontageAfspraak, Klant, Medewerker, CalendarEvent } from '@/types'

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
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [montages, setMontages] = useState<MontageAfspraak[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user?.id) return
    try {
      const [p, o, f, t, m, k, md, e] = await Promise.all([
        getProjecten(),
        getOffertes(),
        getFacturen(),
        getTaken(),
        getMontageAfspraken(),
        getKlanten(),
        getMedewerkers(),
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
  //  - bij tab-/window-focus (gebruiker komt terug uit een andere tab)
  //  - en als de tab > 60s open blijft (achtergrond-polling)
  // Polling pauzeert wanneer de tab niet zichtbaar is, om onnodig
  // verkeer te voorkomen.
  useEffect(() => {
    if (!user?.id) return

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchAll()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', fetchAll)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchAll()
    }, 60_000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', fetchAll)
      window.clearInterval(interval)
    }
  }, [fetchAll, user?.id])

  return (
    <DashboardDataContext.Provider value={{ projecten, offertes, facturen, taken, montages, klanten, medewerkers, events, isLoading, refresh: fetchAll }}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider')
  return ctx
}
