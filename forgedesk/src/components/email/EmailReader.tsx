import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Trash2, Star, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
  UserPlus, FolderPlus, FileText, ListPlus, TrendingUp,
  Building2, Mail, Phone, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor } from './emailHelpers'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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

  return (
    <div className="flex h-full">
      {/* ─── MAIN: email content + inline reply ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top action bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/50 flex-shrink-0 bg-white">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/60" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Terug</span>
            </Button>
            <div className="w-px h-5 bg-border/30 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/50 hover:text-foreground" onClick={() => email && onArchive?.(email)}>
              <Archive className="h-4 w-4" />
              <span className="text-sm hidden lg:inline">Archief</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/50 hover:text-foreground" onClick={() => email && onDelete?.(email)}>
              <Trash2 className="h-4 w-4" />
              <span className="text-sm hidden lg:inline">Verwijder</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-foreground/50 hover:text-foreground" onClick={() => email && onToggleRead?.(email)}>
              <MailOpen className="h-4 w-4" />
              <span className="text-sm hidden lg:inline">Ongelezen</span>
            </Button>
          </div>
          {emailIndex !== undefined && emailTotal !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-foreground/40">
              <span>{emailIndex + 1} / {emailTotal}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable email content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-[900px] px-8 py-8">
            {/* Subject */}
            <h1 className="text-xl font-semibold text-foreground mb-6 leading-tight">
              {email.onderwerp || '(geen onderwerp)'}
            </h1>

            {/* Sender info row */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', avatarColor)}>
                  <span className="text-sm font-bold text-white">{senderName[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{senderName}</span>
                    <span className="text-xs text-foreground/40">&lt;{senderEmail}&gt;</span>
                  </div>
                  <div className="text-xs text-foreground/40 mt-0.5">
                    Aan: {email.aan}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-foreground/40">{formatShortDate(email.datum)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar?.(email)}>
                  <Star className={cn('h-4 w-4', email.starred ? 'fill-amber-400 text-amber-400' : 'text-foreground/25')} />
                </Button>
              </div>
            </div>

            {/* Reply/Forward buttons */}
            <div className="flex items-center gap-2 mb-6">
              <Button variant="outline" size="sm" className="h-8 gap-2 text-sm" onClick={() => handleReply('reply')}>
                <Reply className="h-3.5 w-3.5" /> Beantwoorden
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-2 text-sm" onClick={() => handleReply('reply-all')}>
                <ReplyAll className="h-3.5 w-3.5" /> Allen
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-2 text-sm" onClick={() => handleReply('forward')}>
                <Forward className="h-3.5 w-3.5" /> Doorsturen
              </Button>
            </div>

            {/* Email body */}
            {isLoadingBody ? (
              <div className="space-y-4 py-6">
                <div className="h-4 bg-foreground/5 rounded w-full animate-pulse" />
                <div className="h-4 bg-foreground/5 rounded w-4/5 animate-pulse" />
                <div className="h-4 bg-foreground/5 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-foreground/5 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-foreground/5 rounded w-2/3 animate-pulse" />
              </div>
            ) : (
              <div
                className="text-[15px] leading-relaxed text-foreground/85 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:text-foreground/60 [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              />
            )}

            {/* Attachments */}
            {email.bijlagen > 0 && (
              <div className="mt-8 pt-6 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs text-foreground/40 mb-3">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="font-medium">{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: email.bijlagen }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/50 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors cursor-pointer">
                      <div className="w-7 h-7 rounded bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">PDF</div>
                      <div>
                        <span className="text-sm text-foreground/70">bijlage-{i + 1}.pdf</span>
                      </div>
                      <Download className="h-3.5 w-3.5 text-foreground/30 hover:text-foreground/60 ml-2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── INLINE REPLY ─── */}
            {replyMode && (
              <div className="mt-6 border-t-2 border-primary/20">
                {/* Reply label + To field */}
                <div className="flex items-center gap-3 px-1 py-3 border-b border-border/20">
                  <div className="flex items-center gap-1.5 text-xs text-foreground/40 flex-shrink-0">
                    {replyMode === 'reply' && <Reply className="h-3.5 w-3.5" />}
                    {replyMode === 'reply-all' && <ReplyAll className="h-3.5 w-3.5" />}
                    {replyMode === 'forward' && <Forward className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-sm text-foreground/40 flex-shrink-0">Aan:</span>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-foreground flex-1 min-w-0"
                    placeholder="ontvanger@voorbeeld.nl"
                  />
                  <button
                    onClick={() => setReplyMode(null)}
                    className="text-xs text-foreground/30 hover:text-foreground/50 flex-shrink-0"
                  >
                    Annuleren
                  </button>
                </div>

                {/* Editor area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[160px] py-4 px-1 text-[15px] leading-relaxed text-foreground outline-none [&_img]:max-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />

                {/* Quoted original */}
                {email.inhoud && (
                  <div className="px-1 pb-3">
                    <button
                      onClick={() => setShowQuotedText(!showQuotedText)}
                      className="text-xs text-foreground/30 hover:text-foreground/50"
                    >
                      {showQuotedText ? 'Verberg origineel' : '... toon origineel bericht'}
                    </button>
                    {showQuotedText && (
                      <div
                        className="mt-3 pl-4 border-l-2 border-foreground/10 text-sm text-foreground/40"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.inhoud) }}
                      />
                    )}
                  </div>
                )}

                {/* Bottom toolbar: formatting + AI + send */}
                <div className="flex items-center justify-between py-3 px-1 border-t border-border/20">
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => execCommand('bold')}><Bold className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => execCommand('italic')}><Italic className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => execCommand('underline')}><Underline className="h-3.5 w-3.5" /></Button>
                    <div className="w-px h-4 bg-border/30 mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => execCommand('insertUnorderedList')}><List className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => execCommand('insertOrderedList')}><ListOrdered className="h-3.5 w-3.5" /></Button>
                    <div className="w-px h-4 bg-border/30 mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35" onClick={() => {
                      const url = prompt('URL:')
                      if (url) execCommand('createLink', url)
                    }}><Link2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/35"><Paperclip className="h-3.5 w-3.5" /></Button>
                    <div className="w-px h-4 bg-border/30 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-foreground/40 hover:text-foreground/70"
                      onClick={handleForgieWrite}
                      disabled={forgieLoading}
                    >
                      {forgieLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI
                    </Button>
                  </div>
                  <Button size="sm" className="h-8 gap-2 text-sm" onClick={handleSend} disabled={isSending}>
                    <Send className="h-3.5 w-3.5" />
                    {isSending ? 'Verzenden...' : 'Verzenden'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CRM SIDEBAR (right) ─── */}
      <div className="w-[300px] border-l border-border/50 bg-[#FAFAF8] flex-shrink-0 overflow-y-auto hidden xl:block">
        <div className="p-5 space-y-6">
          {/* Contact card */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn('w-11 h-11 rounded-full flex items-center justify-center', avatarColor)}>
                <span className="text-base font-bold text-white">{senderName[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{senderName}</p>
                <p className="text-xs text-foreground/40 truncate">{senderEmail}</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-foreground/50">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{senderEmail}</span>
              </div>
              {email.aan && (
                <div className="flex items-center gap-2.5 text-xs text-foreground/50">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{email.aan}</span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Quick actions */}
          <div>
            <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-3">Snelkoppelingen</h3>
            <div className="space-y-1">
              <button
                onClick={() => navigate('/klanten')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-white hover:text-foreground transition-colors"
              >
                <UserPlus className="h-4 w-4 text-foreground/40" />
                Klant toevoegen
              </button>
              <button
                onClick={() => navigate('/offertes/nieuw')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-white hover:text-foreground transition-colors"
              >
                <FileText className="h-4 w-4 text-foreground/40" />
                Offerte aanmaken
              </button>
              <button
                onClick={() => navigate('/projecten/nieuw')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-white hover:text-foreground transition-colors"
              >
                <FolderPlus className="h-4 w-4 text-foreground/40" />
                Project aanmaken
              </button>
              <button
                onClick={() => navigate('/taken')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-white hover:text-foreground transition-colors"
              >
                <ListPlus className="h-4 w-4 text-foreground/40" />
                Taak toevoegen
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Email metadata */}
          <div>
            <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground/40">Datum</span>
                <span className="text-foreground/70">{new Date(email.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/40">Map</span>
                <span className="text-foreground/70 capitalize">{email.map}</span>
              </div>
              {email.bijlagen > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground/40">Bijlagen</span>
                  <span className="text-foreground/70">{email.bijlagen}</span>
                </div>
              )}
              {email.labels && email.labels.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground/40">Labels</span>
                  <div className="flex gap-1">
                    {email.labels.map(label => (
                      <span key={label} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-2xs font-medium">
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
    </div>
  )
}
