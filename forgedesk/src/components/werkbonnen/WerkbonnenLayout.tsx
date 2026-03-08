import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import {
  Plus, Search, ClipboardCheck, Trash2, Eye, FileText,
  ArrowUpDown, Filter, Download, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { Werkbon, Klant, Project } from '@/types'
import {
  getWerkbonnen, deleteWerkbon, getKlanten, getProjecten, getWerkbonRegels,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'

type FilterStatus = 'alle' | 'concept' | 'ingediend' | 'goedgekeurd' | 'gefactureerd'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: 'text-stone-600 dark:text-stone-400', bg: 'bg-stone-100/80 dark:bg-stone-800/50' },
  ingediend: { label: 'Ingediend', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50/80 dark:bg-sky-900/30' },
  goedgekeurd: { label: 'Goedgekeurd', color: 'text-accent dark:text-wm-light', bg: 'bg-wm-pale/25 dark:bg-accent/20' },
  gefactureerd: { label: 'Gefactureerd', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50/80 dark:bg-violet-900/25' },
}

export function WerkbonnenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const { user } = useAuth()
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [bedragen, setBedragen] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Werkbon | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [wbs, kl, pr] = await Promise.all([
          getWerkbonnen(),
          getKlanten(),
          getProjecten(),
        ])
        if (cancelled) return
        setWerkbonnen(wbs)
        setKlanten(kl)
        setProjecten(pr)

        // Bereken bedragen per werkbon
        const bedragenMap: Record<string, number> = {}
        for (const wb of wbs) {
          try {
            const regels = await getWerkbonRegels(wb.id)
            if (cancelled) return
            bedragenMap[wb.id] = round2(regels.reduce((sum, r) => sum + r.totaal, 0))
          } catch {
            bedragenMap[wb.id] = 0
          }
        }
        setBedragen(bedragenMap)
      } catch (err) {
        if (!cancelled) toast.error('Fout bij laden werkbonnen')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getKlantNaam = useCallback((klantId: string) => {
    return klanten.find((k) => k.id === klantId)?.bedrijfsnaam || '-'
  }, [klanten])

  const getProjectNaam = useCallback((projectId: string) => {
    return projecten.find((p) => p.id === projectId)?.naam || '-'
  }, [projecten])

  const gefilterd = useMemo(() => {
    let result = [...werkbonnen]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((wb) =>
        wb.werkbon_nummer.toLowerCase().includes(q) ||
        getKlantNaam(wb.klant_id).toLowerCase().includes(q) ||
        getProjectNaam(wb.project_id).toLowerCase().includes(q) ||
        (wb.omschrijving || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'alle') {
      result = result.filter((wb) => wb.status === filterStatus)
    }
    result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return result
  }, [werkbonnen, searchQuery, filterStatus, getKlantNaam, getProjectNaam])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: werkbonnen.length }
    for (const wb of werkbonnen) {
      counts[wb.status] = (counts[wb.status] || 0) + 1
    }
    return counts
  }, [werkbonnen])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteWerkbon(deleteTarget.id)
      setWerkbonnen((prev) => prev.filter((wb) => wb.id !== deleteTarget.id))
      toast.success('Werkbon verwijderd')
    } catch {
      toast.error('Fout bij verwijderen werkbon')
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const handleExportCSV = useCallback(() => {
    const header = 'Nummer,Klant,Project,Datum,Status,Bedrag\n'
    const rows = gefilterd.map((wb) =>
      `${wb.werkbon_nummer},"${getKlantNaam(wb.klant_id)}","${getProjectNaam(wb.project_id)}",${wb.datum},${wb.status},${bedragen[wb.id] || 0}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `werkbonnen-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }, [gefilterd, getKlantNaam, getProjectNaam, bedragen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="truncate">Werkbonnen</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Beheer werkbonnen voor montage en service werkzaamheden
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="hidden sm:flex">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={() => navigate('/werkbonnen/nieuw')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nieuwe werkbon</span>
            <span className="sm:hidden">Nieuw</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['concept', 'ingediend', 'goedgekeurd', 'gefactureerd'] as const).map((status) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(status === filterStatus ? 'alle' : status)}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">{cfg.label}</p>
                <p className="text-2xl font-bold mt-1">{statusCounts[status] || 0}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op nummer, klant, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 flex-wrap overflow-x-auto scrollbar-hide">
          {(['alle', 'concept', 'ingediend', 'goedgekeurd', 'gefactureerd'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'alle' ? 'Alle' : STATUS_CONFIG[status].label}
              {statusCounts[status] !== undefined && ` (${statusCounts[status] || 0})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {gefilterd.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
              <ClipboardCheck className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-lg font-medium text-foreground">Geen werkbonnen</p>
            <p className="text-sm text-muted-foreground mt-1">Registreer uren en materialen per montage of productie-opdracht</p>
            <Button className="mt-4" onClick={() => navigate('/werkbonnen/nieuw')}>
              <Plus className="h-4 w-4 mr-1" /> Nieuwe werkbon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/80 dark:bg-card/80 backdrop-blur-sm overflow-hidden -mx-3 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Nummer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Klant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Bedrag</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gefilterd.map((wb) => {
                  const cfg = STATUS_CONFIG[wb.status] || STATUS_CONFIG.concept
                  return (
                    <tr key={wb.id} className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}>
                      <td className="px-4 py-3 font-mono text-sm font-medium">{wb.werkbon_nummer}</td>
                      <td className="px-4 py-3 text-sm">{getKlantNaam(wb.klant_id)}</td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{getProjectNaam(wb.project_id)}</td>
                      <td className="px-4 py-3 text-sm hidden sm:table-cell">{new Date(wb.datum).toLocaleDateString('nl-NL')}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium hidden sm:table-cell">
                        {formatCurrency(bedragen[wb.id] || 0)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => { setDeleteTarget(wb); setDeleteDialogOpen(true) }}>
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

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Werkbon verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je werkbon {deleteTarget?.werkbon_nummer} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
