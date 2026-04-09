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
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
import {
  ArrowLeft, Trash2, Star, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Link2, Sparkles, Loader2, Download,
  Undo2, Redo2, X, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email, EmailAttachment } from '@/types'
import { extractSenderName, extractSenderEmail, formatShortDate, getAvatarColor, getAvatarRingColor, getAvatarStyle } from './emailHelpers'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { callForgie } from '@/services/forgieService'
import { downloadEmailAttachment } from '@/services/gmailService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { EmailReaderAIToolbar } from './EmailReaderAIToolbar'

// Format file size human-readable
function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Bepaal label + kleur voor een bijlage op basis van content type / extensie
function getAttachmentVisual(filename: string, contentType?: string): { label: string; bg: string } {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('pdf') || ext === 'pdf') return { label: 'PDF', bg: 'bg-red-500/90' }
  if (ct.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext))
    return { label: 'IMG', bg: 'bg-violet-500/90' }
  if (ct.includes('word') || ['doc', 'docx'].includes(ext)) return { label: 'DOC', bg: 'bg-blue-500/90' }
  if (ct.includes('sheet') || ct.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext))
    return { label: 'XLS', bg: 'bg-emerald-500/90' }
  if (ct.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return { label: 'PPT', bg: 'bg-orange-500/90' }
  if (ct.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { label: 'ZIP', bg: 'bg-amber-600/90' }
  if (ct.includes('text') || ['txt', 'md', 'log'].includes(ext)) return { label: 'TXT', bg: 'bg-slate-500/90' }
  return { label: ext.toUpperCase().slice(0, 3) || 'FILE', bg: 'bg-slate-500/90' }
}

interface EmailReaderProps {
  email: Email | null
  threadEmails?: Email[]
  isLoadingBody?: boolean
  emailIndex?: number
  emailTotal?: number
  allEmails?: Email[]
  imapFolder?: string
  onToggleStar?: (email: Email) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onSendReply?: (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; content: string; encoding: 'base64' }> }) => void
  onSelectEmail?: (email: Email) => void
}

