import React from 'react'
import { type LucideIcon } from 'lucide-react'
import { MODULE_COLORS } from '@/lib/moduleColors'

const MODULE_ICON_COLORS: Record<string, [string, string]> = {
  projecten:   [MODULE_COLORS.projecten.light, MODULE_COLORS.projecten.DEFAULT],
  klanten:     [MODULE_COLORS.klanten.light, MODULE_COLORS.klanten.DEFAULT],
  offertes:    [MODULE_COLORS.offertes.light, MODULE_COLORS.offertes.DEFAULT],
  facturen:    [MODULE_COLORS.facturen.light, MODULE_COLORS.facturen.DEFAULT],
  werkbonnen:  [MODULE_COLORS.werkbonnen.light, MODULE_COLORS.werkbonnen.DEFAULT],
  taken:       [MODULE_COLORS.taken.light, MODULE_COLORS.taken.DEFAULT],
  planning:    [MODULE_COLORS.planning.light, MODULE_COLORS.planning.DEFAULT],
  email:       [MODULE_COLORS.email.light, MODULE_COLORS.email.DEFAULT],
  visualizer:  [MODULE_COLORS.projecten.light, MODULE_COLORS.projecten.DEFAULT],
}

export interface ModuleHeaderProps {
  module: keyof typeof MODULE_ICON_COLORS | (string & {})
  icon: LucideIcon
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function ModuleHeader({ module, icon: Icon, title, subtitle, actions }: ModuleHeaderProps) {
  const [bg, iconColor] = MODULE_ICON_COLORS[module] ?? ['#E5ECF6', '#3A6B8C']

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-background flex-shrink-0 rounded-t-2xl">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate" style={{ color: '#191919' }}>{title}</h1>
          {subtitle && (
            <p className="text-[13px] mt-0.5" style={{ color: '#5A5A55' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
