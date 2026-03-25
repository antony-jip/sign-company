import { memo, useCallback, useMemo } from 'react'
import { Star, Paperclip } from 'lucide-react'
import type { Email } from '@/types'
import { extractSenderName, stripHtml, formatShortDate, fontSizeClasses, getAvatarColor, getAvatarStyle } from './emailHelpers'
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
  const senderName = useMemo(() => extractSenderName(email.van), [email.van])
  const sizes = fontSizeClasses[fontSize]
  const avatarColor = getAvatarColor(senderName)
  const avatarStyle = getAvatarStyle(senderName)

  // Preview: memoize expensive HTML strip
  const preview = useMemo(
    () => email.inhoud ? stripHtml(email.inhoud).slice(0, 140) : '',
    [email.inhoud],
  )

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
        'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 select-none',
        isActive
          ? 'bg-[#1A535C]/[0.05]'
          : 'hover:bg-[#F0EFEC]/50',
        isFocused && !isActive && 'bg-[#F0EFEC]/30',
        isUnread && !isActive && 'bg-white',
      )}
    >
      {/* Checkbox — overlays the avatar on hover */}
      <div className="relative flex-shrink-0">
        {/* Avatar */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
            'group-hover:opacity-0',
            isChecked && 'opacity-0',
          )}
          style={{ backgroundColor: avatarStyle.bg }}
        >
          <span className="text-xs font-bold leading-none" style={{ color: avatarStyle.text }}>
            {senderName[0]?.toUpperCase()}
          </span>
        </div>
        {/* Checkbox on hover / when checked */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          isChecked && '!opacity-100',
        )}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={handleCheckClick}
            className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-[#1A535C]"
          />
        </div>
      </div>

      {/* Content: two lines */}
      <div className="flex-1 min-w-0">
        {/* Line 1: sender + date */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'truncate leading-snug',
              sizes.name,
              isUnread ? 'font-semibold text-[#1A1A1A]' : 'text-[#9B9B95]',
            )}>
              {senderName}
            </span>
            {email.threadCount && email.threadCount > 1 && (
              <span className="text-[10px] text-[#9B9B95] bg-[#F0EFEC] rounded-md px-1.5 py-0.5 flex-shrink-0 font-medium">
                {email.threadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {email.bijlagen > 0 && (
              <Paperclip className="h-3.5 w-3.5 text-[#C5C2BD]" />
            )}
            <span className={cn(
              'text-[#B0ADA8] font-mono tabular-nums',
              sizes.date,
              isUnread && 'text-[#6B6B66] font-medium',
            )}>
              {formatShortDate(email.datum)}
            </span>
          </div>
        </div>

        {/* Line 2: subject + preview */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'truncate leading-snug',
            compact ? 'max-w-full' : 'max-w-[55%] flex-shrink-0',
            sizes.subject,
            isUnread ? 'font-medium text-[#1A1A1A]' : 'text-[#9B9B95]',
          )}>
            {email.onderwerp || '(geen onderwerp)'}
          </span>
          {!compact && preview && (
            <>
              <span className="text-[#EBEBEB] flex-shrink-0">&mdash;</span>
              <span className={cn('text-[#B0ADA8] truncate', sizes.preview)}>{preview}</span>
            </>
          )}
        </div>
      </div>

      {/* Star */}
      <button
        onClick={handleStarClick}
        className={cn(
          'flex-shrink-0 p-1 rounded transition-all duration-150',
          'opacity-0 group-hover:opacity-100',
          email.starred && '!opacity-100',
          !email.starred && 'hover:bg-[#F0EFEC]',
        )}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            email.starred ? 'fill-amber-400 text-amber-400' : 'text-[#B0ADA8] hover:text-[#9B9B95]',
          )}
        />
      </button>

      {/* Unread indicator dot */}
      {isUnread && (
        <div className="w-[5px] h-[5px] rounded-full bg-[#1A535C] flex-shrink-0" />
      )}
    </div>
  )
})
