import React from 'react'
import { type LucideIcon } from 'lucide-react'

/** Module gradient color pairs — primary + darker shade */
const MODULE_GRADIENTS: Record<string, [string, string]> = {
  projecten:   ['#7EB5A6', '#5A9A88'],
  klanten:     ['#8BAFD4', '#6A8DB8'],
  offertes:    ['#9B8EC4', '#7A6BAA'],
  facturen:    ['#E8866A', '#C4604A'],
  werkbonnen:  ['#D4836A', '#B8654E'],
  taken:       ['#C4A882', '#A88E66'],
  planning:    ['#7EB5A6', '#5A9A88'],
  email:       ['#8BAFD4', '#6A8DB8'],
  visualizer:  ['#7EB5A6', '#5A9A88'],
}

export interface ModuleHeaderProps {
  /** Module key — determines gradient color */
  module: keyof typeof MODULE_GRADIENTS | (string & {})
  /** Lucide icon component */
  icon: LucideIcon
  /** Module title */
  title: string
  /** Subtitle / description */
  subtitle?: string
  /** Right-side actions slot */
  actions?: React.ReactNode
}

export function ModuleHeader({ module, icon: Icon, title, subtitle, actions }: ModuleHeaderProps) {
  const [from, to] = MODULE_GRADIENTS[module] ?? ['#8BAFD4', '#6A8DB8']

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-background flex-shrink-0 rounded-t-2xl">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="page-title text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
