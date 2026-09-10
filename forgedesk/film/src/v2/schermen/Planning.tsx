import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppVenster } from '../DesktopChrome'
import { klant, project, montage } from '../../mockData'
import { moduleKleur } from '../../brand'
import { ease, veer, vlak } from '../../tijd'

// Montageplanning op desktop, weekweergave: zijbalk "Te plannen" uit
// MontagePlanningLayout, raster en blokken uit MontageTijdlijnView. Die
// hangen aan drag-and-drop en Supabase, vandaar deze nabouw met dezelfde
// klassen. Alle maten staan vast zodat de sleep uit t te berekenen is.
export type PlanningStand = { sleepOp: number; landOp: number }

const ZIJ_B = 260
const ZIJ_KOP_H = 44
const PLAN_KOP_H = 40
const TOOLBAR_H = 44
const UREN_B = 48
const DAG_B = 212
const DAG_KOP_H = 52
const UUR_H = 84
const UREN = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const DAGEN = [['ma', 21], ['di', 22], ['wo', 23], ['do', 24], ['vr', 25]] as const

const KAART_H_PROJECT = 64
const KAART_H = 48
const KAART_B = ZIJ_B - 12

const planning = moduleKleur('planning')

type Blok = { dag: number; van: number; tot: number; titel: string; context: string; monteur: string }
const AFSPRAKEN: Blok[] = [
  { dag: 0, van: 9, tot: 12, titel: 'Lichtreclame showroom', context: 'Autobedrijf Smit · Harderwijk', monteur: 'Kees' },
  { dag: 2, van: 13, tot: 16, titel: 'Belettering bestelbus', context: 'Installatiebedrijf Vos · Ermelo', monteur: 'Kees' },
]

const TE_PLANNEN = [
  { naam: 'Raambelettering bakkerij', klant: 'Bakkerij Hendriks', wacht: '4d' },
  { naam: 'Bewegwijzering sporthal', klant: 'Gemeente Ermelo', wacht: '12d' },
]

const tijd = (u: number) => `${String(u).padStart(2, '0')}:00`

const Stip: React.FC<{ prio?: boolean }> = ({ prio }) => (
  <span className="mt-[1px] flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-[rgba(26,83,92,0.4)] text-muted-foreground">
    <span className={`h-[3px] w-[3px] rounded-full ${prio ? 'bg-flame' : 'bg-current opacity-55'}`} />
  </span>
)

const KaartInhoud: React.FC<{ naam: string; klant: string; wacht: string }> = ({ naam, klant: klantNaam, wacht }) => (
  <div className="pr-5 grid grid-cols-[14px_minmax(0,1fr)] gap-x-[9px] items-start" style={{ padding: '8px 10px 8px 12px' }}>
    <span className="mt-[3px]"><Stip /></span>
    <div className="min-w-0">
      <div className="text-[12.5px] font-semibold leading-[1.3] text-[#1A535C]">{naam}</div>
      <div className="flex items-baseline gap-1.5 mt-[1px]">
        <span className="text-[11px] leading-[1.35] text-[#1A535C]/60 truncate">{klantNaam}</span>
        <span className="ml-auto shrink-0 text-[10px] font-mono tabular-nums text-muted-foreground/70">{wacht}</span>
      </div>
    </div>
  </div>
)

