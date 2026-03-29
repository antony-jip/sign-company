import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, TrendingUp, Clock, Coins } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVisualizerStats, getVisualizerCredits } from '@/services/supabaseService'
import type { VisualizerStats } from '@/types'

interface VisualizerKostenDashboardProps {
  compact?: boolean
}

export function VisualizerKostenDashboard({ compact = false }: VisualizerKostenDashboardProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<VisualizerStats | null>(null)
  const [creditSaldo, setCreditSaldo] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const [s, credits] = await Promise.all([
          getVisualizerStats(user!.id),
          getVisualizerCredits(user!.id),
        ])
        if (!cancelled) {
          setStats(s)
          setCreditSaldo(credits.saldo)
        }
      } catch (err) { /* ignore */ }
      if (!cancelled) setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{stats.gegenereerd_deze_maand}</span> deze maand
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{creditSaldo}</span> credits over
        </span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Visualizer Gebruik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deze maand</p>
              <p className="text-sm font-medium">
                {stats.gegenereerd_deze_maand} mockups — {stats.gegenereerd_deze_maand} credits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded">
              <Coins className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credits saldo</p>
              <p className="text-sm font-medium">{creditSaldo} credits</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/30 rounded">
              <Palette className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Totaal gebruikt</p>
              <p className="text-sm font-medium">
                {stats.totaal_gegenereerd} mockups — {stats.totaal_gegenereerd} credits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 dark:bg-orange-950/30 rounded">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gem. generatietijd</p>
              <p className="text-sm font-medium">
                {stats.gemiddelde_generatietijd_ms > 0
                  ? `${(stats.gemiddelde_generatietijd_ms / 1000).toFixed(1)}s`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
