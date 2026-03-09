import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Upload, Trash2, Save, FileText, Loader2, CheckCircle2, Bot, Pen,
  Coins, Palette, Plus, AlertTriangle, Info,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
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
} from '@/utils/visualizerDefaults'
import {
  getVisualizerInstellingen,
  saveVisualizerInstellingen,
  getVisualizerCredits,
  handmatigCreditsToewijzen,
  getCreditTransacties,
} from '@/services/supabaseService'
import type { VisualizerInstellingen, CreditTransactie } from '@/types'

function parseCsv(text: string): Array<Record<string, string>> {
  // Strip UTF-8 BOM
  let cleaned = text
  if (cleaned.charCodeAt(0) === 0xFEFF) cleaned = cleaned.slice(1)

  // Detect delimiter from first line
  const firstNewline = cleaned.indexOf('\n')
  const firstLine = firstNewline > -1 ? cleaned.slice(0, firstNewline) : cleaned
  const delimiter = firstLine.includes(';') ? ';' : ','

  // Parse with proper quoted field handling (fields can contain delimiters and newlines)
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
          // Escaped quote
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < cleaned.length && cleaned[i + 1] === '\n') i++
        currentRow.push(currentField.trim())
        if (currentRow.some(f => f !== '')) rows.push(currentRow)
        currentRow = []
        currentField = ''
      } else {
        currentField += ch
      }
    }
  }
  // Last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(f => f !== '')) rows.push(currentRow)
  }

  if (rows.length < 2) return []

  const headers = rows[0]
  const result: Array<Record<string, string>> = []

  for (let i = 1; i < rows.length; i++) {
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      if (h) row[h] = rows[i][j] || ''
    })
    result.push(row)
  }

  return result
}

