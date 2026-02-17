import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Loader2 } from 'lucide-react'
import { getOffertes, updateOfferte, deleteOfferte } from '@/services/supabaseService'
import type { Offerte } from '@/types'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'

const statusColumns = [
  { key: 'concept', label: 'Concept', color: 'bg-gray-50 dark:bg-gray-900' },
  { key: 'verzonden', label: 'Verzonden', color: 'bg-blue-50 dark:bg-blue-950' },
  { key: 'bekeken', label: 'Bekeken', color: 'bg-purple-50 dark:bg-purple-950' },
  { key: 'goedgekeurd', label: 'Goedgekeurd', color: 'bg-green-50 dark:bg-green-950' },
  { key: 'afgewezen', label: 'Afgewezen', color: 'bg-red-50 dark:bg-red-950' },
]

const headerAccentColors: Record<string, string> = {
  concept: 'border-gray-300 dark:border-gray-600',
  verzonden: 'border-blue-400 dark:border-blue-500',
  bekeken: 'border-purple-400 dark:border-purple-500',
  goedgekeurd: 'border-green-400 dark:border-green-500',
  afgewezen: 'border-red-400 dark:border-red-500',
}

export function QuotesPipeline() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOffertes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getOffertes()
      setOffertes(data)
    } catch (err) {
      console.error('Fout bij ophalen offertes:', err)
      setError('Kan offertes niet laden. Probeer opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOffertes()
  }, [loadOffertes])

  const handleStatusChange = useCallback(async (offerteId: string, newStatus: Offerte['status']) => {
    try {
      const updated = await updateOfferte(offerteId, { status: newStatus })
      setOffertes((prev) =>
        prev.map((o) => (o.id === offerteId ? { ...o, ...updated } : o))
      )
    } catch (err) {
      console.error('Fout bij bijwerken offerte status:', err)
    }
  }, [])

  // Group offertes by status
  const offertesByStatus = statusColumns.reduce(
    (acc, col) => {
      acc[col.key] = offertes.filter((o) => o.status === col.key)
      return acc
    },
    {} as Record<string, Offerte[]>
  )

  // Summary stats
  const summaryStats = statusColumns.map((col) => {
    const colOffertes = offertesByStatus[col.key]
    return {
      label: col.label,
      count: colOffertes.length,
      totaal: colOffertes.reduce((sum, o) => sum + o.totaal, 0),
    }
  })

  const totaalAlleOffertes = offertes.reduce((sum, o) => sum + o.totaal, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Offertes laden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" onClick={loadOffertes}>
            Opnieuw proberen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offertes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {offertes.length > 0
              ? `${offertes.length} offertes | Totaalwaarde: ${formatCurrency(totaalAlleOffertes)}`
              : 'Maak uw eerste offerte aan om de pipeline te vullen'}
          </p>
        </div>
        <Link to="/offertes/nieuw">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Offerte
          </Button>
        </Link>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {statusColumns.map((col) => {
          const colOffertes = offertesByStatus[col.key]
          const colTotaal = colOffertes.reduce((sum, o) => sum + o.totaal, 0)

          return (
            <div
              key={col.key}
              className={`${col.color} rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col`}
            >
              {/* Column Header */}
              <div
                className={`px-4 py-3 border-b-2 ${headerAccentColors[col.key]} rounded-t-xl`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {col.label}
                  </h3>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {colOffertes.length}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {formatCurrency(colTotaal)}
                </p>
              </div>

              {/* Column Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {colOffertes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Geen offertes
                    </p>
                  </div>
                )}

                {colOffertes.map((offerte) => (
                  <Link
                    key={offerte.id}
                    to={`/offertes/${offerte.id}`}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer border-gray-200 dark:border-gray-700">
                      <CardContent className="p-3 space-y-2">
                        {/* Nummer */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {offerte.nummer}
                          </span>
                        </div>

                        {/* Klant */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {offerte.klant_naam || 'Onbekende klant'}
                        </p>

                        {/* Titel */}
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2">
                          {offerte.titel}
                        </p>

                        {/* Bedrag & Datum */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(offerte.totaal)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(offerte.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.count}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {formatCurrency(stat.totaal)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Totaal alle offertes
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(totaalAlleOffertes)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
