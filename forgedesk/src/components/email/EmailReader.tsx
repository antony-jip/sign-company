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
  UserPlus, FolderPlus, FileText, ListPlus, Check, X,
  Building2, Mail, Undo2, Redo2, ExternalLink, ChevronRight,
  Tag, Calendar, Phone, Plus, CircleCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email, Klant } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor } from './emailHelpers'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { createKlant, getKlanten, createOfferte, createProject, createTaak } from '@/services/supabaseService'

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
          <div className="max-w-[880px] mx-auto px-8 py-5">
            {/* Subject + sender row — compact like Gmail */}
            <div className="flex items-start justify-between gap-4 mb-1">
              <h1 className="text-lg font-semibold text-foreground leading-snug tracking-tight">
                {email.onderwerp || '(geen onderwerp)'}
              </h1>
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <span className="text-[11px] text-foreground/30 tabular-nums whitespace-nowrap">{formatShortDate(email.datum)}</span>
                <button
                  onClick={() => onToggleStar?.(email)}
                  className={cn(
                    'p-1 rounded-md transition-all',
                    email.starred
                      ? 'text-amber-400 hover:bg-amber-50'
                      : 'text-foreground/15 hover:text-foreground/40 hover:bg-foreground/[0.04]',
                  )}
                >
                  <Star className={cn('h-3.5 w-3.5', email.starred && 'fill-amber-400')} />
                </button>
              </div>
            </div>

            {/* Sender — compact inline */}
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-foreground/[0.05]">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', avatarColor)}>
                <span className="text-xs font-bold text-white">{senderName[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground">{senderName}</span>
                  <span className="text-[11px] text-foreground/25 truncate">&lt;{senderEmail}&gt;</span>
                </div>
                <div className="text-[11px] text-foreground/30">aan {email.aan}</div>
              </div>
            </div>

            {/* Email body — direct, no extra spacing */}
            {isLoadingBody ? (
              <div className="space-y-3 py-2">
                <div className="h-4 bg-foreground/[0.04] rounded w-full animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded w-[90%] animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-foreground/[0.04] rounded w-[85%] animate-pulse" />
              </div>
            ) : (
              <div
                className="text-[14px] leading-[1.7] text-foreground/80 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/15 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/50 [&_p]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5"
                dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              />
            )}

            {/* Attachments — inline chips */}
            {email.bijlagen > 0 && (
              <div className="mt-6 pt-4 border-t border-foreground/[0.05]">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: email.bijlagen }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.015] hover:bg-foreground/[0.03] hover:border-foreground/[0.1] transition-all duration-150 cursor-pointer group/att"
                    >
                      <div className="w-7 h-7 rounded bg-red-500/90 text-white text-[9px] font-bold flex items-center justify-center">PDF</div>
                      <span className="text-[13px] text-foreground/55 group-hover/att:text-foreground/80">bijlage-{i + 1}.pdf</span>
                      <Download className="h-3 w-3 text-foreground/20 group-hover/att:text-foreground/45" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply buttons — compact */}
            <div className="mt-6 pt-4 border-t border-foreground/[0.05] flex items-center gap-1.5">
              <button onClick={() => handleReply('reply')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-foreground/[0.08] text-[13px] text-foreground/45 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all">
                <Reply className="h-3.5 w-3.5" /> Beantwoorden
              </button>
              <button onClick={() => handleReply('reply-all')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-foreground/[0.08] text-[13px] text-foreground/45 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all">
                <ReplyAll className="h-3.5 w-3.5" /> Allen
              </button>
              <button onClick={() => handleReply('forward')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-foreground/[0.08] text-[13px] text-foreground/45 hover:text-foreground hover:border-foreground/15 hover:bg-foreground/[0.02] transition-all">
                <Forward className="h-3.5 w-3.5" /> Doorsturen
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

// ─── CRM Sidebar with inline actions ───
type InlinePanel = 'none' | 'klant' | 'offerte' | 'project' | 'taak'

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
  const [activePanel, setActivePanel] = useState<InlinePanel>('none')
  const [saving, setSaving] = useState(false)
  const [linkedKlant, setLinkedKlant] = useState<Klant | null>(null)
  const [klantLoading, setKlantLoading] = useState(true)

  // Klant form
  const [klantForm, setKlantForm] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '' })
  // Offerte form
  const [offerteForm, setOfferteForm] = useState({ titel: '', notities: '' })
  // Project form
  const [projectForm, setProjectForm] = useState({ naam: '', beschrijving: '' })
  // Taak form
  const [taakForm, setTaakForm] = useState({ titel: '', beschrijving: '' })

  const personName = useMemo(() => senderName.replace(/\s*[|–—-]\s*.+$/, '').trim(), [senderName])
  const companyGuess = useMemo(() => extractCompanyName(senderName, senderEmail), [senderName, senderEmail])

  // Look up existing klant
  useEffect(() => {
    let cancelled = false
    setKlantLoading(true)
    setLinkedKlant(null)
    async function findKlant() {
      try {
        const klanten = await getKlanten(500)
        const emailDomain = senderEmail.match(/@(.+)/)?.[1]?.toLowerCase()
        let match = klanten.find(k =>
          k.email?.toLowerCase() === senderEmail.toLowerCase() ||
          k.contactpersonen?.some(c => c.email?.toLowerCase() === senderEmail.toLowerCase())
        )
        if (!match && emailDomain) {
          const generic = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl']
          if (!generic.includes(emailDomain)) {
            match = klanten.find(k => k.email?.toLowerCase().endsWith('@' + emailDomain))
          }
        }
        if (!cancelled) setLinkedKlant(match || null)
      } catch { /* silent */ }
      finally { if (!cancelled) setKlantLoading(false) }
    }
    findKlant()
    return () => { cancelled = true }
  }, [senderEmail])

  const klantDisplayName = linkedKlant?.bedrijfsnaam || linkedKlant?.contactpersoon || companyGuess || personName

  // Open panels with pre-filled data
  function openPanel(panel: InlinePanel) {
    if (panel === 'klant') {
      setKlantForm({ bedrijfsnaam: companyGuess, contactpersoon: personName, email: senderEmail, telefoon: '' })
    } else if (panel === 'offerte') {
      setOfferteForm({ titel: `Offerte - ${klantDisplayName}`, notities: `n.a.v. email: ${email.onderwerp}` })
    } else if (panel === 'project') {
      setProjectForm({ naam: `${klantDisplayName} - ${email.onderwerp?.slice(0, 40) || 'Nieuw project'}`, beschrijving: `n.a.v. email: ${email.onderwerp}` })
    } else if (panel === 'taak') {
      setTaakForm({ titel: email.onderwerp || 'Opvolging email', beschrijving: `Van: ${senderName} <${senderEmail}>\nOnderwerp: ${email.onderwerp}` })
    }
    setActivePanel(panel)
  }

  // ── Save handlers ──
  async function handleSaveKlant() {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) { toast.error('Naam en email zijn verplicht'); return }
    setSaving(true)
    try {
      const existing = await getKlanten(500)
      const dupe = existing.find(k =>
        k.email?.toLowerCase() === klantForm.email.toLowerCase() ||
        (klantForm.bedrijfsnaam && k.bedrijfsnaam?.toLowerCase() === klantForm.bedrijfsnaam.toLowerCase())
      )
      if (dupe) { toast('Klant bestaat al — gekoppeld', { icon: '🔗' }); setLinkedKlant(dupe); setActivePanel('none'); return }
      const emailDomain = klantForm.email.match(/@(.+)/)?.[1]?.toLowerCase()
      const newKlant = await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam, contactpersoon: klantForm.contactpersoon,
        email: klantForm.email, telefoon: klantForm.telefoon,
        adres: '', postcode: '', stad: '', land: 'Nederland',
        website: emailDomain ? `www.${emailDomain}` : '',
        kvk_nummer: '', btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: '', email: klantForm.email, telefoon: klantForm.telefoon, is_primair: true }],
      })
      setLinkedKlant(newKlant)
      setActivePanel('none')
      toast.success('Klant aangemaakt')
    } catch { toast.error('Klant aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveOfferte() {
    if (!offerteForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    if (!linkedKlant) { toast.error('Eerst een klant koppelen'); openPanel('klant'); return }
    setSaving(true)
    try {
      const nr = `OFF-${Date.now().toString(36).toUpperCase()}`
      const offerte = await createOfferte({
        klant_id: linkedKlant.id, klant_naam: klantDisplayName,
        nummer: nr, titel: offerteForm.titel, status: 'concept',
        subtotaal: 0, btw_bedrag: 0, totaal: 0,
        geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: offerteForm.notities, voorwaarden: '',
      })
      setActivePanel('none')
      toast.success('Offerte aangemaakt', {
        action: { label: 'Openen', onClick: () => navigate(`/offertes/${offerte.id}`) },
      })
    } catch { toast.error('Offerte aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveProject() {
    if (!projectForm.naam.trim()) { toast.error('Naam is verplicht'); return }
    if (!linkedKlant) { toast.error('Eerst een klant koppelen'); openPanel('klant'); return }
    setSaving(true)
    try {
      const project = await createProject({
        klant_id: linkedKlant.id, naam: projectForm.naam,
        beschrijving: projectForm.beschrijving, status: 'gepland',
        prioriteit: 'medium', budget: 0, besteed: 0, voortgang: 0, team_leden: [],
      })
      setActivePanel('none')
      toast.success('Project aangemaakt', {
        action: { label: 'Openen', onClick: () => navigate(`/projecten/${project.id}`) },
      })
    } catch { toast.error('Project aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveTaak() {
    if (!taakForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    setSaving(true)
    try {
      await createTaak({
        titel: taakForm.titel, beschrijving: taakForm.beschrijving,
        status: 'todo', prioriteit: 'medium', toegewezen_aan: '', geschatte_tijd: 0, bestede_tijd: 0,
        klant_id: linkedKlant?.id || '',
      })
      setActivePanel('none')
      toast.success('Taak aangemaakt')
    } catch { toast.error('Taak aanmaken mislukt') }
    finally { setSaving(false) }
  }

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

  // ── Inline form panel ──
  function renderInlinePanel() {
    if (activePanel === 'none') return null

    const panelConfig = {
      klant: {
        title: 'Contact toevoegen',
        color: 'bg-emerald-500',
        onSave: handleSaveKlant,
        fields: (
          <>
            {[
              { key: 'bedrijfsnaam' as const, placeholder: 'Bedrijfsnaam', icon: Building2 },
              { key: 'contactpersoon' as const, placeholder: 'Contactpersoon *', icon: UserPlus },
              { key: 'email' as const, placeholder: 'Email *', icon: Mail },
              { key: 'telefoon' as const, placeholder: 'Telefoon', icon: Phone },
            ].map(({ key, placeholder, icon: Icon }) => (
              <div key={key} className="relative">
                <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20" />
                <input value={klantForm[key]} onChange={e => setKlantForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full pl-8 pr-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25"
                  placeholder={placeholder} />
              </div>
            ))}
          </>
        ),
      },
      offerte: {
        title: 'Offerte aanmaken',
        color: 'bg-blue-500',
        onSave: handleSaveOfferte,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50/50 rounded-lg text-[11px] text-blue-600">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={offerteForm.titel} onChange={e => setOfferteForm(f => ({ ...f, titel: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25"
              placeholder="Titel *" />
            <textarea value={offerteForm.notities} onChange={e => setOfferteForm(f => ({ ...f, notities: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25 resize-none h-16"
              placeholder="Notities" />
          </>
        ),
      },
      project: {
        title: 'Project aanmaken',
        color: 'bg-violet-500',
        onSave: handleSaveProject,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-violet-50/50 rounded-lg text-[11px] text-violet-600">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={projectForm.naam} onChange={e => setProjectForm(f => ({ ...f, naam: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25"
              placeholder="Projectnaam *" />
            <textarea value={projectForm.beschrijving} onChange={e => setProjectForm(f => ({ ...f, beschrijving: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25 resize-none h-16"
              placeholder="Beschrijving" />
          </>
        ),
      },
      taak: {
        title: 'Taak toevoegen',
        color: 'bg-amber-500',
        onSave: handleSaveTaak,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50/50 rounded-lg text-[11px] text-amber-600">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={taakForm.titel} onChange={e => setTaakForm(f => ({ ...f, titel: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25"
              placeholder="Taak titel *" />
            <textarea value={taakForm.beschrijving} onChange={e => setTaakForm(f => ({ ...f, beschrijving: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg outline-none focus:border-primary/30 focus:bg-card transition-colors placeholder:text-foreground/25 resize-none h-16"
              placeholder="Beschrijving" />
          </>
        ),
      },
    }

    const cfg = panelConfig[activePanel]
    return (
      <div className="bg-card rounded-xl border border-foreground/[0.06] shadow-sm overflow-hidden">
        <div className={cn('flex items-center justify-between px-3.5 py-2.5', cfg.color)}>
          <h4 className="text-[12px] font-semibold text-white">{cfg.title}</h4>
          <button onClick={() => setActivePanel('none')} className="text-white/60 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2.5">
          {cfg.fields}
          <button onClick={cfg.onSave} disabled={saving}
            className={cn('w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-colors', cfg.color, 'hover:opacity-90')}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[280px] border-l border-foreground/[0.06] bg-gradient-to-b from-[#FAFAF8] to-[#F5F4F0] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col">
      <div className="p-4 space-y-3 flex-1">
        {/* ── Contact header ── */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-foreground/[0.04]">
          <div className="flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white shadow flex-shrink-0', avatarColor)}>
              <span className="text-sm font-bold text-white">{senderName[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{personName}</p>
              {companyGuess && (
                <p className="text-[11px] text-foreground/40 truncate mt-0.5">{companyGuess}</p>
              )}
              <p className="text-[11px] text-foreground/30 truncate mt-0.5">{senderEmail}</p>
            </div>
          </div>
          {/* Mini contact details */}
          <div className="mt-3 pt-2.5 border-t border-foreground/[0.05] space-y-1.5">
            {email.aan && (
              <div className="flex items-center gap-2 text-[11px] text-foreground/40">
                <Send className="h-3 w-3 text-foreground/20 flex-shrink-0" />
                <span className="truncate">Aan: {email.aan}</span>
              </div>
            )}
            {emailDate && (
              <div className="flex items-center gap-2 text-[11px] text-foreground/40">
                <Calendar className="h-3 w-3 text-foreground/20 flex-shrink-0" />
                <span>{emailDate.date}, {emailDate.time}</span>
              </div>
            )}
            {email.bijlagen > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-foreground/40">
                <Paperclip className="h-3 w-3 text-foreground/20 flex-shrink-0" />
                <span>{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Linked klant ── */}
        {klantLoading ? (
          <div className="flex items-center gap-2 text-[11px] text-foreground/25 px-1 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Klant zoeken...</span>
          </div>
        ) : linkedKlant ? (
          <button
            onClick={() => navigate(`/klanten/${linkedKlant.id}`)}
            className="w-full bg-card rounded-xl p-3 shadow-sm border border-foreground/[0.04] hover:shadow-md hover:border-primary/10 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-emerald-500/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-foreground truncate">{linkedKlant.bedrijfsnaam || linkedKlant.contactpersoon}</p>
                <p className="text-[10px] text-foreground/35 truncate">{linkedKlant.bedrijfsnaam ? linkedKlant.contactpersoon : linkedKlant.email}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-medium',
                  linkedKlant.status === 'actief' ? 'bg-emerald-50 text-emerald-600' :
                  linkedKlant.status === 'prospect' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                )}>{linkedKlant.status || 'actief'}</span>
                <ChevronRight className="h-3 w-3 text-foreground/15 group-hover:text-primary/40 transition-colors" />
              </div>
            </div>
            {linkedKlant.telefoon && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-foreground/[0.04]">
                <Phone className="h-3 w-3 text-foreground/20" />
                <span className="text-[10px] text-foreground/35">{linkedKlant.telefoon}</span>
              </div>
            )}
          </button>
        ) : activePanel !== 'klant' ? (
          <button onClick={() => openPanel('klant')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-foreground/[0.10] text-[12px] text-foreground/40 hover:border-primary/25 hover:text-primary hover:bg-primary/[0.02] transition-all duration-200">
            <Plus className="h-3.5 w-3.5" />
            Contact koppelen
          </button>
        ) : null}

        {/* ── Labels ── */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 px-0.5">
            {email.labels.map(label => (
              <span key={label} className="px-2 py-0.5 bg-primary/6 text-primary rounded-full text-[10px] font-medium">{label}</span>
            ))}
          </div>
        )}

        {/* ── Inline panel ── */}
        {renderInlinePanel()}

        {/* ── Quick action buttons ── */}
        {activePanel === 'none' && (
          <div className="space-y-1">
            <h3 className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider px-0.5 mb-1.5">Snel aanmaken</h3>
            {([
              { panel: 'offerte' as const, icon: FileText, label: 'Offerte', desc: linkedKlant ? `voor ${klantDisplayName}` : 'offerte opmaken', color: 'text-blue-500', bg: 'bg-blue-50' },
              { panel: 'project' as const, icon: FolderPlus, label: 'Project', desc: linkedKlant ? `voor ${klantDisplayName}` : 'project starten', color: 'text-violet-500', bg: 'bg-violet-50' },
              { panel: 'taak' as const, icon: CircleCheck, label: 'Taak', desc: 'opvolging plannen', color: 'text-amber-500', bg: 'bg-amber-50' },
            ]).map(({ panel, icon: Icon, label, desc, color, bg }) => (
              <button key={panel} onClick={() => openPanel(panel)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-card hover:shadow-sm transition-all duration-150 group text-left">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-foreground/70 group-hover:text-foreground transition-colors">{label}</p>
                  <p className="text-[10px] text-foreground/30 truncate">{desc}</p>
                </div>
                <Plus className="h-3 w-3 text-foreground/15 group-hover:text-foreground/30 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
