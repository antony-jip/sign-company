import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderKanban,
  MoreHorizontal,
  Receipt,
  Wrench,
  Calendar,
  ClipboardList,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface MobileNavItem {
  label: string
  icon: LucideIcon
  path: string
}

const PRIMARY_ITEMS: MobileNavItem[] = [
  { label: 'Home', icon: LayoutDashboard, path: '/' },
  { label: 'Klanten', icon: Users, path: '/klanten' },
  { label: 'Offertes', icon: FileText, path: '/offertes' },
  { label: 'Projecten', icon: FolderKanban, path: '/projecten' },
]

const MORE_ITEMS: MobileNavItem[] = [
  { label: 'Facturen', icon: Receipt, path: '/facturen' },
  { label: 'Werkbonnen', icon: ClipboardList, path: '/werkbonnen' },
  { label: 'Planning', icon: Calendar, path: '/planning' },
  { label: 'Tijdregistratie', icon: Clock, path: '/tijdregistratie' },
]

export function MobileBottomNav() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname.startsWith(item.path)
  )

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute bottom-16 left-3 right-3 bg-card/95 backdrop-blur-lg border border-border/60 rounded-2xl shadow-2xl shadow-black/15 overflow-hidden animate-scale-in">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-foreground/70 hover:bg-muted/50'
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-card/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-2xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
          >
            <MoreHorizontal
              className={cn(
                'w-5 h-5 transition-colors',
                isMoreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-2xs font-medium transition-colors',
                isMoreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Meer
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
