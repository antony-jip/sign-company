import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FolderKanban,
  Calendar,
  FileText,
  Filter,
} from 'lucide-react'
import { getActiviteiten } from '@/services/importService'
import { getProjectenByKlant, getOffertesByKlant } from '@/services/supabaseService'
import type { KlantActiviteit, Project, Offerte } from '@/types'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'

interface KlantHistorieTabProps {
  klantId: string
  klantNaam: string
}

interface TijdlijnItem {
  datum: string
  type: 'project' | 'offerte'
  omschrijving: string
  bedrag?: number
  status?: string
  bron: 'import' | 'live'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return dateStr
  }
}

function getStatusBadge(status?: string) {
  if (!status) return null
  const lower = status.toLowerCase()
  if (lower === 'akkoord') {
    return <Badge className="bg-[#E8F5EC] text-[#4A9960] dark:bg-[#162018] dark:text-[#6ACA80] text-[10px] px-1.5 py-0 border-0">Akkoord</Badge>
  }
  if (lower === 'in afwachting') {
    return <Badge className="bg-[#F8F0E0] text-[#B8883A] dark:bg-[#2A2418] dark:text-[#D4A85A] text-[10px] px-1.5 py-0 border-0">In afwachting</Badge>
  }
  if (lower === 'niet akkoord') {
    return <Badge className="bg-[#FAE8E6] text-[#C45B4F] dark:bg-[#2A1A18] dark:text-[#DA7B70] text-[10px] px-1.5 py-0 border-0">Niet akkoord</Badge>
  }
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>
}

export function KlantHistorieTab({ klantId, klantNaam }: KlantHistorieTabProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<TijdlijnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'alles' | 'project' | 'offerte'>('alles')

  useEffect(() => {
    setLoading(true)

    Promise.all([
      Promise.resolve(getActiviteiten(klantId)),
      getProjectenByKlant(klantId).catch(() => [] as Project[]),
      getOffertesByKlant(klantId).catch(() => [] as Offerte[]),
    ])
      .then(([activiteiten, projecten, offertes]) => {
        const results: TijdlijnItem[] = []

        // Imported activiteiten
        for (const a of activiteiten) {
          results.push({
            datum: a.datum,
            type: a.type,
            omschrijving: a.omschrijving,
            bedrag: a.bedrag,
            status: a.status,
            bron: 'import',
          })
        }

        // Live projects
        for (const p of projecten) {
          results.push({
            datum: p.created_at,
            type: 'project',
            omschrijving: p.naam,
            bedrag: p.budget || 0,
            bron: 'live',
          })
        }

        // Live offertes (goedgekeurd/gefactureerd)
        for (const o of offertes) {
          if (o.status === 'goedgekeurd' || o.status === 'gefactureerd') {
            results.push({
              datum: o.akkoord_op || o.created_at,
              type: 'offerte',
              omschrijving: o.titel || `Offerte #${o.nummer}`,
              bedrag: o.totaal || 0,
              status: 'Akkoord',
              bron: 'live',
            })
          }
        }

        // Sort newest first
        results.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
        setItems(results)
      })
      .catch(logger.error)
      .finally(() => setLoading(false))
  }, [klantId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-48 mx-auto" />
            <div className="h-3 bg-muted rounded w-32 mx-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FolderKanban className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Geen activiteiten</p>
          <p className="text-xs text-muted-foreground mt-1">
            Importeer historie via Klanten &gt; Importeren.
          </p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate('/klanten/importeren')}
          >
            Ga naar importeren
          </Button>
        </CardContent>
      </Card>
    )
  }

  const filteredItems = filter === 'alles' ? items : items.filter((i) => i.type === filter)

  return (
    <div className="space-y-4">
      {/* Filter knoppen */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(['alles', 'project', 'offerte'] as const).map((f) => {
          const labels = { alles: 'Alles', project: 'Projecten', offerte: 'Offertes' }
          const count = f === 'alles' ? items.length : items.filter((i) => i.type === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary/12 text-accent dark:bg-primary/20 dark:text-primary ring-1 ring-primary/25'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              {labels[f]} ({count})
            </button>
          )
        })}
      </div>

      {/* Tijdlijn tabel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-500" />
            Activiteiten ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Datum</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Omschrijving</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground">Bedrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredItems.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.datum)}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {item.type === 'project' ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-1.5 py-0">
                          Project
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] px-1.5 py-0">
                          Offerte
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium">{item.omschrijving}</td>
                    <td className="py-2 pr-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums whitespace-nowrap">
                      {item.bedrag && item.bedrag > 0 ? formatCurrency(item.bedrag) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
