import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { SalesPulseWidget } from './SalesPulseWidget'
import { TodayPlanningWidget } from './TodayPlanningWidget'
import { WeatherWidget } from './WeatherWidget'
import { QuickActions } from './QuickActions'
import { AIInsightWidget } from './AIInsightWidget'
import { PriorityTasks } from './PriorityTasks'
import { CalendarMiniWidget } from './CalendarMiniWidget'
import { SalesFollowUpWidget } from './SalesFollowUpWidget'
import { WorkflowWidget } from './WorkflowWidget'
import { SalesForecastWidget } from './SalesForecastWidget'
import { Wrench, FileText, FolderKanban, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMontageAfspraken, getOffertes, getProjecten } from '@/services/supabaseService'
import type { MontageAfspraak, Offerte, Project } from '@/types'
import { isToday } from 'date-fns'

export function WorkmateDashboard() {
  const { user } = useAuth()
  const { profile, toonFollowUpIndicatoren } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  const [heroCounts, setHeroCounts] = React.useState({ montagesVandaag: 0, openOffertes: 0, actieveProjecten: 0, verlopenDezeWeek: 0, verlopenTotaal: 0 })

  React.useEffect(() => {
    let cancelled = false
    Promise.all([getMontageAfspraken(), getOffertes(), getProjecten()])
      .then(([montages, offertes, projecten]: [MontageAfspraak[], Offerte[], Project[]]) => {
        if (cancelled) return
        const montagesVandaag = montages.filter(
          (m) => m.status !== 'afgerond' && isToday(new Date(m.datum))
        ).length
        const openOffertes = offertes.filter((o) =>
          ['verzonden', 'bekeken'].includes(o.status)
        ).length
        const actieveProjecten = projecten.filter((p) => p.status === 'actief').length

        // Vervaldatum analyse
        const now = new Date()
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()))
        const activeOffertes = offertes.filter((o) => ['concept', 'verzonden', 'bekeken'].includes(o.status))
        const verlopenTotaal = activeOffertes.filter((o) => new Date(o.geldig_tot) < now).length
        const verlopenDezeWeek = activeOffertes.filter((o) => {
          const expiry = new Date(o.geldig_tot)
          return expiry >= now && expiry <= endOfWeek
        }).length

        setHeroCounts({ montagesVandaag, openOffertes, actieveProjecten, verlopenDezeWeek, verlopenTotaal })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Goedemorgen'
    if (hour < 18) return 'Goedemiddag'
    return 'Goedenavond'
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="space-y-5">
      {/* Welcome + Weather banner */}
      <div className="wm-welcome-banner rounded-2xl p-5 md:p-6">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">{formattedDate}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">
                {getGreeting()}{userName ? ', ' : ''}
                {userName && (
                  <span className="wm-gradient-text">{userName}</span>
                )}
              </h1>
            </div>
            {/* Sign-industry status pills */}
            <div className="hidden md:flex items-center gap-2">
              {heroCounts.montagesVandaag > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 px-2.5 py-1.5 rounded-full">
                  <Wrench className="w-3 h-3" />
                  {heroCounts.montagesVandaag} montage{heroCounts.montagesVandaag !== 1 ? 's' : ''} vandaag
                </div>
              )}
              {heroCounts.openOffertes > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 px-2.5 py-1.5 rounded-full">
                  <FileText className="w-3 h-3" />
                  {heroCounts.openOffertes} open offerte{heroCounts.openOffertes !== 1 ? 's' : ''}
                </div>
              )}
              {heroCounts.actieveProjecten > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 px-2.5 py-1.5 rounded-full">
                  <FolderKanban className="w-3 h-3" />
                  {heroCounts.actieveProjecten} actie{heroCounts.actieveProjecten !== 1 ? 've' : 'f'} project{heroCounts.actieveProjecten !== 1 ? 'en' : ''}
                </div>
              )}
            </div>
          </div>
          <WeatherWidget />
        </div>
      </div>

      {/* Sales pulse — actionable metrics */}
      <SalesPulseWidget />

      {/* Verlopen offertes waarschuwing */}
      {(heroCounts.verlopenTotaal > 0 || heroCounts.verlopenDezeWeek > 0) && (
        <Link to="/offertes" className="block">
          <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/20 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                {heroCounts.verlopenTotaal > 0 && (
                  <span>{heroCounts.verlopenTotaal} offerte{heroCounts.verlopenTotaal !== 1 ? 's' : ''} verlopen</span>
                )}
                {heroCounts.verlopenTotaal > 0 && heroCounts.verlopenDezeWeek > 0 && ' · '}
                {heroCounts.verlopenDezeWeek > 0 && (
                  <span>{heroCounts.verlopenDezeWeek} verlo{heroCounts.verlopenDezeWeek !== 1 ? 'pen' : 'opt'} deze week</span>
                )}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                Klik om naar het offerte overzicht te gaan
              </p>
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 flex-shrink-0">Bekijk →</span>
          </div>
        </Link>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — planning & tasks */}
        <div className="lg:col-span-2 space-y-5">
          <TodayPlanningWidget />
          <PriorityTasks />
          <QuickActions />
        </div>

        {/* Right column — sales & actions */}
        <div className="space-y-5">
          <WorkflowWidget />
          {toonFollowUpIndicatoren && <SalesFollowUpWidget />}
          <SalesForecastWidget />
          <AIInsightWidget />
          <CalendarMiniWidget />
        </div>
      </div>
    </div>
  )
}
