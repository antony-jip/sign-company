import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Puzzle,
  CreditCard,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ArrowRight,
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

  // KvK API state
  const [kvkApiKey, setKvkApiKey] = useState('')
  const [kvkSaving, setKvkSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getAppSettings(user.id).then((s) => {
      setMollieEnabled(s.mollie_enabled ?? false)
      setMollieApiKey(s.mollie_api_key ?? '')
      setMollieLoaded(true)
      setExactClientId(s.exact_online_client_id ?? '')
      setExactClientSecret(s.exact_online_client_secret ?? '')
      setExactConnected(s.exact_online_connected ?? false)
      setExactAdministratieId(s.exact_administratie_id ?? '')
      setExactVerkoopboek(s.exact_verkoopboek ?? '80')
      setExactGrootboek(s.exact_grootboek ?? '8090')
      setExactBtwHoog(s.exact_btw_hoog ?? '2')
      setExactBtwLaag(s.exact_btw_laag ?? '')
      setExactBtwNul(s.exact_btw_nul ?? '')
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
        setExactAdministratieId(s.exact_administratie_id ?? '')
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

  const handleExactConnect = async () => {
    if (!user?.id) return
    setExactSaving(true)
    try {
      // Sla eerst eventuele wijzigingen in client_id/secret op zodat de
      // OAuth flow zeker met de juiste credentials werkt.
      await updateAppSettings(user.id, {
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
      await updateAppSettings(user.id, { mollie_enabled: mollieEnabled, mollie_api_key: mollieApiKey })
      toast.success('Opgeslagen.')
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
      await updateAppSettings(user.id, {
        exact_online_client_id: exactClientId,
        exact_online_client_secret: exactClientSecret,
        exact_administratie_id: exactAdministratieId,
        exact_verkoopboek: exactVerkoopboek,
        exact_grootboek: exactGrootboek,
        exact_btw_hoog: exactBtwHoog,
        exact_btw_laag: exactBtwLaag,
        exact_btw_nul: exactBtwNul,
      })
      toast.success('Opgeslagen.')
    } catch (err) {
      logger.error('Fout bij opslaan Exact Online instellingen:', err)
      toast.error('Kon Exact Online instellingen niet opslaan')
    } finally {
      setExactSaving(false)
    }
  }

  return (
    <>
    <SubTabNav tabs={INTEGRATIES_TABS} active={subTab} onChange={setSubTab} />
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
                    exactConnected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground/60'
                  }
                >
                  {exactConnected ? (
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
                      <li>Log in bij Exact wanneer het inlogscherm verschijnt — daarna ben je gekoppeld</li>
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

              <div className="flex justify-end gap-2">
                <Button onClick={handleExactSave} disabled={exactSaving} size="sm" variant="outline">
                  {exactSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
                <Button
                  size="sm"
                  disabled={!exactClientId || !exactClientSecret || exactSaving}
                  onClick={handleExactConnect}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {exactConnected ? 'Opnieuw verbinden' : 'Verbinden'}
                </Button>
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
                      toast.success('Opgeslagen.')
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
