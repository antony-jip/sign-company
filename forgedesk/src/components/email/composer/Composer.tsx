import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Loader2, Paperclip, Send, Settings, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useFunctie, useFunctieGetal } from '@/hooks/useFunctie'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useVisueleViewport } from '@/hooks/useVisueleViewport'
import { getEmailTemplates, createEmailTemplate, getWachtendeEmailNaarAdres, cancelIngeplandBericht, type EmailTemplate } from '@/services/emailService'
import { verwijderConcept } from '@/services/conceptService'
import { callForgie } from '@/services/forgieService'
import { handtekeningAfbeeldingHtml, handtekeningNaarHtml } from '@/utils/handtekening'
import { sendInBackground } from '@/utils/sendInBackground'
import { logger } from '@/utils/logger'
import { AIContentEditableToolbar } from '@/components/ui/AIContentEditableToolbar'
import { InlineSuggestie } from '@/components/email/InlineSuggestie'
import { MailStatusToast } from '@/components/shared/MailStatusToast'
import { OntvangerChips } from '@/components/shared/OntvangerVeld'
import type { LinkInvoegHandle } from '@/components/shared/LinkInvoegKnop'
import { lijktOpHtml } from '@/components/email/emailHelpers'
import { usePostvakken } from '@/lib/mail/hooks'
import { PostvakKiezer } from '@/components/email/shell/PostvakKiezer'
import type { ComposerBijlage, ComposerDocument, Ontvanger } from '@/lib/mail/types'
import { Editor, type EditorHandle } from './Editor'
import { Werkbalk } from './Werkbalk'
import { VerzendKnop } from './VerzendKnop'
import { BijlagenLijst, CitaatBlok } from './Onderdelen'
import { useAutosave } from './useAutosave'
import { alleenTekst, bestandSleutel, INVOEGVELDEN, isGeldigEmail, metCitaat, ontvangerLabel, splitsCitaat } from './document'
import { bouwVerzending, verstuurPayload, verzendMetBedenktijd } from './verzenden'

export type ComposerVariant = 'inline' | 'paneel' | 'volledig'

export interface ComposerProps {
  /** Inline zonder thread eronder: vult de hoogte van zijn kolom. */
  losstaand?: boolean
  document: ComposerDocument
  /** inline onder een thread, paneel rechts (560 px), volledig op mobiel. */
  variant: ComposerVariant
  onVerzonden: (emailId: string) => void
  onSluiten: () => void
  /** Ongedaan maken, of Bewerken na inplannen: open de composer opnieuw met dit document. */
  onHeropen?: (document: ComposerDocument) => void
}

type Actie =
  | { type: 'patch'; deel: Partial<ComposerDocument> }
  | { type: 'eigenHtml'; html: string }
  | { type: 'citaatWeg' }
  | { type: 'bijlagenToe'; bijlagen: ComposerBijlage[] }
  | { type: 'bijlageWeg'; index: number }

function reducer(doc: ComposerDocument, actie: Actie): ComposerDocument {
  switch (actie.type) {
    case 'patch': return { ...doc, ...actie.deel }
    case 'eigenHtml': return { ...doc, html: metCitaat(actie.html, splitsCitaat(doc.html).citaat) }
    case 'citaatWeg': return { ...doc, html: splitsCitaat(doc.html).eigen }
    case 'bijlagenToe': return { ...doc, bijlagen: [...doc.bijlagen, ...actie.bijlagen] }
    case 'bijlageWeg': return { ...doc, bijlagen: doc.bijlagen.filter((_, i) => i !== actie.index) }
  }
}

const MODUS_LABEL: Record<ComposerDocument['modus'], string> = {
  nieuw: 'Nieuw bericht',
  antwoord: 'Antwoord',
  allen: 'Antwoord aan allen',
  doorsturen: 'Doorsturen',
}

