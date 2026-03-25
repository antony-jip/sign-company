import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { toast } from 'sonner'
import {
  Plus, Search, ClipboardCheck, Trash2, Eye, FileText,
  Download, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
// ModuleHeader removed — using DOEN inline header
import { EmptyState } from '@/components/ui/empty-state'
import type { Werkbon, Klant, Project, Offerte } from '@/types'
import {
  getWerkbonnen, deleteWerkbon, getKlanten, getProjecten, getOffertes, getWerkbonItems,
} from '@/services/supabaseService'

type FilterStatus = 'alle' | 'concept' | 'definitief' | 'afgerond'

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  concept: { label: 'Open', text: '#5A5A55', bg: '#EEEEED' },
  definitief: { label: 'In uitvoering', text: '#C03A18', bg: '#FDE8E2' },
  afgerond: { label: 'Afgetekend', text: '#1A535C', bg: '#E2F0F0' },
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
  const deferredSearch = useDeferredValue(searchQuery)
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
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
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
  }, [werkbonnen, deferredSearch, filterStatus, getKlantNaam, getProjectNaam])

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
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      {/* Inline keyframes for pulse + stagger */}
      <style>{`
        @keyframes doen-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
        @keyframes doen-fade-up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .doen-pulse { animation: doen-pulse 2.5s ease-in-out infinite }
        .doen-row { animation: doen-fade-up .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-8 py-8 space-y-6">

      {/* ── Header + Stats ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
              Werkbonnen<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[13px] text-[#9B9B95] font-mono tabular-nums">
              <span className="font-medium text-[#6B6B66]">{gefilterd.length}</span>
              <span className="text-[#C0BDB8]">/</span>{werkbonnen.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/werkbonnen/nieuw')}
            className="inline-flex items-center gap-2 bg-[#F15025] text-white pl-4 pr-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25),0_0_0_1px_rgba(241,80,37,0.1)] hover:bg-[#E04520] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35),0_0_0_1px_rgba(241,80,37,0.15)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[#D03A18] transition-all duration-200"
          >
            <Plus className="w-4 h-4 opacity-80" />
            Nieuwe werkbon
          </button>
        </div>

        {/* Quick stats — compact inline badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {(statusCounts['concept'] || 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#EEEEED] text-[#5A5A55]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A55]" />
              <span className="font-mono">{statusCounts['concept']}</span> open
            </span>
          )}
          {(statusCounts['definitief'] || 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#FDE8E2] text-[#C03A18]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] doen-pulse" />
              <span className="font-mono">{statusCounts['definitief']}</span> in uitvoering
            </span>
          )}
          {(statusCounts['afgerond'] || 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8F2EC] text-[#2D6B48]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48]" />
              <span className="font-mono">{statusCounts['afgerond']}</span> afgetekend
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar card ── */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
        <div className="flex items-center gap-5">
          {/* Search with keyboard hint */}
          <div className="relative max-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
            <input
              type="text"
              placeholder="Zoek op nummer, klant, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 text-sm bg-[#F8F7F5] border border-[#EBEBEB] rounded-lg text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#1A535C] focus:ring-2 focus:ring-[#1A535C]/10 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#9B9B95] bg-[#F0EFEC] rounded border border-[#E5E4E0]">/</kbd>
          </div>

          {/* Export */}
          <div className="hidden sm:flex items-center gap-1 ml-auto">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F0EFEC]">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {(['alle', 'concept', 'definitief', 'afgerond'] as const).map((status) => {
              const labels: Record<string, string> = { alle: 'Alle', concept: 'Open', definitief: 'In uitvoering', afgerond: 'Afgetekend' }
              const count = statusCounts[status] || 0
              const isActive = filterStatus === status
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'text-[#1A535C] font-semibold bg-[#1A535C]/[0.07]'
                      : 'text-[#9B9B95] hover:text-[#6B6B66]'
                  )}
                >
                  {labels[status]}
                  {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#1A535C] rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {gefilterd.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 ring-1 ring-black/[0.03] text-center">
          <EmptyState
            module="werkbonnen"
            title="Nog geen werkbonnen"
            description="Maak een werkbon aan vanuit een offerte of handmatig."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b-2 border-[#F0EFEC]">
                  <th className="text-left py-3.5 pl-5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Nummer</span>
                  </th>
                  <th className="text-left py-3.5 pr-4 w-[160px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Klant</span>
                  </th>
                  <th className="text-left py-3.5 pr-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Offerte / Project</span>
                  </th>
                  <th className="text-right py-3.5 pr-4 w-[90px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Datum</span>
                  </th>
                  <th className="text-left py-3.5 pr-4 w-[150px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Status</span>
                  </th>
                  <th className="text-center py-3.5 pr-4 w-[70px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Items</span>
                  </th>
                  <th className="w-[80px] py-3.5 pr-4" />
                </tr>
              </thead>
              <tbody>
                {gefilterd.map((wb, i) => {
                  const cfg = STATUS_CONFIG[wb.status] || STATUS_CONFIG.concept
                  const offerteRef = getOfferteNummer(wb.offerte_id)
                  const projectRef = getProjectNaam(wb.project_id)
                  const ref = offerteRef !== '-' ? offerteRef : projectRef
                  return (
                    <tr
                      key={wb.id}
                      className={cn(
                        'doen-row border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-all duration-200 group',
                        'hover:bg-[#F8F7F4]',
                      )}
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}
                    >
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-[15px] font-semibold text-[#1A1A1A] group-hover:text-[#1A535C] transition-colors">{wb.werkbon_nummer}</span>
                          </div>
                          {wb.titel && <p className="text-[11px] text-[#C0BDB8] truncate max-w-[240px] mt-0.5">{wb.titel}</p>}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {(() => {
                            const naam = getKlantNaam(wb.klant_id)
                            const c = naam.charCodeAt(0) % 5
                            const avatarColors = [
                              'bg-[#E8F2EC] text-[#3A7D52]',
                              'bg-[#E8EEF9] text-[#3A5A9A]',
                              'bg-[#F5F2E8] text-[#8A7A4A]',
                              'bg-[#F0EFEC] text-[#6B6B66]',
                              'bg-[#EDE8F4] text-[#6A5A8A]',
                            ]
                            return (
                              <span className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none', avatarColors[c])}>
                                {naam.charAt(0)}
                              </span>
                            )
                          })()}
                          <span className="text-[13px] text-[#4A4A46] truncate block leading-tight">{getKlantNaam(wb.klant_id)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] text-[#6B6B66] truncate block">{ref}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="text-[12px] font-mono tabular-nums text-[#B0ADA8]">
                          {new Date(wb.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '')}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={{ backgroundColor: cfg.bg, color: cfg.text }}
                        >
                          {wb.status === 'definitief' && <span className="w-1.5 h-1.5 rounded-full bg-current doen-pulse" />}
                          {cfg.label}<span className="text-[#F15025]">.</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className="inline-flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums rounded-md px-2 py-0.5 bg-[#F8F7F5] text-[#6B6B66]">
                          {itemCounts[wb.id] || 0}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            className="p-1.5 rounded-lg hover:bg-[#F0EFEC] transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => navigateWithTab({ path: `/werkbonnen/${wb.id}`, label: wb.werkbon_nummer || 'Werkbon', id: `/werkbonnen/${wb.id}` })}
                          >
                            <Eye className="w-3.5 h-3.5 text-[#9B9B95]" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-[#FDE8E4] transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => { setDeleteTarget(wb); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#C03A18]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
