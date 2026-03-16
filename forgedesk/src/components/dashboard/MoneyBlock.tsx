import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { getFacturen } from '@/services/supabaseService'
import type { Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, startOfMonth, endOfMonth } from 'date-fns'
import { logger } from '../../utils/logger'

export function MoneyBlock() {
  const navigate = useNavigate()
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getFacturen()
      .then(f => { if (!cancelled) setFacturen(f) })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const { openstaand, omzetDezeMaand, verlopenFacturen } = useMemo(() => {
    const now = new Date()
    const maandStart = startOfMonth(now)
    const maandEind = endOfMonth(now)

    // Openstaand te ontvangen (alle onbetaalde facturen)
    const onbetaald = facturen.filter(
      f => f.status === 'verzonden' || f.status === 'vervallen'
    )
    const openstaandBedrag = onbetaald.reduce(
      (sum, f) => sum + (f.totaal - f.betaald_bedrag),
      0
    )

    // Omzet deze maand (betaalde facturen deze maand)
    const betaaldDezeMaand = facturen.filter(f => {
      if (f.status !== 'betaald' || !f.betaaldatum) return false
      const d = new Date(f.betaaldatum)
      return d >= maandStart && d <= maandEind
    })
    const omzet = betaaldDezeMaand.reduce((sum, f) => sum + f.totaal, 0)

    // Verlopen facturen (vervaldatum < nu)
    const verlopen = facturen
      .filter(f => {
        if (f.status !== 'verzonden' && f.status !== 'vervallen') return false
        return new Date(f.vervaldatum) < now
      })
      .map(f => ({
        ...f,
        dagenVerlopen: differenceInDays(now, new Date(f.vervaldatum)),
        openstaandBedrag: f.totaal - f.betaald_bedrag,
      }))
      .sort((a, b) => b.dagenVerlopen - a.dagenVerlopen)

    return {
      openstaand: openstaandBedrag,
      omzetDezeMaand: omzet,
      verlopenFacturen: verlopen,
    }
  }, [facturen])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-48">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-md">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            Waar zit mijn geld?
          </h3>
        </div>

        {/* Two big numbers */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Openstaand */}
          <div
            className="stat-card-gradient-blush rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/facturen')}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a8680] dark:text-[#a0a0a0] mb-1">
              Openstaand
            </p>
            <p className="text-xl font-bold text-foreground font-mono leading-tight">
              {formatCurrency(openstaand)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              Te ontvangen
              <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </div>

          {/* Omzet deze maand */}
          <div
            className="stat-card-gradient-sage rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/facturen')}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8a8680] dark:text-[#a0a0a0] mb-1">
              Omzet deze maand
            </p>
            <p className="text-xl font-bold text-foreground font-mono leading-tight flex items-center gap-1.5">
              {formatCurrency(omzetDezeMaand)}
              <TrendingUp className="h-4 w-4 text-[#3A7D52] dark:text-[#7AAF85]" />
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              Betaald ontvangen
              <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </div>
        </div>

        {/* Verlopen facturen list */}
        {verlopenFacturen.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-destructive">
                Verlopen facturen
              </span>
              <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-mono">
                {verlopenFacturen.length}
              </span>
            </div>
            <div className="space-y-1">
              {verlopenFacturen.slice(0, 5).map(f => (
                <div
                  key={f.id}
                  onClick={() => navigate('/facturen')}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-destructive/5 transition-colors cursor-pointer group"
                >
                  <span className="text-[11px] font-bold text-destructive font-mono w-8 flex-shrink-0">
                    {f.dagenVerlopen}d
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate group-hover:text-destructive transition-colors">
                      {f.nummer} — {f.klant_naam || f.titel}
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold text-destructive font-mono flex-shrink-0">
                    {formatCurrency(f.openstaandBedrag)}
                  </span>
                </div>
              ))}
            </div>
            {verlopenFacturen.length > 5 && (
              <button
                onClick={() => navigate('/facturen')}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary mt-2 py-1"
              >
                +{verlopenFacturen.length - 5} meer →
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
