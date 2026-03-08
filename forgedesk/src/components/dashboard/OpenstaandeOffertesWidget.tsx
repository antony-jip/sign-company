import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { getOffertes } from '@/services/supabaseService'
import type { Offerte } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  concept: { label: 'Concept', color: 'text-[var(--color-cream-text)]' },
  verzonden: { label: 'Verstuurd', color: 'text-[var(--color-mist-text)]' },
  bekeken: { label: 'Bekeken', color: 'text-[var(--color-cream-text)]' },
  goedgekeurd: { label: 'Goedgekeurd', color: 'text-[var(--color-sage-text)]' },
}

export function OpenstaandeOffertesWidget() {
  const navigate = useNavigate()
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getOffertes()
      .then((data) => {
        if (!cancelled) {
          const open = data
            .filter(o => ['concept', 'verzonden', 'bekeken', 'goedgekeurd'].includes(o.status))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
          setOffertes(open)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <Card className="border border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Openstaande offertes</h3>
          <span
            onClick={() => navigate('/offertes')}
            className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            Offertes →
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : offertes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Geen openstaande offertes</p>
        ) : (
          <div className="space-y-0">
            {offertes.map((offerte, idx) => {
              const statusInfo = STATUS_LABELS[offerte.status] || { label: offerte.status, color: 'text-muted-foreground' }
              const barColors: Record<string, string> = {
                concept: 'bg-[var(--color-cream)]',
                verzonden: 'bg-[var(--color-mist)]',
                bekeken: 'bg-[var(--color-cream)]',
                goedgekeurd: 'bg-[var(--color-sage)]',
              }
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}`)}
                  className={`flex items-center gap-2.5 py-2.5 cursor-pointer hover:translate-x-0.5 transition-transform ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <div className={`w-1 h-9 rounded-sm flex-shrink-0 ${barColors[offerte.status] || 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{offerte.titel}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      {offerte.klant_naam || 'Onbekend'} · {formatCurrency(offerte.totaal)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
