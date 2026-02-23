import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { SalesPulseWidget } from './SalesPulseWidget'
import { ActionableItemsWidget } from './ActionableItemsWidget'
import { TodayPlanningWidget } from './TodayPlanningWidget'
import { WeatherWidget } from './WeatherWidget'
import { QuickActions } from './QuickActions'
import { AIInsightWidget } from './AIInsightWidget'
import { PriorityTasks } from './PriorityTasks'
import { CalendarMiniWidget } from './CalendarMiniWidget'
import { SalesFollowUpWidget } from './SalesFollowUpWidget'
import { WorkflowWidget } from './WorkflowWidget'
import { SalesForecastWidget } from './SalesForecastWidget'
import { Wrench, FileText, FolderKanban } from 'lucide-react'
import { getMontageAfspraken, getOffertes, getProjecten } from '@/services/supabaseService'
import type { MontageAfspraak, Offerte, Project } from '@/types'
import { isToday } from 'date-fns'

export function WorkmateDashboard() {
  const { user } = useAuth()
  const { profile, toonFollowUpIndicatoren } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  const [heroCounts, setHeroCounts] = React.useState({ montagesVandaag: 0, openOffertes: 0, actieveProjecten: 0 })

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
        setHeroCounts({ montagesVandaag, openOffertes, actieveProjecten })
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — planning & tasks */}
        <div className="lg:col-span-2 space-y-5">
          <ActionableItemsWidget />
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
