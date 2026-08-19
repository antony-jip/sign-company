import { useState, useRef, useMemo, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { MontageAfspraak, Taak } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// PLANNING · TIJDLIJN
//
// Het uurraster is er eerder uit gegaan omdat het een etmaal uittekende voor
// vijf afspraken. Deze weergave houdt de tijdas, maar toont alleen de werkdag
// (07:00–18:00) en rekt alleen op wanneer er écht iets buiten valt. Zo kost een
// lege nacht geen hoogte meer, en betekent de hoogte van een blok weer iets:
// een montage van vier uur is vier uur hoog en je trekt hem langer aan de rand.
//
// De stapel blijft bestaan naast deze weergave. Bij een rustige week leest die
// prettiger; bij een volle dag is dit raster het enige dat overlap laat zien.
// ─────────────────────────────────────────────────────────────────────────────

const DAG_NAMEN = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']
const BASIS_UUR_HOOGTE = 56
const DEFAULT_START_UUR = 7
const DEFAULT_EIND_UUR = 18
const SNAP_MINUTEN = 15
const NOTITIE_HOOGTE = 24
const MIN_DUUR_MINUTEN = 15

function naarMinuten(t?: string | null): number | null {
  if (!t) return null
  const [u, m] = t.split(':')
  const uren = Number(u)
  const min = Number(m)
  if (!Number.isFinite(uren) || !Number.isFinite(min)) return null
  return uren * 60 + min
}

function naarTijd(minuten: number): string {
  const geklemd = Math.max(0, Math.min(24 * 60 - 1, Math.round(minuten)))
  return `${String(Math.floor(geklemd / 60)).padStart(2, '0')}:${String(geklemd % 60).padStart(2, '0')}`
}

function snap(minuten: number): number {
  return Math.round(minuten / SNAP_MINUTEN) * SNAP_MINUTEN
}

/** Begin en eind van een afspraak in minuten. Zonder eindtijd rekenen we een
 *  uur: een blok zonder hoogte is in een tijdlijn onzichtbaar. */
export function spanVan(a: MontageAfspraak): { start: number; eind: number } | null {
  const start = naarMinuten(a.start_tijd)
  if (start === null) return null
  const eind = naarMinuten(a.eind_tijd)
  return { start, eind: eind !== null && eind > start ? eind : start + 60 }
}

/** Overlappende afspraken naast elkaar. Wie een vrije baan vindt pakt die, dus
 *  twee klussen die elkaar niet raken blijven allebei op volle breedte. */
export function verdeelInBanen(afspraken: MontageAfspraak[]): Map<string, { baan: number; banen: number }> {
  const resultaat = new Map<string, { baan: number; banen: number }>()
  const gesorteerd = [...afspraken].sort((a, b) => (spanVan(a)?.start ?? 0) - (spanVan(b)?.start ?? 0))

  let groep: MontageAfspraak[] = []
  let groepEind = -1

  function sluitGroep() {
    if (groep.length === 0) return
    const baanEindes: number[] = []
    for (const a of groep) {
      const span = spanVan(a)!
      let baan = baanEindes.findIndex((eind) => eind <= span.start)
      if (baan === -1) { baan = baanEindes.length; baanEindes.push(span.eind) }
      else baanEindes[baan] = span.eind
      resultaat.set(a.id, { baan, banen: 0 })
    }
    for (const a of groep) {
      const huidig = resultaat.get(a.id)!
      resultaat.set(a.id, { ...huidig, banen: baanEindes.length })
    }
    groep = []
    groepEind = -1
  }

  for (const a of gesorteerd) {
    const span = spanVan(a)
    if (!span) continue
    if (groep.length > 0 && span.start >= groepEind) sluitGroep()
    groep.push(a)
    groepEind = Math.max(groepEind, span.eind)
  }
  sluitGroep()
  return resultaat
}

export interface TijdlijnProps {
  weekDates: Date[]
  datumSleutel: (d: Date) => string
  afsprakenPerDag: Record<string, MontageAfspraak[]>
  takenPerDag: Record<string, Taak[]>
  vandaagSleutel: string
  accentKleur: (a: MontageAfspraak) => string
  conflictIds: Set<string>
  sleepId: string | null
  onSleepStart: (id: string) => void
  onSleepEnd: () => void
  /** Verplaatsen naar een dag én tijdstip · de duur blijft intact. */
  onDropOpTijd: (afspraakId: string, datum: string, startTijd: string) => void
  /** Rekken aan de onderrand · alleen de eindtijd verschuift. */
  onDuurWijzigen: (afspraak: MontageAfspraak, eindTijd: string) => void
  onOpen: (a: MontageAfspraak) => void
  onNieuwOpTijd: (datum: string, startTijd: string) => void
  monteurLabel: (a: MontageAfspraak) => string
  toonMonteurs: boolean
  gesloten?: (datum: string) => string | null
  /** Dagnotitie onder de dagkop · de popover leeft in de layout, wij geven hem
   *  alleen een vaste plek met een vaste hoogte. */
  renderDagNotitie?: (datum: string) => ReactNode
  zoom?: number
}

export function MontageTijdlijnView({
  weekDates, datumSleutel, afsprakenPerDag, takenPerDag, vandaagSleutel,
  accentKleur, conflictIds, sleepId, onSleepStart, onSleepEnd,
  onDropOpTijd, onDuurWijzigen, onOpen, onNieuwOpTijd,
  monteurLabel, toonMonteurs, gesloten, renderDagNotitie, zoom = 100,
}: TijdlijnProps) {
  const uurHoogte = BASIS_UUR_HOOGTE * (zoom / 100)
  const [rekken, setRekken] = useState<{ id: string; eindMinuten: number } | null>(null)
  const [nuMinuten, setNuMinuten] = useState(() => {
    const nu = new Date()
    return nu.getHours() * 60 + nu.getMinutes()
  })
  const rekRef = useRef<{ afspraak: MontageAfspraak; startY: number; origEind: number; startMin: number } | null>(null)

  useEffect(() => {
    const tik = setInterval(() => {
      const nu = new Date()
      setNuMinuten(nu.getHours() * 60 + nu.getMinutes())
    }, 60_000)
    return () => clearInterval(tik)
  }, [])

  // Venster: de werkdag, opgerekt tot alles wat erbuiten valt er toch in past.
  // Zonder die oprekking zou een avondklus stil van het scherm verdwijnen.
  const { vensterStart, vensterEind } = useMemo(() => {
    let vroegste = DEFAULT_START_UUR * 60
    let laatste = DEFAULT_EIND_UUR * 60
    for (const datum of weekDates) {
      for (const a of afsprakenPerDag[datumSleutel(datum)] || []) {
        const span = spanVan(a)
        if (!span) continue
        vroegste = Math.min(vroegste, Math.floor(span.start / 60) * 60)
        laatste = Math.max(laatste, Math.ceil(span.eind / 60) * 60)
      }
    }
    return { vensterStart: vroegste, vensterEind: laatste }
  }, [weekDates, afsprakenPerDag, datumSleutel])

  const uren = useMemo(() => {
    const lijst: number[] = []
    for (let m = vensterStart; m < vensterEind; m += 60) lijst.push(m)
    return lijst
  }, [vensterStart, vensterEind])

  const rasterHoogte = ((vensterEind - vensterStart) / 60) * uurHoogte

  // Taken hebben geen tijdstip en staan in een strook boven het raster. Die
  // strook is in élke kolom even hoog, ook de lege: anders zakt een kolom met
  // taken weg ten opzichte van de uren-as ernaast en klopt geen enkele lijn.
  const notitieHoogte = renderDagNotitie ? NOTITIE_HOOGTE : 0
  const takenBandHoogte = useMemo(() => {
    const meeste = Math.max(0, ...weekDates.map((d) => (takenPerDag[datumSleutel(d)] || []).length))
    return meeste === 0 ? 0 : meeste * 18 + 8
  }, [weekDates, takenPerDag, datumSleutel])

  function minutenUitPositie(el: HTMLElement, clientY: number): number {
    const rect = el.getBoundingClientRect()
    const offset = clientY - rect.top
    return Math.max(vensterStart, Math.min(vensterEind - SNAP_MINUTEN, snap(vensterStart + (offset / uurHoogte) * 60)))
  }

  function startRekken(e: React.PointerEvent, afspraak: MontageAfspraak) {
    e.preventDefault()
    e.stopPropagation()
    const span = spanVan(afspraak)
    if (!span) return
    rekRef.current = { afspraak, startY: e.clientY, origEind: span.eind, startMin: span.start }
    setRekken({ id: afspraak.id, eindMinuten: span.eind })

    function bijBewegen(ev: PointerEvent) {
      const ref = rekRef.current
      if (!ref) return
      const deltaMinuten = ((ev.clientY - ref.startY) / uurHoogte) * 60
      const nieuw = Math.max(ref.startMin + MIN_DUUR_MINUTEN, Math.min(24 * 60, snap(ref.origEind + deltaMinuten)))
      setRekken({ id: ref.afspraak.id, eindMinuten: nieuw })
    }

    function bijLoslaten() {
      window.removeEventListener('pointermove', bijBewegen)
      window.removeEventListener('pointerup', bijLoslaten)
      const ref = rekRef.current
      rekRef.current = null
      setRekken((huidig) => {
        if (ref && huidig && huidig.eindMinuten !== ref.origEind) {
          onDuurWijzigen(ref.afspraak, naarTijd(huidig.eindMinuten))
        }
        return null
      })
    }

    window.addEventListener('pointermove', bijBewegen)
    window.addEventListener('pointerup', bijLoslaten)
  }

  return (
    <div className="planning-tijdlijn flex overflow-x-auto">
      {/* Urenkolom */}
      <div className="flex-shrink-0 w-12 select-none" style={{ paddingTop: 32 + notitieHoogte + takenBandHoogte }}>
        {uren.map((m) => (
          <div key={m} className="relative" style={{ height: uurHoogte }}>
            <span className="absolute -top-[7px] right-2 text-[10px] font-medium tabular-nums text-muted-foreground/70">
              {naarTijd(m)}
            </span>
          </div>
        ))}
      </div>

      {/* Dagkolommen */}
      <div className="flex flex-1 min-w-[640px] gap-px">
        {weekDates.map((datum, i) => {
          const sleutel = datumSleutel(datum)
          const afspraken = (afsprakenPerDag[sleutel] || []).filter((a) => spanVan(a) !== null)
          const taken = takenPerDag[sleutel] || []
          const dicht = gesloten?.(sleutel) ?? null
          const isVandaag = sleutel === vandaagSleutel
          const banen = verdeelInBanen(afspraken)

          return (
            <div key={sleutel} className="group flex-1 min-w-[118px]">
              <div className={cn(
                'h-8 flex items-baseline gap-1.5 px-2 border-b border-border/60',
                isVandaag && 'text-flame',
              )}>
                <span className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground">{DAG_NAMEN[i]}</span>
                <span className={cn('text-[13px] font-semibold', isVandaag ? 'text-flame' : 'text-foreground')}>
                  {datum.getDate()}
                </span>
                {dicht && <span className="text-[10px] text-muted-foreground truncate">{dicht}</span>}
              </div>

              {renderDagNotitie && (
                <div className="flex items-start justify-center overflow-hidden" style={{ height: notitieHoogte }}>
                  {renderDagNotitie(sleutel)}
                </div>
              )}

              {takenBandHoogte > 0 && (
                <div
                  className="px-1 py-1 border-b border-border/40 space-y-0.5 overflow-hidden"
                  style={{ height: takenBandHoogte }}
                >
                  {taken.map((t) => (
                    <div key={t.id} className="truncate rounded bg-muted/60 px-1.5 py-0.5 text-[10px] leading-[14px] text-muted-foreground">
                      {t.titel}
                    </div>
                  ))}
                </div>
              )}

              <div
                className={cn(
                  'relative border-l border-border/40',
                  dicht && 'bg-muted/40',
                  isVandaag && 'bg-flame/[0.02]',
                )}
                style={{ height: rasterHoogte }}
                onDragOver={(e) => { if (!dicht) e.preventDefault() }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dicht) return
                  const id = e.dataTransfer.getData('text/plain') || sleepId
                  if (!id) return
                  onDropOpTijd(id, sleutel, naarTijd(minutenUitPositie(e.currentTarget, e.clientY)))
                  onSleepEnd()
                }}
                onClick={(e) => {
                  if (dicht || e.target !== e.currentTarget) return
                  onNieuwOpTijd(sleutel, naarTijd(minutenUitPositie(e.currentTarget, e.clientY)))
                }}
              >
                {uren.map((m, index) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-border/30 pointer-events-none"
                    style={{ top: index * uurHoogte }}
                  />
                ))}

                {isVandaag && nuMinuten >= vensterStart && nuMinuten <= vensterEind && (
                  <div
                    className="absolute inset-x-0 h-px bg-flame pointer-events-none z-20"
                    style={{ top: ((nuMinuten - vensterStart) / 60) * uurHoogte }}
                  >
                    <span className="absolute -left-1 -top-[3px] w-[7px] h-[7px] rounded-full bg-flame" />
                  </div>
                )}

                {afspraken.map((a) => {
                  const span = spanVan(a)!
                  const eind = rekken?.id === a.id ? rekken.eindMinuten : span.eind
                  const top = ((span.start - vensterStart) / 60) * uurHoogte
                  // Ondergrens is de kaart zelf: titelregel plus padding. Lager
                  // knipt de titel weg en dan zegt het blok niets meer.
                  const hoogte = Math.max(32, ((eind - span.start) / 60) * uurHoogte)
                  const plek = banen.get(a.id) || { baan: 0, banen: 1 }
                  const breedte = 100 / plek.banen
                  const isAfgerond = a.status === 'afgerond'
                  const conflict = conflictIds.has(a.id)
                  const ruimteVoorSub = hoogte >= 46
                  const prio = !!a.prioriteit && !isAfgerond
                  const context = [a.klant_naam, a.locatie].filter(Boolean).join(' · ')

                  return (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={(e) => {
                        onSleepStart(a.id)
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', a.id)
                      }}
                      onDragEnd={onSleepEnd}
                      onClick={(e) => { e.stopPropagation(); onOpen(a) }}
                      title={[`${naarTijd(span.start)}–${naarTijd(eind)}`, a.titel, context].filter(Boolean).join(' · ')}
                      className={cn(
                        'group/blok absolute overflow-hidden rounded-[10px] cursor-pointer',
                        'bg-card border border-[rgba(26,83,92,0.10)] dark:border-white/[0.10]',
                        'shadow-[0_1px_2px_rgba(130,100,60,0.06)] hover:shadow-[0_2px_8px_rgba(130,100,60,0.14)]',
                        'transition-shadow',
                        isAfgerond && 'opacity-60',
                        conflict && 'ring-1 ring-[#C03A18]',
                        sleepId === a.id && 'opacity-35',
                      )}
                      style={{
                        top,
                        height: hoogte,
                        left: `calc(${plek.baan * breedte}% + 2px)`,
                        width: `calc(${breedte}% - 4px)`,
                        // Alleen de uitzondering krijgt kleur · met een streep per
                        // status wordt de week een kleurenstaal en valt niets meer op.
                        borderLeft: prio
                          ? '2px solid #F15025'
                          : accentKleur(a) === 'transparent'
                            ? undefined
                            : `2px solid ${accentKleur(a)}`,
                      }}
                    >
                      <div className="flex gap-[9px] px-2.5 py-2">
                        <span
                          className={cn(
                            'mt-[1px] flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px]',
                            isAfgerond
                              ? 'border-petrol bg-petrol text-white'
                              : 'border-[rgba(26,83,92,0.4)] dark:border-white/30 text-muted-foreground',
                          )}
                        >
                          <span className={cn(
                            'h-[3px] w-[3px] rounded-full',
                            prio ? 'bg-flame opacity-100' : 'bg-current opacity-55',
                          )} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            'truncate text-[12.5px] font-semibold leading-[1.3] text-[#1A535C] dark:text-[#CFE3E6]',
                            isAfgerond && 'line-through',
                          )}>
                            {a.titel}
                          </div>
                          {ruimteVoorSub && (
                            <div className="mt-[1px] flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-[11px] leading-[1.35] text-[#1A535C]/60 dark:text-[#CFE3E6]/60">
                                {context || `${naarTijd(span.start)}–${naarTijd(eind)}`}
                              </span>
                              {context && (
                                <span className="flex-shrink-0 text-[11px] tabular-nums leading-[1.35] text-[#1A535C]/45 dark:text-[#CFE3E6]/45">
                                  {naarTijd(span.start)}
                                </span>
                              )}
                            </div>
                          )}
                          {ruimteVoorSub && toonMonteurs && monteurLabel(a) && hoogte >= 64 && (
                            <div className="mt-[1px] truncate text-[11px] leading-[1.35] text-[#1A535C]/45 dark:text-[#CFE3E6]/45">
                              {monteurLabel(a)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rekken verzet alleen de eindtijd · naar boven trekken zou
                          de starttijd verzetten en dat botst met slepen. */}
                      <div
                        onPointerDown={(e) => startRekken(e, a)}
                        onClick={(e) => e.stopPropagation()}
                        title="Sleep om de eindtijd te verzetten"
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize hover:bg-petrol/15"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
