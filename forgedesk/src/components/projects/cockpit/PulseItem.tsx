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
      'flex flex-col py-2.5 px-5',
      !isLast && 'border-r border-[hsl(35,15%,87%)]'
    )}>
      <span className={cn('text-xl font-bold font-mono leading-tight', colorClass)}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  )
}
