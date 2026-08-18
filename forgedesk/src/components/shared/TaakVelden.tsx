import { Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Gedeelde velden voor de taak-formulieren. Een taak maak je op acht plekken
// aan — vanuit Taken, vanuit een project, vanuit de mail, vanuit het portaal —
// en die formulieren liepen uiteen. Wat hier staat hoort overal hetzelfde te
// zijn.
// ─────────────────────────────────────────────────────────────────────────────

// Schatten moet in één klik kunnen · een vrij urenveld levert in de praktijk
// lege velden op, en de stapel tekent zijn blokhoogte hiermee.
export const TIJD_OPTIES: { waarde: number; label: string }[] = [
  { waarde: 0.25, label: '15m' }, { waarde: 0.5, label: '30m' },
  { waarde: 1, label: '1u' }, { waarde: 1.5, label: '1,5u' },
  { waarde: 2, label: '2u' }, { waarde: 3, label: '3u' },
  { waarde: 4, label: '4u' }, { waarde: 6, label: '6u' },
  { waarde: 8, label: 'Hele dag' },
]

export const SCHATTING_PIL =
  'h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-background transition-colors w-auto focus:ring-0 [&>svg:last-child]:hidden'

export function SchattingSelect({
  waarde,
  onChange,
  triggerClassName,
}: {
  waarde: number
  onChange: (uren: number) => void
  triggerClassName?: string
}) {
  // Een waarde die van elders komt — bijvoorbeeld 1,75u na een resize in de
  // weekweergave — hoort gewoon te blijven staan in plaats van uit de lijst te
  // vallen.
  const opties = waarde > 0 && !TIJD_OPTIES.some((o) => o.waarde === waarde)
    ? [...TIJD_OPTIES, { waarde, label: `${String(waarde).replace('.', ',')}u` }].sort((a, b) => a.waarde - b.waarde)
    : TIJD_OPTIES

  return (
    <Select
      value={waarde > 0 ? String(waarde) : 'geen'}
      onValueChange={(v) => onChange(v === 'geen' ? 0 : Number(v))}
    >
      <SelectTrigger className={cn(SCHATTING_PIL, triggerClassName)}>
        <Clock className="w-3 h-3 text-foreground/70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="geen"><span className="text-muted-foreground">Geen schatting</span></SelectItem>
        {opties.map((o) => (
          <SelectItem key={o.waarde} value={String(o.waarde)}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * "19 aug" laat je zelf uitrekenen welke dag dat is · in een app die op dagen
 * is gebouwd is de weekdag het antwoord dat je zoekt. Vandaag en morgen krijgen
 * hun eigen woord, want die twee zoek je het vaakst.
 */
export function deadlineLabel(deadline?: string, leeg = 'Geen deadline'): string {
  if (!deadline) return leeg
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return leeg
  const nul = (x: Date) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime() }
  const verschil = Math.round((nul(d) - nul(new Date())) / 86400000)
  const datum = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  if (verschil === 0) return `Vandaag · ${datum}`
  if (verschil === 1) return `Morgen · ${datum}`
  const dag = d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
  return `${dag} ${datum}`
}
