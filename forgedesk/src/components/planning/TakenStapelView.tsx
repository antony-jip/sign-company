import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Flame, Plus, Trash2, Wrench, ChevronRight } from 'lucide-react'
import { cn, zonderKlantPrefix } from '@/lib/utils'
import type { Taak, MontageAfspraak } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// STAPEL · de dag als geordende stapel in plaats van een uurraster.
//
// De uurposities in doen. zijn in de praktijk geen afspraaktijden maar een
// volgorde: taken staan achter elkaar in blokken zo lang als hun schatting.
// Een etmaal uittekenen kost dan alleen maar hoogte. Deze weergave houdt de
// volgorde vast (en schrijft hem ook terug als tijd, zodat de weekweergave
// hetzelfde blijft zien) maar geeft elke taak evenveel ruimte.
//
// De opmaak leunt op recente CSS: container queries voor de kaartdichtheid,
// :has() voor dag-accenten, @starting-style voor het inkomen van kaarten.
// Zie de blok "TAKEN · STAPEL" in index.css.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']

type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

// Kleine wrapper: de browser mag de wissel animeren, maar nooit ten koste van
// de actie zelf — zonder ondersteuning of bij reduced-motion gebeurt hij direct.
function metOvergang(fn: () => void) {
  const doc = document as DocumentWithVT
  if (typeof doc.startViewTransition !== 'function'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fn()
    return
  }
  doc.startViewTransition(fn).finished.catch(() => { /* afgebroken */ })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function uurUitDeadline(deadline: string | undefined): number | null {
  if (!deadline || !deadline.includes('T')) return null
  const tijd = deadline.split('T')[1]
  if (!tijd) return null
  const [h, m] = tijd.split(':')
  const uur = parseInt(h, 10)
  if (isNaN(uur) || uur < 0 || uur >= 24) return null
  return uur + (parseInt(m || '0', 10) || 0) / 60
}

function duurLabel(uren: number): string | null {
  if (!uren || uren <= 0) return null
  if (uren < 1) return `${Math.round(uren * 60)}m`
  const getal = Number.isInteger(uren) ? String(uren) : uren.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${getal.replace('.', ',')}u`
}

export interface StapelHandlers {
  onToggle: (taak: Taak) => void
  onTogglePrio: (taak: Taak) => void
  onEdit: (taak: Taak) => void
  onDelete: (taak: Taak) => void
  onDrop: (taakId: string, dayIndex: number, hour: number) => void
  onQuickAdd: (day: Date, titel: string) => void
  onSleepChange?: (taakId: string | null) => void
}

interface Props extends StapelHandlers {
  weekDays: Date[]
  today: Date
  tasksByDay: Map<string, Taak[]>
  montageByDay: Map<string, MontageAfspraak[]>
  projectMap: Record<string, string>
  klantMap: Record<string, string>
  projectKlantMap: Record<string, string>
  isLoading?: boolean
}

export function TakenStapelView({
  weekDays, today, tasksByDay, montageByDay,
  projectMap, klantMap, projectKlantMap, isLoading,
  onToggle, onTogglePrio, onEdit, onDelete, onDrop, onQuickAdd, onSleepChange,
}: Props) {
  const [sleepId, setSleepIdRaw] = useState<string | null>(null)
  const setSleepId = useCallback((id: string | null) => {
    setSleepIdRaw(id)
    onSleepChange?.(id)
  }, [onSleepChange])
  const [dropDoel, setDropDoel] = useState<{ dag: number; index: number } | null>(null)
  const [afgerondOpen, setAfgerondOpen] = useState<Set<string>>(new Set())
  const [focus, setFocus] = useState<{ dag: number; index: number } | null>(null)
  const [addDag, setAddDag] = useState<string | null>(null)
  const [addTitel, setAddTitel] = useState('')
  const addRef = useRef<HTMLInputElement>(null)
  // Dagen die de gebruiker zelf openklapte, en dagen die tijdelijk openstaan
  // omdat er een taak boven zweeft. Die laatste vallen vanzelf weer dicht.
  const [handOpen, setHandOpen] = useState<Set<string>>(new Set())
  const [sleepOpen, setSleepOpen] = useState<Set<string>>(new Set())

  const nuUur = useMemo(() => {
    const n = new Date()
    return n.getHours() + n.getMinutes() / 60
  }, [])

  // Per dag: open taken op volgorde, afgeronde apart. Sorteren op de tijd die
  // in de deadline staat — dat is de volgorde die de weekweergave ook tekent.
  const dagen = useMemo(() => weekDays.map((day, dayIndex) => {
    const key = day.toDateString()
    const alle = tasksByDay.get(key) || []
    const sorteer = (a: Taak, b: Taak) => (uurUitDeadline(a.deadline ?? '') ?? 99) - (uurUitDeadline(b.deadline ?? '') ?? 99)
    const open = alle.filter((t) => t.status !== 'klaar').sort(sorteer)
    const afgerond = alle.filter((t) => t.status === 'klaar').sort(sorteer)
    const geschat = open.reduce((som, t) => som + (t.geschatte_tijd > 0 ? t.geschatte_tijd : 0), 0)
    const totaal = open.length + afgerond.length
    const voortgang = totaal > 0 ? Math.round((afgerond.length / totaal) * 100) : 0
    return {
      day, dayIndex, key, open, afgerond, geschat, voortgang,
      montages: montageByDay.get(key) || [],
      isToday: isSameDay(day, today),
      isVerleden: day < today && !isSameDay(day, today),
      isLeeg: open.length === 0 && (montageByDay.get(key) || []).length === 0,
    }
  }), [weekDays, tasksByDay, montageByDay, today])

  // Een week waarin het werk op twee dagen staat gaf de helft van het scherm
  // weg aan lege kolommen. Die klappen terug tot een strook. Ook vandaag, want
  // een lege dag is een lege dag — de strook houdt wel zijn gevulde datum, en
  // een taak die je erboven houdt klapt hem vanzelf open. Staat er nergens
  // werk, dan klapt er niets in: dan keek je alleen nog naar strookjes.
  const heeftWerk = useMemo(() => dagen.some((d) => d.open.length > 0), [dagen])
  const isIngeklapt = useCallback((d: typeof dagen[number]) => (
    heeftWerk && d.isLeeg && !handOpen.has(d.key) && !sleepOpen.has(d.key)
  ), [heeftWerk, handOpen, sleepOpen])

  // Waar een taak tussen twee buren landt, wordt de tijd het midden ertussen.
  // Zo blijft de volgorde die je sleept bewaard zonder dat je hem hoeft in te
  // typen, en blijft de weekweergave dezelfde rij tonen.
  const tijdVoorPositie = useCallback((dagIndex: number, index: number, taakId: string): number => {
    const dag = dagen[dagIndex]
    if (!dag) return 8
    const rij = dag.open.filter((t) => t.id !== taakId)
    const vorige = rij[index - 1]
    const volgende = rij[index]
    const tv = vorige ? uurUitDeadline(vorige.deadline ?? '') : null
    const tn = volgende ? uurUitDeadline(volgende.deadline ?? '') : null
    let uur: number
    if (tv === null && tn === null) uur = 8
    else if (tv === null) uur = Math.max(0, (tn as number) - 0.5)
    else if (tn === null) uur = tv + Math.max(0.5, vorige?.geschatte_tijd || 0.5)
    else uur = (tv + tn) / 2
    return Math.min(23.75, Math.max(0, Math.round(uur * 4) / 4))
  }, [dagen])

  const handleDrop = useCallback((e: React.DragEvent, dagIndex: number, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('text/plain') || sleepId
    setDropDoel(null)
    setSleepId(null)
    if (!id) return
    metOvergang(() => onDrop(id, dagIndex, tijdVoorPositie(dagIndex, index, id)))
  }, [onDrop, sleepId, tijdVoorPositie])

  // Toetsenbord · wie hier de hele dag in zit wil niet voor elke afvink naar de
  // muis grijpen. Pijltjes lopen door de week, spatie vinkt af, n opent een
  // nieuwe taak op de dag waar je staat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const vandaag = dagen.findIndex((d) => d.isToday && d.open.length > 0)
      const dagMetTaken = vandaag >= 0 ? vandaag : dagen.findIndex((d) => d.open.length > 0)
      if (!focus) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'j', 'k'].includes(e.key) && dagMetTaken >= 0) {
          e.preventDefault()
          setFocus({ dag: dagMetTaken, index: 0 })
        }
        return
      }

      const huidige = dagen[focus.dag]
      const taak = huidige?.open[focus.index]

      // Shift + pijl verplaatst de taak zelf · zo plan je een dag opnieuw in
      // zonder de muis erbij te pakken.
      if (e.shiftKey && taak && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const doel = e.key === 'ArrowUp' ? focus.index - 1 : focus.index + 1
          if (doel < 0 || doel > huidige.open.length - 1) return
          metOvergang(() => onDrop(taak.id, focus.dag, tijdVoorPositie(focus.dag, doel, taak.id)))
          setFocus({ ...focus, index: doel })
        } else {
          const richting = e.key === 'ArrowRight' ? 1 : -1
          const doelDag = focus.dag + richting
          if (doelDag < 0 || doelDag >= dagen.length) return
          const positie = dagen[doelDag].open.length
          metOvergang(() => onDrop(taak.id, doelDag, tijdVoorPositie(doelDag, positie, taak.id)))
          setFocus({ dag: doelDag, index: positie })
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j': {
          e.preventDefault()
          const max = (huidige?.open.length ?? 1) - 1
          setFocus({ ...focus, index: Math.min(max, focus.index + 1) })
          break
        }
        case 'ArrowUp':
        case 'k': {
          e.preventDefault()
          setFocus({ ...focus, index: Math.max(0, focus.index - 1) })
          break
        }
        case 'ArrowRight':
        case 'ArrowLeft': {
          e.preventDefault()
          const richting = e.key === 'ArrowRight' ? 1 : -1
          for (let i = 1; i <= dagen.length; i++) {
            const kandidaat = focus.dag + richting * i
            if (kandidaat < 0 || kandidaat >= dagen.length) break
            if (dagen[kandidaat].open.length > 0) {
              setFocus({ dag: kandidaat, index: 0 })
              break
            }
          }
          break
        }
        case ' ':
        case 'Enter': {
          if (!taak) return
          e.preventDefault()
          if (e.key === ' ') metOvergang(() => onToggle(taak))
          else onEdit(taak)
          break
        }
        case 'n': {
          e.preventDefault()
          const dag = dagen[focus.dag]
          if (dag) { setAddDag(dag.key); setAddTitel(''); setTimeout(() => addRef.current?.focus(), 40) }
          break
        }
        case 'Escape':
          setFocus(null)
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dagen, focus, onToggle, onEdit, onDrop, tijdVoorPositie])

  // Een dag die alleen openging omdat je er met een taak boven hing, valt weer
  // dicht zodra je loslaat. Landde de taak er echt, dan is de dag niet meer
  // leeg en blijft hij vanzelf open.
  useEffect(() => {
    if (!sleepId && sleepOpen.size > 0) setSleepOpen(new Set())
  }, [sleepId, sleepOpen])

  // Focus die buiten de lijst valt (taak afgevinkt of verplaatst) opschonen.
  useEffect(() => {
    if (!focus) return
    const dag = dagen[focus.dag]
    if (!dag || focus.index >= dag.open.length) {
      setFocus(dag && dag.open.length > 0 ? { dag: focus.dag, index: dag.open.length - 1 } : null)
    }
  }, [dagen, focus])

  const toggleAfgerond = (key: string) => {
    setAfgerondOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div
      className={cn('doen-stapel taken-stapel', focus && 'heeft-toetsfocus')}
      style={{ gridTemplateColumns: dagen.map((d) => (isIngeklapt(d) ? 'var(--stapel-strook)' : 'minmax(0, 1fr)')).join(' ') }}
    >
      {focus && !sleepId && (
        <div className="stapel-toetsen" role="status">
          <kbd>↑↓</kbd> kiezen
          <kbd>⇧↑↓←→</kbd> verplaatsen
          <kbd>spatie</kbd> klaar
          <kbd>n</kbd> nieuw
          <kbd>esc</kbd> los
        </div>
      )}
      {dagen.map((dag) => {
        if (isIngeklapt(dag)) {
          return (
            <section
              key={dag.key}
              className={cn('stapel-dag is-strook', dag.isToday && 'is-vandaag', dag.isVerleden && 'is-verleden')}
              onDragOver={(e) => { e.preventDefault(); setSleepOpen((p) => (p.has(dag.key) ? p : new Set(p).add(dag.key))) }}
              onDrop={(e) => handleDrop(e, dag.dayIndex, 0)}
            >
              <button
                className="stapel-strook-knop"
                onClick={() => metOvergang(() => setHandOpen((p) => new Set(p).add(dag.key)))}
                title={`${DAY_LABELS[dag.dayIndex]} ${dag.day.getDate()} · niets open · klik om te openen`}
              >
                <span className="stapel-strook-dag">
                  {DAY_LABELS[dag.dayIndex]}{dag.isToday && <span className="stapel-punt">.</span>}
                </span>
                <span className="stapel-strook-datum">{dag.day.getDate()}</span>
                {dag.afgerond.length > 0 && (
                  <span className="stapel-strook-klaar">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    {dag.afgerond.length}
                  </span>
                )}
                <span className="stapel-strook-label">{dag.isVerleden ? 'Niets open' : 'Vrij'}</span>
              </button>
            </section>
          )
        }

        const toonAfgerond = afgerondOpen.has(dag.key)
        // De nu-streep valt vóór de eerste taak die nog moet komen.
        const nuIndex = dag.isToday
          ? dag.open.findIndex((t) => (uurUitDeadline(t.deadline ?? '') ?? 99) > nuUur)
          : -1

        return (
          <section
            key={dag.key}
            className={cn('stapel-dag', dag.isToday && 'is-vandaag', dag.isVerleden && 'is-verleden')}
            onDragOver={(e) => { e.preventDefault(); setDropDoel({ dag: dag.dayIndex, index: dag.open.length }) }}
            onDrop={(e) => handleDrop(e, dag.dayIndex, dag.open.length)}
          >
            <header className="stapel-kop" style={{ ['--voortgang-f' as string]: dag.voortgang / 100 }}>
              <span className="stapel-dagnaam">
                {DAY_LABELS[dag.dayIndex]}{dag.isToday && <span className="stapel-punt">.</span>}
              </span>
              <span className="stapel-datum">{dag.day.getDate()}</span>
              {dag.open.length > 0 && (
                <span
                  className="stapel-uren"
                  title={dag.geschat > 0
                    ? `${dag.open.length} open, waarvan ${duurLabel(dag.geschat)} geschat`
                    : `${dag.open.length} open`}
                >
                  {dag.open.length}{dag.geschat > 0 && <span className="stapel-uren-zacht"> · {duurLabel(dag.geschat)}</span>}
                </span>
              )}
              <button
                className="stapel-plus"
                title="Taak toevoegen op deze dag"
                onClick={() => { setAddDag(dag.key); setAddTitel(''); setTimeout(() => addRef.current?.focus(), 40) }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </header>

            {addDag === dag.key && (
              <input
                ref={addRef}
                className="stapel-invoer"
                value={addTitel}
                placeholder="Wat moet er gebeuren?"
                onChange={(e) => setAddTitel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && addTitel.trim()) {
                    onQuickAdd(dag.day, addTitel.trim())
                    setAddTitel('')
                    setAddDag(null)
                  }
                  if (e.key === 'Escape') { setAddDag(null); setAddTitel('') }
                }}
                onBlur={() => { if (!addTitel.trim()) { setAddDag(null); setAddTitel('') } }}
              />
            )}

            {dag.montages.map((m) => (
              <div key={m.id} className="stapel-montage" title={[m.titel, m.locatie].filter(Boolean).join(' · ')}>
                <Wrench className="w-3 h-3 flex-shrink-0" />
                <span className="stapel-montage-tijd">{m.start_tijd?.slice(0, 5)}</span>
                <span className="stapel-montage-titel">{m.titel}</span>
              </div>
            ))}

            <div className="stapel-lijst">
              {dag.open.map((taak, i) => (
                <div key={taak.id} style={{ ['--i' as string]: i }}>
                  {nuIndex === i && <div className="stapel-nu" aria-hidden />}
                  <DropStrook
                    actief={dropDoel?.dag === dag.dayIndex && dropDoel?.index === i}
                    onOver={() => setDropDoel({ dag: dag.dayIndex, index: i })}
                    onDrop={(e) => handleDrop(e, dag.dayIndex, i)}
                  />
                  <StapelKaart
                    taak={taak}
                    klantNaam={(taak.klant_id ? klantMap[taak.klant_id] : undefined) || (taak.project_id ? projectKlantMap[taak.project_id] : undefined)}
                    projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
                    sleept={sleepId === taak.id}
                    heeftFocus={focus?.dag === dag.dayIndex && focus?.index === i}
                    onDragStart={() => setSleepId(taak.id)}
                    onDragEnd={() => { setSleepId(null); setDropDoel(null) }}
                    onToggle={() => metOvergang(() => onToggle(taak))}
                    onTogglePrio={() => onTogglePrio(taak)}
                    onEdit={() => onEdit(taak)}
                    onDelete={() => onDelete(taak)}
                  />
                </div>
              ))}

              {nuIndex === -1 && dag.isToday && dag.open.length > 0 && <div className="stapel-nu" aria-hidden />}

              <DropStrook
                actief={dropDoel?.dag === dag.dayIndex && dropDoel?.index === dag.open.length}
                laatste
                onOver={() => setDropDoel({ dag: dag.dayIndex, index: dag.open.length })}
                onDrop={(e) => handleDrop(e, dag.dayIndex, dag.open.length)}
              />

              {dag.open.length === 0 && !isLoading && (
                dag.afgerond.length > 0
                  ? <p className="stapel-klaar">Klaar<span className="stapel-punt">.</span></p>
                  : handOpen.has(dag.key)
                    ? (
                      <button
                        className="stapel-leeg is-inklapbaar"
                        title="Weer inklappen"
                        onClick={() => metOvergang(() => setHandOpen((p) => { const n = new Set(p); n.delete(dag.key); return n }))}
                      >
                        {dag.isVerleden ? 'Niets meer open' : 'Vrij'}
                      </button>
                    )
                    : <p className="stapel-leeg">{dag.isVerleden ? 'Niets meer open' : 'Vrij'}</p>
              )}
            </div>

            {dag.afgerond.length > 0 && (
              <div className="stapel-afgerond">
                <button className="stapel-afgerond-kop" onClick={() => toggleAfgerond(dag.key)}>
                  <ChevronRight className={cn('w-3 h-3 transition-transform', toonAfgerond && 'rotate-90')} />
                  {dag.afgerond.length} afgerond
                </button>
                {toonAfgerond && dag.afgerond.map((taak) => (
                  <StapelKaart
                    key={taak.id}
                    taak={taak}
                    klantNaam={(taak.klant_id ? klantMap[taak.klant_id] : undefined) || (taak.project_id ? projectKlantMap[taak.project_id] : undefined)}
                    projectNaam={taak.project_id ? projectMap[taak.project_id] : undefined}
                    onDragStart={() => setSleepId(taak.id)}
                    onDragEnd={() => setSleepId(null)}
                    onToggle={() => metOvergang(() => onToggle(taak))}
                    onTogglePrio={() => onTogglePrio(taak)}
                    onEdit={() => onEdit(taak)}
                    onDelete={() => onDelete(taak)}
                  />
                ))}
              </div>
            )}

            {/* De rest van de kolom is klikbaar · een lege plek onder de dag is
                waar je intuïtief een nieuwe taak begint. Hij staat ná de
                afgeronde taken, zodat die bij hun dag blijven staan in plaats
                van naar de voet van de kolom te worden geduwd. */}
            <button
              className="stapel-vulling"
              aria-label={`Taak toevoegen op ${DAY_LABELS[dag.dayIndex]} ${dag.day.getDate()}`}
              onClick={() => { setAddDag(dag.key); setAddTitel(''); setTimeout(() => addRef.current?.focus(), 40) }}
            />
          </section>
        )
      })}
    </div>
  )
}

function DropStrook({ actief, laatste, onOver, onDrop }: {
  actief: boolean
  laatste?: boolean
  onOver: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <div
      className={cn('stapel-drop', laatste && 'is-laatste', actief && 'is-actief')}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onOver() }}
      onDrop={onDrop}
      aria-hidden
    />
  )
}

function StapelKaart({
  taak, klantNaam, projectNaam, sleept, heeftFocus,
  onDragStart, onDragEnd, onToggle, onTogglePrio, onEdit, onDelete,
}: {
  taak: Taak
  klantNaam?: string
  projectNaam?: string
  sleept?: boolean
  heeftFocus?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onToggle: () => void
  onTogglePrio: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const kaartRef = useRef<HTMLElement>(null)
  const klaar = taak.status === 'klaar'
  const project = projectNaam ? zonderKlantPrefix(projectNaam, klantNaam) : undefined

  useEffect(() => {
    if (heeftFocus) kaartRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [heeftFocus])
  const duur = duurLabel(taak.geschatte_tijd)
  const context = [klantNaam, project].filter(Boolean).join(' · ')

  return (
    <article
      ref={kaartRef}
      className={cn('stapel-kaart', klaar && 'is-klaar', sleept && 'is-sleept', heeftFocus && 'heeft-focus')}
      style={{ viewTransitionName: `taak-${taak.id.replace(/[^a-zA-Z0-9]/g, '')}` }}
      data-prio={taak.prioriteit}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', taak.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      title={context ? `${taak.titel} · ${context}` : taak.titel}
    >
      <button
        className="stapel-vink"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        title={klaar ? 'Ongedaan maken' : 'Markeer als klaar'}
        aria-pressed={klaar}
      >
        {klaar ? <Check className="w-2.5 h-2.5" strokeWidth={4} /> : <span className="stapel-vink-dot" />}
      </button>

      <div className="stapel-tekst">
        <h3 className="stapel-titel">
          <span className={klaar ? 'taak-af-titel' : undefined}>{taak.titel}</span>
        </h3>
        {(context || duur) && (
          <p className="stapel-onder">
            <span className="stapel-context">
              {klantNaam && <span className="stapel-klant">{klantNaam}</span>}
              {klantNaam && project && <span className="stapel-scheiding">·</span>}
              {project}
            </span>
            {duur && <span className="stapel-duur">{duur}</span>}
          </p>
        )}
      </div>

      <div className="stapel-acties">
        <button
          className={cn('stapel-actie', taak.prioriteit === 'kritiek' && 'is-aan')}
          onClick={(e) => { e.stopPropagation(); onTogglePrio() }}
          title={taak.prioriteit === 'kritiek' ? 'Prioriteit weghalen' : 'Markeer als prioriteit'}
        >
          <Flame className="w-3.5 h-3.5" />
        </button>
        <button
          className="stapel-actie is-verwijder"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Verwijderen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  )
}
