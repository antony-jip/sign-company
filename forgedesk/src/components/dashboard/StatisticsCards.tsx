import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban,
  Users,
  FileText,
  PiggyBank,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { getProjecten, getKlanten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Klant, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'

interface StatCard {
  title: string
  value: string
  subtitle: string
  change?: string
  icon: LucideIcon
  bgColor: string
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 800): number {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target

    const startTime = Date.now()
    const startValue = count

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startValue + (target - startValue) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
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
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjecten(), getKlanten(), getOffertes(), getFacturen().catch(() => [])])
      .then(([p, k, o, f]) => {
        if (!cancelled) {
          setProjecten(p)
          setKlanten(k)
          setOffertes(o)
          setFacturen(f)
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
  const openstaandeFacturen = facturen
    .filter((f) => f.status === 'verzonden' || f.status === 'vervallen')
    .reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0)
  const betaaldDezeMaand = facturen
    .filter((f) => {
      if (f.status !== 'betaald' || !f.betaaldatum) return false
      const d = new Date(f.betaaldatum)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, f) => sum + f.betaald_bedrag, 0)

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
      bgColor: 'bg-blush dark:bg-blush/15',
    },
    {
      title: 'Totaal Klanten',
      value: animKlanten.toString(),
      subtitle: `${klanten.filter((k) => k.status === 'actief').length} actief`,
      icon: Users,
      bgColor: 'bg-sage dark:bg-sage/15',
    },
    {
      title: 'Open Offertes',
      value: formatCurrency(openstaandeOffertes),
      subtitle: `${offertes.filter((o) => ['verzonden', 'bekeken', 'concept'].includes(o.status)).length} offertes`,
      icon: FileText,
      bgColor: 'bg-mist dark:bg-mist/15',
    },
    {
      title: 'Goedgekeurd',
      value: formatCurrency(goedgekeurdeOffertes),
      subtitle: `${offertes.filter((o) => o.status === 'goedgekeurd').length} goedgekeurd`,
      icon: PiggyBank,
      bgColor: 'bg-cream dark:bg-cream/15',
    },
    {
      title: 'Openstaand',
      value: formatCurrency(openstaandeFacturen),
      subtitle: `${facturen.filter((f) => f.status === 'verzonden' || f.status === 'vervallen').length} facturen`,
      change: facturen.filter((f) => f.status === 'vervallen').length > 0
        ? `${facturen.filter((f) => f.status === 'vervallen').length} vervallen`
        : undefined,
      icon: Receipt,
      bgColor: 'bg-blush dark:bg-blush/15',
    },
    {
      title: 'Betaald (maand)',
      value: formatCurrency(betaaldDezeMaand),
      subtitle: `${facturen.filter((f) => f.status === 'betaald' && f.betaaldatum && (() => { const d = new Date(f.betaaldatum); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() })()).length} facturen`,
      icon: TrendingUp,
      bgColor: 'bg-sage dark:bg-sage/15',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div key={stat.title} className={`${stat.bgColor} rounded-2xl p-[22px] cursor-default group stat-card-hover relative overflow-hidden`}>
            <Sparkline />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground mb-1.5">
                  {stat.title}
                </p>
                <p className="text-[32px] font-extrabold tracking-[-0.04em] tabular-nums leading-none text-foreground">
                  {stat.value}
                </p>
              </div>
              <Icon className="h-5 w-5 text-foreground/30" />
            </div>

            <div className="mt-2 flex items-center gap-2">
              {stat.change && (
                <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#4A9960]">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </span>
              )}
              <span className="text-[12px] text-muted-foreground">
                {stat.subtitle}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
