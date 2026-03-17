import React, { useState, useEffect } from 'react'
import { getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { logger } from '../../utils/logger'

function Sparkline({ color }: { color?: string }) {
  return (
    <svg className="absolute bottom-0 right-0 w-28 h-14 opacity-[0.07]" viewBox="0 0 100 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path fill="url(#sparkFill)" d="M0,24 L0,20 15,16 30,18 45,10 60,14 75,6 90,8 100,4 100,24 Z" />
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,20 15,16 30,18 45,10 60,14 75,6 90,8 100,4" />
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

  const animProjecten = useCountUp(loading ? 0 : actieveProjecten)
  const animOffertes = useCountUp(loading ? 0 : verstuurdeOffertes)
  const animHitRate = useCountUp(loading ? 0 : hitRate)

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 h-[120px] bg-muted/30 animate-pulse" />
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
      gradient: 'stat-card-gradient-blush',
    },
    {
      title: 'Actieve projecten',
      value: animProjecten.toString(),
      change: `${projecten.length} totaal`,
      gradient: 'stat-card-gradient-sage',
    },
    {
      title: 'Offertes verstuurd',
      value: animOffertes.toString(),
      change: `${offertes.length} totaal`,
      gradient: 'stat-card-gradient-mist',
    },
    {
      title: 'Hit rate',
      value: `${animHitRate}%`,
      change: `${goedgekeurd} goedgekeurd`,
      gradient: 'stat-card-gradient-cream',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 wm-stagger">
      {stats.map((stat, i) => (
        <div key={stat.title} className={`${stat.gradient} rounded-2xl p-6 cursor-default group stat-card-hover stat-card-glow relative overflow-hidden border border-black/[0.04] dark:border-white/[0.06]`}>
          <Sparkline />
          <p className="text-2xs font-extrabold uppercase tracking-[0.1em] text-text-tertiary dark:text-text-tertiary mb-3 relative z-[1]">
            {stat.title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground relative z-[1] font-mono wm-kpi-value">
            {stat.value}
          </p>
          {stat.change && (
            <p className={`text-xs font-bold mt-4 relative z-[1] flex items-center gap-1 ${stat.changeDown ? 'text-destructive' : 'text-[#3A7D52] dark:text-[#7AAF85]'}`}>
              <span className="inline-block transition-transform duration-300 group-hover:translate-y-[-1px]">
                {stat.changeDown ? '↓' : '↑'}
              </span>
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
