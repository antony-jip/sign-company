import { FileText, Globe } from 'lucide-react'
import { ContactKnoppen, Etiket, Paneel, StatusWoord, tekstLink } from '@/components/klantpagina/Klantstijl'

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
}

function formatDatum(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Interne projectstatussen als klantvriendelijke woorden. Voorheen viel alles
 * buiten actief/afgerond terug op "actief." en zag de klant nooit voortgang.
 */
export function ProjectStatus({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    gepland: { color: '#8A7A4A', label: 'Gepland' },
    'te-plannen': { color: '#8A7A4A', label: 'Gepland' },
    'in-review': { color: '#3A5A9A', label: 'In voorbereiding' },
    'akkoord-klant': { color: '#3A7D52', label: 'Akkoord' },
    actief: { color: '#1A535C', label: 'In productie' },
    ingepland: { color: '#1A535C', label: 'Montage ingepland' },
    'on-hold': { color: '#8A7A4A', label: 'Gepauzeerd' },
    'te-factureren': { color: '#3A7D52', label: 'Afgerond' },
    gefactureerd: { color: '#3A7D52', label: 'Afgerond' },
    afgerond: { color: '#3A7D52', label: 'Afgerond' },
    offerte: { color: '#D24620', label: 'Offerte' },
    lopend: { color: '#1A535C', label: 'Lopend' },
    productie: { color: '#1A535C', label: 'In productie' },
    montage: { color: '#1A535C', label: 'Montage' },
  }
  const s = map[status?.toLowerCase()] || { color: '#1A535C', label: 'In behandeling' }
  return <StatusWoord kleur={s.color}>{s.label}</StatusWoord>
}

export function PortaalSidebar({
  project,
  bedrijf,
  montage,
  documenten = [],
  toonContact = true,
}: PortaalSidebarProps) {
  const planning = [
    project.start_datum ? { label: 'Start', waarde: formatDatum(project.start_datum) } : null,
    montage ? { label: 'Montage', waarde: `${formatDatum(montage.datum)}${montage.start_tijd ? ` · ${montage.start_tijd}` : ''}` } : null,
    project.deadline ? { label: 'Oplevering', waarde: formatDatum(project.deadline) } : null,
  ].filter((r): r is { label: string; waarde: string } => r !== null)
  const toonContactblok = toonContact && !!(bedrijf.telefoon || bedrijf.email || bedrijf.website)

  if (planning.length === 0 && !toonContactblok && documenten.length === 0) return null

  return (
    <aside className="space-y-4 md:sticky md:top-6 md:self-start">
      {planning.length > 0 && (
        <Paneel className="!p-5">
          <Etiket className="mb-3">Planning</Etiket>
          <dl className="space-y-2 text-sm">
            {planning.map((rij) => (
              <div key={rij.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[#6B6B66]">{rij.label}</dt>
                <dd className="text-right font-mono text-[#1A1A1A]">{rij.waarde}</dd>
              </div>
            ))}
          </dl>
        </Paneel>
      )}

      {toonContactblok && (
        <Paneel className="!p-5">
          <p className="font-semibold text-[#1A1A1A]">Vragen?</p>
          <p className="mt-0.5 text-sm text-[#6B6B66]">{bedrijf.naam} helpt u graag verder.</p>
          {(bedrijf.telefoon || bedrijf.email) && (
            <div className="mt-4">
              <ContactKnoppen telefoon={bedrijf.telefoon} email={bedrijf.email} onderwerp={project.naam || undefined} />
            </div>
          )}
          {bedrijf.website && (
            <a
              href={bedrijf.website.startsWith('http') ? bedrijf.website : `https://${bedrijf.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tekstLink} mt-4`}
            >
              <Globe className="h-4 w-4" />
              {bedrijf.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </Paneel>
      )}

      {documenten.length > 0 && (
        <Paneel className="!p-5">
          <Etiket className="mb-2">Documenten</Etiket>
          <ul className="space-y-1">
            {documenten.map((doc, i) => (
              <li key={i}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1.5 text-sm text-[#1A535C] underline-offset-4 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.naam}</span>
                </a>
              </li>
            ))}
          </ul>
        </Paneel>
      )}
    </aside>
  )
}
