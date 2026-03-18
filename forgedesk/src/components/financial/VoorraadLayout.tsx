import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, Warehouse, Trash2, Edit2,
  Loader2, AlertTriangle, Package, ArrowDownUp,
  TrendingUp, TrendingDown, RotateCcw, Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { VoorraadArtikel, VoorraadMutatie, Leverancier, Project } from '@/types'
import {
  getVoorraadArtikelen, createVoorraadArtikel, updateVoorraadArtikel, deleteVoorraadArtikel,
  getVoorraadMutaties, createVoorraadMutatie,
  getLeveranciers, getProjecten,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'

// ============ TYPES ============

type ViewMode = 'artikelen' | 'detail'

const MUTATIE_TYPE_CONFIG: Record<VoorraadMutatie['type'], { label: string; icon: typeof TrendingUp; color: string }> = {
  inkoop: { label: 'Inkoop', icon: TrendingUp, color: 'text-accent dark:text-wm-light' },
  verbruik: { label: 'Verbruik', icon: TrendingDown, color: 'text-red-600' },
  correctie: { label: 'Correctie', icon: RotateCcw, color: 'text-primary' },
  retour: { label: 'Retour', icon: Undo2, color: 'text-amber-600' },
}

const CATEGORIEEN = [
  'Vinyl & Folie',
  'Plaat & Dibond',
  'Profiel & Montage',
  'LED & Verlichting',
  'Freesletters & 3D',
  'Print & Laminaat',
  'Bevestiging',
  'Elektrisch',
  'Verf & Coating',
  'Overig',
]

// ============ COMPONENT ============

export function VoorraadLayout() {
  const [artikelen, setArtikelen] = useState<VoorraadArtikel[]>([])
  const [leveranciers, setLeveranciers] = useState<Leverancier[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('alle')

  // Views
  const [viewMode, setViewMode] = useState<ViewMode>('artikelen')
  const [selectedArtikel, setSelectedArtikel] = useState<VoorraadArtikel | null>(null)
  const [mutaties, setMutaties] = useState<VoorraadMutatie[]>([])

  // Dialogs
  const [artikelDialogOpen, setArtikelDialogOpen] = useState(false)
  const [editingArtikel, setEditingArtikel] = useState<VoorraadArtikel | null>(null)
  const [mutatieDialogOpen, setMutatieDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VoorraadArtikel | null>(null)

  // Artikel form
  const [formNaam, setFormNaam] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formCategorie, setFormCategorie] = useState('Overig')
  const [formEenheid, setFormEenheid] = useState('stuk')
  const [formHuidigeVoorraad, setFormHuidigeVoorraad] = useState(0)
  const [formMinVoorraad, setFormMinVoorraad] = useState(0)
  const [formMaxVoorraad, setFormMaxVoorraad] = useState(0)
  const [formInkoopPrijs, setFormInkoopPrijs] = useState(0)
  const [formVerkoopPrijs, setFormVerkoopPrijs] = useState(0)
  const [formLeverancierId, setFormLeverancierId] = useState('')
  const [formOpslaglocatie, setFormOpslaglocatie] = useState('')

  // Mutatie form
  const [mutatieType, setMutatieType] = useState<VoorraadMutatie['type']>('inkoop')
  const [mutatieAantal, setMutatieAantal] = useState(0)
  const [mutatieReden, setMutatieReden] = useState('')
  const [mutatieProjectId, setMutatieProjectId] = useState('')

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [artData, levData, projData] = await Promise.all([
          getVoorraadArtikelen().catch(() => []),
          getLeveranciers().catch(() => []),
          getProjecten().catch(() => []),
        ])
        if (cancelled) return
        setArtikelen(artData)
        setLeveranciers(levData)
        setProjecten(projData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // ============ COMPUTED ============

  const lageVoorraad = useMemo(() => {
    return artikelen.filter((a) => a.actief && a.huidige_voorraad < a.minimum_voorraad)
  }, [artikelen])

  const totaleWaarde = useMemo(() => {
    return round2(artikelen.filter((a) => a.actief).reduce((sum, a) => sum + round2(a.huidige_voorraad * a.inkoop_prijs), 0))
  }, [artikelen])

  const categorieList = useMemo(() => {
    const cats = new Set(artikelen.map((a) => a.categorie))
    return ['alle', ...Array.from(cats).sort()]
  }, [artikelen])

  const gefilterd = useMemo(() => {
    let result = [...artikelen]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((a) =>
        a.naam.toLowerCase().includes(q) ||
        (a.sku || '').toLowerCase().includes(q) ||
        a.categorie.toLowerCase().includes(q) ||
        (a.opslaglocatie || '').toLowerCase().includes(q)
      )
    }
    if (filterCategorie !== 'alle') result = result.filter((a) => a.categorie === filterCategorie)
    result.sort((a, b) => a.naam.localeCompare(b.naam))
    return result
  }, [artikelen, searchQuery, filterCategorie])

  const getLeverancierNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return leveranciers.find((l) => l.id === id)?.bedrijfsnaam || '-'
  }, [leveranciers])

  // ============ ARTIKEL CRUD ============

  const openNewArtikel = useCallback(() => {
    setEditingArtikel(null)
    setFormNaam('')
    setFormSku('')
    setFormCategorie('Overig')
    setFormEenheid('stuk')
    setFormHuidigeVoorraad(0)
    setFormMinVoorraad(0)
    setFormMaxVoorraad(0)
    setFormInkoopPrijs(0)
    setFormVerkoopPrijs(0)
    setFormLeverancierId('')
    setFormOpslaglocatie('')
    setArtikelDialogOpen(true)
  }, [])

  const openEditArtikel = useCallback((a: VoorraadArtikel) => {
    setEditingArtikel(a)
    setFormNaam(a.naam)
    setFormSku(a.sku || '')
    setFormCategorie(a.categorie)
    setFormEenheid(a.eenheid)
    setFormHuidigeVoorraad(a.huidige_voorraad)
    setFormMinVoorraad(a.minimum_voorraad)
    setFormMaxVoorraad(a.maximum_voorraad || 0)
    setFormInkoopPrijs(a.inkoop_prijs)
    setFormVerkoopPrijs(a.verkoop_prijs || 0)
    setFormLeverancierId(a.leverancier_id || '')
    setFormOpslaglocatie(a.opslaglocatie || '')
    setArtikelDialogOpen(true)
  }, [])

  const handleSaveArtikel = useCallback(async () => {
    if (!formNaam.trim()) {
      toast.error('Vul een naam in')
      return
    }
    setIsSaving(true)
    try {
      if (editingArtikel) {
        const updated = await updateVoorraadArtikel(editingArtikel.id, {
          naam: formNaam.trim(),
          sku: formSku || undefined,
          categorie: formCategorie,
          eenheid: formEenheid,
          minimum_voorraad: formMinVoorraad,
          maximum_voorraad: formMaxVoorraad || undefined,
          inkoop_prijs: formInkoopPrijs,
          verkoop_prijs: formVerkoopPrijs || undefined,
          leverancier_id: formLeverancierId || undefined,
          opslaglocatie: formOpslaglocatie || undefined,
        })
        setArtikelen((prev) => prev.map((a) => a.id === updated.id ? updated : a))
        if (selectedArtikel?.id === updated.id) setSelectedArtikel(updated)
        toast.success(`${updated.naam} bijgewerkt`)
      } else {
        const created = await createVoorraadArtikel({
          user_id: '',
          naam: formNaam.trim(),
          sku: formSku || undefined,
          categorie: formCategorie,
          eenheid: formEenheid,
          huidige_voorraad: formHuidigeVoorraad,
          minimum_voorraad: formMinVoorraad,
          maximum_voorraad: formMaxVoorraad || undefined,
          inkoop_prijs: formInkoopPrijs,
          verkoop_prijs: formVerkoopPrijs || undefined,
          leverancier_id: formLeverancierId || undefined,
          opslaglocatie: formOpslaglocatie || undefined,
          actief: true,
        })
        setArtikelen((prev) => [...prev, created])
        toast.success(`${created.naam} aangemaakt`)
      }
      setArtikelDialogOpen(false)
    } catch {
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [editingArtikel, formNaam, formSku, formCategorie, formEenheid, formHuidigeVoorraad, formMinVoorraad, formMaxVoorraad, formInkoopPrijs, formVerkoopPrijs, formLeverancierId, formOpslaglocatie, selectedArtikel])

  const handleDeleteArtikel = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteVoorraadArtikel(deleteTarget.id)
      setArtikelen((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      if (selectedArtikel?.id === deleteTarget.id) {
        setViewMode('artikelen')
        setSelectedArtikel(null)
      }
      toast.success(`${deleteTarget.naam} verwijderd`)
    } catch {
      toast.error('Kon artikel niet verwijderen')
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget, selectedArtikel])

  // ============ DETAIL VIEW ============

  const openDetailView = useCallback(async (artikel: VoorraadArtikel) => {
    setSelectedArtikel(artikel)
    setViewMode('detail')
    try {
      const m = await getVoorraadMutaties(artikel.id)
      setMutaties(m)
    } catch {
      setMutaties([])
    }
  }, [])

  // ============ MUTATIE ============

  const openMutatieDialog = useCallback(() => {
    setMutatieType('inkoop')
    setMutatieAantal(0)
    setMutatieReden('')
    setMutatieProjectId('')
    setMutatieDialogOpen(true)
  }, [])

  const handleSaveMutatie = useCallback(async () => {
    if (!selectedArtikel) return
    if (mutatieAantal === 0) {
      toast.error('Vul een aantal in')
      return
    }

    setIsSaving(true)
    try {
      // Determine actual quantity change (negative for verbruik)
      const actualAantal = mutatieType === 'verbruik' ? -Math.abs(mutatieAantal) : Math.abs(mutatieAantal)

      const mutatie = await createVoorraadMutatie({
        user_id: '',
        artikel_id: selectedArtikel.id,
        type: mutatieType,
        aantal: actualAantal,
        reden: mutatieReden || undefined,
        project_id: mutatieProjectId || undefined,
        datum: new Date().toISOString().split('T')[0],
      })

      setMutaties((prev) => [mutatie, ...prev])

      // Refresh artikel data
      const updatedArtikel = { ...selectedArtikel, huidige_voorraad: mutatie.saldo_na_mutatie }
      setSelectedArtikel(updatedArtikel)
      setArtikelen((prev) => prev.map((a) => a.id === updatedArtikel.id ? updatedArtikel : a))

      setMutatieDialogOpen(false)
      toast.success(`${MUTATIE_TYPE_CONFIG[mutatieType].label} van ${Math.abs(mutatieAantal)} ${selectedArtikel.eenheid} geregistreerd`)
    } catch {
      toast.error('Fout bij registreren mutatie')
    } finally {
      setIsSaving(false)
    }
  }, [selectedArtikel, mutatieType, mutatieAantal, mutatieReden, mutatieProjectId])

  // ============ RENDER ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Voorraad laden...</p>
        </div>
      </div>
    )
  }

  // ============ DETAIL VIEW ============

  if (viewMode === 'detail' && selectedArtikel) {
    const isLaag = selectedArtikel.huidige_voorraad < selectedArtikel.minimum_voorraad
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setViewMode('artikelen'); setSelectedArtikel(null) }}>
              <Undo2 className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{selectedArtikel.naam}</h1>
              <p className="text-sm text-muted-foreground">{selectedArtikel.sku || selectedArtikel.categorie}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditArtikel(selectedArtikel)} className="gap-1">
              <Edit2 className="h-3.5 w-3.5" /> Bewerken
            </Button>
            <Button size="sm" onClick={openMutatieDialog} className="gap-1">
              <ArrowDownUp className="h-3.5 w-3.5" /> Nieuwe mutatie
            </Button>
          </div>
        </div>

        {/* Waarschuwing */}
        {isLaag && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Voorraad onder minimum!</p>
              <p className="text-sm text-red-600 dark:text-red-400">Huidig: {selectedArtikel.huidige_voorraad} {selectedArtikel.eenheid} — Minimum: {selectedArtikel.minimum_voorraad} {selectedArtikel.eenheid}</p>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Huidige voorraad</p>
            <p className={cn('text-2xl font-bold', isLaag ? 'text-red-600' : 'text-foreground')}>{selectedArtikel.huidige_voorraad} <span className="text-sm font-normal text-muted-foreground/60">{selectedArtikel.eenheid}</span></p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Min / Max</p>
            <p className="text-2xl font-bold text-foreground">{selectedArtikel.minimum_voorraad} <span className="text-sm font-normal text-muted-foreground/60">/ {selectedArtikel.maximum_voorraad || '∞'}</span></p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Inkoopprijs</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(selectedArtikel.inkoop_prijs)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Voorraadwaarde</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(round2(selectedArtikel.huidige_voorraad * selectedArtikel.inkoop_prijs))}</p>
          </Card>
        </div>

        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Categorie:</span> <span className="font-medium">{selectedArtikel.categorie}</span></div>
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{selectedArtikel.sku || '-'}</span></div>
              <div><span className="text-muted-foreground">Leverancier:</span> <span className="font-medium">{getLeverancierNaam(selectedArtikel.leverancier_id)}</span></div>
              <div><span className="text-muted-foreground">Opslaglocatie:</span> <span className="font-medium">{selectedArtikel.opslaglocatie || '-'}</span></div>
              {selectedArtikel.verkoop_prijs && (
                <div><span className="text-muted-foreground">Verkoopprijs:</span> <span className="font-medium">{formatCurrency(selectedArtikel.verkoop_prijs)}</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mutaties */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mutaties</CardTitle>
              <Button variant="outline" size="sm" onClick={openMutatieDialog} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Mutatie
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mutaties.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <ArrowDownUp className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-sm font-medium">Nog geen mutaties geregistreerd.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mutaties.map((m) => {
                  const cfg = MUTATIE_TYPE_CONFIG[m.type]
                  const Icon = cfg.icon
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <Icon className={cn('h-4 w-4', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-2xs">{cfg.label}</Badge>
                          <span className={cn('text-sm font-semibold', m.aantal >= 0 ? 'text-accent dark:text-wm-light' : 'text-red-600')}>
                            {m.aantal >= 0 ? '+' : ''}{m.aantal} {selectedArtikel.eenheid}
                          </span>
                        </div>
                        {m.reden && <p className="text-xs text-muted-foreground truncate">{m.reden}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{m.datum ? formatDate(m.datum) : '-'}</p>
                        <p className="text-xs text-muted-foreground/60">Saldo: {m.saldo_na_mutatie}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============ LIST VIEW ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Voorraadbeheer</h1>
            <p className="text-sm text-muted-foreground">{artikelen.length} artikelen — Totale waarde: {formatCurrency(totaleWaarde)}</p>
          </div>
        </div>
        <Button
          onClick={openNewArtikel}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" /> Nieuw artikel
        </Button>
      </div>

      {/* Alerts */}
      {lageVoorraad.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-300">{lageVoorraad.length} artikel{lageVoorraad.length > 1 ? 'en' : ''} onder minimum voorraad</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {lageVoorraad.slice(0, 3).map((a) => a.naam).join(', ')}{lageVoorraad.length > 3 ? ` en ${lageVoorraad.length - 3} meer...` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input placeholder="Zoek op naam, SKU, categorie, locatie..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            {categorieList.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat === 'alle' ? 'Alle categorieën' : cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {gefilterd.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Geen artikelen gevonden</p>
              <Button variant="outline" size="sm" onClick={openNewArtikel}>
                <Plus className="h-4 w-4 mr-2" /> Eerste artikel aanmaken
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Naam', 'SKU', 'Categorie', 'Voorraad', 'Min', 'Inkoopprijs', 'Waarde', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gefilterd.map((art) => {
                  const isLaag = art.actief && art.huidige_voorraad < art.minimum_voorraad
                  return (
                    <tr key={art.id} className="group hover:bg-bg-hover transition-colors duration-150 cursor-pointer" onClick={() => openDetailView(art)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{art.naam}</span>
                          {!art.actief && <Badge variant="secondary" className="text-2xs">Inactief</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{art.sku || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{art.categorie}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-semibold', isLaag ? 'text-red-600' : 'text-foreground')}>
                          {art.huidige_voorraad} {art.eenheid}
                        </span>
                        {isLaag && <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline-block ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{art.minimum_voorraad}</td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{formatCurrency(art.inkoop_prijs)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatCurrency(round2(art.huidige_voorraad * art.inkoop_prijs))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditArtikel(art) }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(art); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Artikel Dialog */}
      <Dialog open={artikelDialogOpen} onOpenChange={setArtikelDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArtikel ? 'Artikel bewerken' : 'Nieuw artikel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naam *</Label>
              <Input value={formNaam} onChange={(e) => setFormNaam(e.target.value)} placeholder="Artikelnaam" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder="Artikelnummer" />
              </div>
              <div>
                <Label>Categorie</Label>
                <Select value={formCategorie} onValueChange={setFormCategorie}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIEEN.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Eenheid</Label>
                <Input value={formEenheid} onChange={(e) => setFormEenheid(e.target.value)} />
              </div>
              {!editingArtikel && (
                <div>
                  <Label>Beginvoorraad</Label>
                  <Input type="number" min={0} value={formHuidigeVoorraad} onChange={(e) => setFormHuidigeVoorraad(parseFloat(e.target.value) || 0)} />
                </div>
              )}
              <div>
                <Label>Min. voorraad</Label>
                <Input type="number" min={0} value={formMinVoorraad} onChange={(e) => setFormMinVoorraad(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Inkoopprijs</Label>
                <Input type="number" min={0} step={0.01} value={formInkoopPrijs} onChange={(e) => setFormInkoopPrijs(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Verkoopprijs</Label>
                <Input type="number" min={0} step={0.01} value={formVerkoopPrijs} onChange={(e) => setFormVerkoopPrijs(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label>Leverancier</Label>
              <Select value={formLeverancierId} onValueChange={setFormLeverancierId}>
                <SelectTrigger><SelectValue placeholder="Selecteer leverancier" /></SelectTrigger>
                <SelectContent>
                  {leveranciers.filter((l) => l.actief).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.bedrijfsnaam || l.contactpersoon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opslaglocatie</Label>
              <Input value={formOpslaglocatie} onChange={(e) => setFormOpslaglocatie(e.target.value)} placeholder="Bijv. Magazijn A, Rek 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArtikelDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveArtikel} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingArtikel ? 'Bijwerken' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mutatie Dialog */}
      <Dialog open={mutatieDialogOpen} onOpenChange={setMutatieDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nieuwe mutatie</DialogTitle>
            <DialogDescription>
              {selectedArtikel ? `${selectedArtikel.naam} — Huidig: ${selectedArtikel.huidige_voorraad} ${selectedArtikel.eenheid}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={mutatieType} onValueChange={(v) => setMutatieType(v as VoorraadMutatie['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inkoop">Inkoop (+)</SelectItem>
                  <SelectItem value="verbruik">Verbruik (-)</SelectItem>
                  <SelectItem value="correctie">Correctie (+/-)</SelectItem>
                  <SelectItem value="retour">Retour (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aantal</Label>
              <Input
                type="number"
                min={mutatieType === 'correctie' ? undefined : 0}
                value={mutatieAantal}
                onChange={(e) => setMutatieAantal(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Reden / omschrijving</Label>
              <Input value={mutatieReden} onChange={(e) => setMutatieReden(e.target.value)} placeholder="Optioneel" />
            </div>
            <div>
              <Label>Project</Label>
              <Select value={mutatieProjectId} onValueChange={setMutatieProjectId}>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
                  {projecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMutatieDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveMutatie} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Registreren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Artikel verwijderen?</DialogTitle>
            <DialogDescription>Weet u zeker dat u "{deleteTarget?.naam}" wilt verwijderen? Alle bijbehorende mutaties gaan ook verloren.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeleteArtikel}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
