import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { FolderPlus, FilePlus, UserPlus, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface QuickAction {
  label: string
  icon: LucideIcon
  href: string
  iconBg: string
  iconColor: string
  hoverBorder: string
}

const actions: QuickAction[] = [
  {
    label: 'Nieuw Project',
    icon: FolderPlus,
    href: '/projecten',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
  },
  {
    label: 'Nieuwe Offerte',
    icon: FilePlus,
    href: '/offertes/nieuw',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
    iconColor: 'text-green-600 dark:text-green-400',
    hoverBorder: 'hover:border-green-300 dark:hover:border-green-700',
  },
  {
    label: 'Nieuwe Klant',
    icon: UserPlus,
    href: '/klanten',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  {
    label: 'Upload Document',
    icon: Upload,
    href: '/documenten',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
    hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
]

export function QuickActions() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Snelle Acties
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.label} to={action.href}>
              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${action.hoverBorder}`}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center gap-3 text-center">
                  <div
                    className={`flex items-center justify-center h-12 w-12 rounded-full ${action.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {action.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
