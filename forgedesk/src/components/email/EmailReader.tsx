import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { sanitizeEmailHTML } from '@/lib/sanitize'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
import {
  ArrowLeft, Trash2, Pin, Archive, MailOpen,
  ChevronUp, ChevronDown, Reply, ReplyAll, Forward,
  Paperclip, Send, Bold, Italic, Underline,
  List, ListOrdered, Sparkles, ScrollText, Loader2, Download, FolderPlus,
  Undo2, Redo2, X, Clock, Tag, MoreHorizontal,
} from 'lucide-react'
import { EmailActionsPopover } from './EmailActionsPopover'
import { cn } from '@/lib/utils'
import type { Email, EmailAttachment } from '@/types'
import { extractSenderName, extractSenderEmail, cleanEmailPreview, ontvangerLabel, formatShortDate, getAvatarColor, getAvatarRingColor, getAvatarStyle, lijktOpHtml, platteTekstNaarHtml, SNOOZE_OPTIONS, labelColors } from './emailHelpers'
import { hapticLight, hapticMedium } from '@/utils/haptic'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useVisueleViewport } from '@/hooks/useVisueleViewport'
import { callForgie } from '@/services/forgieService'
import { downloadEmailAttachment, downloadAllEmailAttachments } from '@/services/gmailService'
import { bijlageNaarProject } from '@/services/documentenService'
import { createProjectFoto } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { BijlageProjectDialog, type BijlageProjectKeuze, type BijlageKandidaat, type BijlageMetBestemming } from './BijlageProjectDialog'
import { valideerBijlagen, uploadBijlagenMetLinkFallback } from '@/utils/groteBijlagen'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { sendInBackground } from '@/utils/sendInBackground'
import { EmailReaderAIToolbar } from './EmailReaderAIToolbar'
import { AanvraagKaart } from './AanvraagKaart'
import { handtekeningAfbeeldingHtml, handtekeningNaarHtml } from '@/utils/handtekening'
import { LinkInvoegKnop } from '@/components/shared/LinkInvoegKnop'
import { VerzondenToast } from '@/components/shared/VerzondenToast'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmailList(value: string): boolean {
  if (!value.trim()) return false
  return value.split(/[,;\s]+/).filter(Boolean).every(e => EMAIL_REGEX.test(e.trim()))
}

// Format file size human-readable
function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageAttachment(filename: string, contentType?: string): boolean {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  return (
    (contentType || '').toLowerCase().startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext)
  )
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
  // Eigen adres van de gebruiker · blijft weg uit de cc bij allen beantwoorden.
  eigenAdres?: string
  // Optionele inline image-bytes (base64) per filename, vooraf opgehaald
  // door /api/read-email. Wanneer aanwezig slaat de reader de tweede
  // IMAP-roundtrip over voor thumbnails.
  prefetchedAttachmentBytes?: Record<string, string>
  // Optionele signed Storage URLs per filename, uit de persistent
  // attachment-cache (sprint 3). Snelste pad: direct als img src,
  // geen decode-stap nodig.
  prefetchedAttachmentUrls?: Record<string, string>
  onTogglePin?: (email: Email) => void
  onSnooze?: (email: Email, hours: number) => void
  onUnsnooze?: (email: Email) => void
  onToggleLabel?: (email: Email, label: string) => void
  onToggleRead?: (email: Email) => void
  onDelete?: (email: Email) => void
  onArchive?: (email: Email) => void
  onBack?: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onSendReply?: (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; storagePath?: string; content?: string; encoding?: 'base64'; size?: number }> }) => void
  onSelectEmail?: (email: Email) => void
  onOpenContextPanel?: (panel: 'klant' | 'project' | 'taak' | 'koppel') => void
}

// De context die Daan krijgt om een antwoord te schrijven.
//
// Hier stond `.slice(0, 500)`. Een aanvraag van een paar alinea's werd daardoor
// halverwege afgekapt, en juist het staartje bevat meestal wat er is
// meegestuurd en waar de klant advies over vraagt. Daan vroeg vervolgens om het
// vectorbestand en de foto die al in de mail zaten. Een mailtekst is klein
// vergeleken met wat het model aankan, dus de grens ligt nu ruim genoeg om een
// normale zakelijke mail heel te laten.
const MAX_CONTEXT_TEKENS = 12000

