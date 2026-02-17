import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Reply,
  Forward,
  Trash2,
  Star,
  StarOff,
  Mail,
  MailOpen,
  Paperclip,
  Inbox,
  Clock,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailReaderProps {
  email: Email | null
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onReply?: (email: Email) => void
  onForward?: (email: Email) => void
}

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

export function EmailReader({
  email,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReply,
  onForward,
}: EmailReaderProps) {
  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Inbox className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecteer een email om te lezen</p>
        <p className="text-sm mt-1">Klik op een email in de lijst om de inhoud te bekijken.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold leading-tight">{email.onderwerp}</h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => onToggleStar?.(email)}
              title={email.starred ? 'Ster verwijderen' : 'Ster toevoegen'}
            >
              {email.starred ? (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => onToggleRead?.(email)}
              title={email.gelezen ? 'Markeer als ongelezen' : 'Markeer als gelezen'}
            >
              {email.gelezen ? (
                <MailOpen className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Mail className="w-4 h-4 text-blue-500" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 dark:text-blue-300 text-sm font-semibold">
              {extractSenderName(email.van).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{extractSenderName(email.van)}</span>
              <span className="text-xs text-muted-foreground">
                &lt;{extractSenderEmail(email.van)}&gt;
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Aan: {email.aan}
            </div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDateTime(email.datum)}
          </span>
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

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onReply?.(email)}>
            <Reply className="w-3.5 h-3.5" />
            Beantwoorden
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onForward?.(email)}>
            <Forward className="w-3.5 h-3.5" />
            Doorsturen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete?.(email)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Verwijderen
          </Button>
        </div>
      </div>

      {/* Email body */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {email.inhoud}
          </div>
        </div>

        {/* Attachments */}
        {email.bijlagen > 0 && (
          <div className="px-6 pb-6">
            <Separator className="mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: email.bijlagen }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">Bijlage {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
