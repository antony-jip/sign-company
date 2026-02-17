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

export function WorkmateDashboard() {
  const { user } = useAuth()
  const { profile, toonFollowUpIndicatoren, toonConversieRate } = useAppSettings()
  const userName = profile?.voornaam || user?.user_metadata?.voornaam || user?.email?.split('@')[0] || ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welkom terug{userName ? `, ${userName}` : ''}! Hier is je overzicht.
        </p>
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
