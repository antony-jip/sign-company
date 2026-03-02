import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FolderKanban,
  FileText,
  TrendingUp,
  Calendar,
  User,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getKlantHistorie } from '@/services/importService'
import type { KlantHistorie } from '@/types'
import { logger } from '../../utils/logger'

interface KlantHistorieTabProps {
  klantId: string
  klantNaam: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function getOfferteStatusIcon(status: string) {
  const s = status.toLowerCase()
  if (s === 'akkoord' || s.includes('akkoord') && !s.includes('niet')) {
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
  }
  if (s === 'niet akkoord' || s.includes('niet')) {
    return <XCircle className="w-3.5 h-3.5 text-red-500" />
  }
  return <Clock className="w-3.5 h-3.5 text-amber-500" />
}

function getOfferteStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s === 'akkoord' || s.includes('akkoord') && !s.includes('niet')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  }
  if (s === 'niet akkoord' || s.includes('niet')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
}

export function KlantHistorieTab({ klantId, klantNaam }: KlantHistorieTabProps) {
  const [historie, setHistorie] = useState<KlantHistorie | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getKlantHistorie(klantId)
      .then(setHistorie)
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

  if (!historie) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Geen historie beschikbaar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Importeer eerst de historie via Klanten &gt; Import &gt; Historie CSV
          </p>
        </CardContent>
      </Card>
    )
  }

  const totaalOfferteWaarde = historie.offertes.reduce((sum, o) => sum + o.waarde, 0)
  const totaalProjectWaarde = historie.projecten.reduce((sum, p) => sum + (p.waarde || 0), 0)
  const akkoordOffertes = historie.offertes.filter((o) => {
    const s = o.status.toLowerCase()
    return s === 'akkoord' || (s.includes('akkoord') && !s.includes('niet'))
  })
  const akkoordWaarde = akkoordOffertes.reduce((sum, o) => sum + o.waarde, 0)

  return (
    <div className="space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Projecten</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{historie.projecten.length}</p>
            {totaalProjectWaarde > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totaalProjectWaarde)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Offertes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{historie.offertes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Conversie</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {historie.conversie_percentage != null ? `${historie.conversie_percentage}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Akkoord waarde</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(akkoordWaarde)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Specialisaties */}
      {historie.specialisaties.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Specialisaties:</span>
          {historie.specialisaties.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs capitalize">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Projecten lijst */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-500" />
            Projecthistorie ({historie.projecten.length})
            {totaalProjectWaarde > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Totaal: {formatCurrency(totaalProjectWaarde)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {historie.projecten.length > 0 ? (
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Datum</th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Project</th>
                    <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Waarde</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Projectmanager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historie.projecten.map((p, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {p.datum}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium">{p.naam}</td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {p.waarde ? formatCurrency(p.waarde) : '—'}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {p.projectmanager ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {p.projectmanager}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Geen projecten in historie</p>
          )}
        </CardContent>
      </Card>

      {/* Offertes lijst */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Offertehistorie ({historie.offertes.length})
            {totaalOfferteWaarde > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Totaal: {formatCurrency(totaalOfferteWaarde)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {historie.offertes.length > 0 ? (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">Datum</th>
                    <th className="text-right py-2 pr-3 text-xs font-medium text-muted-foreground">Waarde</th>
                    <th className="text-left py-2 pr-3 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historie.offertes.map((o, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          {getOfferteStatusIcon(o.status)}
                          <Badge className={cn('text-[10px] px-1.5 py-0', getOfferteStatusColor(o.status))}>
                            {o.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{o.datum}</td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(o.waarde)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">#{o.nummer}</td>
                      <td className="py-2 truncate max-w-[200px]">{o.omschrijving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Geen offertes in historie</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