const veldLabelCls = 'w-[64px] md:w-[74px] flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 select-none pt-[3px]'
const veldRijCls = 'flex items-start gap-3 border-b border-border/70 py-2.5 focus-within:border-petrol transition-colors duration-150 min-w-0'
const toolChipCls = 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] text-[12px] font-medium text-foreground/70 border border-border hover:text-petrol hover:border-petrol/30 hover:bg-petrol/[0.05] transition-colors duration-150'
const aiChipCls = 'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] text-[12px] font-semibold text-flame border border-flame/25 bg-flame/[0.06] hover:bg-flame/[0.12] transition-colors duration-150 disabled:opacity-40'
const menuCls = 'absolute left-0 top-full mt-2 bg-white dark:bg-popover dark:border dark:border-white/10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] z-50 py-1.5 overflow-hidden'
const menuItemCls = 'w-full text-left px-4 py-2.5 text-[13px] text-foreground/70 hover:text-foreground hover:bg-background transition-colors truncate'

function dragHeeftBestanden(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files')
}

function MiniSchakelaar({ aan, onChange, label, titel }: { aan: boolean; onChange: (v: boolean) => void; label: string; titel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      title={titel}
      onClick={() => onChange(!aan)}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-1.5 rounded-lg text-[12px] font-medium transition-colors select-none',
        aan ? 'text-petrol' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className={cn('relative inline-block h-4 w-7 rounded-full transition-colors', aan ? 'bg-petrol' : 'bg-[#D4D2CC] dark:bg-white/20')}>
        <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all', aan ? 'left-3.5' : 'left-0.5')} />
      </span>
      {label}
    </button>
  )
}

function IngeplandToast({ label, onBewerk }: { label: string; onBewerk?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-[220px]">
      <MailStatusToast titel="Ingepland" onder={`voor ${label}`} />
      {onBewerk && (
        <button type="button" onClick={onBewerk} className="flex-shrink-0 text-[12px] font-semibold text-petrol hover:text-flame transition-colors">
          Bewerken
        </button>
      )}
    </div>
  )
}

