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
  project:  { icon: FolderPlus,    color: 'text-mod-projecten-text',  bg: 'bg-mod-projecten-light' },
  offerte:  { icon: Receipt,       color: 'text-mod-email-text', bg: 'bg-mod-email-light' },
  montage:  { icon: Wrench,        color: 'text-mod-planning-text',  bg: 'bg-mod-werkbonnen-light' },
  werkbon:  { icon: ClipboardCheck, color: 'text-mod-taken-text', bg: 'bg-mod-taken-light' },
  factuur:  { icon: CreditCard,    color: 'text-mod-werkbonnen-text',   bg: 'bg-mod-werkbonnen-light' },
  taak:     { icon: CheckCircle2,  color: 'text-mod-klanten-text',   bg: 'bg-mod-klanten-light' },
  foto:     { icon: Camera,        color: 'text-flame-text',  bg: 'bg-flame-light' },
  portaal:  { icon: Send,          color: 'text-mod-projecten-text',   bg: 'bg-mod-projecten-light' },
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
    'from-[#7EB5A6] to-[#5E9586]',   // sage/projecten
    'from-[#9B8EC4] to-[#7B6EA4]',   // lavender/offertes
    'from-[#C4A882] to-[#A48862]',   // gold/taken
    'from-[#8BAFD4] to-[#6B8FB4]',   // mist/email
    'from-[#E8866A] to-[#C8664A]',   // coral/facturen
    'from-[#D4836A] to-[#B4634A]',   // rust/werkbonnen
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

  const displayEvents = showAll ? filteredEvents : filteredEvents.slice(0, 3)

  // Available filter types (only show filters that have events)
  const availableFilters = useMemo(() => {
    const types = new Set(allEvents.map(e => e.type))
    return Object.keys(filterLabels).filter(k => k === 'alles' || types.has(k as ActivityEvent['type']))
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
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-[#1A1A1A] tracking-[-0.2px]">Activiteit</h3>
        <span className="text-[10px] text-[#B0ADA8] font-mono tabular-nums">{allEvents.length}</span>
      </div>

      {/* Filter chips */}
      {availableFilters.length > 2 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {availableFilters.map((key) => (
            <button
              key={key}
              onClick={() => { setActiveFilter(key); setShowAll(false) }}
              className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-150 ${
                activeFilter === key
                  ? 'bg-[#1A535C] text-white font-medium'
                  : 'text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC]'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <p className="text-[12px] text-[#B0ADA8] py-5 text-center">Nog geen activiteit</p>
      ) : (
        <div>
          {groupedEvents.map((group) => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-2 py-2">
                <span className="text-[10px] font-semibold text-[#B0ADA8] uppercase tracking-[0.08em]">
                  {formatDate(group.events[0].datum)}
                </span>
                <div className="flex-1 h-px bg-[#EBEBEB]" />
              </div>

              {/* Events for this date */}
              <div>
                {group.events.map((event) => {
                  const config = typeConfig[event.type]
                  const Icon = config.icon
                  const med = findMedewerker(event.medewerker)

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-2.5 py-2 -mx-1.5 px-1.5 rounded-lg hover:bg-[#F8F7F5] transition-colors duration-100"
                    >
                      {/* Icon or Avatar */}
                      <div className="flex-shrink-0 mt-0.5">
                        {med ? (
                          <div
                            className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarColor(med.naam)} flex items-center justify-center`}
                            title={med.naam}
                          >
                            <span className="text-white text-[8px] font-bold">{getInitials(med.naam)}</span>
                          </div>
                        ) : event.medewerker ? (
                          <div
                            className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarColor(event.medewerker)} flex items-center justify-center`}
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
                        <p className="text-[12px] text-[#4A4A46] leading-snug">
                          {event.medewerker && (
                            <span className="font-semibold text-[#1A1A1A]">{event.medewerker.split(' ')[0]} </span>
                          )}
                          {event.medewerker
                            ? event.tekst.replace(/^(Taak|Montage)\s/, '').replace(/^"/, '').toLowerCase()
                            : event.tekst
                          }
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#B0ADA8]">{formatTime(event.datum)}</span>
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

      {filteredEvents.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-[11px] font-medium text-[#1A535C] mt-2 py-2.5 rounded-lg hover:bg-[#E8F5F6] transition-colors duration-150"
        >
          Alle {filteredEvents.length} activiteiten tonen
        </button>
      )}
    </div>
  )
}
