import { useState, useMemo } from 'react'
import {
  Send, FileText, Receipt, CreditCard, ClipboardCheck, Camera,
  CheckCircle2, Wrench, Eye, MessageCircle, FolderPlus, User,
  Filter
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Project, Offerte, MontageAfspraak, Werkbon, Factuur, Taak, Medewerker, ProjectFoto } from '@/types'

interface ActivityEvent {
  id: string
  tekst: string
  datum: string
  type: 'project' | 'offerte' | 'montage' | 'werkbon' | 'factuur' | 'taak' | 'foto' | 'portaal'
  medewerker?: string
}

const typeConfig: Record<ActivityEvent['type'], { icon: typeof Send; color: string; bg: string }> = {
  project:  { icon: FolderPlus,    color: 'text-teal-600',    bg: 'bg-teal-50' },
  offerte:  { icon: Receipt,       color: 'text-violet-600',  bg: 'bg-violet-50' },
  montage:  { icon: Wrench,        color: 'text-orange-600',  bg: 'bg-orange-50' },
  werkbon:  { icon: ClipboardCheck, color: 'text-amber-700',  bg: 'bg-amber-50' },
  factuur:  { icon: CreditCard,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  taak:     { icon: CheckCircle2,  color: 'text-blue-600',    bg: 'bg-blue-50' },
  foto:     { icon: Camera,        color: 'text-pink-600',    bg: 'bg-pink-50' },
  portaal:  { icon: Send,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

const filterLabels: Record<string, string> = {
  alles: 'Alles',
  offerte: 'Offertes',
  taak: 'Taken',
  factuur: 'Facturen',
  montage: 'Montage',
  werkbon: 'Werkbonnen',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

// Deterministic color from name string
function avatarColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600',
    'from-emerald-500 to-emerald-600',
    'from-rose-500 to-rose-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-indigo-500 to-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function buildActivityFeed(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  werkbonnen: Werkbon[],
  facturen: Factuur[],
  taken: Taak[],
  fotos: ProjectFoto[],
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // Project created
  events.push({
    id: `project-${project.id}`,
    tekst: 'Project aangemaakt',
    datum: project.created_at,
    type: 'project',
  })

  // Project status changes
  if (project.status === 'afgerond' && project.updated_at) {
    events.push({
      id: `project-afgerond-${project.id}`,
      tekst: 'Project afgerond',
      datum: project.updated_at,
      type: 'project',
    })
  }

  // Offertes
  for (const o of offertes) {
    events.push({
      id: `offerte-create-${o.id}`,
      tekst: `Offerte ${o.nummer} aangemaakt`,
      datum: o.created_at,
      type: 'offerte',
    })
    if (o.verstuurd_op) {
      events.push({
        id: `offerte-send-${o.id}`,
        tekst: `Offerte ${o.nummer} verstuurd naar klant`,
        datum: o.verstuurd_op,
        type: 'offerte',
      })
    }
    if (o.akkoord_op) {
      events.push({
        id: `offerte-akkoord-${o.id}`,
        tekst: `Klant akkoord op offerte ${o.nummer}`,
        datum: o.akkoord_op,
        type: 'offerte',
      })
    }
  }

  // Montage
  for (const m of montageAfspraken) {
    const monteurNamen = m.monteurs?.join(', ')
    events.push({
      id: `montage-${m.id}`,
      tekst: `Montage ingepland: ${m.titel}`,
      datum: m.created_at,
      type: 'montage',
      medewerker: monteurNamen || undefined,
    })
    if (m.status === 'afgerond' && m.updated_at) {
      events.push({
        id: `montage-done-${m.id}`,
        tekst: `Montage afgerond: ${m.titel}`,
        datum: m.updated_at,
        type: 'montage',
        medewerker: monteurNamen || undefined,
      })
    }
  }

  // Werkbonnen
  for (const w of werkbonnen) {
    events.push({
      id: `werkbon-${w.id}`,
      tekst: `Werkbon ${w.werkbon_nummer} aangemaakt`,
      datum: w.created_at,
      type: 'werkbon',
    })
    if (w.status === 'afgerond' && w.updated_at) {
      events.push({
        id: `werkbon-done-${w.id}`,
        tekst: `Werkbon ${w.werkbon_nummer} afgerond`,
        datum: w.updated_at,
        type: 'werkbon',
      })
    }
  }

  // Facturen
  for (const f of facturen) {
    events.push({
      id: `factuur-${f.id}`,
      tekst: `Factuur ${f.nummer} aangemaakt`,
      datum: f.created_at || f.factuurdatum,
      type: 'factuur',
    })
    if (f.status === 'verzonden' && f.updated_at) {
      events.push({
        id: `factuur-send-${f.id}`,
        tekst: `Factuur ${f.nummer} verstuurd`,
        datum: f.updated_at,
        type: 'factuur',
      })
    }
    if (f.status === 'betaald' && f.updated_at) {
      events.push({
        id: `factuur-paid-${f.id}`,
        tekst: `Factuur ${f.nummer} betaald`,
        datum: f.updated_at,
        type: 'factuur',
      })
    }
  }

  // Taken
  for (const t of taken) {
    events.push({
      id: `taak-create-${t.id}`,
      tekst: `Taak "${t.titel}" aangemaakt`,
      datum: t.created_at,
      type: 'taak',
      medewerker: t.toegewezen_aan || undefined,
    })
    if (t.status === 'klaar' && t.updated_at) {
      events.push({
        id: `taak-done-${t.id}`,
        tekst: `Taak "${t.titel}" afgerond`,
        datum: t.updated_at,
        type: 'taak',
        medewerker: t.toegewezen_aan || undefined,
      })
    }
  }

  // Foto's
  for (const f of fotos) {
    events.push({
      id: `foto-${f.id}`,
      tekst: f.omschrijving ? `Foto toegevoegd: ${f.omschrijving}` : 'Situatiefoto toegevoegd',
      datum: f.created_at,
      type: 'foto',
    })
  }

  return events
    .filter(e => e.datum)
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
}

interface ActiviteitFeedProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  werkbonnen: Werkbon[]
  facturen: Factuur[]
  taken?: Taak[]
  fotos?: ProjectFoto[]
  medewerkers?: Medewerker[]
}

export function ActiviteitFeed({
  project,
  offertes,
  montageAfspraken,
  werkbonnen,
  facturen,
  taken = [],
  fotos = [],
  medewerkers = [],
}: ActiviteitFeedProps) {
  const [showAll, setShowAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('alles')

  const allEvents = useMemo(
    () => buildActivityFeed(project, offertes, montageAfspraken, werkbonnen, facturen, taken, fotos),
    [project, offertes, montageAfspraken, werkbonnen, facturen, taken, fotos]
  )

  // Filter events
  const filteredEvents = activeFilter === 'alles'
    ? allEvents
    : allEvents.filter(e => e.type === activeFilter)

  const displayEvents = showAll ? filteredEvents : filteredEvents.slice(0, 8)

  // Available filter types (only show filters that have events)
  const availableFilters = useMemo(() => {
    const types = new Set(allEvents.map(e => e.type))
    return Object.keys(filterLabels).filter(k => k === 'alles' || types.has(k))
  }, [allEvents])

  // Group by date
  const groupedEvents: { date: string; events: ActivityEvent[] }[] = []
  displayEvents.forEach((event) => {
    const dateKey = new Date(event.datum).toDateString()
    const last = groupedEvents[groupedEvents.length - 1]
    if (last && last.date === dateKey) {
      last.events.push(event)
    } else {
      groupedEvents.push({ date: dateKey, events: [event] })
    }
  })

  // Find medewerker by naam
  function findMedewerker(naam?: string) {
    if (!naam) return null
    return medewerkers.find(m =>
      m.naam.toLowerCase() === naam.toLowerCase() ||
      naam.toLowerCase().includes(m.naam.toLowerCase().split(' ')[0])
    ) || null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-foreground">Activiteit</h3>
        <span className="text-[10px] text-muted-foreground/50 font-mono">{allEvents.length}</span>
      </div>

      {/* Filter chips */}
      {availableFilters.length > 2 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {availableFilters.map((key) => (
            <button
              key={key}
              onClick={() => { setActiveFilter(key); setShowAll(false) }}
              className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                activeFilter === key
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(35,15%,95%)]'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50 italic py-4 text-center">Nog geen activiteit</p>
      ) : (
        <div className="space-y-0">
          {groupedEvents.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-2 py-2">
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  {formatDate(group.events[0].datum)}
                </span>
                <div className="flex-1 h-px bg-[hsl(35,15%,92%)]" />
              </div>

              {/* Events for this date */}
              <div className="space-y-0">
                {group.events.map((event) => {
                  const config = typeConfig[event.type]
                  const Icon = config.icon
                  const med = findMedewerker(event.medewerker)

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-2.5 py-2 group hover:bg-[hsl(35,15%,98%)] -mx-1 px-1 rounded-lg transition-colors"
                    >
                      {/* Icon or Avatar */}
                      <div className="flex-shrink-0 mt-0.5">
                        {med ? (
                          <div
                            className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarColor(med.naam)} flex items-center justify-center shadow-sm`}
                            title={med.naam}
                          >
                            <span className="text-white text-[8px] font-bold">{getInitials(med.naam)}</span>
                          </div>
                        ) : event.medewerker ? (
                          <div
                            className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarColor(event.medewerker)} flex items-center justify-center shadow-sm`}
                            title={event.medewerker}
                          >
                            <span className="text-white text-[8px] font-bold">{getInitials(event.medewerker)}</span>
                          </div>
                        ) : (
                          <div className={`h-6 w-6 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <Icon className={`h-3 w-3 ${config.color}`} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-foreground/85 leading-snug">
                          {event.medewerker && (
                            <span className="font-semibold text-foreground">{event.medewerker.split(' ')[0]} </span>
                          )}
                          {event.medewerker
                            ? event.tekst.replace(/^(Taak|Montage)\s/, '').replace(/^"/, '').toLowerCase()
                            : event.tekst
                          }
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground/40">{formatTime(event.datum)}</span>
                          {!event.medewerker && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0 rounded ${config.bg} ${config.color}`}>
                              <Icon className="h-2.5 w-2.5" />
                              {event.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length > 8 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-[11px] text-muted-foreground hover:text-foreground mt-2 py-2 rounded-lg hover:bg-[hsl(35,15%,96%)] transition-colors"
        >
          Alle {filteredEvents.length} activiteiten tonen
        </button>
      )}
    </div>
  )
}
