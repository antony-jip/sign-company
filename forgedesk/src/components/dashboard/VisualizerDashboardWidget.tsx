import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVisualizerStats } from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'
import type { VisualizerStats } from '@/types'

export function VisualizerDashboardWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<VisualizerStats | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    getVisualizerStats(user.id)
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  // Don't show if no visualizations yet
  if (!stats || stats.totaal_gegenereerd === 0) return null

  return (
    <div
      className="bg-mist dark:bg-mist/15 rounded-xl p-[22px] cursor-pointer group stat-card-hover relative overflow-hidden"
      onClick={() => navigate('/visualizer')}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-bold uppercase tracking-label text-text-tertiary">
          Visualisaties
        </p>
      </div>
      <p className="text-[28px] font-extrabold tracking-[-0.04em] tabular-nums leading-none text-foreground font-mono">
        {stats.gegenereerd_deze_maand}
        <span className="text-sm font-medium text-muted-foreground ml-1">deze maand</span>
      </p>
      <p className="text-xs font-semibold mt-2 text-[#CC8A3F] dark:text-[#D4A86A]">
        <span className="font-mono">€{round2(stats.kosten_deze_maand_eur)}</span> kosten
      </p>
    </div>
  )
}
