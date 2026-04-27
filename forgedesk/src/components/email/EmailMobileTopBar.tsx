import { Menu, Search, Sparkles } from 'lucide-react'
import { NotificatieCenter } from '@/components/notifications/NotificatieCenter'
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
}: EmailMobileTopBarProps) {
  return (
    <div className="md:hidden px-3 pt-3 pb-1 bg-[#F8F7F5]">
      <div className="flex items-center gap-2 h-11 rounded-full bg-[#F0EFEC] pl-1 pr-1">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open mappen"
          className="flex items-center justify-center w-9 h-9 rounded-full text-[#5F5E5A] hover:bg-white/60 active:bg-white/80 transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Search className="h-4 w-4 text-[#888780] flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Zoeken in mail"
            className="flex-1 min-w-0 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#888780]"
          />
        </div>

        <NotificatieCenter variant="avatar" userInitial={userInitial} />

        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Open Daan"
          className="flex items-center justify-center w-[34px] h-[34px] rounded-full text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#888780] font-medium">
          {selectedFolderLabel}
        </span>
        {selectedFolder === 'inbox' && todayUnreadCount > 0 && (
          <span className="text-[11px] text-[#888780]">
            vandaag · <span className="text-[#1A1A1A] font-medium">{todayUnreadCount}</span> nieuwe
          </span>
        )}
      </div>
    </div>
  )
}
