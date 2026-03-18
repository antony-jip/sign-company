import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import type DOMPurifyT from 'dompurify'

// Lazy-initialised DOMPurify to avoid TDZ errors – CJS default export can be
// mis-ordered by Rollup when bundled into a shared chunk.
let _DOMPurify: typeof DOMPurifyT | null = null
async function getDOMPurify() {
  if (!_DOMPurify) {
    _DOMPurify = (await import('dompurify')).default
  }
  return _DOMPurify
}
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Trash2, Star, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
  UserPlus, FolderPlus, FileText, ListPlus, Check,
  Building2, Mail, Undo2, Redo2, ExternalLink,
  Tag, Calendar, Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email, Klant } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor } from './emailHelpers'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { createKlant, getKlanten } from '@/services/supabaseService'

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

  // Memoize sender data — avoid recalculating on every render
  const senderName = useMemo(() => email ? extractSenderName(email.van) : '', [email?.van])
  const senderEmail = useMemo(() => email ? extractSenderEmail(email.van) : '', [email?.van])
  const avatarColor = useMemo(() => getAvatarColor(senderName), [senderName])

  // Async DOMPurify sanitization — avoids TDZ with CJS module
  const [sanitizedBody, setSanitizedBody] = useState('')
  useEffect(() => {
    if (!email?.inhoud) { setSanitizedBody(''); return }
    let cancelled = false
    getDOMPurify().then(purify => {
      if (!cancelled) {
        setSanitizedBody(purify.sanitize(email.inhoud, {
          ADD_TAGS: ['style'],
          ADD_ATTR: ['target', 'style'],
        }))
      }
    })
    return () => { cancelled = true }
  }, [email?.inhoud])

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/30 h-full">
        <p className="text-sm">Selecteer een email om te lezen</p>
      </div>
    )
  }

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
          <div className="flex items-center justify-between px-5 h-12 border-b border-foreground/[0.06] flex-shrink-0 bg-card">
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
          <div className="border-b border-foreground/[0.06] bg-card flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto bg-card">
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
        <div className="flex items-center justify-between px-5 h-12 border-b border-foreground/[0.06] flex-shrink-0 bg-card">
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
        <div className="flex-1 overflow-y-auto bg-card">
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

