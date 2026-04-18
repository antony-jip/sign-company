import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Download, FileText, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { exportCSV, exportExcel } from '@/lib/export'
import {
  getInkoopfacturen,
  countWachtendOpReview,
  getInboxConfig,
  syncInkoopfacturen,
  extractInkoopfactuur,
} from '@/services/inkoopfactuurService'
import type { InkoopFactuurInboxConfig, InkoopFactuur, InkoopFactuurStatus } from '@/types'

const STATUS_CONFIG: Record<InkoopFactuurStatus, { label: string; bg: string; text: string; dot: boolean }> = {
  nieuw: { label: 'Nieuw', bg: '#FDE8E2', text: '#C03A18', dot: true },
  verwerkt: { label: 'Te reviewen', bg: '#FFF3E0', text: '#D4621A', dot: true },
  toegewezen: { label: 'Toegewezen', bg: '#E3F2FD', text: '#2A5580', dot: false },
  goedgekeurd: { label: 'Goedgekeurd', bg: '#E4F0EA', text: '#2D6B48', dot: false },
  afgewezen: { label: 'Afgewezen', bg: '#EEEEED', text: '#5A5A55', dot: false },
}

type FilterStatus = 'alle' | InkoopFactuurStatus

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'nieuw', label: 'Nieuw' },
  { value: 'verwerkt', label: 'Te reviewen' },
  { value: 'goedgekeurd', label: 'Goedgekeurd' },
  { value: 'afgewezen', label: 'Afgewezen' },
]

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDatum(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function InkoopfacturenLayout() {
  const navigate = useNavigate()
  const [facturen, setFacturen] = useState<InkoopFactuur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [wachtendCount, setWachtendCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxConfig, setInboxConfig] = useState<InkoopFactuurInboxConfig | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<{ factuur: InkoopFactuur; pdfUrl: string; index: number } | null>(null)
  const [lightboxReden, setLightboxReden] = useState('')
  const [lightboxSaving, setLightboxSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(null)

  async function refreshData() {
    const [data, count, config] = await Promise.all([
      getInkoopfacturen().catch(() => []),
      countWachtendOpReview().catch(() => 0),
      getInboxConfig().catch(() => null),
    ])
    setFacturen(data)
    setWachtendCount(count)
    setInboxConfig(config)
  }

  async function extractBatch(ids: string[]) {
    if (ids.length === 0) return
    setExtractProgress({ current: 0, total: ids.length })
    let gelukt = 0
    let laatsteFout = ''
    for (let i = 0; i < ids.length; i++) {
      setExtractProgress({ current: i + 1, total: ids.length })
      try {
        const result = await extractInkoopfactuur(ids[i])
        if (result.success) gelukt++
        else laatsteFout = result.error || 'Onbekende fout'
      } catch (err) {
        laatsteFout = err instanceof Error ? err.message : 'Netwerk fout'
      }
    }
    setExtractProgress(null)
    if (gelukt > 0) toast.success(`${gelukt} factuur${gelukt > 1 ? 'en' : ''} geextraheerd`)
    else if (laatsteFout) toast.error(`Extractie mislukt: ${laatsteFout}`)
    await refreshData()
  }

  async function handleSync() {
    try {
      setIsSyncing(true)
      const result = await syncInkoopfacturen()
      if (!result.success) {
        toast.error(result.error || 'Synchronisatie mislukt')
        return
      }

      if (result.verwerkt > 0) {
        toast.success(`${result.verwerkt} factuur${result.verwerkt > 1 ? 'en' : ''} opgehaald`)
        await refreshData()
        // Auto-extract de nieuwe facturen
        await extractBatch(result.nieuwe_ids || [])
      } else {
        toast.success('Geen nieuwe facturen gevonden')
        // Nog niet-geextraheerde facturen? Die ook oppakken
        const nieuweIds = facturen.filter(f => f.status === 'nieuw').map(f => f.id)
        if (nieuweIds.length > 0) {
          await extractBatch(nieuweIds)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Synchronisatie mislukt')
    } finally {
      setIsSyncing(false)
    }
  }

  const nieuwCount = useMemo(() => facturen.filter(f => f.status === 'nieuw').length, [facturen])

  const maandStats = useMemo(() => {
    const nu = new Date()
    const dezeMaand = facturen.filter(f => {
      const d = new Date(f.factuur_datum || f.created_at)
      return d.getMonth() === nu.getMonth() && d.getFullYear() === nu.getFullYear()
    })
    return {
      totaalDezeMaand: dezeMaand.reduce((sum, f) => sum + f.totaal, 0),
      aantalDezeMaand: dezeMaand.length,
    }
  }, [facturen])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(f => f.id)))
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds).filter(id => {
      const f = facturen.find(fac => fac.id === id)
      return f && (f.status === 'nieuw' || f.status === 'verwerkt' || f.status === 'toegewezen')
    })
    if (ids.length === 0) { toast.error('Geen goedkeurbare facturen geselecteerd'); return }
    const { approveInkoopfactuur } = await import('@/services/inkoopfactuurService')
    const { supabase } = await import('@/services/supabaseClient')
    const userId = (await supabase?.auth.getUser())?.data?.user?.id
    if (!userId) { toast.error('Niet ingelogd'); return }
    let gelukt = 0
    for (const id of ids) {
      try {
        await approveInkoopfactuur(id, userId)
        gelukt++
      } catch { /* doorgaan */ }
    }
    toast.success(`${gelukt} factuur${gelukt > 1 ? 'en' : ''} goedgekeurd`)
    setSelectedIds(new Set())
    await refreshData()
  }

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [data, count, config] = await Promise.all([
          getInkoopfacturen().catch(() => []),
          countWachtendOpReview().catch(() => 0),
          getInboxConfig().catch(() => null),
        ])
        if (!cancelled) {
          setFacturen(data)
          setWachtendCount(count)
          setInboxConfig(config)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: facturen.length }
    for (const f of facturen) {
      counts[f.status] = (counts[f.status] || 0) + 1
    }
    return counts
  }, [facturen])

  const filtered = useMemo(() => {
    let result = [...facturen]
    if (filterStatus !== 'alle') {
      result = result.filter(f => f.status === filterStatus)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f =>
        f.leverancier_naam.toLowerCase().includes(q) ||
        (f.factuur_nummer || '').toLowerCase().includes(q) ||
        (f.email_van || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [facturen, filterStatus, searchQuery])

  async function openLightbox(factuur: InkoopFactuur, index?: number) {
    try {
      const mod = await import('@/services/supabaseClient')
      const sb = mod.supabase || mod.default
      if (!sb) { toast.error('Supabase niet beschikbaar'); return }
      if (!factuur.pdf_storage_path) { toast.error('Geen PDF beschikbaar'); return }
      const { data, error } = await sb.storage.from('inkoopfacturen').createSignedUrl(factuur.pdf_storage_path, 3600)
      if (error || !data?.signedUrl) { toast.error('PDF URL ophalen mislukt'); return }
      setLightbox({ factuur, pdfUrl: data.signedUrl, index: index ?? filtered.findIndex(f => f.id === factuur.id) })
      setLightboxReden('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fout bij openen PDF')
    }
  }

  function navigateLightbox(direction: 'prev' | 'next') {
    if (!lightbox) return
    const newIndex = direction === 'next' ? lightbox.index + 1 : lightbox.index - 1
    if (newIndex < 0 || newIndex >= filtered.length) return
    openLightbox(filtered[newIndex], newIndex)
  }

  async function goToNextOrClose() {
    if (!lightbox) return
    await refreshData()
    const nextIndex = lightbox.index
    if (nextIndex < filtered.length) {
      openLightbox(filtered[nextIndex], nextIndex)
    } else if (nextIndex - 1 >= 0 && nextIndex - 1 < filtered.length) {
      openLightbox(filtered[nextIndex - 1], nextIndex - 1)
    } else {
      setLightbox(null)
    }
  }

  async function handleLightboxApprove() {
    if (!lightbox) return
    setLightboxSaving(true)
    try {
      const { approveInkoopfactuur } = await import('@/services/inkoopfactuurService')
      const mod = await import('@/services/supabaseClient')
      const sb = mod.supabase || mod.default
      const userId = (await sb?.auth.getUser())?.data?.user?.id
      if (!userId) { toast.error('Niet ingelogd'); return }
      await approveInkoopfactuur(lightbox.factuur.id, userId)
      toast.success('Goedgekeurd')
      await goToNextOrClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Goedkeuren mislukt')
    } finally {
      setLightboxSaving(false)
    }
  }

  async function handleLightboxReject() {
    if (!lightbox || !lightboxReden.trim()) { toast.error('Vul een reden in'); return }
    setLightboxSaving(true)
    try {
      const { rejectInkoopfactuur } = await import('@/services/inkoopfactuurService')
      await rejectInkoopfactuur(lightbox.factuur.id, lightboxReden)
      toast.success('Afgewezen')
      await goToNextOrClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Afwijzen mislukt')
    } finally {
      setLightboxSaving(false)
    }
  }

  const handleExportCSV = useCallback(() => {
    const headers = ['Datum', 'Leverancier', 'Nummer', 'Subtotaal', 'BTW', 'Totaal', 'Status']
    const rows = filtered.map(f => ({
      Datum: f.factuur_datum || '',
      Leverancier: f.leverancier_naam || f.email_van || '',
      Nummer: f.factuur_nummer || '',
      Subtotaal: f.subtotaal,
      BTW: f.btw_bedrag,
      Totaal: f.totaal,
      Status: STATUS_CONFIG[f.status].label,
    }))
    exportCSV('inkoopfacturen', headers, rows)
    toast.success('CSV gedownload')
  }, [filtered])

  const handleExportExcel = useCallback(() => {
    const headers = ['Datum', 'Leverancier', 'Nummer', 'Subtotaal', 'BTW', 'Totaal', 'Status']
    const rows = filtered.map(f => ({
      Datum: f.factuur_datum || '',
      Leverancier: f.leverancier_naam || f.email_van || '',
      Nummer: f.factuur_nummer || '',
      Subtotaal: f.subtotaal,
      BTW: f.btw_bedrag,
      Totaal: f.totaal,
      Status: STATUS_CONFIG[f.status].label,
    }))
    exportExcel('inkoopfacturen', headers, rows, 'Inkoopfacturen')
    toast.success('Excel gedownload')
  }, [filtered])

  const statistics = useMemo(() => {
    const nieuwCount = facturen.filter(f => f.status === 'nieuw' || f.status === 'verwerkt').length
    const totaalOpen = facturen
      .filter(f => !['goedgekeurd', 'afgewezen'].includes(f.status))
      .reduce((sum, f) => sum + f.totaal, 0)
    const goedgekeurdCount = facturen.filter(f => f.status === 'goedgekeurd').length
    return { nieuwCount, totaalOpen, goedgekeurdCount }
  }, [facturen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C44830]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Stats ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
              Inkoopfacturen<span className="text-[#F15025]">.</span>
            </h1>
            <span className="text-[13px] text-[#9B9B95] font-mono tabular-nums">
              <span className="font-medium text-[#6B6B66]">{filtered.length}</span>
              <span className="text-[#C0BDB8]">/</span>{facturen.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {inboxConfig && (
              <button
                onClick={handleSync}
                disabled={isSyncing || !!extractProgress}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-white px-3.5 py-2 rounded-xl ring-1 ring-black/[0.06] transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', (isSyncing || !!extractProgress) && 'animate-spin')} />
                {isSyncing ? 'Ophalen...' : extractProgress ? `Extraheren ${extractProgress.current}/${extractProgress.total}...` : 'Synchroniseer'}
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-2 flex-wrap">
          {wachtendCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#FDE8E2] text-[#C03A18]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] doen-pulse" />
              <span className="font-mono">{wachtendCount}</span> wachten op review
            </span>
          )}
          {statistics.totaalOpen > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#FEF3E8] text-[#D4621A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4621A]" />
              <span className="font-mono">{formatCurrency(statistics.totaalOpen)}</span> open
            </span>
          )}
          {statistics.goedgekeurdCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#E8F2EC] text-[#2D6B48]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48]" />
              <span className="font-mono">{statistics.goedgekeurdCount}</span> goedgekeurd
            </span>
          )}
          {maandStats.totaalDezeMaand > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold bg-[#F5F2E8] text-[#8A7A4A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A7A4A]" />
              <span className="font-mono">{formatCurrency(maandStats.totaalDezeMaand)}</span> deze maand ({maandStats.aantalDezeMaand})
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar card ── */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03]">
        <div className="flex items-center gap-5">
          <div className="relative max-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
            <input
              type="text"
              placeholder="Zoek op leverancier, nummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#F8F7F5] border border-[#EBEBEB] rounded-lg text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:border-[#C44830] focus:ring-2 focus:ring-[#C44830]/10 transition-all"
            />
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2D6B48] hover:bg-[#245A3B] px-3 py-2 rounded-lg transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {selectedIds.size} goedkeuren
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 ml-auto">
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-medium text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-[#F8F7F5] px-3 py-2 rounded-lg transition-all">
              <FileText className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F0EFEC]">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {FILTER_OPTIONS.map((option) => {
              const count = statusCounts[option.value] || 0
              const isActive = filterStatus === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    'relative text-[13px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all',
                    isActive
                      ? 'text-[#C44830] font-semibold bg-[#C44830]/[0.07]'
                      : 'text-[#9B9B95] hover:text-[#6B6B66]'
                  )}
                >
                  {option.label}
                  {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#C44830] rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#F0EFEC]">
                <th className="py-3.5 pl-5 pr-3 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left py-3.5 pr-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Datum</span>
                </th>
                <th className="text-left py-3.5 pr-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Leverancier</span>
                </th>
                <th className="text-left py-3.5 pr-4 hidden md:table-cell">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Nummer</span>
                </th>
                <th className="text-right py-3.5 pr-4 w-[110px]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Bedrag</span>
                </th>
                <th className="text-left py-3.5 pr-4 w-[150px]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      module="inkoopfacturen"
                      title="Nog geen inkoopfacturen"
                      description={
                        searchQuery || filterStatus !== 'alle'
                          ? 'Probeer een ander filter of zoekterm.'
                          : inboxConfig
                            ? 'Inbox is geconfigureerd. Facturen worden elke 15 minuten opgehaald.'
                            : 'Koppel je factuur@ inbox in Instellingen.'
                      }
                      action={
                        !searchQuery && filterStatus === 'alle' && !inboxConfig ? (
                          <button
                            onClick={() => navigate('/instellingen?tab=inkoopfactuur-inbox')}
                            className="text-[13px] font-medium text-[#C44830] hover:underline"
                          >
                            Inbox instellen
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((factuur, idx) => {
                  const config = STATUS_CONFIG[factuur.status]
                  return (
                    <tr
                      key={factuur.id}
                      onClick={() => openLightbox(factuur, idx)}
                      className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF8] cursor-pointer transition-colors doen-row"
                    >
                      <td className="py-3.5 pl-5 pr-3 w-10" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(factuur.id)}
                          onCheckedChange={() => toggleSelect(factuur.id)}
                        />
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] text-[#4A4A46]">
                          {formatDatum(factuur.factuur_datum || factuur.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] font-medium text-[#1A1A1A]">
                          {factuur.leverancier_naam || factuur.email_van || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 hidden md:table-cell">
                        <span className="text-[13px] font-mono text-[#4A4A46]">
                          {factuur.factuur_nummer || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="font-mono tabular-nums text-sm text-[#4A4A46]">
                          {formatCurrency(factuur.totaal)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: config.bg, color: config.text }}
                        >
                          {config.dot && <span className="w-1.5 h-1.5 rounded-full bg-current doen-pulse" />}
                          {config.label}<span className="text-[#F15025]">.</span>
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── PDF Lightbox 70/30 ── */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="bg-[#F8F7F5] rounded-2xl shadow-2xl w-full max-w-[1200px] h-[85vh] flex overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Links: PDF 70% */}
            <div className="w-[70%] bg-[#2A2A2A] flex flex-col">
              <iframe src={lightbox.pdfUrl} className="w-full flex-1" title="PDF" />
            </div>

            {/* Rechts: Details + Acties 30% */}
            <div className="w-[30%] flex flex-col bg-white">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-[#F0EFEC]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#1A1A1A]">
                      {lightbox.factuur.leverancier_naam || lightbox.factuur.email_van || 'Factuur'}<span className="text-[#F15025]">.</span>
                    </h3>
                    {lightbox.factuur.factuur_nummer && (
                      <p className="text-[12px] font-mono text-[#9B9B95] mt-0.5">#{lightbox.factuur.factuur_nummer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 -mr-1 -mt-1">
                    <button
                      onClick={() => navigateLightbox('prev')}
                      disabled={lightbox.index <= 0}
                      className="w-7 h-7 rounded-lg hover:bg-[#F0EFEC] flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4 text-[#9B9B95]" />
                    </button>
                    <span className="text-[11px] font-mono text-[#C0BDB8]">{lightbox.index + 1}/{filtered.length}</span>
                    <button
                      onClick={() => navigateLightbox('next')}
                      disabled={lightbox.index >= filtered.length - 1}
                      className="w-7 h-7 rounded-lg hover:bg-[#F0EFEC] flex items-center justify-center disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 text-[#9B9B95]" />
                    </button>
                    <button onClick={() => setLightbox(null)} className="w-7 h-7 rounded-lg hover:bg-[#F0EFEC] flex items-center justify-center ml-1">
                      <X className="w-4 h-4 text-[#9B9B95]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
                {/* Bedragen */}
                <div className="bg-[#F8F7F5] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#9B9B95]">Subtotaal</span>
                    <span className="font-mono text-[#4A4A46]">{formatCurrency(lightbox.factuur.subtotaal)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#9B9B95]">BTW</span>
                    <span className="font-mono text-[#4A4A46]">{formatCurrency(lightbox.factuur.btw_bedrag)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-semibold pt-2 border-t border-[#E6E4E0]">
                    <span className="text-[#1A1A1A]">Totaal</span>
                    <span className="font-mono text-[#1A1A1A]">{formatCurrency(lightbox.factuur.totaal)}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-2 text-[12px]">
                  {lightbox.factuur.factuur_datum && (
                    <div className="flex justify-between">
                      <span className="text-[#9B9B95]">Factuurdatum</span>
                      <span className="text-[#4A4A46]">{formatDatum(lightbox.factuur.factuur_datum)}</span>
                    </div>
                  )}
                  {lightbox.factuur.vervaldatum && (
                    <div className="flex justify-between">
                      <span className="text-[#9B9B95]">Vervaldatum</span>
                      <span className="text-[#4A4A46]">{formatDatum(lightbox.factuur.vervaldatum)}</span>
                    </div>
                  )}
                  {lightbox.factuur.email_van && (
                    <div className="flex justify-between">
                      <span className="text-[#9B9B95]">Van</span>
                      <span className="text-[#4A4A46]">{lightbox.factuur.email_van}</span>
                    </div>
                  )}
                </div>

                {lightbox.factuur.extractie_opmerkingen && (
                  <div className="text-[12px] p-3 rounded-lg bg-[#FFF8E1] text-[#8B6914] border border-[#FFE082]">
                    {lightbox.factuur.extractie_opmerkingen}
                  </div>
                )}

                {/* Status badge */}
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: STATUS_CONFIG[lightbox.factuur.status].bg, color: STATUS_CONFIG[lightbox.factuur.status].text }}
                  >
                    {STATUS_CONFIG[lightbox.factuur.status].dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    {STATUS_CONFIG[lightbox.factuur.status].label}<span className="text-[#F15025]">.</span>
                  </span>
                </div>

                {/* Notitie / afwijsreden */}
                {lightbox.factuur.status !== 'goedgekeurd' && lightbox.factuur.status !== 'afgewezen' && (
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] mb-1.5 block">Notitie</label>
                    <Textarea
                      placeholder="Typ een reden bij afwijzing..."
                      value={lightboxReden}
                      onChange={e => setLightboxReden(e.target.value)}
                      rows={3}
                      className="text-[13px] bg-[#F8F7F5] border-[#EBEBEB] resize-none"
                    />
                  </div>
                )}

                {lightbox.factuur.status === 'afgewezen' && lightbox.factuur.afgewezen_reden && (
                  <div className="text-[12px] p-3 rounded-lg bg-[#EEEEED] text-[#5A5A55]">
                    Afgewezen: {lightbox.factuur.afgewezen_reden}
                  </div>
                )}
              </div>

              {/* Footer acties */}
              {lightbox.factuur.status !== 'goedgekeurd' && lightbox.factuur.status !== 'afgewezen' && (
                <div className="px-5 py-4 border-t border-[#F0EFEC] space-y-2">
                  <Button
                    onClick={handleLightboxApprove}
                    disabled={lightboxSaving}
                    className="w-full bg-[#2D6B48] hover:bg-[#245A3B] text-white h-10"
                  >
                    Goedkeuren
                  </Button>
                  {lightboxReden.trim() ? (
                    <Button
                      variant="outline"
                      onClick={handleLightboxReject}
                      disabled={lightboxSaving}
                      className="w-full text-[#C03A18] border-[#C03A18] hover:bg-[#FDE8E2] h-10"
                    >
                      Afwijzen
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => setLightbox(null)} className="w-full text-[#9B9B95] h-10">
                      Sluiten
                    </Button>
                  )}
                </div>
              )}
              {(lightbox.factuur.status === 'goedgekeurd' || lightbox.factuur.status === 'afgewezen') && (
                <div className="px-5 py-4 border-t border-[#F0EFEC]">
                  <Button variant="outline" onClick={() => setLightbox(null)} className="w-full h-10">Sluiten</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
