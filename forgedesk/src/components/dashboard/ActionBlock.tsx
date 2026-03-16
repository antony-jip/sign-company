import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Clock,
  MapPin,
  Phone,
  FileText,
  ListTodo,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import {
  getMontageAfspraken,
  getOffertes,
  getFacturen,
  getTaken,
  getProjecten,
} from '@/services/supabaseService'
import type { MontageAfspraak, Offerte, Factuur, Taak, Project } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isToday, isBefore, parseISO, differenceInDays } from 'date-fns'
import { logger } from '../../utils/logger'

interface ActionItem {
  id: string
  type: 'montage' | 'nabellen' | 'factuur' | 'taak'
  title: string
  subtitle: string
  urgent: boolean
  link: string
  meta?: string
  time?: string
  location?: string
}

export function ActionBlock() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [montages, setMontages] = useState<MontageAfspraak[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getMontageAfspraken(),
      getOffertes(),
      getFacturen().catch(() => []),
      getTaken(),
      getProjecten(),
    ])
      .then(([m, o, f, t, p]) => {
        if (!cancelled) {
          setMontages(m)
          setOffertes(o)
          setFacturen(f)
          setTaken(t)
          setProjecten(p)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const actions = useMemo(() => {
    const items: ActionItem[] = []
    const now = new Date()
    const projectMap = new Map(projecten.map(p => [p.id, p.naam]))

    // 1. Montages vandaag
    montages
      .filter(m => m.status !== 'afgerond' && isToday(new Date(m.datum)))
      .sort((a, b) => (a.start_tijd || '').localeCompare(b.start_tijd || ''))
      .forEach(m => {
        items.push({
          id: `montage-${m.id}`,
          type: 'montage',
          title: m.titel,
          subtitle: m.klant_naam || projectMap.get(m.project_id) || '',
          urgent: true,
          link: '/montage',
          time: m.start_tijd ? `${m.start_tijd}${m.eind_tijd ? `–${m.eind_tijd}` : ''}` : undefined,
          location: m.locatie || undefined,
        })
      })

    // 2. Offertes nabellen (verzonden > 5 dagen geleden)
    offertes
      .filter(o => {
        if (o.status !== 'verzonden') return false
        const sentDate = o.verstuurd_op || o.created_at
        if (!sentDate) return false
        return differenceInDays(now, new Date(sentDate)) >= 5
      })
      .sort((a, b) => {
        const dateA = a.verstuurd_op || a.created_at || ''
        const dateB = b.verstuurd_op || b.created_at || ''
        return dateA.localeCompare(dateB)
      })
      .slice(0, 5)
      .forEach(o => {
        const sentDate = o.verstuurd_op || o.created_at
        const dagen = sentDate ? differenceInDays(now, new Date(sentDate)) : 0
        items.push({
          id: `nabellen-${o.id}`,
          type: 'nabellen',
          title: `${o.nummer} — ${o.klant_naam || o.titel}`,
          subtitle: `${dagen} dagen geleden verstuurd`,
          urgent: dagen >= 10,
          link: `/offertes/${o.id}`,
          meta: formatCurrency(o.totaal),
        })
      })

    // 3. Facturen die vandaag verlopen of al verlopen zijn
    facturen
      .filter(f => {
        if (f.status !== 'verzonden' && f.status !== 'vervallen') return false
        const verval = new Date(f.vervaldatum)
        return isToday(verval) || isBefore(verval, now)
      })
      .sort((a, b) => a.vervaldatum.localeCompare(b.vervaldatum))
      .slice(0, 5)
      .forEach(f => {
        const vervalDate = new Date(f.vervaldatum)
        const dagenVerlopen = differenceInDays(now, vervalDate)
        items.push({
          id: `factuur-${f.id}`,
          type: 'factuur',
          title: `${f.nummer} — ${f.klant_naam || f.titel}`,
          subtitle: dagenVerlopen === 0 ? 'Verloopt vandaag' : `${dagenVerlopen} dagen verlopen`,
          urgent: true,
          link: '/facturen',
          meta: formatCurrency(f.totaal - f.betaald_bedrag),
        })
      })

    // 4. Taken met deadline vandaag
    taken
      .filter(t => t.status !== 'klaar' && t.deadline && isToday(new Date(t.deadline)))
      .forEach(t => {
        items.push({
          id: `taak-${t.id}`,
          type: 'taak',
          title: t.titel,
          subtitle: (t.project_id && projectMap.get(t.project_id)) || 'Intern',
          urgent: t.prioriteit === 'kritiek' || t.prioriteit === 'hoog',
          link: t.project_id ? `/projecten/${t.project_id}` : '/taken',
        })
      })

    // Sort: urgent first, then montages (time-sensitive), then rest
    items.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
      const typeOrder: Record<string, number> = { montage: 0, factuur: 1, taak: 2, nabellen: 3 }
      return (typeOrder[a.type] ?? 4) - (typeOrder[b.type] ?? 4)
    })

    return items
  }, [montages, offertes, facturen, taken, projecten])

  const typeIcons: Record<string, React.ReactNode> = {
    montage: <Wrench className="h-4 w-4 text-orange-500" />,
    nabellen: <Phone className="h-4 w-4 text-blue-500" />,
    factuur: <FileText className="h-4 w-4 text-red-500" />,
    taak: <ListTodo className="h-4 w-4 text-primary" />,
  }

  const typeLabels: Record<string, string> = {
    montage: 'Montage',
    nabellen: 'Nabellen',
    factuur: 'Factuur',
    taak: 'Taak',
  }

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
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-wm-light shadow-md">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            Wat moet ik vandaag doen?
          </h3>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{actions.length}</span> {actions.length === 1 ? 'actie' : 'acties'}
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-foreground/70">Alles onder controle!</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Geen urgente acties voor vandaag</p>
          </div>
        ) : (
          <div className="space-y-1">
            {actions.map((action, idx) => (
              <div
                key={action.id}
                onClick={() => navigate(action.link)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group ${
                  idx === 0 ? 'bg-muted/30 border border-border/50' : ''
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {typeIcons[action.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-foreground truncate group-hover:text-primary transition-colors ${
                      idx === 0 ? 'text-sm' : 'text-sm'
                    }`}>
                      {action.title}
                    </p>
                    {action.urgent && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-destructive" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {action.subtitle}
                    </span>
                    {action.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-primary truncate flex items-center gap-0.5 hover:underline flex-shrink-0"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        Route
                      </a>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {action.time && (
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {action.time}
                    </span>
                  )}
                  {action.meta && (
                    <span className="text-xs font-semibold text-foreground font-mono">
                      {action.meta}
                    </span>
                  )}
                  <Badge className="text-2xs bg-muted text-muted-foreground border-0">
                    {typeLabels[action.type]}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
