import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Send, Clock, Code2, Eye, Sparkles, ImagePlus, FlaskConical, RefreshCw, LayoutGrid, Users, ClipboardCheck,
  Check, AlertTriangle, AlertCircle, CheckCircle2, ExternalLink, ChevronRight, Wand2, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  updateConcept, verstuurNieuwsbrief, verstuurTest, genereerMetDaan, genereerBlokkenMetDaan, stelOnderwerpenVoor, uploadAfbeelding,
  type Nieuwsbrief, type OntvangerSelectie, STANDAARD_SELECTIE,
} from '@/services/nieuwsbriefService'
import { BlokBouwer } from './BlokBouwer'
import { OntvangerKiezer } from './OntvangerKiezer'
import { NieuwsbriefPreview } from './NieuwsbriefPreview'
import { buildPreviewHtml } from './nieuwsbriefShell'
import { beoordeelNieuwsbrief, telFouten, verzamelLinks, type Bevinding } from './nieuwsbriefKwaliteit'
import {
  type NieuwsbriefDocument, normaliseerDocument, renderDocument, leegDocument, maakBlok, STANDAARD_STIJL, type HtmlBlok,
} from './nieuwsbriefBlokken'

interface Props {
  nieuwsbrief: Nieuwsbrief
  onTerug: () => void
  onGewijzigd: (n: Nieuwsbrief) => void
  startMetDaan?: boolean
}

type Stap = 'ontwerp' | 'ontvangers' | 'controle'
const STAPPEN: { key: Stap; label: string; Icon: typeof Users }[] = [
  { key: 'ontwerp', label: 'Ontwerp', Icon: LayoutGrid },
  { key: 'ontvangers', label: 'Ontvangers', Icon: Users },
  { key: 'controle', label: 'Controle', Icon: ClipboardCheck },
]

const STATUS_LABEL: Record<Nieuwsbrief['status'], string> = { concept: 'Concept', gepland: 'Gepland', verzonden: 'Verzonden' }
const AFZENDER = 'Sign Company'

const KNOP_SECUNDAIR = 'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-petrol/50 hover:bg-background disabled:opacity-60'
const KNOP_PRIMAIR = 'inline-flex items-center gap-2 rounded-xl bg-flame px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0'
const INPUT = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-petrol focus:ring-2 focus:ring-petrol/10 dark:focus:border-white/25 dark:focus:ring-white/10'

