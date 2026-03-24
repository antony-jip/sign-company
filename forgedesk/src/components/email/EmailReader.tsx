import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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
  Undo2, Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor, getAvatarRingColor } from './emailHelpers'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'
import { EmailReaderAIToolbar } from './EmailReaderAIToolbar'

interface EmailReaderProps {
  email: Email | null
  isLoadingBody?: boolean
  emailIndex?: number
  emailTotal?: number
  allEmails?: Email[]
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onSendReply?: (data: { to: string; subject: string; body: string; html?: string }) => void
  onSelectEmail?: (email: Email) => void
}

export function EmailReader({
  email,
  isLoadingBody,
  emailIndex,
  emailTotal,
  allEmails,
  onToggleStar,
  onToggleRead,
  onDelete,
  onArchive,
  onBack,
  onNavigate,
  onSendReply,
  onSelectEmail,
}: EmailReaderProps) {
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte } = useAppSettings()

  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [replyTo, setReplyTo] = useState('')
  const [showQuotedText, setShowQuotedText] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forgieLoading, setForgieLoading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const emailBodyRef = useRef<HTMLDivElement>(null)

  // Summary state
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(true)

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

  // Reset reply state and summary when email changes
  useEffect(() => {
    setReplyMode(null)
    setShowQuotedText(false)
    setSummary(null)
    setSummaryLoading(false)
    setSummaryExpanded(true)
  }, [email?.id])

  const handleSummarize = useCallback(async () => {
    if (!email || summaryLoading) return
    setSummaryLoading(true)
    setSummaryExpanded(true)
    try {
      const text = email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 2000) || ''
      const response = await callForgie('summarize', text)
      if (response?.result) setSummary(response.result)
    } catch {
      toast.error('Daan kon dit niet verwerken. Probeer het opnieuw.')
    } finally {
      setSummaryLoading(false)
    }
  }, [email, summaryLoading])

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
      toast.error('Daan kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, signatureHtml])

  // Generate reply from reader: opens reply mode first, then generates
  const handleGenerateReplyFromReader = useCallback(async () => {
    if (!email) return
    // First open reply mode
    handleReply('reply')
    // Wait for editor to mount, then generate
    setForgieLoading(true)
    try {
      const context = `Oorspronkelijk bericht van ${extractSenderName(email.van)}: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 500)}`
      const response = await callForgie('generate-reply', context)
      if (response?.result) {
        // Editor should be mounted by now
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
          }
        }, 100)
      }
    } catch {
      toast.error('Daan kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, handleReply, signatureHtml])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  // Keyboard shortcuts for reader mode
  useEffect(() => {
    if (!email || replyMode) return
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+S → summarize
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSummarize()
      }
      // Cmd+Shift+R → generate reply
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        handleGenerateReplyFromReader()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [email, replyMode, handleSummarize, handleGenerateReplyFromReader])

  // Memoize sender data — avoid recalculating on every render
  const senderName = useMemo(() => email ? extractSenderName(email.van) : '', [email?.van])
  const senderEmail = useMemo(() => email ? extractSenderEmail(email.van) : '', [email?.van])
  const avatarColor = useMemo(() => getAvatarColor(senderName), [senderName])
  const avatarRingColor = useMemo(() => getAvatarRingColor(senderName), [senderName])

  // Async DOMPurify sanitization — avoids TDZ with CJS module
  const [sanitizedBody, setSanitizedBody] = useState('')
  useEffect(() => {
    if (!email?.inhoud) { setSanitizedBody(''); return }
    let cancelled = false
    getDOMPurify().then(purify => {
      if (!cancelled) {
        let processed = purify.sanitize(email.inhoud, {
          ADD_TAGS: ['style'],
          ADD_ATTR: ['target', 'style'],
        })
        // Dim email signatures (after "Met vriendelijke groet", "--", etc.)
        const sigMarkers = ['Met vriendelijke groet', 'Kind regards', 'Best regards', 'Regards,', 'Groeten,', 'Mvg,', 'Met hartelijke groet']
        for (const marker of sigMarkers) {
          const idx = processed.indexOf(marker)
          if (idx > processed.length * 0.3) {
            processed = processed.slice(0, idx) + '<div class="email-sig-dim">' + processed.slice(idx) + '</div>'
            break
          }
        }
        if (!processed.includes('email-sig-dim')) {
          const dashIdx = processed.indexOf('<br>--<br>')
          if (dashIdx > processed.length * 0.3) {
            processed = processed.slice(0, dashIdx) + '<div class="email-sig-dim">' + processed.slice(dashIdx) + '</div>'
          }
        }
        setSanitizedBody(processed)
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
      <div className="flex flex-col h-full min-w-0">
          {/* Top action bar — sticky */}
          <div className="flex items-center justify-between px-5 h-12 border-b border-border/50 flex-shrink-0 bg-card sticky top-0 z-10">
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
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READING MODE — shows email body with reply buttons
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="flex flex-col h-full min-w-0">
        {/* Top action bar — sticky, grouped */}
        <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-border/50 flex-shrink-0 bg-card sticky top-0 z-10">
          {/* Left: Back */}
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
          </div>

          {/* Center: Action buttons with tooltips */}
          <div className="flex items-center gap-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors duration-150" onClick={() => email && onArchive?.(email)}>
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Archiveren</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-red-500 hover:bg-red-500/[0.06] transition-colors duration-150" onClick={() => email && onDelete?.(email)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Verwijderen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/35 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors duration-150" onClick={() => email && onToggleRead?.(email)}>
                <MailOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Markeer als ongelezen</TooltipContent></Tooltip>
          </div>

          {/* Right: AI + Reply + Navigation */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[13px] rounded-lg bg-[#9B8EC4]/10 text-[#9B8EC4] hover:bg-[#9B8EC4]/18 hover:text-[#9B8EC4] transition-colors duration-150"
              onClick={handleSummarize}
              disabled={summaryLoading}
              title="Samenvatten (⌘⇧S)"
            >
              {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>Samenvatten</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[13px] rounded-lg shadow-sm"
              onClick={handleGenerateReplyFromReader}
              disabled={forgieLoading}
              title="Antwoord genereren (⌘⇧R)"
            >
              {forgieLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Reply className="h-3.5 w-3.5" />}
              <span>Beantwoorden</span>
            </Button>
            {emailIndex !== undefined && emailTotal !== undefined && (
              <>
                <div className="w-px h-5 bg-border/50 mx-1" />
                <span className="text-xs text-foreground/30 font-mono tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/30 hover:text-foreground/60" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/30 hover:text-foreground/60" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        </TooltipProvider>

        {/* Scrollable email content */}
        <div className="flex-1 overflow-y-auto bg-card">
          <div className="max-w-[880px] mx-auto">
            {/* Header: subject + sender + reply actions */}
            <div className="px-8 py-5 border-b border-border/40">
              {/* Subject row */}
              <div className="flex items-start justify-between gap-4 mb-4">
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

              {/* Sender info — larger avatar with accent ring */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-2 shadow-sm', avatarColor, avatarRingColor)}>
                  <span className="text-sm font-bold text-white">{senderName[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-foreground">{senderName}</span>
                    <span className="text-xs text-muted-foreground truncate">&lt;{senderEmail}&gt;</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">aan {email.aan}</div>
                </div>
              </div>

              {/* Reply/Forward — ghost style, subtle */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleReply('reply')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors duration-150"
                  title="Beantwoorden">
                  <Reply className="h-3.5 w-3.5" />
                  <span>Beantwoorden</span>
                </button>
                <button onClick={() => handleReply('reply-all')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors duration-150"
                  title="Allen beantwoorden">
                  <ReplyAll className="h-3.5 w-3.5" />
                  <span>Allen</span>
                </button>
                <button onClick={() => handleReply('forward')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors duration-150"
                  title="Doorsturen">
                  <Forward className="h-3.5 w-3.5" />
                  <span>Doorsturen</span>
                </button>
              </div>
            </div>

            {/* Email body content area */}
            <div className="px-8 py-6">
              {/* ── Summary block ── */}
              {(summary || summaryLoading) && (
                <div className="mb-6 rounded-xl border border-[#9B8EC4]/15 overflow-hidden bg-[#9B8EC4]/[0.04]">
                  <button
                    onClick={() => setSummaryExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#9B8EC4]" />
                      <span className="text-[12px] font-semibold text-foreground/55">Samenvatting</span>
                    </div>
                    <ChevronDown className={cn('h-3.5 w-3.5 text-foreground/25 transition-transform', summaryExpanded ? '' : '-rotate-90')} />
                  </button>
                  {summaryExpanded && (
                    <div className="px-4 pb-3">
                      {summaryLoading ? (
                        <div className="flex items-center gap-2 text-[12px] text-foreground/40">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Samenvatten...</span>
                        </div>
                      ) : (
                        <p className="text-[13px] leading-relaxed text-foreground/70">{summary}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Email body — readable, clean hierarchy */}
              {isLoadingBody ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 bg-foreground/[0.04] rounded w-full animate-pulse" />
                  <div className="h-4 bg-foreground/[0.04] rounded w-[90%] animate-pulse" />
                  <div className="h-4 bg-foreground/[0.04] rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-foreground/[0.04] rounded w-[85%] animate-pulse" />
                </div>
              ) : (
                <div ref={emailBodyRef}>
                  <div
                    className="text-[14px] leading-[1.75] text-foreground/80 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-3 [&_a]:text-primary [&_a]:no-underline [&_a]:hover:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:text-sm [&_blockquote]:text-foreground/40 [&_blockquote]:my-3 [&_p]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 [&_.email-sig-dim]:text-muted-foreground [&_.email-sig-dim]:text-[13px]"
                    dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                  />
                  <EmailReaderAIToolbar containerRef={emailBodyRef} />
                </div>
              )}

              {/* Attachments — file cards */}
              {email.bijlagen > 0 && (
                <div className="mt-6 pt-5 border-t border-border/40">
                  <div className="flex flex-wrap gap-2.5">
                    {Array.from({ length: email.bijlagen }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-elevation-sm hover:border-border/70 transition-all duration-200 cursor-pointer group/att"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-500/90 text-white text-[9px] font-bold flex items-center justify-center">PDF</div>
                        <div className="min-w-0">
                          <span className="text-[13px] text-foreground/60 group-hover/att:text-foreground/80 transition-colors block">bijlage-{i + 1}.pdf</span>
                          <span className="text-[11px] text-muted-foreground">128 KB</span>
                        </div>
                        <Download className="h-3.5 w-3.5 text-foreground/15 group-hover/att:text-foreground/45 transition-colors ml-1" />
                      </div>
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

