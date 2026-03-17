import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import {
  Plus, Search, ShoppingCart, Trash2, Eye,
  Download, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Bestelbon, Leverancier, Project } from '@/types'
import {
  getBestelbonnen, deleteBestelbon, getLeveranciers, getProjecten,
  getBestelbonRegels,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'
import { getRowAccentClass } from '@/utils/statusColors'

// ============ TYPES ============

type FilterStatus = 'alle' | Bestelbon['status']

const STATUS_CONFIG: Record<Bestelbon['status'], { label: string; color: string; dot: string }> = {
  concept: { label: 'Concept', color: 'badge-cream', dot: 'bg-[var(--color-cream-text)]' },
  besteld: { label: 'Besteld', color: 'badge-mist', dot: 'bg-[var(--color-mist-text)]' },
  deels_ontvangen: { label: 'Deels ontvangen', color: 'badge-cream', dot: 'bg-[var(--color-cream-text)]' },
  ontvangen: { label: 'Ontvangen', color: 'badge-sage', dot: 'bg-[var(--color-sage-text)]' },
  geannuleerd: { label: 'Geannuleerd', color: 'badge-coral', dot: 'bg-[var(--color-coral-text)]' },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'concept', label: 'Concept' },
  { value: 'besteld', label: 'Besteld' },
  { value: 'deels_ontvangen', label: 'Deels ontvangen' },
  { value: 'ontvangen', label: 'Ontvangen' },
  { value: 'geannuleerd', label: 'Geannuleerd' },
]

// ============ COMPONENT ============

export function BestelbonnenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [bestelbonnen, setBestelbonnen] = useState<Bestelbon[]>([])
  const [leveranciers, setLeveranciers] = useState<Leverancier[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [bedragen, setBedragen] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Bestelbon | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [bstData, levData, projData] = await Promise.all([
          getBestelbonnen().catch(() => []),
          getLeveranciers().catch(() => []),
          getProjecten().catch(() => []),
        ])
        if (cancelled) return

        const bedragenMap: Record<string, number> = {}
        for (const bst of bstData) {
          try {
            const regels = await getBestelbonRegels(bst.id)
            bedragenMap[bst.id] = round2(regels.reduce((sum, r) => sum + round2(r.aantal * r.prijs_per_eenheid), 0))
          } catch {
            bedragenMap[bst.id] = bst.totaal || 0
          }
        }
        if (cancelled) return

        setBestelbonnen(bstData)
        setLeveranciers(levData)
        setProjecten(projData)
        setBedragen(bedragenMap)
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: bestelbonnen.length }
    for (const b of bestelbonnen) counts[b.status] = (counts[b.status] || 0) + 1
    return counts
  }, [bestelbonnen])

  const gefilterd = useMemo(() => {
    let result = [...bestelbonnen]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((b) =>
        b.bestelbon_nummer.toLowerCase().includes(q) ||
        getLeverancierNaam(b.leverancier_id).toLowerCase().includes(q) ||
        getProjectNaam(b.project_id).toLowerCase().includes(q) ||
        (b.opmerkingen || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'alle') result = result.filter((b) => b.status === filterStatus)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [bestelbonnen, searchQuery, filterStatus, getLeverancierNaam, getProjectNaam])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteBestelbon(deleteTarget.id)
      setBestelbonnen((prev) => prev.filter((b) => b.id !== deleteTarget.id))
      toast.success(`${deleteTarget.bestelbon_nummer} verwijderd`)
    } catch {
      toast.error('Kon bestelbon niet verwijderen')
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget])

  const handleExportCSV = useCallback(() => {
    const headers = ['Nummer', 'Leverancier', 'Project', 'Datum', 'Status', 'Bedrag']
    const rows = gefilterd.map((b) =>
      [b.bestelbon_nummer, getLeverancierNaam(b.leverancier_id), getProjectNaam(b.project_id), b.besteld_op || '', STATUS_CONFIG[b.status].label, (bedragen[b.id] || 0).toFixed(2)].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bestelbonnen.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV gedownload')
  }, [gefilterd, getLeverancierNaam, getProjectNaam, bedragen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Bestelbonnen laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Bestelbonnen</h1>
            <p className="text-sm text-muted-foreground">{gefilterd.length} van {bestelbonnen.length} bestelbonnen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            onClick={() => navigate('/bestelbonnen/nieuw')}
            className="gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 border-0"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Nieuwe bestelbon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {FILTER_OPTIONS.filter((f) => f.value !== 'alle').map((opt) => {
          const cfg = STATUS_CONFIG[opt.value as Bestelbon['status']]
          return (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className={cn('text-left rounded-xl border p-5 transition-all hover:shadow-md', filterStatus === opt.value ? 'ring-2 ring-primary/50 border-primary' : 'border-border')}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                <span className="text-xs font-medium text-muted-foreground">{opt.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{statusCounts[opt.value] || 0}</p>
            </button>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op nummer, leverancier, project..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <Button key={opt.value} variant={filterStatus === opt.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(opt.value)} className="text-xs">
              {opt.label} {statusCounts[opt.value] !== undefined && <span className="ml-1 text-2xs opacity-70">({statusCounts[opt.value] || 0})</span>}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {gefilterd.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Geen bestelbonnen gevonden</p>
              <p className="text-xs text-muted-foreground/60">Maak een bestelbon aan voor je leveranciers.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/bestelbonnen/nieuw')}>
                <Plus className="h-4 w-4 mr-2" /> Eerste bestelbon aanmaken
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Nummer', 'Leverancier', 'Project', 'Datum', 'Status', 'Bedrag', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gefilterd.map((bst) => {
                  const cfg = STATUS_CONFIG[bst.status]
                  return (
                    <tr key={bst.id} className={`group hover:bg-bg-hover transition-colors duration-150 cursor-pointer border-l-2 ${getRowAccentClass(bst.status)}`} onClick={() => navigateWithTab({ path: `/bestelbonnen/${bst.id}`, label: bst.bestelbon_nummer || 'Bestelbon', id: `/bestelbonnen/${bst.id}` })}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-orange-600 dark:text-orange-400">{bst.bestelbon_nummer}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{getLeverancierNaam(bst.leverancier_id)}</td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{getProjectNaam(bst.project_id)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground dark:text-muted-foreground">{bst.besteld_op ? formatDate(bst.besteld_op) : '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', cfg.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', cfg.dot)} />{cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatCurrency(bedragen[bst.id] || 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/bestelbonnen/${bst.id}`, label: bst.bestelbon_nummer || 'Bestelbon', id: `/bestelbonnen/${bst.id}` }) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(bst); setDeleteDialogOpen(true) }}>
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

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bestelbon verwijderen?</DialogTitle>
            <DialogDescription>Weet u zeker dat u {deleteTarget?.bestelbon_nummer} wilt verwijderen? Dit kan niet ongedaan worden.</DialogDescription>
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