function toLocalInputWaarde(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function NieuwsbriefEditor({ nieuwsbrief, onTerug, onGewijzigd, startMetDaan }: Props) {
  const [onderwerp, setOnderwerp] = useState(nieuwsbrief.onderwerp)
  const [preheader, setPreheader] = useState(nieuwsbrief.preheader || '')
  const [modus, setModus] = useState<'blokken' | 'html'>(nieuwsbrief.editor_modus || 'html')
  const [doc, setDoc] = useState<NieuwsbriefDocument>(() => normaliseerDocument(nieuwsbrief.blokken))
  const [html, setHtml] = useState(nieuwsbrief.html)
  const [selectie, setSelectie] = useState<OntvangerSelectie>(nieuwsbrief.ontvangers ?? STANDAARD_SELECTIE)
  const [aantalOntvangers, setAantalOntvangers] = useState<number | null>(null)
  const [testVerstuurdOp, setTestVerstuurdOp] = useState<string | null>(nieuwsbrief.test_verstuurd_op)
  const [stap, setStap] = useState<Stap>('ontwerp')
  const [ontwerpWeergave, setOntwerpWeergave] = useState<'bouwen' | 'preview'>('bouwen')
  const [opslaanStatus, setOpslaanStatus] = useState<'schoon' | 'vuil' | 'bezig' | 'fout'>('schoon')
  const [laatstOpgeslagen, setLaatstOpgeslagen] = useState<Date | null>(null)

  const [bezig, setBezig] = useState(false)
  const [testBezig, setTestBezig] = useState(false)
  const [testNaar, setTestNaar] = useState('')
  const [inplanOpen, setInplanOpen] = useState(false)
  const [inplanMoment, setInplanMoment] = useState('')
  const [bevestigOpen, setBevestigOpen] = useState<null | { scheduledAt?: string }>(null)

  const [aiOpen, setAiOpen] = useState(!!startMetDaan)
  const [aiBrief, setAiBrief] = useState('')
  const [aiAfbeeldingen, setAiAfbeeldingen] = useState('')
  const [aiBezig, setAiBezig] = useState(false)
  const [uploadBezig, setUploadBezig] = useState(false)
  const [onderwerpBezig, setOnderwerpBezig] = useState(false)
  const [onderwerpSuggesties, setOnderwerpSuggesties] = useState<{ onderwerp: string; preheader: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const htmlRef = useRef<HTMLTextAreaElement>(null)

  const vergrendeld = nieuwsbrief.status !== 'concept'

  const gerenderd = useMemo(() => (modus === 'blokken' ? renderDocument(doc) : html), [modus, doc, html])
  const stijl = modus === 'blokken' ? doc.stijl : STANDAARD_STIJL
  const previewHtml = useMemo(() => buildPreviewHtml(gerenderd, stijl, { preheader, leegTekst: 'Nog geen inhoud. Voeg blokken toe of laat Daan schrijven.' }), [gerenderd, stijl, preheader])

  // ── Autosave ──
  const eersteRender = useRef(true)
  const opslaanTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slaOp = useCallback(async () => {
    if (vergrendeld) return
    setOpslaanStatus('bezig')
    try {
      const bijgewerkt = await updateConcept(nieuwsbrief.id, {
        onderwerp, preheader: preheader || null, html: gerenderd, blokken: modus === 'blokken' ? doc : null,
        editor_modus: modus, ontvangers: selectie, test_verstuurd_op: testVerstuurdOp,
      })
      onGewijzigd(bijgewerkt)
      setOpslaanStatus('schoon')
      setLaatstOpgeslagen(new Date())
    } catch (err) {
      setOpslaanStatus('fout')
      console.error('[nieuwsbrief] autosave mislukt:', err)
    }
  }, [vergrendeld, nieuwsbrief.id, onderwerp, preheader, gerenderd, modus, doc, selectie, testVerstuurdOp, onGewijzigd])

  const slaOpRef = useRef(slaOp)
  useEffect(() => { slaOpRef.current = slaOp }, [slaOp])

  useEffect(() => {
    if (eersteRender.current) { eersteRender.current = false; return }
    if (vergrendeld) return
    setOpslaanStatus('vuil')
    if (opslaanTimer.current) clearTimeout(opslaanTimer.current)
    opslaanTimer.current = setTimeout(() => slaOpRef.current(), 1200)
    return () => { if (opslaanTimer.current) clearTimeout(opslaanTimer.current) }
  }, [onderwerp, preheader, gerenderd, modus, doc, selectie, testVerstuurdOp, vergrendeld])

  useEffect(() => () => {
    if (opslaanTimer.current) { clearTimeout(opslaanTimer.current); slaOpRef.current() }
  }, [])

  const forceerOpslaan = useCallback(async () => {
    if (opslaanTimer.current) clearTimeout(opslaanTimer.current)
    await slaOpRef.current()
  }, [])

  // ── Modus wisselen ──
  const wisselModus = useCallback((naar: 'blokken' | 'html') => {
    if (naar === modus) return
    if (naar === 'html') {
      if (doc.blokken.length > 0 && !window.confirm('Je werkt verder in HTML. De blokken worden omgezet naar code; terug naar blokken kan daarna alleen als één HTML-blok. Doorgaan?')) return
      setHtml(renderDocument(doc))
      setModus('html')
    } else {
      const nieuw = leegDocument()
      if (html.trim()) nieuw.blokken = [{ ...(maakBlok('html') as HtmlBlok), html }]
      setDoc(nieuw)
      setModus('blokken')
    }
  }, [modus, doc, html])

  // ── Daan ──
  const handleGenereer = useCallback(async () => {
    if (!aiBrief.trim()) { toast.error('Geef een korte briefing op'); return }
    setAiBezig(true)
    try {
      const urls = aiAfbeeldingen.split('\n').map(s => s.trim()).filter(Boolean)
      if (modus === 'blokken') {
        const blokken = await genereerBlokkenMetDaan(aiBrief.trim(), urls)
        const nieuw = normaliseerDocument({ versie: 1, stijl: doc.stijl, blokken })
        if (nieuw.blokken.length === 0) throw new Error('Daan gaf geen bruikbare blokken terug')
        setDoc(nieuw)
      } else {
        setHtml(await genereerMetDaan(aiBrief.trim(), urls))
      }
      setAiOpen(false)
      setOntwerpWeergave('bouwen')
      toast.success('Daan heeft een concept gemaakt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI-generatie mislukt')
      console.error('[nieuwsbrief] AI-generatie mislukt:', err)
    } finally {
      setAiBezig(false)
    }
  }, [aiBrief, aiAfbeeldingen, modus, doc.stijl])

  const handleOnderwerpen = useCallback(async () => {
    setOnderwerpBezig(true)
    try {
      const s = await stelOnderwerpenVoor(gerenderd, onderwerp)
      setOnderwerpSuggesties(s)
      if (s.length === 0) toast.error('Daan had geen voorstel')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Voorstellen mislukt')
    } finally {
      setOnderwerpBezig(false)
    }
  }, [gerenderd, onderwerp])

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadBezig(true)
    try {
      const nieuweUrls: string[] = []
      for (const file of Array.from(files)) {
        try { nieuweUrls.push(await uploadAfbeelding(file)) } catch (err) { toast.error(err instanceof Error ? err.message : `Upload van ${file.name} mislukt`) }
      }
      if (nieuweUrls.length > 0) {
        setAiAfbeeldingen(prev => [prev.trim(), ...nieuweUrls].filter(Boolean).join('\n'))
        toast.success(`${nieuweUrls.length} foto${nieuweUrls.length > 1 ? "'s" : ''} geüpload`)
      }
    } finally {
      setUploadBezig(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  // ── Test & verzenden ──
  const handleTest = useCallback(async () => {
    if (!gerenderd.trim()) { toast.error('De nieuwsbrief is nog leeg'); return }
    setTestBezig(true)
    try {
      const naar = await verstuurTest(onderwerp.trim() || 'Test nieuwsbrief', gerenderd, preheader.trim() || undefined, testNaar.trim() || undefined, stijl)
      setTestVerstuurdOp(new Date().toISOString())
      toast.success(`Testmail verstuurd naar ${naar}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test versturen mislukt')
    } finally {
      setTestBezig(false)
    }
  }, [gerenderd, onderwerp, preheader, testNaar, stijl])

  const doeVerzend = useCallback(async (scheduledAt?: string) => {
    setBezig(true)
    try {
      await forceerOpslaan()
      const r = await verstuurNieuwsbrief(nieuwsbrief.id, onderwerp.trim(), gerenderd, preheader.trim() || undefined, scheduledAt, selectie, stijl)
      if (r.nieuwsbrief) onGewijzigd(r.nieuwsbrief)
      toast.success(r.status === 'gepland' ? `Ingepland voor ${r.aantalOntvangers} ontvangers` : `Verzonden naar ${r.aantalOntvangers} ontvangers`)
      setBevestigOpen(null)
      onTerug()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verzenden mislukt')
      console.error('[nieuwsbrief] verzenden mislukt:', err)
    } finally {
      setBezig(false)
    }
  }, [forceerOpslaan, nieuwsbrief.id, onderwerp, gerenderd, preheader, selectie, stijl, onGewijzigd, onTerug])

  const bevindingen = useMemo<Bevinding[]>(() => beoordeelNieuwsbrief({ onderwerp, preheader, html: gerenderd, aantalOntvangers, testVerstuurd: !!testVerstuurdOp }), [onderwerp, preheader, gerenderd, aantalOntvangers, testVerstuurdOp])
  const fouten = telFouten(bevindingen)
  const links = useMemo(() => verzamelLinks(gerenderd), [gerenderd])

  const vraagBevestiging = useCallback((scheduledAt?: string) => {
    if (fouten > 0) { toast.error('Los eerst de rode punten in de controle op'); setStap('controle'); return }
    setBevestigOpen({ scheduledAt })
  }, [fouten])

  const handleInplan = useCallback(() => {
    if (!inplanMoment) { toast.error('Kies een datum en tijd'); return }
    const dt = new Date(inplanMoment)
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now() + 60_000) { toast.error('Kies een moment in de toekomst'); return }
    vraagBevestiging(dt.toISOString())
  }, [inplanMoment, vraagBevestiging])

  const opslaanTekst = opslaanStatus === 'bezig' ? 'Opslaan...' : opslaanStatus === 'vuil' ? 'Niet opgeslagen' : opslaanStatus === 'fout' ? 'Opslaan mislukt' : laatstOpgeslagen ? `Opgeslagen ${laatstOpgeslagen.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : 'Opgeslagen'

  const stapIndex = STAPPEN.findIndex(s => s.key === stap)

  return (
    <div className="flex h-full flex-col -m-3 sm:-m-4 md:-m-6">

      <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <button type="button" onClick={onTerug} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Terug">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-extrabold tracking-[-0.5px] text-foreground">
            {onderwerp.trim() || 'Nieuwe nieuwsbrief'}<span className="text-flame">.</span>
          </h1>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {vergrendeld ? <StatusBadge status={nieuwsbrief.status} label={STATUS_LABEL[nieuwsbrief.status]} /> : (
              <span className={cn('inline-flex items-center gap-1', opslaanStatus === 'fout' && 'text-[#C0451A]')}>
                {opslaanStatus === 'bezig' ? <RefreshCw className="h-3 w-3 animate-spin" /> : opslaanStatus === 'schoon' ? <Check className="h-3 w-3 text-[#2E7D5B]" /> : null}
                {opslaanTekst}
              </span>
            )}
          </div>
        </div>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {STAPPEN.map((s, i) => {
            const actief = s.key === stap
            const klaar = i < stapIndex
            return (
              <button key={s.key} type="button" onClick={() => setStap(s.key)} className={cn('inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors', actief ? 'bg-petrol text-white dark:bg-white/15 dark:text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold', actief ? 'bg-white/20' : klaar ? 'bg-[#2E7D5B]/15 text-[#2E7D5B]' : 'bg-muted text-muted-foreground')}>{klaar ? <Check className="h-3 w-3" /> : i + 1}</span>
                {s.label}
                {s.key === 'controle' && fouten > 0 && <span className="rounded-full bg-[#C0451A] px-1.5 text-[10px] font-bold text-white">{fouten}</span>}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {stap !== 'controle' ? (
            <button type="button" onClick={() => setStap(stapIndex === 0 ? 'ontvangers' : 'controle')} className={cn(KNOP_PRIMAIR, 'px-4')}>
              Volgende <ChevronRight className="h-4 w-4" />
            </button>
          ) : !vergrendeld && (
            <button type="button" onClick={() => vraagBevestiging()} disabled={bezig} className={KNOP_PRIMAIR}>
              <Send className="h-4 w-4" /> Verstuur nu
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 px-3 py-2 md:hidden">
        {STAPPEN.map((s, i) => (
          <button key={s.key} type="button" onClick={() => setStap(s.key)} className={cn('inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium', stap === s.key ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground')}>
            <span className="font-mono text-[11px]">{i + 1}</span> {s.label}
          </button>
        ))}
      </div>

      {vergrendeld && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-petrol/[0.05] px-4 py-2 text-[13px] text-foreground md:px-6">
          <Lock className="h-4 w-4 text-petrol" />
          {nieuwsbrief.status === 'gepland'
            ? <>Ingepland voor <strong>{nieuwsbrief.gepland_op ? formatDateTime(nieuwsbrief.gepland_op) : 'later'}</strong>. Wijzigen kan niet meer; dupliceer ’m in de lijst als je iets wilt aanpassen.</>
            : <>Deze nieuwsbrief is verzonden en kan niet meer worden aangepast.</>}
        </div>
      )}

      {stap === 'ontwerp' && (
        <>
          <div className="border-b border-border/60 px-4 py-3 md:px-6">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
              <div className="relative">
                <input
                  value={onderwerp}
                  onChange={e => setOnderwerp(e.target.value)}
                  placeholder="Onderwerp van je nieuwsbrief"
                  disabled={vergrendeld}
                  maxLength={150}
                  className="w-full bg-transparent pr-28 text-[17px] font-bold tracking-[-0.01em] text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50 disabled:opacity-70"
                />
                {!vergrendeld && (
                  <button type="button" onClick={handleOnderwerpen} disabled={onderwerpBezig || !gerenderd.trim()} title="Laat Daan onderwerpregels voorstellen" className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-petrol transition-colors hover:border-petrol/50 disabled:opacity-50 dark:text-foreground">
                    {onderwerpBezig ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Stel voor
                  </button>
                )}
                <span className={cn('absolute -bottom-3.5 right-0 font-mono text-[10px] tabular-nums', onderwerp.length > 60 ? 'text-[#C0451A]' : 'text-muted-foreground/60')}>{onderwerp.length}/60</span>
              </div>
              <input
                value={preheader}
                onChange={e => setPreheader(e.target.value)}
                placeholder="Preheader: de regel naast het onderwerp in de inbox (optioneel)"
                disabled={vergrendeld}
                maxLength={200}
                className="w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-70 md:self-center"
              />
            </div>
            {onderwerpSuggesties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {onderwerpSuggesties.map((s, i) => (
                  <button key={i} type="button" onClick={() => { setOnderwerp(s.onderwerp); setPreheader(s.preheader); setOnderwerpSuggesties([]) }} className="group rounded-xl border border-petrol/25 bg-petrol/[0.04] px-3 py-2 text-left transition-colors hover:bg-petrol/[0.1] dark:border-white/15 dark:bg-white/[0.04]">
                    <span className="block text-[13px] font-semibold text-foreground">{s.onderwerp}</span>
                    <span className="block text-[11px] text-muted-foreground">{s.preheader}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setOnderwerpSuggesties([])} className="self-center text-[12px] text-muted-foreground hover:text-foreground">Sluiten</button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2 md:px-6">
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button type="button" onClick={() => wisselModus('blokken')} disabled={vergrendeld} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', modus === 'blokken' ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}><LayoutGrid className="h-4 w-4" /> Blokken</button>
              <button type="button" onClick={() => wisselModus('html')} disabled={vergrendeld} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', modus === 'html' ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}><Code2 className="h-4 w-4" /> HTML</button>
            </div>
            {!vergrendeld && (
              <button type="button" onClick={() => setAiOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-petrol/25 bg-petrol/[0.06] px-3 py-1.5 text-[13px] font-semibold text-petrol transition-all hover:bg-petrol/[0.1] dark:border-white/15 dark:bg-white/[0.05] dark:text-foreground">
                <Sparkles className="h-4 w-4" /> Laat Daan schrijven
              </button>
            )}
            {modus === 'blokken' && (
              <div className="ml-auto inline-flex rounded-lg border border-border bg-card p-0.5">
                <button type="button" onClick={() => setOntwerpWeergave('bouwen')} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', ontwerpWeergave === 'bouwen' ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}>Bouwen</button>
                <button type="button" onClick={() => setOntwerpWeergave('preview')} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', ontwerpWeergave === 'preview' ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground hover:text-foreground')}><Eye className="h-4 w-4" /> Preview</button>
              </div>
            )}
          </div>

          {modus === 'blokken' ? (
            ontwerpWeergave === 'bouwen'
              ? <BlokBouwer document={doc} onChange={setDoc} disabled={vergrendeld} />
              : <NieuwsbriefPreview html={previewHtml} afzender={AFZENDER} onderwerp={onderwerp} preheader={preheader} className="min-h-0 flex-1" />
          ) : (
            <div className="grid min-h-0 flex-1 md:grid-cols-2">
              <div className="flex min-h-0 flex-col border-border md:border-r">
                <div className="flex items-center gap-2 px-4 pt-2 md:px-6">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">HTML</span>
                  {!vergrendeld && (
                    <div className="ml-auto flex items-center gap-1">
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">Personaliseer:</span>
                      {[['+ Voornaam', '{{{contact.first_name|daar}}}'], ['+ Achternaam', '{{{contact.last_name|}}}']].map(([label, tag]) => (
                        <button key={tag} type="button" onClick={() => {
                          const el = htmlRef.current
                          if (!el) { setHtml(p => p + tag); return }
                          const s = el.selectionStart ?? html.length, e = el.selectionEnd ?? html.length
                          setHtml(html.slice(0, s) + tag + html.slice(e))
                          requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + tag.length, s + tag.length) })
                        }} className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-petrol transition-colors hover:border-petrol/50 dark:text-foreground">{label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  ref={htmlRef}
                  value={html}
                  onChange={e => setHtml(e.target.value)}
                  disabled={vergrendeld}
                  spellCheck={false}
                  placeholder={'Plak of schrijf hier je HTML.\n\n<h1>Nieuw bij Sign Company</h1>\n<p>Beste relatie, ...</p>'}
                  className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-70 md:px-6"
                />
              </div>
              <NieuwsbriefPreview html={previewHtml} afzender={AFZENDER} onderwerp={onderwerp} preheader={preheader} className="hidden min-h-0 md:flex" />
            </div>
          )}
        </>
      )}

      {stap === 'ontvangers' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <OntvangerKiezer selectie={selectie} onChange={setSelectie} onTelling={setAantalOntvangers} disabled={vergrendeld} />
        </div>
      )}

      {stap === 'controle' && (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,44%)]">
          <div className="min-h-0 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-2xl space-y-6">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-[-0.3px] text-foreground">Laatste controle<span className="text-flame">.</span></h2>
                <p className="mt-1 text-[13px] text-muted-foreground">{fouten > 0 ? `${fouten} punt${fouten > 1 ? 'en' : ''} moet${fouten > 1 ? 'en' : ''} eerst opgelost worden.` : 'Geen blokkades. Oranje punten zijn adviezen.'}</p>
              </div>

              <div className="doen-slate-surface divide-y divide-border/60 rounded-2xl">
                {bevindingen.map((b, i) => {
                  const Icon = b.ernst === 'fout' ? AlertCircle : b.ernst === 'let_op' ? AlertTriangle : CheckCircle2
                  const kleur = b.ernst === 'fout' ? '#C0451A' : b.ernst === 'let_op' ? '#B7791F' : '#2E7D5B'
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: kleur }} />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-foreground">{b.titel}</div>
                        <div className="text-[12px] leading-relaxed text-muted-foreground">{b.uitleg}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="doen-slate-surface rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-petrol" />
                  <span className="text-[14px] font-bold text-foreground">Testmail<span className="text-flame">.</span></span>
                  {testVerstuurdOp && <span className="ml-auto text-[12px] text-muted-foreground">laatst {formatDateTime(testVerstuurdOp)}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input value={testNaar} onChange={e => setTestNaar(e.target.value)} placeholder="Naar jezelf, of vul een ander adres in" type="email" className={cn(INPUT, 'min-w-[220px] flex-1')} />
                  <button type="button" onClick={handleTest} disabled={testBezig} className={KNOP_SECUNDAIR}>
                    {testBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-petrol" />} Stuur test
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground">Het onderwerp krijgt [TEST] ervoor, merge-tags worden met voorbeeldnamen gevuld.</p>
              </div>

              {links.length > 0 && (
                <div className="doen-slate-surface rounded-2xl">
                  <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                    <ExternalLink className="h-4 w-4 text-petrol" />
                    <span className="text-[14px] font-bold text-foreground">Links in deze mail<span className="text-flame">.</span></span>
                    <span className="ml-auto font-mono text-[12px] tabular-nums text-muted-foreground">{links.length}</span>
                  </div>
                  <div className="max-h-64 divide-y divide-border/40 overflow-y-auto">
                    {links.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', l.probleem ? 'bg-[#C0451A]' : 'bg-[#2E7D5B]')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-foreground">{l.tekst || <em className="text-muted-foreground">zonder tekst</em>}</span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">{l.url || '(leeg)'}</span>
                        </span>
                        {l.probleem ? <span className="text-[11px] font-semibold text-[#C0451A]">{l.probleem}</span> : (
                          <a href={l.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-petrol hover:underline dark:text-foreground">Open</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!vergrendeld && (
                <div className="doen-slate-surface rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-petrol" />
                    <span className="text-[14px] font-bold text-foreground">Versturen<span className="text-flame">.</span></span>
                    <span className="ml-auto text-[12px] text-muted-foreground">{aantalOntvangers == null ? 'Ontvangers nog niet geteld' : `${aantalOntvangers} ontvangers`}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inplanOpen && (
                      <input type="datetime-local" value={inplanMoment || toLocalInputWaarde(new Date(Date.now() + 3600_000))} min={toLocalInputWaarde(new Date())} onChange={e => setInplanMoment(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-petrol dark:focus:border-white/25" />
                    )}
                    <button type="button" onClick={() => (inplanOpen ? handleInplan() : (setInplanOpen(true), setInplanMoment(toLocalInputWaarde(new Date(Date.now() + 3600_000)))))} disabled={bezig} className={KNOP_SECUNDAIR}>
                      <Clock className="h-4 w-4" /> {inplanOpen ? 'Bevestig inplannen' : 'Plan in'}
                    </button>
                    <button type="button" onClick={() => vraagBevestiging()} disabled={bezig} className={cn(KNOP_PRIMAIR, 'ml-auto')}>
                      <Send className="h-4 w-4" /> Verstuur nu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <NieuwsbriefPreview html={previewHtml} afzender={AFZENDER} onderwerp={onderwerp} preheader={preheader} className="hidden min-h-0 border-l border-border lg:flex" />
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !aiBezig && setAiOpen(false)} />
          <div className="doen-slate-surface relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border/60 bg-petrol/[0.04] px-5 py-3.5 text-[14px] font-semibold text-petrol dark:bg-white/[0.04] dark:text-foreground">
              <Sparkles className="h-4 w-4" />
              Daan schrijft je nieuwsbrief
              <span className="ml-auto text-[11px] font-normal text-muted-foreground">kent je bedrijfscontext en schrijfstijl</span>
            </div>
            <div className="space-y-3 p-5">
              <textarea
                value={aiBrief}
                onChange={e => setAiBrief(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Waar gaat de nieuwsbrief over? Bijv: nieuwe LED-gevelreclame voor bakkerij De Korenaar, actie op autobelettering in september, en een korte vooruitblik op de open dag."
                className={cn(INPUT, 'resize-none leading-relaxed')}
              />
              <textarea value={aiAfbeeldingen} onChange={e => setAiAfbeeldingen(e.target.value)} rows={2} spellCheck={false} placeholder="Foto-links (optioneel, één per regel). Daan kijkt naar de foto's en plaatst ze op de juiste plek." className={cn(INPUT, 'resize-none font-mono text-[12px]')} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleGenereer} disabled={aiBezig || uploadBezig} className="inline-flex items-center gap-2 rounded-lg bg-petrol px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#143F46] disabled:opacity-60">
                  {aiBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiBezig ? 'Daan schrijft...' : modus === 'blokken' ? 'Bouw de nieuwsbrief' : 'Schrijf de HTML'}
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadBezig} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60">
                  {uploadBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-petrol" />}
                  {uploadBezig ? 'Uploaden...' : "Foto's uploaden"}
                </button>
                <button type="button" onClick={() => setAiOpen(false)} disabled={aiBezig} className="ml-auto rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">Sluiten</button>
              </div>
              {(modus === 'blokken' ? doc.blokken.length > 0 : html.trim().length > 0) && (
                <p className="text-[12px] text-muted-foreground">Let op: Daan vervangt de huidige inhoud. Met Cmd+Z in de bouwer haal je de vorige versie terug.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {bevestigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !bezig && setBevestigOpen(null)} />
          <div className="doen-slate-surface relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-[20px] font-extrabold tracking-[-0.3px] text-foreground">{bevestigOpen.scheduledAt ? 'Inplannen' : 'Nu versturen'}<span className="text-flame">?</span></h3>
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex gap-3"><dt className="w-24 flex-shrink-0 text-muted-foreground">Onderwerp</dt><dd className="font-semibold text-foreground">{onderwerp.trim()}</dd></div>
                <div className="flex gap-3"><dt className="w-24 flex-shrink-0 text-muted-foreground">Ontvangers</dt><dd className="font-mono font-semibold tabular-nums text-foreground">{aantalOntvangers ?? '?'}</dd></div>
                <div className="flex gap-3"><dt className="w-24 flex-shrink-0 text-muted-foreground">Selectie</dt><dd className="text-foreground">{selectie.type === 'alle' ? 'Iedereen' : selectie.type === 'filter' ? 'Op status of label' : 'Zelf gekozen klanten'}</dd></div>
                {bevestigOpen.scheduledAt && <div className="flex gap-3"><dt className="w-24 flex-shrink-0 text-muted-foreground">Moment</dt><dd className="font-semibold text-foreground">{formatDateTime(bevestigOpen.scheduledAt)}</dd></div>}
                <div className="flex gap-3"><dt className="w-24 flex-shrink-0 text-muted-foreground">Afzender</dt><dd className="text-foreground">Sign Company &lt;antony@signcompany.nl&gt;</dd></div>
              </dl>
              {!testVerstuurdOp && <p className="mt-4 rounded-lg bg-[#B7791F]/10 px-3 py-2 text-[12px] text-[#8A5A12] dark:text-[#E3B25C]">Je hebt nog geen testmail gestuurd. Weet je zeker dat alles klopt?</p>}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setBevestigOpen(null)} disabled={bezig} className={KNOP_SECUNDAIR}>Terug</button>
                <button type="button" onClick={() => doeVerzend(bevestigOpen.scheduledAt)} disabled={bezig} className={KNOP_PRIMAIR}>
                  {bezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : bevestigOpen.scheduledAt ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {bezig ? 'Bezig...' : bevestigOpen.scheduledAt ? 'Ja, plan in' : 'Ja, verstuur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
