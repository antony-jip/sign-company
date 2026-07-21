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
  BookOpen,
} from 'lucide-react'
import type { BoekhoudPakket } from '@/types'

const BOEKHOUD_PAKKET_NAAM: Record<BoekhoudPakket, string> = {
  snelstart: 'SnelStart',
  moneybird: 'Moneybird',
  eboekhouden: 'e-Boekhouden',
}
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
  // /api/exact-token-status · niet uit de org-brede `exact_online_connected`
  // boolean, die alleen "iemand in de org heeft ooit gekoppeld" zegt.
  const [exactOwnerUserId, setExactOwnerUserId] = useState<string | null>(null)
  const [exactEigenTokens, setExactEigenTokens] = useState<boolean | null>(null)
  const [exactTokensVerlopen, setExactTokensVerlopen] = useState(false)

  // KvK API state
  const [kvkApiKey, setKvkApiKey] = useState('')
  const [kvkSaving, setKvkSaving] = useState(false)

  // Boekhoudkoppeling state
  const [boekhoudPakket, setBoekhoudPakket] = useState<BoekhoudPakket | ''>('')
  const [boekhoudTokenAanwezig, setBoekhoudTokenAanwezig] = useState(false)

  // Moneybird state
  const [moneybirdToken, setMoneybirdToken] = useState('')
  const [moneybirdConnecting, setMoneybirdConnecting] = useState(false)
  const [moneybirdAdministrations, setMoneybirdAdministrations] = useState<Array<{ id: string; naam: string }>>([])
  const [moneybirdAdministrationId, setMoneybirdAdministrationId] = useState('')
  const [moneybirdLedgers, setMoneybirdLedgers] = useState<Array<{ id: string; naam: string }>>([])
  const [moneybirdTaxRates, setMoneybirdTaxRates] = useState<Array<{ id: string; naam: string; percentage: string | null }>>([])
  const [moneybirdLedgerAccountId, setMoneybirdLedgerAccountId] = useState('')
  const [moneybirdTaxHoog, setMoneybirdTaxHoog] = useState('')
  const [moneybirdTaxLaag, setMoneybirdTaxLaag] = useState('')
  const [moneybirdTaxNul, setMoneybirdTaxNul] = useState('')
  const [moneybirdConfigLoading, setMoneybirdConfigLoading] = useState(false)
  const [moneybirdConfigError, setMoneybirdConfigError] = useState<string | null>(null)
  const [moneybirdConfigGeladen, setMoneybirdConfigGeladen] = useState(false)
  const [moneybirdSaving, setMoneybirdSaving] = useState(false)

  // e-Boekhouden state
  const [eboekhoudenToken, setEboekhoudenToken] = useState('')
  const [eboekhoudenConnecting, setEboekhoudenConnecting] = useState(false)
  const [eboekhoudenLedgers, setEboekhoudenLedgers] = useState<Array<{ id: string; code: string; naam: string; categorie: string }>>([])
  const [eboekhoudenDebiteurenLedgerId, setEboekhoudenDebiteurenLedgerId] = useState('')
  const [eboekhoudenOmzetLedgerId, setEboekhoudenOmzetLedgerId] = useState('')
  const [eboekhoudenConfigLoading, setEboekhoudenConfigLoading] = useState(false)
  const [eboekhoudenConfigError, setEboekhoudenConfigError] = useState<string | null>(null)
  const [eboekhoudenConfigGeladen, setEboekhoudenConfigGeladen] = useState(false)
  const [eboekhoudenSaving, setEboekhoudenSaving] = useState(false)
  const [boekhoudDisconnecting, setBoekhoudDisconnecting] = useState(false)
  const [bevestigOntkoppel, setBevestigOntkoppel] = useState(false)

  // SnelStart state
  const [snelstartSleutel, setSnelstartSleutel] = useState('')
  const [snelstartConnecting, setSnelstartConnecting] = useState(false)
  const [snelstartHelpOpen, setSnelstartHelpOpen] = useState(false)
  const [snelstartGrootboeken, setSnelstartGrootboeken] = useState<Array<{ id: string; nummer: number; naam: string }>>([])
  const [snelstartGrootboekId, setSnelstartGrootboekId] = useState('')
  const [snelstartGrootboekLaagId, setSnelstartGrootboekLaagId] = useState('')
  const [snelstartGrootboekNulId, setSnelstartGrootboekNulId] = useState('')
  const [snelstartConfigLoading, setSnelstartConfigLoading] = useState(false)
  const [snelstartConfigError, setSnelstartConfigError] = useState<string | null>(null)
  const [snelstartConfigGeladen, setSnelstartConfigGeladen] = useState(false)
  const [snelstartSaving, setSnelstartSaving] = useState(false)

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
      const pakket = s.boekhoud_pakket ?? ''
      setBoekhoudPakket(pakket)
      const tokenPerPakket: Record<BoekhoudPakket, string | undefined> = {
        snelstart: s.snelstart_koppelsleutel,
        moneybird: s.moneybird_api_token,
        eboekhouden: s.eboekhouden_api_token,
      }
      setBoekhoudTokenAanwezig(!!(pakket && tokenPerPakket[pakket]))
      setMoneybirdAdministrationId(s.moneybird_administration_id ?? '')
      setMoneybirdLedgerAccountId(s.moneybird_ledger_account_id ?? '')
      setMoneybirdTaxHoog(s.moneybird_tax_rate_hoog ?? '')
      setMoneybirdTaxLaag(s.moneybird_tax_rate_laag ?? '')
      setMoneybirdTaxNul(s.moneybird_tax_rate_nul ?? '')
      setEboekhoudenDebiteurenLedgerId(s.eboekhouden_debiteuren_ledger_id ?? '')
      setEboekhoudenOmzetLedgerId(s.eboekhouden_omzet_ledger_id ?? '')
      setSnelstartGrootboekId(s.snelstart_grootboek_id ?? '')
      setSnelstartGrootboekLaagId(s.snelstart_grootboek_laag_id ?? '')
      setSnelstartGrootboekNulId(s.snelstart_grootboek_nul_id ?? '')
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
  // gekoppeld is · daarom valt de badge bij hen terug op de org-brede
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
  // van Exact triggeren en (na commit 2) hun token-rij verwijderen · voor
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

  const handleBoekhoudPakketChange = async (value: string) => {
    const pakket = value === 'geen' ? null : (value as BoekhoudPakket)
    const vorige = boekhoudPakket
    setBoekhoudPakket(pakket ?? '')
    // Badge resetten: token-aanwezigheid geldt per pakket, dus na een wissel
    // is de verbonden-status pas weer bekend na een nieuwe settings-load.
    setBoekhoudTokenAanwezig(false)
    if (pakket && user?.id) {
      getAppSettings(user.id).then((s) => {
        const tokenPerPakket: Record<BoekhoudPakket, string | undefined> = {
          snelstart: s.snelstart_koppelsleutel,
          moneybird: s.moneybird_api_token,
          eboekhouden: s.eboekhouden_api_token,
        }
        setBoekhoudTokenAanwezig(!!tokenPerPakket[pakket])
      }).catch(() => {})
    }
    try {
      await saveIntegrationSettings({ boekhoud_pakket: pakket })
      refreshSettings?.()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Fout bij opslaan boekhoudpakket:', err)
      setBoekhoudPakket(vorige)
      toast.error('Kon boekhoudpakket niet opslaan')
    }
  }

  const loadMoneybirdConfig = useCallback(async () => {
    setMoneybirdConfigLoading(true)
    setMoneybirdConfigError(null)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const headers = { Authorization: `Bearer ${token}` }
      const [ledgersRes, taxRes] = await Promise.all([
        fetch('/api/moneybird-ledger-accounts', { headers }),
        fetch('/api/moneybird-tax-rates', { headers }),
      ])
      if (!ledgersRes.ok) {
        const err = await ledgersRes.json().catch(() => ({}))
        throw new Error(err.error || `Status ${ledgersRes.status}`)
      }
      if (!taxRes.ok) {
        const err = await taxRes.json().catch(() => ({}))
        throw new Error(err.error || `Status ${taxRes.status}`)
      }
      setMoneybirdLedgers(await ledgersRes.json())
      setMoneybirdTaxRates(await taxRes.json())
      setMoneybirdConfigGeladen(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      setMoneybirdConfigError(msg)
      logger.error('Moneybird configuratie laden mislukt:', err)
    } finally {
      setMoneybirdConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    // !configError voorkomt een oneindige retry-loop bij een laad-fout;
    // retry kan dan alleen via de "Opnieuw ophalen"-knop.
    if (
      boekhoudPakket === 'moneybird' &&
      boekhoudTokenAanwezig &&
      moneybirdAdministrationId &&
      !moneybirdConfigGeladen &&
      !moneybirdConfigLoading &&
      !moneybirdConfigError
    ) {
      loadMoneybirdConfig()
    }
  }, [boekhoudPakket, boekhoudTokenAanwezig, moneybirdAdministrationId, moneybirdConfigGeladen, moneybirdConfigLoading, moneybirdConfigError, loadMoneybirdConfig])

  const handleMoneybirdAdministratieChange = async (id: string) => {
    setMoneybirdAdministrationId(id)
    // Ledger- en tax-rate-ids horen bij de vorige administratie · leegmaken,
    // anders synct de server met ids uit de verkeerde administratie.
    setMoneybirdLedgerAccountId('')
    setMoneybirdTaxHoog('')
    setMoneybirdTaxLaag('')
    setMoneybirdTaxNul('')
    try {
      await saveIntegrationSettings({
        moneybird_administration_id: id,
        moneybird_ledger_account_id: '',
        moneybird_tax_rate_hoog: '',
        moneybird_tax_rate_laag: '',
        moneybird_tax_rate_nul: '',
      })
      setMoneybirdConfigGeladen(false)
      setMoneybirdConfigError(null)
    } catch (err) {
      logger.error('Moneybird administratie opslaan mislukt:', err)
      toast.error('Kon administratie niet opslaan')
    }
  }

  const handleMoneybirdConnect = async () => {
    setMoneybirdConnecting(true)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/moneybird-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ api_token: moneybirdToken }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Verbinden mislukt')
      const admins = (body.administrations ?? []) as Array<{ id: string; naam: string }>
      setMoneybirdAdministrations(admins)
      setBoekhoudTokenAanwezig(true)
      setMoneybirdToken('')
      if (admins.length === 1) {
        await handleMoneybirdAdministratieChange(admins[0].id)
      }
      toast.success(<>Moneybird verbonden<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Moneybird verbinden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Verbinden mislukt')
    } finally {
      setMoneybirdConnecting(false)
    }
  }

  const handleMoneybirdSave = async () => {
    setMoneybirdSaving(true)
    try {
      await saveIntegrationSettings({
        moneybird_ledger_account_id: moneybirdLedgerAccountId,
        moneybird_tax_rate_hoog: moneybirdTaxHoog,
        moneybird_tax_rate_laag: moneybirdTaxLaag,
        moneybird_tax_rate_nul: moneybirdTaxNul,
      })
      refreshSettings?.()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Moneybird instellingen opslaan mislukt:', err)
      toast.error('Kon Moneybird instellingen niet opslaan')
    } finally {
      setMoneybirdSaving(false)
    }
  }

  const loadEboekhoudenLedgers = useCallback(async () => {
    setEboekhoudenConfigLoading(true)
    setEboekhoudenConfigError(null)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/eboekhouden-ledgers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Status ${res.status}`)
      }
      setEboekhoudenLedgers(await res.json())
      setEboekhoudenConfigGeladen(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      setEboekhoudenConfigError(msg)
      logger.error('e-Boekhouden grootboeken laden mislukt:', err)
    } finally {
      setEboekhoudenConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    // !configError voorkomt een oneindige retry-loop bij een laad-fout
    if (
      boekhoudPakket === 'eboekhouden' &&
      boekhoudTokenAanwezig &&
      !eboekhoudenConfigGeladen &&
      !eboekhoudenConfigLoading &&
      !eboekhoudenConfigError
    ) {
      loadEboekhoudenLedgers()
    }
  }, [boekhoudPakket, boekhoudTokenAanwezig, eboekhoudenConfigGeladen, eboekhoudenConfigLoading, eboekhoudenConfigError, loadEboekhoudenLedgers])

  const handleEboekhoudenConnect = async () => {
    setEboekhoudenConnecting(true)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/eboekhouden-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ api_token: eboekhoudenToken }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Verbinden mislukt')
      setBoekhoudTokenAanwezig(true)
      setEboekhoudenToken('')
      setEboekhoudenConfigGeladen(false)
      toast.success(<>e-Boekhouden verbonden<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('e-Boekhouden verbinden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Verbinden mislukt')
    } finally {
      setEboekhoudenConnecting(false)
    }
  }

  const handleEboekhoudenSave = async () => {
    setEboekhoudenSaving(true)
    try {
      await saveIntegrationSettings({
        eboekhouden_debiteuren_ledger_id: eboekhoudenDebiteurenLedgerId,
        eboekhouden_omzet_ledger_id: eboekhoudenOmzetLedgerId,
      })
      refreshSettings?.()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('e-Boekhouden instellingen opslaan mislukt:', err)
      toast.error('Kon e-Boekhouden instellingen niet opslaan')
    } finally {
      setEboekhoudenSaving(false)
    }
  }

  const handleBoekhoudDisconnect = async () => {
    if (!boekhoudPakket) return
    setBoekhoudDisconnecting(true)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/boekhoud-disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pakket: boekhoudPakket }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Ontkoppelen mislukt')
      setBoekhoudTokenAanwezig(false)
      setBoekhoudPakket('')
      setBevestigOntkoppel(false)
      refreshSettings?.()
      toast.success(<>Ontkoppeld<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('Boekhoudkoppeling ontkoppelen mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Ontkoppelen mislukt')
    } finally {
      setBoekhoudDisconnecting(false)
    }
  }

  const loadSnelstartGrootboeken = useCallback(async () => {
    setSnelstartConfigLoading(true)
    setSnelstartConfigError(null)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/snelstart-grootboeken', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Status ${res.status}`)
      }
      setSnelstartGrootboeken(await res.json())
      setSnelstartConfigGeladen(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Onbekende fout'
      setSnelstartConfigError(msg)
      logger.error('SnelStart grootboeken laden mislukt:', err)
    } finally {
      setSnelstartConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    // !configError voorkomt een oneindige retry-loop bij een laad-fout
    if (
      boekhoudPakket === 'snelstart' &&
      boekhoudTokenAanwezig &&
      !snelstartConfigGeladen &&
      !snelstartConfigLoading &&
      !snelstartConfigError
    ) {
      loadSnelstartGrootboeken()
    }
  }, [boekhoudPakket, boekhoudTokenAanwezig, snelstartConfigGeladen, snelstartConfigLoading, snelstartConfigError, loadSnelstartGrootboeken])

  const handleSnelstartConnect = async () => {
    setSnelstartConnecting(true)
    try {
      if (!supabase) throw new Error('Niet ingelogd')
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('Niet ingelogd')
      const res = await fetch('/api/snelstart-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ koppelsleutel: snelstartSleutel }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Verbinden mislukt')
      setBoekhoudTokenAanwezig(true)
      setSnelstartSleutel('')
      setSnelstartConfigGeladen(false)
      toast.success(<>SnelStart verbonden<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('SnelStart verbinden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Verbinden mislukt')
    } finally {
      setSnelstartConnecting(false)
    }
  }

  const handleSnelstartSave = async () => {
    setSnelstartSaving(true)
    try {
      const grootboek = snelstartGrootboeken.find((g) => g.id === snelstartGrootboekId)
      await saveIntegrationSettings({
        snelstart_grootboek_id: snelstartGrootboekId,
        snelstart_grootboek_naam: grootboek ? `${grootboek.nummer} · ${grootboek.naam}` : '',
        snelstart_grootboek_laag_id: snelstartGrootboekLaagId,
        snelstart_grootboek_nul_id: snelstartGrootboekNulId,
      })
      refreshSettings?.()
      toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
    } catch (err) {
      logger.error('SnelStart instellingen opslaan mislukt:', err)
      toast.error('Kon SnelStart instellingen niet opslaan')
    } finally {
      setSnelstartSaving(false)
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
            <div className="w-10 h-10 bg-flame/10 dark:bg-flame/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-flame" />
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
            <div className="w-10 h-10 bg-petrol/10 dark:bg-[#2A7A86]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-petrol dark:text-[#2A7A86]" />
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
                  actieve sessie verbreken · alleen de eigenaar kan dat doen.
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

      {/* ── Boekhoudkoppeling (SnelStart / Moneybird / e-Boekhouden) ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-petrol/10 dark:bg-[#2A7A86]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-petrol dark:text-[#2A7A86]" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-semibold text-foreground">Boekhouding</h3>
                <Badge
                  className={
                    boekhoudPakket && boekhoudTokenAanwezig
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground/60'
                  }
                >
                  {boekhoudPakket && boekhoudTokenAanwezig ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {BOEKHOUD_PAKKET_NAAM[boekhoudPakket]} verbonden
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
                Koppel je boekhoudpakket om facturen en klanten vanuit doen. direct in je administratie te boeken.
              </p>

              <div className="space-y-2">
                <Label htmlFor="boekhoud-pakket" className="text-sm font-medium">
                  Boekhoudpakket
                </Label>
                <Select value={boekhoudPakket || 'geen'} onValueChange={handleBoekhoudPakketChange}>
                  <SelectTrigger id="boekhoud-pakket" className="text-sm">
                    <SelectValue placeholder="Kies pakket..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">Geen</SelectItem>
                    <SelectItem value="moneybird">Moneybird</SelectItem>
                    <SelectItem value="eboekhouden">e-Boekhouden</SelectItem>
                    {/* SnelStart verborgen tot de payload-verificatie tegen een
                        Ontwikkeling&Test-administratie en de certificering rond
                        zijn (zie REVIEW_NOTES.md). Code en routes staan klaar. */}
                    {boekhoudPakket === 'snelstart' && <SelectItem value="snelstart">SnelStart</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {boekhoudPakket === 'moneybird' && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="moneybird-token" className="text-sm font-medium">
                      Moneybird API-token
                    </Label>
                    <Input
                      id="moneybird-token"
                      type="password"
                      value={moneybirdToken}
                      onChange={(e) => setMoneybirdToken(e.target.value)}
                      placeholder={boekhoudTokenAanwezig ? 'Token opgeslagen · vul in om te vervangen' : 'Persoonlijk API-token'}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maak een token aan in Moneybird onder{' '}
                      <a
                        href="https://moneybird.com/user/applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-0.5"
                      >
                        Instellingen → Externe koppelingen <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={(!moneybirdToken && !boekhoudTokenAanwezig) || moneybirdConnecting}
                      onClick={handleMoneybirdConnect}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {moneybirdConnecting ? 'Verbinden...' : (boekhoudTokenAanwezig ? 'Opnieuw verbinden' : 'Verbinden')}
                    </Button>
                  </div>

                  {moneybirdAdministrations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="moneybird-administratie" className="text-sm">Administratie</Label>
                      <Select value={moneybirdAdministrationId} onValueChange={handleMoneybirdAdministratieChange}>
                        <SelectTrigger id="moneybird-administratie" className="text-sm">
                          <SelectValue placeholder="Kies administratie..." />
                        </SelectTrigger>
                        <SelectContent>
                          {moneybirdAdministrations.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.naam}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {boekhoudTokenAanwezig && moneybirdAdministrationId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Boekingsinstellingen</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadMoneybirdConfig}
                          disabled={moneybirdConfigLoading}
                          className="h-7 text-xs gap-1"
                        >
                          <RefreshCw className={cn('w-3 h-3', moneybirdConfigLoading && 'animate-spin')} />
                          Opnieuw ophalen
                        </Button>
                      </div>
                      {moneybirdConfigError ? (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Configuratie ophalen mislukt: {moneybirdConfigError}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="moneybird-omzetrekening" className="text-sm">Omzetrekening</Label>
                            <Select
                              value={moneybirdLedgerAccountId}
                              onValueChange={setMoneybirdLedgerAccountId}
                              disabled={moneybirdConfigLoading || moneybirdLedgers.length === 0}
                            >
                              <SelectTrigger id="moneybird-omzetrekening" className="text-sm">
                                <SelectValue placeholder={moneybirdConfigLoading ? 'Laden...' : 'Kies omzetrekening...'} />
                              </SelectTrigger>
                              <SelectContent>
                                {moneybirdLedgers.map((l) => (
                                  <SelectItem key={l.id} value={l.id}>{l.naam}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {([
                              { id: 'moneybird-btw-hoog', label: 'BTW hoog (21%)', value: moneybirdTaxHoog, setter: setMoneybirdTaxHoog },
                              { id: 'moneybird-btw-laag', label: 'BTW laag (9%)', value: moneybirdTaxLaag, setter: setMoneybirdTaxLaag },
                              { id: 'moneybird-btw-nul', label: 'BTW nul (0%)', value: moneybirdTaxNul, setter: setMoneybirdTaxNul },
                            ] as const).map((veld) => (
                              <div key={veld.id} className="space-y-2">
                                <Label htmlFor={veld.id} className="text-sm">{veld.label}</Label>
                                <Select
                                  value={veld.value}
                                  onValueChange={veld.setter}
                                  disabled={moneybirdConfigLoading || moneybirdTaxRates.length === 0}
                                >
                                  <SelectTrigger id={veld.id} className="text-sm">
                                    <SelectValue placeholder={moneybirdConfigLoading ? 'Laden...' : 'Kies tarief...'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {moneybirdTaxRates.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.naam}{t.percentage != null ? ` (${t.percentage}%)` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={handleMoneybirdSave} disabled={moneybirdSaving} size="sm" variant="outline">
                              {moneybirdSaving ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {boekhoudPakket === 'snelstart' && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="border border-border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSnelstartHelpOpen(!snelstartHelpOpen)}
                      className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Hoe vind ik mijn koppelsleutel?</span>
                      <ArrowRight className={cn('w-4 h-4 transition-transform', snelstartHelpOpen && 'rotate-90')} />
                    </button>
                    {snelstartHelpOpen && (
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                          <li>Log in op SnelStart Web en open je administratie</li>
                          <li>Ga naar Instellingen → Koppelingen → Maatwerk</li>
                          <li>Maak een nieuwe koppelsleutel aan en kopieer deze</li>
                          <li>Plak de sleutel hieronder en klik op &ldquo;Verbinden&rdquo;</li>
                        </ol>
                        <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border/50">
                          Let op: API-toegang vereist het SnelStart-pakket inZicht of inControle.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snelstart-sleutel" className="text-sm font-medium">
                      SnelStart koppelsleutel
                    </Label>
                    <Input
                      id="snelstart-sleutel"
                      type="password"
                      value={snelstartSleutel}
                      onChange={(e) => setSnelstartSleutel(e.target.value)}
                      placeholder={boekhoudTokenAanwezig ? 'Sleutel opgeslagen · vul in om te vervangen' : 'Koppelsleutel'}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={(!snelstartSleutel && !boekhoudTokenAanwezig) || snelstartConnecting}
                      onClick={handleSnelstartConnect}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {snelstartConnecting ? 'Verbinden...' : (boekhoudTokenAanwezig ? 'Opnieuw verbinden' : 'Verbinden')}
                    </Button>
                  </div>

                  {boekhoudTokenAanwezig && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Boekingsinstellingen</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadSnelstartGrootboeken}
                          disabled={snelstartConfigLoading}
                          className="h-7 text-xs gap-1"
                        >
                          <RefreshCw className={cn('w-3 h-3', snelstartConfigLoading && 'animate-spin')} />
                          Opnieuw ophalen
                        </Button>
                      </div>
                      {snelstartConfigError ? (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Grootboeken ophalen mislukt: {snelstartConfigError}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {([
                              { id: 'snelstart-grootboek-hoog', label: 'Omzet hoog (21%)', value: snelstartGrootboekId, setter: setSnelstartGrootboekId },
                              { id: 'snelstart-grootboek-laag', label: 'Omzet laag (9%)', value: snelstartGrootboekLaagId, setter: setSnelstartGrootboekLaagId },
                              { id: 'snelstart-grootboek-nul', label: 'Omzet onbelast (0%)', value: snelstartGrootboekNulId, setter: setSnelstartGrootboekNulId },
                            ] as const).map((veld) => (
                              <div key={veld.id} className="space-y-2">
                                <Label htmlFor={veld.id} className="text-sm">{veld.label}</Label>
                                <Select
                                  value={veld.value}
                                  onValueChange={veld.setter}
                                  disabled={snelstartConfigLoading || snelstartGrootboeken.length === 0}
                                >
                                  <SelectTrigger id={veld.id} className="text-sm">
                                    <SelectValue placeholder={snelstartConfigLoading ? 'Laden...' : 'Kies grootboek...'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {snelstartGrootboeken.map((g) => (
                                      <SelectItem key={g.id} value={g.id}>
                                        {g.nummer} · {g.naam}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            SnelStart-omzetgrootboeken zijn gebonden aan een BTW-tarief; kies per tarief het juiste grootboek
                            (alleen nodig voor tarieven die je gebruikt). SnelStart ontvangt geen PDF · alleen de boeking.
                          </p>
                          <div className="flex justify-end">
                            <Button onClick={handleSnelstartSave} disabled={snelstartSaving || !snelstartGrootboekId} size="sm" variant="outline">
                              {snelstartSaving ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {boekhoudPakket === 'eboekhouden' && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="eboekhouden-token" className="text-sm font-medium">
                      e-Boekhouden API-token
                    </Label>
                    <Input
                      id="eboekhouden-token"
                      type="password"
                      value={eboekhoudenToken}
                      onChange={(e) => setEboekhoudenToken(e.target.value)}
                      placeholder={boekhoudTokenAanwezig ? 'Token opgeslagen · vul in om te vervangen' : 'API-token'}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maak een token aan in e-Boekhouden onder Beheer → Inrichting → Koppelingen → API-tokens.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={(!eboekhoudenToken && !boekhoudTokenAanwezig) || eboekhoudenConnecting}
                      onClick={handleEboekhoudenConnect}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {eboekhoudenConnecting ? 'Verbinden...' : (boekhoudTokenAanwezig ? 'Opnieuw verbinden' : 'Verbinden')}
                    </Button>
                  </div>

                  {boekhoudTokenAanwezig && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Boekingsinstellingen</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadEboekhoudenLedgers}
                          disabled={eboekhoudenConfigLoading}
                          className="h-7 text-xs gap-1"
                        >
                          <RefreshCw className={cn('w-3 h-3', eboekhoudenConfigLoading && 'animate-spin')} />
                          Opnieuw ophalen
                        </Button>
                      </div>
                      {eboekhoudenConfigError ? (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Grootboeken ophalen mislukt: {eboekhoudenConfigError}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {([
                              {
                                id: 'eboekhouden-debiteuren',
                                label: 'Debiteurenrekening',
                                value: eboekhoudenDebiteurenLedgerId,
                                setter: setEboekhoudenDebiteurenLedgerId,
                                categorie: 'DEB',
                              },
                              {
                                id: 'eboekhouden-omzet',
                                label: 'Omzetrekening',
                                value: eboekhoudenOmzetLedgerId,
                                setter: setEboekhoudenOmzetLedgerId,
                                categorie: 'VW',
                              },
                            ] as const).map((veld) => {
                              const gefilterd = eboekhoudenLedgers.filter((l) => l.categorie === veld.categorie)
                              const opties = gefilterd.length > 0 ? gefilterd : eboekhoudenLedgers
                              return (
                                <div key={veld.id} className="space-y-2">
                                  <Label htmlFor={veld.id} className="text-sm">{veld.label}</Label>
                                  <Select
                                    value={veld.value}
                                    onValueChange={veld.setter}
                                    disabled={eboekhoudenConfigLoading || opties.length === 0}
                                  >
                                    <SelectTrigger id={veld.id} className="text-sm">
                                      <SelectValue placeholder={eboekhoudenConfigLoading ? 'Laden...' : 'Kies rekening...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {opties.map((l) => (
                                        <SelectItem key={l.id} value={l.id}>
                                          {l.code} · {l.naam}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Let op: e-Boekhouden ondersteunt geen PDF-bijlagen via de koppeling · alleen de boeking wordt overgezet.
                          </p>
                          <div className="flex justify-end">
                            <Button onClick={handleEboekhoudenSave} disabled={eboekhoudenSaving} size="sm" variant="outline">
                              {eboekhoudenSaving ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {boekhoudPakket && boekhoudTokenAanwezig && (
                <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                  {bevestigOntkoppel && (
                    <span className="text-xs text-muted-foreground mr-auto">
                      Token en boekingsinstellingen van {BOEKHOUD_PAKKET_NAAM[boekhoudPakket]} worden verwijderd.
                    </span>
                  )}
                  {bevestigOntkoppel && !boekhoudDisconnecting && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setBevestigOntkoppel(false)}
                    >
                      Annuleren
                    </button>
                  )}
                  <Button
                    type="button"
                    variant={bevestigOntkoppel ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={boekhoudDisconnecting}
                    onClick={() => (bevestigOntkoppel ? handleBoekhoudDisconnect() : setBevestigOntkoppel(true))}
                  >
                    {boekhoudDisconnecting
                      ? 'Ontkoppelen...'
                      : bevestigOntkoppel
                        ? 'Bevestig ontkoppelen'
                        : `${BOEKHOUD_PAKKET_NAAM[boekhoudPakket]} ontkoppelen`}
                  </Button>
                </div>
              )}

              {boekhoudPakket && exactConnected && (
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Exact Online is ook gekoppeld. Facturen tonen dan twee sync-knoppen:
                  één voor Exact en één voor {BOEKHOUD_PAKKET_NAAM[boekhoudPakket]}.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KvK API Instellingen ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-petrol/10 dark:bg-[#2A7A86]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-petrol dark:text-[#2A7A86] font-bold text-sm">KvK</span>
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
                      // Via het encryptie-endpoint: de key is een secret en
                      // hoort niet onversleuteld in app_settings te staan.
                      await saveIntegrationSettings({
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