export function ForgieTab() {
  const { user } = useAuth()
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
  const [handmatigAantal, setHandmatigAantal] = useState('')
  const [handmatigReden, setHandmatigReden] = useState('')
  const [transacties, setTransacties] = useState<CreditTransactie[]>([])

  useEffect(() => {
    setBedrijfscontext(settings.forgie_bedrijfscontext || '')
  }, [settings.forgie_bedrijfscontext])

  useEffect(() => {
    setToneOfVoice(settings.ai_tone_of_voice || '')
  }, [settings.ai_tone_of_voice])

  // Load visualizer settings + credits
  useEffect(() => {
    if (!user?.id) return
    getVisualizerInstellingen(user.id).then(setVisInstellingen).catch(() => {})
    getVisualizerCredits(user.id).then(c => setCreditSaldo(c.saldo)).catch(() => {})
    getCreditTransacties(user.id).then(t => setTransacties(t.slice(0, 10))).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    loadImports()
  }, [])

  const loadImports = useCallback(async () => {
    setLoadingImports(true)
    try {
      const data = await getForgieImports()
      setImports(data)
    } catch {
      // ignore
    } finally {
      setLoadingImports(false)
    }
  }, [])

  const handleSaveContext = useCallback(async () => {
    setSaving(true)
    try {
      await updateSettings({ forgie_bedrijfscontext: bedrijfscontext })
      toast.success('Bedrijfscontext opgeslagen')
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }, [bedrijfscontext, updateSettings, settings])

  const handleSaveTone = useCallback(async () => {
    setSavingTone(true)
    try {
      await updateSettings({ ai_tone_of_voice: toneOfVoice })
      toast.success('Schrijfstijl opgeslagen')
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setSavingTone(false)
    }
  }, [toneOfVoice, updateSettings])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return

      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error('Geen data gevonden in het bestand')
        return
      }

      const headers = Object.keys(rows[0])
      setPreviewData({ name: file.name, rows, headers })
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!previewData) return
    setUploading(true)
    try {
      const result = await importCsvToForgie(previewData.name, previewData.rows)
      toast.success(`${result.count} rijen geïmporteerd`)
      setPreviewData(null)
      loadImports()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import mislukt')
    } finally {
      setUploading(false)
    }
  }, [previewData, loadImports])

  const handleDeleteImport = useCallback(async (bestandsnaam: string) => {
    try {
      await deleteForgieImport(bestandsnaam)
      toast.success('Import verwijderd')
      loadImports()
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }, [loadImports])

  // Visualizer handlers
  const updateVisInstelling = (field: keyof VisualizerInstellingen, value: unknown) => {
    setVisInstellingen(prev => ({ ...prev, [field]: value }))
  }

  const handleVisSave = useCallback(async () => {
    if (!user?.id) return
    setVisSaving(true)
    try {
      const saved = await saveVisualizerInstellingen(user.id, visInstellingen)
      setVisInstellingen(saved)
      toast.success('Visualizer instellingen opgeslagen')
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setVisSaving(false)
    }
  }, [user?.id, visInstellingen])

  const handleCreditsToevoegen = useCallback(async () => {
    if (!user?.id) return
    const aantal = parseInt(handmatigAantal)
    if (isNaN(aantal) || aantal === 0) {
      toast.error('Voer een geldig aantal in')
      return
    }
    try {
      const result = await handmatigCreditsToewijzen(user.id, aantal, handmatigReden || 'Handmatig toegevoegd')
      setCreditSaldo(result.saldo)
      setHandmatigAantal('')
      setHandmatigReden('')
      const trans = await getCreditTransacties(user.id)
      setTransacties(trans.slice(0, 10))
      toast.success(`${aantal} credits ${aantal > 0 ? 'toegevoegd' : 'verwijderd'}`)
    } catch {
      toast.error('Credits toevoegen mislukt')
    }
  }, [user?.id, handmatigAantal, handmatigReden])

  const handleToggleForgie = useCallback(async (enabled: boolean) => {
    try {
      await updateSettings({ forgie_enabled: enabled })
      toast.success(enabled ? 'Forgie ingeschakeld' : 'Forgie uitgeschakeld')
    } catch {
      toast.error('Instelling opslaan mislukt')
    }
  }, [updateSettings])

  return (
    <div className="space-y-6">
      {/* Forgie aan/uit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forgie assistent</CardTitle>
          <CardDescription>
            Schakel de Forgie AI-assistent in of uit. Wanneer uitgeschakeld wordt het vosje niet meer getoond.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="forgie-toggle" className="flex items-center gap-2 cursor-pointer">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <span>Forgie tonen</span>
            </Label>
            <Switch
              id="forgie-toggle"
              checked={settings.forgie_enabled ?? true}
              onCheckedChange={handleToggleForgie}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bedrijfscontext */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrijfscontext</CardTitle>
          <CardDescription>
            Vertel Forgie over je bedrijf. Deze informatie wordt meegegeven bij elke vraag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={bedrijfscontext}
            onChange={e => setBedrijfscontext(e.target.value.slice(0, 500))}
            placeholder="Bijv: Wij zijn een signbedrijf in Enkhuizen, gespecialiseerd in lichtreclames en gevelbelettering. We werken met 4 monteurs."
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {bedrijfscontext.length}/500 tekens
            </span>
            <Button
              size="sm"
              onClick={handleSaveContext}
              disabled={saving}
              className="gap-1.5"
            >
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
            onChange={e => setToneOfVoice(e.target.value.slice(0, 1000))}
            placeholder="Bijv: Ik schrijf zakelijk maar toegankelijk. Ik gebruik 'u' voor klanten. Korte zinnen, geen jargon. Altijd positief en oplossingsgericht. Of plak hier een voorbeeld-email die je stijl goed weergeeft."
            rows={5}
            className="resize-none"
            enableAI={false}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {toneOfVoice.length}/1000 tekens
            </span>
            <Button
              size="sm"
              onClick={handleSaveTone}
              disabled={savingTone}
              className="gap-1.5"
            >
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
            Upload een CSV bestand met je oude bedrijfsdata. Forgie kan dan vragen beantwoorden over je hele historie — ook van voor FORGEdesk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              CSV uploaden
            </Button>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{previewData.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {previewData.rows.length} rijen
                </Badge>
              </div>

              {/* Preview table */}
              <div className="border rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {previewData.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {previewData.headers.map(h => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                            {row[h]}
                          </td>
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
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Importeren
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewData(null)}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          )}

          {/* Imported files list */}
          {loadingImports ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Imports laden...
            </div>
          ) : imports.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Geïmporteerde bestanden
              </p>
              {imports.map(imp => (
                <div
                  key={imp.bestandsnaam}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{imp.bestandsnaam}</p>
                      <p className="text-xs text-muted-foreground">
                        {imp.count} rijen &middot; {new Date(imp.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 flex-shrink-0"
                    onClick={() => handleDeleteImport(imp.bestandsnaam)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nog geen bestanden geïmporteerd.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══ VISUALIZER INSTELLINGEN ═══ */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4" />
          Signing Visualizer
        </h3>
      </div>

      {/* API Status */}
      {!visInstellingen.fal_api_key_geconfigureerd && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-300">
              fal.ai API key niet geconfigureerd
            </p>
            <p className="text-yellow-700 dark:text-yellow-400 mt-1">
              Voeg <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">FAL_AI_API_KEY</code> toe aan je Vercel Environment Variables om de visualizer te activeren.
            </p>
          </div>
        </div>
      )}

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-muted-foreground" />
            Visualizer Credits
          </CardTitle>
          <CardDescription>
            Credits worden gebruikt voor het genereren van signing mockups. Elke generatie kost 1 credit (4K: 2 credits).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm">Huidig saldo:</span>
            <Badge className="text-lg px-3 py-1">{creditSaldo} credits</Badge>
          </div>

          <Separator />

          <div>
            <Label className="text-xs mb-1 block">Handmatig credits toevoegen/verwijderen</Label>
            <div className="flex gap-2">
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
          </div>

          {transacties.length > 0 && (
            <div>
              <Label className="text-xs mb-2 block">Recente transacties</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Datum</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Aantal</th>
                      <th className="text-right p-2">Saldo na</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacties.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2 text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">{t.type}</Badge>
                        </td>
                        <td className={`p-2 text-right font-medium ${t.aantal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {t.aantal > 0 ? '+' : ''}{t.aantal}
                        </td>
                        <td className="p-2 text-right">{t.saldo_na}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
              <Input
                type="number"
                step="0.01"
                value={visInstellingen.usd_eur_wisselkoers}
                onChange={(e) => updateVisInstelling('usd_eur_wisselkoers', parseFloat(e.target.value) || 0.92)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Opslag percentage (%)</Label>
              <Input
                type="number"
                value={visInstellingen.opslag_percentage}
                onChange={(e) => updateVisInstelling('opslag_percentage', parseInt(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Voorbeeld (2K): API $0.12 &rarr; &euro;{round2(0.12 * visInstellingen.usd_eur_wisselkoers)} + {visInstellingen.opslag_percentage}% = &euro;{berekenDoorberekendBedrag(0.12, visInstellingen)}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm">Standaard doorberekenen aan klant</Label>
            <Switch
              checked={visInstellingen.standaard_doorberekenen}
              onCheckedChange={(v) => updateVisInstelling('standaard_doorberekenen', v)}
            />
          </div>

          <div>
            <Label className="text-xs">Omschrijving op offerte</Label>
            <Input
              value={visInstellingen.doorberekening_omschrijving}
              onChange={(e) => updateVisInstelling('doorberekening_omschrijving', e.target.value)}
              className="text-sm"
            />
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
                  {res} (${KOSTEN_PER_RESOLUTIE_USD[res]})
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
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Claude Sonnet 4.6
            </Badge>
            <span className="text-sm text-muted-foreground">
              Forgie, email-tools en visualizer draaien allemaal op Claude Sonnet 4.6
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
