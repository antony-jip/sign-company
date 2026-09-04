import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminUser } from '@/utils/authHelpers'
import { getProjectUrenBudget, geschrevenMinutenPerVeld, OVERIG, type ProjectUrenBudget } from '@/services/projectUrenService'
import { urenVeldenUitInstellingen } from '@/utils/offerteUren'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '@/utils/logger'
import type { Tijdregistratie } from '@/types'

interface UrenPerBewerkingProps {
  projectId: string
  tijdregistraties: Tijdregistratie[]
}

interface Rij {
  veld: string
  begroot: number
  geschreven: number
}

interface Kosten {
  /** Verkochte uren tegen het offertetarief; null zonder meetellend budget. */
  verkocht: number | null
  urenkosten: number
  regelsZonderKostprijs: number
}

function formatUren(u: number): string {
  return u.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Ingeklapt is een voorkeur van de gebruiker, niet van het project: wie het
// niet gebruikt wil het op elk project dicht hebben.
const INGEKLAPT_KEY = 'doen_project_bewerkingen_ingeklapt'

function leesIngeklapt(): boolean {
  try { return localStorage.getItem(INGEKLAPT_KEY) === '1' } catch { return false }
}

function bewaarIngeklapt(waarde: boolean) {
  try { localStorage.setItem(INGEKLAPT_KEY, waarde ? '1' : '0') } catch { /* privémodus of geen opslag: dan onthouden we het gewoon niet */ }
}

/**
 * Rekent met de kostprijs-momentopname op de urenregel, anders de
 * organisatie-standaard. Is er nergens een kostprijs bekend, dan is er geen
 * kostenblok: liever niets dan een verzonnen getal.
 */
function berekenKosten(
  registraties: Tijdregistratie[],
  budget: ProjectUrenBudget | null,
  standaardKostprijs: number | null | undefined,
): Kosten | null {
  const standaard = typeof standaardKostprijs === 'number' && standaardKostprijs > 0 ? standaardKostprijs : null
  const kostprijsBekend = standaard !== null || registraties.some((r) => typeof r.kostprijs_uur === 'number' && r.kostprijs_uur > 0)
  if (!kostprijsBekend) return null

  let urenkosten = 0
  let regelsZonderKostprijs = 0
  for (const r of registraties) {
    const minuten = r.duur_minuten || 0
    if (minuten <= 0) continue
    const kostprijs = typeof r.kostprijs_uur === 'number' && r.kostprijs_uur > 0 ? r.kostprijs_uur : standaard
    if (kostprijs === null) { regelsZonderKostprijs++; continue }
    urenkosten += (minuten / 60) * kostprijs
  }

  const verkocht = budget && budget.soort !== 'geen'
    ? Object.values(budget.perVeld).reduce((s, v) => s + v.uren * v.tarief, 0)
    : null

  return { verkocht: verkocht === null ? null : round2(verkocht), urenkosten: round2(urenkosten), regelsZonderKostprijs }
}

function KostenRegel({ label, bedrag, nadruk }: { label: string; bedrag: number; nadruk?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 text-[11px]', nadruk ? 'text-foreground font-medium' : 'text-muted-foreground')}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{formatCurrency(bedrag)}</span>
    </div>
  )
}

/**
 * Verkocht tegen geschreven, per bewerking. Onderdeel van de tijdkaart op het
 * project, geen eigen kaart: niet elk bedrijf houdt bewerkingen bij, dus het
 * blok verschijnt alleen als er iets te tonen is.
 */
export function UrenPerBewerking({ projectId, tijdregistraties }: UrenPerBewerkingProps) {
  const { settings } = useAppSettings()
  const { userRol } = useAuth()
  const urenVelden = useMemo(() => urenVeldenUitInstellingen(settings.calculatie_uren_velden), [settings.calculatie_uren_velden])
  const [budget, setBudget] = useState<ProjectUrenBudget | null>(null)
  const [ingeklapt, setIngeklapt] = useState(leesIngeklapt)

  function toggleIngeklapt() {
    setIngeklapt((v) => { bewaarIngeklapt(!v); return !v })
  }

  useEffect(() => {
    let actief = true
    // Eerst leeg, anders staan bij een projectwissel even de balken van het vorige project onder de uren van dit project.
    setBudget(null)
    getProjectUrenBudget(projectId, urenVelden)
      .then((b) => { if (actief) setBudget(b) })
      .catch((err) => logger.warn('Kon urenbudget van project niet laden:', err))
    return () => { actief = false }
  }, [projectId, urenVelden])

  const geschreven = useMemo(() => geschrevenMinutenPerVeld(tijdregistraties), [tijdregistraties])

  const rijen = useMemo<Rij[]>(() => {
    const velden = [...urenVelden]
    // Bewerkingen die alleen nog in oude urenregels voorkomen houden hun naam.
    for (const veld of Object.keys(geschreven)) {
      if (veld !== OVERIG && !velden.includes(veld)) velden.push(veld)
    }
    const uit: Rij[] = velden.map((veld) => ({
      veld,
      begroot: budget?.perVeld[veld]?.uren ?? 0,
      geschreven: (geschreven[veld] || 0) / 60,
    })).filter((r) => r.begroot > 0 || r.geschreven > 0)
    // Overig alleen tonen als er ook bewerkingen zijn; anders is het gewoon "geboekt op dit project".
    if (geschreven[OVERIG] && uit.length > 0) uit.push({ veld: OVERIG, begroot: 0, geschreven: geschreven[OVERIG] / 60 })
    return uit
  }, [urenVelden, geschreven, budget])

  const kosten = useMemo(
    () => (isAdminUser(userRol) ? berekenKosten(tijdregistraties, budget, settings.standaard_kostprijs_uur) : null),
    [userRol, tijdregistraties, budget, settings.standaard_kostprijs_uur],
  )

  if (rijen.length === 0) return null

  const verwacht = budget?.soort === 'verwacht'
  const verkocht = kosten?.verkocht ?? null
  const marge = kosten && verkocht !== null ? round2(verkocht - kosten.urenkosten) : null
  const margePct = marge !== null && verkocht ? Math.round((marge / verkocht) * 100) : null
  const totaalBegroot = rijen.reduce((s, r) => s + r.begroot, 0)
  const totaalGeschreven = rijen.reduce((s, r) => s + r.geschreven, 0)

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <button
        type="button"
        onClick={toggleIngeklapt}
        aria-expanded={!ingeklapt}
        className="flex w-full items-baseline justify-between gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="inline-flex items-center gap-1">
          <ChevronDown className={cn('h-3 w-3 transition-transform', ingeklapt && '-rotate-90')} strokeWidth={2} />
          per bewerking{!ingeklapt && totaalBegroot > 0 ? ' · geschreven / verkocht' : ''}
        </span>
        {ingeklapt
          ? <span className="font-mono tabular-nums">{totaalBegroot > 0 ? `${formatUren(totaalGeschreven)} / ${formatUren(totaalBegroot)} u` : `${formatUren(totaalGeschreven)} u`}</span>
          : verwacht && totaalBegroot > 0 && <span>verwacht, nog geen akkoord</span>}
      </button>
      {ingeklapt ? null : (<>
      <div className="mt-2 space-y-2">
        {rijen.map((r) => {
          const pct = r.begroot > 0 ? (r.geschreven / r.begroot) * 100 : 0
          const kleur = r.begroot === 0 ? 'bg-muted-foreground/40' : pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-petrol'
          return (
            <div key={r.veld} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('text-[12px] truncate', r.veld === OVERIG ? 'text-muted-foreground' : 'text-foreground')}>{r.veld}</span>
                <span className="text-[12px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                  {r.begroot > 0
                    ? <>{formatUren(r.geschreven)} / {formatUren(r.begroot)} u</>
                    : <>{formatUren(r.geschreven)} u</>}
                </span>
              </div>
              {r.begroot > 0 && (
                <div className="h-1 w-full rounded-sm bg-border/60 overflow-hidden" title={`${Math.round(pct)}%`}>
                  <div className={cn('h-full rounded-sm', kleur, verwacht && 'opacity-60')} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {totaalBegroot > 0 && (
        <div className="mt-2 flex items-baseline justify-between text-[11px] text-muted-foreground">
          <span>totaal</span>
          <span className="font-mono tabular-nums text-foreground/80">{formatUren(totaalGeschreven)} / {formatUren(totaalBegroot)} u</span>
        </div>
      )}
      {kosten && (
        <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
          {kosten.verkocht !== null && <KostenRegel label="uren verkocht ex btw" bedrag={kosten.verkocht} />}
          <KostenRegel label="urenkosten" bedrag={kosten.urenkosten} />
          {marge !== null && (
            <div className="flex items-baseline justify-between gap-3 text-[11px] font-medium text-foreground">
              <span>indicatie marge</span>
              <span className="font-mono tabular-nums">
                {formatCurrency(marge)}{margePct !== null && <span className="text-muted-foreground font-normal"> · {margePct}%</span>}
              </span>
            </div>
          )}
          {kosten.regelsZonderKostprijs > 0 && (
            <p className="text-[10.5px] text-muted-foreground">
              {kosten.regelsZonderKostprijs === 1 ? '1 urenregel' : `${kosten.regelsZonderKostprijs} urenregels`} zonder kostprijs niet meegeteld
            </p>
          )}
        </div>
      )}
      </>)}
    </div>
  )
}
