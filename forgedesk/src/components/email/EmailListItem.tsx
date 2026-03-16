import { memo, useCallback } from 'react'
import { Star, Paperclip } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, stripHtml, formatShortDate } from './emailHelpers'
import { cn } from '@/lib/utils'

interface EmailListItemProps {
  email: Email & { threadCount?: number }
  isActive: boolean
  isChecked: boolean
  isFocused: boolean
  compact?: boolean
  onSelect: (email: Email) => void
  onToggleStar: (email: Email) => void
  onToggleCheck: (id: string) => void
}

export const EmailListItem = memo(function EmailListItem({
  email,
  isActive,
  isChecked,
  isFocused,
  compact,
  onSelect,
  onToggleStar,
  onToggleCheck,
}: EmailListItemProps) {
  const isUnread = !email.gelezen
  const senderName = extractSenderName(email.van)
  const preview = stripHtml(email.inhoud).slice(0, 120)

  const handleClick = useCallback(() => {
    onSelect(email)
  }, [email, onSelect])

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleStar(email)
  }, [email, onToggleStar])

  const handleCheckClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCheck(email.id)
  }, [email.id, onToggleCheck])

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-center h-10 px-4 cursor-pointer transition-colors duration-100 select-none',
        isActive && 'bg-[#EBE9E4] border-l-2 border-l-primary',
        !isActive && 'hover:bg-[#F4F3F0]/50 border-l-2 border-l-transparent',
        isFocused && !isActive && 'bg-[#F4F3F0]/30',
        isUnread ? 'font-medium' : 'font-normal text-foreground/70',
      )}
    >
      {/* Unread indicator */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Checkbox */}
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          onClick={handleCheckClick}
          className={cn(
            'h-3.5 w-3.5 rounded border-border cursor-pointer accent-primary',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            isChecked && '!opacity-100',
          )}
        />
      </div>

      {/* Star */}
      <button
        onClick={handleStarClick}
        className={cn(
          'w-6 flex-shrink-0 flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          email.starred && '!opacity-100',
        )}
      >
        <Star
          className={cn(
            'h-3.5 w-3.5',
            email.starred ? 'fill-amber-400 text-amber-400' : 'text-foreground/30 hover:text-foreground/50',
          )}
        />
      </button>

      {/* Sender */}
      <div className={cn(
        'flex-shrink-0 truncate text-sm',
        compact ? 'w-[140px]' : 'w-[200px]',
        isUnread ? 'font-semibold text-foreground' : 'text-foreground/70',
      )}>
        {senderName}
      </div>

      {/* Subject + preview */}
      {!compact ? (
        <div className="flex-1 min-w-0 flex items-center gap-1.5 mx-3">
          <span className={cn(
            'text-sm truncate flex-shrink-0 max-w-[40%]',
            isUnread ? 'font-medium text-foreground' : 'text-foreground/70',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {preview && (
            <>
              <span className="text-foreground/30 flex-shrink-0">&mdash;</span>
              <span className="text-sm text-foreground/40 truncate">{preview}</span>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 min-w-0 mx-3">
          <span className={cn(
            'text-sm truncate block',
            isUnread ? 'font-medium text-foreground' : 'text-foreground/70',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
        </div>
      )}

      {/* Thread count */}
      {email.threadCount && email.threadCount > 1 && (
        <span className="text-2xs text-foreground/40 bg-foreground/5 rounded px-1.5 py-0.5 mr-2 flex-shrink-0">
          {email.threadCount}
        </span>
      )}

      {/* Attachment icon */}
      {email.bijlagen > 0 && (
        <Paperclip className="h-3.5 w-3.5 text-foreground/30 mr-2 flex-shrink-0" />
      )}

      {/* Time */}
      <span className="text-xs text-foreground/40 flex-shrink-0 w-[60px] text-right">
        {formatShortDate(email.datum)}
      </span>
    </div>
  )
})