const TijdBlok: React.FC<{ titel: string; regels: string[]; hoogte: number; accent: string }> = ({ titel, regels, hoogte, accent }) => (
  <div className="overflow-hidden rounded-[10px] bg-card border border-[rgba(26,83,92,0.10)] shadow-[0_1px_2px_rgba(130,100,60,0.06)]" style={{ height: hoogte, borderLeft: `2px solid ${accent}` }}>
    <div className="flex gap-[9px] px-2.5 py-2">
      <Stip />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[12.5px] font-semibold leading-[1.3] text-[#1A535C]">{titel}</div>
        {regels.map((r) => <div key={r} className="mt-[1px] truncate text-[11px] leading-[1.35] text-[#1A535C]/60">{r}</div>)}
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 flex h-2.5 items-center justify-center"><span className="h-[3px] w-7 rounded-full bg-[#C0BDB8] opacity-0" /></div>
  </div>
)

export const Planning: React.FC<{ t: number; stand: PlanningStand }> = ({ t, stand }) => {
  const { sleepOp, landOp } = stand
  const sleept = t >= sleepOp && t < landOp
  const geland = t >= landOp
  const p = vlak(t, sleepOp, landOp, ease.inUit)
  const lift = Math.min(vlak(t, sleepOp, sleepOp + 220), 1 - vlak(t, landOp - 160, landOp, ease.in))

  // Startplek: de kaart in de zijbalk. Doel: donderdag 08:00.
  const startX = 6
  const startY = ZIJ_KOP_H + PLAN_KOP_H + 4
  const doelX = ZIJ_B + 1 + UREN_B + 3 * (DAG_B + 1) + 2
  const doelY = TOOLBAR_H + DAG_KOP_H + (8 - 7) * UUR_H
  const doelB = DAG_B - 4
  const ghostX = startX + (doelX - startX) * p
  const ghostY = startY + (doelY - startY) * p
  const ghostB = KAART_B + (doelB - KAART_B) * p
  const slotH = KAART_H_PROJECT * (1 - vlak(t, landOp, landOp + 320))
  const landing = sleept && p > 0.55
  const landVeer = veer(t, landOp, { demping: 15, duurMs: 500 })
  const aantalTePlannen = geland ? 2 : 3
  const dezeWeek = geland ? 3 : 2

  const rasterH = (UREN.length - 1) * UUR_H
  return (
    <AppVenster actief="Planning" moduleTitel="Planning" tabs={[{ label: 'Email' }, { label: klant.bedrijfsnaam }, { label: 'Planning', actief: true }]}>
      <div className="absolute inset-0 flex overflow-hidden">
        {/* Zijbalk Te plannen */}
        <aside className="flex-shrink-0 flex flex-col border-r border-border bg-background" style={{ width: ZIJ_B }}>
          <div className="flex items-center justify-between px-3 border-b border-border" style={{ height: ZIJ_KOP_H }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Deze week</span>
              <span className="text-[12px] font-mono tabular-nums text-foreground">{dezeWeek}</span>
            </div>
            <span className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground"><ChevronLeft className="h-4 w-4" /></span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 flex items-center justify-between border-l-2 border-l-petrol shrink-0" style={{ height: PLAN_KOP_H }}>
              <h2 className="text-[11px] font-bold text-flame uppercase tracking-wider">Te plannen</h2>
              <span className="text-[11px] font-bold flex items-center justify-center rounded-full bg-[#FDE8E2] text-flame" style={{ minWidth: 22, height: 22, padding: '0 7px' }}>{aantalTePlannen}</span>
            </div>
            <div className="px-1.5 py-1 flex flex-col">
              {/* Onze projectkaart; tijdens het slepen blijft hij als schim staan, na de landing klapt het slot dicht. */}
              <div className="overflow-hidden" style={{ height: slotH }}>
                <div data-doel="planning-kaart" className="relative w-full border-l-2 border-l-transparent rounded-lg select-none" style={{ height: KAART_H_PROJECT, opacity: t >= sleepOp ? 0.4 : 1 }}>
                  <KaartInhoud naam={project.naam} klant={klant.bedrijfsnaam} wacht="1d" />
                </div>
              </div>
              {TE_PLANNEN.map((k) => (
                <div key={k.naam} className="relative w-full border-l-2 border-l-transparent rounded-lg shadow-[inset_0_1px_0_hsl(var(--border)/0.55)]" style={{ height: KAART_H }}>
                  <KaartInhoud naam={k.naam} klant={k.klant} wacht={k.wacht} />
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 py-2.5 border-t border-border text-[11px] text-foreground/70 space-y-0.5">
            <div><span className="font-mono tabular-nums">{dezeWeek}</span> montages<span className="text-flame">.</span></div>
            <div><span className="font-mono tabular-nums">1</span> beschikbaar<span className="text-flame">.</span></div>
          </div>
        </aside>

        {/* Week */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-3 px-4 border-b border-border/60 flex-shrink-0" style={{ height: TOOLBAR_H }}>
            <span className="flex items-center gap-1 text-[14px] font-semibold text-petrol">Iedereen <ChevronDown className="h-4 w-4 opacity-50" /></span>
            <span className="h-4 w-px bg-[rgba(26,83,92,0.12)]" />
            <span className="flex items-center gap-0.5">
              <ChevronLeft className="h-4 w-4 text-muted-foreground mx-1" />
              <span className="px-2 py-0.5 rounded-md text-[13px] font-semibold text-foreground"><span className="text-muted-foreground font-medium mr-1.5">wk 39</span>21 – 25 sep</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            </span>
            <span className="flex-1" />
            <span className="flex items-center gap-1 text-muted-foreground"><span className="px-1 text-[11px]">A</span><span className="px-1 text-[13px] font-medium">A</span></span>
            <span className="flex rounded-lg bg-[hsl(38,20%,95.5%)] p-0.5 text-[12px]">
              <span className="px-2.5 py-1 rounded-md font-medium bg-white text-petrol shadow-sm">Week</span>
              <span className="px-2.5 py-1 rounded-md font-medium text-muted-foreground">Maand</span>
            </span>
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-flame shadow-[0_1px_3px_rgba(210,70,32,0.25)]"><Plus className="h-3.5 w-3.5" strokeWidth={2.5} />Montage</span>
          </div>

          <div className="planning-tijdlijn flex flex-1 min-h-0">
            {/* Urenkolom */}
            <div className="flex-shrink-0 select-none" style={{ width: UREN_B, paddingTop: DAG_KOP_H }}>
              <div className="relative" style={{ height: rasterH }}>
                {UREN.map((u, i) => (
                  <span key={u} className="absolute right-2 text-[10px] font-medium tabular-nums text-muted-foreground/45" style={{ top: i * UUR_H - 6 }}>{tijd(u)}</span>
                ))}
              </div>
            </div>
            {/* Dagkolommen */}
            <div className="flex gap-px">
              {DAGEN.map(([naam, dag], i) => {
                const blokken = AFSPRAKEN.filter((a) => a.dag === i)
                const aantal = blokken.length + (i === 3 && geland ? 1 : 0)
                return (
                  <div key={naam} className="flex-shrink-0" style={{ width: DAG_B }}>
                    <div className="relative flex items-center gap-2.5 bg-background px-3" style={{ height: DAG_KOP_H }}>
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-border/40" />
                      <span className="relative flex items-baseline gap-[7px]">
                        <span className="text-[11px] font-medium lowercase text-muted-foreground/70">{naam}</span>
                        <span className="text-[17px] font-semibold tracking-[-0.02em] tabular-nums text-foreground/90">{dag}</span>
                      </span>
                      {aantal > 0 && (
                        <span className="relative ml-auto inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-foreground/[0.055] px-[6px] text-[10.5px] font-semibold tabular-nums text-muted-foreground">{aantal}</span>
                      )}
                      {aantal > 0 && (
                        <span className="absolute inset-x-3 bottom-[7px] h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]"><span className="block h-full rounded-full bg-petrol/40" style={{ width: '0%' }} /></span>
                      )}
                    </div>
                    <div className="relative border-l border-border/40" style={{ height: rasterH }}>
                      {UREN.slice(0, -1).map((u, idx) => (
                        <div key={u} className="pointer-events-none">
                          <div className="absolute inset-x-0 border-t border-border/30" style={{ top: idx * UUR_H }} />
                          <div className="absolute inset-x-0 border-t border-border/[0.12]" style={{ top: idx * UUR_H + UUR_H / 2 }} />
                        </div>
                      ))}
                      {blokken.map((a) => (
                        <div key={a.titel} className="absolute" style={{ top: (a.van - 7) * UUR_H, left: 2, width: DAG_B - 4 }}>
                          <TijdBlok titel={a.titel} regels={[a.context, `${tijd(a.van)} - ${tijd(a.tot)} · ${a.monteur}`]} hoogte={(a.tot - a.van) * UUR_H} accent={planning.kleur} />
                        </div>
                      ))}
                      {i === 3 && (
                        <div data-doel="planning-donderdag" className="absolute" style={{ top: UUR_H, left: 2, width: DAG_B - 4, height: 4 * UUR_H }}>
                          {landing && (
                            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 border-t-2 border-dashed border-flame">
                              <span className="absolute -top-[9px] left-1 rounded bg-flame px-1 py-[1px] text-[10px] font-semibold tabular-nums text-white">08:00</span>
                            </div>
                          )}
                          {geland && (
                            <div className="relative" style={{ transform: `scale(${0.96 + 0.04 * landVeer})`, transformOrigin: 'top center', opacity: vlak(t, landOp, landOp + 120) }}>
                              <TijdBlok titel={montage.titel} regels={[klant.bedrijfsnaam, `${montage.start_tijd} - ${montage.eind_tijd} · ${montage.monteurs[0]}`]} hoogte={4 * UUR_H} accent={planning.kleur} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* De gesleepte kaart, boven alles, in de coördinaten van het scherm. */}
        {sleept && (
          <div
            className="absolute z-50 rounded-lg bg-card pointer-events-none"
            style={{
              left: ghostX, top: ghostY, width: ghostB, height: KAART_H_PROJECT,
              transform: `scale(${1 + 0.03 * lift}) rotate(${2 * lift}deg)`,
              transformOrigin: '20px 20px',
              boxShadow: `0 ${4 + 10 * lift}px ${10 + 20 * lift}px rgba(0,0,0,${0.08 + 0.12 * lift}), 0 0 0 1px rgba(26,83,92,0.10)`,
              opacity: 0.97,
            }}
          >
            <KaartInhoud naam={project.naam} klant={klant.bedrijfsnaam} wacht="1d" />
          </div>
        )}
      </div>
    </AppVenster>
  )
}
