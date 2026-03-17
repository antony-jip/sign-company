import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  FileText,
  Receipt,
  CircleDollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { getOffertes, getFacturen } from '@/services/supabaseService'
import { formatCurrency } from '@/lib/utils'
import type { Offerte, Factuur } from '@/types'
import { logger } from '../../utils/logger'

interface PulseMetric {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  href: string
  accent: string
}

export function SalesPulseWidget() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getOffertes(), getFacturen()])
      .then(([o, f]) => {
        if (!cancelled) {
          setOffertes(o)
          setFacturen(f)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] rounded-xl animate-shimmer" />
        ))}
      </div>
    )
  }

  // Pipeline: open quotes total value
  const openOffertes = offertes.filter((o) =>
    ['verzonden', 'bekeken', 'concept'].includes(o.status)
  )
  const pipelineValue = openOffertes.reduce((sum, o) => sum + o.totaal, 0)

  // Te factureren: approved quotes not yet invoiced
  const gefactuurdeOfferteIds = new Set(
    facturen.filter((f) => f.offerte_id).map((f) => f.offerte_id)
  )
  const teFactureren = offertes.filter(
    (o) => o.status === 'goedgekeurd' && !gefactuurdeOfferteIds.has(o.id)
  )
  const teFacturerenValue = teFactureren.reduce((sum, o) => sum + o.totaal, 0)

  // Openstaand: unpaid invoices
  const openFacturen = facturen.filter((f) =>
    ['verzonden', 'vervallen'].includes(f.status)
  )
  const openstaandValue = openFacturen.reduce((sum, f) => sum + f.totaal - (f.betaald_bedrag || 0), 0)

  // Omzet deze maand: paid invoices this month
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const betaaldDezeMaand = facturen.filter((f) => {
    if (f.status !== 'betaald' || !f.betaaldatum) return false
    const d = new Date(f.betaaldatum)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const omzetDezeMaand = betaaldDezeMaand.reduce((sum, f) => sum + f.totaal, 0)

  const metrics: PulseMetric[] = [
    {
      label: 'Pipeline',
      value: formatCurrency(pipelineValue),
      detail: `${openOffertes.length} open offerte${openOffertes.length !== 1 ? 's' : ''}`,
      icon: <TrendingUp className="h-4 w-4" />,
      href: '/offertes',
      accent: 'text-primary bg-primary/10',
    },
    {
      label: 'Te factureren',
      value: formatCurrency(teFacturerenValue),
      detail: `${teFactureren.length} goedgekeurd`,
      icon: <FileText className="h-4 w-4" />,
      href: '/facturen',
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      label: 'Openstaand',
      value: formatCurrency(openstaandValue),
      detail: `${openFacturen.length} facturen`,
      icon: <Receipt className="h-4 w-4" />,
      href: '/facturen',
      accent: openFacturen.some((f) => f.status === 'vervallen')
        ? 'text-red-600 dark:text-red-400 bg-red-500/10'
        : 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    },
    {
      label: 'Omzet deze maand',
      value: formatCurrency(omzetDezeMaand),
      detail: `${betaaldDezeMaand.length} betaald`,
      icon: <CircleDollarSign className="h-4 w-4" />,
      href: '/financieel',
      accent: 'text-accent dark:text-wm-light bg-accent/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <Link
          key={m.label}
          to={m.href}
          className="group relative rounded-xl border border-black/[0.04] dark:border-white/[0.06] bg-card p-4 shadow-elevation-xs hover:shadow-elevation-md hover:-translate-y-[2px] transition-all duration-300 ease-smooth"
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`flex items-center justify-center h-7 w-7 rounded-lg ${m.accent}`}>
              {m.icon}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight truncate">{m.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
          <p className="text-2xs text-muted-foreground/60 mt-0.5 hidden sm:block">{m.detail}</p>
        </Link>
      ))}
    </div>
  )
}
