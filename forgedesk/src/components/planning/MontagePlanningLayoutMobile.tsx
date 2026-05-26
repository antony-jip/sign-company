import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Paperclip,
  ClipboardList,
  CalendarCheck,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/utils/authHelpers'

const PLANNING_FILTER_KEY = 'doen_planning_filter_v1'
import {
  getMontageAfspraken,
  getMedewerkers,
  getKlanten,
  updateMontageAfspraak,
} from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Klant, Medewerker, MontageAfspraak } from '@/types'

const STATUS_CONFIG: Record<
  MontageAfspraak['status'],
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  gepland: { label: 'Gepland', text: '#3A5A9A', bg: '#E8EEF9', border: '#C5D5EA', dot: '#4A7AC7' },
  onderweg: { label: 'Onderweg', text: '#8A6A2A', bg: '#F5F2E8', border: '#E5DCC8', dot: '#C49A30' },
  bezig: { label: 'Bezig', text: '#3A7D52', bg: '#E8F2EC', border: '#C5E0D0', dot: '#4AA366' },
  afgerond: { label: 'Afgerond', text: '#1A535C', bg: '#E2F0F0', border: '#C0DDDD', dot: '#2A8A8A' },
  uitgesteld: { label: 'Uitgesteld', text: '#C03A18', bg: '#FDE8E2', border: '#F0C8BC', dot: '#E04A28' },
}

