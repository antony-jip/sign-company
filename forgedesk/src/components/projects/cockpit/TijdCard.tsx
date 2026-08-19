import { Play, Square, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useTijdSessies } from '@/hooks/useTijdSessies'
import type { Medewerker, Tijdregistratie, TijdSessie } from '@/types'

interface TijdCardProps {
  projectId: string
  projectNaam: string
  eigenMedewerker: Medewerker | null
  medewerkers: Medewerker[]
  tijdregistraties: Tijdregistratie[]
  onGeboekt: () => void
}

interface GeboektPerPersoon {
  naam: string
  minuten: number
}

// Uren van vóór het inklokken hebben geen medewerker: de oude timer en het
// handmatige formulier vulden dat veld niet. Die belanden bewust zichtbaar
// onder "niet toegewezen" in plaats van bij iemand die ze niet gemaakt heeft.
function groepeerPerPersoon(
  registraties: Tijdregistratie[],
  medewerkers: Medewerker[],
): GeboektPerPersoon[] {
  const perNaam = new Map<string, number>()
  for (const t of registraties) {
    const minuten = t.duur_minuten || 0
    if (minuten <= 0) continue
    const naam = t.medewerker_naam
      || medewerkers.find((m) => m.id === t.medewerker_id)?.naam
      || 'Niet toegewezen'
    perNaam.set(naam, (perNaam.get(naam) || 0) + minuten)
  }
  return [...perNaam.entries()]
    .map(([naam, minuten]) => ({ naam, minuten }))
    .sort((a, b) => b.minuten - a.minuten)
}

const AVATAR_TINTS = [
  'bg-[hsl(var(--status-green-bg))] text-[#3A7D52]',
  'bg-[hsl(var(--status-blue-bg))] text-[#3A5A9A]',
  'bg-[hsl(var(--status-amber-bg))] text-[#8A7A4A]',
  'bg-[hsl(var(--status-violet-bg))] text-[#6A5A8A]',
  'bg-muted text-foreground/70',
]

function tint(naam: string): string {
  return AVATAR_TINTS[(naam.charCodeAt(0) || 0) % AVATAR_TINTS.length]
}

function initiaal(naam: string): string {
  return (naam || '?').trim().charAt(0).toUpperCase() || '?'
}

function formatKlok(seconden: number): string {
  const u = Math.floor(seconden / 3600)
  const m = Math.floor((seconden % 3600) / 60)
  const s = seconden % 60
  return `${u}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuur(minuten: number): string {
  const u = Math.floor(minuten / 60)
  const m = minuten % 60
  if (u === 0) return `${m}m`
  if (m === 0) return `${u}u`
  return `${u}u ${m}m`
}

function startTijd(sessie: TijdSessie): string {
  return new Date(sessie.gestart_op).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function TijdCard({ projectId, projectNaam, eigenMedewerker, medewerkers, tijdregistraties, onGeboekt }: TijdCardProps) {
  const {
    projectSessies, eigenSessie, eigenSessieElders, bezig,
    inklokken, uitklokken, secondenVan, isVerlopen,
  } = useTijdSessies({ projectId, projectNaam, medewerker: eigenMedewerker })

  const eigenHier = eigenSessie && eigenSessie.project_id === projectId ? eigenSessie : null
  const collegas = projectSessies.filter((s) => s.id !== eigenHier?.id)
  const geboekteMinuten = tijdregistraties.reduce((som, t) => som + (t.duur_minuten || 0), 0)
  const geboektPerPersoon = groepeerPerPersoon(tijdregistraties, medewerkers)

  async function handleInklokken() {
    try {
      const vorige = await inklokken()
      if (vorige?.registratie) {
        toast.success(`Uitgeklokt op ${vorige.sessie.project_naam || 'vorig project'}: ${formatDuur(vorige.duurMinuten)} geboekt`)
        onGeboekt()
      } else if (vorige?.verlopen) {
        toast.warning(`Vorige sessie liep langer dan een werkdag en is op nul gezet. Vul de uren handmatig aan.`)
      } else {
        toast.success('Ingeklokt')
      }
    } catch (err) {
      logger.error('Inklokken mislukt:', err)
      toast.error('Inklokken mislukt')
    }
  }

  async function handleUitklokken() {
    try {
      const resultaat = await uitklokken()
      if (!resultaat) return
      if (resultaat.verlopen) {
        toast.warning('Deze sessie liep langer dan een werkdag en is op nul gezet. Vul de uren handmatig aan.')
      } else if (resultaat.duurMinuten < 1) {
        toast.info('Uitgeklokt, minder dan een minuut is niet geboekt')
      } else {
        toast.success(`Uitgeklokt: ${formatDuur(resultaat.duurMinuten)} geboekt`)
      }
      onGeboekt()
    } catch (err) {
      logger.error('Uitklokken mislukt:', err)
      toast.error('Uitklokken mislukt')
    }
  }

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-heading text-[15px] font-bold text-foreground">
          Tijd<span className="text-flame">.</span>
        </h3>
        <span className="doen-subtitel">hoelang wordt er gewerkt?</span>
      </div>

      {eigenHier ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[22px] font-semibold leading-none tabular-nums text-foreground">
              {formatKlok(secondenVan(eigenHier))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              ingeklokt sinds {startTijd(eigenHier)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleUitklokken}
            disabled={bezig}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-flame text-white text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" strokeWidth={2.25} />
            Uitklokken
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleInklokken}
            disabled={bezig || !projectId}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-petrol text-white text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={2.25} />
            Inklokken
          </button>
          {eigenSessieElders && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Je staat nu ingeklokt op {eigenSessieElders.project_naam || 'een ander project'}. Inklokken hier sluit dat af en boekt de uren.
            </p>
          )}
        </div>
      )}

      {collegas.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {collegas.map((sessie) => {
            const naam = sessie.medewerker_naam || 'Onbekend'
            const verlopen = isVerlopen(sessie)
            return (
              <div key={sessie.id} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0 ${tint(naam)}`}>
                  {initiaal(naam)}
                </span>
                <span className="text-[12px] font-medium text-foreground truncate">{naam.split(' ')[0]}</span>
                {verlopen ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#8A6A2A] ml-auto">
                    <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                    vergeten uit te klokken
                  </span>
                ) : (
                  <span className="ml-auto flex items-center gap-1.5 text-[12px] font-mono tabular-nums text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-flame animate-pulse" aria-hidden />
                    {formatDuur(Math.floor(secondenVan(sessie) / 60))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {geboekteMinuten > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>geboekt op dit project</span>
            <span className="font-mono tabular-nums text-foreground/80">{formatDuur(geboekteMinuten)}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {geboektPerPersoon.map((regel) => (
              <div key={regel.naam} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0 ${tint(regel.naam)}`}>
                  {initiaal(regel.naam)}
                </span>
                <span className="text-[12px] text-foreground truncate">{regel.naam}</span>
                <span className="ml-auto text-[12px] font-mono tabular-nums text-muted-foreground">
                  {formatDuur(regel.minuten)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
