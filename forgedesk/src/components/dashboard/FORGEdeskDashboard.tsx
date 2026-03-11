import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { PortaalAlerts } from './PortaalAlerts'
import { usePortaalHerinnering } from '@/hooks/usePortaalHerinnering'
import { ActionBlock } from './ActionBlock'
import { MoneyBlock } from './MoneyBlock'
import { WeekStripWidget } from './WeekStripWidget'
import { WeatherWidget } from './WeatherWidget'
import { MontagePlanningWidget } from './MontagePlanningWidget'
import { Card, CardContent } from '@/components/ui/card'

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

      {/* Week strip + Weather context bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <WeekStripWidget />
          <WeatherWidget />
        </CardContent>
      </Card>

      {/* Portaal alerts */}
      <PortaalAlerts />

      {/* Two main blocks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Blok 1: Wat moet ik vandaag doen? */}
        <ActionBlock />

        {/* Blok 2: Waar zit mijn geld? */}
        <MoneyBlock />
      </div>

      {/* Montage planning */}
      <MontagePlanningWidget />
    </div>
  )
}
