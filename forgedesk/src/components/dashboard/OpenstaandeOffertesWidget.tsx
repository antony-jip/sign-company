import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useDashboardData } from '@/contexts/DashboardDataContext'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  concept: { label: 'Concept', color: 'text-mod-taken-text' },
  verzonden: { label: 'Verstuurd', color: 'text-mod-klanten-text' },
  bekeken: { label: 'Bekeken', color: 'text-mod-taken-text' },
  goedgekeurd: { label: 'Goedgekeurd', color: 'text-mod-facturen-text' },
}

export function OpenstaandeOffertesWidget() {
  const navigate = useNavigate()
  const { offertes: allOffertes, isLoading: loading } = useDashboardData()

  const offertes = useMemo(() =>
    allOffertes
      .filter(o => ['concept', 'verzonden', 'bekeken', 'goedgekeurd'].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  , [allOffertes])

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl text-white" style={{ backgroundColor: '#F15025' }}>
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-[14px] font-bold text-foreground">Openstaande offertes</h3>
          </div>
          <span
            onClick={() => navigate('/offertes')}
            className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground cursor-pointer hover:text-[#1A535C] transition-colors"
          >
            Alles →
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : offertes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground/70">Nog geen openstaande offertes</p>
          </div>
        ) : (
          <div className="space-y-0">
            {offertes.map((offerte, idx) => {
              const statusInfo = STATUS_LABELS[offerte.status] || { label: offerte.status, color: 'text-muted-foreground' }
              const barColors: Record<string, string> = {
                concept: 'bg-mod-taken-light',
                verzonden: 'bg-mod-klanten-light',
                bekeken: 'bg-mod-taken-light',
                goedgekeurd: 'bg-mod-facturen-light',
              }
              return (
                <div
                  key={offerte.id}
                  onClick={() => navigate(`/offertes/${offerte.id}`)}
                  className={`flex items-center gap-3 py-3 cursor-pointer hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-all duration-150 ${
                    idx > 0 ? 'border-t border-border/50' : ''
                  }`}
                >
                  <div className={`w-1 h-9 rounded-sm flex-shrink-0 ${barColors[offerte.status] || 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{offerte.titel}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      {offerte.klant_naam || 'Onbekend'} · <span className="font-mono">{formatCurrency(offerte.totaal)}</span>
                    </p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${statusInfo.color}`}>
                    {statusInfo.label}<span style={{ color: '#F15025' }}>.</span>
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
