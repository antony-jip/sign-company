import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Globe,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getAppSettings, updateAppSettings } from '@/services/supabaseService'
import supabase from '@/services/supabaseClient'
import { logger } from '@/utils/logger'

interface ExactOption {
  id: string
  code?: string
  naam: string
  percentage?: number
}

export function ExactTab() {
  const { user } = useAuth()

  // Settings state
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Exact config
  const [administratieId, setAdministratieId] = useState('')
  const [verkoopboek, setVerkoopboek] = useState('80')
  const [grootboek, setGrootboek] = useState('8090')
  const [btwHoog, setBtwHoog] = useState('2')
  const [btwLaag, setBtwLaag] = useState('')
  const [btwNul, setBtwNul] = useState('')

  // Dropdown data from Exact
  const [administraties, setAdministraties] = useState<ExactOption[]>([])
  const [dagboeken, setDagboeken] = useState<ExactOption[]>([])
  const [grootboeken, setGrootboeken] = useState<ExactOption[]>([])
  const [btwCodes, setBtwCodes] = useState<ExactOption[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // Load settings
  useEffect(() => {
    if (!user?.id) return
    getAppSettings(user.id).then((s) => {
      setClientId(s.exact_online_client_id ?? '')
      setClientSecret(s.exact_online_client_secret ?? '')
      setConnected(s.exact_online_connected ?? false)
      setAdministratieId(s.exact_administratie_id ?? '')
      setVerkoopboek(s.exact_verkoopboek ?? '80')
      setGrootboek(s.exact_grootboek ?? '8090')
      setBtwHoog(s.exact_btw_hoog ?? '2')
      setBtwLaag(s.exact_btw_laag ?? '')
      setBtwNul(s.exact_btw_nul ?? '')
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [user?.id])

  // Auth helper
  const getToken = useCallback(async () => {
    if (!supabase) return ''
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || ''
  }, [])

  // Fetch dropdown data from Exact API
  const loadExactData = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    setLoadingDropdowns(true)

    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [admRes, dagRes, glRes, btwRes] = await Promise.allSettled([
        fetch('/api/exact-administraties', { headers }),
        fetch('/api/exact-dagboeken', { headers }),
        fetch('/api/exact-grootboeken', { headers }),
        fetch('/api/exact-btw-codes', { headers }),
      ])

      if (admRes.status === 'fulfilled' && admRes.value.ok) {
        setAdministraties(await admRes.value.json())
      }
      if (dagRes.status === 'fulfilled' && dagRes.value.ok) {
        setDagboeken(await dagRes.value.json())
      }
      if (glRes.status === 'fulfilled' && glRes.value.ok) {
        setGrootboeken(await glRes.value.json())
      }
      if (btwRes.status === 'fulfilled' && btwRes.value.ok) {
        setBtwCodes(await btwRes.value.json())
      }
    } catch {
      toast.error('Kon Exact data niet laden')
    } finally {
      setLoadingDropdowns(false)
    }
  }, [getToken])

  // Auto-load dropdowns when connected
  useEffect(() => {
    if (connected && !isLoading) {
      loadExactData()
    }
  }, [connected, isLoading, loadExactData])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await updateAppSettings(user.id, {
        exact_online_client_id: clientId,
        exact_online_client_secret: clientSecret,
        exact_administratie_id: administratieId,
        exact_verkoopboek: verkoopboek,
        exact_grootboek: grootboek,
        exact_btw_hoog: btwHoog === '_none' ? '' : btwHoog,
        exact_btw_laag: btwLaag === '_none' ? '' : btwLaag,
        exact_btw_nul: btwNul === '_none' ? '' : btwNul,
      })
      toast.success('Exact Online instellingen opgeslagen')
    } catch (err) {
      logger.error('Fout bij opslaan Exact instellingen:', err)
      toast.error('Kon instellingen niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await updateAppSettings(user.id, {
        exact_online_client_id: clientId,
        exact_online_client_secret: clientSecret,
      })
      const token = await getToken()
      if (!token) { toast.error('Niet ingelogd'); return }
      window.location.href = `/api/exact-auth?token=${token}`
    } catch {
      toast.error('Kon niet verbinden met Exact Online')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user?.id) return
    try {
      await updateAppSettings(user.id, { exact_online_connected: false })
      setConnected(false)
      toast.success('Exact Online ontkoppeld')
    } catch {
      toast.error('Kon niet ontkoppelen')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A535C]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Koppeling */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#1A535C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[#1A535C]" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-[#1A1A1A]">Exact Online</h3>
                <Badge className={connected
                  ? 'bg-[#E4F0EA] text-[#2D6B48]'
                  : 'bg-[#EEEEED] text-[#6B6B66]'
                }>
                  {connected ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verbonden</span>
                  ) : (
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Niet verbonden</span>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-[#9B9B95]">
                Koppel Exact Online om facturen automatisch te synchroniseren.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client ID</Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Exact Online Client ID"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Client Secret</Label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Exact Online Client Secret"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-[#9B9B95]">
                  Registreer een app op{' '}
                  <a href="https://apps.exactonline.com/nl/nl-NL/V2/Manage" target="_blank" rel="noopener noreferrer" className="text-[#1A535C] underline inline-flex items-center gap-0.5">
                    Exact Online App Center <ExternalLink className="w-3 h-3" />
                  </a>
                  {' '}met redirect URI: <code className="bg-[#F0EFEC] px-1 rounded text-[11px] font-mono">https://app.doen.team/api/exact-callback</code>
                </p>
              </div>

              <div className="flex gap-2">
                {connected && (
                  <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-[#C03A18]">
                    Ontkoppelen
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={!clientId || !clientSecret || saving}
                  onClick={handleConnect}
                  className="gap-1.5 bg-[#1A535C] hover:bg-[#1A535C]/90"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <ExternalLink className="w-3.5 h-3.5" />
                  {connected ? 'Opnieuw verbinden' : 'Verbinden met Exact'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuratie — alleen als verbonden */}
      {connected && (
        <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1A1A1A]">Administratie instellen</h3>
              <Button variant="ghost" size="sm" onClick={loadExactData} disabled={loadingDropdowns} className="gap-1.5 text-[#9B9B95]">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDropdowns ? 'animate-spin' : ''}`} />
                Ververs
              </Button>
            </div>

            {/* Administratie */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Administratie</Label>
              {administraties.length > 0 ? (
                <Select value={administratieId} onValueChange={setAdministratieId}>
                  <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="Kies administratie..." /></SelectTrigger>
                  <SelectContent>
                    {administraties.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="font-mono text-sm">{a.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={administratieId} onChange={(e) => setAdministratieId(e.target.value)} placeholder="Administratie ID" className="font-mono text-sm" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verkoopboek */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Verkoopboek</Label>
                {dagboeken.length > 0 ? (
                  <Select value={verkoopboek} onValueChange={setVerkoopboek}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="Kies verkoopboek..." /></SelectTrigger>
                    <SelectContent>
                      {dagboeken.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="font-mono text-sm">{d.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={verkoopboek} onChange={(e) => setVerkoopboek(e.target.value)} placeholder="80" className="font-mono text-sm" />
                )}
              </div>

              {/* Grootboek */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Standaard grootboeknummer</Label>
                {grootboeken.length > 0 ? (
                  <Select value={grootboek} onValueChange={setGrootboek}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="Kies grootboek..." /></SelectTrigger>
                    <SelectContent>
                      {grootboeken.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="font-mono text-sm">{g.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={grootboek} onChange={(e) => setGrootboek(e.target.value)} placeholder="8090" className="font-mono text-sm" />
                )}
              </div>
            </div>

            {/* BTW codes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">BTW code hoog (21%)</Label>
                {btwCodes.length > 0 ? (
                  <Select value={btwHoog} onValueChange={setBtwHoog}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="Kies..." /></SelectTrigger>
                    <SelectContent>
                      {btwCodes.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="font-mono text-sm">{b.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={btwHoog} onChange={(e) => setBtwHoog(e.target.value)} placeholder="2" className="font-mono text-sm" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">BTW code laag (9%)</Label>
                {btwCodes.length > 0 ? (
                  <Select value={btwLaag} onValueChange={setBtwLaag}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="- leeg -" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="font-mono text-sm text-[#9B9B95]">- leeg -</SelectItem>
                      {btwCodes.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="font-mono text-sm">{b.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={btwLaag} onChange={(e) => setBtwLaag(e.target.value)} placeholder="" className="font-mono text-sm" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">BTW code 0%</Label>
                {btwCodes.length > 0 ? (
                  <Select value={btwNul} onValueChange={setBtwNul}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="- leeg -" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" className="font-mono text-sm text-[#9B9B95]">- leeg -</SelectItem>
                      {btwCodes.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="font-mono text-sm">{b.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={btwNul} onChange={(e) => setBtwNul(e.target.value)} placeholder="" className="font-mono text-sm" />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#1A535C] hover:bg-[#1A535C]/90 gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Instellingen opslaan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
