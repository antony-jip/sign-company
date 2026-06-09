import { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import type { Medewerker, VrijPatroon, Afwezigheid, AfwezigheidType } from '@/types'

const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

const TYPE_OPTIES: { value: AfwezigheidType; label: string }[] = [
  { value: 'vakantie', label: 'Vakantie' },
  { value: 'ziek', label: 'Ziek' },
  { value: 'bijzonder', label: 'Bijzonder' },
  { value: 'vrij', label: 'Vrij' },
]

type Dagdeel = 'heel' | 'ochtend' | 'middag' | 'tijd'
const DAGDEEL_OPTIES: { value: Dagdeel; label: string }[] = [
  { value: 'heel', label: 'Hele dag' },
  { value: 'ochtend', label: 'Ochtend' },
  { value: 'middag', label: 'Middag' },
  { value: 'tijd', label: 'Tijd' },
]
const PRESET: Record<Exclude<Dagdeel, 'heel' | 'tijd'>, { van: string; tot: string }> = {
  ochtend: { van: '08:00', tot: '12:00' },
  middag: { van: '12:00', tot: '17:00' },
}

function formatKort(datum: string): string {
  const d = new Date(datum + 'T00:00:00')
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

interface Props {
  monteur: Medewerker
  patronen: VrijPatroon[]
  afwezigheden: Afwezigheid[]
  defaultDatum?: string
  trigger: React.ReactNode
  onSavePatroon: (data: { id?: string; vrije_dagen: number; geldig_van: string | null; geldig_tot: string | null }) => Promise<void>
  onDeletePatroon: (id: string) => Promise<void>
  onAddAfwezigheid: (data: { type: AfwezigheidType; start_datum: string; eind_datum: string; start_tijd: string | null; eind_tijd: string | null; opmerking?: string }) => Promise<void>
  onDeleteAfwezigheid: (id: string) => Promise<void>
}

const timeInputCls = "rounded-lg border border-[rgba(26,83,92,0.14)] bg-[#FAFBFB] dark:bg-white/[0.04] px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/15 transition-colors [color-scheme:light] dark:[color-scheme:dark]"

export function AfwezigheidPopover({
  monteur, patronen, afwezigheden, defaultDatum, trigger,
  onSavePatroon, onDeletePatroon, onAddAfwezigheid, onDeleteAfwezigheid,
}: Props) {
  const [open, setOpen] = useState(false)
  const patroon = patronen[0]
  const [mode, setMode] = useState<'patroon' | 'afwezig'>(patronen.length ? 'afwezig' : 'patroon')

  // Structureel-vrij draft
  const [dagen, setDagen] = useState(patroon?.vrije_dagen ?? 0)
  const [tijdelijk, setTijdelijk] = useState(!!(patroon?.geldig_van || patroon?.geldig_tot))
  const [van, setVan] = useState(patroon?.geldig_van ?? '')
  const [tot, setTot] = useState(patroon?.geldig_tot ?? '')
  const [patroonBezig, setPatroonBezig] = useState(false)

  // Afwezigheid draft
  const [type, setType] = useState<AfwezigheidType>('vrij')
  const [dagdeel, setDagdeel] = useState<Dagdeel>('heel')
  const [start, setStart] = useState(defaultDatum ?? '')
  const [eind, setEind] = useState(defaultDatum ?? '')
  const [tijdVan, setTijdVan] = useState('09:00')
  const [tijdTot, setTijdTot] = useState('11:00')
  const [opmerking, setOpmerking] = useState('')
  const [afwBezig, setAfwBezig] = useState(false)

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setMode(patronen.length ? 'afwezig' : 'patroon')
      setDagen(patroon?.vrije_dagen ?? 0)
      setTijdelijk(!!(patroon?.geldig_van || patroon?.geldig_tot))
      setVan(patroon?.geldig_van ?? '')
      setTot(patroon?.geldig_tot ?? '')
      setType('vrij')
      setDagdeel('heel')
      setStart(defaultDatum ?? '')
      setEind(defaultDatum ?? '')
      setTijdVan('09:00')
      setTijdTot('11:00')
      setOpmerking('')
    }
    setOpen(o)
  }

  const toggleDag = (idx: number) => setDagen((d) => d ^ (1 << idx))

  const patroonGewijzigd =
    dagen !== (patroon?.vrije_dagen ?? 0) ||
    (tijdelijk ? van : '') !== (patroon?.geldig_van ?? '') ||
    (tijdelijk ? tot : '') !== (patroon?.geldig_tot ?? '')

  const savePatroon = async () => {
    setPatroonBezig(true)
    try {
      if (dagen === 0 && patroon) {
        await onDeletePatroon(patroon.id)
      } else if (dagen !== 0) {
        await onSavePatroon({
          id: patroon?.id,
          vrije_dagen: dagen,
          geldig_van: tijdelijk && van ? van : null,
          geldig_tot: tijdelijk && tot ? tot : null,
        })
      }
    } finally {
      setPatroonBezig(false)
    }
  }

  const addAfwezigheid = async () => {
    if (!start) return
    let st: string | null = null
    let et: string | null = null
    if (dagdeel === 'ochtend') { st = PRESET.ochtend.van; et = PRESET.ochtend.tot }
    else if (dagdeel === 'middag') { st = PRESET.middag.van; et = PRESET.middag.tot }
    else if (dagdeel === 'tijd') { st = tijdVan; et = tijdTot }
    const eindDatum = dagdeel === 'heel' ? (eind && eind >= start ? eind : start) : start
    setAfwBezig(true)
    try {
      await onAddAfwezigheid({
        type, start_datum: start, eind_datum: eindDatum,
        start_tijd: st, eind_tijd: et,
        opmerking: opmerking.trim() || undefined,
      })
      setStart(defaultDatum ?? '')
      setEind(defaultDatum ?? '')
      setOpmerking('')
      setDagdeel('heel')
    } finally {
      setAfwBezig(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 overflow-hidden rounded-xl border-[rgba(26,83,92,0.12)] p-0 shadow-[0_8px_28px_-6px_rgba(26,83,92,0.28)]">
        {/* Header */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">Afwezigheid</div>
          <div className="text-[13px] font-bold text-[#1A535C] dark:text-foreground">{monteur.naam}</div>
        </div>

        {/* Toggle bovenin */}
        <div className="px-4 pb-3">
          <div className="flex rounded-lg bg-[hsl(38,20%,95.5%)] dark:bg-white/[0.06] p-0.5">
            {(['patroon', 'afwezig'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-md py-1 text-[12px] font-semibold transition-colors",
                  mode === m ? "bg-white dark:bg-white/[0.12] text-[#1A535C] dark:text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === 'patroon' ? 'Vrije dagen' : 'Afwezig'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'patroon' ? (
          <div className="px-4 pb-4">
            <div className="flex gap-1">
              {WEEKDAGEN.map((d, idx) => {
                const actief = !!((dagen >> idx) & 1)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDag(idx)}
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-[11px] font-medium capitalize transition-colors',
                      actief ? 'bg-[#1A535C] text-white' : 'bg-[hsl(38,20%,95.5%)] text-muted-foreground hover:text-foreground dark:bg-white/[0.06]'
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setTijdelijk((t) => !t)}
              className={cn('mt-2 text-[11px] font-medium transition-colors', tijdelijk ? 'text-[#1A535C] dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {tijdelijk ? '− Alleen tijdelijke periode' : '+ Alleen tijdelijke periode'}
            </button>
            {tijdelijk && (
              <div className="mt-2 flex items-center gap-2">
                <DatePicker value={van} onChange={setVan} asInput placeholder="Vanaf" className="text-[12px]" />
                <span className="text-muted-foreground/50 text-[12px]">t/m</span>
                <DatePicker value={tot} onChange={setTot} asInput placeholder="Tot" min={van || undefined} className="text-[12px]" />
              </div>
            )}
            <button
              type="button"
              onClick={savePatroon}
              disabled={patroonBezig || !patroonGewijzigd}
              className="mt-3 w-full rounded-lg bg-[#1A535C] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#16444c] disabled:opacity-40 transition-colors"
            >
              {patroonBezig ? 'Opslaan...' : 'Weekpatroon opslaan'}
            </button>
            <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground/60">Vaste vrije weekdag(en) die elke week terugkomen.</p>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {/* Type */}
            <div className="flex items-center gap-3 text-[12px] mb-2.5">
              {TYPE_OPTIES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn('transition-colors', type === t.value ? 'font-semibold text-[#1A535C] dark:text-foreground' : 'font-medium text-muted-foreground hover:text-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dagdeel */}
            <div className="flex gap-1 mb-2">
              {DAGDEEL_OPTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDagdeel(d.value)}
                  className={cn(
                    'flex-1 rounded-md py-1 text-[11px] font-medium transition-colors',
                    dagdeel === d.value ? 'bg-[#1A535C] text-white' : 'bg-[hsl(38,20%,95.5%)] text-muted-foreground hover:text-foreground dark:bg-white/[0.06]'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Datum(s) */}
            {dagdeel === 'heel' ? (
              <div className="flex items-center gap-2">
                <DatePicker value={start} onChange={setStart} asInput placeholder="Van" className="text-[12px]" />
                <span className="text-muted-foreground/50 text-[12px]">t/m</span>
                <DatePicker value={eind} onChange={setEind} asInput placeholder="Tot" min={start || undefined} className="text-[12px]" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DatePicker value={start} onChange={setStart} asInput placeholder="Op datum" className="text-[12px]" />
                {dagdeel === 'tijd' && (
                  <div className="flex items-center gap-1.5">
                    <input type="time" value={tijdVan} onChange={(e) => setTijdVan(e.target.value)} className={timeInputCls} />
                    <span className="text-muted-foreground/50 text-[12px]">–</span>
                    <input type="time" value={tijdTot} onChange={(e) => setTijdTot(e.target.value)} className={timeInputCls} />
                  </div>
                )}
              </div>
            )}

            {/* Omschrijving */}
            <input
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value)}
              placeholder="Omschrijving — bijv. Tandarts (optioneel)"
              className="mt-2 w-full rounded-lg border border-[rgba(26,83,92,0.14)] bg-[#FAFBFB] dark:bg-white/[0.04] px-2.5 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/45 focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/15 transition-colors"
            />

            <button
              type="button"
              onClick={addAfwezigheid}
              disabled={afwBezig || !start}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#F15025] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_1px_3px_rgba(241,80,37,0.25)] hover:bg-[#E0481D] disabled:opacity-40 transition-colors"
            >
              <Plus className="h-3 w-3" />
              {afwBezig ? 'Toevoegen...' : 'Toevoegen'}
            </button>

            {/* Lopende/komende afwezigheid */}
            {afwezigheden.length > 0 && (
              <div className="mt-3 border-t border-[rgba(26,83,92,0.10)] pt-2.5 max-h-40 overflow-y-auto space-y-1.5">
                {afwezigheden.map((a) => {
                  const lbl = TYPE_OPTIES.find((t) => t.value === a.type)?.label ?? a.type
                  const periode = a.start_datum === a.eind_datum ? formatKort(a.start_datum) : `${formatKort(a.start_datum)} – ${formatKort(a.eind_datum)}`
                  const tijd = a.start_tijd && a.eind_tijd ? ` ${a.start_tijd}–${a.eind_tijd}` : ''
                  return (
                    <div key={a.id} className="group/afw flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-[12px]">
                        <span className="font-medium text-foreground">{lbl}</span>
                        <span className="text-[#F15025]">.</span>
                        <span className="ml-1.5 font-mono tabular-nums text-muted-foreground/70">{periode}{tijd}</span>
                        {a.opmerking && <span className="ml-1.5 text-muted-foreground/60">· {a.opmerking}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteAfwezigheid(a.id)}
                        title="Verwijderen"
                        className="shrink-0 text-muted-foreground/50 opacity-0 group-hover/afw:opacity-100 hover:text-[#C03A18] transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
