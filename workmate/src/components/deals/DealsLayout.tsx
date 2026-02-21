import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus, Search, Handshake, Trash2, Eye, Loader2,
  LayoutGrid, List, ArrowRight, Phone, Mail,
  Calendar as CalendarIcon, AlertTriangle, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import type { Deal, Klant, Medewerker } from '@/types'
import {
  getDeals, createDeal, updateDeal, deleteDeal,
  getKlanten, getMedewerkers, round2,
} from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// ============ CONSTANTS ============

const KLEUR_TO_STYLE: Record<string, { color: string; accent: string; headerBg: string }> = {
  gray: { color: 'from-slate-500/10 to-slate-500/5', accent: 'bg-slate-400', headerBg: 'bg-slate-50/80 dark:bg-slate-800/50' },
  blue: { color: 'from-blue-500/10 to-blue-500/5', accent: 'bg-blue-400', headerBg: 'bg-blue-50/80 dark:bg-blue-900/30' },
  purple: { color: 'from-purple-500/10 to-purple-500/5', accent: 'bg-purple-400', headerBg: 'bg-purple-50/80 dark:bg-purple-900/30' },
  green: { color: 'from-emerald-500/10 to-emerald-500/5', accent: 'bg-emerald-400', headerBg: 'bg-emerald-50/80 dark:bg-emerald-900/30' },
  orange: { color: 'from-orange-500/10 to-orange-500/5', accent: 'bg-orange-400', headerBg: 'bg-orange-50/80 dark:bg-orange-900/30' },
  red: { color: 'from-red-500/10 to-red-500/5', accent: 'bg-red-400', headerBg: 'bg-red-50/80 dark:bg-red-900/30' },
  yellow: { color: 'from-yellow-500/10 to-yellow-500/5', accent: 'bg-yellow-400', headerBg: 'bg-yellow-50/80 dark:bg-yellow-900/30' },
  teal: { color: 'from-teal-500/10 to-teal-500/5', accent: 'bg-teal-400', headerBg: 'bg-teal-50/80 dark:bg-teal-900/30' },
  indigo: { color: 'from-indigo-500/10 to-indigo-500/5', accent: 'bg-indigo-400', headerBg: 'bg-indigo-50/80 dark:bg-indigo-900/30' },
}

const BRON_LABELS: Record<string, string> = {
  website: 'Website',
  telefoon: 'Telefoon',
  email: 'Email',
  referentie: 'Referentie',
  social_media: 'Social Media',
  beurs: 'Beurs',
  overig: 'Overig',
}

type ViewMode = 'kanban' | 'tabel'

// ============ COMPONENT ============

