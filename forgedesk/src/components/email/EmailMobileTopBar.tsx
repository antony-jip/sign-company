import { Menu, Search, Sparkles, RefreshCw } from 'lucide-react'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
import { cn } from '@/lib/utils'
import { formatRelativeSync } from './emailHelpers'
import type { EmailFolder } from './emailTypes'

interface EmailMobileTopBarProps {
  onOpenDrawer: () => void
  searchInput: string
  onSearchChange: (value: string) => void
  selectedFolder: EmailFolder
  selectedFolderLabel: string
  todayUnreadCount: number
  userInitial: string
  onOpenAI: () => void
  onRefresh: () => void
  isRefreshing: boolean
  lastSyncAt: number | null
  nowTick: number
}

export function EmailMobileTopBar({
  onOpenDrawer,
  searchInput,
  onSearchChange,
  selectedFolder,
  selectedFolderLabel,
  todayUnreadCount,
  userInitial,
  onOpenAI,
  onRefresh,
  isRefreshing,
  lastSyncAt,
  nowTick,
}: EmailMobileTopBarProps) {
  return (
    <div className="md:hidden px-3 pb-1 bg-background pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="flex items-center gap-2 h-11 rounded-full bg-muted pl-1 pr-1">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open mappen"
          className="tap-press flex items-center justify-center w-9 h-9 rounded-full text-[#5F5E5A] dark:text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10 active:bg-card/80 transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Search className="h-4 w-4 text-[#888780] dark:text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Zoeken in mail"
            className="flex-1 min-w-0 bg-transparent text-[14px] text-foreground outline-none placeholder:text-[#888780] dark:placeholder:text-muted-foreground"
          />
        </div>

        <NotificatieCenter variant="avatar" userInitial={userInitial} />

        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Open Daan"
          className="tap-press flex items-center justify-center w-[34px] h-[34px] rounded-full text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pt-3 pb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[#888780] dark:text-muted-foreground font-medium">
          {selectedFolderLabel}
        </span>
        <div className="flex items-center gap-2 min-w-0">
          {selectedFolder === 'inbox' && todayUnreadCount > 0 && (
            <span className="text-[11px] text-[#888780] dark:text-muted-foreground whitespace-nowrap">
              vandaag · <span className="text-foreground font-medium">{todayUnreadCount}</span> nieuwe
            </span>
          )}
          {/* Naast het trek-gebaar ook een knop: wie net een mail verwacht wil
              niet gokken of de app al gesynct heeft. De tijdstempel maakt
              zichtbaar hoe vers de lijst is. */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Mail ophalen"
            className="tap-press flex items-center gap-1 text-[11px] text-[#888780] dark:text-muted-foreground disabled:opacity-60"
          >
            {lastSyncAt && !isRefreshing && (
              <span className="tabular-nums">{formatRelativeSync(lastSyncAt, nowTick)}</span>
            )}
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>
    </div>
  )
}
