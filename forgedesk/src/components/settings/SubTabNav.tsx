import React from 'react'
import { cn } from '@/lib/utils'
import type { SubTab } from './settingsShared'

export { type SubTab }

interface SubTabNavProps {
  tabs: SubTab[]
  active: string
  onChange: (id: string) => void
  /**
   * 'pill' (default) — slate-surface gevulde pillen, voor sectie-navigatie op het hoogste niveau.
   * 'underline' — tekst-tabs met Flame-streep onder de actieve. Gebruik binnen een tab die zelf al
   *   in een sectie zit, om visuele "dubbele tabs" te voorkomen.
   */
  variant?: 'pill' | 'underline'
}

export function SubTabNav({ tabs, active, onChange, variant = 'pill' }: SubTabNavProps) {
  if (variant === 'underline') {
    return (
      <div className="flex items-center gap-1 mb-6 border-b border-[rgba(26,83,92,0.1)] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 -mb-px text-[13px] font-semibold transition-colors whitespace-nowrap',
                isActive
                  ? 'text-[#1A1A1A]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66]',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5 transition-colors', isActive ? 'text-[#1A535C]' : 'text-[#9B9B95]')} />
              {tab.label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-[#F15025]"
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-0.5 p-1 doen-slate-surface rounded-xl overflow-x-auto mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap',
              isActive
                ? 'bg-[#FFFFFF] text-[#1A1A1A] shadow-[0_1px_3px_rgba(20,62,71,0.08),0_0_0_1px_rgba(26,83,92,0.06)]'
                : 'text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-white/50'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 transition-colors', isActive ? 'text-[#1A535C]' : 'text-[#9B9B95]')} />
            {tab.label}
            {isActive && <span className="text-[#F15025] ml-0.5">.</span>}
          </button>
        )
      })}
    </div>
  )
}
