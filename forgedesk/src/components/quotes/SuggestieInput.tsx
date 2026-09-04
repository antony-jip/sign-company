import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SuggestieInputProps {
  value: string
  onChange: (value: string) => void
  suggesties: string[]
  placeholder?: string
  label: string
  className?: string
}

/**
 * Eén regel: vrije tekst met een chevron voor de vaste keuzes. Kiezen vult
 * het veld, typen past het aan. Compacter dan een rij pillen plus een veld
 * eronder, en de tekst blijft altijd bewerkbaar.
 */
export function SuggestieInput({ value, onChange, suggesties, placeholder, label, className }: SuggestieInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pr-9 text-sm bg-white dark:bg-white/[0.05] border border-[rgba(26,83,92,0.12)] dark:border-white/10 focus-visible:border-petrol dark:focus-visible:border-white/30 focus-visible:ring-[3px] focus-visible:ring-[rgba(26,83,92,0.12)] dark:focus-visible:ring-white/10 rounded-lg transition-colors"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${label} kiezen`}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-petrol hover:bg-[rgba(26,83,92,0.06)] dark:hover:bg-white/[0.08] transition-colors"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[260px]">
          {suggesties.map((s) => (
            <DropdownMenuItem key={s} onClick={() => onChange(s)} className={cn('text-[13px]', s === value && 'font-medium text-petrol')}>
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
