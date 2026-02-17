import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
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
  Archive,
  Send,
} from 'lucide-react'
import { formatDateTime, getInitials } from '@/lib/utils'
import type { Email } from '@/types'

interface EmailReaderProps {
  email: Email | null
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onReply?: (email: Email) => void
  onForward?: (email: Email) => void
  onArchive?: (email: Email) => void
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
}: EmailReaderProps) {
  const [quickReply, setQuickReply] = useState('')

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        {/* Subject + actions */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{email.onderwerp}</h2>
            {/* Labels */}
            {visibleLabels.length > 0 && (
              <div className="flex gap-1.5 mt-1.5">
                {visibleLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className={`text-[10px] px-1.5 h-4 ${getLabelColor(label)}`}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
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

        {/* Sender info */}
        <div className="mt-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm ${getAvatarColor(senderName)}`}>
            {senderInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{senderName}</span>
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
          {onArchive && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onArchive(email)}>
              <Archive className="w-3.5 h-3.5" />
              Archiveren
            </Button>
          )}
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
                  <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
                    PDF
                  </div>
                  <div>
                    <span className="text-sm font-medium">Bijlage {i + 1}</span>
                    <p className="text-[10px] text-muted-foreground">PDF document</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Quick reply */}
      <div className="border-t p-3 flex-shrink-0 bg-muted/30">
        <div className="flex items-center gap-2">
          <Input
            value={quickReply}
            onChange={(e) => setQuickReply(e.target.value)}
            placeholder="Snel antwoorden..."
            className="flex-1 h-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickReply.trim()) {
                onReply?.(email)
                setQuickReply('')
              }
            }}
          />
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!quickReply.trim()}
            onClick={() => {
              if (quickReply.trim()) {
                onReply?.(email)
                setQuickReply('')
              }
            }}
          >
            <Send className="w-3.5 h-3.5" />
            Verstuur
          </Button>
        </div>
      </div>
    </div>
  )
}
