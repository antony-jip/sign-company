import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Project, Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { logger } from '../../utils/logger'
import { TrendingUp, TrendingDown, ArrowRight, Receipt, FolderOpen, FileText, Wallet, Target } from 'lucide-react'

export function StatisticsCards() {
  const navigate = useNavigate()
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
  const hitRate = totaalOffertes > 0 ? Math.round((goedgekeurd / totaalOffertes) * 100) : 0

  const teFactureren = offertes
    .filter(o => o.status === 'goedgekeurd')
    .reduce((sum, o) => sum + (o.totaal || 0), 0)

  const animProjecten = useCountUp(loading ? 0 : actieveProjecten)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-[120px] animate-pulse"
            style={{ backgroundColor: '#FEFDFB', boxShadow: '0 1px 3px rgba(130,100,60,0.06)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Omzet deze maand — primary hero card */}
      <StatCard
        label="Omzet deze maand"
        value={formatCurrency(omzetDezeMaand)}
        sub={`${formatCurrency(openstaandeFacturen)} openstaand`}
        icon={<TrendingUp className="h-4 w-4" />}
        iconBg="#1A535C"
        valueColor="#1A535C"
        onClick={() => navigate('/facturen')}
      />

      {/* Te factureren */}
      <StatCard
        label="Te factureren"
        value={formatCurrency(teFactureren)}
        icon={<Receipt className="h-4 w-4" />}
        iconBg="#F15025"
        valueColor="#1A535C"
        onClick={() => navigate('/facturen')}
        progress={
          omzetDezeMaand + teFactureren > 0
            ? Math.min((omzetDezeMaand / (omzetDezeMaand + teFactureren)) * 100, 100)
            : 0
        }
      />

      {/* Openstaand */}
      <StatCard
        label="Openstaand"
        value={formatCurrency(openstaandeFacturen)}
        sub={`${openFacturen.length} facturen`}
        icon={<Wallet className="h-4 w-4" />}
        iconBg="#C03A18"
        valueColor="#C03A18"
        onClick={() => navigate('/facturen')}
      />

      {/* Projecten actief */}
      <StatCard
        label="Actieve projecten"
        value={String(animProjecten)}
        sub={`${geplande} gepland`}
        icon={<FolderOpen className="h-4 w-4" />}
        iconBg="#1A535C"
        onClick={() => navigate('/projecten')}
      />

      {/* Offertes verstuurd */}
      <StatCard
        label="Offertes verstuurd"
        value={String(verstuurdeOffertes)}
        sub={`${goedgekeurd} goedgekeurd`}
        icon={<FileText className="h-4 w-4" />}
        iconBg="#3A5A9A"
        onClick={() => navigate('/offertes')}
      />

      {/* Hit rate */}
      <StatCard
        label="Hit rate"
        value={`${hitRate}%`}
        sub={`${goedgekeurd}/${totaalOffertes} offertes`}
        icon={<Target className="h-4 w-4" />}
        iconBg={hitRate >= 50 ? '#3A7D52' : '#8A7A4A'}
        valueColor={hitRate >= 50 ? '#3A7D52' : '#8A7A4A'}
        onClick={() => navigate('/offertes')}
        ring={hitRate}
      />
    </div>
  )
}

// ── Reusable stat card ──

function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  valueColor,
  onClick,
  progress,
  ring,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  iconBg: string
  valueColor?: string
  onClick?: () => void
  progress?: number
  ring?: number
}) {
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl p-5 relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-[2px] hover:shadow-elevation-md"
      style={{
        backgroundColor: '#FEFDFB',
        boxShadow: '0 1px 4px rgba(130,100,60,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      {/* Icon badge */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center justify-center h-8 w-8 rounded-xl text-white"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5" />
      </div>

      {/* Label */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: 'hsl(25, 10%, 50%)' }}>
        {label}
      </p>

      {/* Value */}
      <p
        className="font-mono text-[26px] font-bold tracking-tight mt-0.5 leading-tight"
        style={{ color: valueColor || '#1A1A1A' }}
      >
        {value}
      </p>

      {/* Sub text */}
      {sub && (
        <p className="font-mono text-[12px] mt-1" style={{ color: 'hsl(25, 10%, 55%)' }}>
          {sub}
        </p>
      )}

      {/* Optional progress bar */}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(35, 15%, 92%)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #1A535C, #F15025)',
            }}
          />
        </div>
      )}

      {/* Optional ring indicator */}
      {ring !== undefined && (
        <div className="absolute top-5 right-5">
          <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-20">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted-foreground/20" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              stroke={iconBg}
              strokeWidth="3"
              strokeDasharray={`${ring * 0.88} 88`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              className="transition-all duration-700"
            />
          </svg>
        </div>
      )}
    </div>
  )
}