export function DealsLayout() {
  const navigate = useNavigate()
  const { pipelineStappen } = useAppSettings()

  const [deals, setDeals] = useState<Deal[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBron, setFilterBron] = useState('alle')
  const [filterMedewerker, setFilterMedewerker] = useState('alle')

  // New deal dialog
  const [newDealOpen, setNewDealOpen] = useState(false)
  const [newTitel, setNewTitel] = useState('')
  const [newKlantId, setNewKlantId] = useState('')
  const [newWaarde, setNewWaarde] = useState(0)
  const [newBron, setNewBron] = useState<Deal['bron']>('overig')
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [dData, kData, mData] = await Promise.all([
          getDeals().catch(() => []),
          getKlanten().catch(() => []),
          getMedewerkers().catch(() => []),
        ])
        if (cancelled) return
        setDeals(dData)
        setKlanten(kData)
        setMedewerkers(mData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getKlantNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return klanten.find((k) => k.id === id)?.bedrijfsnaam || '-'
  }, [klanten])

  const getMedewerkerNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return medewerkers.find((m) => m.id === id)?.naam || '-'
  }, [medewerkers])

  // Pipeline columns
  const columns = useMemo(() => {
    if (pipelineStappen && pipelineStappen.length > 0) {
      return pipelineStappen
        .filter((s) => s.actief)
        .sort((a, b) => a.volgorde - b.volgorde)
        .map((s) => ({
          key: s.key,
          label: s.label,
          ...(KLEUR_TO_STYLE[s.kleur] || KLEUR_TO_STYLE.gray),
        }))
    }
    return [
      { key: 'lead', label: 'Lead', ...KLEUR_TO_STYLE.gray },
      { key: 'contact', label: 'Contact', ...KLEUR_TO_STYLE.blue },
      { key: 'offerte', label: 'Offerte', ...KLEUR_TO_STYLE.purple },
      { key: 'onderhandeling', label: 'Onderhandeling', ...KLEUR_TO_STYLE.orange },
      { key: 'gewonnen', label: 'Gewonnen', ...KLEUR_TO_STYLE.green },
    ]
  }, [pipelineStappen])

  // Filtered deals
  const gefilterd = useMemo(() => {
    let result = [...deals].filter((d) => d.status === 'open' || d.status === 'on-hold')
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) =>
        d.titel.toLowerCase().includes(q) ||
        getKlantNaam(d.klant_id).toLowerCase().includes(q)
      )
    }
    if (filterBron !== 'alle') result = result.filter((d) => d.bron === filterBron)
    if (filterMedewerker !== 'alle') result = result.filter((d) => d.medewerker_id === filterMedewerker)
    return result
  }, [deals, searchQuery, filterBron, filterMedewerker, getKlantNaam])

  // KPI's
  const kpis = useMemo(() => {
    const openDeals = deals.filter((d) => d.status === 'open')
    const gewonnenDezeMaand = deals.filter((d) => {
      if (d.status !== 'gewonnen' || !d.gewonnen_op) return false
      const now = new Date()
      const won = new Date(d.gewonnen_op)
      return won.getMonth() === now.getMonth() && won.getFullYear() === now.getFullYear()
    })
    const verlorenDezeMaand = deals.filter((d) => {
      if (d.status !== 'verloren' || !d.verloren_op) return false
      const now = new Date()
      const lost = new Date(d.verloren_op)
      return lost.getMonth() === now.getMonth() && lost.getFullYear() === now.getFullYear()
    })

    return {
      openWaarde: round2(openDeals.reduce((s, d) => s + d.verwachte_waarde, 0)),
      gewogenWaarde: round2(openDeals.reduce((s, d) => s + round2(d.verwachte_waarde * (d.kans_percentage || 50) / 100), 0)),
      gemDealGrootte: openDeals.length > 0 ? round2(openDeals.reduce((s, d) => s + d.verwachte_waarde, 0) / openDeals.length) : 0,
      gewonnenMaand: round2(gewonnenDezeMaand.reduce((s, d) => s + (d.werkelijke_waarde || d.verwachte_waarde), 0)),
      verlorenMaand: round2(verlorenDezeMaand.reduce((s, d) => s + d.verwachte_waarde, 0)),
      aantalOpen: openDeals.length,
    }
  }, [deals])

  // Deals grouped by fase
  const dealsByFase = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    for (const col of columns) map[col.key] = []
    for (const d of gefilterd) {
      if (map[d.fase]) map[d.fase].push(d)
      else if (columns.length > 0) {
        // Put in first column if fase doesn't match
        map[columns[0].key] = map[columns[0].key] || []
        map[columns[0].key].push(d)
      }
    }
    return map
  }, [gefilterd, columns])

  // ============ DRAG & DROP ============

  const handleDragStart = useCallback((e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, newFase: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain')
    if (!dealId) return

    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.fase === newFase) return

    try {
      const updated = await updateDeal(dealId, { fase: newFase, fase_sinds: new Date().toISOString() })
      setDeals((prev) => prev.map((d) => d.id === dealId ? updated : d))
      toast.success(`Deal verplaatst naar ${columns.find((c) => c.key === newFase)?.label || newFase}`)
    } catch {
      toast.error('Kon deal niet verplaatsen')
    }
  }, [deals, columns])

  // ============ NEW DEAL ============

  const handleCreateDeal = useCallback(async () => {
    if (!newTitel.trim()) { toast.error('Vul een titel in'); return }
    if (!newKlantId) { toast.error('Selecteer een klant'); return }

    setIsSaving(true)
    try {
      const firstFase = columns.length > 0 ? columns[0].key : 'lead'
      const created = await createDeal({
        user_id: '',
        klant_id: newKlantId,
        titel: newTitel.trim(),
        verwachte_waarde: newWaarde,
        fase: firstFase,
        fase_sinds: new Date().toISOString(),
        status: 'open',
        bron: newBron,
        kans_percentage: 20,
      })
      setDeals((prev) => [created, ...prev])
      setNewDealOpen(false)
      setNewTitel('')
      setNewKlantId('')
      setNewWaarde(0)
      toast.success('Deal aangemaakt')
      navigate(`/deals/${created.id}`)
    } catch {
      toast.error('Fout bij aanmaken')
    } finally {
      setIsSaving(false)
    }
  }, [newTitel, newKlantId, newWaarde, newBron, columns, navigate])

  // ============ DELETE ============

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteDeal(deleteTarget.id)
      setDeals((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      toast.success('Deal verwijderd')
    } catch {
      toast.error('Kon deal niet verwijderen')
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Deals laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Handshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Sales Pipeline</h1>
            <p className="text-sm text-muted-foreground">{kpis.aantalOpen} open deals — {formatCurrency(kpis.openWaarde)} pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="gap-1 h-7 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
            <Button variant={viewMode === 'tabel' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('tabel')} className="gap-1 h-7 text-xs">
              <List className="h-3.5 w-3.5" /> Tabel
            </Button>
          </div>
          <Button onClick={() => setNewDealOpen(true)} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 border-0" size="sm">
            <Plus className="h-4 w-4" /> Nieuwe deal
          </Button>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Pipeline waarde</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(kpis.openWaarde)}</p>
          <p className="text-[10px] text-gray-400">Gewogen: {formatCurrency(kpis.gewogenWaarde)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold uppercase text-gray-500 tracking-wide">Gem. deal grootte</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(kpis.gemDealGrootte)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold uppercase text-emerald-600 tracking-wide">Gewonnen (maand)</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(kpis.gewonnenMaand)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] font-semibold uppercase text-red-500 tracking-wide">Verloren (maand)</p>
          <p className="text-lg font-bold text-red-500 mt-1">{formatCurrency(kpis.verlorenMaand)}</p>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Zoek op titel of klant..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterBron} onValueChange={setFilterBron}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Bron" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle bronnen</SelectItem>
            {Object.entries(BRON_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMedewerker} onValueChange={setFilterMedewerker}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Eigenaar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle eigenaren</SelectItem>
            {medewerkers.filter((m) => m.status === 'actief').map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 480 }}>
          {columns.map((col) => {
            const colDeals = dealsByFase[col.key] || []
            const colTotal = round2(colDeals.reduce((s, d) => s + d.verwachte_waarde, 0))
            return (
              <div
                key={col.key}
                className={cn('flex-shrink-0 w-72 rounded-2xl border bg-gradient-to-b flex flex-col', col.color)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column header */}
                <div className={cn('px-4 py-3 border-b rounded-t-2xl', col.headerBg)}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-2 h-2 rounded-full', col.accent)} />
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{col.label}</h3>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{colDeals.length}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 pl-4">{formatCurrency(colTotal)}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px]">
                  {colDeals.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6">Geen deals</p>
                  ) : (
                    colDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className="bg-white/80 dark:bg-gray-800/80 rounded-xl border p-3 space-y-2 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{getKlantNaam(deal.klant_id)}</span>
                          {deal.kans_percentage !== undefined && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded',
                              (deal.kans_percentage || 0) >= 70 ? 'bg-emerald-100 text-emerald-700' :
                              (deal.kans_percentage || 0) >= 30 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            )}>{deal.kans_percentage}%</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2">{deal.titel}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(deal.verwachte_waarde)}</span>
                          {deal.medewerker_id && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center" title={getMedewerkerNaam(deal.medewerker_id)}>
                              <span className="text-[9px] font-bold text-white">{getInitials(getMedewerkerNaam(deal.medewerker_id))}</span>
                            </div>
                          )}
                        </div>
                        {deal.volgende_actie && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <ArrowRight className="h-3 w-3" />
                            <span className="truncate">{deal.volgende_actie}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'tabel' && (
        <Card>
          <div className="overflow-x-auto">
            {gefilterd.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Handshake className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">Geen deals gevonden</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                    {['Titel', 'Klant', 'Waarde', 'Fase', 'Kans', 'Eigenaar', 'Volgende actie', ''].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {gefilterd.map((deal) => (
                    <tr key={deal.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => navigate(`/deals/${deal.id}`)}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{deal.titel}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{getKlantNaam(deal.klant_id)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(deal.verwachte_waarde)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px]">{columns.find((c) => c.key === deal.fase)?.label || deal.fase}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          (deal.kans_percentage || 0) >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          (deal.kans_percentage || 0) >= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        )}>{deal.kans_percentage || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{getMedewerkerNaam(deal.medewerker_id)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{deal.volgende_actie || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/deals/${deal.id}`) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteTarget(deal); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* New Deal Dialog */}
      <Dialog open={newDealOpen} onOpenChange={setNewDealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titel *</label>
              <Input value={newTitel} onChange={(e) => setNewTitel(e.target.value)} placeholder="Bijv. Gevelreclame Bakkerij Jansen" />
            </div>
            <div>
              <label className="text-sm font-medium">Klant *</label>
              <Select value={newKlantId} onValueChange={setNewKlantId}>
                <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                <SelectContent>
                  {klanten.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.bedrijfsnaam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Verwachte waarde</label>
              <Input type="number" min={0} step={100} value={newWaarde} onChange={(e) => setNewWaarde(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium">Bron</label>
              <Select value={newBron} onValueChange={(v) => setNewBron(v as Deal['bron'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BRON_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDealOpen(false)}>Annuleren</Button>
            <Button onClick={handleCreateDeal} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deal verwijderen?</DialogTitle>
            <DialogDescription>Weet u zeker dat u "{deleteTarget?.titel}" wilt verwijderen?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
