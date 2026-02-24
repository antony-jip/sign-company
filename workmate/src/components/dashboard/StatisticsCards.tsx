import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban,
  Users,
  FileText,
  PiggyBank,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { getProjecten, getKlanten, getOffertes } from '@/services/supabaseService'
import type { Project, Klant, Offerte } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'

interface StatCard {
  title: string
  value: string
  subtitle: string
  change?: string
  icon: LucideIcon
  gradient: string
  shadowColor: string
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 800): number {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)
  const rafId = useRef<number>(0)
  const countRef = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target

    const startTime = Date.now()
    const startValue = countRef.current

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const newCount = Math.round(startValue + (target - startValue) * eased)
      countRef.current = newCount
      setCount(newCount)
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick)
      }
    }

    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [target, duration])

  return count
}

// Sparkline SVG decoration
function Sparkline() {
  const points = '0,20 15,16 30,18 45,10 60,14 75,6 90,8 100,4'
  return (
    <svg className="absolute bottom-0 right-0 w-24 h-10 opacity-[0.06]" viewBox="0 0 100 24" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export function StatisticsCards() {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjecten(), getKlanten(), getOffertes()])
      .then(([p, k, o]) => {
        if (!cancelled) {
          setProjecten(p)
          setKlanten(k)
          setOffertes(o)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const actieveProjecten = projecten.filter(
    (p) => p.status === 'actief' || p.status === 'in-review'
  ).length
  const totaalKlanten = klanten.length
  const openstaandeOffertes = offertes
    .filter((o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept')
    .reduce((sum, o) => sum + o.totaal, 0)
  const goedgekeurdeOffertes = offertes
    .filter((o) => o.status === 'goedgekeurd')
    .reduce((sum, o) => sum + o.totaal, 0)

  const animProjecten = useAnimatedCounter(loading ? 0 : actieveProjecten)
  const animKlanten = useAnimatedCounter(loading ? 0 : totaalKlanten)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-5 h-[130px]">
              <div className="space-y-3">
                <div className="h-3 w-20 animate-shimmer rounded-md" />
                <div className="h-8 w-14 animate-shimmer rounded-md" />
                <div className="h-2.5 w-24 animate-shimmer rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats: StatCard[] = [
    {
      title: 'Actieve Projecten',
      value: animProjecten.toString(),
      subtitle: `${projecten.length} totaal`,
      change: projecten.length > 0 ? `${Math.round((actieveProjecten / projecten.length) * 100)}%` : undefined,
      icon: FolderKanban,
      gradient: 'from-primary to-wm-light',
      shadowColor: 'shadow-primary/20',
    },
    {
      title: 'Totaal Klanten',
      value: animKlanten.toString(),
      subtitle: `${klanten.filter((k) => k.status === 'actief').length} actief`,
      icon: Users,
      gradient: 'from-accent to-primary',
      shadowColor: 'shadow-accent/20',
    },
    {
      title: 'Open Offertes',
      value: formatCurrency(openstaandeOffertes),
      subtitle: `${offertes.filter((o) => ['verzonden', 'bekeken', 'concept'].includes(o.status)).length} offertes`,
      icon: FileText,
      gradient: 'from-[#4A442D] to-[#6b6549]',
      shadowColor: 'shadow-[#4A442D]/20',
    },
    {
      title: 'Goedgekeurd',
      value: formatCurrency(goedgekeurdeOffertes),
      subtitle: `${offertes.filter((o) => o.status === 'goedgekeurd').length} goedgekeurd`,
      icon: PiggyBank,
      gradient: 'from-[#8b7355] to-[#b09670]',
      shadowColor: 'shadow-[#8b7355]/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 wm-stagger">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <Card key={stat.title} className="wm-stat-card cursor-default group overflow-hidden">
            <CardContent className="p-5 relative">
              <Sparkline />

              <div className="flex items-start justify-between mb-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </p>
                <div className={`wm-stat-icon flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadowColor} shadow-lg`}>
                  <Icon className="h-[18px] w-[18px] text-white" />
                </div>
              </div>

              <p className="text-3xl font-bold text-foreground tracking-tight">
                {stat.value}
              </p>

              <div className="mt-3 flex items-center gap-2">
                {stat.change && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent dark:text-primary bg-wm-pale/40 dark:bg-primary/10 px-1.5 py-0.5 rounded-md">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.change}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
