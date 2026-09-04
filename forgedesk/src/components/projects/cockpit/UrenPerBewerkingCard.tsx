import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getProjectUrenBudget, geschrevenMinutenPerVeld, OVERIG, type ProjectUrenBudget } from '@/services/projectUrenService'
import { urenVeldenUitInstellingen } from '@/utils/offerteUren'
import { logger } from '@/utils/logger'
import type { Tijdregistratie } from '@/types'

interface UrenPerBewerkingCardProps {
  projectId: string
  tijdregistraties: Tijdregistratie[]
}

interface Rij {
  veld: string
  begroot: number
  geschreven: number
}

function formatUren(u: number): string {
  return u.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/**
 * Verkocht tegen geschreven, per bewerking. Het scherm dat een calculator de
 * hele dag open heeft. Verbergt zichzelf als er niets te tonen is.
 */
export function UrenPerBewerkingCard({ projectId, tijdregistraties }: UrenPerBewerkingCardProps) {
  const { settings } = useAppSettings()
  const urenVelden = useMemo(() => urenVeldenUitInstellingen(settings.calculatie_uren_velden), [settings.calculatie_uren_velden])
  const [budget, setBudget] = useState<ProjectUrenBudget | null>(null)

  useEffect(() => {
    let actief = true
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
    if (geschreven[OVERIG]) uit.push({ veld: OVERIG, begroot: 0, geschreven: geschreven[OVERIG] / 60 })
    return uit
  }, [urenVelden, geschreven, budget])

  if (rijen.length === 0) return null

  const verwacht = budget?.soort === 'verwacht'
  const totaalBegroot = rijen.reduce((s, r) => s + r.begroot, 0)
  const totaalGeschreven = rijen.reduce((s, r) => s + r.geschreven, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2"><Gauge className="h-4 w-4" />Uren per bewerking</span>
          {verwacht && <span className="text-[11px] font-normal text-muted-foreground">verwacht, nog geen akkoord</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rijen.map((r) => {
          const pct = r.begroot > 0 ? (r.geschreven / r.begroot) * 100 : 0
          const kleur = r.begroot === 0 ? 'bg-muted-foreground/40' : pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-primary'
          return (
            <div key={r.veld} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn('truncate', r.veld === OVERIG && 'text-muted-foreground')}>{r.veld}</span>
                <span className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                  {r.begroot > 0
                    ? <>{formatUren(r.geschreven)} / {formatUren(r.begroot)} u</>
                    : <>{formatUren(r.geschreven)} u</>}
                </span>
              </div>
              {r.begroot > 0 && (
                <div className="h-1.5 w-full rounded-sm bg-muted overflow-hidden" title={`${Math.round(pct)}%`}>
                  <div className={cn('h-full rounded-sm', kleur, verwacht && 'opacity-60')} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              )}
            </div>
          )
        })}
        {totaalBegroot > 0 && (
          <div className="flex items-baseline justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>Totaal</span>
            <span className="tabular-nums">{formatUren(totaalGeschreven)} / {formatUren(totaalBegroot)} u</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
