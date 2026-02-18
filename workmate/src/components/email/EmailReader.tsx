import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Mail,
  MailOpen,
  Paperclip,
  Inbox,
  Clock,
  Archive,
  Send,
  ArrowLeft,
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
  const [replyExpanded, setReplyExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')

  // Empty state
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mb-5">
          <Inbox className="w-9 h-9 opacity-30" />
        </div>
        <p className="text-lg font-semibold text-foreground/60">Selecteer een email</p>
        <p className="text-sm mt-1.5 text-muted-foreground/70 text-center max-w-[260px]">
          Kies een bericht uit de lijst om de inhoud te bekijken.
        </p>
      </div>
    )
  }

  const senderName = extractSenderName(email.van)
  const senderEmail = extractSenderEmail(email.van)
  const senderInitials = getInitials(senderName)
  const avatarColor = getAvatarColor(senderName)

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 flex-shrink-0">
        {onBack && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
              onClick={onBack}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Terug
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1" />
          </>
        )}
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
              Ongelezen
            </>
          ) : (
            <>
              <Mail className="w-3.5 h-3.5" />
              Gelezen
            </>
          )}
        </Button>
      </div>

      {/* ── Scrollable content area ── */}
      <ScrollArea className="flex-1">
        <div className="px-6 pt-5 pb-6 max-w-3xl">
          {/* Subject + Star */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-foreground leading-tight">
              {email.onderwerp}
            </h2>
            <button
              onClick={() => onToggleStar?.(email)}
              className="mt-0.5 flex-shrink-0"
              title={email.starred ? 'Ster verwijderen' : 'Ster toevoegen'}
            >
              {email.starred ? (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ) : (
                <Star className="w-5 h-5 text-gray-300 hover:text-yellow-400 transition-colors dark:text-gray-600" />
              )}
            </button>
          </div>

          {/* Scheduled indicator */}
          {email.scheduled_at && email.map === 'gepland' && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">
                Ingepland voor verzending op{' '}
                <strong>{formatDateTime(email.scheduled_at)}</strong>
              </span>
            </div>
          )}

          {/* Sender info */}
          <div className="flex items-center gap-3 mb-1">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
              avatarColor
            )}>
              {senderInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{senderName}</span>
                <span className="text-xs text-muted-foreground">
                  &lt;{senderEmail}&gt;
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(email.datum)}
              </div>
            </div>
          </div>

          {/* To line */}
          <div className="text-xs text-muted-foreground mb-6 ml-[52px]">
            Aan: {email.aan}
          </div>

          {/* ── Email body ── */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {email.inhoud}
            </div>
          </div>

          {/* Attachments */}
          {email.bijlagen > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: email.bijlagen }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/60 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-border/50"
                  >
                    <div className="w-9 h-9 rounded bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
                      PDF
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Bijlage {i + 1}</p>
                      <p className="text-[10px] text-muted-foreground">PDF document</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Inline Reply Box ── */}
        <div className="px-6 pb-6 max-w-3xl">
          <div className="border rounded-lg overflow-hidden">
            {!replyExpanded ? (
              /* Collapsed state */
              <button
                onClick={() => setReplyExpanded(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-sm text-muted-foreground"
              >
                <Reply className="w-4 h-4" />
                <span>Klik hier om te antwoorden...</span>
              </button>
            ) : (
              /* Expanded state */
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Reply className="w-3.5 h-3.5" />
                  <span>
                    Beantwoorden aan{' '}
                    <strong className="text-foreground">{senderName}</strong>
                  </span>
                </div>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Schrijf je antwoord..."
                  className="min-h-[120px] resize-y border-0 shadow-none focus-visible:ring-0 px-0"
                  autoFocus
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-muted-foreground"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Bijlage
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-muted-foreground"
                      onClick={() => onReply?.(email)}
                    >
                      <ReplyAll className="w-3.5 h-3.5" />
                      Allen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-xs text-muted-foreground"
                      onClick={() => {
                        setReplyExpanded(false)
                        setReplyText('')
                        onForward?.(email)
                      }}
                    >
                      <Forward className="w-3.5 h-3.5" />
                      Doorsturen
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setReplyExpanded(false)
                        setReplyText('')
                      }}
                    >
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 h-8"
                      disabled={!replyText.trim()}
                      onClick={() => {
                        if (replyText.trim()) {
                          onReply?.(email)
                          setReplyText('')
                          setReplyExpanded(false)
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
      </ScrollArea>
    </div>
  )
}
