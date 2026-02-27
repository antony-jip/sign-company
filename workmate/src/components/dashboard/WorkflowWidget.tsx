import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Receipt,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react'
import { getOffertes, getFacturen, getProjecten } from '@/services/supabaseService'
import { formatCurrency } from '@/lib/utils'
import type { Offerte, Factuur, Project } from '@/types'
import { logger } from '../../utils/logger'

interface WorkflowItem {
  type: 'factureer' | 'vervallen' | 'geen_offerte' | 'verloopt_binnenkort'
  title: string
  subtitle: string
  link: string
  urgency: 'high' | 'medium' | 'low'
}

export function WorkflowWidget() {
  const [items, setItems] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [offertes, facturen, projecten] = await Promise.all([
          getOffertes().catch(() => []),
          getFacturen().catch(() => []),
          getProjecten().catch(() => []),
        ])

        if (cancelled) return

        const workflowItems: WorkflowItem[] = []

        // 1. Goedgekeurde offertes die nog niet gefactureerd zijn
        const goedgekeurdeOffertes = offertes.filter(
          (o: Offerte) => o.status === 'goedgekeurd'
        )
        const gefactuurdeOfferteIds = new Set(
          facturen
            .filter((f: Factuur) => f.offerte_id)
            .map((f: Factuur) => f.offerte_id)
        )
        const teFactureren = goedgekeurdeOffertes.filter(
          (o: Offerte) => !gefactuurdeOfferteIds.has(o.id)
        )
        for (const offerte of teFactureren) {
          workflowItems.push({
            type: 'factureer',
            title: `${offerte.nummer} - ${offerte.titel}`,
            subtitle: `${offerte.klant_naam || 'Klant'} \u2022 ${formatCurrency(offerte.totaal)}`,
            link: `/facturen?convert_offerte=${offerte.id}`,
            urgency: 'medium',
          })
        }

        // 2. Vervallen facturen
        const now = new Date()
        const vervallenFacturen = facturen.filter(
          (f: Factuur) =>
            (f.status === 'verzonden' || f.status === 'vervallen') &&
            new Date(f.vervaldatum) < now
        )
        for (const factuur of vervallenFacturen) {
          const dagenVervallen = Math.floor(
            (now.getTime() - new Date(factuur.vervaldatum).getTime()) / (1000 * 60 * 60 * 24)
          )
          workflowItems.push({
            type: 'vervallen',
            title: `${factuur.nummer} - ${factuur.titel}`,
            subtitle: `${factuur.klant_naam || 'Klant'} \u2022 ${dagenVervallen} dagen vervallen`,
            link: '/facturen',
            urgency: dagenVervallen > 14 ? 'high' : 'medium',
          })
        }

        // 3. Offertes die binnenkort verlopen (binnen 7 dagen)
        const binnenkortVerlopend = offertes.filter((o: Offerte) => {
          if (!['verzonden', 'bekeken'].includes(o.status) || !o.geldig_tot) return false
          const geldigTot = new Date(o.geldig_tot)
          const dagenTot = Math.floor((geldigTot.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return dagenTot >= 0 && dagenTot <= 7
        })
        for (const offerte of binnenkortVerlopend) {
          const dagenTot = Math.floor(
            (new Date(offerte.geldig_tot).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          workflowItems.push({
            type: 'verloopt_binnenkort',
            title: `${offerte.nummer} - ${offerte.titel}`,
            subtitle: `${offerte.klant_naam || 'Klant'} \u2022 ${dagenTot === 0 ? 'Verloopt vandaag!' : `Nog ${dagenTot} dag${dagenTot !== 1 ? 'en' : ''}`}`,
            link: `/offertes/${offerte.id}/bewerken`,
            urgency: dagenTot <= 2 ? 'high' : 'medium',
          })
        }

        // 4. Actieve projecten zonder offerte
        const projectIdsMetOfferte = new Set(
          offertes.filter((o: Offerte) => o.project_id).map((o: Offerte) => o.project_id)
        )
        const projectenZonderOfferte = projecten.filter(
          (p: Project) =>
            (p.status === 'actief' || p.status === 'gepland') &&
            !projectIdsMetOfferte.has(p.id)
        )
        for (const project of projectenZonderOfferte.slice(0, 3)) {
          workflowItems.push({
            type: 'geen_offerte',
            title: project.naam,
            subtitle: `${project.klant_naam || 'Klant'} \u2022 Nog geen offerte`,
            link: `/offertes/nieuw?project_id=${project.id}&klant_id=${project.klant_id}&titel=${encodeURIComponent(project.naam)}`,
            urgency: 'low',
          })
        }

        if (!cancelled) setItems(workflowItems)
      } catch (err) {
        logger.error('WorkflowWidget load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5 flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Workflow</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Alles is bijgewerkt. Geen openstaande acties.
          </p>
        </CardContent>
      </Card>
    )
  }

  const iconMap = {
    factureer: <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    vervallen: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
    verloopt_binnenkort: <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
    geen_offerte: <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  }

  const labelMap = {
    factureer: 'Te factureren',
    vervallen: 'Vervallen',
    verloopt_binnenkort: 'Verloopt',
    geen_offerte: 'Geen offerte',
  }

  const badgeColorMap = {
    factureer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    vervallen: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    verloopt_binnenkort: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    geen_offerte: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Actie vereist
          </h3>
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="space-y-2">
          {items.slice(0, 6).map((item, i) => (
            <Link
              key={i}
              to={item.link}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {iconMap[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-accent dark:group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${badgeColorMap[item.type]}`}
              >
                {labelMap[item.type]}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          ))}
        </div>
        {items.length > 6 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{items.length - 6} meer items
          </p>
        )}
      </CardContent>
    </Card>
  )
}
