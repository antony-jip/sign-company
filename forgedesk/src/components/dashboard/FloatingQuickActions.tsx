import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FilePlus, FolderPlus, Receipt, Wrench, Mail, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FABAction {
  label: string
  icon: React.ElementType
  href: string
  color: string
}

const fabActions: FABAction[] = [
  { label: 'Nieuwe Offerte', icon: FilePlus, href: '/offertes/nieuw', color: 'bg-amber-500 hover:bg-amber-600' },
  { label: 'Nieuw Project', icon: FolderPlus, href: '/projecten/nieuw', color: 'bg-primary hover:bg-primary/90' },
  { label: 'Nieuwe Factuur', icon: Receipt, href: '/facturen/nieuw', color: 'bg-emerald-500 hover:bg-emerald-600' },
  { label: 'Montage', icon: Wrench, href: '/montage', color: 'bg-orange-500 hover:bg-orange-600' },
  { label: 'Nieuwe Mail', icon: Mail, href: '/email?compose=true', color: 'bg-blue-500 hover:bg-blue-600' },
]

export function FloatingQuickActions() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col-reverse items-end gap-2">
      {/* Action items - animate in/out */}
      {isOpen && (
        <div className="flex flex-col-reverse gap-2 mb-1">
          {fabActions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => { navigate(action.href); setIsOpen(false) }}
                className={cn(
                  'flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl text-white shadow-lg transition-all duration-200',
                  'animate-in slide-in-from-bottom-2 fade-in',
                  action.color,
                )}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
              >
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                <Icon className="h-4 w-4 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Main FAB button with glass effect */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          'h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300',
          'backdrop-blur-xl border border-white/20',
          isOpen
            ? 'bg-gray-900/80 dark:bg-white/20 rotate-45 scale-110'
            : 'bg-primary/80 dark:bg-primary/60 hover:bg-primary/90 dark:hover:bg-primary/80 hover:scale-110 hover:shadow-2xl',
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white transition-transform duration-200" />
        ) : (
          <Plus className="h-6 w-6 text-white transition-transform duration-200" />
        )}
      </button>

      {/* Click-away overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
