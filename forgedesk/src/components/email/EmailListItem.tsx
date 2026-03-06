import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Star, Paperclip, Clock, AlarmClock, Pin, PinOff, Reply, Send, X,
} from 'lucide-react'
import { cn, truncate } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import type { Email } from '@/types'
import type { FontSize } from './emailTypes'
import { extractSenderName, extractSenderEmail, formatShortDate, fontSizeClasses, stripHtml, SNOOZE_OPTIONS } from './emailHelpers'
import type { EmailContact } from '@/utils/emailUtils'

interface EmailListItemProps {
  email: Email & { threadCount?: number; isThreadHead?: boolean }
  isActive: boolean
  isChecked: boolean
  isFocused: boolean
  hasChecked: boolean
  fontSize: FontSize
  isUnknownContact: boolean
  onSelect: (email: Email) => void
  onToggleStar: (email: Email) => void
  onTogglePin: (email: Email) => void
  onToggleCheck: (id: string) => void
  onSnooze: (email: Email, hours: number) => void
  onUnsnooze: (email: Email) => void
  onQuickReply?: (email: Email, text: string) => void
  showSnoozeMenu: boolean
  onShowSnoozeMenu: (id: string | null) => void
}

export function EmailListItem({
  email,
  isActive,
  isChecked,
  isFocused,
  hasChecked,
  fontSize,
  isUnknownContact,
  onSelect,
  onToggleStar,
  onTogglePin,
  onToggleCheck,
  onSnooze,
  onUnsnooze,
  onQuickReply,
  showSnoozeMenu,
  onShowSnoozeMenu,
}: EmailListItemProps) {
  const [quickReplyOpen, setQuickReplyOpen] = useState(false)
  const [quickReplyText, setQuickReplyText] = useState('')
  const isUnread = !email.gelezen
  const fs = fontSizeClasses[fontSize]

  const displayName = email.map === 'verzonden' || email.map === 'concepten'
    ? extractSenderName(email.aan)
    : extractSenderName(email.van)

  const previewText = truncate(stripHtml(email.inhoud).replace(/\n/g, ' '), 80)

  const visibleLabels = email.labels.filter(
    (l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland'
  )

  const handleQuickReply = () => {
    if (!quickReplyText.trim() || !onQuickReply) return
    onQuickReply(email, quickReplyText)
    setQuickReplyOpen(false)
    setQuickReplyText('')
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'relative flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors group border-b border-border/30',
          isActive && 'bg-primary/5 dark:bg-primary/10',
          isChecked && 'bg-primary/5 dark:bg-primary/10',
          isFocused && !isActive && !isChecked && 'ring-1 ring-inset ring-primary/30 bg-primary/[0.02]',
          !isActive && !isChecked && !isFocused && 'hover:bg-muted/40',
          isUnread && !isChecked && !isActive && 'bg-background'
        )}
        onClick={() => onSelect(email)}
      >
        {/* Unread dot */}
        <div className="w-2 flex-shrink-0 flex justify-center">
          {isUnread && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        </div>

        {/* Checkbox */}
        <div className={cn(
          'flex-shrink-0 transition-opacity',
          hasChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => onToggleCheck(email.id)}
            onClick={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary w-4 h-4"
          />
        </div>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(email) }}
          className="flex-shrink-0 p-0.5"
        >
          {email.starred ? (
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          ) : (
            <Star className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-60 transition-opacity dark:text-muted-foreground" />
          )}
        </button>

        {/* Pin indicator */}
        {email.pinned && (
          <Pin className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
        )}

        {/* Sender name */}
        <span className={cn(
          'w-36 truncate flex-shrink-0 flex items-center gap-1.5',
          fs.name,
          isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/70'
        )}>
          {isUnknownContact && email.map === 'inbox' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Nieuw contact" />
          )}
          <span className="truncate">{displayName}</span>
        </span>

        {/* Subject + preview */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={cn(
            'truncate flex-shrink-0 max-w-[50%]',
            fs.subject,
            isUnread ? 'font-semibold text-foreground' : 'text-foreground/70'
          )}>
            {email.onderwerp}
          </span>
          {previewText && (
            <span className={cn('text-muted-foreground truncate', fs.preview)}>
              — {previewText}
            </span>
          )}
        </div>

        {/* Thread count badge */}
        {email.threadCount && email.threadCount > 1 && (
          <span className="flex-shrink-0 text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {email.threadCount}
          </span>
        )}

        {/* Labels */}
        {visibleLabels.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {visibleLabels.slice(0, 2).map((label) => (
              <span
                key={label}
                className={cn(
                  'px-1.5 py-0 rounded text-[9px] font-semibold uppercase tracking-wider',
                  label === 'offerte' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
                  label === 'klant' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
                  label === 'project' && 'bg-primary/10 text-primary',
                  label === 'leverancier' && 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
                  !['offerte', 'klant', 'project', 'leverancier'].includes(label) && 'bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/60'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Attachment icon */}
        {email.bijlagen > 0 && (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(email) }}
            className="p-1 rounded hover:bg-muted"
            title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
          >
            {email.pinned ? (
              <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Pin className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShowSnoozeMenu(showSnoozeMenu ? null : email.id) }}
            className="p-1 rounded hover:bg-muted"
            title="Snooze"
          >
            <AlarmClock className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {onQuickReply && (
            <button
              onClick={(e) => { e.stopPropagation(); setQuickReplyOpen(!quickReplyOpen); setQuickReplyText('') }}
              className="p-1 rounded hover:bg-muted"
              title="Snel beantwoorden"
            >
              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Date */}
        <span className={cn(
          'text-muted-foreground flex-shrink-0 flex items-center gap-1 w-16 justify-end',
          fs.date
        )}>
          {email.scheduled_at && email.map === 'gepland' && (
            <Clock className="w-3 h-3 text-primary" />
          )}
          {formatShortDate(email.scheduled_at || email.datum)}
        </span>
      </div>

      {/* Snooze indicator */}
      {email.snoozed_until && (
        <div className="flex items-center gap-1.5 px-8 py-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 border-b border-border/30">
          <AlarmClock className="w-3 h-3" />
          Gesnoozed tot {formatDateTime(email.snoozed_until)}
          <button
            onClick={(e) => { e.stopPropagation(); onUnsnooze(email) }}
            className="ml-1 underline hover:no-underline"
          >
            Annuleren
          </button>
        </div>
      )}

      {/* Snooze dropdown */}
      {showSnoozeMenu && (
        <div className="mx-8 my-1 rounded-md border bg-popover p-1 shadow-lg">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => { e.stopPropagation(); onSnooze(email, opt.hours); onShowSnoozeMenu(null) }}
              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors flex items-center gap-2"
            >
              <AlarmClock className="w-3.5 h-3.5 text-muted-foreground" />
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick reply inline */}
      {quickReplyOpen && (
        <div className="mx-3 my-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-background shadow-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
            <Reply className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
              Beantwoorden aan {extractSenderName(email.van)}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              Ctrl+Enter om te versturen
            </span>
          </div>
          <div className="px-3 pt-2">
            <Textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Schrijf je antwoord..."
              className="min-h-[80px] max-h-[160px] text-sm resize-none border-border/50 focus-visible:ring-blue-400/40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleQuickReply()
                }
                if (e.key === 'Escape') {
                  setQuickReplyOpen(false)
                  setQuickReplyText('')
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => { setQuickReplyOpen(false); setQuickReplyText('') }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuleren
            </button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={!quickReplyText.trim()}
              onClick={handleQuickReply}
            >
              <Send className="w-3 h-3" />
              Verstuur
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