export function EmailReader({
  email,
  threadEmails,
  isLoadingBody,
  emailIndex,
  emailTotal,
  allEmails,
  imapFolder = 'INBOX',
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
  const [replyAttachments, setReplyAttachments] = useState<File[]>([])
  // Originele bijlagen die meegestuurd worden bij forward (los van user uploads)
  const [forwardOriginalAttachments, setForwardOriginalAttachments] = useState<EmailAttachment[]>([])
  // Schedule send menu state
  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [customScheduleDate, setCustomScheduleDate] = useState('')
  const [customScheduleTime, setCustomScheduleTime] = useState('09:00')
  const editorRef = useRef<HTMLDivElement>(null)
  const emailBodyRef = useRef<HTMLDivElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

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

  // Track per-attachment download state (alleen visueel — losse spinner per bijlage)
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [previewAtt, setPreviewAtt] = useState<{ filename: string; url: string; contentType: string } | null>(null)

  // Reset reply state and summary when email changes
  useEffect(() => {
    setReplyMode(null)
    setShowQuotedText(false)
    setSummary(null)
    setSummaryLoading(false)
    setSummaryExpanded(true)
    setPreviewAtt((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [email?.id])

  const handleDownloadAttachment = useCallback(async (filename: string) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen — geen geldig email-id')
      return
    }
    setDownloadingAttachment(filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, filename)
      // Convert base64 → Blob → trigger download
      const binary = atob(result.content)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename || filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Iets later cleanup zodat browser de download heeft kunnen verwerken
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      logger.error('Bijlage downloaden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Bijlage downloaden mislukt')
    } finally {
      setDownloadingAttachment(null)
    }
  }, [email, imapFolder])

  const handlePreviewAttachment = useCallback(async (att: EmailAttachment) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen — geen geldig email-id')
      return
    }
    setPreviewLoading(att.filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, att.filename)
      const binary = atob(result.content)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const contentType = result.contentType || att.contentType || 'application/octet-stream'
      const blob = new Blob([bytes], { type: contentType })
      const url = URL.createObjectURL(blob)
      setPreviewAtt((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { filename: result.filename || att.filename, url, contentType }
      })
    } catch (err) {
      logger.error('Preview ophalen mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Preview ophalen mislukt')
    } finally {
      setPreviewLoading(null)
    }
  }, [email, imapFolder])

  const closePreview = useCallback(() => {
    setPreviewAtt((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  const handleDownloadAllAttachments = useCallback(async () => {
    if (!email?.attachment_meta?.length) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlagen niet ophalen — geen geldig email-id')
      return
    }
    setDownloadingAll(true)
    let success = 0
    for (const att of email.attachment_meta) {
      try {
        const result = await downloadEmailAttachment(uid, imapFolder, att.filename)
        const binary = atob(result.content)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename || att.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        success++
        // Korte pauze zodat de browser elke download apart kan verwerken
        await new Promise((r) => setTimeout(r, 350))
      } catch (err) {
        logger.error(`Download mislukt voor ${att.filename}:`, err)
      }
    }
    setDownloadingAll(false)
    if (success === email.attachment_meta.length) {
      toast.success(`${success} bijlage${success > 1 ? 'n' : ''} gedownload`)
    } else {
      toast.warning(`${success}/${email.attachment_meta.length} bijlagen gedownload`)
    }
  }, [email, imapFolder])

  // ESC sluit preview
  useEffect(() => {
    if (!previewAtt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewAtt, closePreview])

  // Cleanup preview URL bij unmount
  useEffect(() => {
    return () => {
      setPreviewAtt((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return null
      })
    }
  }, [])

  const handleSummarize = useCallback(async () => {
    if (!email || summaryLoading) return
    setSummaryLoading(true)
    setSummaryExpanded(true)
    try {
      const text = email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 2000) || ''
      const response = await callForgie('summarize', text)
      if (response?.result) setSummary(response.result)
    } catch (err) {
      logger.error('Fout bij samenvatten email:', err)
      toast.error('Daan kon dit niet verwerken. Probeer het opnieuw.')
    } finally {
      setSummaryLoading(false)
    }
  }, [email, summaryLoading])

  const handleReply = useCallback((mode: 'reply' | 'reply-all' | 'forward') => {
    if (!email) return
    setReplyMode(mode)
    setReplyAttachments([])
    // Bij forward: alle originele bijlagen meenemen (gebruiker kan ze later
    // individueel uitzetten). Bij reply: niks meenemen.
    if (mode === 'forward' && email.attachment_meta && email.attachment_meta.length > 0) {
      setForwardOriginalAttachments(email.attachment_meta)
    } else {
      setForwardOriginalAttachments([])
    }
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

  const buildReplyPayload = useCallback(async () => {
    if (!email || !editorRef.current) return null
    const html = editorRef.current.innerHTML
    if (!html.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Bericht is leeg')
      return null
    }
    const prefix = replyMode === 'forward' ? 'Fwd: ' : 'Re: '
    const subject = email.onderwerp.startsWith(prefix) ? email.onderwerp : `${prefix}${email.onderwerp}`
    const quotedOriginal = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666;"><p>Op ${formatShortDate(email.datum)} schreef ${extractSenderName(email.van)}:</p>${email.inhoud}</div>`

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

    // Bij forward: haal de oorspronkelijke bijlagen die de user nog wil
    // meesturen op uit IMAP. forwardOriginalAttachments wordt door de UI
    // beheerd zodat de user er individueel kunnen verwijderen.
    let originalAttachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
    if (replyMode === 'forward' && forwardOriginalAttachments.length > 0) {
      const uid = Number(email.gmail_id || email.id)
      if (!Number.isNaN(uid)) {
        toast.info(`Originele bijlage${forwardOriginalAttachments.length > 1 ? 'n' : ''} ophalen...`)
        try {
          const fetched = await Promise.all(
            forwardOriginalAttachments.map((att) =>
              downloadEmailAttachment(uid, imapFolder, att.filename).catch((e) => {
                logger.warn(`Bijlage "${att.filename}" ophalen mislukt:`, e)
                return null
              })
            )
          )
          originalAttachments = fetched
            .filter((r): r is NonNullable<typeof r> => r !== null && !!r.content)
            .map((r) => ({
              filename: r.filename,
              content: r.content,
              encoding: 'base64' as const,
            }))
          if (originalAttachments.length < forwardOriginalAttachments.length) {
            toast.warning(`${forwardOriginalAttachments.length - originalAttachments.length} bijlage(n) konden niet worden opgehaald`)
          }
        } catch (err) {
          logger.warn('Originele bijlagen ophalen mislukt:', err)
          toast.warning('Originele bijlagen niet ingesloten — verzend zonder')
        }
      }
    }

    const userAttachments = replyAttachments.length
      ? await Promise.all(replyAttachments.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
          encoding: 'base64' as const,
        })))
      : []

    const attachmentPayload = [...originalAttachments, ...userAttachments]

    return {
      to: replyTo,
      subject,
      body: editorRef.current.innerText,
      html: html + quotedOriginal,
      attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
    }
  }, [email, replyMode, replyTo, replyAttachments, forwardOriginalAttachments, imapFolder])

  const handleSend = useCallback(async () => {
    if (!onSendReply) return
    setIsSending(true)
    try {
      const payload = await buildReplyPayload()
      if (!payload) return
      await onSendReply(payload)
      setReplyMode(null)
      setReplyAttachments([])
      setForwardOriginalAttachments([])
      toast.success('Email verzonden')
    } catch (err) {
      logger.error('Fout bij verzenden email:', err)
      toast.error('Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }, [onSendReply, buildReplyPayload])

  const handleScheduleSend = useCallback(async (scheduledAt: string, label: string) => {
    if (!onSendReply) return
    setIsSending(true)
    setShowScheduleMenu(false)
    try {
      const payload = await buildReplyPayload()
      if (!payload) return
      await onSendReply({ ...payload, scheduledAt })
      setReplyMode(null)
      setReplyAttachments([])
      setForwardOriginalAttachments([])
      toast.success(`Email ingepland: ${label}`)
    } catch (err) {
      logger.error('Email schedule failed:', err)
      toast.error('Inplannen mislukt')
    } finally {
      setIsSending(false)
    }
  }, [onSendReply, buildReplyPayload])

  const handleForgieWrite = useCallback(async () => {
    if (!email || !editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Oorspronkelijk bericht van ${extractSenderName(email.van)}: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 500)}`
      const response = await callForgie('generate-reply', context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
    } catch (err) {
      logger.error('Fout bij genereren antwoord:', err)
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
    } catch (err) {
      logger.error('Fout bij genereren antwoord vanuit reader:', err)
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
  const avatarStyle = useMemo(() => getAvatarStyle(senderName), [senderName])

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
      <div className="flex-1 flex items-center justify-center text-[#B0ADA8] h-full">
        <p className="text-[14px]">Selecteer een email om te lezen</p>
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
          <div className="flex items-center justify-between px-5 h-12 border-b border-[#F0EFEC] flex-shrink-0 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC]"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[14px]">Terug</span>
              </Button>
              <div className="w-px h-5 bg-[#F0EFEC] mx-1.5" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => email && onArchive?.(email)} title="Archiveren">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150" onClick={() => email && onDelete?.(email)} title="Verwijderen">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => email && onToggleRead?.(email)} title="Markeer als ongelezen">
                <MailOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-[14px] text-[#B0ADA8]">
              {emailIndex !== undefined && emailTotal !== undefined && (
                <>
                  <span className="tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#B0ADA8] hover:text-[#6B6B66]" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#B0ADA8] hover:text-[#6B6B66]" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ─── Compose fields ─── */}
          <div className="border-b border-[#F0EFEC] bg-white flex-shrink-0">
            {/* Aan field */}
            <div className="flex items-center px-6 py-2.5 border-b border-[#F0EFEC]">
              <span className="text-[12px] text-[#9B9B95] w-10 flex-shrink-0">Aan</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#1A1A1A] min-w-0 placeholder:text-[#B0ADA8]"
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
                    'p-1.5 rounded-md transition-colors duration-150',
                    replyMode === 'reply' ? 'text-[#1A535C] bg-[#1A535C]/[0.06]' : 'text-[#B0ADA8] hover:text-[#6B6B66] hover:bg-[#F0EFEC]',
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
                    'p-1.5 rounded-md transition-colors duration-150',
                    replyMode === 'reply-all' ? 'text-[#1A535C] bg-[#1A535C]/[0.06]' : 'text-[#B0ADA8] hover:text-[#6B6B66] hover:bg-[#F0EFEC]',
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
                    'p-1.5 rounded-md transition-colors duration-150',
                    replyMode === 'forward' ? 'text-[#1A535C] bg-[#1A535C]/[0.06]' : 'text-[#B0ADA8] hover:text-[#6B6B66] hover:bg-[#F0EFEC]',
                  )}
                  title="Doorsturen"
                >
                  <Forward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center px-6 py-2.5 border-b border-[#F0EFEC]">
              <span className="text-[12px] text-[#9B9B95] w-10 flex-shrink-0" />
              <span className="text-[14px] text-[#4A4A46] truncate">{replySubject}</span>
            </div>

            {/* Quick tools: AI schrijven */}
            <div className="flex items-center gap-3 px-6 py-2">
              <button
                onClick={handleForgieWrite}
                disabled={forgieLoading}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] transition-all duration-150',
                  forgieLoading
                    ? 'text-[#1A535C]/40'
                    : 'text-[#1A535C]/70 hover:text-[#1A535C] hover:bg-[#1A535C]/[0.05]',
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
              className="min-h-[180px] py-5 px-6 text-[15px] leading-[1.7] text-[#1A1A1A] outline-none [&_img]:max-w-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-[#B0ADA8] empty:before:pointer-events-none"
              data-placeholder="Schrijf je antwoord..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <AIContentEditableToolbar editorRef={editorRef} />

            {/* ─── Attachments ─── */}
            {(replyAttachments.length > 0 || forwardOriginalAttachments.length > 0) && (
              <div className="flex flex-wrap gap-2 px-5 py-2.5 border-t border-[#F0EFEC] bg-[#F8F7F5]">
                {/* Doorgestuurde originelen — met visual icon en "doorgestuurd" hint */}
                {forwardOriginalAttachments.map((att, i) => {
                  const visual = getAttachmentVisual(att.filename, att.contentType)
                  return (
                    <div
                      key={`fwd-${att.filename}-${i}`}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-[#1A535C]/20 text-[12px] text-[#6B6B66]"
                      title={`Doorgestuurd: ${att.filename}`}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0',
                        visual.bg,
                      )}>
                        {visual.label}
                      </div>
                      <span className="max-w-[180px] truncate">{att.filename}</span>
                      <span className="text-[10px] text-[#9B9B95] font-mono">{formatFileSize(att.size)}</span>
                      <button
                        onClick={() => setForwardOriginalAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-[#9B9B95] hover:text-[#C0451A] transition-colors"
                        title="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                {/* User uploaded files */}
                {replyAttachments.map((file, i) => (
                  <div key={i} className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-[#EBEBEB] text-[12px] text-[#6B6B66]">
                    <Paperclip className="h-3 w-3 text-[#9B9B95]" />
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <span className="text-[10px] text-[#9B9B95] font-mono">{(file.size / 1024).toFixed(0)}KB</span>
                    <button
                      onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-[#9B9B95] hover:text-[#C0451A] transition-colors"
                      title="Verwijderen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Toolbar (inline, under signature) ─── */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-b border-[#F0EFEC] bg-[#F8F7F5]">
              <div className="flex items-center">
                <div className="flex items-center gap-px mr-2">
                  <button onClick={() => execCommand('undo')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#B0ADA8] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Ongedaan maken"><Undo2 className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('redo')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#B0ADA8] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Opnieuw"><Redo2 className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-[#F0EFEC] mr-2" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('bold')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Vet"><Bold className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('italic')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Cursief"><Italic className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('underline')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Onderstrepen"><Underline className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-[#F0EFEC] mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => execCommand('insertUnorderedList')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Lijst"><List className="h-4 w-4" /></button>
                  <button onClick={() => execCommand('insertOrderedList')} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Genummerde lijst"><ListOrdered className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-[#F0EFEC] mx-1" />
                <div className="flex items-center gap-px">
                  <button onClick={() => { const url = prompt('URL:'); if (url) execCommand('createLink', url) }} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Link"><Link2 className="h-4 w-4" /></button>
                  <button onClick={() => replyFileInputRef.current?.click()} className="h-8 w-8 flex items-center justify-center rounded-md text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" title="Bijlage"><Paperclip className="h-4 w-4" /></button>
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length) setReplyAttachments(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReplyMode(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-[#B0ADA8] hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150"
                  title="Annuleren"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-[#B0ADA8] hidden sm:block">
                  {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
                </span>
                <div className="relative">
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-[#1A535C] bg-[#1A535C]/[0.08] hover:bg-[#1A535C]/[0.14] transition-colors duration-150 disabled:opacity-50"
                    onClick={() => setShowScheduleMenu(s => !s)}
                    disabled={isSending}
                    title="Inplannen"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  {showScheduleMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setShowScheduleMenu(false); setShowCustomSchedule(false) }} />
                      <div className="absolute bottom-full right-0 mb-2 w-[220px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
                        <p className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">Inplannen</p>
                        {[
                          { label: 'Over 1 uur', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d } },
                          { label: 'Vanmiddag 14:00', getDate: () => { const d = new Date(); d.setHours(14, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d } },
                          { label: 'Morgen 9:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
                          { label: 'Maandag 9:00', getDate: () => { const d = new Date(); const day = d.getDay(); const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day; d.setDate(d.getDate() + daysUntilMon); d.setHours(9, 0, 0, 0); return d } },
                        ].map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleScheduleSend(opt.getDate().toISOString(), opt.label)}
                            className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#F8F7F5] transition-colors duration-150 flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            <span className="text-[11px] text-[#9B9B95] font-mono">
                              {opt.getDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))}
                        <div className="border-t border-[#EBEBEB] mt-1 pt-1">
                          {!showCustomSchedule ? (
                            <button
                              onClick={() => {
                                setShowCustomSchedule(true)
                                const tomorrow = new Date()
                                tomorrow.setDate(tomorrow.getDate() + 1)
                                setCustomScheduleDate(tomorrow.toISOString().split('T')[0])
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] text-[#1A535C] hover:bg-[#F8F7F5] transition-colors duration-150 flex items-center gap-2"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Kies datum en tijd...
                            </button>
                          ) : (
                            <div className="px-3.5 py-2.5 space-y-2">
                              <input
                                type="date"
                                value={customScheduleDate}
                                onChange={e => setCustomScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-2.5 py-1.5 text-[13px] text-[#1A1A1A] bg-[#F8F7F5] rounded-lg border border-[#EBEBEB] outline-none focus:border-[#1A535C] transition-colors font-mono"
                              />
                              <input
                                type="time"
                                value={customScheduleTime}
                                onChange={e => setCustomScheduleTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[13px] text-[#1A1A1A] bg-[#F8F7F5] rounded-lg border border-[#EBEBEB] outline-none focus:border-[#1A535C] transition-colors font-mono"
                              />
                              <button
                                onClick={() => {
                                  if (!customScheduleDate) { toast.error('Kies een datum'); return }
                                  const dt = new Date(`${customScheduleDate}T${customScheduleTime}:00`)
                                  if (dt <= new Date()) { toast.error('Kies een moment in de toekomst'); return }
                                  const label = dt.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + customScheduleTime
                                  handleScheduleSend(dt.toISOString(), label)
                                  setShowCustomSchedule(false)
                                }}
                                className="w-full py-1.5 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                              >
                                Inplannen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="h-9 px-6 rounded-xl text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 transition-all duration-150 flex items-center gap-2 disabled:opacity-50"
                  onClick={handleSend}
                  disabled={isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'Verzenden...' : 'Verzenden'}
                </button>
              </div>
            </div>

            {/* ─── Original email shown below toolbar ─── */}
            {sanitizedBody && (
              <div className="mx-6 py-5">
                <div className="pl-4 border-l-2 border-[#EBEBEB]">
                  <div className="flex items-center gap-2 mb-3 text-[12px] text-[#B0ADA8]">
                    <span>Op {formatShortDate(email.datum)} schreef {senderName}:</span>
                  </div>
                  <div
                    className="text-[14px] leading-relaxed text-[#9B9B95] [&_img]:max-w-full [&_a]:text-[#1A535C]/50 [&_a]:underline [&_table]:w-full [&_blockquote]:border-l-2 [&_blockquote]:border-[#EBEBEB] [&_blockquote]:pl-3 [&_p]:mb-2"
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
        <div className="flex items-center justify-between px-5 h-12 border-b border-[#F0EFEC] flex-shrink-0 bg-white sticky top-0 z-10">
          {/* Left: Back */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC]"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[14px]">Terug</span>
            </Button>
          </div>

          {/* Center: Action buttons with tooltips */}
          <div className="flex items-center gap-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => email && onArchive?.(email)}>
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Archiveren</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150" onClick={() => email && onDelete?.(email)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Verwijderen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] transition-colors duration-150" onClick={() => email && onToggleRead?.(email)}>
                <MailOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Markeer als ongelezen</TooltipContent></Tooltip>
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
            <button
              className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white bg-[#1A535C] shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] transition-all flex items-center gap-1.5"
              onClick={() => handleReply('reply')}
              title="Beantwoorden"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Beantwoorden</span>
            </button>
            <button
              className="h-8 px-3 rounded-lg text-[13px] font-medium text-[#F15025] bg-[#FDE8E2] hover:bg-[#FCD5CC] transition-all flex items-center gap-1.5 disabled:opacity-50"
              onClick={handleGenerateReplyFromReader}
              disabled={forgieLoading}
              title="Daan schrijft antwoord (⌘⇧R)"
            >
              {forgieLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Daan</span>
            </button>
            {emailIndex !== undefined && emailTotal !== undefined && (
              <>
                <div className="w-px h-5 bg-[#F0EFEC] mx-1" />
                <span className="text-[12px] text-[#B0ADA8] font-mono tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#B0ADA8] hover:text-[#6B6B66]" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#B0ADA8] hover:text-[#6B6B66]" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        </TooltipProvider>

        {/* Scrollable email content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="w-full">
            {/* Header: subject + sender + reply actions */}
            <div className="px-8 py-5 border-b border-[#F0EFEC]">
              {/* Subject row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-lg font-bold text-[#1A1A1A] leading-snug tracking-[-0.3px]">
                  {email.onderwerp || '(geen onderwerp)'}
                </h1>
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                  <span className="text-[11px] text-[#B0ADA8] font-mono tabular-nums whitespace-nowrap">{formatShortDate(email.datum)}</span>
                  <button
                    onClick={() => onToggleStar?.(email)}
                    className={cn(
                      'p-1 rounded-md transition-colors duration-150',
                      email.starred
                        ? 'text-amber-400 hover:bg-amber-50'
                        : 'text-[#B0ADA8] hover:text-[#9B9B95] hover:bg-[#F0EFEC]',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', email.starred && 'fill-amber-400')} />
                  </button>
                </div>
              </div>

              {/* Sender info — larger avatar with accent ring */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.03]" style={{ backgroundColor: avatarStyle.bg }}>
                  <span className="text-[14px] font-bold leading-none" style={{ color: avatarStyle.text }}>{senderName[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-[#1A1A1A] leading-none">{senderName}</span>
                    <span className="text-[12px] text-[#9B9B95] truncate leading-none">&lt;{senderEmail}&gt;</span>
                  </div>
                  <div className="text-[11px] text-[#9B9B95] mt-0.5">aan {email.aan}</div>
                </div>
              </div>

              {/* Reply/Forward — ghost style, subtle */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleReply('reply')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[#9B9B95] hover:text-[#4A4A46] hover:bg-[#F0EFEC] transition-colors duration-150"
                  title="Beantwoorden">
                  <Reply className="h-3.5 w-3.5" />
                  <span>Beantwoorden</span>
                </button>
                <button onClick={() => handleReply('reply-all')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[#9B9B95] hover:text-[#4A4A46] hover:bg-[#F0EFEC] transition-colors duration-150"
                  title="Allen beantwoorden">
                  <ReplyAll className="h-3.5 w-3.5" />
                  <span>Allen</span>
                </button>
                <button onClick={() => handleReply('forward')}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-[#9B9B95] hover:text-[#4A4A46] hover:bg-[#F0EFEC] transition-colors duration-150"
                  title="Doorsturen">
                  <Forward className="h-3.5 w-3.5" />
                  <span>Doorsturen</span>
                </button>
              </div>
            </div>

            {/* Email body content area */}
            <div className="px-8 py-6">
              {/* ── Thread navigation strip ──
                  Toon alle berichten in dezelfde conversatie. De huidige is
                  gehighlight, klik op een ander bericht om dat te openen. */}
              {threadEmails && threadEmails.length > 1 && (
                <div className="mb-6 rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#F0EFEC] bg-[#FAFAF8]">
                    <span className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider">
                      Gesprek · {threadEmails.length} berichten
                    </span>
                  </div>
                  <div className="divide-y divide-[#F0EFEC]">
                    {threadEmails.map((tEmail) => {
                      const isCurrent = tEmail.id === email.id
                      const senderShort = extractSenderName(tEmail.van)
                      return (
                        <button
                          key={tEmail.id}
                          type="button"
                          onClick={() => {
                            if (!isCurrent && onSelectEmail) onSelectEmail(tEmail)
                          }}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                            isCurrent
                              ? 'bg-[#1A535C]/[0.06]'
                              : 'hover:bg-[#F8F7F5] cursor-pointer',
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCurrent ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#1A535C]" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#D4D2CE]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-[13px] truncate',
                                isCurrent ? 'font-semibold text-[#1A1A1A]' : 'text-[#3A3A36]',
                              )}>
                                {senderShort}
                              </span>
                              <span className="text-[11px] text-[#9B9B95] tabular-nums flex-shrink-0">
                                {formatShortDate(tEmail.datum)}
                              </span>
                            </div>
                            {!isCurrent && tEmail.body_text && (
                              <p className="text-[12px] text-[#9B9B95] truncate mt-0.5">
                                {tEmail.body_text.replace(/\s+/g, ' ').slice(0, 120)}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Summary block ── */}
              {(summary || summaryLoading) && (
                <div className="mb-6 rounded-xl overflow-hidden bg-[#F8F7F5]">
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
                  <div className="h-4 bg-[#F0EFEC] rounded w-full animate-pulse" />
                  <div className="h-4 bg-[#F0EFEC] rounded w-[90%] animate-pulse" />
                  <div className="h-4 bg-[#F0EFEC] rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-[#F0EFEC] rounded w-[85%] animate-pulse" />
                </div>
              ) : (
                <div ref={emailBodyRef}>
                  <div
                    className="text-left text-[14px] leading-[1.75] text-[#4A4A46]
                      [&>*:first-child]:!mt-0
                      [&_body]:!m-0 [&_body]:!p-0
                      [&_table]:!ml-0 [&_table]:max-w-full
                      [&_div]:!ml-0
                      [&_p]:!ml-0 [&_p]:mb-2
                      [&_img]:max-w-full [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-3
                      [&_a]:text-[#1A535C] [&_a]:no-underline [&_a]:hover:underline [&_a]:underline-offset-2 [&_a]:transition-colors
                      [&_blockquote]:border-l-2 [&_blockquote]:border-[#EBEBEB] [&_blockquote]:pl-4 [&_blockquote]:text-[14px] [&_blockquote]:text-[#9B9B95] [&_blockquote]:my-3
                      [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:!ml-0
                      [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:!ml-0
                      [&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:!ml-0
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:!ml-0
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:!ml-0
                      [&_li]:mb-0.5
                      [&_.email-sig-dim]:text-[#9B9B95] [&_.email-sig-dim]:text-[13px]"
                    dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                  />
                  <EmailReaderAIToolbar containerRef={emailBodyRef} />
                </div>
              )}

              {/* Attachments — echte file cards op basis van attachment_meta */}
              {email.attachment_meta && email.attachment_meta.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#F0EFEC]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-[#9B9B95]">
                      {email.attachment_meta.length} bijlage{email.attachment_meta.length > 1 ? 'n' : ''}
                    </span>
                    {email.attachment_meta.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllAttachments}
                        disabled={downloadingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#6B6B66] hover:text-[#4A4A46] hover:bg-[#F0EFEC] disabled:opacity-60 disabled:cursor-wait transition-colors duration-150"
                        title="Alle bijlagen downloaden"
                      >
                        {downloadingAll ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Alles downloaden
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {email.attachment_meta.map((att, i) => {
                      const visual = getAttachmentVisual(att.filename, att.contentType)
                      const isDownloading = downloadingAttachment === att.filename
                      const isPreviewing = previewLoading === att.filename
                      return (
                        <div
                          key={`${att.filename}-${i}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handlePreviewAttachment(att)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handlePreviewAttachment(att)
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#F8F7F5] hover:bg-[#F0EFEC] transition-colors duration-150 cursor-pointer group/att text-left max-w-[280px]',
                            (isDownloading || isPreviewing) && 'opacity-60 cursor-wait',
                          )}
                          title={`Preview ${att.filename}`}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0',
                            visual.bg,
                          )}>
                            {visual.label}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[13px] text-[#6B6B66] group-hover/att:text-[#4A4A46] transition-colors duration-150 block truncate">
                              {att.filename}
                            </span>
                            <span className="text-[11px] text-[#9B9B95]">{formatFileSize(att.size)}</span>
                          </div>
                          {isPreviewing || isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 text-[#1A535C]/60 animate-spin ml-1 flex-shrink-0" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadAttachment(att.filename)
                              }}
                              className="ml-1 p-1 rounded hover:bg-[#E8E7E4] flex-shrink-0"
                              title={`Download ${att.filename}`}
                              aria-label={`Download ${att.filename}`}
                            >
                              <Download className="h-3.5 w-3.5 text-[#B0ADA8] group-hover/att:text-[#6B6B66] transition-colors duration-150" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Fallback: count > 0 maar geen metadata (oude emails of nog niet opgehaald) */}
              {(!email.attachment_meta || email.attachment_meta.length === 0) && email.bijlagen > 0 && (
                <div className="mt-6 pt-5 border-t border-[#F0EFEC]">
                  <p className="text-[12px] text-[#9B9B95]">
                    Deze e-mail heeft {email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''} — open de e-mail opnieuw om de details te laden.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {previewAtt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={closePreview}
          >
            <div
              className="relative max-w-[92vw] max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#F0EFEC]">
                <p className="text-[14px] font-medium text-[#4A4A46] truncate min-w-0">
                  {previewAtt.filename}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAtt.filename)}
                    className="p-2 rounded-lg hover:bg-[#F0EFEC] transition-colors"
                    title="Downloaden"
                    aria-label="Downloaden"
                  >
                    <Download className="h-4 w-4 text-[#6B6B66]" />
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 rounded-lg hover:bg-[#F0EFEC] transition-colors"
                    title="Sluiten"
                    aria-label="Sluiten"
                  >
                    <X className="h-4 w-4 text-[#6B6B66]" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[#F8F7F5] flex items-center justify-center min-w-[320px] min-h-[320px]">
                {previewAtt.contentType.startsWith('image/') ? (
                  <img
                    src={previewAtt.url}
                    alt={previewAtt.filename}
                    className="max-w-full max-h-[82vh] object-contain"
                  />
                ) : previewAtt.contentType.includes('pdf') ? (
                  <iframe
                    src={previewAtt.url}
                    title={previewAtt.filename}
                    className="w-[82vw] h-[82vh] border-0 bg-white"
                  />
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-[14px] text-[#6B6B66] mb-4">
                      Geen preview beschikbaar voor dit bestandstype.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(previewAtt.filename)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A535C] text-white text-[13px] hover:bg-[#16454D] transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download bestand
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

