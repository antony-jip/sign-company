import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Upload, Trash2, Save, FileText, Loader2, CheckCircle2, Bot, Pen,
  Coins, Palette, Plus, AlertTriangle, Info, ShoppingCart,
  TrendingUp, Zap, Star, Crown, CreditCard, Shield,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
import { cn } from '@/lib/utils'
import {
  importCsvToForgie,
  getForgieImports,
  deleteForgieImport,
  type ForgieImport,
} from '@/services/forgieChatService'
import {
  DEFAULT_VISUALIZER_INSTELLINGEN,
  berekenDoorberekendBedrag,
  KOSTEN_PER_RESOLUTIE_USD,
  CREDITS_PAKKETTEN,
} from '@/utils/visualizerDefaults'
import {
  getVisualizerInstellingen,
  saveVisualizerInstellingen,
  getVisualizerCredits,
  handmatigCreditsToewijzen,
  getCreditTransacties,
  voegCreditsToe,
  getConventies,
  createConventie,
  updateConventie,
  deleteConventie,
  MAX_ACTIEVE_CONVENTIES,
  getDaanGeheugenAlgemeen,
  bevestigDaanGeheugen,
  wijsDaanGeheugenAf,
  getDaanRondes,
} from '@/services/supabaseService'
import type { Conventie, DaanGeheugenRegel, DaanRonde } from '@/services/supabaseService'
import { getForgieUsage, STANDAARD_AI_MAANDLIMIET, type ForgieUsage } from '@/services/forgieService'
import type { VisualizerInstellingen, CreditTransactie, CreditsPakket } from '@/types'
import { logger } from '../../utils/logger'

const API_BASE = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || '')

function parseCsv(text: string): Array<Record<string, string>> {
  let cleaned = text
  if (cleaned.charCodeAt(0) === 0xFEFF) cleaned = cleaned.slice(1)
  const firstNewline = cleaned.indexOf('\n')
  const firstLine = firstNewline > -1 ? cleaned.slice(0, firstNewline) : cleaned
  const delimiter = firstLine.includes(';') ? ';' : ','
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '"') { currentField += '"'; i++ }
        else inQuotes = false
      } else currentField += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === delimiter) { currentRow.push(currentField.trim()); currentField = '' }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < cleaned.length && cleaned[i + 1] === '\n') i++
        currentRow.push(currentField.trim())
        if (currentRow.some(f => f !== '')) rows.push(currentRow)
        currentRow = []; currentField = ''
      } else currentField += ch
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(f => f !== '')) rows.push(currentRow)
  }
  if (rows.length < 2) return []
  const headers = rows[0]
  const result: Array<Record<string, string>> = []
  for (let i = 1; i < rows.length; i++) {
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { if (h) row[h] = rows[i][j] || '' })
    result.push(row)
  }
  return result
}

const PAKKET_ICONS: Record<string, React.ElementType> = {
  starter: Zap,
  professional: Star,
  enterprise: Crown,
}

