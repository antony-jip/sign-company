import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Trash2, Star, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
  UserPlus, FolderPlus, FileText, ListPlus, Check,
  Building2, Mail, Undo2, Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor } from './emailHelpers'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { createKlant } from '@/services/supabaseService'

interface EmailReaderProps {
  email: Email | null
  isLoadingBody?: boolean
  emailIndex?: number
  emailTotal?: number
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onSendReply?: (data: { to: string; subject: string; body: string; html?: string }) => void
}

export function EmailReader({
  email,
  isLoadingBody,
  emailIndex,
  emailTotal,
  onToggleStar,
  onToggleRead,
  onDelete,
  onArchive,
  onBack,
  onNavigate,
  onSendReply,
}: EmailReaderProps) {
  const navigate = useNavigate()
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte } = useAppSettings()

  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [replyTo, setReplyTo] = useState('')
  const [showQuotedText, setShowQuotedText] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forgieLoading, setForgieLoading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Build signature HTML
  const signatureHtml = useMemo(() => {
    const imgHeight = handtekeningAfbeeldingGrootte ?? 64
    const imgMaxWidth = Math.round(imgHeight * 2.5)
    const parts: string[] = []
    if (emailHandtekening) {
      parts.push(emailHandtekening.replace(/\n/g, '<br>'))
    }
    if (handtekeningAfbeelding) {
      parts.push(`<img src="${handtekeningAfbeelding}" alt="Logo" style="max-height:${imgHeight}px;max-width:${imgMaxWidth}px;object-fit:contain;" />`)
    }
    return parts.length ? `<br><br>--<br>${parts.join('<br>')}` : ''
  }, [emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte])

  // Reset reply state when email changes
  useEffect(() => {
    setReplyMode(null)
    setShowQuotedText(false)
  }, [email?.id])

  const handleReply = useCallback((mode: 'reply' | 'reply-all' | 'forward') => {
    if (!email) return
    setReplyMode(mode)
    if (mode === 'forward') {
      setReplyTo('')
    } else {
      setReplyTo(extractSenderEmail(email.van))
    }
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br>${signatureHtml}`
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
        editorRef.current.focus()
      }
    }, 50)
  }, [email, signatureHtml])

  const handleSend = useCallback(async () => {
    if (!email || !editorRef.current || !onSendReply) return
    const html = editorRef.current.innerHTML
    if (!html.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Bericht is leeg')
      return
    }
    setIsSending(true)
    try {
      const prefix = replyMode === 'forward' ? 'Fwd: ' : 'Re: '
      const subject = email.onderwerp.startsWith(prefix) ? email.onderwerp : `${prefix}${email.onderwerp}`
      const quotedOriginal = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666;"><p>Op ${formatShortDate(email.datum)} schreef ${extractSenderName(email.van)}:</p>${email.inhoud}</div>`
      await onSendReply({
        to: replyTo,
        subject,
        body: editorRef.current.innerText,
        html: html + quotedOriginal,
      })
      setReplyMode(null)
      toast.success('Email verzonden')
    } catch {
      toast.error('Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }, [email, replyMode, replyTo, onSendReply])

  const handleForgieWrite = useCallback(async () => {
    if (!email || !editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Oorspronkelijk bericht van ${extractSenderName(email.van)}: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 500)}`
      const response = await callForgie('generate-reply', context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    } catch {
      toast.error('Forgie kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, signatureHtml])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/30 h-full">
        <p className="text-sm">Selecteer een email om te lezen</p>
      </div>
    )
  }

  const senderName = extractSenderName(email.van)
  const senderEmail = extractSenderEmail(email.van)
  const avatarColor = getAvatarColor(senderName)
  const sanitizedBody = email.inhoud ? DOMPurify.sanitize(email.inhoud, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'style'],
  }) : ''

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULL-SCREEN REPLY MODE (like Pipedrive)
  // When replying, the compose view takes over the entire screen.
  // No email body visible — pure focus on writing.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (replyMode) {
    const replySubject = (() => {
      const prefix = replyMode === 'forward' ? 'Fwd: ' : 'Re: '
      return email.onderwerp.startsWith(prefix) ? email.onderwerp : `${prefix}${email.onderwerp}`
    })()

    return (
      <div className="flex h-full">
        {/* ─── MAIN: full-screen compose ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top action bar — same as reading view */}
          <div className="flex items-center justify-between px-5 h-12 border-b border-foreground/[0.06] flex-shrink-0 bg-white">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Terug</span>
              </Button>
              <div className="w-px h-5 bg-foreground/[0.08] mx-1.5" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.04]" onClick={() => email && onArchive?.(email)} title="Archiveren">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-red-500 hover:bg-red-500/[0.06]" onClick={() => email && onDelete?.(email)} title="Verwijderen">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.04]" onClick={() => email && onToggleRead?.(email)} title="Markeer als ongelezen">
                <MailOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-sm text-foreground/35">
              {emailIndex !== undefined && emailTotal !== undefined && (
                <>
                  <span className="tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ─── Compose fields ─── */}
          <div className="border-b border-foreground/[0.06] bg-white flex-shrink-0">
            {/* Aan field */}
            <div className="flex items-center px-6 py-2.5 border-b border-foreground/[0.04]">
              <span className="text-sm text-foreground/35 w-10 flex-shrink-0">Aan</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground min-w-0 placeholder:text-foreground/25"
                  placeholder="ontvanger@voorbeeld.nl"
                />
              </div>
              {/* Reply mode switcher */}
              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setReplyMode('reply')
                    setReplyTo(extractSenderEmail(email.van))
                  }}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    replyMode === 'reply' ? 'text-primary bg-primary/[0.06]' : 'text-foreground/25 hover:text-foreground/50 hover:bg-foreground/[0.04]',
                  )}
                  title="Beantwoorden"
                >
                  <Reply className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('reply-all')
                    setReplyTo(extractSenderEmail(email.van))
                  }}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    replyMode === 'reply-all' ? 'text-primary bg-primary/[0.06]' : 'text-foreground/25 hover:text-foreground/50 hover:bg-foreground/[0.04]',
                  )}
                  title="Allen beantwoorden"
                >
                  <ReplyAll className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('forward')
                    setReplyTo('')
                  }}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    replyMode === 'forward' ? 'text-primary bg-primary/[0.06]' : 'text-foreground/25 hover:text-foreground/50 hover:bg-foreground/[0.04]',
                  )}
                  title="Doorsturen"
                >
                  <Forward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center px-6 py-2.5 border-b border-foreground/[0.04]">
              <span className="text-sm text-foreground/35 w-10 flex-shrink-0" />
              <span className="text-sm text-foreground/70 truncate">{replySubject}</span>
            </div>

            {/* Quick tools: AI schrijven */}
            <div className="flex items-center gap-3 px-6 py-2">
              <button
                onClick={handleForgieWrite}
                disabled={forgieLoading}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
                  forgieLoading
                    ? 'text-primary/40'
                    : 'text-primary/70 hover:text-primary hover:bg-primary/[0.05]',
                )}
              >
                {forgieLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Schrijf mijn e-mail
              </button>
            </div>
          </div>

          {/* ─── Scrollable: editor + toolbar + original email ─── */}
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] py-5 px-6 text-[15px] leading-[1.7] text-foreground outline-none [&_img]:max-w-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/25 empty:before:pointer-events-none"
              data-placeholder="Schrijf je antwoord..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />

            {/* ─── Toolbar (inline, under signature) ─── */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-b border-foreground/[0.06] bg-foreground/[0.015]">
              <div className="flex items-center">
                <div className="flex items-center gap-px mr-2">
                  <button onClick={() => execCommand('undo')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-foreground/[0.04] transition-colors" title="Ongedaan maken"><Undo2 className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('redo')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-foreground/[0.04] transition-colors" title="Opnieuw"><Redo2 className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-foreground/[0.06] mr-2" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('bold')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Vet"><Bold className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('italic')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Cursief"><Italic className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('underline')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Onderstrepen"><Underline className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-foreground/[0.06] mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('insertUnorderedList')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Lijst"><List className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('insertOrderedList')} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Genummerde lijst"><ListOrdered className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-foreground/[0.06] mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => { const url = prompt('URL:'); if (url) execCommand('createLink', url) }} className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Link"><Link2 className="h-4 w-4" /></button>
                  <button className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors" title="Bijlage"><Paperclip className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReplyMode(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-foreground/25 hover:text-foreground/55 hover:bg-foreground/[0.04] transition-colors"
                  title="Annuleren"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-foreground/20 hidden sm:block">
                  {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
                </span>
                <Button
                  size="sm"
                  className="h-9 gap-2 text-sm px-6 rounded-lg shadow-sm"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'Verzenden...' : 'Verzenden'}
                </Button>
              </div>
            </div>

            {/* ─── Original email shown below toolbar ─── */}
            {sanitizedBody && (
              <div className="mx-6 py-5">
                <div className="pl-4 border-l-2 border-foreground/[0.08]">
                  <div className="flex items-center gap-2 mb-3 text-xs text-foreground/35">
                    <span>Op {formatShortDate(email.datum)} schreef {senderName}:</span>
                  </div>
                  <div
                    className="text-sm leading-relaxed text-foreground/45 [&_img]:max-w-full [&_a]:text-primary/50 [&_a]:underline [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/10 [&_blockquote]:pl-3 [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── CRM SIDEBAR (right, same as reading view) ─── */}
        <CRMSidebar email={email} senderName={senderName} senderEmail={senderEmail} avatarColor={avatarColor} />
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READING MODE — shows email body with reply buttons
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="flex h-full">
      {/* ─── MAIN: email content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top action bar */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-foreground/[0.06] flex-shrink-0 bg-white">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Terug</span>
            </Button>
            <div className="w-px h-5 bg-foreground/[0.08] mx-1.5" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.04]" onClick={() => email && onArchive?.(email)} title="Archiveren">
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-red-500 hover:bg-red-500/[0.06]" onClick={() => email && onDelete?.(email)} title="Verwijderen">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 hover:text-foreground hover:bg-foreground/[0.04]" onClick={() => email && onToggleRead?.(email)} title="Markeer als ongelezen">
              <MailOpen className="h-4 w-4" />
            </Button>
          </div>
          {emailIndex !== undefined && emailTotal !== undefined && (
            <div className="flex items-center gap-1 text-sm text-foreground/35">
              <span className="tabular-nums">{emailIndex + 1}/{emailTotal}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable email content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-[880px] mx-auto px-8 py-8">
            {/* Subject */}
            <h1 className="text-[22px] font-semibold text-foreground mb-8 leading-snug tracking-tight">
              {email.onderwerp || '(geen onderwerp)'}
            </h1>

            {/* Sender info row */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-3.5">
                <div className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm', avatarColor)}>
                  <span className="text-sm font-bold text-white">{senderName[0]?.toUpperCase()}</span>
                </div>
                <div className="pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-foreground">{senderName}</span>
                    <span className="text-xs text-foreground/35">&lt;{senderEmail}&gt;</span>
                  </div>
                  <div className="text-xs text-foreground/35 mt-1">
                    Aan: {email.aan}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <span className="text-xs text-foreground/35 tabular-nums">{formatShortDate(email.datum)}</span>
                <button
                  onClick={() => onToggleStar?.(email)}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    email.starred
                      ? 'text-amber-400 hover:bg-amber-50'
                      : 'text-foreground/20 hover:text-foreground/40 hover:bg-foreground/[0.04]',
                  )}
                >
                  <Star className={cn('h-4 w-4', email.starred && 'fill-amber-400')} />
                </button>
              </div>
            </div>

            {/* Email body */}
            {isLoadingBody ? (
              <div className="space-y-4 py-6">
                <div className="h-4 bg-foreground/[0.04] rounded-full w-full animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded-full w-4/5 animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded-full w-3/4 animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded-full w-5/6 animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded-full w-2/3 animate-pulse" />
              </div>
            ) : (
              <div
                className="text-[15px] leading-[1.7] text-foreground/80 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/15 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/50 [&_p]:mb-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              />
            )}

            {/* Attachments */}
            {email.bijlagen > 0 && (
              <div className="mt-10 pt-6 border-t border-foreground/[0.06]">
                <div className="flex items-center gap-2 text-xs text-foreground/35 mb-3 font-medium uppercase tracking-wider">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: email.bijlagen }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-foreground/[0.06] bg-foreground/[0.015] hover:bg-foreground/[0.03] hover:border-foreground/[0.1] transition-all duration-150 cursor-pointer group/att"
                    >
                      <div className="w-8 h-8 rounded-md bg-red-500/90 text-white text-[10px] font-bold flex items-center justify-center">PDF</div>
                      <span className="text-sm text-foreground/60 group-hover/att:text-foreground/80">bijlage-{i + 1}.pdf</span>
                      <Download className="h-3.5 w-3.5 text-foreground/20 group-hover/att:text-foreground/45 ml-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply prompt at bottom */}
            <div className="mt-10 pt-6 border-t border-foreground/[0.06] flex items-center gap-2">
              <button
                onClick={() => handleReply('reply')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground/[0.08] text-sm text-foreground/50 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all duration-150"
              >
                <Reply className="h-4 w-4" /> Beantwoorden
              </button>
              <button
                onClick={() => handleReply('reply-all')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground/[0.08] text-sm text-foreground/50 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all duration-150"
              >
                <ReplyAll className="h-4 w-4" /> Allen
              </button>
              <button
                onClick={() => handleReply('forward')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground/[0.08] text-sm text-foreground/50 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all duration-150"
              >
                <Forward className="h-4 w-4" /> Doorsturen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CRM SIDEBAR ─── */}
      <CRMSidebar email={email} senderName={senderName} senderEmail={senderEmail} avatarColor={avatarColor} />
    </div>
  )
}

// ─── Helper: extract company name from sender ───
function extractCompanyName(senderName: string, email: string): string {
  // Try "Name | Company" or "Name - Company" format
  const pipeMatch = senderName.match(/[|–—-]\s*(.+)$/)
  if (pipeMatch) return pipeMatch[1].trim()

  // Try email domain (skip generic providers)
  const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl', 'casema.nl', 'quicknet.nl', 'tele2.nl', 'solcon.nl']
  const domainMatch = email.match(/@([^>]+)/)
  if (domainMatch) {
    const domain = domainMatch[1].toLowerCase()
    if (!genericDomains.includes(domain)) {
      // Capitalize domain name without TLD
      const name = domain.split('.')[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  }
  return ''
}

// ─── CRM Sidebar component with inline klant creation ───
function CRMSidebar({
  email,
  senderName,
  senderEmail,
  avatarColor,
}: {
  email: Email
  senderName: string
  senderEmail: string
  avatarColor: string
}) {
  const navigate = useNavigate()
  const [showAddKlant, setShowAddKlant] = useState(false)
  const [klantSaving, setKlantSaving] = useState(false)
  const [klantSaved, setKlantSaved] = useState(false)
  const [klantForm, setKlantForm] = useState({
    bedrijfsnaam: '',
    contactpersoon: '',
    email: '',
    telefoon: '',
  })

  // Pre-fill form when opening
  const handleOpenAddKlant = useCallback(() => {
    const companyGuess = extractCompanyName(senderName, senderEmail)
    // Extract just the person name (before | or -)
    const personName = senderName.replace(/\s*[|–—-]\s*.+$/, '').trim()
    setKlantForm({
      bedrijfsnaam: companyGuess,
      contactpersoon: personName,
      email: senderEmail,
      telefoon: '',
    })
    setShowAddKlant(true)
    setKlantSaved(false)
  }, [senderName, senderEmail])

  const handleSaveKlant = useCallback(async () => {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) {
      toast.error('Naam en email zijn verplicht')
      return
    }
    setKlantSaving(true)
    try {
      await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam,
        contactpersoon: klantForm.contactpersoon,
        email: klantForm.email,
        telefoon: klantForm.telefoon,
        adres: '',
        postcode: '',
        stad: '',
        land: 'Nederland',
        website: '',
        kvk_nummer: '',
        btw_nummer: '',
        status: 'actief',
        tags: [],
        notities: '',
        contactpersonen: [],
      })
      setKlantSaved(true)
      toast.success('Klant aangemaakt')
      setTimeout(() => {
        setShowAddKlant(false)
      }, 1500)
    } catch {
      toast.error('Klant aanmaken mislukt')
    } finally {
      setKlantSaving(false)
    }
  }, [klantForm])

  return (
    <div className="w-[280px] border-l border-foreground/[0.06] bg-[#FAFAF8] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col">
      <div className="p-5 space-y-5 flex-1">
        {/* Contact card */}
        <div className="text-center">
          <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ring-3 ring-white shadow-md', avatarColor)}>
            <span className="text-lg font-bold text-white">{senderName[0]?.toUpperCase()}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{senderName}</p>
          <p className="text-xs text-foreground/35 mt-0.5">{senderEmail}</p>
        </div>

        {/* Contact details */}
        <div className="bg-white rounded-lg p-3 space-y-2 shadow-sm border border-foreground/[0.04]">
          <div className="flex items-center gap-2.5 text-xs text-foreground/55">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-foreground/30" />
            <span className="truncate">{senderEmail}</span>
          </div>
          {email.aan && (
            <div className="flex items-center gap-2.5 text-xs text-foreground/55">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-foreground/30" />
              <span className="truncate">{email.aan}</span>
            </div>
          )}
        </div>

        <div className="border-t border-foreground/[0.06]" />

        {/* Quick actions */}
        <div>
          <h3 className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2.5">Snelkoppelingen</h3>
          <div className="space-y-0.5">
            {/* Klant toevoegen — inline */}
            <button
              onClick={handleOpenAddKlant}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150',
                showAddKlant
                  ? 'bg-primary/[0.06] text-primary font-medium'
                  : 'text-foreground/55 hover:bg-white hover:text-foreground hover:shadow-sm',
              )}
            >
              <UserPlus className="h-4 w-4" />
              Klant toevoegen
            </button>

            {/* Inline add klant form */}
            {showAddKlant && (
              <div className="bg-white rounded-lg border border-foreground/[0.06] p-3 mt-1.5 mb-1.5 shadow-sm space-y-2.5">
                {klantSaved ? (
                  <div className="flex items-center gap-2 py-3 justify-center text-emerald-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Klant aangemaakt!</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-foreground/35 uppercase tracking-wider font-medium">Bedrijfsnaam</label>
                      <input
                        type="text"
                        value={klantForm.bedrijfsnaam}
                        onChange={(e) => setKlantForm(f => ({ ...f, bedrijfsnaam: e.target.value }))}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-foreground/[0.02] border border-foreground/[0.08] rounded-md outline-none focus:border-primary/30 focus:bg-white transition-colors"
                        placeholder="Bedrijf B.V."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-foreground/35 uppercase tracking-wider font-medium">Contactpersoon *</label>
                      <input
                        type="text"
                        value={klantForm.contactpersoon}
                        onChange={(e) => setKlantForm(f => ({ ...f, contactpersoon: e.target.value }))}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-foreground/[0.02] border border-foreground/[0.08] rounded-md outline-none focus:border-primary/30 focus:bg-white transition-colors"
                        placeholder="Naam"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-foreground/35 uppercase tracking-wider font-medium">Email *</label>
                      <input
                        type="email"
                        value={klantForm.email}
                        onChange={(e) => setKlantForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-foreground/[0.02] border border-foreground/[0.08] rounded-md outline-none focus:border-primary/30 focus:bg-white transition-colors"
                        placeholder="email@bedrijf.nl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-foreground/35 uppercase tracking-wider font-medium">Telefoon</label>
                      <input
                        type="tel"
                        value={klantForm.telefoon}
                        onChange={(e) => setKlantForm(f => ({ ...f, telefoon: e.target.value }))}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm bg-foreground/[0.02] border border-foreground/[0.08] rounded-md outline-none focus:border-primary/30 focus:bg-white transition-colors"
                        placeholder="06-12345678"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveKlant}
                        disabled={klantSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {klantSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        {klantSaving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                      <button
                        onClick={() => setShowAddKlant(false)}
                        className="px-3 py-2 rounded-md text-xs text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                      >
                        Annuleer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {[
              { icon: FileText, label: 'Offerte aanmaken', path: '/offertes/nieuw' },
              { icon: FolderPlus, label: 'Project aanmaken', path: '/projecten/nieuw' },
              { icon: ListPlus, label: 'Taak toevoegen', path: '/taken' },
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-foreground/55 hover:bg-white hover:text-foreground hover:shadow-sm transition-all duration-150"
              >
                <Icon className="h-4 w-4 text-foreground/30" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-foreground/[0.06]" />

        {/* Email metadata */}
        <div>
          <h3 className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2.5">Details</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground/35">Datum</span>
              <span className="text-foreground/60">{new Date(email.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/35">Map</span>
              <span className="text-foreground/60 capitalize">{email.map}</span>
            </div>
            {email.bijlagen > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground/35">Bijlagen</span>
                <span className="text-foreground/60">{email.bijlagen}</span>
              </div>
            )}
            {email.labels && email.labels.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-foreground/35">Labels</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {email.labels.map(label => (
                    <span key={label} className="px-1.5 py-0.5 bg-primary/8 text-primary rounded text-[10px] font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
