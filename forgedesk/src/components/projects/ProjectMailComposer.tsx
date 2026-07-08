import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Paperclip, Send, X, FileText, Image as ImageIcon, File, Bold, Italic, Underline, List, Link as LinkIcon, Loader2, Receipt, CreditCard, Wrench, Check, Plus, ChevronDown, MessagesSquare, Clock } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { sendEmail } from '@/services/gmailService'
import { logWijziging } from '@/utils/auditLogger'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { getDocumentenByProject } from '@/services/documentenService'
import { getOffertesByProject, getOfferteItems } from '@/services/offerteService'
import { getFacturenByProject, getFactuurItems } from '@/services/factuurService'
import { getWerkbonnenByProject, getWerkbonItems, getWerkbonFotos } from '@/services/werkbonService'
import { getSigningVisualisatiesByProject } from '@/services/visualizerService'
import { generateOffertePDF, generateOpdrachtbevestigingPDF, generateFactuurPDF } from '@/services/pdfService'
import { generateWerkbonInstructiePDF } from '@/services/werkbonPdfService'
import { getEmailsVoorProject, koppelEmailAanProject, type ProjectMail } from '@/services/emailProjectService'
import { uploadEmailAttachment, deleteFile } from '@/services/storageService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import type { Project, Klant, Contactpersoon, Document, Offerte, Factuur, Werkbon, OfferteItem, SigningVisualisatie } from '@/types'

const MAX_BIJLAGE_BYTES = 20 * 1024 * 1024
const MAX_BIJLAGEN_TOTAAL_BYTES = 25 * 1024 * 1024

