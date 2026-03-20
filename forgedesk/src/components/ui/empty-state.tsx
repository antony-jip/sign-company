import React from 'react'
import { cn } from '@/lib/utils'

type EmptyStateModule = 'projecten' | 'offertes' | 'facturen' | 'klanten' | 'werkbonnen' | 'planning' | 'taken' | 'default'

const MODULE_COLORS: Record<EmptyStateModule, string> = {
  projecten: '#2D6B48',
  offertes: '#5A4A78',
  facturen: '#C03A18',
  klanten: '#2A5580',
  werkbonnen: '#F15025',
  planning: '#1A535C',
  taken: '#3A6B8C',
  default: '#5A5A55',
}

interface EmptyStateProps {
  module?: EmptyStateModule
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ module = 'default', title, description, action, className }: EmptyStateProps) {
  const color = MODULE_COLORS[module]

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6', className)}>
      {/* Module color strip */}
      <div
        className="rounded-full mb-5"
        style={{ width: '40px', height: '4px', backgroundColor: color }}
      />
      <h3
        className="font-semibold mb-1.5"
        style={{ fontSize: '14px', color: '#191919', fontWeight: 600 }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-center max-w-[320px] mb-5"
          style={{ fontSize: '12px', color: '#5A5A55' }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
