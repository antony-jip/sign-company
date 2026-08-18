import { useState } from 'react'
import { CheckCircle2, ChevronRight, MapPin, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MontageAfspraak, Taak } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// PLANNING · STAPEL
//
// Het uurraster tekende een etmaal uit voor vijf afspraken per dag: van 06:00
// tot diep in de middag stond de kolom grotendeels leeg. Deze weergave houdt de
// hele week in beeld — dat is waar een planner naar kijkt — maar zet elke dag
// als geordende stapel neer in plaats van op schaal.
//
// De tijd raakt niet kwijt: die verhuist naar een rail links van de kaart. Zo
// lees je de dag nog steeds op volgorde en zie je nog steeds wanneer iets
// begint, zonder dat lege uren hoogte kosten.
//
// Eén bewuste afwijking van de stapel in Taken: een lege dag klapt hier níet
// in. In Taken is een lege dag niets; in Planning is het vrije capaciteit, en
// dat is precies wat een planner zoekt.
// ─────────────────────────────────────────────────────────────────────────────

// Zelfde afkortingen als de stapel in Taken · een volle dagnaam in dezelfde
// kleine, getrackte kop leest als een ander scherm.
const DAG_NAMEN = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']

function kortTijd(t?: string): string {
  return t ? t.slice(0, 5) : ''
}

export interface StapelProps {
  weekDates: Date[]
  datumSleutel: (d: Date) => string
  afsprakenPerDag: Record<string, MontageAfspraak[]>
  takenPerDag: Record<string, Taak[]>
  vandaagSleutel: string
  /** Accentkleur voor de linkerrand · status, of flame bij prioriteit. */
  accentKleur: (a: MontageAfspraak) => string
  conflictIds: Set<string>
  sleepId: string | null
  onSleepStart: (id: string) => void
  onSleepEnd: () => void
  onDropOpDag: (afspraakId: string, datum: string) => void
  onOpen: (a: MontageAfspraak) => void
  onAfronden: (a: MontageAfspraak) => void
  onTerugzetten: (a: MontageAfspraak) => void
  onNieuwOpDag: (datum: string) => void
  monteurLabel: (a: MontageAfspraak) => string
  /** Filter je op één monteur, dan staat diens naam op élke kaart · dat is
   *  ruis. Dan tonen we hem alleen als er meer dan één op de klus zit. */
  toonMonteurs: boolean
  /** Feestdag of vrije dag · dan is er geen capaciteit te vergeven. */
  gesloten?: (datum: string) => string | null
}

