import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { StatisticsCards } from './StatisticsCards'
import { PortaalAlerts } from './PortaalAlerts'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { RecenteActiviteitWidget } from './RecenteActiviteitWidget'
import { OpenstaandeOffertesWidget } from './OpenstaandeOffertesWidget'
import { TodayPlanningWidget } from './TodayPlanningWidget'
import { WeatherWidget } from './WeatherWidget'
import { PriorityTasks } from './PriorityTasks'
import { MontagePlanningWidget } from './MontagePlanningWidget'
import { VisualizerDashboardWidget } from './VisualizerDashboardWidget'
import { AlertTriangle } from 'lucide-react'
import { getFacturen, getOffertes } from '@/services/supabaseService'
import type { Factuur, Offerte } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'

// Playful greetings that rotate
const GREETINGS: { greeting: string; timeOfDay: 'morning' | 'afternoon' | 'evening' }[] = [
  { greeting: 'Goedemorgen', timeOfDay: 'morning' },
  { greeting: 'Bonjour', timeOfDay: 'morning' },
  { greeting: 'Buenos días', timeOfDay: 'morning' },
  { greeting: 'Buongiorno', timeOfDay: 'morning' },
  { greeting: 'Goedemiddag', timeOfDay: 'afternoon' },
  { greeting: 'Bon après-midi', timeOfDay: 'afternoon' },
  { greeting: 'Buenas tardes', timeOfDay: 'afternoon' },
  { greeting: 'Buon pomeriggio', timeOfDay: 'afternoon' },
  { greeting: 'Goedenavond', timeOfDay: 'evening' },
  { greeting: 'Bonsoir', timeOfDay: 'evening' },
  { greeting: 'Buenas noches', timeOfDay: 'evening' },
  { greeting: 'Buonasera', timeOfDay: 'evening' },
]

function getPlayfulGreeting(): string {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const options = GREETINGS.filter(g => g.timeOfDay === timeOfDay)
  // Use day of year as seed so it changes daily but stays consistent within the day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return options[dayOfYear % options.length].greeting
}

export function FORGEdeskDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  // Automatische herinnering check (eenmalig bij page load)
  usePortaalHerinnering()

  // Verlopen facturen for alert bar
  const [verlopenFacturen, setVerlopenFacturen] = useState<{ count: number; bedrag: number }>({ count: 0, bedrag: 0 })
  // Offertes wachtend op reactie
  const [wachtOpReactie, setWachtOpReactie] = useState<{ count: number; bedrag: number }>({ count: 0, bedrag: 0 })

  useEffect(() => {
    let cancelled = false
    getFacturen()
      .then((facturen: Factuur[]) => {
        if (cancelled) return
        const now = new Date()
        const verlopen = facturen.filter(
          f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now
        )
        setVerlopenFacturen({
          count: verlopen.length,
          bedrag: verlopen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0),
        })
      })
      .catch(logger.error)
    getOffertes()
      .then((offertes: Offerte[]) => {
        if (cancelled) return
        const wachtend = offertes.filter(
          o => o.status === 'verzonden' || o.status === 'bekeken'
        )
        setWachtOpReactie({
          count: wachtend.length,
          bedrag: wachtend.reduce((sum, o) => sum + (o.totaal_incl_btw || 0), 0),
        })
      })
      .catch(logger.error)
    return () => { cancelled = true }
  }, [])

  const greeting = useMemo(() => getPlayfulGreeting(), [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1.5">{formattedDate}</p>
          <h1 className="text-[32px] sm:text-[38px] font-extrabold tracking-[-0.04em] leading-[1.1] text-foreground">
            {greeting}{userName ? ', ' : ''}
            {userName && <span className="wm-gradient-text">{userName}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/offertes/nieuw')}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold px-5 py-2.5 rounded-[12px] bg-foreground text-background hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.96]"
          >
            + Nieuwe offerte
          </button>
        </div>
      </div>

      {/* Alert bar — verlopen facturen */}
      {verlopenFacturen.count > 0 && (
        <div
          onClick={() => navigate('/facturen')}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/8 dark:bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/12 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-[13.5px] font-medium">
            <strong>{verlopenFacturen.count} facturen verlopen</strong> — {formatCurrency(verlopenFacturen.bedrag)} openstaand
          </span>
          <span className="ml-auto text-[13px] font-bold whitespace-nowrap hover:translate-x-0.5 transition-transform">
            Bekijk →
          </span>
        </div>
      )}

      {/* Alert bar — offertes wachtend op reactie */}
      {wachtOpReactie.count > 0 && (
        <div
          onClick={() => navigate('/offertes')}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--color-cream-bg)] text-[var(--color-cream-fg)] cursor-pointer hover:bg-[var(--color-cream-border)]/30 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-[13.5px] font-medium">
            <strong>{wachtOpReactie.count} {wachtOpReactie.count === 1 ? 'offerte wacht' : 'offertes wachten'} op reactie</strong> — {formatCurrency(wachtOpReactie.bedrag)} totaal
          </span>
          <span className="ml-auto text-[13px] font-bold whitespace-nowrap hover:translate-x-0.5 transition-transform">
            Bekijk →
          </span>
        </div>
      )}

      {/* Portaal alerts */}
      <PortaalAlerts />

      {/* 4 stat cards */}
      <StatisticsCards />

      {/* Row 1: Recente activiteit | Vandaag planning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecenteActiviteitWidget />
        <TodayPlanningWidget />
      </div>

      {/* Row 2: Taken | Openstaande offertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriorityTasks />
        <OpenstaandeOffertesWidget />
      </div>

      {/* Visualizer stats */}
      <VisualizerDashboardWidget />

      {/* Weather */}
      <WeatherWidget />

      {/* Montage planning */}
      <MontagePlanningWidget />
    </div>
  )
}
