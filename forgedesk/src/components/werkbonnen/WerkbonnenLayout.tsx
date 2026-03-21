import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import {
  Plus, Search, ClipboardCheck, Trash2, Eye, FileText,
  Download, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { EmptyState } from '@/components/ui/empty-state'
import type { Werkbon, Klant, Project, Offerte } from '@/types'
import {
  getWerkbonnen, deleteWerkbon, getKlanten, getProjecten, getOffertes, getWerkbonItems,
} from '@/services/supabaseService'

type FilterStatus = 'alle' | 'concept' | 'definitief' | 'afgerond'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: 'text-[#5A5A55]', bg: 'bg-[#EEEEED]' },
  definitief: { label: 'Definitief', color: 'text-[#2A5580]', bg: 'bg-[#E5ECF6]' },
  afgerond: { label: 'Afgerond', color: 'text-[#1A535C]', bg: 'bg-[#E2F0F0]' },
}

export function WerkbonnenLayout() {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})
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
        const [wbs, kl, pr, off] = await Promise.all([
          getWerkbonnen(),
          getKlanten(),
          getProjecten(),
          getOffertes(),
        ])
        if (cancelled) return
        setWerkbonnen(wbs)
        setKlanten(kl)
        setProjecten(pr)
        setOffertes(off)

        // Tel items per werkbon
        const counts: Record<string, number> = {}
        for (const wb of wbs) {
          try {
            const items = await getWerkbonItems(wb.id)
            if (cancelled) return
            counts[wb.id] = items.length
          } catch {
            counts[wb.id] = 0
          }
        }
        setItemCounts(counts)
      } catch {
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

  const getProjectNaam = useCallback((projectId?: string) => {
    if (!projectId) return '-'
    return projecten.find((p) => p.id === projectId)?.naam || '-'
  }, [projecten])

  const getOfferteNummer = useCallback((offerteId?: string) => {
    if (!offerteId) return '-'
    return offertes.find((o) => o.id === offerteId)?.nummer || '-'
  }, [offertes])

  const gefilterd = useMemo(() => {
    let result = [...werkbonnen]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((wb) =>
        wb.werkbon_nummer.toLowerCase().includes(q) ||
        getKlantNaam(wb.klant_id).toLowerCase().includes(q) ||
        getProjectNaam(wb.project_id).toLowerCase().includes(q) ||
        (wb.titel || '').toLowerCase().includes(q)
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
    const header = 'Nummer,Klant,Project,Offerte,Datum,Status,Items\n'
    const rows = gefilterd.map((wb) =>
      `${wb.werkbon_nummer},"${getKlantNaam(wb.klant_id)}","${getProjectNaam(wb.project_id)}","${getOfferteNummer(wb.offerte_id)}",${wb.datum},${wb.status},${itemCounts[wb.id] || 0}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `werkbonnen-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV geëxporteerd')
  }, [gefilterd, getKlantNaam, getProjectNaam, getOfferteNummer, itemCounts])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-werkbonnen">
      <ModuleHeader
        module="werkbonnen"
        icon={ClipboardCheck}
        title="Werkbonnen"
        subtitle="Instructiebladen voor monteurs — afbeeldingen, afmetingen en notities"
        actions={
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
        }
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-6 p-5">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(['concept', 'definitief', 'afgerond'] as const).map((status) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <Card key={status} className="cursor-pointer hover-lift rounded-full"
              onClick={() => setFilterStatus(status === filterStatus ? 'alle' : status)}>
              <CardContent className="p-5">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-label">{cfg.label}</p>
                <p className="text-2xl font-bold mt-1"><span className="font-mono">{statusCounts[status] || 0}</span></p>
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
          {(['alle', 'concept', 'definitief', 'afgerond'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap rounded-full"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'alle' ? 'Alle' : STATUS_CONFIG[status].label}
              {statusCounts[status] !== undefined && <>{' ('}<span className="font-mono">{statusCounts[status] || 0}</span>{')'}</>}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {gefilterd.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            module="werkbonnen"
            title="Nog geen werkbonnen"
            description="Maak een werkbon aan vanuit een offerte of handmatig."
            action={
              <Button onClick={() => navigate('/werkbonnen/nieuw')} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Nieuwe werkbon
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="rounded-xl border border-black/[0.06] bg-card/80 dark:bg-card/80 backdrop-blur-sm overflow-hidden -mx-3 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '0.5px solid #E6E4E0', backgroundColor: '#F4F2EE' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Nummer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Klant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase text-[#A0A098] hidden md:table-cell" style={{ letterSpacing: '0.8px' }}>Offerte / Project</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase text-[#A0A098] hidden sm:table-cell" style={{ letterSpacing: '0.8px' }}>Datum</th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase text-[#A0A098]" style={{ letterSpacing: '0.8px' }}>Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase text-[#A0A098] hidden sm:table-cell" style={{ letterSpacing: '0.8px' }}>Items</th>
                  <th className="px-4 py-3 text-right text-[10px] font-medium uppercase text-[#A0A098] hidden md:table-cell" style={{ letterSpacing: '0.8px' }}>Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y row-stagger">
                {gefilterd.map((wb) => {
                  const cfg = STATUS_CONFIG[wb.status] || STATUS_CONFIG.concept
                  const offerteRef = getOfferteNummer(wb.offerte_id)
                  const projectRef = getProjectNaam(wb.project_id)
                  const ref = offerteRef !== '-' ? offerteRef : projectRef
                  return (
                    <tr key={wb.id} className="group border-l-[3px] border-l-[#F15025] cursor-pointer hover:bg-[#F4F2EE] transition-colors duration-150"
                      style={{ borderBottom: '0.5px solid #E6E4E0' }}
                      onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono text-sm font-medium">{wb.werkbon_nummer}</span>
                          {wb.titel && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{wb.titel}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{getKlantNaam(wb.klant_id)}</td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{ref}</td>
                      <td className="px-4 py-3 text-sm font-mono hidden sm:table-cell">{new Date(wb.datum).toLocaleDateString('nl-NL')}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-[10px] py-[3px] rounded-full text-[10px] font-semibold', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium hidden sm:table-cell">
                        <span className="font-mono">{itemCounts[wb.id] || 0}</span>
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
      </div>
    </div>
  )
}