// ─── CRM Sidebar component with inline klant creation + duplicate detection ───
const CRMSidebar = memo(function CRMSidebar({
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
  const [linkedKlant, setLinkedKlant] = useState<Klant | null>(null)
  const [klantLoading, setKlantLoading] = useState(true)
  const [klantForm, setKlantForm] = useState({
    bedrijfsnaam: '',
    contactpersoon: '',
    email: '',
    telefoon: '',
  })

  // Extract person name (before | or -)
  const personName = useMemo(() => senderName.replace(/\s*[|–—-]\s*.+$/, '').trim(), [senderName])
  const companyGuess = useMemo(() => extractCompanyName(senderName, senderEmail), [senderName, senderEmail])

  // Look up existing klant by email domain or exact email match
  useEffect(() => {
    let cancelled = false
    setKlantLoading(true)
    setLinkedKlant(null)

    async function findKlant() {
      try {
        const klanten = await getKlanten(500)
        const emailDomain = senderEmail.match(/@(.+)/)?.[1]?.toLowerCase()

        // Priority 1: exact email match
        let match = klanten.find(k =>
          k.email?.toLowerCase() === senderEmail.toLowerCase() ||
          k.contactpersonen?.some(c => c.email?.toLowerCase() === senderEmail.toLowerCase())
        )

        // Priority 2: same email domain (company match)
        if (!match && emailDomain) {
          const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl']
          if (!genericDomains.includes(emailDomain)) {
            match = klanten.find(k => k.email?.toLowerCase().endsWith('@' + emailDomain))
          }
        }

        if (!cancelled) setLinkedKlant(match || null)
      } catch {
        // silent
      } finally {
        if (!cancelled) setKlantLoading(false)
      }
    }

    findKlant()
    return () => { cancelled = true }
  }, [senderEmail])

  // Pre-fill form when opening
  const handleOpenAddKlant = useCallback(() => {
    setKlantForm({
      bedrijfsnaam: companyGuess,
      contactpersoon: personName,
      email: senderEmail,
      telefoon: '',
    })
    setShowAddKlant(true)
  }, [companyGuess, personName, senderEmail])

  const handleSaveKlant = useCallback(async () => {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) {
      toast.error('Naam en email zijn verplicht')
      return
    }
    setKlantSaving(true)
    try {
      // Check for duplicates before creating
      const existing = await getKlanten(500)
      const emailDomain = klantForm.email.match(/@(.+)/)?.[1]?.toLowerCase()
      const dupe = existing.find(k =>
        k.email?.toLowerCase() === klantForm.email.toLowerCase() ||
        (klantForm.bedrijfsnaam && k.bedrijfsnaam?.toLowerCase() === klantForm.bedrijfsnaam.toLowerCase())
      )
      if (dupe) {
        toast.error(`Klant "${dupe.bedrijfsnaam || dupe.contactpersoon}" bestaat al`)
        setLinkedKlant(dupe)
        setShowAddKlant(false)
        return
      }

      const newKlant = await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam,
        contactpersoon: klantForm.contactpersoon,
        email: klantForm.email,
        telefoon: klantForm.telefoon,
        adres: '',
        postcode: '',
        stad: '',
        land: 'Nederland',
        website: emailDomain ? `www.${emailDomain}` : '',
        kvk_nummer: '',
        btw_nummer: '',
        status: 'actief',
        tags: [],
        notities: '',
        contactpersonen: [{
          id: crypto.randomUUID(),
          naam: klantForm.contactpersoon,
          functie: '',
          email: klantForm.email,
          telefoon: klantForm.telefoon,
          is_primair: true,
        }],
      })
      setLinkedKlant(newKlant)
      setShowAddKlant(false)
      toast.success('Klant aangemaakt')
    } catch {
      toast.error('Klant aanmaken mislukt')
    } finally {
      setKlantSaving(false)
    }
  }, [klantForm])

  // Format the email date nicely
  const emailDate = useMemo(() => {
    if (!email.datum) return null
    try {
      const d = new Date(email.datum)
      return {
        date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      }
    } catch { return null }
  }, [email.datum])

  return (
    <div className="w-[280px] border-l border-foreground/[0.06] bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F2] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col">
      <div className="p-5 space-y-4 flex-1">
        {/* ── Contact card ── */}
        <div className="text-center pb-4 border-b border-foreground/[0.06]">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5 ring-2 ring-white shadow-md', avatarColor)}>
            <span className="text-base font-bold text-white">{senderName[0]?.toUpperCase()}</span>
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">{personName}</p>
          {companyGuess && (
            <p className="text-xs text-foreground/45 mt-0.5">{companyGuess}</p>
          )}
          <div className="flex items-center justify-center gap-1 mt-1.5">
            <Mail className="h-3 w-3 text-foreground/25" />
            <span className="text-[11px] text-foreground/40">{senderEmail}</span>
          </div>
        </div>

        {/* ── Linked company card ── */}
        {klantLoading ? (
          <div className="flex items-center gap-2 text-xs text-foreground/30 py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Klant zoeken...</span>
          </div>
        ) : linkedKlant ? (
          <button
            onClick={() => navigate(`/klanten/${linkedKlant.id}`)}
            className="w-full bg-white rounded-xl p-3.5 shadow-sm border border-foreground/[0.05] hover:shadow-md hover:border-foreground/[0.1] transition-all duration-200 text-left group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-primary/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {linkedKlant.bedrijfsnaam || linkedKlant.contactpersoon}
                  </p>
                  <p className="text-[11px] text-foreground/40 truncate">
                    {linkedKlant.bedrijfsnaam ? linkedKlant.contactpersoon : linkedKlant.email}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-foreground/20 group-hover:text-primary/50 flex-shrink-0 mt-0.5 transition-colors" />
            </div>
            {linkedKlant.telefoon && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-foreground/[0.04]">
                <Phone className="h-3 w-3 text-foreground/25" />
                <span className="text-[11px] text-foreground/40">{linkedKlant.telefoon}</span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-foreground/[0.04]">
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                linkedKlant.status === 'actief' ? 'bg-emerald-50 text-emerald-600' :
                linkedKlant.status === 'prospect' ? 'bg-amber-50 text-amber-600' :
                'bg-gray-100 text-gray-500'
              )}>
                {linkedKlant.status || 'actief'}
              </span>
            </div>
          </button>
        ) : (
          /* No linked klant — show add button */
          !showAddKlant && (
            <button
              onClick={handleOpenAddKlant}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-foreground/[0.12] text-[13px] text-foreground/45 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              Contact toevoegen
            </button>
          )
        )}

        {/* ── Inline add klant form ── */}
        {showAddKlant && (
          <div className="bg-white rounded-xl border border-foreground/[0.06] p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Nieuw contact</h4>
              <button onClick={() => setShowAddKlant(false)} className="text-foreground/25 hover:text-foreground/50 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            {[
              { key: 'bedrijfsnaam' as const, label: 'Bedrijf', placeholder: 'Bedrijf B.V.', icon: Building2 },
              { key: 'contactpersoon' as const, label: 'Naam *', placeholder: 'Volledige naam', icon: UserPlus },
              { key: 'email' as const, label: 'Email *', placeholder: 'email@bedrijf.nl', icon: Mail, type: 'email' },
              { key: 'telefoon' as const, label: 'Telefoon', placeholder: '06-12345678', icon: Phone, type: 'tel' },
            ].map(({ key, placeholder, icon: Icon, type }) => (
              <div key={key} className="relative">
                <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20" />
                <input
                  type={type || 'text'}
                  value={klantForm[key]}
                  onChange={(e) => setKlantForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full pl-8 pr-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.08] rounded-lg outline-none focus:border-primary/30 focus:bg-white transition-colors placeholder:text-foreground/20"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <button
              onClick={handleSaveKlant}
              disabled={klantSaving}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors mt-1"
            >
              {klantSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {klantSaving ? 'Opslaan...' : 'Contact opslaan'}
            </button>
          </div>
        )}

        <div className="border-t border-foreground/[0.06]" />

        {/* ── Quick actions ── */}
        <div>
          <h3 className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">Acties</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { icon: FileText, label: 'Offerte', path: '/offertes/nieuw', color: 'text-blue-500/70 bg-blue-50' },
              { icon: FolderPlus, label: 'Project', path: '/projecten/nieuw', color: 'text-violet-500/70 bg-violet-50' },
              { icon: ListPlus, label: 'Taak', path: '/taken', color: 'text-amber-500/70 bg-amber-50' },
              { icon: UserPlus, label: 'Klant', path: linkedKlant ? `/klanten/${linkedKlant.id}` : '', color: 'text-emerald-500/70 bg-emerald-50', onClick: linkedKlant ? undefined : handleOpenAddKlant },
            ].map(({ icon: Icon, label, path, color, onClick }) => (
              <button
                key={label}
                onClick={onClick || (() => {
                  const params = new URLSearchParams()
                  if (linkedKlant) params.set('klant_id', linkedKlant.id)
                  else if (senderName) params.set('klant_naam', personName)
                  const query = params.toString()
                  navigate(path + (query ? `?${query}` : ''))
                })}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-card hover:shadow-sm border border-transparent hover:border-foreground/[0.05] transition-all duration-200"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] text-foreground/50 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-foreground/[0.06]" />

        {/* ── Email details ── */}
        <div>
          <h3 className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2.5">Details</h3>
          <div className="space-y-2.5">
            {emailDate && (
              <div className="flex items-center gap-2.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-foreground/20 flex-shrink-0" />
                <span className="text-foreground/50">{emailDate.date}</span>
                <span className="text-foreground/30 ml-auto">{emailDate.time}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-xs">
              <Mail className="h-3.5 w-3.5 text-foreground/20 flex-shrink-0" />
              <span className="text-foreground/50 capitalize">{email.map || 'inbox'}</span>
            </div>
            {email.bijlagen > 0 && (
              <div className="flex items-center gap-2.5 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-foreground/20 flex-shrink-0" />
                <span className="text-foreground/50">{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
              </div>
            )}
            {email.labels && email.labels.length > 0 && (
              <div className="flex items-start gap-2.5 text-xs">
                <Tag className="h-3.5 w-3.5 text-foreground/20 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {email.labels.map(label => (
                    <span key={label} className="px-1.5 py-0.5 bg-primary/8 text-primary rounded text-[10px] font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {email.aan && (
              <div className="flex items-center gap-2.5 text-xs">
                <Send className="h-3.5 w-3.5 text-foreground/20 flex-shrink-0" />
                <span className="text-foreground/50 truncate">{email.aan}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
