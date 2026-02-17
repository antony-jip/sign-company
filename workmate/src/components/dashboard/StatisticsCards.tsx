import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban,
  Users,
  FileText,
  PiggyBank,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { getProjecten, getKlanten, getOffertes } from '@/services/supabaseService'
import type { Project, Klant, Offerte } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface StatCard {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  gradient: string
  accentColor: string
}

export function StatisticsCards() {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProjecten(), getKlanten(), getOffertes()])
      .then(([p, k, o]) => {
        setProjecten(p)
        setKlanten(k)
        setOffertes(o)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const actieveProjecten = projecten.filter(
    (p) => p.status === 'actief' || p.status === 'in-review'
  ).length

  const totaalKlanten = klanten.length

  const openstaandeOffertes = offertes
    .filter((o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept')
    .reduce((sum, o) => sum + o.totaal, 0)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6 h-[120px]">
              <div className="space-y-3">
                <div className="h-3 w-24 animate-shimmer rounded" />
                <div className="h-7 w-16 animate-shimmer rounded" />
                <div className="h-2.5 w-20 animate-shimmer rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const goedgekeurdeOffertes = offertes
    .filter((o) => o.status === 'goedgekeurd')
    .reduce((sum, o) => sum + o.totaal, 0)

  const stats: StatCard[] = [
    {
      title: 'Actieve Projecten',
      value: actieveProjecten.toString(),
      subtitle: `${projecten.length} totaal`,
      icon: FolderKanban,
      gradient: 'from-blue-500 to-cyan-400',
      accentColor: 'text-blue-500',
    },
    {
      title: 'Totaal Klanten',
      value: totaalKlanten.toString(),
      subtitle: `${klanten.filter((k) => k.status === 'actief').length} actief`,
      icon: Users,
      gradient: 'from-emerald-500 to-teal-400',
      accentColor: 'text-emerald-500',
    },
    {
      title: 'Openstaande Offertes',
      value: formatCurrency(openstaandeOffertes),
      subtitle: `${offertes.filter((o) => ['verzonden', 'bekeken', 'concept'].includes(o.status)).length} offertes`,
      icon: FileText,
      gradient: 'from-violet-500 to-purple-400',
      accentColor: 'text-violet-500',
    },
    {
      title: 'Goedgekeurde Offertes',
      value: formatCurrency(goedgekeurdeOffertes),
      subtitle: `${offertes.filter((o) => o.status === 'goedgekeurd').length} goedgekeurd`,
      icon: PiggyBank,
      gradient: 'from-amber-500 to-orange-400',
      accentColor: 'text-amber-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 wm-stagger">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <Card
            key={stat.title}
            className="wm-stat-card cursor-default group overflow-hidden"
          >
            <CardContent className="p-6 relative">
              {/* Gradient accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                <TrendingUp className={`h-3.5 w-3.5 ${stat.accentColor}`} />
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
