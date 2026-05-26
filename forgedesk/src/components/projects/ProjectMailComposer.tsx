import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Paperclip, Send, X, FileText, Image as ImageIcon, File, Bold, Italic, Underline, List, Link as LinkIcon, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { sendEmail } from '@/services/gmailService'
import { logWijziging } from '@/utils/auditLogger'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import type { Project, Klant, Contactpersoon } from '@/types'

interface ProjectMailComposerProps {
  project: Project
  klant: Klant | null
  contactpersoon?: Contactpersoon | null
  userId?: string
  medewerkerNaam?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Bijlage {
  id: string
  filename: string
  base64: string
  size: number
  mimeType: string
}

interface DraftPayload {
  toEmails: string[]
  ccEmails: string[]
  bccEmails: string[]
  showCcBcc: boolean
  subject: string
  body: string
  opvolgen: boolean
}

export interface ProjectMailComposerHandle {
  open: () => void
  scrollIntoView: () => void
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-3.5 w-3.5 text-[#3A6B8C]" />
  if (mimeType === 'application/pdf') return <FileText className="h-3.5 w-3.5 text-[#C03A18]" />
  return <File className="h-3.5 w-3.5 text-foreground/70" />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface EmailChipsInputProps {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

function EmailChipsInput({ value, onChange, placeholder }: EmailChipsInputProps) {
  const [draft, setDraft] = useState('')

  const commit = (text: string) => {
    const trimmed = text.trim().replace(/[,;]\s*$/, '')
    if (!trimmed) return
    if (value.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
  }

  return (
    <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
      {value.map((email, i) => (
        <span key={`${email}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[12px] text-foreground">
          {email}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-[#C03A18] transition-colors"
            aria-label={`${email} verwijderen`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        type="email"
        value={draft}
        onChange={(e) => {
          const val = e.target.value
          if (val.endsWith(',') || val.endsWith(';')) {
            commit(val)
          } else {
            setDraft(val)
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            if (draft.trim()) {
              e.preventDefault()
              commit(draft)
            }
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
      />
    </div>
  )
}

export const ProjectMailComposer = forwardRef<ProjectMailComposerHandle, ProjectMailComposerProps>(function ProjectMailComposer(
  { project, klant, contactpersoon, userId, medewerkerNaam, open, onOpenChange },
  ref,
) {
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte } = useAppSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const defaultEmail = contactpersoon?.email || klant?.email || ''
  const defaultNaam = contactpersoon?.naam || klant?.contactpersoon || klant?.bedrijfsnaam || ''
  const voornaam = defaultNaam.split(' ')[0] || defaultNaam
  const aanhef = voornaam ? `Beste ${voornaam}` : 'Beste'
  const defaultSubject = `[${project.project_nummer || 'PRJ'}] ${project.naam}`
  const hasPngSignature = !!handtekeningAfbeelding?.trim()
  const textSignatuur = !hasPngSignature && emailHandtekening?.trim() ? emailHandtekening.trim() : ''
  const signatuurBlok = textSignatuur ? `\n\n${textSignatuur}` : ''
  const defaultBody = `${aanhef},\n\n${signatuurBlok}`

  const draftKey = `doen_mail_draft_${project.id}`

  const [toEmails, setToEmails] = useState<string[]>(defaultEmail ? [defaultEmail] : [])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [bccEmails, setBccEmails] = useState<string[]>([])
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [bijlagen, setBijlagen] = useState<Bijlage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [opvolgen, setOpvolgen] = useState(true)
  const [draftRestored, setDraftRestored] = useState(false)

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Probeer eerst draft te herstellen
      let restored = false
      try {
        const raw = localStorage.getItem(draftKey)
        if (raw) {
          const draft: DraftPayload = JSON.parse(raw)
          setToEmails(draft.toEmails || (defaultEmail ? [defaultEmail] : []))
          setCcEmails(draft.ccEmails || [])
          setBccEmails(draft.bccEmails || [])
          setShowCcBcc(draft.showCcBcc || (draft.ccEmails?.length > 0 || draft.bccEmails?.length > 0))
          setSubject(draft.subject ?? defaultSubject)
          setBody(draft.body ?? defaultBody)
          setOpvolgen(draft.opvolgen ?? true)
          setDraftRestored(true)
          restored = true
        }
      } catch { /* ignore */ }
      if (!restored) {
        setToEmails(defaultEmail ? [defaultEmail] : [])
        setCcEmails([])
        setBccEmails([])
        setShowCcBcc(false)
        setSubject(defaultSubject)
        setBody(defaultBody)
        setOpvolgen(true)
        setBijlagen([])
      }
    } else if (!open) {
      setToEmails(defaultEmail ? [defaultEmail] : [])
      setSubject(defaultSubject)
      setBody(defaultBody)
    }
    wasOpenRef.current = open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmail, defaultSubject, defaultBody])

  // Toast wanneer concept hersteld
  useEffect(() => {
    if (draftRestored) {
      toast.info('Concept hersteld')
      setDraftRestored(false)
    }
  }, [draftRestored])

  // Auto-save draft (throttled)
  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => {
      try {
        const payload: DraftPayload = { toEmails, ccEmails, bccEmails, showCcBcc, subject, body, opvolgen }
        // Schrijf alleen als er iets unieks is (niet alleen defaults)
        const isJustDefault =
          subject === defaultSubject &&
          body === defaultBody &&
          ccEmails.length === 0 &&
          bccEmails.length === 0
        if (isJustDefault) {
          localStorage.removeItem(draftKey)
        } else {
          localStorage.setItem(draftKey, JSON.stringify(payload))
        }
      } catch { /* ignore */ }
    }, 500)
    return () => clearTimeout(handle)
  }, [toEmails, ccEmails, bccEmails, showCcBcc, subject, body, opvolgen, open, defaultSubject, defaultBody, draftKey])

  // Cursor net na de aanhef wanneer composer opent
  useEffect(() => {
    if (!open) return
    const t = textareaRef.current
    if (!t) return
    const cursor = `${aanhef},\n\n`.length
    requestAnimationFrame(() => {
      t.focus()
      t.setSelectionRange(cursor, cursor)
    })
  }, [open, aanhef])

  // Auto-grow textarea
  useEffect(() => {
    const t = textareaRef.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.max(80, t.scrollHeight)}px`
  }, [body, open])

  useImperativeHandle(ref, () => ({
    open: () => onOpenChange(true),
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }), [onOpenChange])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is groter dan 10MB`)
        continue
      }
      try {
        const base64 = await fileToBase64(file)
        setBijlagen((prev) => [
          ...prev,
          { id: crypto.randomUUID(), filename: file.name, base64, size: file.size, mimeType: file.type || 'application/octet-stream' },
        ])
      } catch (err) {
        logger.error('Bijlage inladen mislukt:', err)
        toast.error(`Kon ${file.name} niet inladen`)
      }
    }
    e.target.value = ''
  }

  const wrapSelection = useCallback((before: string, after: string) => {
    const t = textareaRef.current
    if (!t) return
    const start = t.selectionStart
    const end = t.selectionEnd
    const selected = body.substring(start, end)
    const next = body.substring(0, start) + before + selected + after + body.substring(end)
    setBody(next)
    requestAnimationFrame(() => {
      t.focus()
      const newPos = end + before.length + (selected ? after.length : 0)
      t.setSelectionRange(start + before.length, newPos)
    })
  }, [body])

  const insertList = useCallback(() => {
    const t = textareaRef.current
    if (!t) return
    const start = t.selectionStart
    const end = t.selectionEnd
    const selected = body.substring(start, end) || 'item'
    const lines = selected.split('\n').map((l) => `- ${l}`).join('\n')
    const next = body.substring(0, start) + lines + body.substring(end)
    setBody(next)
  }, [body])

  const insertLink = useCallback(() => {
    const t = textareaRef.current
    if (!t) return
    const url = window.prompt('URL:')
    if (!url) return
    const start = t.selectionStart
    const end = t.selectionEnd
    const selected = body.substring(start, end) || url
    const linkText = `[${selected}](${url})`
    const next = body.substring(0, start) + linkText + body.substring(end)
    setBody(next)
  }, [body])

  async function handleSend() {
    if (toEmails.length === 0) {
      toast.error('Vul minimaal één ontvanger in')
      return
    }
    if (!subject.trim()) {
      toast.error('Vul een onderwerp in')
      return
    }
    setIsSending(true)
    try {
      const attachments = bijlagen.map((b) => ({
        filename: b.filename,
        content: b.base64,
        encoding: 'base64' as const,
      }))

      const escapeHtml = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      const bodyHtml = escapeHtml(body).replace(/\n/g, '<br/>')
      const signaturImg = handtekeningAfbeelding?.trim()
        ? `<br/><br/><img src="${handtekeningAfbeelding}" alt="Handtekening" style="max-height:${handtekeningAfbeeldingGrootte || 64}px;display:block;"/>`
        : ''
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1A1A1A">${bodyHtml}${signaturImg}</div>`

      const toStr = toEmails.join(', ')
      await sendEmail(toStr, subject.trim(), body, {
        attachments,
        html,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        bcc: bccEmails.length > 0 ? bccEmails.join(', ') : undefined,
        wacht_op_reactie: opvolgen,
      })

      if (userId) {
        logWijziging({
          userId,
          entityType: 'project',
          entityId: project.id,
          actie: 'verstuurd',
          medewerkerNaam: medewerkerNaam || '',
          omschrijving: `Email naar ${toStr}: ${subject.trim()}${opvolgen ? ' (opvolgen)' : ''}`,
        }).catch(() => null)
      }

      // Clear draft op succes
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }

      toast.success(<>Email verstuurd</>)
      setBijlagen([])
      setBody(defaultBody)
      setSubject(defaultSubject)
      setCcEmails([])
      setBccEmails([])
      setShowCcBcc(false)
      onOpenChange(false)
    } catch (err) {
      logger.error('Email verzenden mislukt:', err)
      toast.error('Email kon niet verzonden worden — controleer SMTP-instellingen')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  if (!open) return null

  const canSend = toEmails.length > 0 && subject.trim().length > 0 && !isSending

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mail</span>
          {defaultNaam && (
            <span className="text-[12px] text-foreground/70">naar {defaultNaam}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Mail-composer sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start gap-3 border-b border-border pb-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24 flex-shrink-0 pt-1">Aan</label>
          <EmailChipsInput value={toEmails} onChange={setToEmails} placeholder="naam@bedrijf.nl" />
          {!showCcBcc && (
            <button
              type="button"
              onClick={() => setShowCcBcc(true)}
              className="text-[11px] text-muted-foreground hover:text-[#1A535C] transition-colors flex-shrink-0 pt-1"
            >
              Cc Bcc
            </button>
          )}
        </div>

        {showCcBcc && (
          <>
            <div className="flex items-start gap-3 border-b border-border pb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24 flex-shrink-0 pt-1">Cc</label>
              <EmailChipsInput value={ccEmails} onChange={setCcEmails} placeholder="cc@bedrijf.nl" />
            </div>
            <div className="flex items-start gap-3 border-b border-border pb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24 flex-shrink-0 pt-1">Bcc</label>
              <EmailChipsInput value={bccEmails} onChange={setBccEmails} placeholder="bcc@bedrijf.nl" />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 border-b border-border pb-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24 flex-shrink-0">Onderwerp</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] font-medium text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Body-blok: textarea + handtekening visueel als één 'mailbox' */}
        <div className="rounded-xl border border-border focus-within:border-[#F15025]/50 focus-within:ring-2 focus-within:ring-[#F15025]/15 transition-all p-3 space-y-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ je bericht..."
            rows={3}
            className="w-full bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground resize-none leading-relaxed focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 p-0 overflow-hidden"
            style={{ boxShadow: 'none' }}
          />

          {handtekeningAfbeelding?.trim() && (
            <img
              src={handtekeningAfbeelding}
              alt="Handtekening"
              style={{ maxHeight: Math.min(140, handtekeningAfbeeldingGrootte || 96), maxWidth: 360 }}
              className="object-contain"
            />
          )}
        </div>

        {/* Bijlagen-lijst */}
        {bijlagen.length > 0 && (
          <div className="space-y-1.5">
            {bijlagen.map((b) => {
              const isImage = b.mimeType.startsWith('image/')
              return (
                <div key={b.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-background">
                  {isImage ? (
                    <img
                      src={`data:${b.mimeType};base64,${b.base64}`}
                      alt={b.filename}
                      className="h-8 w-8 object-cover rounded flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="h-8 w-8 flex items-center justify-center bg-white rounded flex-shrink-0 border border-border">
                      {getFileIcon(b.mimeType)}
                    </div>
                  )}
                  <span className="text-[12px] text-foreground truncate flex-1">{b.filename}</span>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{formatBytes(b.size)}</span>
                  <button
                    type="button"
                    onClick={() => setBijlagen((prev) => prev.filter((x) => x.id !== b.id))}
                    className="text-muted-foreground hover:text-[#C03A18] transition-colors"
                    aria-label="Bijlage verwijderen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Toolbar + verstuur */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-background">
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => wrapSelection('**', '**')} title="Bold" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection('_', '_')} title="Cursief" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection('__', '__')} title="Onderstreept" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <Underline className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button" onClick={insertList} title="Lijst" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={insertLink} title="Link toevoegen" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Bijlage toevoegen" className="h-8 w-8 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground transition-colors">
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpvolgen((v) => !v)}
            className="inline-flex items-center gap-2 text-[12px] text-foreground/70 hover:text-foreground transition-colors px-2"
            title="Markeer als 'wacht op reactie' voor opvolging"
          >
            <span className={cn("relative inline-block h-4 w-7 rounded-full transition-colors", opvolgen ? "bg-[#1A535C]" : "bg-[#D4D2CC]")}>
              <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all", opvolgen ? "left-3.5" : "left-0.5")} />
            </span>
            Opvolgen
            <span className="text-[10px] font-mono text-muted-foreground/80">⌘+Enter</span>
          </button>
          <button
            type="button"
            disabled
            title="Inplannen (binnenkort)"
            className="h-9 w-9 rounded-lg border border-border bg-white flex items-center justify-center text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all min-w-[110px] justify-center",
              !canSend
                ? "bg-[#9B9B95] cursor-not-allowed"
                : "bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px]"
            )}
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verzenden...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Versturen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
})
