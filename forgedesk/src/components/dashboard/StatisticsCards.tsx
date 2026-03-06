import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'

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

function Sparkline() {
  return (
    <svg className="absolute bottom-0 right-0 w-24 h-10 opacity-[0.06]" viewBox="0 0 100 24" preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points="0,20 15,16 30,18 45,10 60,14 75,6 90,8 100,4" />
    </svg>
  )
}

export function StatisticsCards() {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjecten(), getOffertes(), getFacturen().catch(() => [])])
      .then(([p, o, f]) => {
        if (!cancelled) { setProjecten(p); setOffertes(o); setFacturen(f) }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const actieveProjecten = projecten.filter(p => p.status === 'actief' || p.status === 'in-review').length
  const openstaandeFacturen = facturen
    .filter(f => f.status === 'verzonden' || f.status === 'vervallen')
    .reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0)
  const verstuurdeOffertes = offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken').length
  const goedgekeurd = offertes.filter(o => o.status === 'goedgekeurd').length
  const totaalOffertes = offertes.filter(o => o.status !== 'concept').length
  const hitRate = totaalOffertes > 0 ? Math.round((goedgekeurd / totaalOffertes) * 100) : 0

  const animProjecten = useAnimatedCounter(loading ? 0 : actieveProjecten)
  const animOffertes = useAnimatedCounter(loading ? 0 : verstuurdeOffertes)
  const animHitRate = useAnimatedCounter(loading ? 0 : hitRate)

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-[22px] h-[120px] bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  const vervallenCount = facturen.filter(f => f.status === 'vervallen').length

  const stats = [
    {
      title: 'Openstaand',
      value: formatCurrency(openstaandeFacturen),
      change: vervallenCount > 0 ? `${vervallenCount} vervallen` : undefined,
      changeDown: vervallenCount > 0,
      bgColor: 'bg-blush dark:bg-blush/15',
    },
    {
      title: 'Actieve projecten',
      value: animProjecten.toString(),
      change: `${projecten.length} totaal`,
      bgColor: 'bg-sage dark:bg-sage/15',
    },
    {
      title: 'Offertes verstuurd',
      value: animOffertes.toString(),
      change: `${offertes.length} totaal`,
      bgColor: 'bg-mist dark:bg-mist/15',
    },
    {
      title: 'Hit rate',
      value: `${animHitRate}%`,
      change: `${goedgekeurd} goedgekeurd`,
      bgColor: 'bg-cream dark:bg-cream/15',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.title} className={`${stat.bgColor} rounded-2xl p-[22px] cursor-default group stat-card-hover relative overflow-hidden`}>
          <Sparkline />
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground mb-1.5 relative z-[1]">
            {stat.title}
          </p>
          <p className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.04em] tabular-nums leading-none text-foreground relative z-[1]">
            {stat.value}
          </p>
          {stat.change && (
            <p className={`text-[12px] font-semibold mt-2 relative z-[1] ${stat.changeDown ? 'text-destructive' : 'text-[#5A8264] dark:text-[#7AAF85]'}`}>
              {stat.changeDown ? '↓' : '↑'} {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
