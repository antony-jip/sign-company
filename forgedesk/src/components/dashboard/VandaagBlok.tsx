import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowRightToLine, Plus, Wrench, X, CheckSquare, CalendarDays, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { createTaak, deleteTaak, updateTaak } from '@/services/supabaseService'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'
import { cn } from '@/lib/utils'
import type { Taak, MontageAfspraak, CalendarEvent, Klant, Project, Medewerker } from '@/types'

type TaakStatus = Taak['status']

type ItemType = 'montage' | 'taak' | 'event'

interface TypeStyle {
  icon: LucideIcon
  iconColor: string
  bg: string
  hoverBg: string
}

const TYPE_STYLES: Record<ItemType, TypeStyle> = {
  montage: {
    icon: Wrench,
    iconColor: '#F15025',
    bg: 'linear-gradient(135deg, #FDE8E4 0%, #FBD7CC 100%)',
    hoverBg: 'linear-gradient(90deg, rgba(241,80,37,0.04) 0%, rgba(241,80,37,0.00) 100%)',
  },
  taak: {
    icon: CheckSquare,
    iconColor: '#1A535C',
    bg: 'linear-gradient(135deg, rgba(26,83,92,0.07) 0%, rgba(26,83,92,0.14) 100%)',
    hoverBg: 'linear-gradient(90deg, rgba(26,83,92,0.04) 0%, rgba(26,83,92,0.00) 100%)',
  },
  event: {
    icon: CalendarDays,
    iconColor: '#8A7A4A',
    bg: 'linear-gradient(135deg, #F5F2E8 0%, #EDE6CE 100%)',
    hoverBg: 'linear-gradient(90deg, rgba(138,122,74,0.04) 0%, rgba(138,122,74,0.00) 100%)',
  },
}

interface VandaagItem {
  id: string
  type: ItemType
  tijd: string | null
  sortKey: number
  titel: string
  context: string
  toegewezenAan: Medewerker | null
  href: string
  /** Rauwe taak.id voor de "naar morgen"-sneltoets; alleen gevuld bij type=taak. */
  taakId?: string
  /** Huidige deadline van de taak (ISO) voor de undo-actie. */
  taakDeadline?: string
  /** Huidige status voor de toggle-complete undo. */
  taakStatus?: TaakStatus
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function isOnDate(dateStr: string | undefined | null, target: Date): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return isSameDay(d, target)
}

// Maandag van de week waar `d` in valt. Zondag wordt geteld als deel van
// de voorgaande week, conform NL-conventie.
function getMondayOfWeek(d: Date): Date {
  const day = d.getDay() // 0=zon, 1=ma, ..., 6=za
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return mon
}

const WEEKDAY_LABELS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr'] as const
const WEEKDAY_LABELS_FULL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'] as const

function timeFromMontage(m: MontageAfspraak): string | null {
  if (!m.start_tijd) return null
  return m.start_tijd.slice(0, 5)
}

function timeFromEvent(e: CalendarEvent): string | null {
  if (!e.start_datum) return null
  const d = new Date(e.start_datum)
  if (Number.isNaN(d.getTime())) return null
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  if (hours === '00' && mins === '00') return null
  return `${hours}:${mins}`
}

function sortKeyFromTime(tijd: string | null): number {
  if (!tijd) return 9999
  const [h, m] = tijd.split(':').map(Number)
  return h * 60 + m
}

function findMedewerker(idOrName: string | undefined | null, medewerkers: Medewerker[]): Medewerker | null {
  if (!idOrName) return null
  return medewerkers.find(m => m.id === idOrName || m.naam === idOrName) ?? null
}

