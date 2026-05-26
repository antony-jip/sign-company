import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Wrench, CheckSquare, CalendarDays, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'
import { cn } from '@/lib/utils'
import type { Taak, MontageAfspraak, CalendarEvent, Klant, Project, Medewerker } from '@/types'

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
}

function isToday(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
}

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
  const { taken, montages, events, klanten, projecten, medewerkers } = useDashboardData()

  const currentMedewerker = useMemo(
    () => medewerkers.find(m => m.user_id === user?.id) ?? null,
    [medewerkers, user?.id],
  )

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
      .filter(m => isToday(m.datum) && m.status !== 'afgerond' && matchesSelf(m.monteurs))
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
      .filter(t => isToday(t.deadline) && t.status !== 'klaar' && matchesSelfSingle(t.toegewezen_aan))
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
        }
      })

    const eventItems: VandaagItem[] = events
      .filter(e => isToday(e.start_datum) && matchesSelf(e.deelnemers))
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
  }, [taken, montages, events, klanten, projecten, medewerkers, currentMedewerker])

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
      className="rounded-xl p-6 sm:p-7 bg-card border border-border/50"
      style={{
        backgroundImage: 'radial-gradient(ellipse 65% 50% at 0% 0%, rgba(26,83,92,0.06), transparent 70%), radial-gradient(ellipse 85% 65% at 100% 100%, rgba(241,80,37,0.06), transparent 65%)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-heading text-[14px] font-bold text-foreground">
            Vandaag<span className="text-[#F15025]">.</span>
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

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">Niets ingepland voor vandaag.</p>
      ) : (
        <ul className="-mx-2">
          {items.map(item => {
            const typeStyle = TYPE_STYLES[item.type]
            const TypeIcon = typeStyle.icon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="group relative w-full flex items-center gap-3 sm:gap-3.5 py-2 px-3 rounded-lg text-left transition-colors focus-visible:outline-none"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = typeStyle.hoverBg
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                  onFocus={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = typeStyle.hoverBg
                  }}
                  onBlur={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(180deg, ${typeStyle.iconColor} 0%, ${typeStyle.iconColor}99 100%)` }}
                  />
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
                  <span
                    className={cn(
                      'font-mono text-[12px] w-10 flex-shrink-0 tabular-nums',
                      item.tijd ? 'text-foreground font-semibold' : 'text-transparent',
                    )}
                  >
                    {item.tijd ?? '00:00'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium text-foreground truncate leading-[1.25]">
                      {item.titel}
                    </span>
                    {item.context && (
                      <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-[2px]">
                        {item.context}
                      </span>
                    )}
                  </span>
                  <span className="w-[24px] flex-shrink-0 flex justify-center">
                    {item.toegewezenAan && (
                      <Avatar medewerker={item.toegewezenAan} medewerkers={medewerkers} />
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all flex-shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5 text-right">
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
