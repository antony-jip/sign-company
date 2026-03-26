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
  const map: Record<string, { bg: string; color: string; label: string }> = {
    offerte: { bg: '#FDE8E4', color: '#F15025', label: 'offerte.' },
    lopend: { bg: '#E6F0F1', color: '#1A535C', label: 'lopend.' },
    productie: { bg: '#E6F0F1', color: '#1A535C', label: 'productie.' },
    montage: { bg: '#E6F0F1', color: '#1A535C', label: 'montage.' },
    afgerond: { bg: '#E8F2EC', color: '#2D6B48', label: 'afgerond.' },
    actief: { bg: '#E6F0F1', color: '#1A535C', label: 'actief.' },
  }
  const s = map[status?.toLowerCase()] || map.actief
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span style={{ color: '#F15025', fontSize: 8 }}>●</span>
      {s.label}
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
      <div className="rounded-[10px] border" style={{ borderColor: '#E8E6E1', backgroundColor: '#fff' }}>
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
            <p className="font-medium" style={{ color: '#191919' }}>{bedrijf.naam}</p>
            {bedrijf.telefoon && (
              <a
                href={`tel:${bedrijf.telefoon}`}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: '#5A5A55' }}
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                {bedrijf.telefoon}
              </a>
            )}
            {bedrijf.email && (
              <a
                href={`mailto:${bedrijf.email}`}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: '#5A5A55' }}
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
                style={{ color: '#5A5A55' }}
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
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors"
                style={{ fontSize: 13, color: '#1A535C' }}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{doc.naam}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t" style={{ borderColor: '#E8E6E1' }}>
        <p className="text-center" style={{ fontSize: 11, color: '#C0BDB8' }}>
          <span style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800 }}>
            doen<span style={{ color: '#F15025' }}>.</span>
          </span>
          {' '}slim gedaan.
        </p>
      </div>
    </div>
  )
}

function PlanningRij({ label, datum, tijd }: { label: string; datum: string; tijd?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A0A098' }} />
      <span className="text-xs" style={{ color: '#5A5A55' }}>{label}:</span>
      <span
        className="text-xs font-medium"
        style={{ color: '#191919', fontFamily: "'DM Mono', monospace" }}
      >
        {datum}
        {tijd && <span className="text-gray-400 ml-1">{tijd}</span>}
      </span>
    </div>
  )
}
