import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Clock,
  MapPin,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  User,
  Paperclip,
  ClipboardCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMontageAfspraken, getMedewerkers } from '@/services/supabaseService'
import type { MontageAfspraak, Medewerker } from '@/types'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'

const STATUS_BADGE: Record<MontageAfspraak['status'], string> = {
  gepland: 'bg-[#E5ECF6] text-[#2A5580]',
  onderweg: 'bg-[#FDE8E2] text-[#C03A18]',
  bezig: 'bg-[#E4F0EA] text-[#2D6B48]',
  afgerond: 'bg-[#E2F0F0] text-[#1A535C]',
  uitgesteld: 'bg-[#FDE8E2] text-[#C03A18]',
}

const STATUS_LABEL: Record<MontageAfspraak['status'], string> = {
  gepland: 'Gepland',
  onderweg: 'Onderweg',
  bezig: 'Bezig',
  afgerond: 'Afgerond',
  uitgesteld: 'Uitgesteld',
}

const DAG_NAMEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function fmtDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function getInitials(naam: string): string {
  return naam.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-primary', 'bg-accent', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-[#4A442D]',
]

export function MontagePlanningWidget() {
  const navigate = useNavigate()
  const [montages, setMontages] = useState<MontageAfspraak[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedMonteur, setSelectedMonteur] = useState<string>('alle')

  useEffect(() => {
    let cancelled = false
    Promise.all([getMontageAfspraken(), getMedewerkers()])
      .then(([m, mw]) => {
        if (!cancelled) {
          setMontages(m)
          setMedewerkers(mw)
        }
      })
      .catch(logger.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const monday = useMemo(() => {
    const base = getMondayOfWeek(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])

  const weekDates = useMemo(() => getWeekDates(monday), [monday])

  const medewerkerMap = useMemo(
    () => new Map(medewerkers.map((m) => [m.id, m])),
    [medewerkers]
  )

  const monteurs = useMemo(
    () => medewerkers.filter((m) => m.rol === 'monteur' && m.status === 'actief'),
    [medewerkers]
  )

  const filteredMontages = useMemo(() => {
    if (selectedMonteur === 'alle') return montages
    return montages.filter((m) => m.monteurs.includes(selectedMonteur))
  }, [montages, selectedMonteur])

  const afsprakenPerDag = useMemo(() => {
    const map = new Map<string, MontageAfspraak[]>()
    weekDates.forEach((d) => map.set(fmtDate(d), []))
    filteredMontages.forEach((m) => {
      const key = m.datum
      if (map.has(key)) {
        map.get(key)!.push(m)
      }
    })
    // Sort by start_tijd within each day
    map.forEach((arr) => arr.sort((a, b) => (a.start_tijd || '').localeCompare(b.start_tijd || '')))
    return map
  }, [filteredMontages, weekDates])

  const weekTotal = useMemo(
    () => Array.from(afsprakenPerDag.values()).reduce((sum, arr) => sum + arr.length, 0),
    [afsprakenPerDag]
  )

  const weekLabel = `Week ${getWeekNumber(monday)}`

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #9A5A48, #B8725A)' }}>
              <Wrench className="h-4 w-4 text-white" />
            </div>
            Montageplanning
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
              onClick={() => setWeekOffset(0)}
            >
              {weekLabel}
            </button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-2xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 font-mono">
              {weekTotal}
            </span>
          </div>
        </div>

        {/* Monteur filter pills */}
        {!loading && monteurs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <button
              onClick={() => setSelectedMonteur('alle')}
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-full border transition-colors',
                selectedMonteur === 'alle'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              Iedereen
            </button>
            {monteurs.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedMonteur(selectedMonteur === m.id ? 'alle' : m.id)}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border transition-colors',
                  selectedMonteur === m.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white',
                  AVATAR_COLORS[idx % AVATAR_COLORS.length]
                )}>
                  {getInitials(m.naam)}
                </div>
                {m.naam.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : weekTotal === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(154, 90, 72, 0.1)' }}>
              <CalendarDays className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium text-foreground/70">Nog geen montages deze week</p>
            <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => navigate('/montage')}>
              Ga naar montageplanning
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {weekDates.map((date) => {
              const key = fmtDate(date)
              const dayMontages = afsprakenPerDag.get(key) || []
              const dayIdx = (date.getDay() + 6) % 7 // Monday = 0
              const today = isToday(date)

              if (dayMontages.length === 0) return null

              return (
                <div key={key}>
                  {/* Day header */}
                  <div className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg mt-1',
                    today && 'bg-primary/5'
                  )}>
                    <span className={cn(
                      'text-xs font-bold uppercase tracking-label w-6',
                      today ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {DAG_NAMEN[dayIdx]}
                    </span>
                    <span className={cn(
                      'text-xs',
                      today ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>
                      {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </span>
                    {today && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>

                  {/* Montage items */}
                  {dayMontages.map((montage) => (
                    <div
                      key={montage.id}
                      onClick={() => navigate('/montage')}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      {/* Status dot */}
                      <div className={cn(
                        'w-1.5 h-8 rounded-full flex-shrink-0',
                        montage.status === 'gepland' && 'bg-blue-400',
                        montage.status === 'onderweg' && 'bg-amber-400',
                        montage.status === 'bezig' && 'bg-green-400',
                        montage.status === 'afgerond' && 'bg-emerald-400',
                        montage.status === 'uitgesteld' && 'bg-red-400',
                      )} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {montage.titel}
                          </p>
                          <Badge className={cn('text-2xs capitalize flex-shrink-0', STATUS_BADGE[montage.status])}>
                            {STATUS_LABEL[montage.status]}
                          </Badge>
                          {montage.werkbon_id && (
                            <ClipboardCheck className="h-3 w-3 text-[#C44830] flex-shrink-0" title={montage.werkbon_nummer || 'Werkbon'} />
                          )}
                          {montage.bijlagen && montage.bijlagen.length > 0 && (
                            <Paperclip className="h-3 w-3 text-[#5A5A55] flex-shrink-0" title={`${montage.bijlagen.length} bijlage${montage.bijlagen.length !== 1 ? 'n' : ''}`} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {montage.locatie && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(montage.locatie)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary truncate flex items-center gap-0.5 hover:underline"
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              {montage.locatie}
                            </a>
                          )}
                          {montage.klant_naam && !montage.locatie && (
                            <span className="text-xs text-muted-foreground truncate">
                              {montage.klant_naam}
                            </span>
                          )}
                          {/* Monteur avatars */}
                          {montage.monteurs && montage.monteurs.length > 0 && (
                            <div className="flex items-center -space-x-1.5">
                              {montage.monteurs.slice(0, 3).map((mId, idx) => {
                                const mw = medewerkerMap.get(mId)
                                return (
                                  <div
                                    key={mId}
                                    className={cn(
                                      'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white dark:ring-border',
                                      AVATAR_COLORS[idx % AVATAR_COLORS.length]
                                    )}
                                    title={mw?.naam || mId}
                                  >
                                    {mw ? getInitials(mw.naam) : '?'}
                                  </div>
                                )
                              })}
                              {montage.monteurs.length > 3 && (
                                <span className="text-2xs text-muted-foreground ml-1">
                                  +{montage.monteurs.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {montage.start_tijd && (
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{montage.start_tijd}
                            {montage.eind_tijd && `–${montage.eind_tijd}`}</span>
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer link */}
        {weekTotal > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate('/montage')}
            >
              Volledige montageplanning bekijken
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
