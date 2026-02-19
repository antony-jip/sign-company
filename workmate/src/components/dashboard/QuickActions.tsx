import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { FolderPlus, FilePlus, UserPlus, Receipt, Calendar, Mail, ArrowUpRight } from 'lucide-react'
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
    label: 'Nieuw Project',
    description: 'Start een project',
    icon: FolderPlus,
    href: '/projecten/nieuw',
    gradient: 'from-primary to-wm-light',
  },
  {
    label: 'Nieuwe Offerte',
    description: 'Maak een offerte',
    icon: FilePlus,
    href: '/offertes/nieuw',
    gradient: 'from-accent to-primary',
  },
  {
    label: 'Nieuwe Klant',
    description: 'Voeg klant toe',
    icon: UserPlus,
    href: '/klanten',
    gradient: 'from-[#4A442D] to-[#6b6549]',
  },
  {
    label: 'Nieuwe Factuur',
    description: 'Maak een factuur',
    icon: Receipt,
    href: '/facturen',
    gradient: 'from-[#8b7355] to-[#b09670]',
  },
  {
    label: 'Planning',
    description: 'Bekijk kalender',
    icon: Calendar,
    href: '/kalender',
    gradient: 'from-accent to-primary',
  },
  {
    label: 'Email',
    description: 'Stuur een email',
    icon: Mail,
    href: '/email',
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
              <Card className="wm-quick-action cursor-pointer group overflow-hidden border-border/50">
                <CardContent className="p-4 flex flex-col items-center justify-center gap-3 text-center relative">
                  <div className={`wm-action-icon flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      {action.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:block">
                      {action.description}
                    </span>
                  </div>
                  <ArrowUpRight className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
