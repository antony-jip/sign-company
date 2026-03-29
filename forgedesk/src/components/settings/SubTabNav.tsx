import React from 'react'
import { cn } from '@/lib/utils'
import type { SubTab } from './settingsShared'

export { type SubTab }

export function SubTabNav({ tabs, active, onChange }: { tabs: SubTab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-[#F3F2F0] rounded-lg overflow-x-auto mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-[#FFFFFF] text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'text-[#9B9B95] hover:text-[#6B6B66]'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
