import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderKanban,
  Users,
  FileText,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { getProjecten, getKlanten, getOffertes } from '@/services/supabaseService'
import type { Project, Klant, Offerte } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface StatCard {
  title: string
  value: string
  trend: number
  trendLabel: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
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
          <Card key={i} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6 flex items-center justify-center h-[120px]">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats: StatCard[] = [
    {
      title: 'Actieve Projecten',
      value: actieveProjecten.toString(),
      trend: 12,
      trendLabel: 'vs. vorige maand',
      icon: FolderKanban,
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Totaal Klanten',
      value: totaalKlanten.toString(),
      trend: 3,
      trendLabel: 'vs. vorige maand',
      icon: Users,
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Openstaande Offertes',
      value: formatCurrency(openstaandeOffertes),
      trend: -2,
      trendLabel: 'vs. vorige maand',
      icon: FileText,
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Omzet Deze Maand',
      value: formatCurrency(47250),
      trend: 8,
      trendLabel: 'vs. vorige maand',
      icon: PiggyBank,
      iconBg: 'bg-orange-100 dark:bg-orange-900/50',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const isPositive = stat.trend >= 0
        const TrendIcon = isPositive ? TrendingUp : TrendingDown

        return (
          <Card
            key={stat.title}
            className="hover:shadow-md transition-shadow duration-200 cursor-default"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex items-center justify-center h-12 w-12 rounded-full ${stat.iconBg}`}
                >
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-0.5 text-sm font-medium ${
                    isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  <TrendIcon className="h-4 w-4" />
                  <span>
                    {isPositive ? '+' : ''}
                    {stat.trend}%
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {stat.trendLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
