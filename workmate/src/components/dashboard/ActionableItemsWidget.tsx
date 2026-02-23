import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  FileText,
  Receipt,
  Clock,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react'
import { getOffertes, getFacturen, getTaken, getProjecten } from '@/services/supabaseService'
import type { Offerte, Factuur, Taak, Project } from '@/types'
import { isBefore, parseISO, differenceInDays } from 'date-fns'
import { logger } from '../../utils/logger'

interface ActionItem {
  id: string
  type: 'verlopen_factuur' | 'verlopen_offerte' | 'achterstallig_follow_up' | 'deadline_vandaag'
  title: string
  subtitle: string
  urgency: 'hoog' | 'medium'
  link: string
  action?: { label: string; path: string }
}

export function ActionableItemsWidget() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const [offertes, facturen, taken, projecten] = await Promise.all([
          getOffertes(),
          getFacturen(),
          getTaken(),
          getProjecten(),
        ])
        if (cancelled) return

        const projectMap = new Map(projecten.map((p) => [p.id, p.naam]))

        const now = new Date()
        const actionItems: ActionItem[] = []

        // Verlopen facturen (status verzonden + vervaldatum < nu)
        facturen
          .filter((f) => f.status === 'verzonden' && f.vervaldatum && isBefore(parseISO(f.vervaldatum), now))
          .forEach((f) => {
            const days = differenceInDays(now, parseISO(f.vervaldatum))
            actionItems.push({
              id: `factuur-${f.id}`,
              type: 'verlopen_factuur',
              title: `Factuur ${f.nummer} is ${days} ${days === 1 ? 'dag' : 'dagen'} verlopen`,
              subtitle: f.klant_naam || `€${f.totaal.toLocaleString('nl-NL')}`,
              urgency: days > 14 ? 'hoog' : 'medium',
              link: '/facturen',
              action: { label: 'Herinnering sturen', path: '/facturen' },
            })
          })

        // Verlopen offertes (status verzonden/bekeken + geldig_tot < nu)
        offertes
          .filter((o) =>
            ['verzonden', 'bekeken'].includes(o.status) &&
            o.geldig_tot &&
            isBefore(parseISO(o.geldig_tot), now)
          )
          .forEach((o) => {
            const days = differenceInDays(now, parseISO(o.geldig_tot))
            actionItems.push({
              id: `offerte-${o.id}`,
              type: 'verlopen_offerte',
              title: `Offerte ${o.nummer} is ${days} ${days === 1 ? 'dag' : 'dagen'} verlopen`,
              subtitle: o.klant_naam || o.titel,
              urgency: 'medium',
              link: `/offertes/${o.id}`,
              action: { label: 'Opvolgen', path: `/offertes/${o.id}` },
            })
          })

        // Achterstallige follow-ups
        offertes
          .filter((o) =>
            o.follow_up_datum &&
            isBefore(parseISO(o.follow_up_datum), now) &&
            o.follow_up_status !== 'afgerond' &&
            ['verzonden', 'bekeken'].includes(o.status)
          )
          .forEach((o) => {
            actionItems.push({
              id: `followup-${o.id}`,
              type: 'achterstallig_follow_up',
              title: `Follow-up voor ${o.nummer} is achterstallig`,
              subtitle: o.klant_naam || o.titel,
              urgency: 'medium',
              link: `/offertes/${o.id}`,
              action: { label: 'Opvolgen', path: `/offertes/${o.id}` },
            })
          })

        // Taken met deadline vandaag die nog open zijn
        const todayStr = now.toISOString().slice(0, 10)
        taken
          .filter((t) =>
            t.status !== 'klaar' &&
            t.deadline &&
            t.deadline.slice(0, 10) === todayStr
          )
          .forEach((t) => {
            actionItems.push({
              id: `taak-${t.id}`,
              type: 'deadline_vandaag',
              title: t.titel,
              subtitle: projectMap.get(t.project_id) || 'Deadline vandaag',
              urgency: t.prioriteit === 'hoog' || t.prioriteit === 'kritiek' ? 'hoog' : 'medium',
              link: `/taken`,
            })
          })

        // Sort: hoge urgentie eerst, dan op type
        actionItems.sort((a, b) => {
          if (a.urgency !== b.urgency) return a.urgency === 'hoog' ? -1 : 1
          return 0
        })

        setItems(actionItems)
      } catch (error) {
        logger.error('ActionableItemsWidget: failed to load', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Alles bij!</p>
              <p className="text-xs text-muted-foreground">Geen openstaande acties op dit moment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TYPE_CONFIG = {
    verlopen_factuur: { icon: Receipt, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    verlopen_offerte: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    achterstallig_follow_up: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    deadline_vandaag: { icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 shadow-sm">
              <Zap className="h-4 w-4 text-red-500" />
            </div>
            Actie vereist
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="space-y-1.5">
          {items.slice(0, 5).map((item) => {
            const config = TYPE_CONFIG[item.type]
            const Icon = config.icon
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => navigate(item.link)}
              >
                <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${config.bg} flex-shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                {item.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(item.action!.path)
                    }}
                  >
                    {item.action.label}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {items.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            +{items.length - 5} meer
          </p>
        )}
      </CardContent>
    </Card>
  )
}
