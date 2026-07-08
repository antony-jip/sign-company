import {
  Calendar,
  Phone,
  Mail,
  Globe,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

interface PortaalSidebarProps {
  project: {
    naam: string
    status?: string
    start_datum?: string
    deadline?: string
  }
  bedrijf: {
    naam: string
    telefoon?: string
    email?: string
    website?: string
    logo_url?: string
  }
  montage?: { datum: string; start_tijd?: string } | null
  documenten?: { naam: string; url: string; type?: string }[]
  toonContact?: boolean
  isMobiel?: boolean
}

function formatDatum(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function StatusBadge({ status }: { status: string }) {
  // Interne projectstatussen → klantvriendelijke labels. Voorheen viel alles
  // buiten actief/afgerond terug op "actief." — de klant zag nooit voortgang.
  const map: Record<string, { color: string; label: string }> = {
    gepland: { color: '#8A7A4A', label: 'gepland' },
    'te-plannen': { color: '#8A7A4A', label: 'gepland' },
    'in-review': { color: '#3A5A9A', label: 'in voorbereiding' },
    'akkoord-klant': { color: '#3A7D52', label: 'akkoord' },
    actief: { color: '#1A535C', label: 'in productie' },
    ingepland: { color: '#1A535C', label: 'montage ingepland' },
    'on-hold': { color: '#8A7A4A', label: 'gepauzeerd' },
    'te-factureren': { color: '#3A7D52', label: 'afgerond' },
    gefactureerd: { color: '#3A7D52', label: 'afgerond' },
    afgerond: { color: '#3A7D52', label: 'afgerond' },
    offerte: { color: '#F15025', label: 'offerte' },
    lopend: { color: '#1A535C', label: 'lopend' },
    productie: { color: '#1A535C', label: 'in productie' },
    montage: { color: '#1A535C', label: 'montage' },
  }
  const s = map[status?.toLowerCase()] || { color: '#1A535C', label: 'in behandeling' }
  return (
    <span className="inline-flex items-baseline text-xs font-semibold" style={{ color: s.color }}>
      {s.label}<span style={{ color: '#F15025' }}>.</span>
    </span>
  )
}

export function PortaalSidebar({
  project,
  bedrijf,
  montage,
  documenten = [],
  toonContact = true,
  isMobiel = false,
}: PortaalSidebarProps) {
  const [open, setOpen] = useState(!isMobiel)

  if (isMobiel) {
    return (
      <div className="rounded-[10px] border" style={{ borderColor: '#E8E6E1', backgroundColor: 'hsl(var(--card))' }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold" style={{ color: '#1A535C' }}>
            Projectinfo
          </span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: '#A0A098', transform: open ? 'rotate(180deg)' : undefined }}
          />
        </button>
        {open && <SidebarContent project={project} bedrijf={bedrijf} montage={montage} documenten={documenten} toonContact={toonContact} />}
      </div>
    )
  }

  return (
    <aside className="space-y-5 sticky top-6">
      <SidebarContent project={project} bedrijf={bedrijf} montage={montage} documenten={documenten} toonContact={toonContact} />
    </aside>
  )
}

function SidebarContent({
  project,
  bedrijf,
  montage,
  documenten,
  toonContact,
}: Omit<PortaalSidebarProps, 'isMobiel'>) {
  const heeftPlanning = project.start_datum || montage || project.deadline

  return (
    <div className="space-y-5 px-4 pb-4">
      {/* Planning */}
      {heeftPlanning && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#A0A098' }}
          >
            Planning
          </h3>
          <div className="space-y-1.5">
            {project.start_datum && (
              <PlanningRij label="Start" datum={formatDatum(project.start_datum)} />
            )}
            {montage && (
              <PlanningRij
                label="Montage"
                datum={formatDatum(montage.datum)}
                tijd={montage.start_tijd || undefined}
              />
            )}
            {project.deadline && (
              <PlanningRij label="Oplevering" datum={formatDatum(project.deadline)} />
            )}
          </div>
          {project.status && (
            <div className="pt-1">
              <StatusBadge status={project.status} />
            </div>
          )}
        </div>
      )}

      {/* Contact */}
      {toonContact && (bedrijf.telefoon || bedrijf.email) && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#A0A098' }}
          >
            Contact
          </h3>
          <div className="space-y-1.5" style={{ fontSize: 13 }}>
            <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{bedrijf.naam}</p>
            {bedrijf.telefoon && (
              <a
                href={`tel:${bedrijf.telefoon}`}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                {bedrijf.telefoon}
              </a>
            )}
            {bedrijf.email && (
              <a
                href={`mailto:${bedrijf.email}`}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {bedrijf.email}
              </a>
            )}
            {bedrijf.website && (
              <a
                href={bedrijf.website.startsWith('http') ? bedrijf.website : `https://${bedrijf.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                {bedrijf.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Documenten */}
      {documenten && documenten.length > 0 && (
        <div className="space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#A0A098' }}
          >
            Documenten
          </h3>
          <div className="space-y-1">
            {documenten.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted transition-colors"
                style={{ fontSize: 13, color: '#1A535C' }}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{doc.naam}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer — subtiel, zonder uitgaande link: dit is het portaal van het
          bedrijf richting hún klant, geen reclamevlak voor de tool */}
      <div className="pt-4 border-t" style={{ borderColor: '#E8E6E1' }}>
        <p className="text-center" style={{ fontSize: 11, color: '#9B9B95' }}>
          mogelijk gemaakt door{' '}
          <span style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800 }}>
            doen<span style={{ color: '#F15025' }}>.</span>
          </span>
        </p>
      </div>
    </div>
  )
}

function PlanningRij({ label, datum, tijd }: { label: string; datum: string; tijd?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A0A098' }} />
      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}:</span>
      <span
        className="text-xs font-medium"
        style={{ color: 'hsl(var(--foreground))', fontFamily: "'DM Mono', monospace" }}
      >
        {datum}
        {tijd && <span className="ml-1" style={{ color: '#9B9B95' }}>{tijd}</span>}
      </span>
    </div>
  )
}
