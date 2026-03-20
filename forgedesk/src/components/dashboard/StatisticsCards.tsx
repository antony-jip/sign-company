import React, { useState, useEffect } from 'react'
import { getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { logger } from '../../utils/logger'

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
          <div key={i} className="rounded-[10px] p-5 h-[120px] bg-muted/30 animate-pulse" />
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
      bg: '#FDE8E2',
      textColor: '#C03A18',
    },
    {
      title: 'Actieve projecten',
      value: animProjecten.toString(),
      change: `${projecten.length} totaal`,
      bg: '#E4F0EA',
      textColor: '#2D6B48',
    },
    {
      title: 'Offertes verstuurd',
      value: animOffertes.toString(),
      change: `${offertes.length} totaal`,
      bg: '#E5ECF6',
      textColor: '#2A5580',
    },
    {
      title: 'Hit rate',
      value: `${animHitRate}%`,
      change: `${goedgekeurd} goedgekeurd`,
      bg: '#E2F0F0',
      textColor: '#1A535C',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-[10px] p-6 cursor-default relative overflow-hidden"
          style={{ backgroundColor: stat.bg }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-3"
            style={{ letterSpacing: '1px', color: stat.textColor }}
          >
            {stat.title}
          </p>
          <p
            className="font-mono text-[22px] font-bold tracking-tight"
            style={{ color: stat.textColor }}
          >
            {stat.value}
          </p>
          {stat.change && (
            <p
              className="text-xs font-medium mt-4 flex items-center gap-1"
              style={{ color: stat.textColor, opacity: 0.7 }}
            >
              <span>{stat.changeDown ? '↓' : '↑'}</span>
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
