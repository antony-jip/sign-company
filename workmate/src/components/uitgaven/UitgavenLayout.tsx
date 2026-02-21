import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, Receipt, Trash2, Pencil, Download,
  Filter, TrendingDown, DollarSign, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { Uitgave, Leverancier, Project } from '@/types'
import {
  getUitgaven, createUitgave, updateUitgave, deleteUitgave,
  getLeveranciers, createLeverancier,
  getProjecten, round2,
} from '@/services/supabaseService'

type FilterStatus = 'alle' | 'open' | 'betaald' | 'verlopen'
type FilterCategorie = 'alle' | Uitgave['categorie']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-blue-700', bg: 'bg-blue-100' },
  betaald: { label: 'Betaald', color: 'text-green-700', bg: 'bg-green-100' },
  verlopen: { label: 'Verlopen', color: 'text-red-700', bg: 'bg-red-100' },
}

const CATEGORIE_OPTIONS: { value: Uitgave['categorie']; label: string }[] = [
  { value: 'materiaal', label: 'Materiaal' },
  { value: 'arbeid_extern', label: 'Arbeid extern' },
  { value: 'transport', label: 'Transport' },
  { value: 'gereedschap', label: 'Gereedschap' },
  { value: 'kantoor', label: 'Kantoor' },
  { value: 'software', label: 'Software' },
  { value: 'verzekering', label: 'Verzekering' },
  { value: 'overig', label: 'Overig' },
]

const TYPE_OPTIONS: { value: Uitgave['type']; label: string }[] = [
  { value: 'inkoopfactuur', label: 'Inkoopfactuur' },
  { value: 'bon', label: 'Bon' },
  { value: 'abonnement', label: 'Abonnement' },
  { value: 'kilometervergoeding', label: 'Kilometervergoeding' },
  { value: 'overig', label: 'Overig' },
]

interface FormData {
  leverancier_id: string
  project_id: string
  type: Uitgave['type']
  referentie_nummer: string
  bedrag_excl_btw: number
  btw_percentage: number
  datum: string
  vervaldatum: string
  status: Uitgave['status']
  betaald_op: string
  categorie: Uitgave['categorie']
  omschrijving: string
}

const EMPTY_FORM: FormData = {
  leverancier_id: '',
  project_id: '',
  type: 'inkoopfactuur',
  referentie_nummer: '',
  bedrag_excl_btw: 0,
  btw_percentage: 21,
  datum: new Date().toISOString().split('T')[0],
  vervaldatum: '',
  status: 'open',
  betaald_op: '',
  categorie: 'materiaal',
  omschrijving: '',
}

