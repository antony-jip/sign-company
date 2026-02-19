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
import { WorkflowWidget } from './WorkflowWidget'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'

export function WorkmateDashboard() {
  const { user } = useAuth()
  const { profile, toonFollowUpIndicatoren } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

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
  // Capitalize first letter
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="wm-welcome-banner rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">{formattedDate}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}{userName ? ', ' : ''}
              {userName && (
                <span className="wm-gradient-text">{userName}</span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
              Hier is je overzicht. Werk slim, blijf georganiseerd.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              Pro Werkruimte
            </div>
          </div>
        </div>
      </div>

      <StatisticsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
          <PriorityTasks />
        </div>
        <div className="space-y-6">
          <WorkflowWidget />
          {toonFollowUpIndicatoren && <SalesFollowUpWidget />}
          <AIInsightWidget />
          <CalendarMiniWidget />
          <EmailCommunicationHub />
        </div>
      </div>
    </div>
  )
}