export function MontageStapelView({
  weekDates, datumSleutel, afsprakenPerDag, takenPerDag, vandaagSleutel,
  accentKleur, conflictIds, sleepId, onSleepStart, onSleepEnd, onDropOpDag,
  onOpen, onAfronden, onTerugzetten, onNieuwOpDag, monteurLabel, toonMonteurs, gesloten,
}: StapelProps) {
  // Afgerond staat dicht · een dag waarop zes montages klaar zijn is juist een
  // rustige dag, en die hoort niet de langste kolom op het scherm te zijn.
  const [afgerondOpen, setAfgerondOpen] = useState<Set<string>>(new Set())

  return (
    <div className="doen-stapel planning-stapel">
      {weekDates.map((datum, i) => {
        const sleutel = datumSleutel(datum)
        const afspraken = afsprakenPerDag[sleutel] || []
        const taken = takenPerDag[sleutel] || []
        const dicht = gesloten?.(sleutel) ?? null
        const isVandaag = sleutel === vandaagSleutel
        const open = afspraken.filter((a) => a.status !== 'afgerond')
        const afgerond = afspraken.filter((a) => a.status === 'afgerond')

        return (
          <section
            key={sleutel}
            className={cn('stapel-dag', isVandaag && 'is-vandaag', dicht && 'is-gesloten')}
            onDragOver={(e) => { if (!dicht) e.preventDefault() }}
            onDrop={(e) => {
              if (dicht) return
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || sleepId
              if (id) onDropOpDag(id, sleutel)
            }}
          >
            <header className="stapel-kop">
              <span className="stapel-dagnaam">
                {DAG_NAMEN[i]}{isVandaag && <span className="stapel-punt">.</span>}
              </span>
              <span className="stapel-datum">{datum.getDate()}</span>
              {open.length > 0 && (
                <span className="stapel-uren" title={`${open.length} ingepland`}>{open.length}</span>
              )}
              <button
                className="stapel-plus"
                title="Montage inplannen op deze dag"
                onClick={() => onNieuwOpDag(sleutel)}
                disabled={!!dicht}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="stapel-lijst">
              {open.map((a) => (
                <MontageKaart
                  key={a.id}
                  afspraak={a}
                  accent={accentKleur(a)}
                  conflict={conflictIds.has(a.id)}
                  sleept={sleepId === a.id}
                  monteurs={monteurLabel(a)}
                  toonMonteurs={toonMonteurs || a.monteurs.length > 1}
                  onSleepStart={() => onSleepStart(a.id)}
                  onSleepEnd={onSleepEnd}
                  onOpen={() => onOpen(a)}
                  onAfronden={() => onAfronden(a)}
                />
              ))}

              {/* Taken met een deadline op deze dag · ze staan niet in de
                  planning, maar ze leggen wel beslag op de dag. */}
              {taken.map((t) => (
                <div key={t.id} className="stapel-taakregel" title="Taak uit Taken · deadline op deze dag">
                  <span className="stapel-taakstip" />
                  {t.titel}
                </div>
              ))}

              {dicht ? (
                <p className="stapel-gesloten">{dicht}</p>
              ) : open.length === 0 && (
                afgerond.length > 0
                  /* Zes montages afgerond is geen vrije dag · dat is een dag
                     die af is. */
                  ? <p className="stapel-klaar">Klaar<span className="stapel-punt">.</span></p>
                  /* Een écht lege dag is ruimte, geen leegte · maar hij zegt
                     dat in dezelfde vorm als "Klaar.", niet in een gestippeld
                     blok dat verder nergens op het scherm voorkomt. De hele
                     kolom eronder is de klikruimte. */
                  : <p className="stapel-vrij">Vrij<span className="stapel-punt">.</span></p>
              )}
            </div>

            {afgerond.length > 0 && (
              <div className="stapel-afgerond">
                <button
                  className="stapel-afgerond-kop"
                  onClick={() => setAfgerondOpen((p) => {
                    const n = new Set(p)
                    if (n.has(sleutel)) n.delete(sleutel); else n.add(sleutel)
                    return n
                  })}
                >
                  <ChevronRight className={cn('w-3 h-3 transition-transform', afgerondOpen.has(sleutel) && 'rotate-90')} />
                  {afgerond.length} afgerond
                </button>
                {afgerondOpen.has(sleutel) && afgerond.map((a) => (
                  /* Afgerond is naslag, geen werk · één regel per montage,
                     niet nog een kaart. De doorhaling is ook gemaakt voor één
                     regel: over twee regels landt hij ertussenin. */
                  <div
                    key={a.id}
                    className="stapel-afregel"
                    onClick={() => onOpen(a)}
                    title={[a.titel, a.klant_naam].filter(Boolean).join(' · ')}
                  >
                    <span className="stapel-afregel-tijd">{kortTijd(a.start_tijd)}</span>
                    <span className="stapel-afregel-tekst">
                      <span className="taak-af-titel">{a.titel}</span>
                      {a.klant_naam && <span className="stapel-afregel-klant">{a.klant_naam}</span>}
                    </span>
                    <button
                      className="stapel-afregel-terug"
                      title="Terugzetten op gepland"
                      onClick={(e) => { e.stopPropagation(); onTerugzetten(a) }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* De klikruimte staat ná afgerond · stond hij ervoor, dan werd de
                afgerond-sectie naar de voet van de kolom geduwd en gaapte er
                900px niets tussen de dag en zijn eigen afgeronde werk. */}
            <button
              className="stapel-vulling"
              aria-label={`Montage inplannen op ${DAG_NAMEN[i]} ${datum.getDate()}`}
              onClick={() => !dicht && onNieuwOpDag(sleutel)}
            />
          </section>
        )
      })}
    </div>
  )
}

function MontageKaart({
  afspraak, accent, conflict, sleept, monteurs, toonMonteurs,
  onSleepStart, onSleepEnd, onOpen, onAfronden,
}: {
  afspraak: MontageAfspraak
  accent: string
  conflict: boolean
  sleept: boolean
  monteurs: string
  toonMonteurs: boolean
  onSleepStart: () => void
  onSleepEnd: () => void
  onOpen: () => void
  onAfronden: () => void
}) {
  const context = afspraak.klant_naam || ''

  return (
    <article
      className={cn('stapel-kaart', sleept && 'is-sleept', conflict && 'heeft-conflict')}
      style={{ borderLeftColor: accent }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', afspraak.id)
        onSleepStart()
      }}
      onDragEnd={onSleepEnd}
      onClick={onOpen}
      title={[afspraak.titel, afspraak.klant_naam, afspraak.locatie, monteurs].filter(Boolean).join('\n')}
    >
      {/* De tijd is de rail die het uurraster vervangt · begin bovenaan, eind
          eronder in lichter grijs, zodat de duur afleesbaar blijft. */}
      <span className="stapel-tijd">
        {kortTijd(afspraak.start_tijd)}
        {afspraak.eind_tijd && <span className="stapel-tijd-eind">{kortTijd(afspraak.eind_tijd)}</span>}
      </span>

      <div className="stapel-tekst">
        <h3 className="stapel-titel">{afspraak.titel}</h3>
        {context && (
          <p className="stapel-context">
            {afspraak.locatie && <MapPin className="stapel-pin" />}
            {context}
          </p>
        )}
        {toonMonteurs && monteurs && <p className="stapel-monteurs">{monteurs}</p>}
      </div>

      <div className="stapel-acties">
        <button
          className="stapel-actie"
          title="Markeer als afgerond"
          onClick={(e) => { e.stopPropagation(); onAfronden() }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  )
}
