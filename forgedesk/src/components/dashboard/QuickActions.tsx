import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { FolderPlus, FilePlus, UserPlus, Receipt, Wrench, ClipboardCheck, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface QuickAction {
  label: string
  description: string
  icon: LucideIcon
  href: string
  gradient: string
}

const actions: QuickAction[] = [
  {
    label: 'Nieuwe Offerte',
    description: 'Maak een offerte',
    icon: FilePlus,
    href: '/offertes/nieuw',
    gradient: 'from-accent to-primary',
  },
  {
    label: 'Nieuw Project',
    description: 'Start een project',
    icon: FolderPlus,
    href: '/projecten/nieuw',
    gradient: 'from-primary to-wm-light',
  },
  {
    label: 'Nieuwe Klant',
    description: 'Voeg klant toe',
    icon: UserPlus,
    href: '/klanten',
    gradient: 'from-[#4A442D] to-[#6b6549]',
  },
  {
    label: 'Montage',
    description: 'Plan een montage',
    icon: Wrench,
    href: '/montage',
    gradient: 'from-[#b05e28] to-[#d4884e]',
  },
  {
    label: 'Werkbon',
    description: 'Maak werkbon',
    icon: ClipboardCheck,
    href: '/werkbonnen',
    gradient: 'from-[#8b7355] to-[#b09670]',
  },
  {
    label: 'Factuur',
    description: 'Maak een factuur',
    icon: Receipt,
    href: '/facturen',
    gradient: 'from-accent to-primary',
  },
]

export function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Snelle Acties
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} to={action.href}>
              <Card className="wm-quick-action cursor-pointer group overflow-hidden border-black/[0.04] dark:border-white/[0.06]">
                <CardContent className="p-4 flex flex-col items-center justify-center gap-3 text-center relative">
                  <div className={`wm-action-icon flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${action.gradient} shadow-[0_4px_12px_-2px_rgba(120,90,50,0.18)]`}>
                    <Icon className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground block tracking-tight">
                      {action.label}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {action.description}
                    </span>
                  </div>
                  <ArrowUpRight className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