function initialen(naam: string): string {
  return naam.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

function Avatar({ medewerker, medewerkers }: { medewerker: Medewerker; medewerkers: Medewerker[] }) {
  const idx = medewerkers.findIndex(m => m.id === medewerker.id)
  const style = getAvatarStyle(idx >= 0 ? idx : 0)
  return (
    <span
      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[10px] font-semibold flex-shrink-0"
      style={{ backgroundColor: style.backgroundColor, color: style.color }}
      title={medewerker.naam}
    >
      {initialen(medewerker.naam)}
    </span>
  )
}

export function VandaagBlok() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { taken, montages, events, klanten, projecten, medewerkers, refresh } = useDashboardData()

  // Afvinken als klaar: één-klik vanaf de checkbox-icoon links op een rij.
  // De rij verdwijnt direct (filter op status !== 'klaar' in `items`); 5s undo
  // herstelt de oorspronkelijke status (todo / in_progress / ...).
  const handleToggleComplete = useCallback(async (taakId: string, originalStatus: TaakStatus) => {
    try {
      await updateTaak(taakId, { status: 'klaar' })
      refresh()
      toast.success(<>Taak afgerond<span style={{ color: '#F15025' }}>.</span></>, {
        duration: 5000,
        action: {
          label: 'Ongedaan',
          onClick: async () => {
            try {
              await updateTaak(taakId, { status: originalStatus })
              refresh()
            } catch {
              toast.error('Kon niet ongedaan maken')
            }
          },
        },
      })
    } catch {
      toast.error('Kon taak niet bijwerken')
    }
  }, [refresh])

  // Verwijderen met 5s undo-buffer. De rij wordt direct verborgen (via
  // `pendingDeleteIds`) en pas na 5s daadwerkelijk uit Supabase gehaald.
  // Bij Ongedaan binnen 5s annuleren we de timer. Bij unmount flushen we
  // alle nog niet-bevestigde deletes alsnog, zodat "weg en terug navigeren"
  // niet onverwacht items terugbrengt.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set())
  const pendingDeleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  useEffect(() => {
    const timers = pendingDeleteTimersRef.current
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer)
        deleteTaak(id).catch(() => { /* best-effort flush bij unmount */ })
      })
      timers.clear()
    }
  }, [])
  const handleDelete = useCallback((taakId: string) => {
    setPendingDeleteIds(prev => {
      const next = new Set(prev)
      next.add(taakId)
      return next
    })
    const timer = setTimeout(async () => {
      pendingDeleteTimersRef.current.delete(taakId)
      try {
        await deleteTaak(taakId)
        refresh()
      } catch {
        toast.error('Kon taak niet verwijderen')
        setPendingDeleteIds(prev => {
          const next = new Set(prev)
          next.delete(taakId)
          return next
        })
      }
    }, 5000)
    pendingDeleteTimersRef.current.set(taakId, timer)
    toast.success(<>Taak verwijderd<span style={{ color: '#F15025' }}>.</span></>, {
      duration: 5000,
      action: {
        label: 'Ongedaan',
        onClick: () => {
          const existing = pendingDeleteTimersRef.current.get(taakId)
          if (existing) {
            clearTimeout(existing)
            pendingDeleteTimersRef.current.delete(taakId)
          }
          setPendingDeleteIds(prev => {
            const next = new Set(prev)
            next.delete(taakId)
            return next
          })
        },
      },
    })
  }, [refresh])

  // Sneltoets "naar morgen": optimistische server-update + 5s undo. We
  // bewaren de oorspronkelijke deadline lokaal zodat de undo-knop hem kan
  // herstellen. Daarna roepen we refresh() aan om de dashboard-state weer
  // synchroon te trekken — de rij verdwijnt dan vanzelf uit "Vandaag".
  const handleMoveToTomorrow = useCallback(async (taakId: string, originalDeadline: string | undefined) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    const tomorrowStr = `${yyyy}-${mm}-${dd}`
    const timePart = originalDeadline?.includes('T') ? originalDeadline.split('T')[1] : null
    const newDeadline = timePart ? `${tomorrowStr}T${timePart}` : tomorrowStr
    try {
      await updateTaak(taakId, { deadline: newDeadline })
      refresh()
      toast.success(<>Verplaatst naar morgen<span style={{ color: '#F15025' }}>.</span></>, {
        duration: 5000,
        action: originalDeadline
          ? {
              label: 'Ongedaan',
              onClick: async () => {
                try {
                  await updateTaak(taakId, { deadline: originalDeadline })
                  refresh()
                } catch {
                  toast.error('Kon niet ongedaan maken')
                }
              },
            }
          : undefined,
      })
    } catch {
      toast.error('Kon taak niet verplaatsen')
    }
  }, [refresh])

  const currentMedewerker = useMemo(
    () => medewerkers.find(m => m.user_id === user?.id) ?? null,
    [medewerkers, user?.id],
  )

  // Vijf weekdagen (ma-vr) + index van vandaag binnen die set. Wordt
  // éénmaal per mount gefixeerd — als de gebruiker tot na middernacht het
  // dashboard open laat staan blijft de selectie zinvol (de refresh-poll
  // herlaadt de items zelf).
  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(new Date())
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [])
  const todayIndex = useMemo(() => {
    const today = new Date()
    return weekDays.findIndex(d => isSameDay(d, today))
  }, [weekDays])
  // Default: vandaag is geselecteerd (of maandag als het weekend is).
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => todayIndex >= 0 ? todayIndex : 0)
  const selectedDay = weekDays[selectedDayIndex]

  // Quick-add: taak voor de geselecteerde dag, toegewezen aan jezelf,
  // standaard prioriteit. Geen audit-log voor deze snelle creatie — wie
  // het echt nodig heeft maakt 'm via de Taken-pagina aan met full form.
  const [quickAddInput, setQuickAddInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const handleQuickAdd = useCallback(async () => {
    const titel = quickAddInput.trim()
    if (!titel || !user?.id || isAdding) return
    const yyyy = selectedDay.getFullYear()
    const mm = String(selectedDay.getMonth() + 1).padStart(2, '0')
    const dd = String(selectedDay.getDate()).padStart(2, '0')
    const deadline = `${yyyy}-${mm}-${dd}`
    setIsAdding(true)
    try {
      await createTaak({
        user_id: user.id,
        titel,
        beschrijving: '',
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: currentMedewerker?.naam ?? '',
        deadline,
        geschatte_tijd: 0,
        bestede_tijd: 0,
        project_id: '',
      })
      setQuickAddInput('')
      refresh()
      toast.success(<>Taak aangemaakt<span style={{ color: '#F15025' }}>.</span></>)
    } catch {
      toast.error('Kon taak niet aanmaken')
    } finally {
      setIsAdding(false)
    }
  }, [quickAddInput, user?.id, isAdding, selectedDay, currentMedewerker, refresh])

  const items = useMemo<VandaagItem[]>(() => {
    const klantById = new Map<string, Klant>(klanten.map(k => [k.id, k]))
    const projectById = new Map<string, Project>(projecten.map(p => [p.id, p]))

    // Strict "alleen jouw planning" wanneer we de huidige medewerker kennen;
    // fallback naar iedereen voor admins die niet in de medewerkers-tabel staan.
    const matchesSelf = (people: string[] | undefined | null): boolean => {
      if (!currentMedewerker) return true
      if (!people || people.length === 0) return false
      return people.some(p => p === currentMedewerker.id || p === currentMedewerker.naam)
    }
    const matchesSelfSingle = (val: string | undefined | null): boolean => {
      if (!currentMedewerker) return true
      if (!val) return false
      return val === currentMedewerker.id || val === currentMedewerker.naam
    }

    const montageItems: VandaagItem[] = montages
      .filter(m => isOnDate(m.datum, selectedDay) && m.status !== 'afgerond' && matchesSelf(m.monteurs))
      .map(m => {
        const tijd = timeFromMontage(m)
        const locatie = m.locatie || m.klant_naam || ''
        return {
          id: `m-${m.id}`,
          type: 'montage' as const,
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: m.titel || m.project_naam || 'Montage',
          context: locatie,
          toegewezenAan: findMedewerker(m.monteurs?.[0], medewerkers),
          href: '/planning',
        }
      })

    const takenItems: VandaagItem[] = taken
      .filter(t => isOnDate(t.deadline, selectedDay) && t.status !== 'klaar' && !pendingDeleteIds.has(t.id) && matchesSelfSingle(t.toegewezen_aan))
      .map(t => {
        const klant = t.klant_id ? klantById.get(t.klant_id) : null
        const project = t.project_id ? projectById.get(t.project_id) : null
        const context = klant?.bedrijfsnaam || project?.naam || ''
        return {
          id: `t-${t.id}`,
          type: 'taak' as const,
          tijd: null,
          sortKey: 9999,
          titel: t.titel,
          context,
          toegewezenAan: findMedewerker(t.toegewezen_aan, medewerkers),
          href: t.project_id ? `/projecten/${t.project_id}` : '/taken',
          taakId: t.id,
          taakDeadline: t.deadline,
          taakStatus: t.status,
        }
      })

    const eventItems: VandaagItem[] = events
      .filter(e => isOnDate(e.start_datum, selectedDay) && matchesSelf(e.deelnemers))
      .map(e => {
        const tijd = timeFromEvent(e)
        return {
          id: `e-${e.id}`,
          type: 'event' as const,
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: e.titel,
          context: e.locatie || '',
          toegewezenAan: findMedewerker(e.deelnemers?.[0], medewerkers),
          href: '/planning',
        }
      })

    return [...montageItems, ...takenItems, ...eventItems].sort((a, b) => a.sortKey - b.sortKey)
  }, [taken, montages, events, klanten, projecten, medewerkers, currentMedewerker, selectedDay, pendingDeleteIds])

  const counts = useMemo(() => {
    const m = items.filter(i => i.type === 'montage').length
    const t = items.filter(i => i.type === 'taak').length
    const e = items.filter(i => i.type === 'event').length
    const parts: string[] = []
    if (m) parts.push(`${m} ${m === 1 ? 'montage' : 'montages'}`)
    if (t) parts.push(`${t} ${t === 1 ? 'taak' : 'taken'}`)
    if (e) parts.push(`${e} ${e === 1 ? 'afspraak' : 'afspraken'}`)
    return parts.join(' · ')
  }, [items])

  return (
    <section
      className="doen-panel rounded-xl p-6 sm:p-7"
      style={{
        backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-heading text-[14px] font-bold text-foreground">
            {selectedDayIndex === todayIndex ? 'Vandaag' : WEEKDAY_LABELS_FULL[selectedDayIndex]}
            <span className="text-[#F15025]">.</span>
          </h2>
          <span
            className="text-[14px] text-muted-foreground truncate"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            · wat staat er klaar
          </span>
        </div>
        {counts && (
          <span className="font-mono text-[12px] text-muted-foreground flex-shrink-0">
            {counts}
          </span>
        )}
      </header>

      {/* ── Dag-toggle: segmented control met sliding pill ── */}
      {/* De container krijgt een doorlopende petrol-gradient zodat elke dag
          op zijn eigen positie iets anders gekleurd is — links lichter,
          rechts dieper. De sliding pill bovenop blijft het focus-element. */}
      <div
        className="relative flex items-stretch mb-4 p-[2px] rounded-[10px] ring-1 ring-[#1A535C]/[0.08]"
        role="tablist"
        aria-label="Kies een dag"
        style={{
          background: 'linear-gradient(90deg, rgba(26,83,92,0.04) 0%, rgba(26,83,92,0.08) 35%, rgba(26,83,92,0.13) 70%, rgba(20,62,69,0.18) 100%)',
        }}
      >
        <div
          aria-hidden
          className="absolute top-[2px] bottom-[2px] rounded-[8px] transition-all duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            left: `calc((100% - 4px) / 5 * ${selectedDayIndex} + 2px)`,
            width: 'calc((100% - 4px) / 5)',
            background: 'linear-gradient(135deg, #246069 0%, #1A535C 55%, #143E45 100%)',
            boxShadow: '0 1px 2px rgba(20,62,71,0.28), 0 2px 5px rgba(20,62,71,0.06)',
          }}
        />
        {weekDays.map((d, i) => {
          const isToday = i === todayIndex
          const isSelected = i === selectedDayIndex
          const label = isToday ? 'Vandaag' : WEEKDAY_LABELS_SHORT[i]
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedDayIndex(i)}
              className={cn(
                'relative z-10 flex-1 min-w-0 px-1.5 py-1 rounded-[8px] text-[11.5px] font-semibold tracking-[-0.1px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30',
                isSelected
                  ? 'text-white'
                  : isToday
                    ? 'text-[#F15025] hover:text-[#C03A18]'
                    : 'text-muted-foreground hover:text-foreground',
              )}
              title={d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })}
            >
              {label}
            </button>
          )
        })}
      </div>

      {items.length === 0 ? (
        <p key={`empty-${selectedDayIndex}`} className="text-sm text-muted-foreground py-3 animate-fade-in">
          {selectedDayIndex === todayIndex
            ? 'Niets ingepland voor vandaag.'
            : `Niets ingepland voor ${WEEKDAY_LABELS_FULL[selectedDayIndex].toLowerCase()}.`}
        </p>
      ) : (
        <ul key={`items-${selectedDayIndex}`} className="-mx-2">
          {items.map((item, idx) => {
            const typeStyle = TYPE_STYLES[item.type]
            const TypeIcon = typeStyle.icon
            return (
              <li
                key={item.id}
                className="group relative animate-fade-in-up"
                style={{
                  ['--row-hover-bg' as string]: typeStyle.hoverBg,
                  animationDelay: `${idx * 35}ms`,
                  opacity: 0,
                } as React.CSSProperties}
              >
                <div
                  className="relative w-full flex items-center gap-3 sm:gap-3.5 py-2 px-3 rounded-lg transition-colors bg-transparent group-hover:bg-[var(--row-hover-bg)] group-focus-within:bg-[var(--row-hover-bg)]"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(180deg, ${typeStyle.iconColor} 0%, ${typeStyle.iconColor}99 100%)` }}
                  />
                  {item.type === 'taak' && item.taakId && item.taakStatus ? (
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item.taakId!, item.taakStatus!)}
                      title="Markeer als klaar"
                      aria-label={`Markeer "${item.titel}" als klaar`}
                      className="inline-flex items-center justify-center w-[30px] h-[30px] flex-shrink-0 transition-transform group-hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/35"
                      style={{
                        background: typeStyle.bg,
                        borderRadius: 9,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                    >
                      <TypeIcon className="h-[15px] w-[15px]" style={{ color: typeStyle.iconColor }} strokeWidth={2} />
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-[30px] h-[30px] flex-shrink-0 transition-transform group-hover:scale-[1.04]"
                      style={{
                        background: typeStyle.bg,
                        borderRadius: 9,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                      aria-hidden
                    >
                      <TypeIcon className="h-[15px] w-[15px]" style={{ color: typeStyle.iconColor }} strokeWidth={2} />
                    </span>
                  )}
                  <span
                    className={cn(
                      'font-mono text-[12px] w-10 flex-shrink-0 tabular-nums',
                      item.tijd ? 'text-foreground font-semibold' : 'text-transparent',
                    )}
                  >
                    {item.tijd ?? '00:00'}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    className="flex-1 min-w-0 text-left focus-visible:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#1A535C]/30"
                  >
                    <span className="block text-[13.5px] font-medium text-foreground truncate leading-[1.25]">
                      {item.titel}
                    </span>
                    {item.context && (
                      <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-[2px]">
                        {item.context}
                      </span>
                    )}
                  </button>
                  <span className="w-[24px] flex-shrink-0 flex justify-center">
                    {item.toegewezenAan && (
                      <Avatar medewerker={item.toegewezenAan} medewerkers={medewerkers} />
                    )}
                  </span>
                  {item.type !== 'taak' && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all flex-shrink-0" />
                  )}
                  {item.type === 'taak' && (
                    <span className="w-14 flex-shrink-0" aria-hidden />
                  )}
                </div>
                {item.type === 'taak' && item.taakId && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.taakId!)}
                      title="Verwijderen"
                      aria-label={`Verwijder "${item.titel}"`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-[#C03A18] hover:bg-[#C03A18]/10 focus-visible:text-[#C03A18] focus-visible:bg-[#C03A18]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C03A18]/30 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToTomorrow(item.taakId!, item.taakDeadline)}
                      title="Naar morgen"
                      aria-label={`Verplaats "${item.titel}" naar morgen`}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[#1A535C] hover:bg-[#1A535C]/10 focus-visible:bg-[#1A535C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/30 transition-colors"
                    >
                      <ArrowRightToLine className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Snelle taak toevoegen voor de geselecteerde dag ── */}
      <form
        onSubmit={(e) => { e.preventDefault(); void handleQuickAdd() }}
        className="mt-4"
      >
        <div className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card/50 hover:border-[#1A535C]/35 focus-within:border-[#1A535C] focus-within:bg-card focus-within:shadow-[0_0_0_3px_rgba(26,83,92,0.08)] transition-all">
          <Plus className="h-3.5 w-3.5 text-muted-foreground group-focus-within:text-[#1A535C] transition-colors flex-shrink-0" />
          <input
            type="text"
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.blur(); setQuickAddInput('') } }}
            placeholder={`Nieuwe taak voor ${selectedDayIndex === todayIndex ? 'vandaag' : WEEKDAY_LABELS_FULL[selectedDayIndex].toLowerCase()}…`}
            disabled={isAdding}
            className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            aria-label="Nieuwe taak toevoegen"
          />
          {quickAddInput.trim().length > 0 && (
            <kbd className="hidden sm:inline-flex items-center justify-center text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
              ↵
            </kbd>
          )}
        </div>
      </form>

      <div className="mt-4 text-right">
        <button
          type="button"
          onClick={() => navigate('/planning')}
          className="text-sm text-[#1A535C] hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Volledige planning →
        </button>
      </div>
    </section>
  )
}
