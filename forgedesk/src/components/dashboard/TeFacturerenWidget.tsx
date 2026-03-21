import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Receipt,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { getOffertes, getFacturen } from '@/services/supabaseService'
import { formatCurrency } from '@/lib/utils'
import type { Offerte, Factuur } from '@/types'
import { logger } from '../../utils/logger'

export function TeFacturerenWidget() {
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [allOffertes, allFacturen] = await Promise.all([
          getOffertes().catch(() => []),
          getFacturen().catch(() => []),
        ])
        if (cancelled) return

        const gefactuurdeOfferteIds = new Set(
          allFacturen
            .filter((f: Factuur) => f.offerte_id)
            .map((f: Factuur) => f.offerte_id)
        )
        const teFactureren = allOffertes
          .filter(
            (o: Offerte) =>
              o.status === 'goedgekeurd' && !gefactuurdeOfferteIds.has(o.id)
          )
          .sort((a: Offerte, b: Offerte) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setOffertes(teFactureren)
      } catch (err) {
        logger.error('TeFacturerenWidget load error:', err)
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
        <CardContent className="p-5 flex items-center justify-center h-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (offertes.length === 0) return null

  const totaalBedrag = offertes.reduce((sum, o) => sum + (o.totaal || 0), 0)

  return (
    <Card className="overflow-hidden border-emerald-200 dark:border-emerald-800/50">
      <CardContent className="p-0">
        {/* Header with total */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-white" />
              <h3 className="text-sm font-semibold text-white">Te factureren</h3>
              <Badge className="bg-white/20 text-white text-2xs px-1.5 py-0 border-0 font-mono">
                {offertes.length}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-white font-mono">{formatCurrency(totaalBedrag)}</p>
              <p className="text-2xs text-white/60">totaal excl BTW</p>
            </div>
          </div>
        </div>

        {/* List of offertes */}
        <div className="p-3 space-y-1">
          {offertes.slice(0, 5).map((offerte) => (
            <Link
              key={offerte.id}
              to={`/facturen/nieuw?offerte_id=${offerte.id}&klant_id=${offerte.klant_id}${offerte.titel ? `&titel=${encodeURIComponent(offerte.titel)}` : ''}${offerte.project_id ? `&project_id=${offerte.project_id}` : ''}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {offerte.titel || offerte.nummer}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {offerte.klant_naam || 'Klant'} &middot; {offerte.nummer}
                </p>
              </div>
              <span className="text-sm font-bold text-foreground flex-shrink-0">
                {formatCurrency(offerte.totaal)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          ))}
          {offertes.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{offertes.length - 5} meer offertes
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
