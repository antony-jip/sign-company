import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ArrowLeft, Users, RefreshCw, Send, Clock, Save, Code2, Eye, Sparkles, ImagePlus, FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  updateConcept, syncContacten, verstuurNieuwsbrief, verstuurTest, genereerMetDaan, uploadAfbeelding,
  type Nieuwsbrief,
} from '@/services/nieuwsbriefService'
import { NIEUWSBRIEF_BASIS_TEMPLATE } from './nieuwsbriefTemplate'

interface Props {
  nieuwsbrief: Nieuwsbrief
  onTerug: () => void
  onGewijzigd: (n: Nieuwsbrief) => void
}

const STATUS_LABEL: Record<Nieuwsbrief['status'], string> = {
  concept: 'Concept', gepland: 'Gepland', verzonden: 'Verzonden',
}

function toLocalInputWaarde(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Vult merge-tags met voorbeeldwaarden zodat de preview natuurlijk leest.
function resolveMergeTags(html: string): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || 'Jan')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || 'Jansen')
    .replace(/\{\{\{contact\.email\}\}\}/g, 'jan@voorbeeld.nl')
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, '#')
}

// Spiegelt de server-mailshell (api/nieuwsbrief-verzend.ts) zodat de preview
// toont wat de ontvanger krijgt. De afmeldlink is hier een dummy (#).
function buildPreviewHtml(body: string): string {
  const inhoud = resolveMergeTags(body.trim()) || '<p style="color:#9B9B95;margin:0;">Nog geen inhoud. Plak of typ links je HTML, of laat Daan het schrijven.</p>'
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F4F1;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:24px 12px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="background:#ffffff;border-radius:12px;padding:32px 32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1A1A1A;">${inhoud}</td></tr>
      <tr><td style="padding:18px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
        Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
        <a href="#" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

const LABEL = 'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground'
const KNOP_SECUNDAIR = 'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-petrol/50 hover:bg-background disabled:opacity-60'

export function NieuwsbriefEditor({ nieuwsbrief, onTerug, onGewijzigd }: Props) {
  const [onderwerp, setOnderwerp] = useState(nieuwsbrief.onderwerp)
  const [preheader, setPreheader] = useState(nieuwsbrief.preheader || '')
  const [html, setHtml] = useState(nieuwsbrief.html)
  const [aantalContacten, setAantalContacten] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [testBezig, setTestBezig] = useState(false)
  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const [inplanOpen, setInplanOpen] = useState(false)
  const [inplanMoment, setInplanMoment] = useState('')
  const [mobielTab, setMobielTab] = useState<'html' | 'preview'>('html')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiBrief, setAiBrief] = useState('')
  const [aiAfbeeldingen, setAiAfbeeldingen] = useState('')
  const [aiBezig, setAiBezig] = useState(false)
  const [uploadBezig, setUploadBezig] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const laatstGewijzigd = useRef(nieuwsbrief.id)
  useEffect(() => {
    if (laatstGewijzigd.current !== nieuwsbrief.id) {
      laatstGewijzigd.current = nieuwsbrief.id
      setOnderwerp(nieuwsbrief.onderwerp)
      setPreheader(nieuwsbrief.preheader || '')
      setHtml(nieuwsbrief.html)
    }
  }, [nieuwsbrief.id, nieuwsbrief.onderwerp, nieuwsbrief.preheader, nieuwsbrief.html])

  const voegTagIn = useCallback((tag: string) => {
    const el = htmlRef.current
    if (!el) { setHtml(prev => prev + tag); return }
    const start = el.selectionStart ?? html.length
    const eind = el.selectionEnd ?? html.length
    const nieuw = html.slice(0, start) + tag + html.slice(eind)
    setHtml(nieuw)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + tag.length
      el.setSelectionRange(pos, pos)
    })
  }, [html])

  const verzonden = nieuwsbrief.status === 'verzonden'
  const isLeeg = () => !html.trim()

  const handleOpslaan = useCallback(async () => {
    setBezig(true)
    try {
      const bijgewerkt = await updateConcept(nieuwsbrief.id, { onderwerp, html, preheader })
      onGewijzigd(bijgewerkt)
      toast.success('Opgeslagen')
    } catch (err) {
      toast.error('Opslaan mislukt')
      console.error('[nieuwsbrief] opslaan mislukt:', err)
    } finally {
      setBezig(false)
    }
  }, [nieuwsbrief.id, onderwerp, html, preheader, onGewijzigd])

  const handleTest = useCallback(async () => {
    if (isLeeg()) { toast.error('De nieuwsbrief is nog leeg'); return }
    setTestBezig(true)
    try {
      const naar = await verstuurTest(onderwerp.trim(), html, preheader.trim() || undefined)
      toast.success(`Testmail verstuurd naar ${naar}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test versturen mislukt')
      console.error('[nieuwsbrief] test mislukt:', err)
    } finally {
      setTestBezig(false)
    }
  }, [onderwerp, html, preheader])

  const handleGenereer = useCallback(async () => {
    if (!aiBrief.trim()) { toast.error('Geef een korte briefing op'); return }
    setAiBezig(true)
    try {
      const urls = aiAfbeeldingen.split('\n').map(s => s.trim()).filter(Boolean)
      const gen = await genereerMetDaan(aiBrief.trim(), urls)
      setHtml(gen)
      setAiOpen(false)
      toast.success('Daan heeft een concept gemaakt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI-generatie mislukt')
      console.error('[nieuwsbrief] AI-generatie mislukt:', err)
    } finally {
      setAiBezig(false)
    }
  }, [aiBrief, aiAfbeeldingen])

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadBezig(true)
    try {
      const nieuweUrls: string[] = []
      for (const file of Array.from(files)) {
        try {
          nieuweUrls.push(await uploadAfbeelding(file))
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Upload van ${file.name} mislukt`)
        }
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

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const r = await syncContacten()
      setAantalContacten(r.aantalContacten)
      const extra = r.resterend > 0 ? ` (nog ${r.resterend} volgen bij de volgende sync)` : ''
      toast.success(`${r.aantalContacten} contacten in je lijst${extra}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Synchronisatie mislukt')
      console.error('[nieuwsbrief] sync mislukt:', err)
    } finally {
      setSyncing(false)
    }
  }, [])

  const doeVerzend = useCallback(async (scheduledAt?: string) => {
    if (!onderwerp.trim()) { toast.error('Geef een onderwerp op'); return }
    if (isLeeg()) { toast.error('De nieuwsbrief is nog leeg'); return }
    setBezig(true)
    try {
      const r = await verstuurNieuwsbrief(nieuwsbrief.id, onderwerp.trim(), html, preheader.trim() || undefined, scheduledAt)
      if (r.nieuwsbrief) onGewijzigd(r.nieuwsbrief)
      toast.success(
        r.status === 'gepland'
          ? `Ingepland voor ${r.aantalOntvangers} ontvangers`
          : `Verzonden naar ${r.aantalOntvangers} ontvangers`,
      )
      onTerug()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verzenden mislukt')
      console.error('[nieuwsbrief] verzenden mislukt:', err)
    } finally {
      setBezig(false)
    }
  }, [nieuwsbrief.id, onderwerp, html, preheader, onGewijzigd, onTerug])

  const handleVerstuurNu = useCallback(() => {
    if (!window.confirm('Nu versturen naar al je contacten?')) return
    doeVerzend()
  }, [doeVerzend])

  const handleInplan = useCallback(() => {
    if (!inplanMoment) { toast.error('Kies een datum en tijd'); return }
    const dt = new Date(inplanMoment)
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now() + 60_000) {
      toast.error('Kies een moment in de toekomst')
      return
    }
    doeVerzend(dt.toISOString())
  }, [inplanMoment, doeVerzend])

  const previewHtml = buildPreviewHtml(html)

  return (
    <div className="flex h-full flex-col -m-3 sm:-m-4 md:-m-6">

      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onTerug}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Terug"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <h1 className="truncate text-[22px] font-extrabold tracking-[-0.5px] text-foreground">
            {verzonden ? 'Nieuwsbrief' : 'Opstellen'}<span className="text-flame">.</span>
          </h1>
          {nieuwsbrief.status !== 'concept' && (
            <StatusBadge status={nieuwsbrief.status} label={STATUS_LABEL[nieuwsbrief.status]} className="hidden sm:inline-flex" />
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60"
        >
          {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4 text-petrol" />}
          {aantalContacten != null ? (
            <span className="font-mono tabular-nums">{aantalContacten} contacten</span>
          ) : 'Contacten synchroniseren'}
        </button>
      </div>

      <div className="space-y-1.5 border-b border-border/60 px-4 py-3 md:px-8">
        <input
          value={onderwerp}
          onChange={e => setOnderwerp(e.target.value)}
          placeholder="Onderwerp van je nieuwsbrief"
          disabled={verzonden}
          className="w-full bg-transparent text-[19px] font-bold tracking-[-0.01em] text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50 disabled:opacity-70"
        />
        <input
          value={preheader}
          onChange={e => setPreheader(e.target.value)}
          placeholder="Preheader — previewtekst naast het onderwerp in de inbox (optioneel)"
          disabled={verzonden}
          className="w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-70"
        />
      </div>

      {!verzonden && (
        <div className="border-b border-border/60 px-4 py-3 md:px-8">
          {!aiOpen ? (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="group inline-flex items-center gap-2 rounded-xl border border-petrol/25 bg-petrol/[0.06] px-3.5 py-2 text-[13px] font-semibold text-petrol transition-all hover:bg-petrol/[0.1] dark:border-white/15 dark:bg-white/[0.05] dark:text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Genereer met Daan
            </button>
          ) : (
            <div className="doen-slate-surface overflow-hidden rounded-2xl">
              <div className="flex items-center gap-2 border-b border-border/60 bg-petrol/[0.04] px-4 py-2.5 text-[13px] font-semibold text-petrol dark:bg-white/[0.04] dark:text-foreground">
                <Sparkles className="h-4 w-4" />
                Daan schrijft je nieuwsbrief
                <span className="ml-auto text-[11px] font-normal text-muted-foreground">kent de bedrijfscontext</span>
              </div>
              <div className="space-y-2.5 p-4">
                <textarea
                  value={aiBrief}
                  onChange={e => setAiBrief(e.target.value)}
                  rows={3}
                  placeholder="Waar gaat de nieuwsbrief over? Bijv: nieuwe LED-gevelreclame, actie deze maand, een recent project om te laten zien."
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-petrol focus:ring-2 focus:ring-petrol/10 dark:focus:border-white/25 dark:focus:ring-white/10"
                />
                <textarea
                  value={aiAfbeeldingen}
                  onChange={e => setAiAfbeeldingen(e.target.value)}
                  rows={2}
                  spellCheck={false}
                  placeholder="Foto-links (optioneel, één per regel): https://..."
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-petrol dark:focus:border-white/25"
                />
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenereer}
                    disabled={aiBezig || uploadBezig}
                    className="inline-flex items-center gap-2 rounded-lg bg-petrol px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#143F46] disabled:opacity-60"
                  >
                    {aiBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {aiBezig ? 'Daan schrijft...' : 'Genereer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadBezig}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60"
                  >
                    {uploadBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-petrol" />}
                    {uploadBezig ? 'Uploaden...' : "Foto's uploaden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiOpen(false)}
                    disabled={aiBezig}
                    className="ml-auto rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border/60 px-4 py-2 md:hidden">
        {(['html', 'preview'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setMobielTab(t)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${mobielTab === t ? 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground' : 'text-muted-foreground'}`}
          >
            {t === 'html' ? <Code2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {t === 'html' ? 'HTML' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-2">
        <div className={`flex min-h-0 flex-col border-border md:border-r ${mobielTab === 'preview' ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between gap-2 px-4 pt-3 md:px-8">
            <span className={`${LABEL} hidden md:inline-flex`}><Code2 className="h-3.5 w-3.5" /> HTML</span>
            {!verzonden && (
              <div className="flex items-center gap-1">
                <span className="hidden text-[11px] text-muted-foreground sm:inline">Personaliseer:</span>
                <button
                  type="button"
                  onClick={() => voegTagIn('{{{contact.first_name|daar}}}')}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-petrol transition-colors hover:border-petrol/50 dark:text-foreground"
                >
                  + Voornaam
                </button>
                <button
                  type="button"
                  onClick={() => voegTagIn('{{{contact.last_name|}}}')}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-petrol transition-colors hover:border-petrol/50 dark:text-foreground"
                >
                  + Achternaam
                </button>
              </div>
            )}
          </div>
          <textarea
            ref={htmlRef}
            value={html}
            onChange={e => setHtml(e.target.value)}
            disabled={verzonden}
            spellCheck={false}
            placeholder={'Plak of schrijf hier je HTML — of laat Daan het schrijven.\n\n<h1>Nieuw bij Sign Company</h1>\n<p>Beste relatie, ...</p>'}
            className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 md:px-8 disabled:opacity-70"
          />
        </div>

        <div className={`flex min-h-0 flex-col ${mobielTab === 'html' ? 'hidden md:flex' : 'flex'}`}>
          <div className="hidden px-4 pt-3 md:flex md:px-8">
            <span className={LABEL}><Eye className="h-3.5 w-3.5" /> Preview</span>
          </div>
          <div className="mt-3 min-h-0 flex-1 md:mt-2.5">
            <iframe
              title="Nieuwsbrief-preview"
              srcDoc={previewHtml}
              className="h-full w-full border-0"
              sandbox=""
            />
          </div>
        </div>
      </div>

      {!verzonden && (
        <div className="border-t border-border px-4 py-3.5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleOpslaan} disabled={bezig} className={KNOP_SECUNDAIR}>
                <Save className="h-4 w-4" />
                Opslaan
              </button>
              <button type="button" onClick={handleTest} disabled={testBezig} className={KNOP_SECUNDAIR}>
                {testBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4 text-petrol" />}
                Stuur test
              </button>
            </div>

            <div className="flex items-center gap-2">
              {inplanOpen && (
                <input
                  type="datetime-local"
                  value={inplanMoment || toLocalInputWaarde(new Date(Date.now() + 3600_000))}
                  min={toLocalInputWaarde(new Date())}
                  onChange={e => setInplanMoment(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-petrol dark:focus:border-white/25"
                />
              )}
              <button
                type="button"
                onClick={() => (inplanOpen ? handleInplan() : setInplanOpen(true))}
                disabled={bezig}
                className={KNOP_SECUNDAIR}
              >
                <Clock className="h-4 w-4" />
                {inplanOpen ? 'Bevestig inplannen' : 'Plan in'}
              </button>
              <button
                type="button"
                onClick={handleVerstuurNu}
                disabled={bezig}
                className="inline-flex items-center gap-2 rounded-xl bg-flame px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] active:translate-y-0 active:bg-[#D03A18] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Verstuur nu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