export function ForgieTab() {
  const { user, session } = useAuth()
  const { settings, updateSettings } = useAppSettings()
  const [bedrijfscontext, setBedrijfscontext] = useState(settings.forgie_bedrijfscontext || '')
  const [toneOfVoice, setToneOfVoice] = useState(settings.ai_tone_of_voice || '')
  const [saving, setSaving] = useState(false)
  const [savingTone, setSavingTone] = useState(false)
  const [imports, setImports] = useState<ForgieImport[]>([])
  const [loadingImports, setLoadingImports] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [previewData, setPreviewData] = useState<{ name: string; rows: Array<Record<string, string>>; headers: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Visualizer state
  const [visInstellingen, setVisInstellingen] = useState<VisualizerInstellingen>(DEFAULT_VISUALIZER_INSTELLINGEN)
  const [visSaving, setVisSaving] = useState(false)
  const [creditSaldo, setCreditSaldo] = useState(0)
  const [totaalGebruikt, setTotaalGebruikt] = useState(0)
  const [handmatigAantal, setHandmatigAantal] = useState('')
  const [handmatigReden, setHandmatigReden] = useState('')
  const [transacties, setTransacties] = useState<CreditTransactie[]>([])
  const [showTransacties, setShowTransacties] = useState(false)

  // Daan AI usage. Dit gaat over de hele organisatie, want dat is wat blokkeert.
  const [forgieGebruik, setForgieGebruik] = useState<ForgieUsage>({
    usage: 0,
    limiet: STANDAARD_AI_MAANDLIMIET,
    aantal_calls: 0,
  })

  // Credits kopen
  const [showCreditsKopen, setShowCreditsKopen] = useState(false)
  const [geselecteerdPakket, setGeselecteerdPakket] = useState<CreditsPakket | null>(null)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

  useEffect(() => {
    setBedrijfscontext(settings.forgie_bedrijfscontext || '')
  }, [settings.forgie_bedrijfscontext])

  useEffect(() => {
    setToneOfVoice(settings.ai_tone_of_voice || '')
  }, [settings.ai_tone_of_voice])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    getVisualizerInstellingen(user.id).then(async (v) => {
      if (cancelled) return
      try {
        const statusRes = await fetch('/api/api-status')
        if (statusRes.ok) {
          const status = await statusRes.json()
          if (status.fal_ai) v.fal_api_key_geconfigureerd = true
        }
      } catch { /* ignore */ }
      setVisInstellingen(v)
    }).catch(() => {})
    getVisualizerCredits(user.id).then(c => {
      if (cancelled) return
      setCreditSaldo(c.saldo)
      setTotaalGebruikt(c.totaal_gebruikt)
    }).catch(() => {})
    getCreditTransacties(user.id).then(t => { if (!cancelled) setTransacties(t.slice(0, 20)) }).catch(() => {})
    getForgieUsage().then(g => { if (!cancelled) setForgieGebruik(g) }).catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => { if (user?.id) loadImports() }, [user?.id])

  const loadImports = useCallback(async () => {
    setLoadingImports(true)
    try { setImports(await getForgieImports()) } catch (err) { logger.error('Fetch forgie imports:', err) }
    finally { setLoadingImports(false) }
  }, [])

  const handleSaveContext = useCallback(async () => {
    setSaving(true)
    try { await updateSettings({ forgie_bedrijfscontext: bedrijfscontext }); toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>) }
    catch (err) { logger.error('Save bedrijfscontext:', err); toast.error('Opslaan mislukt') }
    finally { setSaving(false) }
  }, [bedrijfscontext, updateSettings, settings])

  const handleSaveTone = useCallback(async () => {
    setSavingTone(true)
    try { await updateSettings({ ai_tone_of_voice: toneOfVoice }); toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>) }
    catch (err) { logger.error('Save tone of voice:', err); toast.error('Opslaan mislukt') }
    finally { setSavingTone(false) }
  }, [toneOfVoice, updateSettings])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      const rows = parseCsv(text)
      if (rows.length === 0) { toast.error('Geen data gevonden in het bestand'); return }
      setPreviewData({ name: file.name, rows, headers: Object.keys(rows[0]) })
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!previewData) return
    setUploading(true)
    try {
      const result = await importCsvToForgie(previewData.name, previewData.rows)
      toast.success(`${result.count} rijen geïmporteerd`)
      setPreviewData(null); loadImports()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Import mislukt') }
    finally { setUploading(false) }
  }, [previewData, loadImports])

  const handleDeleteImport = useCallback(async (bestandsnaam: string) => {
    try { await deleteForgieImport(bestandsnaam); toast.success('Import verwijderd'); loadImports() }
    catch (err) { logger.error('Delete forgie import:', err); toast.error('Verwijderen mislukt') }
  }, [loadImports])

  const updateVisInstelling = (field: keyof VisualizerInstellingen, value: unknown) => {
    setVisInstellingen(prev => ({ ...prev, [field]: value }))
  }

  const handleVisSave = useCallback(async () => {
    if (!user?.id) return
    setVisSaving(true)
    try { setVisInstellingen(await saveVisualizerInstellingen(user.id, visInstellingen)); toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>) }
    catch (err) { logger.error('Save visualizer instellingen:', err); toast.error('Opslaan mislukt') }
    finally { setVisSaving(false) }
  }, [user?.id, visInstellingen])

  const handleCreditsToevoegen = useCallback(async () => {
    if (!user?.id) return
    const aantal = parseInt(handmatigAantal)
    if (isNaN(aantal) || aantal === 0) { toast.error('Voer een geldig aantal in'); return }
    try {
      const result = await handmatigCreditsToewijzen(user.id, aantal, handmatigReden || 'Handmatig toegevoegd')
      setCreditSaldo(result.saldo)
      setHandmatigAantal(''); setHandmatigReden('')
      const trans = await getCreditTransacties(user.id)
      setTransacties(trans.slice(0, 20))
      toast.success(`${aantal} credits ${aantal > 0 ? 'toegevoegd' : 'verwijderd'}`)
    } catch (err) { logger.error('Credits toevoegen:', err); toast.error('Credits toevoegen mislukt') }
  }, [user?.id, handmatigAantal, handmatigReden])

  const handleToggleForgie = useCallback(async (enabled: boolean) => {
    try { await updateSettings({ forgie_enabled: enabled }); toast.success(enabled ? 'Daan ingeschakeld' : 'Daan uitgeschakeld') }
    catch (err) { logger.error('Toggle forgie:', err); toast.error('Instelling opslaan mislukt') }
  }, [updateSettings])

  const handleMollieCheckout = useCallback(async (pakket: CreditsPakket) => {
    if (!user?.id || !session?.access_token) return
    setIsCheckoutLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pakket_id: pakket.id,
          success_url: `${window.location.origin}/instellingen?credits=klaar`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Betaling aanmaken mislukt')
      if (data.url) window.location.href = data.url
      else throw new Error('Geen checkout URL ontvangen')
    } catch (error) {
      toast.error(`Betaling starten mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
      setIsCheckoutLoading(false)
    }
  }, [user?.id, session?.access_token])

  const handleDemoCredits = useCallback(async (pakket: CreditsPakket) => {
    if (!user?.id) return
    try {
      const result = await voegCreditsToe(user.id, pakket.credits, `${pakket.naam} pakket (demo)`)
      setCreditSaldo(result.saldo)
      setShowCreditsKopen(false); setGeselecteerdPakket(null)
      toast.success(`${pakket.credits} credits toegevoegd!`)
    } catch (err) { logger.error('Demo credits toevoegen:', err); toast.error('Credits toevoegen mislukt') }
  }, [user?.id])

  // Credit status indicator
  const creditStatus = creditSaldo <= 0 ? 'leeg' : creditSaldo < 5 ? 'laag' : 'ok'
  // Een limiet van 0 (AI uitgezet voor de org) gaf NaN: ongeldige CSS-breedte
  // én geen waarschuwing, juist terwijl alles geblokkeerd is.
  const forgiePercentage = forgieGebruik.limiet > 0
    ? Math.min(100, (forgieGebruik.usage / forgieGebruik.limiet) * 100)
    : 100
  const euro = (bedrag: number) => `€ ${bedrag.toFixed(2).replace('.', ',')}`
  const resetMaand = forgieGebruik.reset_op
    ? new Date(forgieGebruik.reset_op).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════ */}
      {/* DAAN HEADER · Petrol blok                   */}
      {/* ═══════════════════════════════════════════ */}
      <div className="rounded-xl bg-petrol p-6">
        <h2 className="text-white text-[20px] font-bold font-display tracking-[-0.03em]">Daan</h2>
        <p className="text-white/60 text-[13px] mt-0.5">Je AI-assistent</p>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* CREDITS DASHBOARD · Altijd bovenaan        */}
      {/* ═══════════════════════════════════════════ */}
      <Card className={cn(
        'border-2',
        creditStatus === 'leeg' && 'border-flame/30 dark:border-flame/40',
        creditStatus === 'laag' && 'border-flame/20 dark:border-flame/30',
        creditStatus === 'ok' && 'border-border',
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Jouw tegoed
          </CardTitle>
          <CardDescription>
            Credits worden gebruikt voor de Visualizer.
            Nieuwe accounts starten met 10 gratis credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saldo prominente weergave */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={cn(
                'text-4xl font-bold font-mono tabular-nums',
                creditStatus === 'leeg' && 'text-flame',
                creditStatus === 'laag' && 'text-flame/70',
                creditStatus === 'ok' && 'text-foreground',
              )}>
                {creditSaldo}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">credits beschikbaar</div>
            </div>

            <Separator orientation="vertical" className="h-14" />

            <div className="flex-1 space-y-2">
              {/* Visualizer usage */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Palette className="w-3.5 h-3.5" /> Visualizer
                </span>
                <span className="font-medium">{totaalGebruikt} credits gebruikt</span>
              </div>
              {/* Daan usage */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Bot className="w-3.5 h-3.5" /> AI-verbruik
                </span>
                <span className="font-medium tabular-nums">
                  {forgieGebruik.onbekend
                    ? <span className="text-muted-foreground font-normal">verbruik niet op te halen</span>
                    : <>{euro(forgieGebruik.usage)} <span className="text-muted-foreground font-normal">van</span> {euro(forgieGebruik.limiet)}</>}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    forgiePercentage > 80 ? 'bg-flame' : forgiePercentage > 50 ? 'bg-flame/60' : 'bg-petrol'
                  )}
                  style={{ width: `${forgiePercentage}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {forgieGebruik.gedeeld
                  ? 'Gedeeld met je hele organisatie'
                  : 'Jouw verbruik deze maand'}
                {resetMaand ? ` · gaat ${resetMaand} weer op nul` : ''}
                {typeof forgieGebruik.aantal_calls === 'number' && forgieGebruik.aantal_calls > 0
                  ? ` · ${forgieGebruik.aantal_calls} ${forgieGebruik.aantal_calls === 1 ? 'vraag' : 'vragen'}`
                  : ''}
              </div>
              {forgieGebruik.gedeeld && typeof forgieGebruik.eigen_verbruik === 'number' && forgieGebruik.eigen_verbruik > 0 && (
                <div className="text-xs text-muted-foreground">
                  Waarvan {euro(forgieGebruik.eigen_verbruik)} van jou
                </div>
              )}
            </div>
          </div>

          {/* Waarschuwing bij een vol AI-budget. Los van credits: credits zijn
              voor de Visualizer en heffen deze limiet niet op. */}
          {forgiePercentage >= 80 && (
            <div className="rounded-lg p-3 flex items-start gap-2 text-sm bg-flame/5 dark:bg-flame/10 text-flame">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {forgiePercentage >= 100
                  ? `Het AI-budget van ${forgieGebruik.gedeeld ? 'je organisatie' : 'deze maand'} is op. Daan werkt weer${resetMaand ? ` op ${resetMaand}` : ' volgende maand'}.`
                  : `Nog ${euro(Math.max(0, forgieGebruik.limiet - forgieGebruik.usage))} aan AI-budget over deze maand.`}
              </div>
            </div>
          )}

          {/* Waarschuwing bij lage credits */}
          {creditStatus !== 'ok' && (
            <div className={cn(
              'rounded-lg p-3 flex items-start gap-2 text-sm',
              creditStatus === 'leeg'
                ? 'bg-flame/5 dark:bg-flame/10 text-flame dark:text-flame'
                : 'bg-flame/5 dark:bg-flame/10 text-flame/80 dark:text-flame/80'
            )}>
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {creditStatus === 'leeg'
                  ? 'Je hebt geen credits meer. De Visualizer is geblokkeerd tot je credits bijkoopt. Daan werkt gewoon door: die loopt op het AI-budget hierboven.'
                  : `Nog maar ${creditSaldo} credits over. Koop bij om ononderbroken te blijven werken.`
                }
              </div>
            </div>
          )}

          {/* Credits bijkopen knop */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreditsKopen(!showCreditsKopen)}
              className="gap-2"
              variant={creditStatus === 'leeg' ? 'default' : 'outline'}
            >
              <ShoppingCart className="h-4 w-4" />
              Credits bijkopen
            </Button>
          </div>

          {/* Credits kopen pakketten (inline) */}
          {showCreditsKopen && (
            <div className="space-y-3 pt-2">
              <Separator />
              <p className="text-sm font-medium">Kies een pakket:</p>
              <div className="grid gap-3">
                {CREDITS_PAKKETTEN.map((pakket) => {
                  const Icon = PAKKET_ICONS[pakket.id] || Coins
                  const isSelected = geselecteerdPakket?.id === pakket.id

                  return (
                    <button
                      key={pakket.id}
                      onClick={() => setGeselecteerdPakket(isSelected ? null : pakket)}
                      className={cn(
                        'relative flex items-center w-full p-4 rounded-xl border-2 transition-all text-left gap-4',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border/50 hover:border-border'
                      )}
                    >
                      {pakket.populair && (
                        <Badge className="absolute -top-2 right-3 text-xs bg-amber-500 text-white">
                          Meest gekozen
                        </Badge>
                      )}

                      <div className={cn('p-2.5 rounded-lg shrink-0', isSelected ? 'bg-primary/10' : 'bg-muted')}>
                        <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pakket.naam}</span>
                          <span className="text-xs text-muted-foreground">{pakket.credits} credits</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{pakket.beschrijving}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold font-mono">{pakket.prijs_eur.toFixed(2).replace('.', ',')} EUR</div>
                        <div className="text-xs text-muted-foreground">
                          {pakket.prijs_per_credit_eur.toFixed(2).replace('.', ',')} EUR/credit
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {geselecteerdPakket && (
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 h-12 text-base font-medium"
                    onClick={() => handleMollieCheckout(geselecteerdPakket)}
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {isCheckoutLoading
                      ? 'Doorsturen naar betaling...'
                      : `Afrekenen · ${geselecteerdPakket.prijs_eur.toFixed(2).replace('.', ',')} EUR`
                    }
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Veilig betalen via Mollie · iDEAL & creditcard
                  </div>

                  {import.meta.env.DEV && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => handleDemoCredits(geselecteerdPakket)}
                    >
                      Dev: credits direct toevoegen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Handmatig credits beheren (admin) */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Handmatig credits toevoegen/verwijderen
            </summary>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                value={handmatigAantal}
                onChange={(e) => setHandmatigAantal(e.target.value)}
                placeholder="Aantal"
                className="text-sm w-24"
              />
              <Input
                value={handmatigReden}
                onChange={(e) => setHandmatigReden(e.target.value)}
                placeholder="Reden"
                className="text-sm flex-1"
              />
              <Button size="sm" onClick={handleCreditsToevoegen} className="gap-1">
                <Plus className="h-3 w-3" /> Toevoegen
              </Button>
            </div>
          </details>

          {/* Transactiehistorie */}
          {transacties.length > 0 && (
            <div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => setShowTransacties(!showTransacties)}
              >
                <TrendingUp className="h-3 w-3" />
                {showTransacties ? 'Transacties verbergen' : `Transactiehistorie (${transacties.length})`}
              </button>

              {showTransacties && (
                <div className="border rounded-lg overflow-hidden mt-2">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 text-xs font-bold uppercase tracking-label text-text-tertiary">Datum</th>
                        <th className="text-left p-2 text-xs font-bold uppercase tracking-label text-text-tertiary">Type</th>
                        <th className="text-left p-2 text-xs font-bold uppercase tracking-label text-text-tertiary">Beschrijving</th>
                        <th className="text-right p-2 text-xs font-bold uppercase tracking-label text-text-tertiary">Aantal</th>
                        <th className="text-right p-2 text-xs font-bold uppercase tracking-label text-text-tertiary">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacties.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString('nl-NL')}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">{t.type}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground truncate max-w-[200px]">
                            {t.beschrijving}
                          </td>
                          <td className={`p-2 text-right font-medium font-mono ${t.aantal > 0 ? 'text-petrol' : 'text-flame'}`}>
                            {t.aantal > 0 ? '+' : ''}{t.aantal}
                          </td>
                          <td className="p-2 text-right">{t.saldo_na}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit kosten info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Visualisatie (1K/2K)</div>
          <div className="text-lg font-bold mt-1">1 credit</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Visualisatie (4K)</div>
          <div className="text-lg font-bold mt-1">2 credits</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">Daan AI chat</div>
          <div className="text-lg font-bold mt-1">Inclusief</div>
          <div className="text-2xs text-muted-foreground">max 5 EUR/mnd</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* DAAN AI INSTELLINGEN                        */}
      {/* ═══════════════════════════════════════════ */}
      <div className="pt-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[1.5px] text-muted-foreground flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4" />
          Instellingen
        </h3>
      </div>

      {/* Daan aan/uit */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="forgie-toggle" className="flex items-center gap-2 cursor-pointer">
                <Bot className="w-4 h-4 text-petrol dark:text-[#2A7A86]" />
                <span className="font-medium">Daan inschakelen</span>
              </Label>
              <p className="text-xs text-muted-foreground ml-6">
                Schakel Daan in of uit. Wanneer uitgeschakeld verdwijnt de chat-assistent.
              </p>
            </div>
            <Switch
              id="forgie-toggle"
              checked={settings.forgie_enabled ?? true}
              onCheckedChange={handleToggleForgie}
            />
          </div>
        </CardContent>
      </Card>

      <DaanKennisSectie />

      {/* Bedrijfscontext */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrijfscontext</CardTitle>
          <CardDescription>
            Vertel Daan over je bedrijf. Deze informatie wordt meegegeven bij elke vraag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={bedrijfscontext}
            onChange={e => setBedrijfscontext(e.target.value)}
            placeholder="Bijv: Wij zijn een signbedrijf in Enkhuizen, gespecialiseerd in lichtreclames en gevelbelettering. We werken met 4 monteurs."
            rows={4}
            className="resize-none bg-muted dark:bg-muted border-border focus-visible:ring-petrol"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${bedrijfscontext.length > 500 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              <span className="font-mono">{bedrijfscontext.length}/500</span> tekens
              {bedrijfscontext.length > 500 && <span className="ml-2">· {bedrijfscontext.length - 500} teveel</span>}
            </span>
            <Button size="sm" onClick={handleSaveContext} disabled={saving || bedrijfscontext.length > 500} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tone of Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pen className="w-4 h-4 text-muted-foreground" />
            Schrijfstijl / Tone of Voice
          </CardTitle>
          <CardDescription>
            Beschrijf je schrijfstijl. De AI past dit toe bij het herschrijven van teksten. Je kunt ook een voorbeeld-tekst plakken zodat de AI je stijl leert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={toneOfVoice}
            onChange={e => setToneOfVoice(e.target.value)}
            placeholder="Bijv: Ik schrijf zakelijk maar toegankelijk. Ik gebruik 'u' voor klanten. Korte zinnen, geen jargon. Altijd positief en oplossingsgericht."
            rows={5}
            className="resize-none"
            enableAI={false}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${toneOfVoice.length > 1000 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              <span className="font-mono">{toneOfVoice.length}/1000</span> tekens
              {toneOfVoice.length > 1000 && <span className="ml-2">· {toneOfVoice.length - 1000} teveel</span>}
            </span>
            <Button size="sm" onClick={handleSaveTone} disabled={savingTone || toneOfVoice.length > 1000} className="gap-1.5">
              {savingTone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrijfshistorie importeren</CardTitle>
          <CardDescription>
            Upload een CSV bestand met je oude bedrijfsdata. Daan kan dan vragen beantwoorden over je hele historie. Ook van voor doen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> CSV uploaden
            </Button>
          </div>

          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{previewData.name}</span>
                <Badge variant="secondary" className="text-xs">{previewData.rows.length} rijen</Badge>
              </div>
              <div className="border rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {previewData.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {previewData.headers.map(h => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                    {previewData.rows.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={previewData.headers.length} className="px-3 py-1.5 text-muted-foreground italic">
                          ...en nog {previewData.rows.length - 5} rijen meer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleImport} disabled={uploading} className="gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Importeren
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreviewData(null)}>Annuleren</Button>
              </div>
            </div>
          )}

          {loadingImports ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Imports laden...
            </div>
          ) : imports.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-label">Geïmporteerde bestanden</p>
              {imports.map(imp => (
                <div key={imp.bestandsnaam} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{imp.bestandsnaam}</p>
                      <p className="text-xs text-muted-foreground">{imp.count} rijen &middot; {new Date(imp.created_at).toLocaleDateString('nl-NL')}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-flame hover:bg-flame/5 flex-shrink-0" onClick={() => handleDeleteImport(imp.bestandsnaam)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">Nog geen bestanden geïmporteerd.</p>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════ */}
      {/* SIGNING VISUALIZER INSTELLINGEN            */}
      {/* ═══════════════════════════════════════════ */}
      <div className="pt-2">
        <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-label flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4" />
          Signing Visualizer
        </h3>
      </div>

      {/* API Status */}
      {!visInstellingen.fal_api_key_geconfigureerd && (
        <div className="bg-muted dark:bg-muted border border-border dark:border-border rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-flame mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground dark:text-white">fal.ai API key niet geconfigureerd</p>
            <p className="text-muted-foreground mt-1">
              Voeg <code className="bg-muted dark:bg-border px-1 rounded">FAL_AI_API_KEY</code> toe aan je Vercel Environment Variables om de visualizer te activeren.
            </p>
          </div>
        </div>
      )}

      {/* Kosten & Doorberekening */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-muted-foreground" />
            Kosten & Doorberekening
          </CardTitle>
          <CardDescription>
            Stel in hoe visualisatiekosten worden doorberekend aan klanten op offertes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">USD/EUR wisselkoers</Label>
              <Input type="number" step="0.01" value={visInstellingen.usd_eur_wisselkoers} onChange={(e) => updateVisInstelling('usd_eur_wisselkoers', parseFloat(e.target.value) || 0.92)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Opslag percentage (%)</Label>
              <Input type="number" value={visInstellingen.opslag_percentage} onChange={(e) => updateVisInstelling('opslag_percentage', parseInt(e.target.value) || 0)} className="text-sm" />
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Voorbeeld (2K): API $0.12 &rarr; &euro;{round2(0.12 * visInstellingen.usd_eur_wisselkoers)} + {visInstellingen.opslag_percentage}% = &euro;{berekenDoorberekendBedrag(0.12, visInstellingen)}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm">Standaard doorberekenen aan klant</Label>
            <Switch checked={visInstellingen.standaard_doorberekenen} onCheckedChange={(v) => updateVisInstelling('standaard_doorberekenen', v)} />
          </div>

          <div>
            <Label className="text-xs">Omschrijving op offerte</Label>
            <Input value={visInstellingen.doorberekening_omschrijving} onChange={(e) => updateVisInstelling('doorberekening_omschrijving', e.target.value)} className="text-sm" />
          </div>

          <div>
            <Label className="text-xs">Standaard resolutie</Label>
            <div className="flex gap-2 mt-1">
              {(['1K', '2K', '4K'] as const).map((res) => (
                <Button
                  key={res}
                  size="sm"
                  variant={visInstellingen.standaard_resolutie === res ? 'default' : 'outline'}
                  onClick={() => updateVisInstelling('standaard_resolutie', res)}
                  className="text-xs"
                >
                  {res} (${KOSTEN_PER_RESOLUTIE_USD[res]}) {res === '4K' ? '· 2 credits' : '· 1 credit'}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleVisSave} disabled={visSaving} size="sm" className="gap-1.5">
              {visSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Opslaan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Model Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className="bg-petrol/10 text-petrol dark:bg-[#2A7A86]/20 dark:text-[#2A7A86]">
              Claude Sonnet 4.6
            </Badge>
            <span className="text-sm text-muted-foreground">
              Daan, email-tools en visualizer draaien allemaal op Claude Sonnet 4.6
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Vaste regels (conventies), bedrijfsbreed geheugen en het nachtploeg-
 * logboek. Conventies gaan woordelijk mee in elke prompt; vandaar de cap
 * op actieve regels.
 */
function DaanKennisSectie() {
  const { settings, updateSettings } = useAppSettings()
  const [conventies, setConventies] = useState<Conventie[]>([])
  const [algemeen, setAlgemeen] = useState<DaanGeheugenRegel[]>([])
  const [rondes, setRondes] = useState<DaanRonde[]>([])
  const [nieuweRegel, setNieuweRegel] = useState('')
  const [toevoegen, setToevoegen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getConventies(), getDaanGeheugenAlgemeen(), getDaanRondes(8)])
      .then(([c, a, r]) => {
        if (cancelled) return
        setConventies(c)
        setAlgemeen(a)
        setRondes(r)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const actieveConventies = conventies.filter(c => c.actief).length

  const handleConventieToevoegen = async () => {
    // Enter in het invoerveld omzeilt de disabled-knop; guard tegen dubbel.
    if (toevoegen) return
    const inhoud = nieuweRegel.trim()
    if (!inhoud) return
    if (actieveConventies >= MAX_ACTIEVE_CONVENTIES) {
      toast.error(`Maximaal ${MAX_ACTIEVE_CONVENTIES} actieve regels; zet er eerst een uit`)
      return
    }
    setToevoegen(true)
    const nieuw = await createConventie(inhoud)
    setToevoegen(false)
    if (!nieuw) { toast.error('Toevoegen mislukt'); return }
    setConventies(prev => [...prev, nieuw])
    setNieuweRegel('')
    toast.success(<>Regel toegevoegd<span style={{ color: '#F15025' }}>.</span></>)
  }

  const handleConventieToggle = async (c: Conventie) => {
    if (!c.actief && actieveConventies >= MAX_ACTIEVE_CONVENTIES) {
      toast.error(`Maximaal ${MAX_ACTIEVE_CONVENTIES} actieve regels`)
      return
    }
    const ok = await updateConventie(c.id, { actief: !c.actief })
    if (!ok) { toast.error('Opslaan mislukt'); return }
    setConventies(prev => prev.map(r => r.id === c.id ? { ...r, actief: !c.actief } : r))
  }

  const handleConventieVerwijderen = async (c: Conventie) => {
    const ok = await deleteConventie(c.id)
    if (!ok) { toast.error('Verwijderen mislukt'); return }
    setConventies(prev => prev.filter(r => r.id !== c.id))
    toast.success(<>Verwijderd<span style={{ color: '#F15025' }}>.</span></>)
  }

  const handleLeertUitEmailToggle = async (aan: boolean) => {
    try {
      await updateSettings({ daan_leert_uit_email: aan })
      toast.success(
        aan
          ? <>Daan leert weer uit e-mail<span style={{ color: '#F15025' }}>.</span></>
          : <>Uitgezet. Mail blijft buiten het geheugen<span style={{ color: '#F15025' }}>.</span></>
      )
    } catch {
      toast.error('Opslaan mislukt')
    }
  }

  const handleAlgemeenHouden = async (r: DaanGeheugenRegel) => {
    const ok = await bevestigDaanGeheugen(r.id)
    if (!ok) { toast.error('Opslaan mislukt'); return }
    setAlgemeen(prev => prev.map(x => x.id === r.id ? { ...x, status: 'actief' } : x))
    toast.success(<>Daan onthoudt dit voortaan<span style={{ color: '#F15025' }}>.</span></>)
  }

  const handleAlgemeenWeggooien = async (r: DaanGeheugenRegel) => {
    const ok = await wijsDaanGeheugenAf(r.id)
    if (!ok) { toast.error('Weggooien mislukt'); return }
    setAlgemeen(prev => prev.filter(x => x.id !== r.id))
    toast.success(<>Weggegooid<span style={{ color: '#F15025' }}>.</span></>)
  }

  return (
    <>
      {/* Vaste regels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vaste regels</CardTitle>
          <CardDescription>
            Hoe jouw bedrijf werkt. Actieve regels gaan mee in elke Daan-aanroep; bij tegenspraak wint de bovenste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conventies.length > 0 && (
            <div className="space-y-1.5">
              {conventies.map(c => (
                <div key={c.id} className="group flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-b-0">
                  <p className={cn('text-sm min-w-0', c.actief ? 'text-foreground' : 'text-muted-foreground line-through')}>
                    {c.inhoud}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={c.actief} onCheckedChange={() => handleConventieToggle(c)} />
                    <button
                      onClick={() => handleConventieVerwijderen(c)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 transition-opacity"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              value={nieuweRegel}
              maxLength={300}
              onChange={e => setNieuweRegel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConventieToevoegen() }}
              placeholder='Bijv: "Naar aannemers schrijven we met je, naar particulieren met u"'
              className="h-9"
            />
            <Button size="sm" onClick={handleConventieToevoegen} disabled={toevoegen || !nieuweRegel.trim()}>
              Toevoegen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{actieveConventies}/{MAX_ACTIEVE_CONVENTIES}</span> actief · kort en stellend werkt het best
          </p>
        </CardContent>
      </Card>

      {/* Leren uit e-mail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Leren uit e-mail</CardTitle>
              <CardDescription className="mt-1.5">
                Daan haalt blijvende feiten uit mail van bekende klanten (bijv. een PO-nummer-eis) en
                zet ze als voorstel op je ochtendlijst. Alleen mail van adressen die als klant in je
                bestand staan; kernen worden na 30 dagen gewist. Zet je dit uit, dan blijft mail
                volledig buiten het geheugen.
              </CardDescription>
            </div>
            <Switch
              checked={settings.daan_leert_uit_email ?? true}
              onCheckedChange={handleLeertUitEmailToggle}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Bedrijfsbreed geheugen */}
      {algemeen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bedrijfsbreed geheugen</CardTitle>
            <CardDescription>
              Feiten die Daan vastlegde zonder ze aan één klant te kunnen hangen. Klant-feiten beheer je op de klantkaart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {algemeen.map(r => (
              <div key={r.id} className="group flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-b-0">
                <p className="text-sm text-foreground min-w-0">
                  {r.inhoud}
                  {r.status === 'actief' && <span className="ml-2 text-2xs text-muted-foreground">actief</span>}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.status !== 'actief' && (
                    <button
                      onClick={() => handleAlgemeenHouden(r)}
                      className="text-xs font-semibold text-white bg-flame hover:bg-[#E04520] px-2.5 py-1 rounded"
                    >
                      Houden
                    </button>
                  )}
                  <button
                    onClick={() => handleAlgemeenWeggooien(r)}
                    className="text-xs text-muted-foreground hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Weggooien
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nachtploeg-logboek */}
      {rondes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nachtploeg</CardTitle>
            <CardDescription>
              Daan leest &apos;s nachts de dag terug en zet voorstellen klaar op je dashboard. Deze rondes kosten jou niets van je AI-tegoed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-4 font-medium">Nacht</th>
                    <th className="py-1.5 pr-4 font-medium text-right">Sporen</th>
                    <th className="py-1.5 pr-4 font-medium text-right">Voorstellen</th>
                    <th className="py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rondes.map(r => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="py-1.5 pr-4 font-mono text-xs">
                        {new Date(r.gestart_op).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-1.5 pr-4 text-right font-mono text-xs">{r.sporen_gelezen}</td>
                      <td className="py-1.5 pr-4 text-right font-mono text-xs">{r.voorstellen}</td>
                      <td className="py-1.5 text-xs">
                        {r.status === 'klaar' ? 'klaar' : r.status}<span className="text-flame">.</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