export function UitgavenLayout() {
  const { user } = useAuth()
  const userId = user?.id || ''

  const [uitgaven, setUitgaven] = useState<Uitgave[]>([])
  const [leveranciers, setLeveranciers] = useState<Leverancier[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [filterCategorie, setFilterCategorie] = useState<FilterCategorie>('alle')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM })
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Uitgave | null>(null)

  // Nieuwe leverancier inline
  const [nieuweLevDialogOpen, setNieuweLevDialogOpen] = useState(false)
  const [nieuweLevNaam, setNieuweLevNaam] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [uitg, lev, proj] = await Promise.all([
          getUitgaven(),
          getLeveranciers(),
          getProjecten(),
        ])
        if (cancelled) return
        setUitgaven(uitg)
        setLeveranciers(lev)
        setProjecten(proj)
      } catch {
        if (!cancelled) toast.error('Fout bij laden uitgaven')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getLeverancierNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return leveranciers.find((l) => l.id === id)?.bedrijfsnaam || '-'
  }, [leveranciers])

  const getProjectNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return projecten.find((p) => p.id === id)?.naam || '-'
  }, [projecten])

  const gefilterd = useMemo(() => {
    let result = [...uitgaven]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((u) =>
        u.uitgave_nummer.toLowerCase().includes(q) ||
        u.omschrijving.toLowerCase().includes(q) ||
        getLeverancierNaam(u.leverancier_id).toLowerCase().includes(q) ||
        getProjectNaam(u.project_id).toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'alle') {
      result = result.filter((u) => u.status === filterStatus)
    }
    if (filterCategorie !== 'alle') {
      result = result.filter((u) => u.categorie === filterCategorie)
    }
    result.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
    return result
  }, [uitgaven, searchQuery, filterStatus, filterCategorie, getLeverancierNaam, getProjectNaam])

  // Stats
  const stats = useMemo(() => {
    const nu = new Date().toISOString().split('T')[0]
    const maandStart = `${nu.slice(0, 7)}-01`
    const jaarStart = `${nu.slice(0, 4)}-01-01`
    return {
      openTotaal: round2(uitgaven.filter((u) => u.status === 'open').reduce((s, u) => s + u.bedrag_incl_btw, 0)),
      betaaldMaand: round2(uitgaven.filter((u) => u.status === 'betaald' && u.betaald_op && u.betaald_op >= maandStart).reduce((s, u) => s + u.bedrag_incl_btw, 0)),
      totaalJaar: round2(uitgaven.filter((u) => u.datum >= jaarStart).reduce((s, u) => s + u.bedrag_incl_btw, 0)),
    }
  }, [uitgaven])

  const formatCurrency = (val: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val)

  const openNieuw = useCallback(() => {
    setFormData({ ...EMPTY_FORM })
    setEditingId(null)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((u: Uitgave) => {
    setFormData({
      leverancier_id: u.leverancier_id || '',
      project_id: u.project_id || '',
      type: u.type,
      referentie_nummer: u.referentie_nummer || '',
      bedrag_excl_btw: u.bedrag_excl_btw,
      btw_percentage: u.btw_percentage,
      datum: u.datum,
      vervaldatum: u.vervaldatum || '',
      status: u.status,
      betaald_op: u.betaald_op || '',
      categorie: u.categorie,
      omschrijving: u.omschrijving,
    })
    setEditingId(u.id)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.omschrijving.trim()) { toast.error('Omschrijving is verplicht'); return }
    if (formData.bedrag_excl_btw <= 0) { toast.error('Bedrag moet groter zijn dan 0'); return }

    try {
      setIsSaving(true)
      const btwBedrag = round2(formData.bedrag_excl_btw * formData.btw_percentage / 100)
      const inclBtw = round2(formData.bedrag_excl_btw + btwBedrag)

      const data = {
        user_id: userId,
        leverancier_id: formData.leverancier_id || undefined,
        project_id: formData.project_id || undefined,
        type: formData.type,
        referentie_nummer: formData.referentie_nummer || undefined,
        bedrag_excl_btw: formData.bedrag_excl_btw,
        btw_bedrag: btwBedrag,
        btw_percentage: formData.btw_percentage,
        bedrag_incl_btw: inclBtw,
        datum: formData.datum,
        vervaldatum: formData.vervaldatum || undefined,
        status: formData.status,
        betaald_op: formData.status === 'betaald' ? (formData.betaald_op || new Date().toISOString().split('T')[0]) : undefined,
        categorie: formData.categorie,
        omschrijving: formData.omschrijving,
      }

      if (editingId) {
        const updated = await updateUitgave(editingId, data)
        setUitgaven((prev) => prev.map((u) => u.id === editingId ? { ...u, ...updated } : u))
        toast.success('Uitgave bijgewerkt')
      } else {
        const created = await createUitgave(data as Parameters<typeof createUitgave>[0])
        setUitgaven((prev) => [created, ...prev])
        toast.success(`Uitgave ${created.uitgave_nummer} aangemaakt`)
      }
      setDialogOpen(false)
    } catch {
      toast.error('Fout bij opslaan uitgave')
    } finally {
      setIsSaving(false)
    }
  }, [formData, editingId, userId])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteUitgave(deleteTarget.id)
      setUitgaven((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      toast.success('Uitgave verwijderd')
    } catch {
      toast.error('Fout bij verwijderen')
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const handleNieuweLeverancier = useCallback(async () => {
    if (!nieuweLevNaam.trim()) return
    try {
      const lev = await createLeverancier({
        user_id: userId,
        bedrijfsnaam: nieuweLevNaam.trim(),
        actief: true,
      })
      setLeveranciers((prev) => [...prev, lev])
      setFormData((prev) => ({ ...prev, leverancier_id: lev.id }))
      setNieuweLevDialogOpen(false)
      setNieuweLevNaam('')
      toast.success('Leverancier aangemaakt')
    } catch {
      toast.error('Fout bij aanmaken leverancier')
    }
  }, [nieuweLevNaam, userId])

  const handleExportCSV = useCallback(() => {
    const header = 'Nummer,Leverancier,Project,Omschrijving,Categorie,Datum,Bedrag incl BTW,Status\n'
    const rows = gefilterd.map((u) =>
      `${u.uitgave_nummer},"${getLeverancierNaam(u.leverancier_id)}","${getProjectNaam(u.project_id)}","${u.omschrijving}",${u.categorie},${u.datum},${u.bedrag_incl_btw},${u.status}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uitgaven-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }, [gefilterd, getLeverancierNaam, getProjectNaam])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const btwBerekend = round2(formData.bedrag_excl_btw * formData.btw_percentage / 100)
  const inclBtwBerekend = round2(formData.bedrag_excl_btw + btwBerekend)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Uitgaven
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Beheer inkomende facturen, bonnen en uitgaven</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4 mr-1" /> Nieuwe uitgave
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Open</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.openTotaal)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Betaald deze maand</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.betaaldMaand)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Totaal dit jaar</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totaalJaar)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op nummer, leverancier, project..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['alle', 'open', 'betaald', 'verlopen'] as const).map((s) => (
            <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterStatus(s)}>
              {s === 'alle' ? 'Alle' : STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
        <Select value={filterCategorie} onValueChange={(v) => setFilterCategorie(v as FilterCategorie)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle categorieën</SelectItem>
            {CATEGORIE_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {gefilterd.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Geen uitgaven gevonden</p>
            <Button className="mt-4" onClick={openNieuw}><Plus className="h-4 w-4 mr-1" /> Nieuwe uitgave</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Leverancier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Omschrijving</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Bedrag</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gefilterd.map((u) => {
                  const cfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.open
                  return (
                    <tr key={u.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm">{new Date(u.datum).toLocaleDateString('nl-NL')}</td>
                      <td className="px-4 py-3 text-sm">{getLeverancierNaam(u.leverancier_id)}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px] truncate">{u.omschrijving}</td>
                      <td className="px-4 py-3 text-sm capitalize">{u.categorie.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm">{getProjectNaam(u.project_id)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(u.bedrag_incl_btw)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => { setDeleteTarget(u); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uitgave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Uitgave bewerken' : 'Nieuwe uitgave'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v as Uitgave['type'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categorie</Label>
                  <Select value={formData.categorie} onValueChange={(v) => setFormData((p) => ({ ...p, categorie: v as Uitgave['categorie'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIE_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Leverancier</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setNieuweLevDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Nieuw
                  </Button>
                </div>
                <Select value={formData.leverancier_id} onValueChange={(v) => setFormData((p) => ({ ...p, leverancier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecteer leverancier" /></SelectTrigger>
                  <SelectContent>
                    {leveranciers.filter((l) => l.actief).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.bedrijfsnaam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Project (optioneel)</Label>
                <Select value={formData.project_id} onValueChange={(v) => setFormData((p) => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Koppel aan project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geen project</SelectItem>
                    {projecten.map((p) => <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Omschrijving *</Label>
                <Input value={formData.omschrijving} onChange={(e) => setFormData((p) => ({ ...p, omschrijving: e.target.value }))} />
              </div>

              <div>
                <Label>Referentienummer</Label>
                <Input value={formData.referentie_nummer} onChange={(e) => setFormData((p) => ({ ...p, referentie_nummer: e.target.value }))}
                  placeholder="Factuurnummer leverancier" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Bedrag excl. BTW *</Label>
                  <Input type="number" min={0} step={0.01} value={formData.bedrag_excl_btw}
                    onChange={(e) => setFormData((p) => ({ ...p, bedrag_excl_btw: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>BTW %</Label>
                  <Select value={String(formData.btw_percentage)} onValueChange={(v) => setFormData((p) => ({ ...p, btw_percentage: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="21">21%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Incl. BTW</Label>
                  <Input readOnly value={formatCurrency(inclBtwBerekend)} className="bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Datum</Label>
                  <Input type="date" value={formData.datum} onChange={(e) => setFormData((p) => ({ ...p, datum: e.target.value }))} />
                </div>
                <div>
                  <Label>Vervaldatum</Label>
                  <Input type="date" value={formData.vervaldatum} onChange={(e) => setFormData((p) => ({ ...p, vervaldatum: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v as Uitgave['status'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="betaald">Betaald</SelectItem>
                      <SelectItem value="verlopen">Verlopen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.status === 'betaald' && (
                  <div>
                    <Label>Betaald op</Label>
                    <Input type="date" value={formData.betaald_op} onChange={(e) => setFormData((p) => ({ ...p, betaald_op: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uitgave verwijderen</DialogTitle>
            <DialogDescription>Weet je zeker dat je deze uitgave wilt verwijderen?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nieuwe Leverancier Dialog */}
      <Dialog open={nieuweLevDialogOpen} onOpenChange={setNieuweLevDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nieuwe leverancier</DialogTitle></DialogHeader>
          <div>
            <Label>Bedrijfsnaam</Label>
            <Input value={nieuweLevNaam} onChange={(e) => setNieuweLevNaam(e.target.value)} placeholder="Naam leverancier" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNieuweLevDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleNieuweLeverancier}>Aanmaken</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
