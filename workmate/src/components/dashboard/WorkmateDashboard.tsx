import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { StatisticsCards } from './StatisticsCards'
import { QuickActions } from './QuickActions'
import { AIInsightWidget } from './AIInsightWidget'
import { PriorityTasks } from './PriorityTasks'
import { CalendarMiniWidget } from './CalendarMiniWidget'
import { EmailCommunicationHub } from './EmailCommunicationHub'
import { SalesFollowUpWidget } from './SalesFollowUpWidget'
import { Sparkles } from 'lucide-react'

export function WorkmateDashboard() {
  const { user } = useAuth()
  const { profile, toonFollowUpIndicatoren, toonConversieRate } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Goedemorgen'
    if (hour < 18) return 'Goedemiddag'
    return 'Goedenavond'
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {getGreeting()}{userName ? `, ${userName}` : ''}
            <Sparkles className="w-5 h-5 text-amber-400 animate-float" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Hier is je overzicht voor vandaag.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border/50 rounded-xl px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <StatisticsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
          <PriorityTasks />
        </div>
        <div className="space-y-6">
          {toonFollowUpIndicatoren && <SalesFollowUpWidget />}
          <AIInsightWidget />
          <CalendarMiniWidget />
          <EmailCommunicationHub />
        </div>
      </div>
    </div>
  )
}
