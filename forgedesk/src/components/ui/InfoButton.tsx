import React from 'react'
import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { cn } from '@/lib/utils'

interface InfoButtonProps {
  children: React.ReactNode
  size?: 'sm' | 'md'
  align?: 'start' | 'center' | 'end'
  className?: string
  label?: string
}

export function InfoButton({
  children,
  size = 'sm',
  align = 'start',
  className,
  label = 'Meer info',
}: InfoButtonProps) {
  const { profile } = useAppSettings()
  const tonen = profile?.ui_hints_tonen ?? false

  if (!tonen) return null

  const iconSize = size === 'md' ? 14 : 12

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-hex hover:text-text-sec focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F8F7F5] transition-colors align-middle',
            size === 'md' ? 'w-5 h-5' : 'w-4 h-4',
            className,
          )}
        >
          <HelpCircle width={iconSize} height={iconSize} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="max-w-[260px] p-4 rounded-xl border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] text-[13px] text-ink/85 leading-relaxed"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
