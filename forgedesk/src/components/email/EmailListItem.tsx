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
  isCrmMatched?: boolean
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
  isCrmMatched,
}: EmailListItemProps) {
  const [quickReplyOpen, setQuickReplyOpen] = useState(false)
  const [quickReplyText, setQuickReplyText] = useState('')
  const isUnread = !email.gelezen

  const displayName = email.map === 'verzonden' || email.map === 'concepten'
    ? extractSenderName(email.aan)
    : extractSenderName(email.van)

  const previewText = stripHtml(email.inhoud).replace(/\n/g, ' ').trim()

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
          'relative flex gap-3 px-4 py-4 md:py-3 cursor-pointer transition-all duration-100 group min-h-[72px]',
          isActive && 'bg-stone-100/80 dark:bg-stone-800/30 border-l-2 border-l-[#8BAFD4]',
          !isActive && isChecked && 'bg-stone-50/60 dark:bg-stone-800/20',
          isFocused && !isActive && !isChecked && 'bg-stone-50/40 dark:bg-stone-800/10',
          !isActive && !isChecked && !isFocused && 'hover:bg-stone-50/60 dark:hover:bg-stone-800/10 border-l-2 border-l-transparent',
          !isActive && 'border-l-2 border-l-transparent',
          'border-b border-stone-100 dark:border-stone-800/40'
        )}
        onClick={() => onSelect(email)}
      >
        {/* Left column: unread dot + checkbox */}
        <div className="flex flex-col items-center gap-1.5 pt-0.5 w-5 flex-shrink-0">
          {/* Unread dot */}
          <div className="w-2 h-4 flex items-center justify-center">
            {isUnread && <div className="w-2 h-2 rounded-full bg-[#8BAFD4]" />}
          </div>
          {/* Checkbox - appears on hover or when any are checked */}
          <div className={cn(
            'transition-opacity',
            hasChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggleCheck(email.id)}
              onClick={(e) => e.stopPropagation()}
              className="data-[state=checked]:bg-[#8BAFD4] data-[state=checked]:border-[#8BAFD4] w-4 h-4"
            />
          </div>
        </div>

        {/* Main content: 3-line layout */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {/* Line 1: Sender name + time + attachment + star */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'truncate flex-1 flex items-center gap-1.5',
              isUnread ? 'font-medium text-[#1a1a1a] dark:text-stone-100' : 'font-normal text-stone-600 dark:text-stone-400'
            )}>
              {isCrmMatched && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#8BAFD4] flex-shrink-0" title="CRM klant" />
              )}
              <span className="truncate text-sm">{displayName}</span>
              {/* Thread count */}
              {email.threadCount && email.threadCount > 1 && (
                <span className="flex-shrink-0 text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-mono">
                  {email.threadCount}
                </span>
              )}
            </span>
            {/* Pin indicator */}
            {email.pinned && (
              <Pin className="w-3.5 h-3.5 text-[#8BAFD4] fill-[#8BAFD4] flex-shrink-0" />
            )}
            {/* Attachment icon */}
            {email.bijlagen > 0 && (
              <Paperclip className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            )}
            {/* Star */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(email) }}
              className="flex-shrink-0 p-0.5"
            >
              {email.starred ? (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              ) : (
                <Star className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity dark:text-stone-600" />
              )}
            </button>
            {/* Time */}
            <span className="text-xs font-mono text-stone-400 dark:text-stone-500 flex-shrink-0 flex items-center gap-1 min-w-[48px] justify-end">
              {email.scheduled_at && email.map === 'gepland' && (
                <Clock className="w-3 h-3 text-[#8BAFD4]" />
              )}
              {formatShortDate(email.scheduled_at || email.datum)}
            </span>
          </div>

          {/* Line 2: Subject */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'truncate text-sm',
              isUnread ? 'text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-500'
            )}>
              {email.onderwerp}
            </span>
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
                      !['offerte', 'klant', 'project', 'leverancier'].includes(label) && 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Line 3: Preview */}
          {previewText && (
            <span className="text-sm text-stone-400 dark:text-stone-500 truncate">
              {truncate(previewText, 120)}
            </span>
          )}
        </div>

        {/* Hover actions */}
        <div className="absolute right-3 top-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-stone-100 dark:border-stone-800">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(email) }}
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
          >
            {email.pinned ? (
              <PinOff className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            ) : (
              <Pin className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShowSnoozeMenu(showSnoozeMenu ? null : email.id) }}
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Snooze"
          >
            <AlarmClock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          </button>
          {onQuickReply && (
            <button
              onClick={(e) => { e.stopPropagation(); setQuickReplyOpen(!quickReplyOpen); setQuickReplyText('') }}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Snel beantwoorden"
            >
              <Reply className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            </button>
          )}
        </div>
      </div>

      {/* Snooze indicator */}
      {email.snoozed_until && (
        <div className="flex items-center gap-1.5 px-8 py-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/10 border-b border-stone-100 dark:border-stone-800/40">
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
        <div className="mx-8 my-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-1 shadow-lg">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => { e.stopPropagation(); onSnooze(email, opt.hours); onShowSnoozeMenu(null) }}
              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
            >
              <AlarmClock className="w-3.5 h-3.5 text-stone-400" />
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick reply inline */}
      {quickReplyOpen && (
        <div className="mx-4 my-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50/60 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-800">
            <Reply className="w-3.5 h-3.5 text-[#8BAFD4]" />
            <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
              Beantwoorden aan {extractSenderName(email.van)}
            </span>
            <span className="text-[10px] text-stone-400 ml-auto">
              Ctrl+Enter om te versturen
            </span>
          </div>
          <div className="px-3 pt-2">
            <Textarea
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Schrijf je antwoord..."
              className="min-h-[80px] max-h-[160px] text-sm resize-none border-stone-200 dark:border-stone-700 focus-visible:ring-[#8BAFD4]/40"
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
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              Annuleren
            </button>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white"
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