function alsPlatteTekst(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function bouwAntwoordContext(email: Email): string {
  // body_text is de platte versie die de mailserver zelf meestuurt; die is
  // betrouwbaarder dan tags uit de HTML slopen.
  const ruw = email.body_text?.trim() || alsPlatteTekst(email.inhoud || '')
  const tekst = ruw.length > MAX_CONTEXT_TEKENS
    ? ruw.slice(0, MAX_CONTEXT_TEKENS) + '\n\n[hier is de mail afgekapt]'
    : ruw

  // Inline beeld uit handtekeningen overslaan: dat zijn logo's, geen bijlagen
  // waar de klant iets mee bedoelt.
  const bijlagen = (email.attachment_meta ?? [])
    .filter((b) => !b.isInlineCid)
    .map((b) => b.filename)

  const regels = [
    `Afzender: ${extractSenderName(email.van)}`,
    `Onderwerp: ${email.onderwerp}`,
    bijlagen.length > 0
      ? `Meegestuurde bijlagen: ${bijlagen.join(', ')}`
      : 'Meegestuurde bijlagen: geen',
    '',
    tekst,
  ]
  return regels.join('\n')
}

export function EmailReader({
  email,
  threadEmails,
  isLoadingBody,
  emailIndex,
  emailTotal,
  allEmails,
  imapFolder = 'INBOX',
  eigenAdres,
  prefetchedAttachmentBytes,
  prefetchedAttachmentUrls,
  onTogglePin,
  onSnooze,
  onUnsnooze,
  onToggleLabel,
  onToggleRead,
  onDelete,
  onArchive,
  onBack,
  onNavigate,
  onSendReply,
  onSelectEmail,
  onOpenContextPanel,
}: EmailReaderProps) {
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, bedrijfsnaam } = useAppSettings()
  const { user } = useAuth()

  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [replyTo, setReplyTo] = useState('')
  const [replyCc, setReplyCc] = useState('')
  const [replyBcc, setReplyBcc] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showQuotedText, setShowQuotedText] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forgieLoading, setForgieLoading] = useState(false)
  const [replyAiOpen, setReplyAiOpen] = useState(false)
  const [replyBriefOpen, setReplyBriefOpen] = useState(false)
  const [replyBrief, setReplyBrief] = useState('')
  const [replyAttachments, setReplyAttachments] = useState<File[]>([])

  // Een verstuurd antwoord schuift meteen onderin de gespreksdraad · dat is de
  // bevestiging. De echte rij komt pas bij de volgende sync binnen, dus tot die
  // tijd staat hij hier. Zodra de draad groeit ruimen we 'm op, anders zie je
  // je antwoord twee keer.
  const [zojuistVerzonden, setZojuistVerzonden] = useState<{ tekst: string; datum: string } | null>(null)
  const draadLengteBijVerzendenRef = useRef(0)
  const huidigeEmailIdRef = useRef(email?.id)
  huidigeEmailIdRef.current = email?.id
  useEffect(() => { setZojuistVerzonden(null) }, [email?.id])
  useEffect(() => {
    if (!zojuistVerzonden) return
    if ((threadEmails?.length ?? 0) > draadLengteBijVerzendenRef.current) setZojuistVerzonden(null)
  }, [threadEmails?.length, zojuistVerzonden])

  // Blob-URLs voor image-thumbnails op user-uploaded reply-bijlagen
  const replyImagePreviewUrls = useMemo(() => {
    const map = new Map<File, string>()
    replyAttachments.forEach((file) => {
      if (file.type.startsWith('image/')) {
        map.set(file, URL.createObjectURL(file))
      }
    })
    return map
  }, [replyAttachments])
  useEffect(() => {
    return () => {
      replyImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [replyImagePreviewUrls])
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

  // Antwoorden op mobiel is een eigen schermvullend venster, niet een blok
  // onderaan de lezer. iOS verschuift bij het openen van het toetsenbord de
  // visual viewport omhoog; alles wat op de normale flow meelift (kop,
  // verzendknop) schoof daardoor achter het toetsenbord. Door het venster
  // exact op de gemeten viewport te zetten blijven kop en balk in beeld.
  const isMobiel = useMediaQuery('(max-width: 767px)')
  const venster = useVisueleViewport(isMobiel && !!replyMode)

  // Het formulier verhuist tussen het mobiele venster en de inline-versie zodra
  // de breedte de md-grens passeert (toestel draaien). De editor hermount dan,
  // dus houden we een spiegel van de HTML bij en zetten die terug. Volgorde is
  // hier het punt: dit effect moet vóór de observer staan, anders overschrijft
  // die de spiegel met de lege verse editor.
  const editorHtmlRef = useRef('')
  const vorigMobielRef = useRef(isMobiel)
  useEffect(() => {
    if (vorigMobielRef.current === isMobiel) return
    vorigMobielRef.current = isMobiel
    if (!replyMode || !editorRef.current || !editorHtmlRef.current) return
    editorRef.current.innerHTML = editorHtmlRef.current
  }, [isMobiel, replyMode])

  useEffect(() => {
    const el = editorRef.current
    if (!el || !replyMode) return
    editorHtmlRef.current = el.innerHTML
    const observer = new MutationObserver(() => { editorHtmlRef.current = el.innerHTML })
    observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true })
    return () => observer.disconnect()
  }, [replyMode, isMobiel])

  // Summary state
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  // Build signature HTML
  const signatureHtml = useMemo(() => {
    const parts: string[] = []
    if (emailHandtekening) {
      parts.push(handtekeningNaarHtml(emailHandtekening))
    }
    const imgHtml = handtekeningAfbeeldingHtml({
      url: handtekeningAfbeelding,
      link: handtekeningAfbeeldingLink,
      breedte: handtekeningAfbeeldingGrootte,
    })
    if (imgHtml) {
      parts.push(imgHtml)
    }
    if (!parts.length && bedrijfsnaam) {
      parts.push(bedrijfsnaam)
    }
    return parts.length ? `<br><br>${parts.join('<br>')}` : ''
  }, [emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, bedrijfsnaam])

  // Track per-attachment download state (alleen visueel · losse spinner per bijlage)
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false)
  const snoozeMenuRef = useRef<HTMLDivElement | null>(null)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const labelMenuRef = useRef<HTMLDivElement | null>(null)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  // Mobiel houdt de balk bij lezen en antwoorden; snooze, labels, leesstatus
  // en de AI-knoppen zitten hierachter. Op desktop staan ze gewoon uitgeklapt.
  const [mobielMenuOpen, setMobielMenuOpen] = useState(false)
  const mobielMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mobielMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!mobielMenuRef.current?.contains(e.target as Node)) setMobielMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [mobielMenuOpen])

  // Sluit het snooze-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!snoozeMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!snoozeMenuRef.current?.contains(e.target as Node)) setSnoozeMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [snoozeMenuOpen])

  // Sluit het label-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!labelMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!labelMenuRef.current?.contains(e.target as Node)) setLabelMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [labelMenuOpen])

  // Sluit het acties-menu bij klik buiten het popover-bereik
  useEffect(() => {
    if (!actionsMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(e.target as Node)) setActionsMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [actionsMenuOpen])
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [previewAtt, setPreviewAtt] = useState<{ filename: string; url: string; contentType: string } | null>(null)
  // Cache van blob-URLs voor image-thumbnails per filename. Wordt gevuld bij open van email
  // voor alle image-bijlagen, en wordt gerevoked bij email-switch / unmount.
  const [attachmentThumbnails, setAttachmentThumbnails] = useState<Record<string, string>>({})
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)

  // ─── Auto-fetch image-thumbnails voor ontvangen bijlagen ───
  // Snelste pad: prefetchedAttachmentBytes uit /api/read-email (server stuurde
  // image-bytes < 5 MB al inline mee). Anders: bulk-call naar
  // /api/email-attachment met all=true die de hele mail één keer parsed.
  useEffect(() => {
    if (!email?.attachment_meta?.length) {
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
      return
    }
    // Inline-CID beeld wordt niet als bijlage getoond; thumbnails ervoor
    // ophalen kost een volledige IMAP-roundtrip zonder dat er iets rendert.
    const imageAtts = email.attachment_meta.filter(
      (a) => !a.isInlineCid && isImageAttachment(a.filename, a.contentType),
    )
    if (!imageAtts.length) {
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
      return
    }

    let cancelled = false
    const createdUrls: string[] = []

    const decodeToBlobUrl = (base64: string, contentType: string): string | null => {
      try {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: contentType || 'image/jpeg' })
        return URL.createObjectURL(blob)
      } catch {
        return null
      }
    }

    // Pad 0: signed Storage URLs uit de persistent cache (sprint 3). Snelst
    // van allemaal · direct als <img src>, geen decode-stap. URL.revokeObjectURL
    // is een no-op voor https-URLs dus we hoeven hier niets te cleanen.
    const initial: Record<string, string> = {}
    if (prefetchedAttachmentUrls) {
      for (const att of imageAtts) {
        const url = prefetchedAttachmentUrls[att.filename]
        if (url) initial[att.filename] = url
      }
    }

    // Pad A: bytes zijn al binnen via read-email. Decoderen is sync en snel —
    // toon thumbnails direct, zonder roundtrip B.
    if (prefetchedAttachmentBytes && Object.keys(prefetchedAttachmentBytes).length > 0) {
      for (const att of imageAtts) {
        if (initial[att.filename]) continue
        const b64 = prefetchedAttachmentBytes[att.filename]
        if (!b64) continue
        const url = decodeToBlobUrl(b64, att.contentType)
        if (url) {
          createdUrls.push(url)
          initial[att.filename] = url
        }
      }
    }

    if (Object.keys(initial).length > 0) {
      setAttachmentThumbnails(initial)
      setThumbnailsLoading(false)
      // Als pad 0 + A samen alle images dekken: klaar. Anders verder naar
      // bulk-fetch B voor het verschil.
      if (Object.keys(initial).length === imageAtts.length) {
        return () => {
          cancelled = true
          createdUrls.forEach((url) => URL.revokeObjectURL(url))
          setAttachmentThumbnails({})
        }
      }
    }

    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      setThumbnailsLoading(false)
      return () => {
        cancelled = true
        createdUrls.forEach((url) => URL.revokeObjectURL(url))
        setAttachmentThumbnails({})
      }
    }

    // Pad B: bulk-fetch fallback voor wanneer prefetch niet beschikbaar is
    // (cached body, of images > 5 MB die de server niet inline meestuurt).
    setThumbnailsLoading(true)
    const fetchThumbs = async () => {
      try {
        const results = await downloadAllEmailAttachments(uid, imapFolder)
        if (cancelled) return
        const next: Record<string, string> = { ...initial }
        for (const result of results) {
          if (!isImageAttachment(result.filename, result.contentType)) continue
          if (next[result.filename]) continue
          if (result.storage_url) {
            next[result.filename] = result.storage_url
          } else if (result.content) {
            const url = decodeToBlobUrl(result.content, result.contentType || 'image/jpeg')
            if (url) {
              createdUrls.push(url)
              next[result.filename] = url
            }
          }
        }
        if (!cancelled) setAttachmentThumbnails(next)
      } catch (err) {
        logger.warn('Bulk-thumbnail fetch mislukt:', err)
      } finally {
        if (!cancelled) setThumbnailsLoading(false)
      }
    }
    fetchThumbs()

    return () => {
      cancelled = true
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
      setAttachmentThumbnails({})
      setThumbnailsLoading(false)
    }
    // attachmentThumbnails opzettelijk weggelaten · de effect lifecycle hoort
    // aan de email/meta gekoppeld te zijn, niet aan tussentijdse updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id, email?.attachment_meta?.length, imapFolder, prefetchedAttachmentBytes, prefetchedAttachmentUrls])

  // ─── Draft persistence ───
  const draftKey = email ? `email-draft-${email.id}` : null

  const saveDraft = useCallback(() => {
    if (!draftKey || !editorRef.current || !replyMode) return
    const content = editorRef.current.innerHTML
    if (!content || content === `<br>${signatureHtml}` || content === '<br>') return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        mode: replyMode,
        to: replyTo,
        cc: replyCc,
        bcc: replyBcc,
        subject: replySubject,
        html: content,
      }))
    } catch { /* sessionStorage vol · negeer */ }
  }, [draftKey, replyMode, replyTo, replyCc, replyBcc, replySubject, signatureHtml])

  const clearDraft = useCallback(() => {
    if (draftKey) sessionStorage.removeItem(draftKey)
  }, [draftKey])

  const loadDraft = useCallback((emailId: string): { mode: 'reply' | 'reply-all' | 'forward'; to: string; cc: string; bcc: string; subject: string; html: string } | null => {
    try {
      const raw = sessionStorage.getItem(`email-draft-${emailId}`)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])

  // Sla draft op wanneer de gebruiker wegnavigeet (replyMode sluit)
  const prevReplyModeRef = useRef(replyMode)
  useEffect(() => {
    if (prevReplyModeRef.current && !replyMode) {
      saveDraft()
    }
    prevReplyModeRef.current = replyMode
  }, [replyMode, saveDraft])

  // Reset reply state and summary when email changes
  useEffect(() => {
    // Sla eventueel lopend concept op voordat we wisselen
    if (prevReplyModeRef.current && editorRef.current) {
      saveDraft()
    }
    setReplyMode(null)
    setShowQuotedText(false)
    setSummary(null)
    setSummaryLoading(false)
    setSummaryExpanded(true)
    setSnoozeMenuOpen(false)
    setLabelMenuOpen(false)
    setPreviewAtt((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [email?.id])

  // Bijlage als bestand onder een project zetten. De keuze van het project en
  // de map loopt via BijlageProjectDialog; hier gebeurt alleen het ophalen en
  // wegschrijven. Zelfde ophaalroute als downloaden (signed URL bij cache-hit,
  // anders base64), maar de blob gaat naar de documenten-bucket.
  const [koppelendeBijlage, setKoppelendeBijlage] = useState<string | null>(null)
  const [bijlagenVoorDialog, setBijlagenVoorDialog] = useState<BijlageKandidaat[]>([])
  const [koppelVoortgang, setKoppelVoortgang] = useState<string | null>(null)
  const handleBijlageNaarProject = useCallback((filename: string, contentType: string) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen · geen geldig email-id')
      return
    }
    setBijlagenVoorDialog([{ filename, contentType, previewUrl: attachmentThumbnails[filename] }])
  }, [email, attachmentThumbnails])

  // Alle bijlagen in één keer. De dialog toont ze als aangevinkte lijst, zodat
  // je er nog iets uit kunt halen voordat het naar het project gaat.
  const handleAlleBijlagenNaarProject = useCallback((bijlagen: BijlageKandidaat[]) => {
    if (!email || bijlagen.length === 0) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlagen niet ophalen · geen geldig email-id')
      return
    }
    setBijlagenVoorDialog(bijlagen.map((b) => ({ ...b, previewUrl: attachmentThumbnails[b.filename] })))
  }, [email, attachmentThumbnails])

  // Eén bijlage ophalen en onder het project zetten. Waar hij landt bepaalt de
  // gebruiker in de dialog; het bestandstype gaf daar alleen de eerste gok voor.
  const voegBijlageToe = useCallback(async (
    bijlage: BijlageMetBestemming,
    keuze: BijlageProjectKeuze,
    uid: number,
  ) => {
    const { filename, contentType } = bijlage
    const result = await downloadEmailAttachment(uid, imapFolder, filename)
    let blob: Blob
    if (result.storage_url) {
      const resp = await fetch(result.storage_url)
      if (!resp.ok) throw new Error(`Bijlage ophalen mislukt (${resp.status})`)
      blob = await resp.blob()
    } else if (result.content) {
      const binary = atob(result.content)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      blob = new Blob([bytes], { type: result.contentType || contentType })
    } else {
      throw new Error('Geen content of storage_url ontvangen')
    }

    if (bijlage.bestemming === 'foto') {
      if (!user?.id) throw new Error('Niet ingelogd')
      const echteNaam = result.filename || filename
      const file = new File([blob], echteNaam, { type: result.contentType || contentType })
      await createProjectFoto(
        { user_id: user.id, project_id: keuze.project.id, omschrijving: echteNaam, type: 'situatie' },
        file,
      )
      return 'foto' as const
    }

    await bijlageNaarProject({
      projectId: keuze.project.id,
      klantId: keuze.project.klant_id,
      bestandsnaam: result.filename || filename,
      contentType: result.contentType || contentType,
      // Geen mapkeuze meer: het projectscherm toont die map nergens, dus de
      // service houdt het bij zijn standaard 'Bijlagen'.
      data: blob,
    })
    return 'document' as const
  }, [imapFolder, user?.id])

  const handleBijlageBevestig = useCallback(async (keuze: BijlageProjectKeuze) => {
    if (!email || keuze.bestanden.length === 0) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen · geen geldig email-id')
      return
    }

    const totaal = keuze.bestanden.length
    // Eén voor één: de bijlagen komen van een IMAP-server en parallel ophalen
    // levert daar in de praktijk vaker een time-out op dan tijdwinst.
    const gelukt: string[] = []
    const mislukt: string[] = []
    for (const [index, bijlage] of keuze.bestanden.entries()) {
      setKoppelendeBijlage(bijlage.filename)
      setKoppelVoortgang(totaal > 1 ? `${index + 1} van ${totaal}` : null)
      try {
        await voegBijlageToe(bijlage, keuze, uid)
        gelukt.push(bijlage.filename)
      } catch (err) {
        logger.error('Bijlage aan project koppelen mislukt:', err)
        mislukt.push(bijlage.filename)
      }
    }
    setKoppelendeBijlage(null)
    setKoppelVoortgang(null)

    // Alleen sluiten als alles gelukt is: bij een gedeeltelijke mislukking blijft
    // de dialog staan met de selectie erin, zodat je het opnieuw kunt proberen
    // zonder alles opnieuw aan te vinken.
    if (mislukt.length === 0) {
      setBijlagenVoorDialog([])
      toast.success('Toegevoegd aan project', {
        description: totaal === 1
          ? `${gelukt[0]} staat nu bij ${keuze.project.naam}.`
          : `${totaal} bijlagen staan nu bij ${keuze.project.naam}.`,
      })
      return
    }

    if (gelukt.length === 0) {
      toast.error(totaal === 1 ? 'Toevoegen aan project mislukt' : 'Geen van de bijlagen kon worden toegevoegd')
      return
    }
    toast.warning(`${gelukt.length} van ${totaal} toegevoegd`, {
      description: `Niet gelukt: ${mislukt.join(', ')}`,
    })
  }, [email, voegBijlageToe])

  const handleDownloadAttachment = useCallback(async (filename: string) => {
    if (!email) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlage niet ophalen · geen geldig email-id')
      return
    }
    setDownloadingAttachment(filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, filename)
      const a = document.createElement('a')
      a.download = result.filename || filename
      if (result.storage_url) {
        // Cache-hit: signed URL direct gebruiken, geen base64-decode
        a.href = result.storage_url
      } else if (result.content) {
        const binary = atob(result.content)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
        a.href = URL.createObjectURL(blob)
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      } else {
        throw new Error('Geen content of storage_url ontvangen')
      }
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
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
      toast.error('Kan deze bijlage niet ophalen · geen geldig email-id')
      return
    }
    setPreviewLoading(att.filename)
    try {
      const result = await downloadEmailAttachment(uid, imapFolder, att.filename)
      const contentType = result.contentType || att.contentType || 'application/octet-stream'
      let url: string
      if (result.storage_url) {
        url = result.storage_url
      } else if (result.content) {
        const binary = atob(result.content)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: contentType })
        url = URL.createObjectURL(blob)
      } else {
        throw new Error('Geen content of storage_url ontvangen')
      }
      setPreviewAtt((prev) => {
        if (prev && prev.url.startsWith('blob:')) URL.revokeObjectURL(prev.url)
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
    // De server geeft ook inline-CID beeld terug; downloaden wat de reader
    // niet toont geeft onverwachte bestanden en een tellerstand die niet
    // klopt met de kop erboven.
    const echteBijlagen = email.attachment_meta.filter((a) => !a.isInlineCid)
    if (!echteBijlagen.length) return
    const uid = Number(email.gmail_id || email.id)
    if (Number.isNaN(uid)) {
      toast.error('Kan deze bijlagen niet ophalen · geen geldig email-id')
      return
    }
    setDownloadingAll(true)
    let success = 0
    try {
      const gevraagd = new Set(echteBijlagen.map((a) => a.filename))
      const results = (await downloadAllEmailAttachments(uid, imapFolder))
        .filter((r) => gevraagd.has(r.filename))
      const expected = echteBijlagen.length
      for (const result of results) {
        try {
          const binary = atob(result.content)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: result.contentType || 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          success++
          // Korte pauze zodat de browser elke download apart kan verwerken
          await new Promise((r) => setTimeout(r, 200))
        } catch (err) {
          logger.error(`Download-decode mislukt voor ${result.filename}:`, err)
        }
      }
      if (success === expected) {
        toast.success(`${success} bijlage${success > 1 ? 'n' : ''} gedownload`)
      } else {
        toast.warning(`${success}/${expected} bijlagen gedownload`)
      }
    } catch (err) {
      logger.error('Bulk-download mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Bijlagen downloaden mislukt')
    } finally {
      setDownloadingAll(false)
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

  // Allen beantwoorden houdt iedereen uit Aan en Cc in het gesprek. De
  // afzender valt af (die staat al in het aan-veld) en je eigen adres ook,
  // anders mail je jezelf bij elk antwoord.
  const bouwAllenCc = useCallback((mail: Email): string => {
    const gezien = new Set(
      [extractSenderEmail(mail.van), eigenAdres]
        .filter((a): a is string => !!a)
        .map((a) => a.trim().toLowerCase()),
    )
    const adressen: string[] = []
    for (const ontvanger of [...(mail.to_addresses || []), ...(mail.cc_addresses || [])]) {
      const adres = (ontvanger?.email || '').trim()
      if (!adres) continue
      const sleutel = adres.toLowerCase()
      if (gezien.has(sleutel)) continue
      gezien.add(sleutel)
      adressen.push(adres)
    }
    return adressen.join(', ')
  }, [eigenAdres])

  const handleReply = useCallback((mode: 'reply' | 'reply-all' | 'forward') => {
    if (!email) return

    // Check of er een opgeslagen concept is voor deze email
    const draft = loadDraft(email.id)
    const hasDraft = draft && draft.mode === mode

    setReplyAttachments([])
    setShowCcBcc(false)

    if (hasDraft) {
      setReplyTo(draft.to)
      setReplyCc(draft.cc)
      setReplyBcc(draft.bcc)
      setReplySubject(draft.subject)
      if (draft.cc || draft.bcc) setShowCcBcc(true)
    } else {
      setReplyCc('')
      setReplyBcc('')
      const subjectPrefix = mode === 'forward' ? 'Fwd: ' : 'Re: '
      setReplySubject(email.onderwerp.startsWith(subjectPrefix) ? email.onderwerp : `${subjectPrefix}${email.onderwerp}`)
      if (mode === 'forward') {
        setReplyTo('')
      } else {
        setReplyTo(extractSenderEmail(email.van))
      }
      if (mode === 'reply-all') {
        const cc = bouwAllenCc(email)
        setReplyCc(cc)
        if (cc) setShowCcBcc(true)
      }
    }

    if (mode === 'forward' && email.attachment_meta && email.attachment_meta.length > 0) {
      setForwardOriginalAttachments(email.attachment_meta)
    } else {
      setForwardOriginalAttachments([])
    }

    // flushSync zet het formulier in de DOM binnen dezelfde taak als de tik.
    // Met een setTimeout hierheen valt de focus() buiten het gebruikersgebaar
    // en weigert iOS het toetsenbord te openen — dan tik je Beantwoorden en
    // gebeurt er ogenschijnlijk niets.
    flushSync(() => setReplyMode(mode))

    if (editorRef.current) {
      editorRef.current.innerHTML = hasDraft ? draft.html : `<br>${signatureHtml}`
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(editorRef.current, 0)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
      editorRef.current.focus()
    }
    if (hasDraft) toast.info('Concept hersteld')
  }, [email, signatureHtml, loadDraft, bouwAllenCc])

  const buildReplyPayload = useCallback(async () => {
    if (!email || !editorRef.current) return null
    if (!replyTo.trim()) {
      toast.error('Vul een ontvanger in')
      return null
    }
    if (!isValidEmailList(replyTo)) {
      toast.error('Ongeldig emailadres in "Aan"')
      return null
    }
    if (replyCc && !isValidEmailList(replyCc)) {
      toast.error('Ongeldig emailadres in "CC"')
      return null
    }
    if (replyBcc && !isValidEmailList(replyBcc)) {
      toast.error('Ongeldig emailadres in "BCC"')
      return null
    }
    const html = editorRef.current.innerHTML
    const bodyText = editorRef.current.innerText
    if (!html.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Bericht is leeg')
      return null
    }
    const subject = replySubject || email.onderwerp
    // Strip base64 data URIs uit de geciteerde tekst zodat de JSON payload
    // binnen Vercel's 4.5MB limiet blijft. Inline images in het origineel
    // zijn niet nodig in het antwoord · de ontvanger heeft het origineel al.
    const inhoudZonderInlineImages = (email.inhoud || '').replace(
      /<img([^>]*)src="data:image\/[^"]*"([^>]*)>/gi,
      '<img$1src=""$2 alt="[afbeelding]" style="display:none">'
    )
    const quotedOriginal = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:0;color:#666;"><p>Op ${formatShortDate(email.datum)} schreef ${extractSenderName(email.van)}:</p>${inhoudZonderInlineImages}</div>`

    // Forward: haal originele bijlagen op uit IMAP (base64)
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
          toast.warning('Originele bijlagen niet ingesloten · verzend zonder')
        }
      }
    }

    // User uploads: via Supabase Storage; boven het 25MB-totaal automatisch
    // als downloadlink in de body (zelfde gedrag als nieuw bericht)
    let userAttachments: Array<{ filename: string; storagePath: string; size: number }> = []
    let linksHtml = ''
    let linksText = ''
    if (replyAttachments.length) {
      const fout = valideerBijlagen(replyAttachments)
      if (fout) {
        toast.error(fout, { duration: 8000 })
        return null
      }
      try {
        const payload = await uploadBijlagenMetLinkFallback(replyAttachments)
        userAttachments = payload.attachments ?? []
        linksHtml = payload.linksHtml
        linksText = payload.linksText
      } catch (err) {
        logger.error('Bijlage upload mislukt:', err)
        toast.error(err instanceof Error ? err.message : 'Bijlage uploaden mislukt')
        return null
      }
    }

    const attachmentPayload: Array<{ filename: string; storagePath?: string; content?: string; encoding?: 'base64'; size?: number }> = [
      ...originalAttachments,
      ...userAttachments,
    ]

    return {
      to: replyTo,
      cc: replyCc || undefined,
      bcc: replyBcc || undefined,
      subject,
      body: bodyText + linksText,
      html: html + linksHtml + quotedOriginal,
      attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
    }
  }, [email, replyMode, replySubject, replyTo, replyCc, replyBcc, replyAttachments, forwardOriginalAttachments, imapFolder])

  const handleSend = useCallback(async () => {
    if (!onSendReply) return
    setIsSending(true)
    const payload = await buildReplyPayload()
    if (!payload) {
      setIsSending(false)
      return
    }
    // Sluit het antwoordvenster direct; de mail gaat op de achtergrond weg.
    clearDraft()
    setReplyMode(null)
    setReplyAttachments([])
    setForwardOriginalAttachments([])
    setIsSending(false)

    const naar = ontvangerLabel(payload.to)
    const doelEmailId = email?.id
    draadLengteBijVerzendenRef.current = threadEmails?.length ?? 0
    // Sta je nog bij dezelfde mail, dan bevestigt de draad het zelf en houden
    // we de zwevende melding dicht. Ben je doorgeklikt, dan is die melding het
    // enige wat je nog vertelt dat hij weg is.
    const draadBevestigt = () => huidigeEmailIdRef.current === doelEmailId

    sendInBackground(
      async () => {
        await onSendReply(payload)
        if (draadBevestigt()) {
          setZojuistVerzonden({
            tekst: cleanEmailPreview(payload.body || '').slice(0, 160),
            datum: new Date().toISOString(),
          })
        }
      },
      {
        loading: 'Versturen',
        success: 'Email verzonden',
        successRender: () => (draadBevestigt() ? null : <VerzondenToast onder={naar} />),
      }
    )
  }, [onSendReply, buildReplyPayload, clearDraft, email?.id, threadEmails?.length])

  const handleScheduleSend = useCallback(async (scheduledAt: string, label: string) => {
    if (!onSendReply) return
    setIsSending(true)
    setShowScheduleMenu(false)
    const payload = await buildReplyPayload()
    if (!payload) {
      setIsSending(false)
      return
    }
    clearDraft()
    setReplyMode(null)
    setReplyAttachments([])
    setForwardOriginalAttachments([])
    setIsSending(false)

    sendInBackground(
      async () => { await onSendReply({ ...payload, scheduledAt }) },
      {
        loading: 'Inplannen',
        success: `Email ingepland: ${label}`,
        error: 'Inplannen mislukt',
        successRender: () => <VerzondenToast titel="Ingepland" onder={`Gaat weg ${label.toLowerCase()}`} />,
      }
    )
  }, [onSendReply, buildReplyPayload, clearDraft])

  const handleForgieWrite = useCallback(async () => {
    if (!email || !editorRef.current) return
    setForgieLoading(true)
    try {
      const context = bouwAntwoordContext(email)
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

  // Reply met eigen input: Daan schrijft een antwoord op basis van de brief van de gebruiker.
  const handleReplyFromBrief = useCallback(async () => {
    const brief = replyBrief.trim()
    if (!email || !brief || !editorRef.current) return
    setForgieLoading(true)
    try {
      const context = `Antwoord op deze e-mail van ${extractSenderName(email.van)} (${email.onderwerp}):\n${email.inhoud?.replace(/<[^>]*>/g, '').slice(0, 800)}`
      const response = await callForgie('write-email', brief, context)
      if (response?.result && editorRef.current) {
        editorRef.current.innerHTML = `${response.result.replace(/\n/g, '<br>')}${signatureHtml}`
      }
      setReplyBriefOpen(false)
      setReplyBrief('')
    } catch (err) {
      logger.error('Fout bij genereren antwoord (brief):', err)
      toast.error('Daan kon geen antwoord genereren')
    } finally {
      setForgieLoading(false)
    }
  }, [email, replyBrief, signatureHtml])

  // Generate reply from reader: opens reply mode first, then generates
  const handleGenerateReplyFromReader = useCallback(async () => {
    if (!email) return
    // First open reply mode
    handleReply('reply')
    // Wait for editor to mount, then generate
    setForgieLoading(true)
    try {
      const context = bouwAntwoordContext(email)
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

  // Memoize sender data · avoid recalculating on every render
  const senderName = useMemo(() => email ? extractSenderName(email.van) : '', [email?.van])
  const senderEmail = useMemo(() => email ? extractSenderEmail(email.van) : '', [email?.van])
  const avatarColor = useMemo(() => getAvatarColor(senderName), [senderName])
  const avatarRingColor = useMemo(() => getAvatarRingColor(senderName), [senderName])
  const avatarStyle = useMemo(() => getAvatarStyle(senderName), [senderName])

  // Terwijl de volledige mail binnenkomt tonen we de platte tekst die de lijst
  // al had. Dan lees je de eerste regels meteen in plaats van naar grijze
  // balken te kijken · dat scheelt geen milliseconde, maar wel het wachten.
  const voorproefje = useMemo(() => {
    const raw = email?.body_text || ''
    return raw ? cleanEmailPreview(raw).slice(0, 340) : ''
  }, [email?.body_text])

  const sanitizedBody = useMemo(() => {
    if (!email?.inhoud) return ''
    const ruw = lijktOpHtml(email.inhoud) ? email.inhoud : platteTekstNaarHtml(email.inhoud)
    let processed = sanitizeEmailHTML(ruw)
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
    return processed
  }, [email?.inhoud])

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/80 h-full">
        <p className="text-[14px]">Selecteer een email om te lezen</p>
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INLINE REPLY FORM · gerenderd boven de email body wanneer replyMode actief is.
  // Body blijft zichtbaar eronder; geen mode-switch meer (was: full-screen takeover).
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const inlineReplyForm = replyMode ? (
    <div className="bg-white dark:bg-card">
          {/* ─── Compose fields (iOS-style: hairlines, ruime padding, duidelijke labels) ─── */}
          <div className="bg-white dark:bg-card flex-shrink-0">
            {/* Aan field */}
            <div className="flex items-center px-5 md:px-7 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[12px] text-muted-foreground/80 flex-shrink-0 w-[80px] font-medium">Aan</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                  placeholder="ontvanger@voorbeeld.nl"
                />
              </div>
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="text-[12px] text-muted-foreground/80 hover:text-foreground ml-2 flex-shrink-0 transition-colors"
                >
                  Cc/Bcc
                </button>
              )}
              {/* Reply-mode segmented control · iOS-style pill */}
              <div className="hidden md:flex items-center ml-2.5 flex-shrink-0 bg-petrol/[0.06] dark:bg-white/[0.06] rounded-button p-[2px]">
                <button
                  onClick={() => {
                    setReplyMode('reply')
                    setReplyTo(extractSenderEmail(email.van))
                    setReplyCc('')
                  }}
                  className={cn(
                    'flex items-center justify-center w-6 h-5 rounded-[5px] transition-all duration-200',
                    replyMode === 'reply'
                      ? 'bg-card dark:bg-white/10 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Beantwoorden"
                >
                  <Reply className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('reply-all')
                    setReplyTo(extractSenderEmail(email.van))
                    const cc = bouwAllenCc(email)
                    setReplyCc(cc)
                    if (cc) setShowCcBcc(true)
                  }}
                  className={cn(
                    'flex items-center justify-center w-6 h-5 rounded-[5px] transition-all duration-200',
                    replyMode === 'reply-all'
                      ? 'bg-card dark:bg-white/10 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Allen beantwoorden"
                >
                  <ReplyAll className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    setReplyMode('forward')
                    setReplyTo('')
                    setReplyCc('')
                  }}
                  className={cn(
                    'flex items-center justify-center w-6 h-5 rounded-[5px] transition-all duration-200',
                    replyMode === 'forward'
                      ? 'bg-card dark:bg-white/10 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title="Doorsturen"
                >
                  <Forward className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* CC / BCC fields */}
            {showCcBcc && (
              <>
                <div className="flex items-center px-5 md:px-7 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-[12px] text-muted-foreground/80 flex-shrink-0 w-[80px] font-medium">Cc</span>
                  <input
                    type="text"
                    value={replyCc}
                    onChange={(e) => setReplyCc(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                    placeholder="cc@voorbeeld.nl"
                  />
                </div>
                <div className="flex items-center px-5 md:px-7 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-[12px] text-muted-foreground/80 flex-shrink-0 w-[80px] font-medium">Bcc</span>
                  <input
                    type="text"
                    value={replyBcc}
                    onChange={(e) => setReplyBcc(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                    placeholder="bcc@voorbeeld.nl"
                  />
                </div>
              </>
            )}

            {/* Subject */}
            <div className="flex items-center px-5 md:px-7 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[12px] text-muted-foreground/80 flex-shrink-0 w-[80px] font-medium">Onderwerp</span>
              <input
                type="text"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground min-w-0 placeholder:text-muted-foreground/80"
                placeholder="Onderwerp..."
              />
            </div>

            {/* AI suggestion · subtler text-link op zelfde aligning kolom */}
            <div className="flex items-center px-5 md:px-7 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[12px] text-muted-foreground/80 flex-shrink-0 w-[80px] font-medium">Daan</span>
              <div className="relative">
                <button
                  onClick={() => setReplyAiOpen(v => !v)}
                  disabled={forgieLoading}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150',
                    forgieLoading ? 'text-muted-foreground' : 'text-[#C0451A] hover:text-flame',
                  )}
                >
                  {forgieLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Beantwoord met AI
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {replyAiOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setReplyAiOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-[230px] bg-card rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-border z-50 py-1.5">
                      <button
                        onClick={() => { setReplyAiOpen(false); handleForgieWrite() }}
                        className="w-full text-left px-3.5 py-2.5 text-[13px] text-foreground hover:bg-petrol/[0.06] transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-flame" />
                        Uit context mail
                      </button>
                      <button
                        onClick={() => { setReplyAiOpen(false); setReplyBriefOpen(true) }}
                        className="w-full text-left px-3.5 py-2.5 text-[13px] text-foreground hover:bg-petrol/[0.06] transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Eigen input geven
                      </button>
                    </div>
                  </>
                )}
                {replyBriefOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setReplyBriefOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-[340px] max-w-[calc(100vw-2rem)] bg-card rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-border z-50 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-flame" />
                        <p className="text-[13px] font-semibold text-foreground">Wat wil je antwoorden?</p>
                      </div>
                      <textarea
                        value={replyBrief}
                        onChange={(e) => setReplyBrief(e.target.value)}
                        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleReplyFromBrief() }}
                        rows={3}
                        autoFocus
                        placeholder="Bijv. Bevestig de afspraak en vraag om het juiste leveradres."
                        className="w-full text-[13px] text-foreground bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-petrol resize-none"
                      />
                      <p className="text-[11px] text-muted-foreground">Daan schrijft in jouw tone of voice. <span className="text-muted-foreground/70">⌘↵ om te genereren</span></p>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setReplyBriefOpen(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg transition-colors">Annuleren</button>
                        <button onClick={handleReplyFromBrief} disabled={!replyBrief.trim() || forgieLoading} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-flame hover:bg-[#D9421C] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                          {forgieLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Genereer
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── Editor + toolbar ─── */}
          <div className="bg-white dark:bg-card">
            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[360px] md:min-h-[calc(100dvh-380px)] py-5 px-4 md:px-6 text-[15px] leading-[1.7] text-foreground outline-none [&_img]:max-w-[400px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 [&_a]:text-petrol dark:[&_a]:text-[#7FB5BF] [&_a]:underline [&_a]:underline-offset-2 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/80 empty:before:pointer-events-none"
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
              <div className="flex flex-wrap gap-2 px-4 md:px-5 py-2.5 border-t border-border bg-background">
                {/* Doorgestuurde originelen · met visual icon en "doorgestuurd" hint */}
                {forwardOriginalAttachments.map((att, i) => {
                  const visual = getAttachmentVisual(att.filename, att.contentType)
                  return (
                    <div
                      key={`fwd-${att.filename}-${i}`}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-white/[0.04] rounded-lg border border-petrol/20 dark:border-white/10 text-[12px] text-foreground/70"
                      title={`Doorgestuurd: ${att.filename}`}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0',
                        visual.bg,
                      )}>
                        {visual.label}
                      </div>
                      <span className="max-w-[180px] truncate">{att.filename}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatFileSize(att.size)}</span>
                      <button
                        onClick={() => setForwardOriginalAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-[#C0451A] transition-colors"
                        title="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
                {/* User uploaded files */}
                {replyAttachments.map((file, i) => {
                  const previewUrl = replyImagePreviewUrls.get(file)
                  return (
                    <div key={i} className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-white/[0.04] rounded-lg border border-border text-[12px] text-foreground/70">
                      {previewUrl ? (
                        <img src={previewUrl} alt={file.name} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{(file.size / 1024).toFixed(0)}KB</span>
                      <button
                        onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-[#C0451A] transition-colors"
                        title="Verwijderen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ─── Toolbar (sticky bottom · iOS-style frosted material) ─── */}
            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 md:gap-0 pl-3 pr-3 md:pl-5 md:pr-3 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-card/85 backdrop-blur-xl shadow-[0_-1px_0_rgba(0,0,0,0.02),0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
              {/* Op mobiel schuiven de opmaakknoppen zijwaarts weg in plaats van
                  naar een tweede regel: die regel viel achter het toetsenbord. */}
              <div className="flex items-center min-w-0 flex-1 md:flex-none overflow-x-auto scrollbar-hide md:overflow-visible">
                {/* mousedown-preventDefault: anders verliest WebKit de selectie
                    zodra de knop focus pakt en doet het commando niets. */}
                <div className="flex items-center gap-px mr-2 flex-shrink-0">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('undo')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Ongedaan maken"><Undo2 className="h-4 w-4" /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('redo')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Opnieuw"><Redo2 className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-petrol/10 mr-2 flex-shrink-0" />
                <div className="flex items-center gap-px flex-shrink-0">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Vet"><Bold className="h-4 w-4" /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Cursief"><Italic className="h-4 w-4" /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('underline')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Onderstrepen"><Underline className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-petrol/10 mx-1 flex-shrink-0" />
                <div className="flex items-center gap-px flex-shrink-0">
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Lijst"><List className="h-4 w-4" /></button>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Genummerde lijst"><ListOrdered className="h-4 w-4" /></button>
                </div>
                <div className="w-px h-5 bg-petrol/10 mx-1 flex-shrink-0" />
                <div className="flex items-center gap-px flex-shrink-0">
                  <LinkInvoegKnop editorRef={editorRef} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" />
                  <button onClick={() => replyFileInputRef.current?.click()} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150" title="Bijlage"><Paperclip className="h-4 w-4" /></button>
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

              {/* Weggooien en verzenden staan op mobiel in de kop van het
                  antwoordvenster · daar zijn ze altijd zichtbaar. */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 justify-end md:justify-start">
                <button
                  onClick={() => setReplyMode(null)}
                  className="hidden md:flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground/80 hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] transition-colors duration-150"
                  title="Annuleren"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="text-[10px] text-muted-foreground/80 hidden md:block">
                  {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
                </span>
                <div className="relative">
                  <button
                    className="h-10 w-10 md:h-9 md:w-9 flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.08] transition-colors duration-150 disabled:opacity-50"
                    onClick={() => setShowScheduleMenu(s => !s)}
                    disabled={isSending}
                    title="Inplannen"
                  >
                    <Clock className="h-[18px] w-[18px] md:h-4 md:w-4" />
                  </button>
                  {showScheduleMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setShowScheduleMenu(false); setShowCustomSchedule(false) }} />
                      <div className="absolute bottom-full right-0 mb-2 w-[220px] bg-white dark:bg-popover dark:border dark:border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-50 py-1.5 overflow-hidden">
                        <p className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Inplannen</p>
                        {[
                          { label: 'Over 1 uur', getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d } },
                          { label: 'Vanmiddag 14:00', getDate: () => { const d = new Date(); d.setHours(14, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d } },
                          { label: 'Morgen 9:00', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d } },
                          { label: 'Maandag 9:00', getDate: () => { const d = new Date(); const day = d.getDay(); const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day; d.setDate(d.getDate() + daysUntilMon); d.setHours(9, 0, 0, 0); return d } },
                        ].map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleScheduleSend(opt.getDate().toISOString(), opt.label)}
                            className="w-full px-3.5 py-2.5 text-left text-[13px] text-foreground hover:bg-petrol/[0.06] transition-colors duration-150 flex items-center justify-between"
                          >
                            <span>{opt.label}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {opt.getDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </button>
                        ))}
                        <div className="border-t border-border mt-1 pt-1">
                          {!showCustomSchedule ? (
                            <button
                              onClick={() => {
                                setShowCustomSchedule(true)
                                const tomorrow = new Date()
                                tomorrow.setDate(tomorrow.getDate() + 1)
                                setCustomScheduleDate(tomorrow.toISOString().split('T')[0])
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-[13px] text-petrol hover:bg-petrol/[0.06] transition-colors duration-150 flex items-center gap-2"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Kies datum en tijd...
                            </button>
                          ) : (
                            <div className="px-3.5 py-2.5 space-y-2">
                              <DatePicker
                                value={customScheduleDate}
                                onChange={v => setCustomScheduleDate(v)}
                                min={new Date().toISOString().split('T')[0]}
                                asInput
                                className="w-full font-mono"
                              />
                              <input
                                type="time"
                                value={customScheduleTime}
                                onChange={e => setCustomScheduleTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[13px] text-foreground bg-background rounded-lg border border-border outline-none focus:border-petrol transition-colors font-mono"
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
                                className="w-full py-1.5 rounded-lg bg-petrol text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
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
                  className="tap-press hidden md:flex h-9 px-6 rounded-[10px] text-[13px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 transition-all duration-150 items-center gap-2 disabled:opacity-50"
                  onClick={() => { hapticMedium(); handleSend() }}
                  disabled={isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'Verzenden...' : 'Verzenden'}
                </button>
              </div>
            </div>

          </div>
    </div>
  ) : null

  const antwoordTitel = replyMode === 'forward'
    ? 'Doorsturen'
    : replyMode === 'reply-all'
      ? 'Allen beantwoorden'
      : 'Beantwoorden'

  // Mobiel antwoordvenster · schermvullend bovenop de lezer, met de
  // verzendknop in de kop zodat het toetsenbord hem nooit kan afdekken.
  const mobielAntwoordVenster = isMobiel && replyMode ? (
    <div
      className="md:hidden fixed inset-x-0 z-50 flex flex-col bg-white dark:bg-card animate-in fade-in duration-150"
      style={{
        top: venster.top,
        height: venster.hoogte || '100dvh',
        paddingBottom: venster.toetsenbord > 60 ? 0 : 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center gap-1.5 pl-1 pr-2 h-14 flex-shrink-0 border-b border-black/[0.06] dark:border-white/[0.08] bg-card/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => { hapticLight(); setReplyMode(null) }}
          className="tap-press h-10 w-10 flex items-center justify-center rounded-full text-foreground/70 active:bg-petrol/[0.08] transition-colors flex-shrink-0"
          aria-label="Antwoord sluiten"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground leading-tight truncate tracking-[-0.01em]">{antwoordTitel}</p>
          <p className="text-[12px] text-muted-foreground leading-tight truncate">
            {replyTo || 'nog geen ontvanger'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => replyFileInputRef.current?.click()}
          className="tap-press h-10 w-10 flex items-center justify-center rounded-full text-foreground/70 active:bg-petrol/[0.08] transition-colors flex-shrink-0"
          aria-label="Bijlage toevoegen"
        >
          <Paperclip className="h-[19px] w-[19px]" />
        </button>
        <button
          type="button"
          className="tap-press h-10 pl-4 pr-[18px] rounded-full text-[14px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(241,80,37,0.28)] active:scale-[0.96] transition-transform duration-100 flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
          onClick={() => { hapticMedium(); handleSend() }}
          disabled={isSending}
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Verzenden
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {inlineReplyForm}
      </div>
    </div>
  ) : null

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // READING MODE · shows email body with reply buttons
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="flex flex-col h-full min-w-0">
        {/* Top action bar · sticky, grouped */}
        <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between gap-2 px-2 md:px-5 h-12 border-b border-black/[0.06] dark:border-white/[0.08] flex-shrink-0 bg-card/85 dark:bg-petrol/[0.15] backdrop-blur-xl sticky top-0 z-10">
          {/* Left: Back + email-acties (markeer + organize) */}
          <div className="flex items-center gap-0.5"><Button
              variant="ghost"
              size="sm"
              className="tap-press h-10 md:h-8 w-10 md:w-auto px-0 md:px-2.5 gap-1.5 text-foreground/70 hover:text-foreground hover:bg-petrol/[0.06] rounded-button"
              onClick={() => { hapticLight(); onBack?.() }}
            >
              <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-[13px] hidden md:inline">Terug</span>
            </Button>
            <div className="w-1 hidden md:block" />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-petrol/[0.06] rounded-button transition-colors duration-150" onClick={() => { hapticLight(); if (email) onArchive?.(email) }}>
                <Archive className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Archiveren</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-[#C0451A] hover:bg-[#C0451A]/[0.06] rounded-button transition-colors duration-150" onClick={() => { hapticMedium(); if (email) onDelete?.(email) }}>
                <Trash2 className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Verwijderen</TooltipContent></Tooltip>
            <div className="hidden md:flex items-center gap-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="tap-press h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-petrol/[0.06] rounded-button transition-colors duration-150" onClick={() => { hapticLight(); if (email) onToggleRead?.(email) }}>
                <MailOpen className="h-[18px] w-[18px] md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Markeer als ongelezen</TooltipContent></Tooltip>
            <div ref={snoozeMenuRef} className="relative">
              <Tooltip><TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'tap-press h-10 w-10 md:h-8 md:w-8 rounded-button transition-colors duration-150',
                    email?.snoozed_until
                      ? 'text-petrol hover:bg-petrol/[0.08]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-petrol/[0.06]',
                  )}
                  onClick={() => { hapticLight(); setSnoozeMenuOpen((v) => !v) }}
                >
                  <Clock className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </Button>
              </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">{email?.snoozed_until ? 'Gesnoozed' : 'Snooze'}</TooltipContent></Tooltip>
              {snoozeMenuOpen && email && (
                <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-white dark:bg-popover rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border py-1 z-50">
                  {email.snoozed_until && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setSnoozeMenuOpen(false); onUnsnooze?.(email) }}
                        className="w-full text-left px-3 py-2 text-[13px] text-[#C0451A] hover:bg-petrol/[0.06] transition-colors duration-150"
                      >
                        Niet meer snoozen
                      </button>
                      <div className="border-t border-border my-1" />
                    </>
                  )}
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => { setSnoozeMenuOpen(false); onSnooze?.(email, opt.hours) }}
                      className="w-full text-left px-3 py-2 text-[13px] text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={labelMenuRef} className="relative">
              <Tooltip><TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'tap-press h-10 w-10 md:h-8 md:w-8 transition-colors duration-150',
                    (email?.labels?.length ?? 0) > 0
                      ? 'text-petrol hover:bg-petrol/[0.08]'
                      : 'text-muted-foreground hover:text-foreground/70 hover:bg-petrol/[0.06]',
                  )}
                  onClick={() => { hapticLight(); setLabelMenuOpen((v) => !v) }}
                >
                  <Tag className="h-[18px] w-[18px] md:h-4 md:w-4" />
                </Button>
              </TooltipTrigger><TooltipContent side="bottom" className="text-[12px]">Labels</TooltipContent></Tooltip>
              {labelMenuOpen && email && (
                <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-white dark:bg-popover rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-border py-1 z-50">
                  {Object.entries(labelColors).map(([label, color]) => {
                    const active = email.labels?.includes(label) ?? false
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleLabel?.(email, label)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground/70 hover:bg-petrol/[0.06] transition-colors duration-150"
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
                        <span className="flex-1 text-left capitalize">{label}</span>
                        {active && <span className="text-[11px] text-petrol">●</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Right: AI-helpers + navigatie */}
          <div className="flex items-center gap-0.5">
            <div className="hidden md:flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 md:h-8 md:w-auto px-0 md:px-3 gap-1.5 text-[13px] text-foreground/70 hover:text-petrol hover:bg-petrol/[0.06] rounded-[10px] transition-colors duration-150 disabled:opacity-50"
              onClick={handleSummarize}
              disabled={summaryLoading}
              title="Samenvatten (⌘⇧S)"
            >
              {summaryLoading ? <Loader2 className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 animate-spin" /> : <ScrollText className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 text-flame" />}
              <span className="hidden md:inline">Samenvatten</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 md:h-8 md:w-auto px-0 md:px-3 gap-1.5 text-[13px] text-foreground/70 hover:text-petrol hover:bg-petrol/[0.06] rounded-[10px] transition-colors duration-150 disabled:opacity-50"
              onClick={handleGenerateReplyFromReader}
              disabled={forgieLoading}
              title="Beantwoord met AI (⌘⇧R)"
            >
              {forgieLoading ? <Loader2 className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 animate-spin" /> : <Sparkles className="h-[18px] w-[18px] md:h-3.5 md:w-3.5 text-flame" />}
              <span className="hidden md:inline">Beantwoord</span>
            </Button>
            {emailIndex !== undefined && emailTotal !== undefined && (
              <span className="hidden md:contents">
                <div className="w-px h-5 bg-border mx-2" />
                <span className="text-[12px] text-muted-foreground font-mono tabular-nums">{emailIndex + 1}/{emailTotal}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-petrol/[0.08] rounded-[10px]" onClick={() => onNavigate?.('prev')} disabled={emailIndex <= 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-petrol/[0.08] rounded-[10px]" onClick={() => onNavigate?.('next')} disabled={emailIndex >= emailTotal - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}
            </div>

            {/* Mobiel: alles wat niet lezen of antwoorden is, zit hierachter. */}
            <div ref={mobielMenuRef} className="relative md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="tap-press h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-petrol/[0.06] rounded-button"
                onClick={() => { hapticLight(); setMobielMenuOpen((v) => !v) }}
                aria-label="Meer acties"
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </Button>
              {mobielMenuOpen && email && (
                <div className="absolute top-full right-0 mt-1 w-[230px] max-h-[70vh] overflow-y-auto bg-white dark:bg-popover rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-border py-1 z-50">
                  <button
                    type="button"
                    onClick={() => { setMobielMenuOpen(false); onToggleRead?.(email) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-foreground/80 active:bg-petrol/[0.06]"
                  >
                    <MailOpen className="h-4 w-4 flex-shrink-0" />
                    Markeer als ongelezen
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobielMenuOpen(false); handleSummarize() }}
                    disabled={summaryLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-foreground/80 active:bg-petrol/[0.06] disabled:opacity-50"
                  >
                    {summaryLoading ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" /> : <ScrollText className="h-4 w-4 flex-shrink-0" />}
                    Samenvatten
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobielMenuOpen(false); handleGenerateReplyFromReader() }}
                    disabled={forgieLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-foreground/80 active:bg-petrol/[0.06] disabled:opacity-50"
                  >
                    {forgieLoading ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" /> : <Sparkles className="h-4 w-4 flex-shrink-0" />}
                    Beantwoord met AI
                  </button>

                  <div className="border-t border-border my-1" />
                  {email.snoozed_until && (
                    <button
                      type="button"
                      onClick={() => { setMobielMenuOpen(false); onUnsnooze?.(email) }}
                      className="w-full text-left px-3 py-2.5 text-[14px] text-[#C0451A] active:bg-petrol/[0.06]"
                    >
                      Niet meer snoozen
                    </button>
                  )}
                  <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">Snooze</div>
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => { setMobielMenuOpen(false); onSnooze?.(email, opt.hours) }}
                      className="w-full text-left px-3 py-2.5 text-[14px] text-foreground/80 active:bg-petrol/[0.06]"
                    >
                      {opt.label}
                    </button>
                  ))}

                  <div className="border-t border-border my-1" />
                  <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">Labels</div>
                  {Object.entries(labelColors).map(([label, color]) => {
                    const active = email.labels?.includes(label) ?? false
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleLabel?.(email, label)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-foreground/80 active:bg-petrol/[0.06]"
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
                        <span className="flex-1 text-left capitalize">{label}</span>
                        {active && <span className="text-[11px] text-petrol">●</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </TooltipProvider>

        {/* Scrollable email content */}
        {/* overflow-x expliciet dicht: met alleen overflow-y-auto rekent CSS de
            andere as om naar auto, dus een brede handtekening sleepte de hele
            lezer zijwaarts mee — kop, knoppen en antwoordvenster incl. Het
            bericht zelf houdt hieronder zijn eigen scrollbare kader. */}
        <div className="flex-1 overflow-y-auto max-md:overflow-x-hidden bg-white dark:bg-card">
          <div className="w-full min-w-0 max-w-full">
            {/* Header: subject + sender + reply actions */}
            {/* In reply-mode collapsen we naar één compacte regel · sender + onderwerp
                staan toch al in de Aan/Ond-velden van het formulier eronder. */}
            {replyMode && !isMobiel ? (
              <div className="flex items-center gap-3 px-5 md:px-7 py-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatarStyle.bg }}>
                  <span className="text-[11px] font-semibold leading-none tracking-tight" style={{ color: avatarStyle.text }}>{senderName[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                  <span className="text-[14px] font-semibold text-foreground truncate flex-shrink-0 tracking-[-0.01em]">{senderName}</span>
                  <span className="text-[13px] text-muted-foreground truncate">· {email.onderwerp || '(geen onderwerp)'}</span>
                </div>
                <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">{formatShortDate(email.datum)}</span>
              </div>
            ) : (
              <div className="px-4 md:px-8 pt-5 pb-4 border-b border-border">
                {/* Subject row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="font-heading text-title-sm font-bold text-foreground leading-[1.2] tracking-[-0.015em]">
                    {email.onderwerp || '(geen onderwerp)'}
                  </h1>
                  <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                    <span className="text-[11px] text-muted-foreground/80 font-mono tabular-nums whitespace-nowrap">{formatShortDate(email.datum)}</span>
                    <button
                      onClick={() => onTogglePin?.(email)}
                      title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
                      className={cn(
                        'p-1 rounded-button transition-colors duration-150',
                        email.pinned
                          ? 'text-petrol hover:bg-petrol/10'
                          : 'text-muted-foreground/80 hover:text-petrol hover:bg-petrol/[0.06]',
                      )}
                    >
                      <Pin className={cn('h-3.5 w-3.5', email.pinned && 'fill-petrol -rotate-45')} />
                    </button>
                  </div>
                </div>

                {/* Sender info · system-style avatar, tighter rhythm */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatarStyle.bg }}>
                    <span className="text-[12px] font-semibold leading-none" style={{ color: avatarStyle.text }}>{senderName[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col md:flex-row md:items-baseline md:gap-1.5 min-w-0">
                      <span className="text-[13px] font-semibold text-foreground leading-tight truncate">{senderName}</span>
                      <span className="text-[12px] text-muted-foreground truncate leading-tight">{senderEmail}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">aan {email.aan}</div>
                  </div>
                </div>

                {/* Reply-acties */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => { hapticLight(); handleReply('reply') }}
                    className="tap-press flex-1 md:flex-none flex items-center justify-center gap-1.5 h-9 md:h-8 px-3.5 rounded-button text-[13px] font-semibold text-white bg-petrol hover:bg-[#0F3C44] transition-colors duration-150"
                    title="Beantwoorden (r)">
                    <Reply className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Beantwoorden</span>
                  </button>
                  <button onClick={() => { hapticLight(); handleReply('reply-all') }}
                    className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06] transition-colors duration-150"
                    title="Allen beantwoorden"
                    aria-label="Allen beantwoorden">
                    <ReplyAll className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="hidden md:inline">Allen</span>
                  </button>
                  <button onClick={() => { hapticLight(); handleReply('forward') }}
                    className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-petrol hover:bg-petrol/[0.06] transition-colors duration-150"
                    title="Doorsturen (f)"
                    aria-label="Doorsturen">
                    <Forward className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="hidden md:inline">Doorsturen</span>
                  </button>

                  {/* Aanmaken vanuit deze mail · subtiele icon-buttons, rechts.
                      Mobiel is een lees- en antwoordscherm; koppelen aan een
                      project of klant doe je vanaf de desktop. */}
                  {onOpenContextPanel && (
                    <div className="ml-auto hidden md:block">
                      <EmailActionsPopover
                        email={email}
                        onOpenProjectDialog={() => onOpenContextPanel('project')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inline reply form · verschijnt boven body wanneer replyMode actief is.
                Op mobiel woont hetzelfde formulier in het schermvullende
                antwoordvenster onderaan deze component. */}
            {!isMobiel && inlineReplyForm}

            {/* Email body content area */}
            <div className="px-4 md:px-8 py-6">
              {/* ── Thread navigation strip ──
                  Toon alle berichten in dezelfde conversatie. De huidige is
                  gehighlight, klik op een ander bericht om dat te openen. */}
              {((threadEmails && threadEmails.length > 1) || zojuistVerzonden) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 px-1 mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/65 dark:text-foreground/60">
                    <span className="font-semibold whitespace-nowrap">
                      Gesprek<span className="text-flame tracking-normal">.</span>
                    </span>
                    <span className="flex-1 h-px bg-gradient-to-r from-petrol/[0.14] to-transparent dark:from-white/10" aria-hidden />
                    <span className="tabular-nums tracking-normal text-petrol/40 dark:text-foreground/40">
                      {(threadEmails?.length ?? 1) + (zojuistVerzonden ? 1 : 0)}
                    </span>
                  </div>
                  {/* Tijdlijn: de verticale draad loopt door het midden van de
                      avatars, die hem met hun ring onderbreken. */}
                  <div className="relative flex flex-col gap-0.5">
                    <div
                      className="absolute left-[18px] top-5 bottom-5 w-px bg-petrol/[0.14] dark:bg-white/10"
                      aria-hidden
                    />
                    {(threadEmails ?? []).map((tEmail) => {
                      const isCurrent = tEmail.id === email.id
                      const senderShort = extractSenderName(tEmail.van)
                      const threadAvatar = getAvatarStyle(senderShort)
                      const isEigen = tEmail.map === 'verzonden'
                      const threadPreview = cleanEmailPreview(tEmail.body_text || tEmail.inhoud || '').slice(0, 160)
                      return (
                        <button
                          key={tEmail.id}
                          type="button"
                          onClick={() => {
                            if (!isCurrent && onSelectEmail) onSelectEmail(tEmail)
                          }}
                          className={cn(
                            'relative w-full flex items-start gap-3 pl-1 pr-3 py-2 rounded-[12px] text-left transition-colors duration-150',
                            isCurrent
                              ? 'bg-petrol/[0.06] dark:bg-[#2A7A86]/[0.14]'
                              : 'hover:bg-petrol/[0.04] dark:hover:bg-white/[0.05] cursor-pointer',
                          )}
                        >
                          <div
                            className="relative z-10 w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 ring-[3px] ring-card dark:ring-card"
                            style={{ backgroundColor: threadAvatar.bg }}
                            aria-hidden
                          >
                            <span className="text-[11px] font-bold leading-none" style={{ color: threadAvatar.text }}>
                              {senderShort[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                'text-[13px] truncate tracking-[-0.005em]',
                                isCurrent ? 'font-bold text-foreground' : 'font-medium text-foreground/80',
                              )}>
                                {isEigen ? 'Jij' : senderShort}
                              </span>
                              {isCurrent && (
                                <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-petrol dark:text-[#7FB5BF] bg-petrol/[0.09] dark:bg-[#2A7A86]/20 rounded-full px-1.5 py-0.5 leading-none">
                                  Nu open
                                </span>
                              )}
                              <span className="ml-auto pl-2 text-[11px] font-mono tabular-nums text-muted-foreground/80 flex-shrink-0">
                                {formatShortDate(tEmail.datum)}
                              </span>
                            </div>
                            <p className="text-[12px] leading-snug text-muted-foreground/85 truncate mt-0.5">
                              {threadPreview || tEmail.onderwerp || 'Geen voorbeeldtekst'}
                            </p>
                          </div>
                        </button>
                      )
                    })}

                    {/* Je zojuist verstuurde antwoord · schuift binnen met een
                        petrol-gloed die wegebt. Dit ís de verzendbevestiging. */}
                    {zojuistVerzonden && (() => {
                      const eigenNaam = extractSenderName(eigenAdres || 'Jij')
                      const eigenAvatar = getAvatarStyle(eigenNaam)
                      return (
                        <div className="antwoord-landt relative w-full flex items-start gap-3 pl-1 pr-3 py-2 rounded-[12px] text-left">
                          <div
                            className="relative z-10 w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 ring-[3px] ring-card"
                            style={{ backgroundColor: eigenAvatar.bg }}
                            aria-hidden
                          >
                            <span className="text-[11px] font-bold leading-none" style={{ color: eigenAvatar.text }}>
                              {eigenNaam[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[13px] font-bold text-foreground truncate tracking-[-0.005em]">Jij</span>
                              <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-petrol dark:text-[#7FB5BF] bg-petrol/[0.09] dark:bg-[#2A7A86]/20 rounded-full px-1.5 py-0.5 leading-none">
                                Verzonden
                              </span>
                              <span className="ml-auto pl-2 text-[11px] font-mono tabular-nums text-muted-foreground/80 flex-shrink-0">
                                {formatShortDate(zojuistVerzonden.datum)}
                              </span>
                            </div>
                            <p className="text-[12px] leading-snug text-muted-foreground/85 truncate mt-0.5">
                              {zojuistVerzonden.tekst || 'Antwoord verstuurd'}
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ── Summary block ── */}
              {(summary || summaryLoading) && (
                <div className="mb-6 rounded-xl overflow-hidden bg-background">
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

              {/* Email body · readable, clean hierarchy */}
              {isLoadingBody ? (
                <div className="min-w-0 max-w-full" aria-busy="true" aria-label="Bericht wordt geladen">
                  {voorproefje && (
                    <p
                      className="text-[14px] leading-[1.75] text-foreground/75 break-words"
                      style={{ maskImage: 'linear-gradient(to bottom, #000 45%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent 100%)' }}
                    >
                      {voorproefje}
                    </p>
                  )}
                  <div className={cn('space-y-3', voorproefje ? 'mt-1' : 'py-2')} aria-hidden>
                    <div className="h-3.5 skeleton-warm w-full" />
                    <div className="h-3.5 skeleton-warm w-[92%]" />
                    <div className="h-3.5 skeleton-warm w-3/4" />
                    <div className="h-3.5 skeleton-warm w-[85%]" />
                    <div className="h-3.5 skeleton-warm w-[58%]" />
                  </div>
                </div>
              ) : (
                <div ref={emailBodyRef} className="min-w-0 max-w-full">
                  {/* Op mobiel niets laten uitsteken: een handtekening is
                      meestal een tabel met een vaste pixelbreedte, en die duwde
                      het bericht breder dan het scherm. max-w-full op álle
                      afstammelingen laat zo'n tabel krimpen in plaats van de
                      lezer horizontaal te laten scrollen. */}
                  <div className="max-md:overflow-x-auto max-md:max-w-full max-md:[&_*]:!max-w-full">
                    <div
                      className="text-left text-[14px] leading-[1.75] text-foreground/80 break-words
                        [&>*:first-child]:!mt-0
                        [&_body]:!m-0 [&_body]:!p-0
                        [&_table]:!ml-0 [&_table]:max-w-full max-md:[&_table]:!w-full
                        max-md:[&_td]:!whitespace-normal max-md:[&_pre]:!whitespace-pre-wrap
                        [&_td]:break-words [&_th]:break-words
                        [&_div]:!ml-0 [&_div]:max-w-full
                        [&_p]:!ml-0 [&_p]:mb-2
                        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-3
                        [&_a]:text-petrol dark:[&_a]:text-[#7FB5BF] [&_a]:no-underline [&_a]:hover:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:break-all
                        [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-[14px] [&_blockquote]:text-muted-foreground [&_blockquote]:my-3
                        [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:!ml-0
                        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:!ml-0
                        [&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:!ml-0
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:!ml-0
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:!ml-0
                        [&_li]:mb-0.5
                        [&_.email-sig-dim]:text-muted-foreground [&_.email-sig-dim]:text-[13px]"
                      dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                    />
                  </div>
                  <EmailReaderAIToolbar containerRef={emailBodyRef} />
                </div>
              )}

              {email.is_aanvraag && !email.aanvraag_verborgen && (
                <AanvraagKaart email={email} senderName={senderName} />
              )}

              {/* Attachments · image-grid + losse rij-cards voor non-images */}
              {email.attachment_meta && email.attachment_meta.length > 0 && (() => {
                // CID-inline beeld is de logo-strip uit iemands
                // e-mailhandtekening. Die staat al in de body en hoort niet
                // tussen de echte bijlagen; anders lijkt elke mail er drie
                // te hebben.
                const echteBijlagen = email.attachment_meta.filter((a) => !a.isInlineCid)
                if (echteBijlagen.length === 0) return null
                const imageAtts = echteBijlagen.filter((a) => isImageAttachment(a.filename, a.contentType))
                const fileAtts = echteBijlagen.filter((a) => !isImageAttachment(a.filename, a.contentType))
                return (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-muted-foreground">
                      {echteBijlagen.length} bijlage{echteBijlagen.length > 1 ? 'n' : ''}
                    </span>
                    {echteBijlagen.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAlleBijlagenNaarProject(
                            echteBijlagen.map((a) => ({ filename: a.filename, contentType: a.contentType })),
                          )}
                          disabled={koppelendeBijlage !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-foreground/70 hover:text-foreground/80 hover:bg-petrol/[0.06] disabled:opacity-60 disabled:cursor-wait transition-colors duration-150"
                          title="Alle bijlagen aan een project toevoegen"
                        >
                          {koppelendeBijlage !== null ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FolderPlus className="h-3.5 w-3.5" />
                          )}
                          Alles naar project
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadAllAttachments}
                          disabled={downloadingAll}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-foreground/70 hover:text-foreground/80 hover:bg-petrol/[0.06] disabled:opacity-60 disabled:cursor-wait transition-colors duration-150"
                          title="Alle bijlagen downloaden"
                        >
                          {downloadingAll ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Alles downloaden
                        </button>
                      </div>
                    )}
                  </div>

                  {imageAtts.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-3">
                      {imageAtts.map((att, i) => {
                        const isPreviewing = previewLoading === att.filename
                        const isDownloading = downloadingAttachment === att.filename
                        const thumbUrl = attachmentThumbnails[att.filename]
                        return (
                          <div
                            key={`img-${att.filename}-${i}`}
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
                              'group/att relative flex flex-col rounded-xl overflow-hidden bg-background hover:bg-petrol/[0.06] transition-colors duration-150 cursor-pointer text-left',
                              (isDownloading || isPreviewing) && 'opacity-60 cursor-wait',
                            )}
                            title={`Preview ${att.filename}`}
                          >
                            <div className="relative aspect-square w-full bg-[#EFEEEA] dark:bg-white/[0.06] flex items-center justify-center">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={att.filename}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : thumbnailsLoading ? (
                                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-violet-500/90 text-white text-[10px] font-bold flex items-center justify-center">
                                  IMG
                                </div>
                              )}
                              {(isPreviewing || isDownloading) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                                </div>
                              )}
                              {!isPreviewing && !isDownloading && (
                                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/att:opacity-100 transition-opacity duration-150">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleBijlageNaarProject(att.filename, att.contentType)
                                    }}
                                    className="p-1.5 rounded-lg bg-card/85 hover:bg-white dark:hover:bg-white/20 shadow-sm"
                                    title={`${att.filename} bij situatiefoto's van een project`}
                                    aria-label={`${att.filename} aan project koppelen`}
                                  >
                                    <FolderPlus className="h-3.5 w-3.5 text-foreground/70" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDownloadAttachment(att.filename)
                                    }}
                                    className="p-1.5 rounded-lg bg-card/85 hover:bg-white dark:hover:bg-white/20 shadow-sm"
                                    title={`Download ${att.filename}`}
                                    aria-label={`Download ${att.filename}`}
                                  >
                                    <Download className="h-3.5 w-3.5 text-foreground/70" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 py-2 min-w-0">
                              <div className="text-[12px] text-foreground/70 truncate" title={att.filename}>
                                {att.filename}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {fileAtts.length > 0 && (
                    <div className="flex flex-wrap gap-2.5">
                      {fileAtts.map((att, i) => {
                        const visual = getAttachmentVisual(att.filename, att.contentType)
                        const isDownloading = downloadingAttachment === att.filename
                        const isPreviewing = previewLoading === att.filename
                        return (
                          <div
                            key={`file-${att.filename}-${i}`}
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
                              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-background hover:bg-petrol/[0.06] transition-colors duration-150 cursor-pointer group/att text-left max-w-[280px]',
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
                              <span className="text-[13px] text-foreground/70 group-hover/att:text-foreground/80 transition-colors duration-150 block truncate">
                                {att.filename}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</span>
                            </div>
                            {isPreviewing || isDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 text-petrol/60 animate-spin ml-1 flex-shrink-0" />
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleBijlageNaarProject(att.filename, att.contentType)
                                  }}
                                  disabled={koppelendeBijlage === att.filename}
                                  className="ml-1 p-1 rounded hover:bg-[#E8E7E4] dark:hover:bg-white/10 flex-shrink-0 disabled:cursor-wait"
                                  title={`${att.filename} aan project toevoegen`}
                                  aria-label={`${att.filename} aan project toevoegen`}
                                >
                                  {koppelendeBijlage === att.filename ? (
                                    <Loader2 className="h-3.5 w-3.5 text-petrol/60 animate-spin" />
                                  ) : (
                                    <FolderPlus className="h-3.5 w-3.5 text-muted-foreground/80 group-hover/att:text-foreground/70 transition-colors duration-150" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadAttachment(att.filename)
                                  }}
                                  className="ml-1 p-1 rounded hover:bg-[#E8E7E4] dark:hover:bg-white/10 flex-shrink-0"
                                  title={`Download ${att.filename}`}
                                  aria-label={`Download ${att.filename}`}
                                >
                                  <Download className="h-3.5 w-3.5 text-muted-foreground/80 group-hover/att:text-foreground/70 transition-colors duration-150" />
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )
              })()}

              {/* Fallback: count > 0 maar geen metadata. Bij eigen verzonden
                  mail is dat geen fout: die rij wordt geschreven op het moment
                  van versturen, dus vóór de mail een IMAP-uid heeft en er iets
                  op te halen valt. Pas na de volgende sync van Verzonden komen
                  de bestandsnamen mee. */}
              {(!email.attachment_meta || email.attachment_meta.length === 0) && email.bijlagen > 0 && (() => {
                const meervoud = email.bijlagen > 1
                const isEigenVerzonden = email.map === 'verzonden'
                return (
                  <div className="mt-6 pt-5 border-t border-border">
                    {isLoadingBody ? (
                      <p className="text-[12px] text-muted-foreground inline-flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Bijlagen worden geladen.
                      </p>
                    ) : (
                      <p className="text-[12px] text-muted-foreground inline-flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                        {isEigenVerzonden
                          ? `${email.bijlagen} bijlage${meervoud ? 'n' : ''} meegestuurd.`
                          : `${email.bijlagen} bijlage${meervoud ? 'n' : ''} kon${meervoud ? 'den' : ''} niet worden opgehaald. Open de mail zo nog eens.`}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

          </div>
        </div>

        {previewAtt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={closePreview}
          >
            <div
              className="relative max-w-[92vw] max-h-[92vh] bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border">
                <p className="text-[14px] font-medium text-foreground/80 truncate min-w-0">
                  {previewAtt.filename}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAtt.filename)}
                    className="p-2 rounded-lg hover:bg-petrol/[0.06] transition-colors"
                    title="Downloaden"
                    aria-label="Downloaden"
                  >
                    <Download className="h-4 w-4 text-foreground/70" />
                  </button>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 rounded-lg hover:bg-petrol/[0.06] transition-colors"
                    title="Sluiten"
                    aria-label="Sluiten"
                  >
                    <X className="h-4 w-4 text-foreground/70" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-background flex items-center justify-center min-w-[320px] min-h-[320px]">
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
                    <p className="text-[14px] text-foreground/70 mb-4">
                      Geen preview beschikbaar voor dit bestandstype.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(previewAtt.filename)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-petrol text-white text-[13px] hover:bg-[#16454D] transition-colors"
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

        <BijlageProjectDialog
          open={bijlagenVoorDialog.length > 0}
          onOpenChange={(v) => { if (!v) setBijlagenVoorDialog([]) }}
          bijlagen={bijlagenVoorDialog}
          threadId={email.thread_id}
          senderEmail={senderEmail}
          bezig={koppelendeBijlage !== null}
          voortgang={koppelVoortgang}
          onBevestig={handleBijlageBevestig}
        />

        {mobielAntwoordVenster}
    </div>
  )
}