const STATUS_ORDER: MontageAfspraak['status'][] = ['gepland', 'onderweg', 'bezig', 'afgerond', 'uitgesteld']

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatFullWeekdayDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(naam: string): string {
  return naam.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function mapsUrl(locatie: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locatie)}`
}

interface MontageCardProps {
  afspraak: MontageAfspraak
  klant: Klant | undefined
  monteurs: Medewerker[]
  showMonteurs: boolean
  expanded: boolean
  onToggleExpand: () => void
  canEdit: boolean
  onStatusChange: (status: MontageAfspraak['status']) => void
}

function MontageCard({
  afspraak,
  klant,
  monteurs,
  showMonteurs,
  expanded,
  onToggleExpand,
  canEdit,
  onStatusChange,
}: MontageCardProps) {
  const cfg = STATUS_CONFIG[afspraak.status]
  const telefoon = klant?.telefoon
  const heeftBijlagen = (afspraak.bijlagen?.length ?? 0) > 0

  return (
    <article className="bg-white rounded-2xl mx-4 mb-3 ring-1 ring-[#EBEBEB] overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-left p-4 active:bg-background transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[13px] font-medium text-foreground tabular-nums">
            {afspraak.start_tijd}–{afspraak.eind_tijd}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: cfg.text, backgroundColor: cfg.bg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
            {cfg.label}
          </span>
        </div>
        <h3 className="text-[16px] font-semibold text-foreground leading-snug">{afspraak.titel}</h3>
        {afspraak.klant_naam && (
          <p className="mt-0.5 text-[13px] text-foreground/70">{afspraak.klant_naam}</p>
        )}

        {(afspraak.locatie || telefoon) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {afspraak.locatie && (
              <a
                href={mapsUrl(afspraak.locatie)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-[#1A535C] hover:bg-muted active:scale-95 transition-all max-w-full"
              >
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{afspraak.locatie}</span>
              </a>
            )}
            {telefoon && (
              <a
                href={`tel:${telefoon}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-[#1A535C] hover:bg-muted active:scale-95 transition-all"
              >
                <Phone className="h-3 w-3 flex-shrink-0" />
                {telefoon}
              </a>
            )}
          </div>
        )}

        {showMonteurs && monteurs.length > 0 && (
          <div className="mt-3 flex items-center gap-1">
            {monteurs.map((m) => (
              <span
                key={m.id}
                title={m.naam}
                className="w-6 h-6 rounded-full bg-[#1A535C]/10 text-[#1A535C] text-[10px] font-bold flex items-center justify-center"
              >
                {getInitials(m.naam)}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 -mt-1 space-y-3">
          {afspraak.beschrijving && (
            <p className="text-[13px] text-[#4A4A45] leading-relaxed whitespace-pre-wrap">
              {afspraak.beschrijving}
            </p>
          )}

          {(heeftBijlagen || afspraak.werkbon_id || afspraak.project_id) && (
            <div className="flex flex-wrap gap-2">
              {afspraak.bijlagen?.map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-[#1A535C] hover:bg-muted active:scale-95 transition-all max-w-full"
                >
                  <Paperclip className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{b.naam}</span>
                </a>
              ))}
              {afspraak.werkbon_id && (
                <a
                  href={`/werkbonnen/${afspraak.werkbon_id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1A535C]/[0.07] px-2.5 py-1 text-[12px] font-medium text-[#1A535C] hover:bg-[#1A535C]/[0.12] transition-colors"
                >
                  <ClipboardList className="h-3 w-3" />
                  {afspraak.werkbon_nummer || 'Werkbon'}
                </a>
              )}
              {afspraak.project_id && (
                <a
                  href={`/projecten/${afspraak.project_id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1A535C]/[0.07] px-2.5 py-1 text-[12px] font-medium text-[#1A535C] hover:bg-[#1A535C]/[0.12] transition-colors"
                >
                  Open project
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <div className="flex flex-nowrap gap-1.5 overflow-x-auto -mx-4 px-4 pt-1">
            {STATUS_ORDER.map((s) => {
              const sCfg = STATUS_CONFIG[s]
              const isActive = afspraak.status === s
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!canEdit || isActive}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    'flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'cursor-default'
                      : canEdit
                        ? 'bg-muted text-foreground/70 hover:bg-muted active:scale-95'
                        : 'bg-background text-muted-foreground/80 cursor-not-allowed',
                  )}
                  style={isActive ? { color: sCfg.text, backgroundColor: sCfg.bg } : undefined}
                >
                  {sCfg.label}
                </button>
              )
            })}
          </div>

          {!canEdit && (
            <p className="text-[11px] text-muted-foreground italic">Alleen te wijzigen door toegewezen monteur.</p>
          )}
        </div>
      )}
    </article>
  )
}

export function MontagePlanningLayoutMobile() {
  const { user } = useAuth()
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [scope, setScopeState] = useState<'mijn' | 'iedereen'>(() => {
    try {
      const raw = localStorage.getItem(PLANNING_FILTER_KEY)
      return raw ? 'mijn' : 'iedereen'
    } catch (err) { return 'iedereen' }
  })
  const [filterInitialized, setFilterInitialized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PLANNING_FILTER_KEY) !== null
    } catch (err) { return false }
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMontageAfspraken(), getMedewerkers(), getKlanten()])
      .then(([a, m, k]) => { setAfspraken(a); setMedewerkers(m); setKlanten(k) })
      .catch((err) => {
        logger.error('MontagePlanningLayoutMobile load failed', err)
        toast.error('Kon planning niet laden')
      })
      .finally(() => setLoading(false))
  }, [])

  const currentMedewerker = useMemo(() => {
    if (!user) return null
    return medewerkers.find((m) => m.user_id === user.id)
      || medewerkers.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      || null
  }, [medewerkers, user])

  const setScope = useCallback((value: 'mijn' | 'iedereen') => {
    setScopeState(value)
    setFilterInitialized(true)
    try {
      if (value === 'iedereen') {
        localStorage.removeItem(PLANNING_FILTER_KEY)
      } else if (currentMedewerker) {
        localStorage.setItem(PLANNING_FILTER_KEY, currentMedewerker.id)
      }
    } catch (err) { /* ignore */ }
  }, [currentMedewerker])

  // Auto-default scope: monteur ziet eigen dag bij eerste bezoek
  useEffect(() => {
    if (filterInitialized) return
    if (!currentMedewerker) return
    if (currentMedewerker.rol !== 'monteur') return
    if (isAdminUser(currentMedewerker, user)) return
    setScopeState('mijn')
    setFilterInitialized(true)
    try {
      localStorage.setItem(PLANNING_FILTER_KEY, currentMedewerker.id)
    } catch (err) { /* ignore */ }
  }, [filterInitialized, currentMedewerker, user])

  const klantById = useMemo(() => new Map(klanten.map((k) => [k.id, k])), [klanten])
  const medewerkerById = useMemo(() => new Map(medewerkers.map((m) => [m.id, m])), [medewerkers])

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()
  const dateStr = toDateStr(selectedDate)

  const afsprakenForDay = useMemo(() => {
    return afspraken
      .filter((a) => a.datum === dateStr)
      .filter((a) => scope === 'iedereen' || a.monteurs.includes(currentMedewerker?.id ?? ''))
      .sort((a, b) => a.start_tijd.localeCompare(b.start_tijd))
  }, [afspraken, dateStr, scope, currentMedewerker])

  const { toegewezen, ongetoewezen } = useMemo(() => {
    if (scope === 'mijn') return { toegewezen: afsprakenForDay, ongetoewezen: [] as MontageAfspraak[] }
    return {
      toegewezen: afsprakenForDay.filter((a) => a.monteurs.length > 0),
      ongetoewezen: afsprakenForDay.filter((a) => a.monteurs.length === 0),
    }
  }, [afsprakenForDay, scope])

  function canEditAfspraak(afspraak: MontageAfspraak): boolean {
    if (!currentMedewerker) return true
    if (currentMedewerker.rol !== 'monteur') return true
    return afspraak.monteurs.includes(currentMedewerker.id)
  }

  async function handleStatusChange(afspraak: MontageAfspraak, newStatus: MontageAfspraak['status']) {
    setAfspraken((prev) => prev.map((x) => (x.id === afspraak.id ? { ...x, status: newStatus } : x)))
    try {
      await updateMontageAfspraak(afspraak.id, { status: newStatus })
      toast.success(`Status: ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      logger.error('updateMontageAfspraak failed', err)
      toast.error('Kon status niet bijwerken')
      setAfspraken((prev) => prev.map((x) => (x.id === afspraak.id ? { ...x, status: afspraak.status } : x)))
    }
  }

  const renderCard = (a: MontageAfspraak) => (
    <MontageCard
      key={a.id}
      afspraak={a}
      klant={klantById.get(a.klant_id)}
      monteurs={a.monteurs.map((id) => medewerkerById.get(id)).filter((m): m is Medewerker => Boolean(m))}
      showMonteurs={scope === 'iedereen'}
      expanded={expandedId === a.id}
      onToggleExpand={() => setExpandedId((prev) => (prev === a.id ? null : a.id))}
      canEdit={canEditAfspraak(a)}
      onStatusChange={(s) => handleStatusChange(a, s)}
    />
  )

  return (
    <div className="h-full flex flex-col bg-background -m-3 sm:-m-4 md:-m-6">
      <header className="px-5 pt-5 pb-4 bg-white border-b border-border">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] leading-tight text-foreground">
          Planning<span className="text-[#F15025]">.</span>
        </h1>
        <p className="mt-1 text-[14px] text-foreground/70 capitalize">
          {formatFullWeekdayDate(selectedDate)}
        </p>
        {currentMedewerker && (
          <div className="mt-3 inline-flex h-8 p-0.5 rounded-full bg-muted" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'mijn'}
              onClick={() => setScope('mijn')}
              className={cn(
                'h-7 px-4 rounded-full text-[12px] font-medium transition-colors',
                scope === 'mijn'
                  ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-foreground/70',
              )}
            >
              Mijn dag
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'iedereen'}
              onClick={() => setScope('iedereen')}
              className={cn(
                'h-7 px-4 rounded-full text-[12px] font-medium transition-colors',
                scope === 'iedereen'
                  ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-foreground/70',
              )}
            >
              Iedereen
            </button>
          </div>
        )}
      </header>

      <div className="px-5 py-3 flex items-center gap-2 bg-white border-b border-border">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          aria-label="Vorige dag"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-muted text-foreground/70 hover:bg-muted hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="text-[12px] font-semibold uppercase tracking-wider text-[#1A535C] hover:text-[#0F3C44] transition-colors"
            >
              Vandaag
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          aria-label="Volgende dag"
          className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-muted text-foreground/70 hover:bg-muted hover:text-[#1A535C] active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : toegewezen.length === 0 && ongetoewezen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white border border-border flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <CalendarCheck className="h-9 w-9 text-muted-foreground/80" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-foreground/70">
              Geen montages voor {isToday ? 'vandaag' : 'deze dag'}<span className="text-[#F15025]">.</span>
            </p>
            {scope === 'mijn' && (
              <p className="mt-1.5 text-[13px] text-muted-foreground max-w-[260px] leading-relaxed">
                Wissel naar <span className="font-medium text-foreground/70">Iedereen</span> om alle montages te zien.
              </p>
            )}
          </div>
        ) : (
          <>
            {toegewezen.map(renderCard)}
            {ongetoewezen.length > 0 && (
              <>
                <h2 className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Niet toegewezen
                </h2>
                {ongetoewezen.map(renderCard)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
