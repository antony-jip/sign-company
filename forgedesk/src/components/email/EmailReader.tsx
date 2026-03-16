import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Trash2, Star, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate } from './emailHelpers'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    // Set editor content with signature
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br>${signatureHtml}`
        // Place cursor at start
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
      // Include quoted original
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
        const currentSig = signatureHtml
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${currentSig}`
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
      <div className="flex-1 flex items-center justify-center text-foreground/30">
        <p className="text-sm">Selecteer een email om te lezen</p>
      </div>
    )
  }

  const senderName = extractSenderName(email.van)
  const senderEmail = extractSenderEmail(email.van)
  const sanitizedBody = email.inhoud ? DOMPurify.sanitize(email.inhoud, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'style'],
  }) : ''

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs">Terug</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={() => email && onArchive?.(email)}>
            <Archive className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Archief</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={() => email && onDelete?.(email)}>
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Verwijder</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={() => email && onToggleRead?.(email)}>
            <MailOpen className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Ongelezen</span>
          </Button>
        </div>
        {emailIndex !== undefined && emailTotal !== undefined && (
          <div className="flex items-center gap-1 text-xs text-foreground/40">
            <span>{emailIndex + 1}/{emailTotal}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto px-6 py-6">
          {/* Subject */}
          <h2 className="text-lg font-semibold text-foreground mb-4">{email.onderwerp || '(geen onderwerp)'}</h2>

          {/* Sender info */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">{senderName[0]?.toUpperCase()}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{senderName}</span>
                  <span className="text-xs text-foreground/40">&lt;{senderEmail}&gt;</span>
                </div>
                <div className="text-xs text-foreground/40">
                  Aan: {email.aan}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-foreground/40">{formatShortDate(email.datum)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleStar?.(email)}>
                <Star className={cn('h-3.5 w-3.5', email.starred ? 'fill-amber-400 text-amber-400' : 'text-foreground/30')} />
              </Button>
            </div>
          </div>

          {/* Reply action buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleReply('reply')}>
              <Reply className="h-3 w-3" /> Beantwoorden
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleReply('reply-all')}>
              <ReplyAll className="h-3 w-3" /> Allen
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleReply('forward')}>
              <Forward className="h-3 w-3" /> Doorsturen
            </Button>
          </div>

          {/* Body */}
          {isLoadingBody ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-foreground/5 rounded w-full animate-pulse" />
              <div className="h-4 bg-foreground/5 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-foreground/5 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-foreground/5 rounded w-2/3 animate-pulse" />
            </div>
          ) : (
            <div
              className="text-base leading-relaxed text-foreground/80 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/60"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          )}

          {/* Attachments */}
          {email.bijlagen > 0 && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-foreground/40 mb-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span>{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
              </div>
              {/* Attachment cards would come from IMAP detail — shown as placeholder */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: email.bijlagen }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-foreground/[0.02] text-sm">
                    <div className="w-6 h-6 rounded bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">PDF</div>
                    <span className="text-foreground/60">bijlage-{i + 1}</span>
                    <Download className="h-3 w-3 text-foreground/30 cursor-pointer hover:text-foreground/60" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline reply */}
          {replyMode && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="rounded-lg border border-border/50 bg-white overflow-hidden">
                {/* Reply header */}
                <div className="flex items-center justify-between px-4 py-2 bg-foreground/[0.02] border-b border-border/30">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-foreground/40">Aan:</span>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm text-foreground flex-1 min-w-[200px]"
                      placeholder="ontvanger@voorbeeld.nl"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-foreground/40">
                    {replyMode === 'reply' && <Reply className="h-3 w-3" />}
                    {replyMode === 'reply-all' && <ReplyAll className="h-3 w-3" />}
                    {replyMode === 'forward' && <Forward className="h-3 w-3" />}
                    <span>Re: {email.onderwerp}</span>
                  </div>
                </div>

                {/* AI + template bar */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-2xs gap-1 text-foreground/40 hover:text-foreground/70"
                    onClick={handleForgieWrite}
                    disabled={forgieLoading}
                  >
                    {forgieLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Schrijf mijn e-mail
                  </Button>
                </div>

                {/* Editor */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[150px] px-4 py-3 text-sm leading-relaxed text-foreground outline-none [&_img]:max-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />

                {/* Quoted original */}
                {email.inhoud && (
                  <div className="px-4 pb-2">
                    <button
                      onClick={() => setShowQuotedText(!showQuotedText)}
                      className="text-2xs text-foreground/30 hover:text-foreground/50"
                    >
                      {showQuotedText ? 'Verberg origineel' : '... toon origineel bericht'}
                    </button>
                    {showQuotedText && (
                      <div
                        className="mt-2 pl-3 border-l-2 border-foreground/10 text-sm text-foreground/40"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.inhoud) }}
                      />
                    )}
                  </div>
                )}

                {/* Toolbar + send */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-foreground/[0.02]">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => execCommand('bold')}><Bold className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => execCommand('italic')}><Italic className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => execCommand('underline')}><Underline className="h-3.5 w-3.5" /></Button>
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => execCommand('insertUnorderedList')}><List className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => execCommand('insertOrderedList')}><ListOrdered className="h-3.5 w-3.5" /></Button>
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40" onClick={() => {
                      const url = prompt('URL:')
                      if (url) execCommand('createLink', url)
                    }}><Link2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/40"><Paperclip className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-foreground/40" onClick={() => setReplyMode(null)}>
                      Annuleren
                    </Button>
                    <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSend} disabled={isSending}>
                      <Send className="h-3 w-3" />
                      {isSending ? 'Verzenden...' : 'Verzenden'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
