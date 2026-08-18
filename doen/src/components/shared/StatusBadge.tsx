import { cn } from '@/lib/utils'

/**
 * Eén bron voor status-kleuren over alle modules (design-systeem).
 * Categorieën: amber=concept/planning, blue=in-uitvoering, green=positief/klaar,
 * red=negatief, grey=neutraal/on-hold. Onbekende statussen vallen terug op grijs.
 */
const STATUS_CATEGORY: Record<string, 'amber' | 'blue' | 'green' | 'red' | 'grey'> = {
  concept: 'amber', gepland: 'amber', 'te-plannen': 'amber', nieuw: 'amber',
  prospect: 'amber', wacht: 'amber', wacht_op_reactie: 'amber',
  verstuurd: 'blue', verzonden: 'blue', actief: 'blue', 'in-uitvoering': 'blue',
  in_uitvoering: 'blue', 'in-review': 'blue', review: 'blue', bekeken: 'blue',
  onderweg: 'blue', montage: 'blue', open: 'blue', openstaand: 'blue', productie: 'blue',
  goedgekeurd: 'green', geaccepteerd: 'green', betaald: 'green', opgeleverd: 'green',
  afgerond: 'green', gefactureerd: 'green', 'te-factureren': 'green', klaar: 'green', voltooid: 'green',
  verlopen: 'red', afgewezen: 'red', 'te-laat': 'red', te_laat: 'red',
  geannuleerd: 'red', gecrediteerd: 'red', inactief: 'red', wijziging_gevraagd: 'red',
  'on-hold': 'grey', onbekend: 'grey',
}

const CATEGORY_COLOR: Record<string, string> = {
  amber: '#8A7A4A',
  blue: '#3A5A9A',
  green: '#3A7D52',
  red: '#C0451A',
  grey: '#6B6B66',
}

/** Design-systeem-kleur voor een status-string (dot + tekst gebruiken dezelfde). */
export function statusColor(status: string): string {
  const key = (status || '').toLowerCase().trim()
  return CATEGORY_COLOR[STATUS_CATEGORY[key] ?? 'grey']
}

interface StatusBadgeProps {
  /** Ruwe status-key (voor de kleur) · bv. 'gepland', 'betaald'. */
  status: string
  /** Weergavelabel; valt terug op de status-key. */
  label?: string
  /** Expliciete kleur (overschrijft de map) als een module een eigen kleur heeft. */
  color?: string
  /** Dot links tonen (default true). */
  dot?: boolean
  className?: string
}

/**
 * Uniforme status-weergave: gekleurde dot + "Label." met flame-punt · exact het
 * format van de Projecten-lijst, zodat alle list views dezelfde status-layout delen.
 */
export function StatusBadge({ status, label, color, dot = true, className }: StatusBadgeProps) {
  const c = color ?? statusColor(status)
  return (
    <span className={cn('inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap', className)} style={{ color: c }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />}
      <span>
        {label ?? status}<span className="text-flame">.</span>
      </span>
    </span>
  )
}
