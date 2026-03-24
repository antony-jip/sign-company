import React, { useState, useEffect } from 'react'
import { getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { logger } from '../../utils/logger'

function StatusBadge({ status }: { status: string }) {
  const bgMap: Record<string, string> = {
    verstuurd: '#E8EEF9',
    betaald: '#E8F2EC',
    gepland: '#F5F2E8',
    opgeleverd: '#E8F2EC',
    concept: '#F5F2E8',
    'in_uitvoering': '#E8EEF9',
  }
  const textMap: Record<string, string> = {
    verstuurd: '#3A5A9A',
    betaald: '#3A7D52',
    gepland: '#8A7A4A',
    opgeleverd: '#3A7D52',
    concept: '#8A7A4A',
    'in_uitvoering': '#3A5A9A',
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: bgMap[status] || '#F0F0EE', color: textMap[status] || '#8A8A8A' }}
    >
      {status.replace(/_/g, ' ')}<span style={{ color: '#F15025' }}>.</span>
    </span>
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
  const geplande = projecten.filter(p => p.status === 'gepland').length
  const opgeleverd = projecten.filter(p => p.status === 'opgeleverd' || p.status === 'afgerond').length

  const openFacturen = facturen.filter(f => f.status === 'verzonden' || f.status === 'vervallen')
  const openstaandeFacturen = openFacturen.reduce((sum, f) => sum + (f.totaal - f.betaald_bedrag), 0)

  const now = new Date()
  const maandStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const maandEind = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const betaaldDezeMaand = facturen.filter(f => {
    if (f.status !== 'betaald' || !f.betaaldatum) return false
    const d = new Date(f.betaaldatum)
    return d >= maandStart && d <= maandEind
  })
  const omzetDezeMaand = betaaldDezeMaand.reduce((sum, f) => sum + f.totaal, 0)

  const verstuurdeOffertes = offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken').length
  const goedgekeurd = offertes.filter(o => o.status === 'goedgekeurd').length
  const totaalOffertes = offertes.filter(o => o.status !== 'concept').length
  const openOffertes = offertes.filter(o => ['concept', 'verzonden', 'bekeken'].includes(o.status)).length

  const teFactureren = offertes
    .filter(o => o.status === 'goedgekeurd')
    .reduce((sum, o) => sum + (o.totaal || 0), 0)

  const animProjecten = useCountUp(loading ? 0 : actieveProjecten)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-6 h-[140px] bg-[#FEFDFB] animate-pulse" style={{ boxShadow: '0 1px 3px rgba(130,100,60,0.06)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Omzet dit kwartaal / deze maand */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Omzet deze maand
        </p>
        <p className="font-mono text-[32px] font-bold tracking-tight mt-2" style={{ color: '#1A535C' }}>
          {formatCurrency(omzetDezeMaand)}
        </p>
        <p className="font-mono text-[14px] mt-1" style={{ color: 'hsl(25, 10%, 45%)' }}>
          {formatCurrency(openstaandeFacturen)} openstaand
        </p>
        {/* Decorative dots */}
        <div className="absolute top-4 right-4 grid grid-cols-3 gap-1 opacity-[0.08]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#1A535C]" />
          ))}
        </div>
      </div>

      {/* Openstaande offertes */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Openstaande offertes ({openOffertes})
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <StatusBadge status="verstuurd" />
          <StatusBadge status="betaald" />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <StatusBadge status="concept" />
        </div>
      </div>

      {/* Projecten actief */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Projecten actief ({animProjecten})
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <StatusBadge status="gepland" />
          <StatusBadge status="opgeleverd" />
        </div>
        <p className="font-mono text-[13px] mt-2" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Projecten: {actieveProjecten} &nbsp; Gepland: {geplande} &nbsp; Klaar: {opgeleverd}
        </p>
        {/* Decorative cluster */}
        <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-[0.06]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#1A535C]" style={{ transform: `translateY(${Math.sin(i) * 4}px)` }} />
          ))}
        </div>
      </div>

      {/* Te factureren */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Te factureren
        </p>
        <p className="font-mono text-[32px] font-bold tracking-tight mt-2" style={{ color: '#1A535C' }}>
          {formatCurrency(teFactureren)}
        </p>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(35, 15%, 90%)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${omzetDezeMaand + teFactureren > 0 ? Math.min((omzetDezeMaand / (omzetDezeMaand + teFactureren)) * 100, 100) : 0}%`,
              background: 'linear-gradient(90deg, #1A535C, #F15025)',
            }}
          />
        </div>
        <p className="font-mono text-[13px] mt-1" style={{ color: 'hsl(25, 10%, 45%)' }}>
          {formatCurrency(omzetDezeMaand + teFactureren)} target
        </p>
      </div>

      {/* Offertes verstuurd / hit rate */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Offertes verstuurd
        </p>
        <p className="font-mono text-[32px] font-bold tracking-tight mt-2" style={{ color: '#1A535C' }}>
          {verstuurdeOffertes}
        </p>
        <p className="font-mono text-[13px] mt-1" style={{ color: 'hsl(25, 10%, 45%)' }}>
          {goedgekeurd} goedgekeurd &middot; {totaalOffertes > 0 ? Math.round((goedgekeurd / totaalOffertes) * 100) : 0}% hit rate
        </p>
      </div>

      {/* Openstaand te ontvangen */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
        style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 45%)' }}>
          Openstaand
        </p>
        <p className="font-mono text-[32px] font-bold tracking-tight mt-2" style={{ color: '#C03A18' }}>
          {formatCurrency(openstaandeFacturen)}
        </p>
        <p className="font-mono text-[13px] mt-1" style={{ color: 'hsl(25, 10%, 45%)' }}>
          {openFacturen.length} facturen &middot; te ontvangen
        </p>
      </div>
    </div>
  )
}
