import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Check, ChevronDown, ChevronUp, ClipboardCheck, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import { zetUrenStatus } from '@/services/tijdregistratieService'
import { stuurUrenWeekMelding } from '@/services/urenWeekService'
import { datumPlusDagen, maandagVan } from '@/utils/contracturen'
import { formatUren, weekNummer } from './Weekstaat'
import type { Medewerker, Tijdregistratie } from '@/types'

interface TeKeurenWeek {
  sleutel: string
  medewerkerId: string | null
  userId: string | null
  naam: string
  weekStart: string
  regels: Tijdregistratie[]
  minuten: number
  ingediendOp: string | null
}

interface UrenKeurenProps {
  registraties: Tijdregistratie[]
  medewerkers: Medewerker[]
  /** De beheerder die keurt. */
  userId: string | undefined
  standaardOpen: boolean
  onGewijzigd: () => Promise<void> | void
}

function datumKort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function UrenKeuren({ registraties, medewerkers, userId, standaardOpen, onGewijzigd }: UrenKeurenProps) {
  const [open, setOpen] = useState(standaardOpen)
  const [bezig, setBezig] = useState<string | null>(null)
  const [terugVoor, setTerugVoor] = useState<TeKeurenWeek | null>(null)
  const [opmerking, setOpmerking] = useState('')

  const weken = useMemo(() => {
    const perSleutel = new Map<string, TeKeurenWeek>()
    for (const r of registraties) {
      if (r.status !== 'definitief') continue
      const medewerker = r.medewerker_id ? medewerkers.find((m) => m.id === r.medewerker_id) : undefined
      const persoon = r.medewerker_id || r.user_id || 'onbekend'
      const weekStart = maandagVan(r.datum)
      const sleutel = `${persoon}|${weekStart}`
      let week = perSleutel.get(sleutel)
      if (!week) {
        week = {
          sleutel,
          medewerkerId: r.medewerker_id || null,
          userId: medewerker?.user_id || (r.medewerker_id ? null : r.user_id || null),
          naam: medewerker?.naam || r.medewerker_naam || 'Onbekende medewerker',
          weekStart,
          regels: [],
          minuten: 0,
          ingediendOp: null,
        }
        perSleutel.set(sleutel, week)
      }
      week.regels.push(r)
      week.minuten += r.duur_minuten || 0
      if (r.definitief_op && (!week.ingediendOp || r.definitief_op > week.ingediendOp)) week.ingediendOp = r.definitief_op
    }
    return Array.from(perSleutel.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart) || a.naam.localeCompare(b.naam))
  }, [registraties, medewerkers])

  async function keurGoed(week: TeKeurenWeek) {
    if (bezig) return
    setBezig(week.sleutel)
    try {
      await zetUrenStatus(week.regels.map((r) => r.id), {
        status: 'goedgekeurd',
        goedgekeurd_door_id: userId ?? null,
        goedgekeurd_op: new Date().toISOString(),
      })
      await onGewijzigd()
      toast.success(<>Week {weekNummer(week.weekStart)} van {week.naam} goedgekeurd<span className="text-flame">.</span></>)
      if (week.userId) await stuurUrenWeekMelding({ actie: 'goedgekeurd', weekStart: week.weekStart, uren: week.minuten / 60, doelUserId: week.userId })
    } catch (err) {
      logger.error('Uren goedkeuren mislukt:', err)
      toast.error('Goedkeuren mislukt')
    } finally {
      setBezig(null)
    }
  }

  async function stuurTerug() {
    const week = terugVoor
    if (!week || bezig) return
    setBezig(week.sleutel)
    try {
      await zetUrenStatus(week.regels.map((r) => r.id), { status: 'concept', definitief_op: null })
      await onGewijzigd()
      toast.success(<>Week {weekNummer(week.weekStart)} van {week.naam} terug naar concept<span className="text-flame">.</span></>)
      setTerugVoor(null)
      setOpmerking('')
      if (week.userId) await stuurUrenWeekMelding({ actie: 'teruggestuurd', weekStart: week.weekStart, uren: week.minuten / 60, doelUserId: week.userId, opmerking: opmerking.trim() || undefined })
    } catch (err) {
      logger.error('Uren terugsturen mislukt:', err)
      toast.error('Terugsturen mislukt')
    } finally {
      setBezig(null)
    }
  }

  return (
    <Card className={cn(weken.length > 0 && 'border-petrol/40')}>
      <CardHeader className="pb-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full min-h-[44px] items-center justify-between gap-3 text-left" aria-expanded={open}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-petrol" />
            Te keuren
            <Badge variant={weken.length > 0 ? 'default' : 'secondary'} className="font-mono">{weken.length}</Badge>
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          {weken.length === 0 && <p className="text-sm text-muted-foreground">Geen ingediende weken. Zodra een collega een week indient, staat die hier.</p>}
          {weken.map((week) => (
            <div key={week.sleutel} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A4A52] dark:text-foreground">{week.naam}</p>
                <p className="text-xs text-muted-foreground">
                  Week {weekNummer(week.weekStart)} · {datumKort(week.weekStart)} t/m {datumKort(datumPlusDagen(week.weekStart, 6))}
                  {week.ingediendOp && ` · ingediend ${new Date(week.ingediendOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 md:justify-end">
                <Badge variant="secondary" className="font-mono">{formatUren(week.minuten)} uur</Badge>
                {!week.userId && <span className="text-2xs text-muted-foreground">Geen melding: dit teamlid heeft geen login</span>}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-11 md:h-9" disabled={bezig === week.sleutel} onClick={() => { setTerugVoor(week); setOpmerking('') }}>
                    <Undo2 className="mr-2 h-4 w-4" />Terug naar concept
                  </Button>
                  <Button size="sm" className="h-11 md:h-9 bg-flame hover:bg-flame/90 text-white" disabled={bezig === week.sleutel} onClick={() => keurGoed(week)}>
                    <Check className="mr-2 h-4 w-4" />Goedkeuren
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      )}

      <ResponsiveDialog
        open={terugVoor !== null}
        onOpenChange={(v) => { if (!v) setTerugVoor(null) }}
        className="sm:max-w-[480px]"
        title={terugVoor ? `Week ${weekNummer(terugVoor.weekStart)} van ${terugVoor.naam} terugsturen` : 'Terugsturen'}
        description="De uren gaan terug naar concept en de medewerker krijgt een melding met je opmerking."
        footer={(
          <>
            <Button variant="outline" onClick={() => setTerugVoor(null)}>Annuleren</Button>
            <Button onClick={stuurTerug} disabled={!!bezig}>{bezig ? 'Bezig…' : 'Terugsturen'}</Button>
          </>
        )}
      >
        <div className="grid gap-2 py-2">
          <Label htmlFor="keuren-opmerking">Opmerking</Label>
          <Textarea
            id="keuren-opmerking"
            rows={3}
            placeholder="Wat moet er anders?"
            value={opmerking}
            onChange={(e) => setOpmerking(e.target.value.slice(0, 300))}
          />
        </div>
      </ResponsiveDialog>
    </Card>
  )
}
