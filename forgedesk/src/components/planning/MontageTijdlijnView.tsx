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
// Het raster loopt door tot in de avond: er wordt 's avonds gewerkt, en je kunt
// niet slepen naar een uur dat niet getekend is. De prijs is een langere kolom,
// en die betalen we met de band hieronder in plaats van met minder uren.
const DEFAULT_START_UUR = 7
const DEFAULT_EIND_UUR = 22
// Binnen deze uren is het gewone werkdag; daarbuiten tint de kolom licht bij,
// zodat een klus die de avond in loopt zichzelf aanwijst zonder dat de avond
// onbruikbaar wordt.
const WERKDAG_START = 8 * 60
const WERKDAG_EIND = 18 * 60
const SNAP_MINUTEN = 15
const NOTITIE_HOOGTE = 24
const KOP_HOOGTE = 52
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
  /** Weer in de dagkop · voor gevelwerk is dat de reden om een dag te verzetten. */
  renderDagWeer?: (datum: string) => ReactNode
  zoom?: number
}

export function MontageTijdlijnView({
  weekDates, datumSleutel, afsprakenPerDag, takenPerDag, vandaagSleutel,
  accentKleur, conflictIds, sleepId, onSleepStart, onSleepEnd,
  onDropOpTijd, onDuurWijzigen, onOpen, onNieuwOpTijd,
  monteurLabel, toonMonteurs, gesloten, renderDagNotitie, renderDagWeer, zoom = 100,
}: TijdlijnProps) {
  const uurHoogte = BASIS_UUR_HOOGTE * (zoom / 100)
  const [rekken, setRekken] = useState<{ id: string; eindMinuten: number } | null>(null)
  // Waar het blok landt als je nu loslaat. Zonder deze lijn sleep je blind:
  // je ziet pas na het loslaten op welk tijdstip het terechtkwam.
  const [landing, setLanding] = useState<{ datum: string; minuten: number } | null>(null)
  // Waar je muis staat in het raster · zonder deze schaduw is niet te zien dat
  // je op een leeg plekje kunt klikken om daar een montage te beginnen.
  const [zweef, setZweef] = useState<{ datum: string; minuten: number } | null>(null)
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
  const toontNu = nuMinuten >= vensterStart && nuMinuten <= vensterEind
    && weekDates.some((d) => datumSleutel(d) === vandaagSleutel)

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
      <div className="flex-shrink-0 w-12 select-none" style={{ paddingTop: KOP_HOOGTE + notitieHoogte + takenBandHoogte }}>
        <div className="relative" style={{ height: rasterHoogte }}>
          {uren.map((m, index) => (
            <span
              key={m}
              className={cn(
                'absolute right-2 text-[10px] font-medium tabular-nums',
                // Het uur waar je nu in zit wijkt voor de klok zelf · twee
                // getallen boven elkaar leest als een fout.
                toontNu && Math.abs(nuMinuten - m) < 30 ? 'opacity-0' : 'text-muted-foreground/45',
              )}
              style={{ top: index * uurHoogte - 6 }}
            >
              {naarTijd(m)}
            </span>
          ))}
          {toontNu && (
            <span
              className="absolute right-1.5 rounded bg-flame px-1 py-[1px] text-[9.5px] font-semibold tabular-nums text-white"
              style={{ top: ((nuMinuten - vensterStart) / 60) * uurHoogte - 8 }}
            >
              {naarTijd(nuMinuten)}
            </span>
          )}
        </div>
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
          const afgerond = afspraken.filter((a) => a.status === 'afgerond').length
          const openAantal = afspraken.length - afgerond
          const voortgang = afspraken.length === 0 ? 0 : afgerond / afspraken.length

          return (
            <div key={sleutel} className="group flex-1 min-w-[118px]">
              {/* Alles van één dag hoort links bij elkaar te staan. Stond het
                  weer rechts uitgelijnd, dan plakte het tegen de dagnaam van de
                  vólgende kolom en las je 22° bij de verkeerde dag. */}
              <div
                className={cn(
                  'relative flex items-center gap-2.5 px-3',
                  // Vandaag krijgt een zachte tint in plaats van nog een lijn ·
                  // scheiding met vlak leest rustiger dan scheiding met randen.
                  isVandaag && 'bg-petrol/[0.045] dark:bg-white/[0.045]',
                )}
                style={{ height: KOP_HOOGTE }}
              >
                <span className="flex items-baseline gap-[7px]">
                  <span className={cn(
                    'text-[11px] font-medium lowercase',
                    isVandaag ? 'text-petrol dark:text-[#CFE3E6]' : 'text-muted-foreground/70',
                  )}>
                    {DAG_NAMEN[i]}
                  </span>

                  {isVandaag ? (
                    <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-petrol text-[13px] font-semibold tracking-[-0.02em] tabular-nums text-white shadow-[0_1px_3px_rgba(26,83,92,0.35)]">
                      {datum.getDate()}
                    </span>
                  ) : (
                    <span className="text-[17px] font-semibold tracking-[-0.02em] tabular-nums text-foreground/90">
                      {datum.getDate()}
                    </span>
                  )}
                </span>

                {renderDagWeer?.(sleutel)}

                {dicht && <span className="truncate text-[10px] text-muted-foreground">{dicht}</span>}

                {openAantal > 0 && (
                  <span
                    title={`${openAantal} open${afgerond > 0 ? `, ${afgerond} afgerond` : ''}`}
                    className="ml-auto inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-foreground/[0.055] px-[6px] text-[10.5px] font-semibold tabular-nums text-muted-foreground"
                  >
                    {openAantal}
                  </span>
                )}

                {/* Voortgang als haarcapsule onderin · ingesprongen en zacht,
                    zodat een afgeronde dag geen streep onder de kop trekt. */}
                {afspraken.length > 0 && (
                  <span aria-hidden className="absolute inset-x-3 bottom-[7px] h-[3px] overflow-hidden rounded-full bg-foreground/[0.06]">
                    <span
                      className="block h-full rounded-full bg-petrol/40 transition-[width] duration-500"
                      style={{ width: `${voortgang * 100}%` }}
                    />
                  </span>
                )}
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
                  dicht && sleepId && 'cursor-not-allowed opacity-60',
                  isVandaag && 'bg-petrol/[0.022] dark:bg-white/[0.022]',
                )}
                style={{ height: rasterHoogte }}
                onDragOver={(e) => {
                  if (dicht) return
                  e.preventDefault()
                  setLanding({ datum: sleutel, minuten: minutenUitPositie(e.currentTarget, e.clientY) })
                }}
                onMouseMove={(e) => {
                  if (dicht || sleepId || rekken) return
                  const minuten = minutenUitPositie(e.currentTarget, e.clientY)
                  setZweef((h) => (h?.datum === sleutel && h.minuten === minuten ? h : { datum: sleutel, minuten }))
                }}
                onMouseLeave={() => setZweef((h) => (h?.datum === sleutel ? null : h))}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                  setLanding((huidig) => (huidig?.datum === sleutel ? null : huidig))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setLanding(null)
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
                {vensterStart < WERKDAG_START && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 bg-foreground/[0.022]"
                    style={{ height: ((WERKDAG_START - vensterStart) / 60) * uurHoogte }}
                  />
                )}
                {vensterEind > WERKDAG_EIND && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/[0.022]"
                    style={{ height: ((vensterEind - WERKDAG_EIND) / 60) * uurHoogte }}
                  />
                )}

                {uren.map((m, index) => (
                  <div key={m} className="pointer-events-none">
                    <div
                      className="absolute inset-x-0 border-t border-border/30"
                      style={{ top: index * uurHoogte }}
                    />
                    {/* Halfuurlijn · geeft het raster ritme en maakt mikken op
                        half twee net zo makkelijk als op twee uur. */}
                    <div
                      className="absolute inset-x-0 border-t border-border/[0.12]"
                      style={{ top: index * uurHoogte + uurHoogte / 2 }}
                    />
                  </div>
                ))}

                {isVandaag && toontNu && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 h-px bg-flame/70"
                    style={{ top: ((nuMinuten - vensterStart) / 60) * uurHoogte }}
                  />
                )}

                {zweef?.datum === sleutel && !landing && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-petrol/35"
                    style={{ top: ((zweef.minuten - vensterStart) / 60) * uurHoogte }}
                  >
                    <span className="absolute -top-[8px] left-1.5 text-[10px] font-medium tabular-nums text-petrol/55">
                      + {naarTijd(zweef.minuten)}
                    </span>
                  </div>
                )}

                {landing?.datum === sleutel && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-dashed border-flame"
                    style={{ top: ((landing.minuten - vensterStart) / 60) * uurHoogte }}
                  >
                    <span className="absolute -top-[9px] left-1 rounded bg-flame px-1 py-[1px] text-[10px] font-semibold tabular-nums text-white">
                      {naarTijd(landing.minuten)}
                    </span>
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
                          de starttijd verzetten en dat botst met slepen. De greep
                          is onzichtbaar tot je het blok aanwijst; zonder dat
                          streepje vindt niemand hem. */}
                      <div
                        onPointerDown={(e) => startRekken(e, a)}
                        onClick={(e) => e.stopPropagation()}
                        title="Sleep om de eindtijd te verzetten"
                        className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-center justify-center"
                      >
                        <span className={cn(
                          'h-[3px] w-7 rounded-full bg-[#C0BDB8] transition-opacity',
                          rekken?.id === a.id ? 'opacity-100' : 'opacity-0 group-hover/blok:opacity-100',
                        )} />
                      </div>

                      {rekken?.id === a.id && (
                        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-petrol px-1 py-[1px] text-[10px] font-semibold tabular-nums text-white">
                          {naarTijd(rekken.eindMinuten)}
                        </span>
                      )}
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