interface ProjectMailComposerProps {
  project: Project
  klant: Klant | null
  contactpersoon?: Contactpersoon | null
  userId?: string
  medewerkerNaam?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type BijlageBron = 'upload' | 'bestand' | 'offerte' | 'factuur' | 'werkbon' | 'visualisatie'

interface Bijlage {
  id: string
  filename: string
  size: number
  mimeType: string
  bron: BijlageBron
  bronId?: string
  base64?: string
  storagePath?: string
  bucket?: string
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

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' })
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

function base64Size(b64: string): number {
  return Math.round((b64.length * 3) / 4)
}

// Haalt een (externe) afbeelding op en hercomprimeert hem als JPEG, zodat de
// bijlage fors kleiner wordt zonder zichtbaar kwaliteitsverlies.
async function comprimeerAfbeeldingNaarBase64(
  url: string,
  maxBreedte = 2400,
  kwaliteit = 0.9,
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Afbeelding ophalen mislukt (${res.status})`)
  const blob = await res.blob()

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('Inlezen mislukt'))
    fr.readAsDataURL(blob)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Afbeelding laden mislukt'))
    i.src = dataUrl
  })

  let { width, height } = img
  if (width > maxBreedte) {
    height = Math.round((height * maxBreedte) / width)
    width = maxBreedte
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas niet beschikbaar')
  ctx.drawImage(img, 0, 0, width, height)

  const out = canvas.toDataURL('image/jpeg', kwaliteit)
  const base64 = out.split(',')[1]
  // Als de gecomprimeerde versie onverhoopt groter is dan het origineel, gebruik origineel
  const origBase64 = dataUrl.split(',')[1]
  if (origBase64 && base64Size(base64) >= base64Size(origBase64)) {
    return { base64: origBase64, mimeType: blob.type || 'image/png' }
  }
  return { base64, mimeType: 'image/jpeg' }
}

function formatThreadDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function mailPreview(m: ProjectMail): string {
  const raw = m.body_text || (m.body_html ? m.body_html.replace(/<[^>]+>/g, ' ') : '')
  const clean = raw.replace(/\s+/g, ' ').trim()
  return clean.length > 280 ? `${clean.slice(0, 280)}…` : clean
}

function markdownNaarHtml(tekst: string): string {
  const escaped = tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const inline = escaped
    .replace(/__([^_\n](?:[^\n]*?[^_\n])?)__/g, '<u>$1</u>')
    .replace(/\*\*([^*\n](?:[^\n]*?[^*\n])?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_(\S(?:[^_\n]*\S)?)_/g, '$1<em>$2</em>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  const blokken: string[] = []
  let lijstItems: string[] = []
  const sluitLijst = () => {
    if (lijstItems.length > 0) {
      blokken.push(`<ul>${lijstItems.map((li) => `<li>${li}</li>`).join('')}</ul>`)
      lijstItems = []
    }
  }
  for (const regel of inline.split('\n')) {
    if (regel.startsWith('- ')) {
      lijstItems.push(regel.slice(2))
    } else {
      sluitLijst()
      blokken.push(regel)
    }
  }
  sluitLijst()
  return blokken.map((b, i) => (i === 0 || b.startsWith('<ul>') || blokken[i - 1].startsWith('<ul>') ? b : `<br/>${b}`)).join('')
}

function bronAccent(bron: BijlageBron): { bg: string; border: string } {
  switch (bron) {
    case 'offerte': return { bg: 'rgba(58,107,140,0.08)', border: 'rgba(58,107,140,0.25)' }
    case 'factuur': return { bg: 'rgba(26,83,92,0.08)', border: 'rgba(26,83,92,0.25)' }
    case 'werkbon': return { bg: 'rgba(154,90,72,0.08)', border: 'rgba(154,90,72,0.25)' }
    case 'visualisatie': return { bg: 'rgba(241,80,37,0.08)', border: 'rgba(241,80,37,0.25)' }
    case 'bestand': return { bg: '#F0EEEA', border: '#E4E1DB' }
    default: return { bg: 'hsl(var(--background))', border: 'hsl(var(--border))' }
  }
}

function bijlageIcon(bron: BijlageBron, mimeType: string) {
  switch (bron) {
    case 'offerte': return <Receipt className="h-3.5 w-3.5" style={{ color: '#3A6B8C' }} />
    case 'factuur': return <CreditCard className="h-3.5 w-3.5" style={{ color: '#1A535C' }} />
    case 'werkbon': return <Wrench className="h-3.5 w-3.5" style={{ color: '#9A5A48' }} />
    case 'visualisatie': return <ImageIcon className="h-3.5 w-3.5" style={{ color: '#F15025' }} />
    default: return getFileIcon(mimeType)
  }
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
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, profile, primaireKleur } = useAppSettings()
  const documentStyle = useDocumentStyle()
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
  const [opvolgen, setOpvolgen] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerLoaded, setPickerLoaded] = useState(false)
  const [projectDocs, setProjectDocs] = useState<Document[]>([])
  const [projectOffertes, setProjectOffertes] = useState<Offerte[]>([])
  const [projectFacturen, setProjectFacturen] = useState<Factuur[]>([])
  const [projectWerkbonnen, setProjectWerkbonnen] = useState<Werkbon[]>([])
  const [projectVisualisaties, setProjectVisualisaties] = useState<SigningVisualisatie[]>([])
  const [bezigItemId, setBezigItemId] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const [threadMails, setThreadMails] = useState<ProjectMail[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadOpen, setThreadOpen] = useState(true)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const scheduleRef = useRef<HTMLDivElement>(null)

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
          setOpvolgen(draft.opvolgen ?? false)
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
        setOpvolgen(false)
        setBijlagen([])
      }
    } else if (!open) {
      setToEmails(defaultEmail ? [defaultEmail] : [])
      setSubject(defaultSubject)
      setBody(defaultBody)
      setPickerOpen(false)
      setScheduleOpen(false)
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

  // Projectbronnen + gesprek laden zodra de composer opent
  useEffect(() => {
    if (open) {
      loadProjectData()
      loadThread()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Picker sluiten bij klik buiten
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Inplan-popover sluiten bij klik buiten
  useEffect(() => {
    if (!scheduleOpen) return
    const handler = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) setScheduleOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [scheduleOpen])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    let lopendTotaal = bijlagen.reduce((sum, b) => sum + (b.size || 0), 0)
    for (const file of Array.from(files)) {
      if (file.size > MAX_BIJLAGE_BYTES) {
        toast.error(`${file.name} is groter dan ${MAX_BIJLAGE_BYTES / 1024 / 1024}MB`)
        continue
      }
      if (lopendTotaal + file.size > MAX_BIJLAGEN_TOTAAL_BYTES) {
        toast.error(`Totale bijlagegrootte overschrijdt ${MAX_BIJLAGEN_TOTAAL_BYTES / 1024 / 1024}MB`)
        break
      }
      try {
        const base64 = await fileToBase64(file)
        lopendTotaal += file.size
        setBijlagen((prev) => [
          ...prev,
          { id: crypto.randomUUID(), filename: file.name, base64, size: file.size, mimeType: file.type || 'application/octet-stream', bron: 'upload' },
        ])
      } catch (err) {
        logger.error('Bijlage inladen mislukt:', err)
        toast.error(`Kon ${file.name} niet inladen`)
      }
    }
    e.target.value = ''
  }

  const isToegevoegd = (bronId: string) => bijlagen.some((b) => b.bronId === bronId)
  const verwijderBron = (bronId: string) => setBijlagen((prev) => prev.filter((b) => b.bronId !== bronId))

  async function loadProjectData() {
    if (pickerLoaded || pickerLoading) return
    setPickerLoading(true)
    try {
      const [docs, offs, facs, wbs, viss] = await Promise.all([
        getDocumentenByProject(project.id).catch(() => [] as Document[]),
        getOffertesByProject(project.id).catch(() => [] as Offerte[]),
        getFacturenByProject(project.id).catch(() => [] as Factuur[]),
        getWerkbonnenByProject(project.id).catch(() => [] as Werkbon[]),
        getSigningVisualisatiesByProject(project.id).catch(() => [] as SigningVisualisatie[]),
      ])
      setProjectDocs(docs)
      setProjectOffertes(offs)
      setProjectFacturen(facs)
      setProjectWerkbonnen(wbs)
      setProjectVisualisaties(viss)
      setPickerLoaded(true)
    } finally {
      setPickerLoading(false)
    }
  }

  async function loadThread() {
    try {
      const mails = await getEmailsVoorProject(project.id)
      setThreadMails(mails)
      setThreadId((prev) => prev || (mails[0]?.thread_id ?? null))
    } catch {
      /* stil · RLS kan niets opleveren */
    }
  }

  function toggleBestand(d: Document) {
    if (isToegevoegd(d.id)) { verwijderBron(d.id); return }
    setBijlagen((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        filename: d.naam,
        size: d.grootte,
        mimeType: d.type || 'application/octet-stream',
        storagePath: d.storage_path,
        bucket: 'documenten',
        bron: 'bestand',
        bronId: d.id,
      },
    ])
  }

  async function toggleOfferte(o: Offerte) {
    if (isToegevoegd(o.id)) { verwijderBron(o.id); return }
    setBezigItemId(o.id)
    try {
      const items = await getOfferteItems(o.id)
      const doc = await generateOffertePDF(o, items, klant || {}, { ...profile, primaireKleur: primaireKleur || '#2563eb' }, documentStyle)
      const base64 = doc.output('datauristring').split(',')[1]
      setBijlagen((prev) => [
        ...prev,
        { id: crypto.randomUUID(), filename: `${o.nummer}.pdf`, size: base64Size(base64), mimeType: 'application/pdf', base64, bron: 'offerte', bronId: o.id },
      ])
    } catch (err) {
      logger.error('Offerte-PDF genereren mislukt:', err)
      toast.error('Kon offerte-PDF niet genereren')
    } finally {
      setBezigItemId(null)
    }
  }

  async function toggleOpdrachtbevestiging(o: Offerte) {
    const obId = `${o.id}-ob`
    if (isToegevoegd(obId)) { verwijderBron(obId); return }
    setBezigItemId(obId)
    try {
      const items = await getOfferteItems(o.id)
      const doc = await generateOpdrachtbevestigingPDF(o, items, klant || {}, { ...profile, primaireKleur: primaireKleur || '#2563eb' }, documentStyle)
      const base64 = doc.output('datauristring').split(',')[1]
      setBijlagen((prev) => [
        ...prev,
        { id: crypto.randomUUID(), filename: `Opdrachtbevestiging-${o.nummer}.pdf`, size: base64Size(base64), mimeType: 'application/pdf', base64, bron: 'offerte', bronId: obId },
      ])
    } catch (err) {
      logger.error('Opdrachtbevestiging-PDF genereren mislukt:', err)
      toast.error('Kon opdrachtbevestiging-PDF niet genereren')
    } finally {
      setBezigItemId(null)
    }
  }

  async function toggleFactuur(f: Factuur) {
    if (isToegevoegd(f.id)) { verwijderBron(f.id); return }
    setBezigItemId(f.id)
    try {
      if (f.pdf_storage_path) {
        setBijlagen((prev) => [
          ...prev,
          { id: crypto.randomUUID(), filename: `Factuur-${f.nummer}.pdf`, size: 0, mimeType: 'application/pdf', storagePath: f.pdf_storage_path, bucket: 'facturen', bron: 'factuur', bronId: f.id },
        ])
      } else {
        const items = await getFactuurItems(f.id)
        const pdfItems: OfferteItem[] = items.map((item, idx) => ({
          id: item.id,
          offerte_id: '',
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: item.totaal,
          volgorde: idx + 1,
          created_at: new Date().toISOString(),
        }))
        const factuurData = {
          nummer: f.nummer,
          titel: f.titel,
          datum: f.factuurdatum,
          vervaldatum: f.vervaldatum,
          subtotaal: f.subtotaal,
          btw_bedrag: f.btw_bedrag,
          totaal: f.totaal,
          notities: f.notities || undefined,
          betaalvoorwaarden: f.voorwaarden || undefined,
          factuur_type: f.factuur_type || 'standaard',
          betaal_link: f.betaal_link || undefined,
          outro_tekst: f.outro_tekst || undefined,
          factuur_bedrijfsnaam: f.factuur_bedrijfsnaam || undefined,
          factuur_tav: f.factuur_tav || undefined,
          factuur_adres: f.factuur_adres || undefined,
          factuur_postcode: f.factuur_postcode || undefined,
          factuur_plaats: f.factuur_plaats || undefined,
        }
        const doc = generateFactuurPDF(factuurData, pdfItems, klant || {}, { ...profile, primaireKleur: primaireKleur || '#2563eb' }, documentStyle)
        const base64 = doc.output('datauristring').split(',')[1]
        setBijlagen((prev) => [
          ...prev,
          { id: crypto.randomUUID(), filename: `Factuur-${f.nummer}.pdf`, size: base64Size(base64), mimeType: 'application/pdf', base64, bron: 'factuur', bronId: f.id },
        ])
      }
    } catch (err) {
      logger.error('Factuur-PDF genereren mislukt:', err)
      toast.error('Kon factuur-PDF niet genereren')
    } finally {
      setBezigItemId(null)
    }
  }

  async function toggleWerkbon(w: Werkbon) {
    if (isToegevoegd(w.id)) { verwijderBron(w.id); return }
    setBezigItemId(w.id)
    try {
      const [items, fotos] = await Promise.all([getWerkbonItems(w.id), getWerkbonFotos(w.id)])
      const doc = await generateWerkbonInstructiePDF(
        {
          werkbon_nummer: w.werkbon_nummer,
          titel: w.titel,
          datum: w.datum,
          locatie_adres: w.locatie_adres,
          locatie_stad: w.locatie_stad,
          locatie_postcode: w.locatie_postcode,
          contact_naam: w.contact_naam,
          contact_telefoon: w.contact_telefoon,
          toon_briefpapier: w.toon_briefpapier ?? true,
          status: w.status,
          uren_gewerkt: w.uren_gewerkt,
          monteur_opmerkingen: w.monteur_opmerkingen,
          klant_handtekening: w.klant_handtekening,
          klant_naam_getekend: w.klant_naam_getekend,
        },
        items,
        klant || {},
        project.naam || '',
        { ...profile, primaireKleur: primaireKleur || '#2563eb' },
        documentStyle,
        { fotos },
      )
      const base64 = doc.output('datauristring').split(',')[1]
      setBijlagen((prev) => [
        ...prev,
        { id: crypto.randomUUID(), filename: `Werkbon-${w.werkbon_nummer}.pdf`, size: base64Size(base64), mimeType: 'application/pdf', base64, bron: 'werkbon', bronId: w.id },
      ])
    } catch (err) {
      logger.error('Werkbon-PDF genereren mislukt:', err)
      toast.error('Kon werkbon-PDF niet genereren')
    } finally {
      setBezigItemId(null)
    }
  }

  async function toggleVisualisatie(v: SigningVisualisatie) {
    if (isToegevoegd(v.id)) { verwijderBron(v.id); return }
    setBezigItemId(v.id)
    try {
      const { base64, mimeType } = await comprimeerAfbeeldingNaarBase64(v.resultaat_url)
      const ext = mimeType === 'image/png' ? 'png' : 'jpg'
      const naamBasis = (project.naam || 'visualisatie').replace(/[^\w\d-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      setBijlagen((prev) => [
        ...prev,
        { id: crypto.randomUUID(), filename: `Visualisatie-${naamBasis}.${ext}`, size: base64Size(base64), mimeType, base64, bron: 'visualisatie', bronId: v.id },
      ])
    } catch (err) {
      logger.error('Visualisatie als bijlage toevoegen mislukt:', err)
      toast.error('Kon visualisatie niet toevoegen')
    } finally {
      setBezigItemId(null)
    }
  }

  const cats = [
    {
      key: 'bestanden', label: 'Bestanden', color: 'hsl(var(--muted-foreground))', count: projectDocs.length,
      tabIcon: <FileText className="h-3.5 w-3.5" />,
      items: projectDocs.map((d) => ({ id: d.id, label: d.naam, icon: getFileIcon(d.type || ''), onToggle: () => toggleBestand(d) })),
    },
    {
      key: 'offertes', label: 'Offertes', color: '#3A6B8C', count: projectOffertes.length,
      tabIcon: <Receipt className="h-3.5 w-3.5" />,
      items: projectOffertes.map((o) => ({ id: o.id, label: o.titel || `Offerte ${o.nummer}`, icon: <Receipt className="h-3.5 w-3.5" style={{ color: '#3A6B8C' }} />, onToggle: () => toggleOfferte(o) })),
    },
    {
      key: 'opdrachtbevestigingen', label: 'Opdrachtbevestigingen', color: '#C03A18', count: projectOffertes.length,
      tabIcon: <Receipt className="h-3.5 w-3.5" />,
      items: projectOffertes.map((o) => ({ id: `${o.id}-ob`, label: o.titel || `Opdrachtbevestiging ${o.nummer}`, icon: <Receipt className="h-3.5 w-3.5" style={{ color: '#C03A18' }} />, onToggle: () => toggleOpdrachtbevestiging(o) })),
    },
    {
      key: 'facturen', label: 'Facturen', color: '#1A535C', count: projectFacturen.length,
      tabIcon: <CreditCard className="h-3.5 w-3.5" />,
      items: projectFacturen.map((f) => ({ id: f.id, label: f.titel || `Factuur ${f.nummer}`, icon: <CreditCard className="h-3.5 w-3.5" style={{ color: '#1A535C' }} />, onToggle: () => toggleFactuur(f) })),
    },
    {
      key: 'werkbonnen', label: 'Werkbonnen', color: '#9A5A48', count: projectWerkbonnen.length,
      tabIcon: <Wrench className="h-3.5 w-3.5" />,
      items: projectWerkbonnen.map((w) => ({ id: w.id, label: w.titel || `Werkbon ${w.werkbon_nummer}`, icon: <Wrench className="h-3.5 w-3.5" style={{ color: '#9A5A48' }} />, onToggle: () => toggleWerkbon(w) })),
    },
    {
      key: 'visualisaties', label: 'Visualisaties', color: '#F15025', count: projectVisualisaties.length,
      tabIcon: <ImageIcon className="h-3.5 w-3.5" />,
      items: projectVisualisaties.map((v) => ({
        id: v.id,
        label: v.aangepaste_prompt?.trim() || v.prompt_gebruikt?.slice(0, 40) || `Visualisatie ${new Date(v.created_at).toLocaleDateString('nl-NL')}`,
        icon: <ImageIcon className="h-3.5 w-3.5" style={{ color: '#F15025' }} />,
        onToggle: () => toggleVisualisatie(v),
      })),
    },
  ].filter((c) => c.count > 0)

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

  function handleSchedule() {
    if (!scheduleAt) {
      toast.error('Kies een datum en tijd')
      return
    }
    const when = new Date(scheduleAt)
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast.error('Kies een tijdstip in de toekomst')
      return
    }
    handleSend(when.toISOString())
  }

  async function handleSend(scheduledAt?: string) {
    if (toEmails.length === 0) {
      toast.error('Vul minimaal één ontvanger in')
      return
    }
    if (!subject.trim()) {
      toast.error('Vul een onderwerp in')
      return
    }
    const totaalBytes = bijlagen.reduce((sum, b) => sum + (b.size || 0), 0)
    if (totaalBytes > MAX_BIJLAGEN_TOTAAL_BYTES) {
      toast.error(`Totale bijlagegrootte overschrijdt ${MAX_BIJLAGEN_TOTAAL_BYTES / 1024 / 1024}MB`)
      return
    }
    setIsSending(true)
    // base64-bijlagen worden naar tijdelijke storage geüpload zodat de
    // request-body klein blijft (Vercel ~4.5MB body-limiet). De server downloadt
    // ze en ruimt ze na verzending op (cleanupAfter). tempPaths houdt de
    // geüploade paden bij voor client-side opruimen als verzenden faalt.
    const tempPaths: string[] = []
    try {
      let attachments: Array<{ filename: string; storagePath?: string; bucket?: string; cleanupAfter?: boolean; content?: string; encoding?: 'base64' }>
      try {
        attachments = await Promise.all(
          bijlagen.map(async (b) => {
            if (b.storagePath) {
              return { filename: b.filename, storagePath: b.storagePath, bucket: b.bucket || 'documenten', cleanupAfter: false }
            }
            const base64 = b.base64 || ''
            if (isSupabaseConfigured()) {
              const path = await uploadEmailAttachment(base64ToBlob(base64, b.mimeType), b.filename, userId || 'onbekend')
              tempPaths.push(path)
              return { filename: b.filename, storagePath: path, bucket: 'documenten', cleanupAfter: true }
            }
            return { filename: b.filename, content: base64, encoding: 'base64' as const }
          }),
        )
      } catch (uploadErr) {
        await Promise.allSettled(tempPaths.map((p) => deleteFile(p).catch(() => null)))
        logger.error('Bijlage uploaden mislukt:', uploadErr)
        toast.error(uploadErr instanceof Error ? uploadErr.message : 'Bijlage uploaden mislukt')
        return
      }

      const bodyHtml = markdownNaarHtml(body)
      const signaturImg = handtekeningAfbeelding?.trim()
        ? `<br/><br/><img src="${handtekeningAfbeelding}" alt="Handtekening" style="max-height:${handtekeningAfbeeldingGrootte || 64}px;display:block;"/>`
        : ''
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1A1A1A">${bodyHtml}${signaturImg}</div>`

      const toStr = toEmails.join(', ')
      const sendThreadId = threadId || crypto.randomUUID()
      await sendEmail(toStr, subject.trim(), body, {
        attachments,
        html,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        bcc: bccEmails.length > 0 ? bccEmails.join(', ') : undefined,
        wacht_op_reactie: opvolgen,
        thread_id: sendThreadId,
        scheduledAt: scheduledAt || undefined,
      })

      // Koppel de thread aan dit project zodat het bericht in het gesprek bewaart
      try {
        await koppelEmailAanProject(sendThreadId, project.id)
        setThreadId(sendThreadId)
      } catch (koppelErr) {
        logger.error('Email aan project koppelen mislukt:', koppelErr)
      }

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

      toast.success(scheduledAt
        ? <>Email ingepland<span style={{ color: '#F15025' }}>.</span></>
        : <>Email verstuurd<span style={{ color: '#F15025' }}>.</span></>)
      setBijlagen([])
      setBody(defaultBody)
      setSubject(defaultSubject)
      setCcEmails([])
      setBccEmails([])
      setShowCcBcc(false)
      setOpvolgen(false)
      setScheduleOpen(false)
      setScheduleAt('')
      // Venster open houden + gesprek verversen zodat het verzonden bericht in de thread verschijnt
      loadThread()
    } catch (err) {
      if (tempPaths.length) await Promise.allSettled(tempPaths.map((p) => deleteFile(p).catch(() => null)))
      logger.error('Email verzenden mislukt:', err)
      toast.error('Email kon niet verzonden worden. Controleer SMTP-instellingen.')
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

  const initiaal = (defaultNaam || defaultEmail || '?').trim().charAt(0).toUpperCase()
  const contactEmailLower = (defaultEmail || '').toLowerCase()

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl border border-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-gradient-to-b from-petrol/[0.05] to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-9 w-9 rounded-full bg-petrol text-white text-[13px] font-semibold flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(26,83,92,0.3)]">
            {initiaal}
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-petrol">Nieuw bericht</div>
            <div className="text-[13px] font-semibold text-foreground truncate leading-tight">{defaultNaam || 'Nieuwe ontvanger'}</div>
            {defaultEmail && <div className="text-[11px] text-muted-foreground truncate leading-tight">{defaultEmail}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Mail-composer sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {threadMails.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setThreadOpen((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-1.5 hover:opacity-70 transition-opacity"
            >
              <span className="flex items-center gap-2 text-[11px] font-semibold text-petrol">
                <MessagesSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
                Gesprek
                <span className="font-mono text-[10px] font-medium text-muted-foreground bg-white border border-[#EBEBEB] px-1.5 py-0.5 rounded-full">{threadMails.length}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", threadOpen && "rotate-180")} />
            </button>
            {threadOpen && (
              <div className="max-h-[260px] overflow-y-auto px-1 pb-1 pt-2 space-y-4">
                {[...threadMails].reverse().map((m) => {
                  const incoming = !!contactEmailLower && (m.van || '').toLowerCase().includes(contactEmailLower)
                  const naam = m.from_name || m.van || ''
                  return (
                    <div key={m.id} className={cn("flex items-end gap-2.5", incoming ? "justify-start" : "justify-end")}>
                      {incoming && (
                        <div className="h-7 w-7 rounded-full bg-[#3A6B8C] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[9px] font-bold">{getInitials(naam)}</span>
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[76%] rounded-2xl px-3.5 py-2.5 border",
                        incoming ? "bg-white border-[#EBEBEB] rounded-bl-md" : "bg-petrol/[0.07] border-petrol/10 rounded-br-md",
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-semibold truncate", incoming ? "text-foreground" : "text-petrol")}>{naam}</span>
                          <span className="text-[9px] font-mono flex-shrink-0 text-muted-foreground">{formatThreadDatum(m.datum)}</span>
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap break-words text-foreground">{mailPreview(m) || '(geen tekst)'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border/70 divide-y divide-border/50 overflow-hidden bg-muted/20">
          <div className="flex items-center gap-3 px-3 py-2 min-h-[40px]">
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-[88px] flex-shrink-0 whitespace-nowrap">Aan</label>
            <EmailChipsInput value={toEmails} onChange={setToEmails} placeholder="naam@bedrijf.nl" />
            {!showCcBcc && (
              <button
                type="button"
                onClick={() => setShowCcBcc(true)}
                className="text-[11px] font-medium text-muted-foreground hover:text-petrol transition-colors flex-shrink-0 px-1.5 py-0.5 rounded-md hover:bg-petrol/[0.06]"
              >
                Cc/Bcc
              </button>
            )}
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-3 px-3 py-2 min-h-[40px]">
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-[88px] flex-shrink-0 whitespace-nowrap">Cc</label>
                <EmailChipsInput value={ccEmails} onChange={setCcEmails} placeholder="cc@bedrijf.nl" />
              </div>
              <div className="flex items-center gap-3 px-3 py-2 min-h-[40px]">
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-[88px] flex-shrink-0 whitespace-nowrap">Bcc</label>
                <EmailChipsInput value={bccEmails} onChange={setBccEmails} placeholder="bcc@bedrijf.nl" />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 px-3 py-2 min-h-[40px]">
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground w-[88px] flex-shrink-0 whitespace-nowrap">Onderwerp</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] font-medium text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Body-blok: textarea + handtekening visueel als één 'mailbox' */}
        <div className="rounded-xl border border-border focus-within:border-flame/50 focus-within:ring-2 focus-within:ring-flame/15 transition-all p-3 space-y-2">
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

        {/* Bijlagen-chips */}
        {bijlagen.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bijlagen.map((b) => {
              const accent = bronAccent(b.bron)
              const isImage = b.mimeType.startsWith('image/') && !!b.base64
              return (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border max-w-full animate-in fade-in zoom-in-95 duration-150"
                  style={{ borderColor: accent.border, backgroundColor: accent.bg }}
                >
                  {isImage ? (
                    <img
                      src={`data:${b.mimeType};base64,${b.base64}`}
                      alt={b.filename}
                      className="h-5 w-5 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <span className="flex-shrink-0">{bijlageIcon(b.bron, b.mimeType)}</span>
                  )}
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[160px]">{b.filename}</span>
                  {b.size > 0 && <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{formatBytes(b.size)}</span>}
                  <button
                    type="button"
                    onClick={() => setBijlagen((prev) => prev.filter((x) => x.id !== b.id))}
                    className="h-4 w-4 rounded flex items-center justify-center text-muted-foreground hover:text-[#C03A18] hover:bg-white/70 transition-colors flex-shrink-0"
                    aria-label="Bijlage verwijderen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
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

      {/* Actiebalk: opmaak + toevoegen links · opvolgen + inplannen + versturen rechts */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-border bg-gradient-to-b from-transparent to-petrol/[0.02]">
        <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 border border-border/60 p-0.5">
          <button type="button" onClick={() => wrapSelection('**', '**')} title="Bold" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection('_', '_')} title="Cursief" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => wrapSelection('__', '__')} title="Onderstreept" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <Underline className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button type="button" onClick={insertList} title="Lijst" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={insertLink} title="Link toevoegen" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Eigen bestand toevoegen" className="h-7 w-7 rounded-md flex items-center justify-center text-foreground/70 hover:bg-white hover:text-foreground hover:shadow-sm transition-all">
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </div>

        {pickerLoaded && cats.length > 0 && (
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              title="Toevoegen vanuit project"
              className={cn(
                "flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-[11px] font-semibold border transition-all",
                pickerOpen
                  ? "bg-petrol text-white border-petrol shadow-[0_2px_8px_rgba(26,83,92,0.25)]"
                  : "bg-white text-petrol border-petrol/30 hover:border-petrol/60 hover:bg-petrol/[0.04]",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Toevoegen vanuit project</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", pickerOpen && "rotate-180")} />
            </button>

            {pickerOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-[320px] rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(0,0,0,0.16)] overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-3 py-2 border-b border-border/60 bg-gradient-to-b from-petrol/[0.05] to-transparent">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-petrol">Toevoegen vanuit project</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                  {cats.map((c) => (
                    <div key={c.key}>
                      <div className="sticky top-0 z-10 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground bg-white/95 backdrop-blur-sm">{c.label}</div>
                      {c.items.map((it) => {
                        const added = isToegevoegd(it.id)
                        const busy = bezigItemId === it.id
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={it.onToggle}
                            disabled={busy}
                            className={cn(
                              "group w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors disabled:opacity-60",
                              added ? "bg-petrol/[0.05]" : "hover:bg-petrol/[0.05]",
                            )}
                          >
                            <span className="h-7 w-7 rounded-md border border-border bg-white flex items-center justify-center flex-shrink-0">{it.icon}</span>
                            <span className="flex-1 min-w-0 text-[12px] text-foreground truncate">{it.label}</span>
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-petrol flex-shrink-0" />
                            ) : added ? (
                              <span className="h-5 w-5 rounded-full bg-petrol flex items-center justify-center flex-shrink-0"><Check className="h-3 w-3 text-white" /></span>
                            ) : (
                              <span className="h-5 w-5 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:border-petrol/40 group-hover:text-petrol transition-colors"><Plus className="h-3 w-3" /></span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpvolgen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12px] font-medium border transition-all",
              opvolgen
                ? "bg-petrol/[0.06] text-petrol border-petrol/25"
                : "text-foreground/70 border-transparent hover:bg-muted/60",
            )}
            title="Markeer als 'wacht op reactie' voor opvolging"
          >
            <span className={cn("relative inline-block h-4 w-7 rounded-full transition-colors", opvolgen ? "bg-petrol" : "bg-[#D4D2CC]")}>
              <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all", opvolgen ? "left-3.5" : "left-0.5")} />
            </span>
            Opvolgen
          </button>

          <div className="relative" ref={scheduleRef}>
            <button
              type="button"
              onClick={() => setScheduleOpen((v) => !v)}
              disabled={!canSend}
              title="Later versturen"
              className={cn(
                "h-9 w-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                scheduleOpen ? "bg-petrol text-white border-petrol" : "border-border bg-white text-muted-foreground hover:text-foreground hover:border-petrol/40",
              )}
            >
              <Clock className="h-4 w-4" />
            </button>
            {scheduleOpen && (
              <div className="absolute bottom-full mb-2 right-0 z-50 w-[260px] rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-3 animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-petrol mb-2">Later versturen</div>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="w-full rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-petrol/50 focus:ring-2 focus:ring-petrol/15"
                />
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!scheduleAt || isSending}
                  className="mt-2 w-full h-8 rounded-lg bg-petrol text-white text-[12px] font-semibold hover:bg-[#16454d] transition-colors disabled:opacity-50"
                >
                  Inplannen
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!canSend}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white transition-all min-w-[120px] justify-center active:scale-[0.98]",
              !canSend
                ? "bg-[#9B9B95] cursor-not-allowed"
                : "bg-gradient-to-b from-flame to-[#E04518] shadow-[0_2px_8px_rgba(241,80,37,0.3)] hover:shadow-[0_6px_18px_rgba(241,80,37,0.4)] hover:-translate-y-[1px]"
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
