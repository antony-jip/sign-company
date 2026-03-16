import { memo, useCallback } from 'react'
import { Star, Paperclip } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, stripHtml, formatShortDate, fontSizeClasses } from './emailHelpers'
import type { FontSize } from './emailTypes'
import { cn } from '@/lib/utils'

interface EmailListItemProps {
  email: Email & { threadCount?: number }
  isActive: boolean
  isChecked: boolean
  isFocused: boolean
  compact?: boolean
  fontSize?: FontSize
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
  fontSize = 'medium',
  onSelect,
  onToggleStar,
  onToggleCheck,
}: EmailListItemProps) {
  const isUnread = !email.gelezen
  const senderName = extractSenderName(email.van)
  const sizes = fontSizeClasses[fontSize]

  // Preview: use inhoud if available, otherwise empty (IMAP bodies load on click)
  const preview = email.inhoud ? stripHtml(email.inhoud).slice(0, 120) : ''

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
        'group flex items-start px-4 py-2.5 cursor-pointer transition-colors duration-100 select-none border-b border-border/20',
        isActive && 'bg-[#EBE9E4] border-l-2 border-l-primary',
        !isActive && 'hover:bg-[#F4F3F0]/50 border-l-2 border-l-transparent',
        isFocused && !isActive && 'bg-[#F4F3F0]/30',
      )}
    >
      {/* Left column: unread dot + checkbox + star */}
      <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5 mr-2">
        <div className="w-4 flex items-center justify-center">
          {isUnread && (
            <div className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>

        <div className="w-5 flex items-center justify-center">
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

        <button
          onClick={handleStarClick}
          className={cn(
            'w-5 flex items-center justify-center',
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
      </div>

      {/* Content: two lines */}
      <div className="flex-1 min-w-0">
        {/* Line 1: sender + meta */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'truncate',
              sizes.name,
              isUnread ? 'font-semibold text-foreground' : 'text-foreground/70',
            )}>
              {senderName}
            </span>
            {email.threadCount && email.threadCount > 1 && (
              <span className="text-2xs text-foreground/40 bg-foreground/5 rounded px-1.5 py-0.5 flex-shrink-0">
                {email.threadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {email.bijlagen > 0 && (
              <Paperclip className="h-3.5 w-3.5 text-foreground/30" />
            )}
            <span className={cn('text-foreground/40 flex-shrink-0', sizes.date)}>
              {formatShortDate(email.datum)}
            </span>
          </div>
        </div>

        {/* Line 2: subject + preview */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            'truncate flex-shrink-0',
            compact ? 'max-w-full' : 'max-w-[50%]',
            sizes.subject,
            isUnread ? 'font-medium text-foreground' : 'text-foreground/60',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {!compact && (preview || email.onderwerp) && (
            <>
              {preview && (
                <>
                  <span className="text-foreground/25 flex-shrink-0">&mdash;</span>
                  <span className={cn('text-foreground/40 truncate', sizes.preview)}>{preview}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
