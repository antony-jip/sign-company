import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
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
  verwerkt: { label: 'Verwerkt', bg: '#FFF3E0', text: '#D4621A', dot: true },
  toegewezen: { label: 'Toegewezen', bg: '#E3F2FD', text: '#2A5580', dot: false },
  goedgekeurd: { label: 'Goedgekeurd', bg: '#E4F0EA', text: '#2D6B48', dot: false },
  afgewezen: { label: 'Afgewezen', bg: '#EEEEED', text: '#5A5A55', dot: false },
}

type FilterStatus = 'alle' | InkoopFactuurStatus

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'nieuw', label: 'Nieuw' },
  { value: 'verwerkt', label: 'Verwerkt' },
  { value: 'toegewezen', label: 'Toegewezen' },
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
  const [isSyncing, setIsSyncing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  async function handleSync() {
    try {
      setIsSyncing(true)
      const result = await syncInkoopfacturen()
      if (result.success) {
        toast.success(result.verwerkt > 0 ? `${result.verwerkt} factuur${result.verwerkt > 1 ? 'en' : ''} opgehaald` : 'Geen nieuwe facturen gevonden')
        const [data, count] = await Promise.all([
          getInkoopfacturen().catch(() => []),
          countWachtendOpReview().catch(() => 0),
        ])
        setFacturen(data)
        setWachtendCount(count)
      } else {
        toast.error(result.error || 'Synchronisatie mislukt')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Synchronisatie mislukt')
    } finally {
      setIsSyncing(false)
    }
  }

  const nieuwCount = useMemo(() => facturen.filter(f => f.status === 'nieuw').length, [facturen])

  async function handleExtractAll() {
    const nieuweFacturen = facturen.filter(f => f.status === 'nieuw')
    if (nieuweFacturen.length === 0) return
    try {
      setIsExtracting(true)
      let gelukt = 0
      let laatsteFout = ''
      for (const f of nieuweFacturen) {
        try {
          const result = await extractInkoopfactuur(f.id)
          if (result.success) {
            gelukt++
          } else {
            laatsteFout = result.error || 'Onbekende fout'
          }
        } catch (err) {
          laatsteFout = err instanceof Error ? err.message : 'Netwerk fout'
        }
      }
      if (gelukt > 0) {
        toast.success(`${gelukt} van ${nieuweFacturen.length} facturen geextraheerd`)
      } else {
        toast.error(`Extractie mislukt: ${laatsteFout}`)
      }
      const [data, count] = await Promise.all([
        getInkoopfacturen().catch(() => []),
        countWachtendOpReview().catch(() => 0),
      ])
      setFacturen(data)
      setWachtendCount(count)
    } finally {
      setIsExtracting(false)
    }
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
            {nieuwCount > 0 && (
              <button
                onClick={handleExtractAll}
                disabled={isExtracting}
                className="inline-flex items-center gap-2 bg-[#C44830] text-white pl-4 pr-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-[0_2px_8px_rgba(196,72,48,0.25)] hover:bg-[#A33A26] disabled:opacity-50 transition-all"
              >
                <Sparkles className={cn('w-4 h-4', isExtracting && 'animate-spin')} />
                {isExtracting ? 'Extraheren...' : `Extraheer ${nieuwCount} facturen`}
              </button>
            )}
            {inboxConfig && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-white px-3.5 py-2 rounded-xl ring-1 ring-black/[0.06] transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Synchroniseren...' : 'Synchroniseer'}
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
                <th className="text-left py-3.5 pl-5 pr-4">
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
                <th className="text-left py-3.5 pr-4 hidden lg:table-cell">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95]">Toegewezen</span>
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
                filtered.map((factuur) => {
                  const config = STATUS_CONFIG[factuur.status]
                  return (
                    <tr
                      key={factuur.id}
                      onClick={() => navigate(`/inkoopfacturen/${factuur.id}`)}
                      className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF8] cursor-pointer transition-colors doen-row"
                    >
                      <td className="py-3.5 pl-5 pr-4">
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
                      <td className="py-3.5 pr-4 hidden lg:table-cell">
                        {factuur.toegewezen_aan_id ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E6E4E0] text-[11px] font-semibold text-[#5A5A55]">
                            ?
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#C0BDB8]">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
