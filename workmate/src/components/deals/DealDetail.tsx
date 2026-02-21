import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Handshake, ArrowLeft, Loader2, Save, Plus, Trash2,
  Phone, Mail, MessageSquare, Calendar, FileText, ArrowRight,
  Trophy, XCircle, Pause, Play, StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import type { Deal, DealActiviteit, Klant, Medewerker } from '@/types'
import {
  getDeal, updateDeal,
  getDealActiviteiten, createDealActiviteit,
  getKlanten, getMedewerkers,
  round2,
} from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// ============ CONSTANTS ============

const ACTIVITEIT_TYPE_CONFIG: Record<DealActiviteit['type'], { label: string; icon: typeof Phone; color: string }> = {
  notitie: { label: 'Notitie', icon: StickyNote, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  telefoon: { label: 'Telefoon', icon: Phone, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
  vergadering: { label: 'Vergadering', icon: Calendar, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  offerte_verstuurd: { label: 'Offerte verstuurd', icon: FileText, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
  status_wijziging: { label: 'Status wijziging', icon: ArrowRight, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' },
}

const BRON_LABELS: Record<string, string> = {
  website: 'Website', telefoon: 'Telefoon', email: 'Email', referentie: 'Referentie',
  social_media: 'Social Media', beurs: 'Beurs', overig: 'Overig',
}

// ============ COMPONENT ============

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pipelineStappen } = useAppSettings()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [activiteiten, setActiviteiten] = useState<DealActiviteit[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Editable fields
  const [verwachteWaarde, setVerwachteWaarde] = useState(0)
  const [kansPercentage, setKansPercentage] = useState(50)
  const [verwachteSluitdatum, setVerwachteSluitdatum] = useState('')
  const [bron, setBron] = useState<Deal['bron']>('overig')
  const [medewerkerId, setMedewerkerId] = useState('')
  const [volgendeActie, setVolgendeActie] = useState('')
  const [volgendeActieDatum, setVolgendeActieDatum] = useState('')
  const [beschrijving, setBeschrijving] = useState('')

  // Activity dialog
  const [actDialogOpen, setActDialogOpen] = useState(false)
  const [actType, setActType] = useState<DealActiviteit['type']>('notitie')
  const [actBeschrijving, setActBeschrijving] = useState('')

  // Won/Lost dialog
  const [wonDialogOpen, setWonDialogOpen] = useState(false)
  const [lostDialogOpen, setLostDialogOpen] = useState(false)
  const [werkelijkeWaarde, setWerkelijkeWaarde] = useState(0)
  const [verlorenReden, setVerlorenReden] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (!id) return
      try {
        const [d, kData, mData] = await Promise.all([
          getDeal(id),
          getKlanten().catch(() => []),
          getMedewerkers().catch(() => []),
        ])
        if (cancelled) return
        if (!d) { toast.error('Deal niet gevonden'); navigate('/deals'); return }

        setDeal(d)
        setKlanten(kData)
        setMedewerkers(mData)
        setVerwachteWaarde(d.verwachte_waarde)
        setKansPercentage(d.kans_percentage || 50)
        setVerwachteSluitdatum(d.verwachte_sluitdatum || '')
        setBron(d.bron || 'overig')
        setMedewerkerId(d.medewerker_id || '')
        setVolgendeActie(d.volgende_actie || '')
        setVolgendeActieDatum(d.volgende_actie_datum || '')
        setBeschrijving(d.beschrijving || '')

        const acts = await getDealActiviteiten(d.id).catch(() => [])
        if (!cancelled) setActiviteiten(acts)
      } catch {
        toast.error('Fout bij laden deal')
        navigate('/deals')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id, navigate])

  const klant = useMemo(() => klanten.find((k) => k.id === deal?.klant_id), [klanten, deal])

  const faseLabel = useMemo(() => {
    if (!deal) return ''
    const stap = pipelineStappen?.find((s) => s.key === deal.fase)
    return stap?.label || deal.fase
  }, [deal, pipelineStappen])

  // ============ SAVE ============

  const handleSave = useCallback(async () => {
    if (!deal) return
    setIsSaving(true)
    try {
      const updated = await updateDeal(deal.id, {
        verwachte_waarde: verwachteWaarde,
        kans_percentage: kansPercentage,
        verwachte_sluitdatum: verwachteSluitdatum || undefined,
        bron,
        medewerker_id: medewerkerId || undefined,
        volgende_actie: volgendeActie || undefined,
        volgende_actie_datum: volgendeActieDatum || undefined,
        beschrijving: beschrijving || undefined,
      })
      setDeal(updated)
      toast.success('Deal opgeslagen')
    } catch {
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [deal, verwachteWaarde, kansPercentage, verwachteSluitdatum, bron, medewerkerId, volgendeActie, volgendeActieDatum, beschrijving])

  // ============ ACTIVITEIT ============

  const handleAddActiviteit = useCallback(async () => {
    if (!deal || !actBeschrijving.trim()) { toast.error('Vul een beschrijving in'); return }
    try {
      const created = await createDealActiviteit({
        user_id: '',
        deal_id: deal.id,
        type: actType,
        beschrijving: actBeschrijving.trim(),
        datum: new Date().toISOString(),
      })
      setActiviteiten((prev) => [created, ...prev])
      await updateDeal(deal.id, { laatste_activiteit: new Date().toISOString() })
      setActDialogOpen(false)
      setActBeschrijving('')
      toast.success('Activiteit toegevoegd')
    } catch {
      toast.error('Fout bij toevoegen')
    }
  }, [deal, actType, actBeschrijving])

  const handleQuickActivity = useCallback((type: DealActiviteit['type']) => {
    setActType(type)
    setActBeschrijving('')
    setActDialogOpen(true)
  }, [])

  // ============ WON / LOST ============

  const handleMarkWon = useCallback(async () => {
    if (!deal) return
    try {
      const updated = await updateDeal(deal.id, {
        status: 'gewonnen',
        gewonnen_op: new Date().toISOString(),
        werkelijke_waarde: werkelijkeWaarde || deal.verwachte_waarde,
        kans_percentage: 100,
      })
      setDeal(updated)
      await createDealActiviteit({
        user_id: '',
        deal_id: deal.id,
        type: 'status_wijziging',
        beschrijving: `Deal gewonnen — ${formatCurrency(werkelijkeWaarde || deal.verwachte_waarde)}`,
        datum: new Date().toISOString(),
      })
      setWonDialogOpen(false)
      toast.success('Deal gemarkeerd als gewonnen!')
    } catch {
      toast.error('Fout bij status wijziging')
    }
  }, [deal, werkelijkeWaarde])

  const handleMarkLost = useCallback(async () => {
    if (!deal) return
    try {
      const updated = await updateDeal(deal.id, {
        status: 'verloren',
        verloren_op: new Date().toISOString(),
        verloren_reden: verlorenReden || undefined,
        kans_percentage: 0,
      })
      setDeal(updated)
      await createDealActiviteit({
        user_id: '',
        deal_id: deal.id,
        type: 'status_wijziging',
        beschrijving: `Deal verloren${verlorenReden ? ` — ${verlorenReden}` : ''}`,
        datum: new Date().toISOString(),
      })
      setLostDialogOpen(false)
      toast.success('Deal gemarkeerd als verloren')
    } catch {
      toast.error('Fout bij status wijziging')
    }
  }, [deal, verlorenReden])

  const handleToggleHold = useCallback(async () => {
    if (!deal) return
    try {
      const newStatus = deal.status === 'on-hold' ? 'open' : 'on-hold'
      const updated = await updateDeal(deal.id, { status: newStatus })
      setDeal(updated)
      toast.success(newStatus === 'on-hold' ? 'Deal on-hold gezet' : 'Deal hervat')
    } catch {
      toast.error('Fout bij status wijziging')
    }
  }, [deal])

  // ============ RENDER ============

  if (isLoading || !deal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const statusColor = deal.status === 'gewonnen' ? 'bg-emerald-100 text-emerald-700' :
    deal.status === 'verloren' ? 'bg-red-100 text-red-700' :
    deal.status === 'on-hold' ? 'bg-amber-100 text-amber-700' :
    'bg-blue-100 text-blue-700'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/deals')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Handshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{deal.titel}</h1>
              <Badge className={cn('text-[11px]', statusColor)}>{deal.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{klant?.bedrijfsnaam || '-'} — {faseLabel}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {deal.status === 'open' && (
            <>
              <Button variant="outline" size="sm" onClick={handleToggleHold} className="gap-1">
                <Pause className="h-3.5 w-3.5" /> On-hold
              </Button>
              <Button size="sm" className="gap-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => { setVerlorenReden(''); setLostDialogOpen(true) }}>
                <XCircle className="h-3.5 w-3.5" /> Verloren
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setWerkelijkeWaarde(deal.verwachte_waarde); setWonDialogOpen(true) }}>
                <Trophy className="h-3.5 w-3.5" /> Gewonnen
              </Button>
            </>
          )}
          {deal.status === 'on-hold' && (
            <Button variant="outline" size="sm" onClick={handleToggleHold} className="gap-1">
              <Play className="h-3.5 w-3.5" /> Hervat
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1 bg-gradient-to-r from-blue-500 to-indigo-600">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Opslaan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activiteiten (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick add buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Snel toevoegen:</span>
            {[
              { type: 'notitie' as const, icon: StickyNote, label: 'Notitie' },
              { type: 'email' as const, icon: Mail, label: 'Email' },
              { type: 'telefoon' as const, icon: Phone, label: 'Telefoon' },
              { type: 'vergadering' as const, icon: Calendar, label: 'Vergadering' },
            ].map(({ type, icon: Icon, label }) => (
              <Button key={type} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleQuickActivity(type)}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </Button>
            ))}
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Activiteiten</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setActType('notitie'); setActBeschrijving(''); setActDialogOpen(true) }} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Activiteit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activiteiten.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">Nog geen activiteiten. Begin met loggen!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activiteiten.map((act) => {
                    const cfg = ACTIVITEIT_TYPE_CONFIG[act.type]
                    const Icon = cfg.icon
                    return (
                      <div key={act.id} className="flex gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                            <span className="text-[11px] text-gray-400">{formatDateTime(act.datum)}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{act.beschrijving}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Deal info sidebar (1/3) */}
        <div className="space-y-4">
          {/* Waarde + Kans */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Waarde & Kans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Verwachte waarde</Label>
                <Input type="number" min={0} step={100} value={verwachteWaarde} onChange={(e) => setVerwachteWaarde(parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-gray-400 mt-1">Gewogen: {formatCurrency(round2(verwachteWaarde * kansPercentage / 100))}</p>
              </div>
              <div>
                <Label>Kans percentage ({kansPercentage}%)</Label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={kansPercentage}
                  onChange={(e) => setKansPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div>
                <Label>Verwachte sluitdatum</Label>
                <Input type="date" value={verwachteSluitdatum} onChange={(e) => setVerwachteSluitdatum(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bron</Label>
                <Select value={bron} onValueChange={(v) => setBron(v as Deal['bron'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BRON_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Eigenaar</Label>
                <Select value={medewerkerId} onValueChange={setMedewerkerId}>
                  <SelectTrigger><SelectValue placeholder="Selecteer eigenaar" /></SelectTrigger>
                  <SelectContent>
                    {medewerkers.filter((m) => m.status === 'actief').map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Beschrijving</Label>
                <textarea
                  value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Notities over deze deal..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Volgende actie */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Volgende actie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={volgendeActie} onChange={(e) => setVolgendeActie(e.target.value)} placeholder="Bijv. Offerte versturen" />
              <Input type="date" value={volgendeActieDatum} onChange={(e) => setVolgendeActieDatum(e.target.value)} />
            </CardContent>
          </Card>

          {/* Koppelingen */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">Koppelingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Klant: </span>
                <button className="text-blue-600 hover:underline" onClick={() => klant && navigate(`/klanten/${klant.id}`)}>{klant?.bedrijfsnaam || '-'}</button>
              </div>
              {deal.offerte_ids && deal.offerte_ids.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500">Offertes: </span>
                  <span>{deal.offerte_ids.length} gekoppeld</span>
                </div>
              )}
              {deal.project_id && (
                <div className="text-sm">
                  <span className="text-gray-500">Project: </span>
                  <button className="text-blue-600 hover:underline" onClick={() => navigate(`/projecten/${deal.project_id}`)}>Bekijk project</button>
                </div>
              )}
              <Separator />
              <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => navigate(`/offertes/nieuw?klant_id=${deal.klant_id}&deal_id=${deal.id}`)}>
                <FileText className="h-3.5 w-3.5" /> Maak offerte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activiteit Dialog */}
      <Dialog open={actDialogOpen} onOpenChange={setActDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activiteit toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={actType} onValueChange={(v) => setActType(v as DealActiviteit['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITEIT_TYPE_CONFIG).filter(([k]) => k !== 'status_wijziging').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beschrijving</Label>
              <textarea
                value={actBeschrijving} onChange={(e) => setActBeschrijving(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Wat is er besproken/gedaan?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleAddActiviteit}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Won Dialog */}
      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-emerald-500" /> Deal gewonnen!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Werkelijke waarde</Label>
              <Input type="number" min={0} step={100} value={werkelijkeWaarde} onChange={(e) => setWerkelijkeWaarde(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonDialogOpen(false)}>Annuleren</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleMarkWon}>Bevestig gewonnen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Deal verloren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reden (optioneel)</Label>
              <textarea
                value={verlorenReden} onChange={(e) => setVerlorenReden(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Waarom is de deal verloren?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleMarkLost}>Bevestig verloren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
