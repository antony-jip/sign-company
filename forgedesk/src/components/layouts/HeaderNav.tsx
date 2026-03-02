import { NavLink } from 'react-router-dom'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

interface HeaderNavItem {
  label: string
  path: string
  icon: LucideIcon
  sidebarKey: string
}

const NAV_ITEMS: HeaderNavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, sidebarKey: 'Dashboard' },
  { label: 'Projecten', path: '/projecten', icon: FolderKanban, sidebarKey: 'Projecten' },
  { label: 'Klanten', path: '/klanten', icon: Users, sidebarKey: 'Klanten' },
  { label: 'Offertes', path: '/offertes', icon: FileText, sidebarKey: 'Offertes' },
  { label: 'Facturen', path: '/facturen', icon: Receipt, sidebarKey: 'Facturen' },
]

export function HeaderNav() {
  const { settings } = useAppSettings()
  const sidebarItems = settings.sidebar_items || []

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.sidebarKey === 'Dashboard' || sidebarItems.length === 0 || sidebarItems.includes(item.sidebarKey)
  )

  return (
    <nav className="hidden md:flex items-center h-10 px-4 bg-card/80 dark:bg-card/80 backdrop-blur-sm border-b border-border/40 flex-shrink-0 z-10">
      <span className="text-sm font-bold text-primary mr-6 tracking-tight">FORGEdesk</span>
      <div className="flex items-center gap-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )
            }
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
