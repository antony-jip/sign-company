import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Clock } from 'lucide-react'
import { getOffertes, getFacturen } from '@/services/supabaseService'
import type { Offerte, Factuur } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface ActivityItem {
  id: string
  type: 'offerte' | 'factuur'
  color: string
  text: React.ReactNode
  time: string
  sortDate: Date
  link: string
}

export function RecenteActiviteitWidget() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getOffertes().catch(() => []), getFacturen().catch(() => [])])
      .then(([offertes, facturen]: [Offerte[], Factuur[]]) => {
        if (cancelled) return
        const activities: ActivityItem[] = []

        // Goedgekeurde offertes
        offertes
          .filter(o => o.status === 'goedgekeurd' && o.akkoord_op)
          .forEach(o => {
            activities.push({
              id: `off-gk-${o.id}`,
              type: 'offerte',
              color: 'bg-petrol',
              text: <>Offerte <strong>{o.nummer}</strong> goedgekeurd — {o.klant_naam || 'Onbekend'}</>,
              time: formatDistanceToNow(new Date(o.akkoord_op!), { addSuffix: true, locale: nl }),
              sortDate: new Date(o.akkoord_op!),
              link: `/offertes/${o.id}`,
            })
          })

        // Verzonden offertes
        offertes
          .filter(o => o.status === 'verzonden' && o.verstuurd_op)
          .forEach(o => {
            activities.push({
              id: `off-vz-${o.id}`,
              type: 'offerte',
              color: 'bg-mod-klanten',
              text: <>Offerte <strong>{o.nummer}</strong> verstuurd — {o.klant_naam || 'Onbekend'}</>,
              time: formatDistanceToNow(new Date(o.verstuurd_op!), { addSuffix: true, locale: nl }),
              sortDate: new Date(o.verstuurd_op!),
              link: `/offertes/${o.id}`,
            })
          })

        // Betaalde facturen
        facturen
          .filter(f => f.status === 'betaald' && f.betaaldatum)
          .forEach(f => {
            activities.push({
              id: `fac-bt-${f.id}`,
              type: 'factuur',
              color: 'bg-mod-facturen',
              text: <>Factuur <strong>{f.nummer}</strong> betaald — {formatCurrency(f.totaal)}</>,
              time: formatDistanceToNow(new Date(f.betaaldatum!), { addSuffix: true, locale: nl }),
              sortDate: new Date(f.betaaldatum!),
              link: `/facturen/${f.id}`,
            })
          })

        // Vervallen facturen
        const now = new Date()
        facturen
          .filter(f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now)
          .forEach(f => {
            const dagen = Math.floor((now.getTime() - new Date(f.vervaldatum).getTime()) / (1000 * 60 * 60 * 24))
            activities.push({
              id: `fac-vv-${f.id}`,
              type: 'factuur',
              color: 'bg-mod-offertes',
              text: <>Factuur <strong>{f.nummer}</strong> — {dagen} dag{dagen !== 1 ? 'en' : ''} verlopen</>,
              time: formatDistanceToNow(new Date(f.vervaldatum), { addSuffix: true, locale: nl }),
              sortDate: new Date(f.vervaldatum),
              link: `/facturen/${f.id}`,
            })
          })

        // Sort by most recent first, take top 5
        activities.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
        setItems(activities.slice(0, 5))
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl text-white" style={{ backgroundColor: '#3A5A9A' }}>
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-[14px] font-bold text-foreground">Recente activiteit</h3>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground/70">Nog geen activiteit</p>
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => navigate(item.link)}
                className={`flex items-start gap-3 py-3 cursor-pointer hover:bg-bg-hover hover:translate-x-0.5 -mx-2 px-2 rounded-lg transition-all duration-150 ${
                  idx > 0 ? 'border-t border-border/50' : ''
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-[7px] flex-shrink-0 ${item.color} ring-4 ring-background`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground font-medium">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
