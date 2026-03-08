import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Key, Coins, Settings, Sparkles, RotateCcw, Save,
  Eye, Plus, Info, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { round2 } from '@/utils/budgetUtils'
import {
  DEFAULT_VISUALIZER_INSTELLINGEN,
  berekenDoorberekendBedrag,
  bouwPrompt,
  KOSTEN_PER_RESOLUTIE_USD,
} from '@/utils/visualizerDefaults'
import {
  getVisualizerInstellingen,
  saveVisualizerInstellingen,
  getVisualizerLog,
  getVisualizerCredits,
  handmatigCreditsToewijzen,
  getCreditTransacties,
} from '@/services/supabaseService'
import type { VisualizerInstellingen, VisualizerApiLog, CreditTransactie } from '@/types'
import { VisualizerKostenDashboard } from '@/components/visualizer/VisualizerKostenDashboard'

export function VisualizerTab() {
  const { user } = useAuth()
  const [instellingen, setInstellingen] = useState<VisualizerInstellingen>(DEFAULT_VISUALIZER_INSTELLINGEN)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [log, setLog] = useState<VisualizerApiLog[]>([])
  const [promptPreview, setPromptPreview] = useState<string | null>(null)

  // Credits
  const [creditSaldo, setCreditSaldo] = useState(0)
  const [handmatigAantal, setHandmatigAantal] = useState('')
  const [handmatigReden, setHandmatigReden] = useState('')
  const [transacties, setTransacties] = useState<CreditTransactie[]>([])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function load() {
      try {
        const [inst, apiLog, credits, trans] = await Promise.all([
          getVisualizerInstellingen(user!.id),
          getVisualizerLog(user!.id),
          getVisualizerCredits(user!.id),
          getCreditTransacties(user!.id),
        ])
        if (cancelled) return
        setInstellingen(inst)
        setLog(apiLog.slice(0, 20))
        setCreditSaldo(credits.saldo)
        setTransacties(trans.slice(0, 20))
      } catch { /* ignore */ }
      if (!cancelled) setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const handleSave = useCallback(async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const saved = await saveVisualizerInstellingen(user.id, instellingen)
      setInstellingen(saved)
      toast.success('Instellingen opgeslagen')
    } catch {
      toast.error('Opslaan mislukt')
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, instellingen])

  const handleReset = useCallback((field: keyof VisualizerInstellingen) => {
    setInstellingen(prev => ({
      ...prev,
      [field]: DEFAULT_VISUALIZER_INSTELLINGEN[field],
    }))
  }, [])

  const handlePreview = useCallback((type: string) => {
    const prompt = bouwPrompt(type, 'wit', instellingen)
    setPromptPreview(prompt)
  }, [instellingen])

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
      setTransacties(trans.slice(0, 20))
      toast.success(`${aantal} credits ${aantal > 0 ? 'toegevoegd' : 'verwijderd'}`)
    } catch {
      toast.error('Credits toevoegen mislukt')
    }
  }, [user?.id, handmatigAantal, handmatigReden])

  const update = (field: keyof VisualizerInstellingen, value: unknown) => {
    setInstellingen(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Calculate example costs
  const exampleKostenUsd = KOSTEN_PER_RESOLUTIE_USD['2K'] || 0.12
  const exampleKostenEur = round2(exampleKostenUsd * instellingen.usd_eur_wisselkoers)
  const exampleDoorberekend = berekenDoorberekendBedrag(exampleKostenUsd, instellingen)

  return (
    <div className="space-y-6">
      {/* API Warning */}
      {!instellingen.fal_api_key_geconfigureerd && (
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

      {/* API Configuratie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" /> API Configuratie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status fal.ai API key:</span>
            {instellingen.fal_api_key_geconfigureerd ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Geconfigureerd</Badge>
            ) : (
              <Badge variant="destructive">Niet geconfigureerd</Badge>
            )}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Instructies voor configuratie
            </summary>
            <ol className="mt-2 ml-4 space-y-1 text-muted-foreground list-decimal">
              <li>Maak een account op fal.ai</li>
              <li>Ga naar fal.ai/dashboard/keys</li>
              <li>Genereer een nieuwe API key</li>
              <li>Voeg toe als <code className="bg-muted px-1 rounded">FAL_AI_API_KEY</code> in Vercel Environment Variables</li>
              <li>Herstart de deployment</li>
            </ol>
          </details>
        </CardContent>
      </Card>

      {/* Kosten & Doorberekening */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4" /> Kosten & Doorberekening
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">USD/EUR wisselkoers</Label>
              <Input
                type="number"
                step="0.01"
                value={instellingen.usd_eur_wisselkoers}
                onChange={(e) => update('usd_eur_wisselkoers', parseFloat(e.target.value) || 0.92)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Opslag percentage (%)</Label>
              <Input
                type="number"
                value={instellingen.opslag_percentage}
                onChange={(e) => update('opslag_percentage', parseInt(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Voorbeeld: API $0.12 → €{exampleKostenEur} + {instellingen.opslag_percentage}% = €{exampleDoorberekend}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm">Standaard doorberekenen</Label>
            <Switch
              checked={instellingen.standaard_doorberekenen}
              onCheckedChange={(v) => update('standaard_doorberekenen', v)}
            />
          </div>

          <div>
            <Label className="text-xs">Omschrijving op offerte</Label>
            <Input
              value={instellingen.doorberekening_omschrijving}
              onChange={(e) => update('doorberekening_omschrijving', e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">BTW percentage (%)</Label>
            <Input
              type="number"
              value={instellingen.doorberekening_btw_percentage}
              onChange={(e) => update('doorberekening_btw_percentage', parseInt(e.target.value) || 21)}
              className="text-sm w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Standaard Instellingen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" /> Standaard Instellingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs">Standaard resolutie</Label>
            <div className="flex gap-2 mt-1">
              {(['1K', '2K', '4K'] as const).map((res) => (
                <Button
                  key={res}
                  size="sm"
                  variant={instellingen.standaard_resolutie === res ? 'default' : 'outline'}
                  onClick={() => update('standaard_resolutie', res)}
                  className="text-xs"
                >
                  {res} (${KOSTEN_PER_RESOLUTIE_USD[res]})
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              2K is voldoende voor klantpresentaties
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Configuratie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Prompt Configuratie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System prefix */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Systeem prompt prefix (altijd actief)</Label>
              <Button size="sm" variant="ghost" className="text-xs h-6 gap-1"
                onClick={() => handleReset('systeem_prompt_prefix')}>
                <RotateCcw className="h-3 w-3" /> Herstel
              </Button>
            </div>
            <Textarea
              value={instellingen.systeem_prompt_prefix}
              onChange={(e) => update('systeem_prompt_prefix', e.target.value)}
              className="text-xs font-mono"
              rows={4}
            />
          </div>

          <Separator />

          {/* Per type prompts */}
          {([
            ['prompt_led_verlicht', 'LED Verlicht', 'led_verlicht'],
            ['prompt_neon', 'Neon', 'neon'],
            ['prompt_dag_onverlicht', 'Dag onverlicht', 'dag_onverlicht'],
            ['prompt_dag_nacht', 'Dag/Nacht split', 'dag_nacht'],
          ] as [keyof VisualizerInstellingen, string, string][]).map(([field, label, type]) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">{label} prompt template</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-xs h-6 gap-1"
                    onClick={() => handlePreview(type)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-6 gap-1"
                    onClick={() => handleReset(field)}>
                    <RotateCcw className="h-3 w-3" /> Herstel
                  </Button>
                </div>
              </div>
              <Textarea
                value={instellingen[field] as string}
                onChange={(e) => update(field, e.target.value)}
                className="text-xs font-mono"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Gebruik {'{{KLEUR}}'} voor de gekozen kleur.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Prompt Preview Modal */}
      {promptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPromptPreview(null)}>
          <div className="bg-background rounded-lg p-6 max-w-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-medium mb-3">Prompt Preview (kleur: wit)</h3>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-3 rounded">{promptPreview}</pre>
            <Button className="mt-3" onClick={() => setPromptPreview(null)}>Sluiten</Button>
          </div>
        </div>
      )}

      {/* Credits Beheer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4" /> Credits Beheer
          </CardTitle>
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
                placeholder="Aantal (negatief om te verwijderen)"
                className="text-sm flex-1"
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
              <Label className="text-xs mb-2 block">Transactiehistorie</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Datum</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Aantal</th>
                      <th className="text-right p-2">Saldo na</th>
                      <th className="text-left p-2">Beschrijving</th>
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
                        <td className="p-2 text-muted-foreground">{t.beschrijving}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistieken */}
      <VisualizerKostenDashboard />

      {/* API Log */}
      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" /> Recente API Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Actie</th>
                    <th className="text-right p-2">Kosten</th>
                    <th className="text-left p-2">Fout</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="p-2 text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{entry.actie}</Badge>
                      </td>
                      <td className="p-2 text-right">
                        {entry.api_kosten_usd ? `$${entry.api_kosten_usd}` : '—'}
                      </td>
                      <td className="p-2 text-red-500 text-xs truncate max-w-[200px]">
                        {entry.fout_melding || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </div>
  )
}