export function Composer({ document: initieel, variant, onVerzonden, onSluiten, onHeropen, losstaand }: ComposerProps) {
  const navigate = useNavigate()
  const isMobiel = useMediaQuery('(max-width: 767px)')
  const venster = useVisueleViewport(variant === 'volledig')
  const { emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, bedrijfsnaam, settings } = useAppSettings()
  const undoAan = useFunctie('mail_undo_verzenden')
  const undoSeconden = useFunctieGetal('mail_undo_seconden')
  const postvakken = usePostvakken()

  const [doc, dispatch] = useReducer(reducer, initieel)
  const docRef = useRef(doc)
  docRef.current = doc
  const [initieelEigen] = useState(() => splitsCitaat(initieel.html).eigen)
  const citaat = useMemo(() => splitsCitaat(doc.html).citaat, [doc.html])

  const editorRef = useRef<HTMLDivElement>(null)
  const editorHandle = useRef<EditorHandle>(null)
  const linkKnopRef = useRef<LinkInvoegHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const aanInputRef = useRef<HTMLInputElement>(null)
  const bestandenRef = useRef(new Map<string, File>())
  const gepauzeerdRef = useRef(false)

  const [toonCc, setToonCc] = useState(initieel.cc.length > 0)
  const [toonBcc, setToonBcc] = useState(initieel.bcc.length > 0)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templateMenu, setTemplateMenu] = useState(false)
  const [templateOpslaan, setTemplateOpslaan] = useState(false)
  const [templateNaam, setTemplateNaam] = useState('')
  const [veldMenu, setVeldMenu] = useState(false)
  const [daanOpen, setDaanOpen] = useState(false)
  const [daanBrief, setDaanBrief] = useState('')
  const [daanBezig, setDaanBezig] = useState(false)
  const [sleept, setSleept] = useState(false)
  const sleepDiepte = useRef(0)
  const [hintMail, setHintMail] = useState<{ id: string; datum: string } | null>(null)
  const [bezig, setBezig] = useState(false)

  const patch = useCallback((deel: Partial<ComposerDocument>) => dispatch({ type: 'patch', deel }), [])

  const { opgeslagenOm, flush, conceptId } = useAutosave(doc, {
    onId: (id) => patch({ id }),
    gepauzeerdRef,
  })

  const handtekeningHtml = useMemo(() => {
    const delen: string[] = []
    if (emailHandtekening) delen.push(handtekeningNaarHtml(emailHandtekening))
    const img = handtekeningAfbeeldingHtml({ url: handtekeningAfbeelding, link: handtekeningAfbeeldingLink, breedte: handtekeningAfbeeldingGrootte })
    if (img) delen.push(img)
    if (!delen.length && bedrijfsnaam) delen.push(bedrijfsnaam)
    return delen.join('<br>')
  }, [emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, bedrijfsnaam])

  useEffect(() => {
    getEmailTemplates().then(setTemplates).catch(() => {})
  }, [])

  // Zonder gekozen postvak gaat het bericht uit het actieve postvak, en anders
  // uit het standaardpostvak. Altijd meesturen: api/send-email leest het zodra
  // migratie 245 gedraaid is.
  useEffect(() => {
    if (docRef.current.accountId) return
    const keuze = postvakken.huidig ?? postvakken.postvakken.find((p) => p.isStandaard) ?? postvakken.postvakken[0]
    if (keuze) patch({ accountId: keuze.id })
  }, [postvakken.huidig, postvakken.postvakken, patch])

  // Focus: bij een nieuw bericht in Aan, bij een antwoord in de tekst.
  useEffect(() => {
    const t = setTimeout(() => {
      if (docRef.current.aan.length === 0) aanInputRef.current?.focus()
      else editorHandle.current?.focus()
    }, 60)
    return () => clearTimeout(t)
  }, [])

  // Sales Inbox: vorige mail naar dit adres wordt al opgevolgd?
  const eersteAdres = doc.aan.length === 1 ? doc.aan[0].email : ''
  useEffect(() => {
    if (!eersteAdres || !isGeldigEmail(eersteAdres)) { setHintMail(null); return }
    let afgebroken = false
    getWachtendeEmailNaarAdres(eersteAdres)
      .then((mail) => { if (!afgebroken) setHintMail(mail ? { id: mail.id, datum: mail.datum } : null) })
      .catch(() => { if (!afgebroken) setHintMail(null) })
    return () => { afgebroken = true }
  }, [eersteAdres])

  // ─── Bijlagen ────────────────────────────────────────────────

  const voegBestandenToe = useCallback((files: File[]) => {
    const nieuw: ComposerBijlage[] = []
    for (const f of files) {
      const sleutel = bestandSleutel(f.name, f.size)
      if (bestandenRef.current.has(sleutel)) continue
      bestandenRef.current.set(sleutel, f)
      nieuw.push({ naam: f.name, grootte: f.size, type: f.type, bron: 'upload' })
    }
    if (nieuw.length) dispatch({ type: 'bijlagenToe', bijlagen: nieuw })
  }, [])

  const verwijderBijlage = useCallback((index: number) => {
    const b = docRef.current.bijlagen[index]
    if (b?.bron === 'upload') bestandenRef.current.delete(bestandSleutel(b.naam, b.grootte))
    dispatch({ type: 'bijlageWeg', index })
  }, [])

  const onDragEnter = (e: React.DragEvent) => { if (!dragHeeftBestanden(e)) return; e.preventDefault(); sleepDiepte.current += 1; setSleept(true) }
  const onDragOver = (e: React.DragEvent) => { if (!dragHeeftBestanden(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  const onDragLeave = (e: React.DragEvent) => { if (!dragHeeftBestanden(e)) return; sleepDiepte.current -= 1; if (sleepDiepte.current <= 0) { sleepDiepte.current = 0; setSleept(false) } }
  const onDrop = (e: React.DragEvent) => {
    sleepDiepte.current = 0
    if (!dragHeeftBestanden(e)) return
    e.preventDefault()
    setSleept(false)
    // Beelden die in de editor vallen komen hier niet: de editor stopt die
    // drop zelf en zet ze inline.
    const files = Array.from(e.dataTransfer.files)
    if (files.length) voegBestandenToe(files)
  }

  // ─── Templates, velden, Daan ─────────────────────────────────

  const pasTemplateToe = (t: EmailTemplate) => {
    if (t.onderwerp) patch({ onderwerp: t.onderwerp })
    const html = lijktOpHtml(t.body) ? t.body : t.body.replace(/\n/g, '<br>')
    editorHandle.current?.vervangInhoud(html)
    setTemplateMenu(false)
  }

  const slaTemplateOp = async () => {
    if (!templateNaam.trim()) { toast.error('Vul een naam in'); return }
    const eigen = splitsCitaat(docRef.current.html).eigen
    if (!alleenTekst(eigen)) { toast.error('Schrijf eerst een bericht'); return }
    try {
      const nieuw = await createEmailTemplate({ naam: templateNaam.trim(), onderwerp: docRef.current.onderwerp, body: eigen })
      setTemplates((prev) => [...prev, nieuw])
      setTemplateNaam('')
      setTemplateOpslaan(false)
      setTemplateMenu(false)
      toast.success('Template opgeslagen')
    } catch {
      toast.error('Template opslaan mislukt')
    }
  }

  const isAntwoord = doc.modus === 'antwoord' || doc.modus === 'allen'
  const replyTekst = useMemo(() => (citaat ? alleenTekst(citaat).slice(0, 6000) : undefined), [citaat])

  const daanSchrijf = async (brief: string) => {
    setDaanBezig(true)
    try {
      const context = isAntwoord && replyTekst
        ? `Antwoord op deze e-mail:\n${replyTekst}`
        : `Onderwerp: ${docRef.current.onderwerp || '(nog geen)'}\nAan: ${docRef.current.aan.map(ontvangerLabel).join(', ') || '(onbekend)'}`
      const response = brief
        ? await callForgie('write-email', brief, context)
        : await callForgie('generate-reply', replyTekst || '')
      if (response?.result) editorHandle.current?.vervangInhoud(response.result.replace(/\n/g, '<br>'))
      setDaanOpen(false)
      setDaanBrief('')
    } catch (err) {
      logger.error('Daan schrijven mislukt:', err)
      toast.error('Daan kon geen tekst maken')
    } finally {
      setDaanBezig(false)
    }
  }

  // ─── Verzenden ───────────────────────────────────────────────

  const valideer = (d: ComposerDocument): boolean => {
    if (d.aan.length === 0) { toast.error('Vul een ontvanger in'); aanInputRef.current?.focus(); return false }
    const fout = [...d.aan, ...d.cc, ...d.bcc].find((o) => !isGeldigEmail(o.email))
    if (fout) { toast.error(`Ongeldig e-mailadres: ${fout.email}`); return false }
    if (!d.onderwerp.trim()) { toast.error('Vul een onderwerp in'); return false }
    return true
  }

  const verzend = useCallback((verzendOp?: string, label?: string) => {
    const d: ComposerDocument = { ...docRef.current, verzendOp }
    if (!valideer(d)) return
    setBezig(true)
    gepauzeerdRef.current = true
    const id = d.id ?? conceptId()
    const ctx = {
      bestanden: new Map(bestandenRef.current),
      handtekeningHtml,
      tekst: editorHandle.current?.leesTekst() || '',
    }
    const naar = d.aan.length > 1 ? `${d.aan.length} ontvangers` : ontvangerLabel(d.aan[0])
    const ruimConceptOp = () => { if (id) verwijderConcept(id).catch((err) => logger.warn('Concept opruimen mislukt:', err)) }
    onSluiten()

    if (verzendOp) {
      let ingeplandId: string | undefined
      sendInBackground(
        async () => {
          const payload = await bouwVerzending(d, ctx)
          ingeplandId = (await verstuurPayload(d, payload)).id
          ruimConceptOp()
          onVerzonden('')
        },
        {
          loading: 'Inplannen',
          success: `Ingepland voor ${label}`,
          error: 'Inplannen mislukt',
          loadingRender: () => <MailStatusToast bezig titel="Inplannen" onder={`voor ${label}`} />,
          successRender: () => (
            <IngeplandToast
              label={label || ''}
              onBewerk={onHeropen ? () => {
                const heropen = () => onHeropen({ ...d, verzendOp: undefined })
                if (!ingeplandId) { heropen(); return }
                cancelIngeplandBericht(ingeplandId).then(heropen).catch(() => toast.error('Inplanning annuleren mislukt'))
              } : undefined}
            />
          ),
        },
      )
      return
    }

    verzendMetBedenktijd(
      async () => {
        const payload = await bouwVerzending(d, ctx)
        const { id: emailId } = await verstuurPayload(d, payload)
        ruimConceptOp()
        onVerzonden(emailId ?? '')
      },
      {
        seconden: undoAan ? undoSeconden : 0,
        onder: naar,
        opvolgen: d.opvolgen,
        onOngedaan: () => onHeropen?.({ ...d, verzendOp: undefined }),
      },
    )
  }, [conceptId, handtekeningHtml, onSluiten, onVerzonden, onHeropen, undoAan, undoSeconden])

  const verwijderDitConcept = async () => {
    gepauzeerdRef.current = true
    const id = doc.id ?? conceptId()
    if (id) {
      try { await verwijderConcept(id) } catch (err) { logger.warn('Concept verwijderen mislukt:', err) }
    }
    toast.success(<>Concept verwijderd<span style={{ color: '#F15025' }}>.</span></>)
    onSluiten()
  }

  const sluit = useCallback(() => {
    void flush()
    onSluiten()
  }, [flush, onSluiten])

  // ─── Toetsen ─────────────────────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); verzend(); return }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); linkKnopRef.current?.open(); return }
    if (e.key === 'Escape') {
      if (templateMenu || veldMenu || daanOpen) { setTemplateMenu(false); setVeldMenu(false); setDaanOpen(false); return }
      e.preventDefault()
      sluit()
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  const kopLabel = MODUS_LABEL[doc.modus]
  const eigenTemplates = templates.filter((t) => !t.is_systeem)
  const systeemTemplates = templates.filter((t) => t.is_systeem)
  const verzendKnopZichtbaar = variant !== 'volledig' || !isMobiel

  const wortelCls = cn(
    'relative flex flex-col min-w-0 [&:focus-visible]:shadow-none',
    // Inline onder een thread groeit mee met de inhoud; als los venster in
    // het leesvenster vult hij de hoogte, met de verzendbalk onderaan.
    variant === 'inline' && (losstaand ? 'flex-1 min-h-0 bg-card' : 'bg-card'),
    variant === 'paneel' && 'fixed top-0 right-0 z-[10000] h-full w-[560px] max-w-[calc(100vw-2rem)] bg-background border-l border-border shadow-[-12px_0_32px_rgba(13,52,60,0.10)]',
    variant === 'volledig' && 'fixed inset-x-0 z-[60] bg-card',
  )
  const wortelStyle = variant === 'volledig'
    ? { top: venster.top, height: venster.hoogte || '100dvh', paddingBottom: venster.toetsenbord > 60 ? 0 : 'env(safe-area-inset-bottom)' }
    : undefined

  return (
    <div
      className={wortelCls}
      style={wortelStyle}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-composer-variant={variant}
    >
      {sleept && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-2 rounded-2xl border-2 border-dashed border-petrol/40 bg-petrol/[0.05] backdrop-blur-[1px]" />
          <div className="relative flex flex-col items-center gap-2 text-petrol dark:text-[#7FB5BF]">
            <div className="h-12 w-12 rounded-2xl bg-card shadow-[0_4px_20px_rgba(26,83,92,0.18)] flex items-center justify-center">
              <Paperclip className="h-5 w-5" />
            </div>
            <p className="text-[14px] font-semibold leading-none">Sleep bestanden hierheen</p>
          </div>
        </div>
      )}

      {/* Kop */}
      {variant === 'inline' && (
        <div className={cn('flex items-center justify-between gap-3 pb-1.5', losstaand ? 'px-4 pt-3' : 'px-1')}>
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-petrol/70 font-semibold whitespace-nowrap">{kopLabel}</span>
            {doc.aan[0] && <span className="text-[12px] text-muted-foreground truncate">aan {ontvangerLabel(doc.aan[0])}{doc.aan.length > 1 ? ` +${doc.aan.length - 1}` : ''}</span>}
          </div>
          <button type="button" onClick={sluit} title="Sluiten (concept blijft bewaard)" className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {variant === 'paneel' && (
        <div className="flex items-center justify-between gap-3 pl-5 pr-2 h-12 border-b border-border/70 flex-shrink-0">
          <h2 className="font-heading text-[16px] font-bold tracking-[-0.01em] text-foreground leading-none truncate">
            {kopLabel}<span className="text-flame">.</span>
          </h2>
          <button type="button" onClick={sluit} title="Sluiten (concept blijft bewaard)" className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {variant === 'volledig' && (
        <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2.5 border-b border-border/60 flex-shrink-0">
          <button type="button" onClick={sluit} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/70 hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Sluiten
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-petrol/70 font-semibold truncate">{kopLabel}</span>
          <button
            type="button"
            onClick={() => verzend()}
            disabled={bezig}
            className="tap-press h-9 pl-3.5 pr-4 rounded-full text-[14px] font-semibold text-white bg-flame shadow-[0_2px_8px_rgba(241,80,37,0.25)] active:scale-[0.96] transition-transform duration-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            {bezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Verzenden
          </button>
        </div>
      )}

      {/* Inhoud · overflow-x dicht: een brede handtekening trok anders het paneel scheef */}
      <div className={cn('min-w-0', (variant !== 'inline' || losstaand) && 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden')}>
        <div className={cn('min-w-0 max-w-full', variant === 'inline' ? (losstaand ? 'px-4' : 'px-1') : 'px-4 md:px-5')}>
          {postvakken.meerdere && (
            <div className={veldRijCls}>
              <span className={veldLabelCls}>Van</span>
              <PostvakKiezer
                postvakken={postvakken.postvakken}
                actief={doc.accountId ?? postvakken.postvakken[0]?.id ?? 'alle'}
                onKies={(keuze) => { if (keuze !== 'alle') patch({ accountId: keuze }) }}
                metAlle={false}
                className="min-w-0 flex-1"
              />
            </div>
          )}
          <div className={veldRijCls}>
            <span className={veldLabelCls}>Aan</span>
            <OntvangerChips
              value={doc.aan}
              onChange={(aan: Ontvanger[]) => patch({ aan })}
              placeholder="naam@bedrijf.nl"
              inputRef={aanInputRef}
              rechts={(
                <span className="flex items-center gap-1 flex-shrink-0 ml-auto pl-2 self-start pt-0.5">
                  {!toonCc && <button type="button" onClick={() => setToonCc(true)} className="text-[11px] font-medium text-muted-foreground hover:text-petrol px-1 transition-colors">Cc</button>}
                  {!toonBcc && <button type="button" onClick={() => setToonBcc(true)} className="text-[11px] font-medium text-muted-foreground hover:text-petrol px-1 transition-colors">Bcc</button>}
                </span>
              )}
            />
          </div>
          {toonCc && (
            <div className={veldRijCls}>
              <span className={veldLabelCls}>Cc</span>
              <OntvangerChips value={doc.cc} onChange={(cc) => patch({ cc })} placeholder="kopie naar" />
            </div>
          )}
          {toonBcc && (
            <div className={veldRijCls}>
              <span className={veldLabelCls}>Bcc</span>
              <OntvangerChips value={doc.bcc} onChange={(bcc) => patch({ bcc })} placeholder="blinde kopie naar" />
            </div>
          )}

          {hintMail && !doc.opvolgen && (() => {
            const dagen = Math.max(0, Math.round((Date.now() - Date.parse(hintMail.datum)) / 86400000))
            return (
              <div className="my-2 px-3 py-2 rounded-lg bg-[#E8EEF9] dark:bg-blue-900/20 text-[12px] text-[#3A5A9A] dark:text-blue-200 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Vorige mail naar dit adres wordt al opgevolgd ({dagen === 0 ? 'vandaag' : `${dagen} ${dagen === 1 ? 'dag' : 'dagen'} geleden`}).</span>
                <button type="button" onClick={() => patch({ opvolgen: true })} className="font-semibold underline underline-offset-2">Ook deze opvolgen</button>
              </div>
            )
          })()}

          <div className={veldRijCls}>
            <span className={veldLabelCls}>Onderwerp</span>
            <input
              value={doc.onderwerp}
              onChange={(e) => patch({ onderwerp: e.target.value })}
              className="w-full bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground min-w-0"
              placeholder="Waar gaat het over?"
            />
          </div>

          {/* Gereedschap */}
          <div className="flex items-center gap-1.5 py-2.5 flex-wrap">
            <div className="relative">
              <button type="button" onClick={() => setTemplateMenu((v) => !v)} className={toolChipCls}>
                Template
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {templateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setTemplateMenu(false); setTemplateOpslaan(false) }} />
                  <div className={cn(menuCls, 'w-64 max-h-[360px] overflow-y-auto')}>
                    {eigenTemplates.length === 0 && systeemTemplates.length === 0 && (
                      <p className="px-4 py-3 text-[12px] text-muted-foreground">Geen templates. Maak er een aan in Instellingen.</p>
                    )}
                    {eigenTemplates.map((t) => (
                      <button key={t.id} type="button" onClick={() => pasTemplateToe(t)} className={menuItemCls}>{t.naam}</button>
                    ))}
                    {systeemTemplates.length > 0 && (
                      <>
                        <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Systeem</p>
                        {systeemTemplates.map((t) => (
                          <button key={t.id} type="button" onClick={() => pasTemplateToe(t)} className={menuItemCls}>{t.naam}</button>
                        ))}
                      </>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      {!templateOpslaan ? (
                        <button type="button" onClick={() => setTemplateOpslaan(true)} className="w-full text-left px-4 py-2.5 text-[13px] text-petrol hover:bg-background transition-colors">
                          Huidig bericht opslaan als template
                        </button>
                      ) : (
                        <div className="px-3 py-2 space-y-2">
                          <input
                            type="text"
                            value={templateNaam}
                            onChange={(e) => setTemplateNaam(e.target.value)}
                            placeholder="Naam van template"
                            className="w-full px-2.5 py-1.5 text-[13px] bg-background rounded-lg border border-border outline-none focus:border-petrol"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void slaTemplateOp() } }}
                          />
                          <button type="button" onClick={() => void slaTemplateOp()} className="w-full py-1.5 rounded-lg bg-petrol text-white text-[12px] font-medium hover:opacity-90">Opslaan</button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setTemplateMenu(false); sluit(); navigate('/instellingen?tab=email&sub=templates') }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-muted-foreground hover:text-foreground/70 hover:bg-background transition-colors flex items-center gap-2"
                      >
                        <Settings className="h-3 w-3" />
                        Templates beheren
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => setVeldMenu((v) => !v)} className={toolChipCls}>
                Veld invoegen
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {veldMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setVeldMenu(false)} />
                  <div className={cn(menuCls, 'w-48')}>
                    {INVOEGVELDEN.map((v) => (
                      <button
                        key={v.sleutel}
                        type="button"
                        onClick={() => { setVeldMenu(false); editorHandle.current?.voegTekstIn(`{{${v.sleutel}}}`) }}
                        className={menuItemCls}
                      >
                        {v.label}
                      </button>
                    ))}
                    <p className="px-4 pt-1.5 pb-1 text-[11px] text-muted-foreground">Ingevuld bij verzenden uit klant, project of offerte.</p>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => setDaanOpen((v) => !v)} disabled={daanBezig} className={aiChipCls}>
                {daanBezig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {isAntwoord ? 'Beantwoord met Daan' : 'Schrijf met Daan'}
              </button>
              {daanOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDaanOpen(false)} />
                  <div className={cn(menuCls, 'w-[340px] max-w-[calc(100vw-2rem)] p-3.5 space-y-2.5')}>
                    <p className="text-[13px] font-semibold text-foreground">{isAntwoord ? 'Wat wil je antwoorden?' : 'Wat voor mail wil je schrijven?'}</p>
                    <textarea
                      value={daanBrief}
                      onChange={(e) => setDaanBrief(e.target.value)}
                      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void daanSchrijf(daanBrief.trim()) } }}
                      rows={3}
                      autoFocus
                      placeholder={isAntwoord ? 'Bijv. bevestig de afspraak en vraag om het leveradres. Leeg laten: Daan antwoordt op de mail zelf.' : 'Bijv. offerte opvolgen, vriendelijk, kort, vraag of er nog vragen zijn.'}
                      className="w-full text-[13px] text-foreground bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-petrol resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setDaanOpen(false)} className="text-[12px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg transition-colors">Annuleren</button>
                      <button
                        type="button"
                        onClick={() => void daanSchrijf(daanBrief.trim())}
                        disabled={daanBezig || (!isAntwoord && !daanBrief.trim())}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-flame hover:bg-[#D9421C] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Sparkles className="h-3 w-3" />
                        Schrijf
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {handtekeningHtml && (
              <div className="ml-auto">
                <MiniSchakelaar aan={doc.handtekening} onChange={(v) => patch({ handtekening: v })} label="Handtekening" titel="Handtekening onder het bericht" />
              </div>
            )}
          </div>

          <Editor
            ref={editorHandle}
            editorRef={editorRef}
            initieelHtml={initieelEigen}
            onChange={(html) => dispatch({ type: 'eigenHtml', html })}
            placeholder={isAntwoord ? 'Schrijf je antwoord...' : 'Schrijf je bericht...'}
            minHoogteClass={losstaand ? 'min-h-[280px]' : variant === 'inline' ? 'min-h-[160px]' : 'min-h-[240px]'}
            className="py-2"
          />
          <AIContentEditableToolbar editorRef={editorRef} onContentChange={() => dispatch({ type: 'eigenHtml', html: editorRef.current?.innerHTML || '' })} />
          <InlineSuggestie
            editorRef={editorRef}
            actief={!daanBezig}
            onderwerp={doc.onderwerp}
            ontvanger={doc.aan[0]?.email}
            replyTekst={replyTekst}
            schrijfstijl={settings.ai_tone_of_voice}
          />

          {doc.handtekening && handtekeningHtml && (
            <div
              className="mt-2 pt-3 border-t border-dashed border-border/70 text-[13px] leading-[1.55] text-foreground/60 min-w-0 max-w-full break-words [&_*]:max-w-full [&_img]:h-auto [&_table]:!w-auto [&_a]:text-petrol/70"
              title="Handtekening uit je instellingen"
              dangerouslySetInnerHTML={{ __html: handtekeningHtml }}
            />
          )}

          <CitaatBlok citaat={citaat} onVerwijder={() => dispatch({ type: 'citaatWeg' })} />

          <BijlagenLijst bijlagen={doc.bijlagen} bestanden={bestandenRef.current} onVerwijder={verwijderBijlage} />
          <div className="h-3" />
        </div>
      </div>

      {/* Voet */}
      <div className={cn('flex items-center justify-between gap-2 py-2 border-t border-border/60 flex-shrink-0', variant === 'inline' ? (losstaand ? 'px-4' : 'px-1') : 'px-3 md:px-4')}>
        <Werkbalk
          ref={linkKnopRef}
          editorRef={editorRef}
          onGewijzigd={() => dispatch({ type: 'eigenHtml', html: editorRef.current?.innerHTML || '' })}
          onBijlage={() => fileInputRef.current?.click()}
          className="flex-1 md:flex-none"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { voegBestandenToe(Array.from(e.target.files || [])); e.target.value = '' }}
        />
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <MiniSchakelaar aan={doc.opvolgen} onChange={(v) => patch({ opvolgen: v })} label="Opvolgen" titel="Deze mail opvolgen als er geen reactie komt" />
          {opgeslagenOm && (
            <span className="hidden sm:block text-[11px] text-muted-foreground/70 font-mono tabular-nums whitespace-nowrap">
              Opgeslagen {opgeslagenOm.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {verzendKnopZichtbaar && (
            <VerzendKnop
              onVerzend={() => verzend()}
              onPlan={(iso, label) => verzend(iso, label)}
              onConceptVerwijderen={() => void verwijderDitConcept()}
              bezig={bezig}
            />
          )}
        </div>
      </div>
    </div>
  )
}
