import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import type { Project, Offerte, MontageAfspraak, Werkbon, Factuur } from '@/types'

interface ActivityEvent {
  id: string
  tekst: string
  datum: string
  kleur: string
}

function buildActivityFeed(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  werkbonnen: Werkbon[],
  facturen: Factuur[],
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // Project created
  events.push({
    id: `project-${project.id}`,
    tekst: 'Project aangemaakt',
    datum: project.created_at,
    kleur: '#7EB5A6',
  })

  // Offertes
  for (const o of offertes) {
    events.push({
      id: `offerte-create-${o.id}`,
      tekst: `Offerte ${o.nummer} aangemaakt`,
      datum: o.created_at,
      kleur: '#9B8EC4',
    })
    if (o.verstuurd_op) {
      events.push({
        id: `offerte-send-${o.id}`,
        tekst: `Offerte ${o.nummer} verstuurd`,
        datum: o.verstuurd_op,
        kleur: '#9B8EC4',
      })
    }
    if (o.akkoord_op) {
      events.push({
        id: `offerte-akkoord-${o.id}`,
        tekst: `Klant akkoord op ${o.nummer}`,
        datum: o.akkoord_op,
        kleur: '#C9A96E',
      })
    }
  }

  // Montage
  for (const m of montageAfspraken) {
    events.push({
      id: `montage-${m.id}`,
      tekst: `Montage gepland: ${m.titel}`,
      datum: m.created_at,
      kleur: '#E8946A',
    })
  }

  // Werkbonnen
  for (const w of werkbonnen) {
    events.push({
      id: `werkbon-${w.id}`,
      tekst: `Werkbon ${w.werkbon_nummer} aangemaakt`,
      datum: w.created_at,
      kleur: '#D4836A',
    })
  }

  // Facturen
  for (const f of facturen) {
    events.push({
      id: `factuur-${f.id}`,
      tekst: `Factuur ${f.nummer} aangemaakt`,
      datum: f.created_at || f.factuurdatum,
      kleur: '#E8866A',
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
}

export function ActiviteitFeed({
  project,
  offertes,
  montageAfspraken,
  werkbonnen,
  facturen,
}: ActiviteitFeedProps) {
  const [showAll, setShowAll] = useState(false)
  const events = buildActivityFeed(project, offertes, montageAfspraken, werkbonnen, facturen)
  const displayEvents = showAll ? events : events.slice(0, 5)

  if (events.length === 0) {
    return (
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-3">Activiteit</h3>
        <p className="text-xs text-muted-foreground italic">Nog geen activiteit</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-[13px] font-medium text-foreground mb-3">Activiteit</h3>
      <div className="space-y-2.5">
        {displayEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-2.5">
            <div
              className="h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: event.kleur }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground">{event.tekst}</p>
              <p className="text-xs text-muted-foreground/70">{formatDateTime(event.datum)}</p>
            </div>
          </div>
        ))}
      </div>
      {events.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:text-primary/80 mt-2 transition-colors"
        >
          Meer bekijken
        </button>
      )}
    </div>
  )
}
