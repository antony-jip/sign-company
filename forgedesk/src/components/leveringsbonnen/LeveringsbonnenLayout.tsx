import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import {
  Plus, Search, PackageCheck, Trash2, Eye,
  Download, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import type { Leveringsbon, Klant, Project } from '@/types'
import {
  getLeveringsbonnen, deleteLeveringsbon, getKlanten, getProjecten,
} from '@/services/supabaseService'
import { getRowAccentClass } from '@/utils/statusColors'

// ============ TYPES ============

type FilterStatus = 'alle' | Leveringsbon['status']

const STATUS_CONFIG: Record<Leveringsbon['status'], { label: string; color: string; dot: string }> = {
  concept: { label: 'Concept', color: 'badge-cream', dot: 'bg-[var(--color-cream-text)]' },
  geleverd: { label: 'Geleverd', color: 'badge-mist', dot: 'bg-[var(--color-mist-text)]' },
  getekend: { label: 'Getekend', color: 'badge-sage', dot: 'bg-[var(--color-sage-text)]' },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'concept', label: 'Concept' },
  { value: 'geleverd', label: 'Geleverd' },
  { value: 'getekend', label: 'Getekend' },
]

// ============ COMPONENT ============

export function LeveringsbonnenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [leveringsbonnen, setLeveringsbonnen] = useState<Leveringsbon[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Leveringsbon | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [lbData, klData, projData] = await Promise.all([
          getLeveringsbonnen().catch(() => []),
          getKlanten().catch(() => []),
          getProjecten().catch(() => []),
        ])
        if (cancelled) return
        setLeveringsbonnen(lbData)
        setKlanten(klData)
        setProjecten(projData)
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

  const getProjectNaam = useCallback((id?: string) => {
    if (!id) return '-'
    return projecten.find((p) => p.id === id)?.naam || '-'
  }, [projecten])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: leveringsbonnen.length }
    for (const l of leveringsbonnen) counts[l.status] = (counts[l.status] || 0) + 1
    return counts
  }, [leveringsbonnen])

  const gefilterd = useMemo(() => {
    let result = [...leveringsbonnen]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((l) =>
        l.leveringsbon_nummer.toLowerCase().includes(q) ||
        getKlantNaam(l.klant_id).toLowerCase().includes(q) ||
        getProjectNaam(l.project_id).toLowerCase().includes(q) ||
        (l.omschrijving || '').toLowerCase().includes(q) ||
        (l.locatie_adres || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'alle') result = result.filter((l) => l.status === filterStatus)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [leveringsbonnen, searchQuery, filterStatus, getKlantNaam, getProjectNaam])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteLeveringsbon(deleteTarget.id)
      setLeveringsbonnen((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success(`${deleteTarget.leveringsbon_nummer} verwijderd`)
    } catch {
      toast.error('Kon leveringsbon niet verwijderen')
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget])

  const handleExportCSV = useCallback(() => {
    const headers = ['Nummer', 'Klant', 'Project', 'Datum', 'Locatie', 'Status']
    const rows = gefilterd.map((l) =>
      [l.leveringsbon_nummer, getKlantNaam(l.klant_id), getProjectNaam(l.project_id), l.datum || '', l.locatie_adres || '', STATUS_CONFIG[l.status].label].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leveringsbonnen.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV gedownload')
  }, [gefilterd, getKlantNaam, getProjectNaam])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm text-muted-foreground">Leveringsbonnen laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <PackageCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Leveringsbonnen</h1>
            <p className="text-sm text-muted-foreground">{gefilterd.length} van {leveringsbonnen.length} leveringsbonnen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            onClick={() => navigate('/leveringsbonnen/nieuw')}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-lg shadow-teal-500/25 border-0"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Nieuwe leveringsbon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {FILTER_OPTIONS.filter((f) => f.value !== 'alle').map((opt) => {
          const cfg = STATUS_CONFIG[opt.value as Leveringsbon['status']]
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
          <Input placeholder="Zoek op nummer, klant, project, locatie..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
              <PackageCheck className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Geen leveringsbonnen gevonden</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/leveringsbonnen/nieuw')}>
                <Plus className="h-4 w-4 mr-2" /> Eerste leveringsbon aanmaken
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Nummer', 'Klant', 'Project', 'Datum', 'Locatie', 'Status', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gefilterd.map((lb) => {
                  const cfg = STATUS_CONFIG[lb.status]
                  return (
                    <tr key={lb.id} className={`group hover:bg-bg-subtle/60 transition-colors cursor-pointer border-l-2 ${getRowAccentClass(lb.status)}`} onClick={() => navigateWithTab({ path: `/leveringsbonnen/${lb.id}`, label: lb.leveringsbon_nummer || 'Leveringsbon', id: `/leveringsbonnen/${lb.id}` })}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-teal-600 dark:text-teal-400">{lb.leveringsbon_nummer}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{getKlantNaam(lb.klant_id)}</td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{getProjectNaam(lb.project_id)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground dark:text-muted-foreground">{lb.datum ? formatDate(lb.datum) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground dark:text-muted-foreground max-w-[200px] truncate">{lb.locatie_adres || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', cfg.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', cfg.dot)} />{cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/leveringsbonnen/${lb.id}`, label: lb.leveringsbon_nummer || 'Leveringsbon', id: `/leveringsbonnen/${lb.id}` }) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setDeleteTarget(lb); setDeleteDialogOpen(true) }}>
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
            <DialogTitle>Leveringsbon verwijderen?</DialogTitle>
            <DialogDescription>Weet u zeker dat u {deleteTarget?.leveringsbon_nummer} wilt verwijderen? Dit kan niet ongedaan worden.</DialogDescription>
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
