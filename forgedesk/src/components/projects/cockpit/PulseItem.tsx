import { cn } from '@/lib/utils'

interface PulseItemProps {
  value: string
  label: string
  colorClass?: string
  isLast?: boolean
}

export function PulseItem({ value, label, colorClass = 'text-foreground', isLast = false }: PulseItemProps) {
  return (
    <div className={cn(
      'flex flex-col py-3 px-5 transition-colors duration-200 hover:bg-[hsl(35,15%,97%)]',
      !isLast && 'border-r border-[hsl(35,15%,90%)]'
    )}>
      <span className={cn('text-lg font-bold font-mono leading-tight tracking-tight', colorClass)}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  )
}
