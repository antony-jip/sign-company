import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FolderKanban,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { getKlantHistorie } from '@/services/importService'
import { getProjectenByKlant, getOffertesByKlant } from '@/services/supabaseService'
import type { KlantHistorie, Project, Offerte } from '@/types'
import { logger } from '../../utils/logger'

interface KlantHistorieTabProps {
  klantId: string
  klantNaam: string
}

// Unified tijdlijn-item dat zowel geimporteerde als live data bevat
interface HistorieRegel {
  datum: string
  naam: string
  waarde: number
  bron: 'import' | 'project' | 'offerte'
  status?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return dateStr
  }
}

function getBronBadge(bron: HistorieRegel['bron'], status?: string) {
  if (bron === 'project') {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        Project
      </Badge>
    )
  }
  if (bron === 'offerte') {
    const label = status === 'gefactureerd' ? 'Gefactureerd' : status === 'goedgekeurd' ? 'Goedgekeurd' : status || 'Offerte'
    const color = status === 'gefactureerd'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    return (
      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${color}`}>
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      Import
    </Badge>
  )
}

export function KlantHistorieTab({ klantId, klantNaam }: KlantHistorieTabProps) {
  const [regels, setRegels] = useState<HistorieRegel[]>([])
  const [specialisaties, setSpecialisaties] = useState<string[]>([])
  const [conversiePercentage, setConversiePercentage] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    Promise.all([
      getKlantHistorie(klantId).catch(() => null),
      getProjectenByKlant(klantId).catch(() => [] as Project[]),
      getOffertesByKlant(klantId).catch(() => [] as Offerte[]),
    ])
      .then(([historie, projecten, offertes]) => {
        const items: HistorieRegel[] = []

        // 1. Geimporteerde projecten (James PRO)
        if (historie) {
          setSpecialisaties(historie.specialisaties)
          setConversiePercentage(historie.conversie_percentage)
          for (const p of historie.projecten) {
            items.push({
              datum: p.datum,
              naam: p.naam,
              waarde: p.waarde || 0,
              bron: 'import',
            })
          }
        }

        // 2. Live FORGEdesk projecten
        for (const p of projecten) {
          items.push({
            datum: p.created_at,
            naam: p.naam,
            waarde: p.budget || 0,
            bron: 'project',
            status: p.status,
          })
        }

        // 3. Live FORGEdesk offertes (alleen goedgekeurd of gefactureerd)
        for (const o of offertes) {
          if (o.status === 'goedgekeurd' || o.status === 'gefactureerd') {
            items.push({
              datum: o.akkoord_op || o.created_at,
              naam: o.titel || `Offerte #${o.nummer}`,
              waarde: o.totaal || 0,
              bron: 'offerte',
              status: o.status,
            })
          }
        }

        // Sorteer op datum (nieuwste eerst)
        items.sort((a, b) => {
          const da = a.datum || ''
          const db = b.datum || ''
          return db.localeCompare(da)
        })

        setRegels(items)
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

  if (regels.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Geen historie beschikbaar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Historie wordt automatisch bijgehouden wanneer offertes goedgekeurd of gefactureerd worden.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totaalWaarde = regels.reduce((sum, r) => sum + r.waarde, 0)
  const aantalProjecten = regels.filter((r) => r.bron === 'project' || r.bron === 'import').length
  const aantalGoedgekeurd = regels.filter((r) => r.bron === 'offerte').length

  return (
    <div className="space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Projecten</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{aantalProjecten}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Totale waarde</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {totaalWaarde > 0 ? formatCurrency(totaalWaarde) : '—'}
            </p>
          </CardContent>
        </Card>
        {aantalGoedgekeurd > 0 && (
          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Goedgekeurd / Betaald</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{aantalGoedgekeurd}</p>
            </CardContent>
          </Card>
        )}
        {conversiePercentage != null && (
          <Card className="border-gray-200 dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Conversie</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{conversiePercentage}%</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Specialisaties */}
      {specialisaties.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Specialisaties:</span>
          {specialisaties.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs capitalize">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Volledige historie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-500" />
            Volledige historie ({regels.length})
            {totaalWaarde > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Totaal: {formatCurrency(totaalWaarde)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Datum</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Omschrijving</th>
                  <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground">Waarde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {regels.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(r.datum)}
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-medium">{r.naam}</td>
                    <td className="py-2 pr-3">{getBronBadge(r.bron, r.status)}</td>
                    <td className="py-2 text-right font-medium tabular-nums whitespace-nowrap">
                      {r.waarde > 0 ? formatCurrency(r.waarde) : '—'}
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
