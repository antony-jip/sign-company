import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  StarOff,
  Mail,
  MailOpen,
  Paperclip,
  Inbox,
  Clock,
  Archive,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Tag,
  Plus,
} from 'lucide-react'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailReaderProps {
  email: Email | null
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onReply?: (email: Email) => void
  onForward?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
}

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getLabelColor(label: string): string {
  switch (label) {
    case 'offerte': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    case 'klant': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    case 'project': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
    case 'leverancier': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

export function EmailReader({
  email,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
  onArchive,
  onBack,
}: EmailReaderProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set([0]))

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="w-10 h-10 opacity-30" />
        </div>
        <p className="text-lg font-medium">Selecteer een email</p>
        <p className="text-sm mt-1 text-center max-w-xs">Kies een bericht uit de lijst om de inhoud te bekijken.</p>
      </div>
    )
  }

  const senderName = extractSenderName(email.van)
  const senderInitials = getInitials(senderName)
  const visibleLabels = email.labels.filter((l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland')

  const toggleMessage = (index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Toolbar (Pipedrive-style) ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
          )}
          {onBack && <Separator orientation="vertical" className="h-5 mx-1" />}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => onArchive?.(email)}
          >
            <Archive className="w-3.5 h-3.5" />
            Archief
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete?.(email)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Verwijderen
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => onToggleRead?.(email)}
          >
            {email.gelezen ? (
              <>
                <MailOpen className="w-3.5 h-3.5" />
                Markeer als ongelezen
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Markeer als gelezen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Subject Header ── */}
      <div className="px-6 pt-5 pb-4 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground leading-tight">{email.onderwerp}</h2>

            {/* Labels + "Label toevoegen" */}
            <div className="flex items-center gap-2 mt-2">
              {visibleLabels.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className={`text-xs uppercase tracking-wider font-semibold px-2 py-0.5 ${getLabelColor(label)}`}
                >
                  {label}
                </Badge>
              ))}
              <button className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <Tag className="w-3 h-3" />
                Label toevoegen
              </button>
            </div>
          </div>

          {/* Star */}
          <button
            onClick={() => onToggleStar?.(email)}
            className="mt-1 flex-shrink-0"
            title={email.starred ? 'Ster verwijderen' : 'Ster toevoegen'}
          >
            {email.starred ? (
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            ) : (
              <Star className="w-5 h-5 text-gray-300 hover:text-yellow-400 transition-colors" />
            )}
          </button>
        </div>

        {/* Scheduled indicator */}
        {email.scheduled_at && email.map === 'gepland' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-300">
              Ingepland voor verzending op{' '}
              <strong>{formatDateTime(email.scheduled_at)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Thread / Conversation View ── */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {/* Main email message (thread style) */}
          {[email].map((msg, index) => {
            const msgSenderName = extractSenderName(msg.van)
            const msgSenderInitials = getInitials(msgSenderName)
            const isExpanded = expandedMessages.has(index)

            return (
              <div key={msg.id + '-' + index} className="group">
                {/* Message header - always visible */}
                <div
                  className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleMessage(index)}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${getAvatarColor(msgSenderName)}`}>
                    {msgSenderInitials}
                  </div>

                  {/* Sender info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{msgSenderName}</span>
                      <span className="text-xs text-muted-foreground">
                        &lt;{extractSenderEmail(msg.van)}&gt;
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {msg.inhoud.split('\n')[0].substring(0, 100)}
                      </p>
                    )}
                  </div>

                  {/* Date + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(msg.datum)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded message content */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    {/* To info */}
                    <div className="ml-12 mb-4 text-xs text-muted-foreground">
                      Aan: {msg.aan}
                    </div>

                    {/* Email body */}
                    <div className="ml-12 prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {msg.inhoud}
                      </div>
                    </div>

                    {/* Attachments */}
                    {msg.bijlagen > 0 && (
                      <div className="ml-12 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {msg.bijlagen} bijlage{msg.bijlagen > 1 ? 'n' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: msg.bijlagen }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                            >
                              <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
                                PDF
                              </div>
                              <div>
                                <span className="text-xs font-medium">Bijlage {i + 1}</span>
                                <p className="text-[10px] text-muted-foreground">PDF document</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-message action buttons */}
                    <div className="ml-12 mt-4 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReply?.(msg)
                        }}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Beantwoorden
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReply?.(msg)
                        }}
                      >
                        <ReplyAll className="w-3.5 h-3.5" />
                        Allen beantwoorden
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onForward?.(msg)
                        }}
                      >
                        <Forward className="w-3.5 h-3.5" />
                        Doorsturen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* ── Reply Box (Pipedrive-style) ── */}
      <div className="border-t flex-shrink-0">
        {!replyOpen ? (
          <div className="p-4">
            <button
              onClick={() => setReplyOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-sm text-muted-foreground"
            >
              <Reply className="w-4 h-4" />
              Klik hier om te antwoorden...
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Reply className="w-3.5 h-3.5" />
              <span>Beantwoorden aan <strong className="text-foreground">{senderName}</strong></span>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Schrijf je antwoord..."
              className="min-h-[120px] resize-y"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Bijlage
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyOpen(false)
                    setReplyText('')
                  }}
                >
                  Annuleren
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!replyText.trim()}
                  onClick={() => {
                    if (replyText.trim()) {
                      onReply?.(email)
                      setReplyText('')
                      setReplyOpen(false)
                    }
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Verstuur
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
