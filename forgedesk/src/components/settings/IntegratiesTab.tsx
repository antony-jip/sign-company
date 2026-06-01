import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Puzzle,
  CreditCard,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getAppSettings, updateAppSettings } from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '../../utils/logger'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'

const INTEGRATIES_TABS: SubTab[] = [
  { id: 'koppelingen', label: 'Koppelingen', icon: Puzzle },
]

async function saveIntegrationSettings(settings: Record<string, unknown>): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Niet ingelogd')
  const res = await fetch('/api/save-integration-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(settings),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Opslaan mislukt' }))
    throw new Error(err.error || 'Opslaan mislukt')
  }
}

export function IntegratiesTab() {
  const [subTab, setSubTab] = useState('koppelingen')
  const { user } = useAuth()
  const { refreshSettings } = useAppSettings()
  // Mollie state
  const [mollieEnabled, setMollieEnabled] = useState(false)
  const [mollieApiKey, setMollieApiKey] = useState('')
  const [mollieSaving, setMollieSaving] = useState(false)
  const [mollieLoaded, setMollieLoaded] = useState(false)

  // Exact Online state
  const [exactClientId, setExactClientId] = useState('')
  const [exactClientSecret, setExactClientSecret] = useState('')
  const [exactConnected, setExactConnected] = useState(false)
  const [exactSaving, setExactSaving] = useState(false)
  const [exactAdministratieId, setExactAdministratieId] = useState('')
  const [exactVerkoopboek, setExactVerkoopboek] = useState('80')
  const [exactGrootboek, setExactGrootboek] = useState('8090')
  const [exactBtwHoog, setExactBtwHoog] = useState('2')
  const [exactBtwLaag, setExactBtwLaag] = useState('')
  const [exactBtwNul, setExactBtwNul] = useState('')
  const [exactAdvancedOpen, setExactAdvancedOpen] = useState(false)
  const [exactHelpOpen, setExactHelpOpen] = useState(false)
  const [exactDocumentTypeId, setExactDocumentTypeId] = useState<number | null>(null)
  const [exactDocumentTypeNaam, setExactDocumentTypeNaam] = useState('')
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: number; description: string; typeCategory: number }>>([])
  const [docTypesLoading, setDocTypesLoading] = useState(false)
  const [docTypesError, setDocTypesError] = useState<string | null>(null)

  // Per-user koppeling-status. exact_owner_user_id is de eerste user die
  // OAuth deed; de UI verbergt de "Verbinden"-knop voor andere admins zodat
  // ze niet per ongeluk de actieve Exact-sessie van de eigenaar invalideren
  // (Exact Online staat geen twee gelijktijdige sessies per bedrijfsaccount
  // toe). De feitelijke connected-status voor de huidige user komt uit
  // /api/exact-token-status — niet uit de org-brede `exact_online_connected`
  // boolean, die alleen "iemand in de org heeft ooit gekoppeld" zegt.
  const [exactOwnerUserId, setExactOwnerUserId] = useState<string | null>(null)
  const [exactEigenTokens, setExactEigenTokens] = useState<boolean | null>(null)
  const [exactTokensVerlopen, setExactTokensVerlopen] = useState(false)

  // KvK API state
  const [kvkApiKey, setKvkApiKey] = useState('')
  const [kvkSaving, setKvkSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const isEncrypted = (v: string) => /^[0-9a-f]{32}:/.test(v)
    getAppSettings(user.id).then((s) => {
      setMollieEnabled(s.mollie_enabled ?? false)
      setMollieApiKey(isEncrypted(s.mollie_api_key ?? '') ? '' : (s.mollie_api_key ?? ''))
      setMollieLoaded(true)
      setExactClientId(s.exact_online_client_id ?? '')
      setExactClientSecret(isEncrypted(s.exact_online_client_secret ?? '') ? '' : (s.exact_online_client_secret ?? ''))
      setExactConnected(s.exact_online_connected ?? false)
      setExactOwnerUserId(s.exact_owner_user_id ?? null)
      setExactAdministratieId(s.exact_administratie_id ?? '')
      setExactVerkoopboek(s.exact_verkoopboek ?? '80')
      setExactGrootboek(s.exact_grootboek ?? '8090')
      setExactBtwHoog(s.exact_btw_hoog ?? '2')
      setExactBtwLaag(s.exact_btw_laag ?? '')
      setExactBtwNul(s.exact_btw_nul ?? '')
      setExactDocumentTypeId(s.exact_document_type_id ?? null)
      setExactDocumentTypeNaam(s.exact_document_type_naam ?? '')
      setKvkApiKey(s.kvk_api_key ?? '')
    }).catch(() => {})
  }, [user?.id])

  // OAuth callback detectie: ?exact=connected of ?exact=error in URL na
  // de redirect terug van Exact Online via /api/exact-callback.
  useEffect(() => {
    if (!user?.id) return
    const params = new URLSearchParams(window.location.search)
    const exactStatus = params.get('exact')
    if (!exactStatus) return

    if (exactStatus === 'connected') {
      toast.success('Exact Online succesvol verbonden')
      // Refresh de settings zodat de badge meteen groen wordt
      getAppSettings(user.id).then((s) => {
        setExactConnected(s.exact_online_connected ?? false)
        setExactOwnerUserId(s.exact_owner_user_id ?? null)
        setExactAdministratieId(s.exact_administratie_id ?? '')
        setExactDocumentTypeId(s.exact_document_type_id ?? null)
        setExactDocumentTypeNaam(s.exact_document_type_naam ?? '')
      }).catch(() => {})
      refreshSettings?.()
    } else if (exactStatus === 'error') {
      const reason = params.get('reason')
      const reasonText = reason ? ` (${reason.replace(/_/g, ' ')})` : ''
      toast.error(`Exact Online verbinden mislukt${reasonText}`)
    }

    // Schoon de query params op zodat een refresh van de pagina niet
    // opnieuw de toast triggert
    const url = new URL(window.location.href)
    url.searchParams.delete('exact')
    url.searchParams.delete('reason')
    window.history.replaceState({}, '', url.toString())
  }, [user?.id, refreshSettings])

  // Per-user token-status ophalen. Re-run wanneer `exactConnected` flipt
  // (b.v. na een succesvolle OAuth-callback) zodat de badge en knop direct
  // het nieuwe beeld tonen.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function fetchStatus() {
      try {
        const { data: sess } = await supabase.auth.getSession()
        const token = sess?.session?.access_token
        if (!token) {
          if (!cancelled) setExactEigenTokens(false)
          return
        }
        const res = await fetch('/api/exact-token-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setExactEigenTokens(false)
          return
        }
        const data = await res.json() as { heeftTokens: boolean; verlopen: boolean }
        if (!cancelled) {
          setExactEigenTokens(data.heeftTokens)
          setExactTokensVerlopen(data.verlopen)
        }
      } catch {
        if (!cancelled) setExactEigenTokens(false)
      }
    }
    fetchStatus()
    return () => { cancelled = true }
  }, [user?.id, exactConnected])

  const isExactEigenaar = !exactOwnerUserId || exactOwnerUserId === user?.id
  // Badge-status. Voor de eigenaar: leidend is per-user `exactEigenTokens`
  // (de waarheid uit /api/exact-token-status). Voor niet-eigenaren bestaat
  // er geen eigen tokens-rij waaraan we kunnen aflezen of "iemand anders"
  // gekoppeld is — daarom valt de badge bij hen terug op de org-brede
  // `exact_online_connected` boolean (informatief). Tijdens de loading
  // van de status-fetch tonen we de org-flag als best-effort fallback.
  const exactBadgeVerbonden = isExactEigenaar
    ? (exactEigenTokens ?? exactConnected)
    : exactConnected

  const loadDocumentTypes = useCallback(async () => {
    if (!exactConnected) return
    setDocTypesLoading(true)
    setDocTypesError(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/exact-document-types', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Status ${res.status}`)
      }
      const data = await res.json() as Array<{ id: number; description: string; typeCategory: number }>
      setDocumentTypes(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      setDocTypesError(msg)
      logger.error('DocumentTypes laden mislukt:', err)
    } finally {
      setDocTypesLoading(false)
    }
  }, [exactConnected])

  // Alleen DocumentTypes ophalen als deze user zelf geldige tokens heeft.
  // Bij niet-eigenaars zonder eigen exact_tokens-rij zou de call een 401
  // van Exact triggeren en (na commit 2) hun token-rij verwijderen — voor
  // niets, want ze koppelen niet zelf.
  useEffect(() => {
    if (exactConnected && exactEigenTokens) loadDocumentTypes()
  }, [exactConnected, exactEigenTokens, loadDocumentTypes])

  const handleExactConnect = async () => {
    if (!user?.id) return
    // Defense-in-depth: niet-eigenaars zien de knop niet, maar wie hem
    // toch triggert (URL-hack, oud state) moet hier alsnog stoppen om
    // de Exact-sessie van de eigenaar niet onbedoeld te invalideren.
    if (!isExactEigenaar) {
      toast.error('Alleen de eigenaar van de Exact-koppeling kan opnieuw verbinden')
      return
    }
    setExactSaving(true)
    try {
      // Sla eerst eventuele wijzigingen in client_id/secret op zodat de
      // OAuth flow zeker met de juiste credentials werkt.
      await saveIntegrationSettings({
        exact_online_client_id: exactClientId,
        exact_online_client_secret: exactClientSecret,
      })
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        toast.error('Niet ingelogd')
        return
      }
      window.location.href = `/api/exact-auth?token=${encodeURIComponent(token)}`
    } catch (err) {
      logger.error('Fout bij starten Exact Online OAuth:', err)
      toast.error('Kon niet verbinden met Exact Online')
    } finally {
      setExactSaving(false)
    }
  }

  const handleMollieSave = async () => {
    if (!user?.id) return
    setMollieSaving(true)
    try {
      await saveIntegrationSettings({ mollie_enabled: mollieEnabled, mollie_api_key: mollieApiKey })
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Fout bij opslaan Mollie instellingen:', err)
      toast.error('Kon Mollie instellingen niet opslaan')
    } finally {
      setMollieSaving(false)
    }
  }

  const handleExactSave = async () => {
    if (!user?.id) return
    setExactSaving(true)
    try {
      await saveIntegrationSettings({
        exact_online_client_id: exactClientId,
        exact_online_client_secret: exactClientSecret,
        exact_administratie_id: exactAdministratieId,
        exact_document_type_id: exactDocumentTypeId,
        exact_document_type_naam: exactDocumentTypeNaam,
        exact_verkoopboek: exactVerkoopboek,
        exact_grootboek: exactGrootboek,
        exact_btw_hoog: exactBtwHoog,
        exact_btw_laag: exactBtwLaag,
        exact_btw_nul: exactBtwNul,
      })
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Fout bij opslaan Exact Online instellingen:', err)
      toast.error('Kon Exact Online instellingen niet opslaan')
    } finally {
      setExactSaving(false)
    }
  }

  return (
    <>
    <SubTabNav tabs={INTEGRATIES_TABS} active={subTab} onChange={setSubTab} variant="underline" />
    <div className="space-y-4">
      {/* ── Mollie Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#F15025]/10 dark:bg-[#F15025]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-[#F15025]" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Mollie Betalingen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vul je Mollie API key in. Klanten kunnen dan direct betalen via de betaalpagina.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mollie-enabled" className="text-sm font-medium">
                  Mollie betalingen inschakelen
                </Label>
                <Switch
                  id="mollie-enabled"
                  checked={mollieEnabled}
                  onCheckedChange={setMollieEnabled}
                />
              </div>

              {mollieEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="mollie-api-key" className="text-sm font-medium">
                    Mollie API key
                  </Label>
                  <Input
                    id="mollie-api-key"
                    type="password"
                    value={mollieApiKey}
                    onChange={(e) => setMollieApiKey(e.target.value)}
                    placeholder="live_... of test_..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Je vindt je API key in het{' '}
                    <a
                      href="https://my.mollie.com/dashboard/developers/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline inline-flex items-center gap-0.5"
                    >
                      Mollie Dashboard <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleMollieSave} disabled={mollieSaving} size="sm">
                  {mollieSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Exact Online Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#1A535C]/10 dark:bg-[#2A7A86]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[#1A535C] dark:text-[#2A7A86]" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-semibold text-foreground">Exact Online</h3>
                <Badge
                  className={
                    exactBadgeVerbonden
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground/60'
                  }
                >
                  {exactBadgeVerbonden ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verbonden
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Niet verbonden
                    </span>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Koppel Exact Online om facturen, relaties en boekingen automatisch te synchroniseren.
              </p>

              {/* Help / instructie sectie */}
              <div className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setExactHelpOpen(!exactHelpOpen)}
                  className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Hoe koppel ik Exact Online?</span>
                  <ArrowRight className={cn('w-4 h-4 transition-transform', exactHelpOpen && 'rotate-90')} />
                </button>
                {exactHelpOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      <li>
                        Ga naar{' '}
                        <a
                          href="https://apps.exactonline.nl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-0.5"
                        >
                          apps.exactonline.nl <ExternalLink className="w-3 h-3" />
                        </a>{' '}
                        en log in
                      </li>
                      <li>Klik op &ldquo;Mijn apps beheren&rdquo; → &ldquo;App toevoegen&rdquo;</li>
                      <li>
                        Vul in: naam (bijv. &ldquo;doen.&rdquo;), redirect URI:{' '}
                        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                          https://app.doen.team/api/exact-callback
                        </code>
                      </li>
                      <li>Kopieer de Client ID en Client Secret die Exact toont</li>
                      <li>Plak ze hieronder in de velden en klik op &ldquo;Verbinden&rdquo;</li>
                      <li>Log in bij Exact wanneer het inlogscherm verschijnt. Daarna ben je gekoppeld</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                      Na het verbinden kun je bij elke factuur op &ldquo;Sync naar Exact&rdquo; klikken
                      om deze automatisch in je boekhouding te zetten.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="exact-client-id" className="text-sm font-medium">
                    Client ID
                  </Label>
                  <Input
                    id="exact-client-id"
                    value={exactClientId}
                    onChange={(e) => setExactClientId(e.target.value)}
                    placeholder="Exact Online Client ID"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exact-client-secret" className="text-sm font-medium">
                    Client Secret
                  </Label>
                  <Input
                    id="exact-client-secret"
                    type="password"
                    value={exactClientSecret}
                    onChange={(e) => setExactClientSecret(e.target.value)}
                    placeholder="Exact Online Client Secret"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maak een app aan in het{' '}
                  <a
                    href="https://apps.exactonline.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    Exact Online App Center <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  om je Client ID en Secret te verkrijgen.
                </p>
              </div>

              {/* Geavanceerde Exact Online instellingen */}
              <div className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setExactAdvancedOpen(!exactAdvancedOpen)}
                  className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Geavanceerde instellingen</span>
                  <ArrowRight className={cn('w-4 h-4 transition-transform', exactAdvancedOpen && 'rotate-90')} />
                </button>
                {exactAdvancedOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                    <div className="space-y-2">
                      <Label htmlFor="exact-admin-id" className="text-sm">Administratie ID</Label>
                      <Input id="exact-admin-id" value={exactAdministratieId} onChange={(e) => setExactAdministratieId(e.target.value)} placeholder="Exact administratie ID" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exact-doctype" className="text-sm">Document-type voor bijlagen</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadDocumentTypes}
                          disabled={docTypesLoading || !exactConnected}
                          className="h-7 text-xs gap-1"
                        >
                          <RefreshCw className={cn('w-3 h-3', docTypesLoading && 'animate-spin')} />
                          Opnieuw ophalen
                        </Button>
                      </div>
                      {docTypesError ? (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Lijst ophalen mislukt: {docTypesError}. Huidige keuze: {exactDocumentTypeNaam || '(geen)'}
                        </div>
                      ) : (
                        <Select
                          value={exactDocumentTypeId != null ? String(exactDocumentTypeId) : ''}
                          onValueChange={(v) => {
                            const id = parseInt(v, 10)
                            const t = documentTypes.find((dt) => dt.id === id)
                            setExactDocumentTypeId(id)
                            setExactDocumentTypeNaam(t?.description ?? '')
                          }}
                          disabled={docTypesLoading || documentTypes.length === 0}
                        >
                          <SelectTrigger id="exact-doctype" className="text-sm">
                            <SelectValue placeholder={docTypesLoading ? 'Laden...' : (documentTypes.length === 0 ? 'Geen types beschikbaar' : 'Kies type...')} />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                <div className="flex flex-col">
                                  <span>{t.description}</span>
                                  <span className="text-xs text-muted-foreground">Categorie {t.typeCategory}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-muted-foreground">Bepaalt waar PDF-bijlagen worden geboekt in Exact bij synchroniseren.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="exact-verkoopboek" className="text-sm">Verkoopboek code</Label>
                        <Input id="exact-verkoopboek" value={exactVerkoopboek} onChange={(e) => setExactVerkoopboek(e.target.value)} placeholder="80" className="font-mono text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exact-grootboek" className="text-sm">Grootboek code</Label>
                        <Input id="exact-grootboek" value={exactGrootboek} onChange={(e) => setExactGrootboek(e.target.value)} placeholder="8090" className="font-mono text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="exact-btw-hoog" className="text-sm">BTW code hoog</Label>
                        <Input id="exact-btw-hoog" value={exactBtwHoog} onChange={(e) => setExactBtwHoog(e.target.value)} placeholder="2" className="font-mono text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exact-btw-laag" className="text-sm">BTW code laag</Label>
                        <Input id="exact-btw-laag" value={exactBtwLaag} onChange={(e) => setExactBtwLaag(e.target.value)} placeholder="" className="font-mono text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exact-btw-nul" className="text-sm">BTW code nul</Label>
                        <Input id="exact-btw-nul" value={exactBtwNul} onChange={(e) => setExactBtwNul(e.target.value)} placeholder="" className="font-mono text-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Deze codes worden gebruikt bij het genereren van UBL-bestanden voor Exact Online.</p>
                  </div>
                )}
              </div>

              {!isExactEigenaar && exactConnected && (
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Exact Online is gekoppeld door een collega. Je kunt facturen
                  syncen met je eigen tokens, maar opnieuw verbinden zou de
                  actieve sessie verbreken — alleen de eigenaar kan dat doen.
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button onClick={handleExactSave} disabled={exactSaving} size="sm" variant="outline">
                  {exactSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
                {isExactEigenaar && (
                  <Button
                    size="sm"
                    disabled={!exactClientId || !exactClientSecret || exactSaving}
                    onClick={handleExactConnect}
                    className="gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {exactEigenTokens ? 'Opnieuw verbinden' : 'Verbinden'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KvK API Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#1A535C]/10 dark:bg-[#2A7A86]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[#1A535C] dark:text-[#2A7A86] font-bold text-sm">KvK</span>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">KvK API</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Zoek bedrijfsgegevens op via de Kamer van Koophandel. Zonder API key wordt de testomgeving gebruikt.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kvk-api-key" className="text-sm font-medium">
                  KvK API key (optioneel)
                </Label>
                <Input
                  id="kvk-api-key"
                  type="password"
                  value={kvkApiKey}
                  onChange={(e) => setKvkApiKey(e.target.value)}
                  placeholder="l7xx..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Vraag een API key aan via{' '}
                  <a
                    href="https://developers.kvk.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    developers.kvk.nl <ExternalLink className="w-3 h-3" />
                  </a>
                  . Zonder key worden testgegevens gebruikt.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!user?.id) return
                    setKvkSaving(true)
                    try {
                      await updateAppSettings(user.id, {
                        kvk_api_key: kvkApiKey,
                        kvk_api_enabled: !!kvkApiKey,
                      })
                      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
                    } catch (err) {
                      logger.error('Fout bij opslaan KvK instellingen:', err)
                      toast.error('Kon KvK instellingen niet opslaan')
                    } finally {
                      setKvkSaving(false)
                    }
                  }}
                  disabled={kvkSaving}
                  size="sm"
                >
                  {kvkSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
    </>
  )
}
