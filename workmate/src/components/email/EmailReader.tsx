import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  X,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Underline,
  List,
  PenTool,
  ImageIcon,
  Link2,
  Smile,
  MoreHorizontal,
} from 'lucide-react'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import type { Email } from '@/types'

// ─── Default signature ──────────────────────────────────────────────

const DEFAULT_SIGNATURE = `Met vriendelijke groet,

Sign Company
T: +31 (0)20 123 4567
E: info@signcompany.nl
W: www.signcompany.nl`

// ─── Schedule helpers ───────────────────────────────────────────────

function getScheduleOptions() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  const mondayStr = nextMonday.toISOString().split('T')[0]

  return [
    { label: 'Morgen 09:00', value: `${tomorrowStr}T09:00` },
    { label: 'Morgen 14:00', value: `${tomorrowStr}T14:00` },
    { label: 'Maandag 09:00', value: `${mondayStr}T09:00` },
  ]
}

// ─── Types ──────────────────────────────────────────────────────────

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

type ReplyMode = 'reply' | 'reply-all' | 'forward'

// ─── Helpers ────────────────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════
// ─── Email Reader ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

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
  // ── Reply state ──
  const [replyMode, setReplyMode] = useState<ReplyMode | null>(null)
  const [replyTo, setReplyTo] = useState('')
  const [replyCc, setReplyCc] = useState('')
  const [replyBcc, setReplyBcc] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showSignature, setShowSignature] = useState(true)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showQuoted, setShowQuoted] = useState(false)
  const [quotedContent, setQuotedContent] = useState('')

  const scheduleRef = useRef<HTMLDivElement>(null)
  const replyBodyRef = useRef<HTMLTextAreaElement>(null)

  // Close schedule dropdown on outside click
  useEffect(() => {
    if (!showSchedule) return
    function handleClick(e: MouseEvent) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedule(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSchedule])

  // ── Open reply editor ──
  const openReply = (mode: ReplyMode) => {
    if (!email) return
    const senderAddr = extractSenderEmail(email.van)

    setReplyMode(mode)
    setShowCcBcc(false)
    setScheduledAt('')
    setShowSchedule(false)
    setShowQuoted(false)

    const quoted = `\n\nOp ${formatDateTime(email.datum)} schreef ${extractSenderName(email.van)}:\n\n${email.inhoud}`

    if (mode === 'reply') {
      setReplyTo(senderAddr)
      setReplyCc('')
      setReplyBcc('')
      setReplySubject(`Re: ${email.onderwerp}`)
      setQuotedContent(quoted)
      setReplyBody('')
    } else if (mode === 'reply-all') {
      setReplyTo(senderAddr)
      setReplyCc(email.aan !== 'ik@signcompany.nl' ? email.aan : '')
      setReplyBcc('')
      setReplySubject(`Re: ${email.onderwerp}`)
      setQuotedContent(quoted)
      setReplyBody('')
    } else if (mode === 'forward') {
      setReplyTo('')
      setReplyCc('')
      setReplyBcc('')
      setReplySubject(`Fwd: ${email.onderwerp}`)
      setQuotedContent(
        `\n\n---------- Doorgestuurd bericht ----------\nVan: ${email.van}\nDatum: ${formatDateTime(email.datum)}\nOnderwerp: ${email.onderwerp}\nAan: ${email.aan}\n\n${email.inhoud}`
      )
      setReplyBody('')
    }

    setTimeout(() => replyBodyRef.current?.focus(), 100)
  }

  const closeReply = () => {
    setReplyMode(null)
    setReplyTo('')
    setReplyCc('')
    setReplyBcc('')
    setReplySubject('')
    setReplyBody('')
    setQuotedContent('')
    setScheduledAt('')
    setShowSchedule(false)
    setShowCcBcc(false)
  }

  const handleSendReply = () => {
    if (!email || !replyTo.trim()) return
    setIsSending(true)

    if (replyMode === 'forward') {
      onForward?.(email)
    } else {
      onReply?.(email)
    }

    setIsSending(false)
    closeReply()
  }

  const scheduleOptions = getScheduleOptions()

  // ── Empty state ──
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

  // ═════════════════════════════════════════════════════════════════
  // ─── Render ────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-1">
          {onBack && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4" />
                Terug
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1.5" />
            </>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => onArchive?.(email)}>
            <Archive className="w-3.5 h-3.5" /> Archief
          </Button>
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onDelete?.(email)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Verwijderen
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => onToggleRead?.(email)}>
            {email.gelezen ? <><MailOpen className="w-3.5 h-3.5" /> Ongelezen</> : <><Mail className="w-3.5 h-3.5" /> Gelezen</>}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openReply('reply')}>
            <Reply className="w-3.5 h-3.5" /> Beantwoorden
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openReply('forward')}>
            <Forward className="w-3.5 h-3.5" /> Doorsturen
          </Button>
        </div>
      </div>

      {/* ── Email content + Reply editor ── */}
      <ScrollArea className="flex-1">
        {/* ── Email message ── */}
        <div className="px-8 pt-6 pb-4">
          {/* Subject */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-2xl font-bold text-foreground leading-snug">{email.onderwerp}</h1>
            <button onClick={() => onToggleStar?.(email)} className="mt-1 flex-shrink-0">
              {email.starred
                ? <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                : <Star className="w-5 h-5 text-gray-300 hover:text-yellow-400 transition-colors dark:text-gray-600" />
              }
            </button>
          </div>

          {/* Scheduled badge */}
          {email.scheduled_at && email.map === 'gepland' && (
            <div className="mb-5 inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-700 dark:text-purple-300">
                Ingepland: <strong>{formatDateTime(email.scheduled_at)}</strong>
              </span>
            </div>
          )}

          {/* Sender row */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
              avatarColor
            )}>
              {senderInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold text-foreground">{senderName}</span>
                <span className="text-xs text-muted-foreground">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{formatDateTime(email.datum)}</span>
                <span>Aan: {email.aan}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground/90 mb-6">
            {email.inhoud}
          </div>

          {/* Attachments */}
          {email.bijlagen > 0 && (
            <div className="pt-5 border-t mb-6">
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
                    className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl hover:bg-muted/70 cursor-pointer transition-colors border border-border/40"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">
                      PDF
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Bijlage {i + 1}</p>
                      <p className="text-xs text-muted-foreground">PDF document</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── Reply / Forward Section ─────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="px-8 pb-8">
          {!replyMode ? (
            /* ── Quick action bar ── */
            <div className="flex items-center gap-3 pt-5 border-t">
              <button
                onClick={() => openReply('reply')}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-border/60 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-sm font-medium text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
              >
                <Reply className="w-4 h-4" />
                Beantwoorden
              </button>
              <button
                onClick={() => openReply('reply-all')}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-border/60 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-sm font-medium text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
              >
                <ReplyAll className="w-4 h-4" />
                Allen beantwoorden
              </button>
              <button
                onClick={() => openReply('forward')}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-border/60 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-sm font-medium text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
              >
                <Forward className="w-4 h-4" />
                Doorsturen
              </button>
            </div>
          ) : (
            /* ═══ Full-width reply editor ═══ */
            <div className="border border-border/60 rounded-2xl overflow-hidden shadow-sm bg-background">
              {/* ── Header bar ── */}
              <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {replyMode === 'reply' && <><Reply className="w-4 h-4" /> Beantwoorden</>}
                    {replyMode === 'reply-all' && <><ReplyAll className="w-4 h-4" /> Allen beantwoorden</>}
                    {replyMode === 'forward' && <><Forward className="w-4 h-4" /> Doorsturen</>}
                  </div>
                  {replyMode !== 'forward' && (
                    <button
                      onClick={() => openReply(replyMode === 'reply' ? 'reply-all' : 'reply')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      {replyMode === 'reply' ? 'Allen beantwoorden' : 'Beantwoorden'}
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/60 dark:hover:bg-white/10" onClick={closeReply}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* ── Address fields ── */}
              <div className="px-6">
                <div className="flex items-center gap-3 py-2.5 border-b border-border/30">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Aan</span>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="Ontvanger email..."
                    className="border-0 shadow-none h-9 focus-visible:ring-0 px-0 text-sm font-medium"
                  />
                  {!showCcBcc && (
                    <button
                      onClick={() => setShowCcBcc(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      CC / BCC
                    </button>
                  )}
                </div>

                {showCcBcc && (
                  <>
                    <div className="flex items-center gap-3 py-2.5 border-b border-border/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">CC</span>
                      <Input
                        value={replyCc}
                        onChange={(e) => setReplyCc(e.target.value)}
                        placeholder="CC ontvangers..."
                        className="border-0 shadow-none h-9 focus-visible:ring-0 px-0 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 py-2.5 border-b border-border/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">BCC</span>
                      <Input
                        value={replyBcc}
                        onChange={(e) => setReplyBcc(e.target.value)}
                        placeholder="BCC ontvangers..."
                        className="border-0 shadow-none h-9 focus-visible:ring-0 px-0 text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 py-2.5 border-b border-border/30">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Onderwerp</span>
                  <Input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="border-0 shadow-none h-9 focus-visible:ring-0 px-0 text-sm font-medium"
                  />
                </div>
              </div>

              {/* ── Formatting toolbar ── */}
              <div className="px-6 py-2 border-b border-border/30 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Vet">
                  <Bold className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Cursief">
                  <Italic className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Onderstrepen">
                  <Underline className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Lijst">
                  <List className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Bijlage">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Afbeelding">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Link">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Emoji">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 text-xs rounded-lg',
                    showSignature ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-muted-foreground'
                  )}
                  onClick={() => setShowSignature(!showSignature)}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Handtekening
                </Button>
              </div>

              {/* ── Message body ── */}
              <div className="px-6 pt-4">
                <Textarea
                  ref={replyBodyRef}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Schrijf je bericht..."
                  className="min-h-[180px] resize-none border-0 shadow-none focus-visible:ring-0 px-0 text-[15px] leading-[1.7]"
                />
              </div>

              {/* ── Signature ── */}
              {showSignature && (
                <div className="px-6 pb-3">
                  <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-4 py-1">
                    <div className="text-sm text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {DEFAULT_SIGNATURE}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Quoted content ── */}
              {quotedContent && (
                <div className="px-6 pb-4">
                  <button
                    onClick={() => setShowQuoted(!showQuoted)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/60"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    {showQuoted ? 'Verberg origineel' : 'Toon origineel bericht'}
                    {showQuoted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showQuoted && (
                    <div className="mt-3 pl-4 border-l-2 border-muted-foreground/15 py-1">
                      <div className="text-sm text-muted-foreground/70 whitespace-pre-wrap leading-relaxed">
                        {quotedContent}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Send bar ── */}
              <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                    onClick={() => { closeReply(); onDelete?.(email) }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Verwijderen
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Scheduled badge */}
                  {scheduledAt && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <Clock className="w-3.5 h-3.5" />
                      Ingepland
                      <button onClick={() => setScheduledAt('')} className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Schedule dropdown */}
                  <div className="relative" ref={scheduleRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 text-xs rounded-lg border-border/60"
                      onClick={() => setShowSchedule(!showSchedule)}
                    >
                      <Clock className="w-4 h-4" />
                      Inplannen
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                    {showSchedule && (
                      <div className="absolute right-0 bottom-full mb-2 w-56 rounded-xl border bg-popover shadow-xl z-50 py-1.5 overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Verzending plannen
                        </div>
                        {scheduleOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { setScheduledAt(opt.value); setShowSchedule(false) }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2.5 transition-colors"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send button */}
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyTo.trim() || isSending}
                    size="sm"
                    className="h-9 gap-2 px-5 rounded-lg text-sm font-semibold shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    {scheduledAt ? 'Inplannen' : 'Versturen'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
