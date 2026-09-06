import { cn } from '@/lib/utils'
import type { Factuur, Klant } from '@/types'
import type { FactuurOpvolgStap } from '@/services/factuurService'

type HerinneringType = 'herinnering_1' | 'herinnering_2' | 'herinnering_3' | 'aanmaning'

// Spiegel van STANDAARD_LADDER in src/trigger/factuur-herinnering.ts.
const STANDAARD_DAGEN: Record<HerinneringType, number> = { herinnering_1: 7, herinnering_2: 14, herinnering_3: 21, aanmaning: 30 }
const STANDAARD_ACTIEF: Record<HerinneringType, boolean> = { herinnering_1: true, herinnering_2: true, herinnering_3: false, aanmaning: true }
const MIN_DAGEN_TUSSEN_STAPPEN = 5
const LADDER: HerinneringType[] = ['herinnering_1', 'herinnering_2', 'herinnering_3', 'aanmaning']
const LABEL: Record<HerinneringType, string> = {
  herinnering_1: 'Herinnering 1',
  herinnering_2: 'Herinnering 2',
  herinnering_3: 'Herinnering 3',
  aanmaning: 'Aanmaning',
}

export interface OpvolgStapWeergave {
  sleutel: 'factuur' | HerinneringType
  label: string
  dagen: number | null
  gedaanOp: string | null
  staat: 'gedaan' | 'actief' | 'toekomst'
  /** Alleen op de actieve stap: staat klaar, gepauzeerd of vanaf welke datum. */
  hint: string | null
}

function vlag(f: Factuur, type: HerinneringType): string | null | undefined {
  switch (type) {
    case 'herinnering_1': return f.herinnering_1_verstuurd
    case 'herinnering_2': return f.herinnering_2_verstuurd
    case 'herinnering_3': return f.herinnering_3_verstuurd
    case 'aanmaning': return f.aanmaning_verstuurd
  }
}

function dagenSinds(datum: string): number {
  const d = new Date(datum)
  if (isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

function plusDagen(datum: string, dagen: number): string {
  const d = new Date(datum)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dagen)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function toonOpvolgStepper(f: Factuur): boolean {
  return f.status === 'verzonden' || f.status === 'vervallen'
}

/**
 * De ladder van een factuur als stappen. Gedaan = de vlag staat; de actieve
 * stap is de eerste na de hoogste verstuurde stap (de cron valt nooit terug).
 * Dezelfde beslissing als volgendeHerinneringVoor in FacturenLayout, maar
 * dan als weergave.
 */
export function berekenOpvolgStappen(f: Factuur, stappen: FactuurOpvolgStap[], klant?: Klant | null): OpvolgStapWeergave[] {
  const ladder = LADDER.filter((type) => {
    const eigen = stappen.find((s) => s.stap_type === type)
    return eigen ? eigen.actief : STANDAARD_ACTIEF[type]
  })
  const hoogsteGedaan = LADDER.reduce<number>((acc, type, i) => (vlag(f, type) ? i : acc), -1)
  const gepauzeerd = f.opvolging_actief === false || klant?.geen_betalingsherinneringen === true
  const dagenVerlopen = dagenSinds(f.vervaldatum)
  const stempels = LADDER.map((t) => vlag(f, t)).filter(Boolean) as string[]
  const laatste = stempels.length ? [...stempels].sort()[stempels.length - 1] : null
  const inRust = laatste !== null && dagenSinds(laatste) < MIN_DAGEN_TUSSEN_STAPPEN

  const resultaat: OpvolgStapWeergave[] = [
    { sleutel: 'factuur', label: 'Factuur', dagen: null, gedaanOp: f.verzonden_op ?? f.factuurdatum ?? null, staat: 'gedaan', hint: null },
  ]
  let actiefGevonden = false
  for (const type of ladder) {
    const eigen = stappen.find((s) => s.stap_type === type)
    const dagen = eigen?.dagen_na_vervaldatum ?? STANDAARD_DAGEN[type]
    const gedaanOp = vlag(f, type) || null
    const index = LADDER.indexOf(type)
    if (gedaanOp || index < hoogsteGedaan) {
      resultaat.push({ sleutel: type, label: LABEL[type], dagen, gedaanOp, staat: 'gedaan', hint: null })
      continue
    }
    if (!actiefGevonden) {
      actiefGevonden = true
      let hint: string | null
      if (gepauzeerd) hint = 'gepauzeerd'
      else if (dagenVerlopen >= dagen && !inRust) hint = 'staat klaar'
      else hint = `vanaf ${plusDagen(f.vervaldatum, dagen)}`
      resultaat.push({ sleutel: type, label: LABEL[type], dagen, gedaanOp: null, staat: 'actief', hint })
      continue
    }
    resultaat.push({ sleutel: type, label: LABEL[type], dagen, gedaanOp: null, staat: 'toekomst', hint: null })
  }
  return resultaat
}

const STIP: Record<OpvolgStapWeergave['staat'], string> = {
  gedaan: 'bg-petrol',
  actief: 'bg-background ring-2 ring-flame',
  toekomst: 'bg-muted-foreground/25',
}

interface Props {
  factuur: Factuur
  stappen: FactuurOpvolgStap[]
  klant?: Klant | null
  /** Alleen stipjes, voor in een lijstkolom. */
  compact?: boolean
  className?: string
}

export function FactuurOpvolgStepper({ factuur, stappen, klant, compact, className }: Props) {
  const items = berekenOpvolgStappen(factuur, stappen, klant)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)} aria-label="Opvolgstappen">
        {items.map((s) => (
          <span
            key={s.sleutel}
            className={cn('inline-block w-1.5 h-1.5 rounded-full', STIP[s.staat])}
            title={
              s.staat === 'gedaan' && s.gedaanOp
                ? `${s.label}, ${new Date(s.gedaanOp).toLocaleDateString('nl-NL')}`
                : s.hint ? `${s.label}, ${s.hint}` : s.label
            }
          />
        ))}
      </div>
    )
  }

  return (
    <ol className={cn('flex items-start gap-0 overflow-x-auto', className)} aria-label="Opvolgstappen">
      {items.map((s, i) => (
        <li key={s.sleutel} className="flex items-start min-w-0">
          <div className="flex flex-col items-center min-w-[72px] md:min-w-[88px]">
            <div className="flex items-center w-full">
              <span className={cn('h-px flex-1', i === 0 ? 'bg-transparent' : items[i - 1].staat === 'gedaan' ? 'bg-petrol/60' : 'bg-border')} />
              <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', STIP[s.staat])} />
              <span className={cn('h-px flex-1', i === items.length - 1 ? 'bg-transparent' : s.staat === 'gedaan' ? 'bg-petrol/60' : 'bg-border')} />
            </div>
            <span
              className={cn(
                'mt-1.5 text-[11px] leading-tight text-center whitespace-nowrap',
                s.staat === 'gedaan' && 'text-petrol dark:text-[#5AABB5] font-semibold',
                s.staat === 'actief' && 'text-foreground font-semibold',
                s.staat === 'toekomst' && 'text-muted-foreground/60',
              )}
            >
              {s.label}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground whitespace-nowrap">
              {s.staat === 'gedaan' && s.gedaanOp
                ? new Date(s.gedaanOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                : s.staat === 'actief'
                  ? <span className={cn(s.hint === 'staat klaar' && 'text-flame font-semibold')}>{s.hint}</span>
                  : s.dagen !== null ? `${s.dagen}d` : ''}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
