import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Users,
  FileText,
  FolderKanban,
  Loader2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { getProjecten, getOffertes, getKlanten, getTaken } from '@/services/supabaseService'
import type { Project, Offerte, Klant, Taak } from '@/types'
import { logger } from '../../utils/logger'

interface AIInsight {
  id: string
  message: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  actionLabel: string
  href: string
}

export function AIInsightWidget() {
  const navigate = useNavigate()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [taken, setTaken] = useState<Taak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProjecten(), getOffertes(), getKlanten(), getTaken()])
      .then(([p, o, k, t]) => {
        if (!cancelled) {
          setProjecten(p)
          setOffertes(o)
          setKlanten(k)
          setTaken(t)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const insights = useMemo(() => {
    const items: AIInsight[] = []
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const expiringOffertes = offertes.filter((o) => {
      if (o.status === 'goedgekeurd' || o.status === 'afgewezen') return false
      const geldigTot = new Date(o.geldig_tot)
      return geldigTot <= sevenDaysFromNow && geldigTot >= now
    })
    if (expiringOffertes.length > 0) {
      items.push({
        id: 'expiring-quotes',
        message: `${expiringOffertes.length} offerte${expiringOffertes.length > 1 ? 's' : ''} verlo${expiringOffertes.length > 1 ? 'pen' : 'opt'} binnen 7 dagen`,
        icon: AlertTriangle,
        iconColor: 'text-[var(--color-cream-text)]',
        iconBg: 'bg-[var(--color-cream)]',
        actionLabel: 'Bekijk offertes',
        href: '/offertes',
      })
    }

    const overdueTaken = taken.filter((t) => {
      if (t.status === 'klaar') return false
      return new Date(t.deadline ?? "") < now
    })
    if (overdueTaken.length > 0) {
      items.push({
        id: 'overdue-tasks',
        message: `${overdueTaken.length} ta${overdueTaken.length > 1 ? 'ken' : 'ak'} ${overdueTaken.length > 1 ? 'zijn' : 'is'} verlopen en ${overdueTaken.length > 1 ? 'vereisen' : 'vereist'} actie`,
        icon: Clock,
        iconColor: 'text-[var(--color-coral-text)]',
        iconBg: 'bg-[var(--color-coral)]',
        actionLabel: 'Bekijk taken',
        href: '/taken',
      })
    }

    const nearDeadlineProjects = projecten.filter((p) => {
      if (p.status === 'afgerond') return false
      const deadline = new Date(p.eind_datum ?? "")
      return deadline <= sevenDaysFromNow && deadline >= now
    })
    if (nearDeadlineProjects.length > 0) {
      items.push({
        id: 'deadline-projects',
        message: `${nearDeadlineProjects.length} project${nearDeadlineProjects.length > 1 ? 'en naderen hun' : ' nadert zijn'} deadline`,
        icon: FolderKanban,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        actionLabel: 'Bekijk projecten',
        href: '/projecten',
      })
    }

    const completedProjects = projecten.filter((p) => p.status === 'afgerond')
    if (completedProjects.length > 0) {
      items.push({
        id: 'completed-projects',
        message: `${completedProjects.length} project${completedProjects.length > 1 ? 'en' : ''} succesvol afgerond`,
        icon: CheckCircle,
        iconColor: 'text-[var(--color-sage-text)]',
        iconBg: 'bg-[var(--color-sage)]',
        actionLabel: 'Bekijk projecten',
        href: '/projecten',
      })
    }

    if (klanten.length > 0) {
      const actieveKlanten = klanten.filter((k) => k.status === 'actief').length
      items.push({
        id: 'active-clients',
        message: `${actieveKlanten} actieve klant${actieveKlanten !== 1 ? 'en' : ''} in uw portfolio`,
        icon: Users,
        iconColor: 'text-[var(--color-sage-text)]',
        iconBg: 'bg-[var(--color-sage)]',
        actionLabel: 'Bekijk klanten',
        href: '/klanten',
      })
    }

    const pendingOffertes = offertes.filter((o) => o.status === 'verzonden' || o.status === 'bekeken')
    if (pendingOffertes.length > 0) {
      items.push({
        id: 'pending-quotes',
        message: `${pendingOffertes.length} offerte${pendingOffertes.length > 1 ? 's' : ''} wacht${pendingOffertes.length > 1 ? 'en' : ''} op reactie`,
        icon: FileText,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        actionLabel: 'Bekijk offertes',
        href: '/offertes',
      })
    }

    if (items.length === 0) {
      if (klanten.length === 0) {
        items.push({
          id: 'no-clients',
          message: 'Begin met het toevoegen van uw eerste klant',
          icon: Users,
          iconColor: 'text-primary',
          iconBg: 'bg-primary/10',
          actionLabel: 'Klanten beheren',
          href: '/klanten',
        })
      }
      if (projecten.length === 0) {
        items.push({
          id: 'no-projects',
          message: 'Maak uw eerste project aan om aan de slag te gaan',
          icon: FolderKanban,
          iconColor: 'text-[var(--color-sage-text)]',
          iconBg: 'bg-[var(--color-sage)]',
          actionLabel: 'Nieuw project',
          href: '/projecten/nieuw',
        })
      }
      if (offertes.length === 0) {
        items.push({
          id: 'no-quotes',
          message: 'Stel uw eerste offerte op voor een klant',
          icon: FileText,
          iconColor: 'text-primary',
          iconBg: 'bg-primary/10',
          actionLabel: 'Nieuwe offerte',
          href: '/offertes/nieuw',
        })
      }
    }

    return items.slice(0, 4)
  }, [projecten, offertes, klanten, taken])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-[#4A442D] to-accent shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span>AI Inzichten</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="flex gap-1">
              <div className="typing-dot w-2 h-2 rounded-full bg-primary/40" />
              <div className="typing-dot w-2 h-2 rounded-full bg-primary/40" />
              <div className="typing-dot w-2 h-2 rounded-full bg-primary/40" />
            </div>
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Geen inzichten beschikbaar
          </p>
        ) : (
          insights.map((insight) => {
            const Icon = insight.icon
            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3 rounded-xl p-3 ${insight.iconBg} transition-all duration-200 hover:scale-[1.01] cursor-pointer`}
                onClick={() => navigate(insight.href)}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className={`h-4.5 w-4.5 ${insight.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 leading-snug">
                    {insight.message}
                  </p>
                  <span className="text-xs font-medium text-primary mt-1 inline-flex items-center gap-1">
                    {insight.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
