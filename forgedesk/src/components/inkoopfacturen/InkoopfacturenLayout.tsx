import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getInkoopfacturen,
  countWachtendOpReview,
} from '@/services/inkoopfactuurService'
import type { InkoopFactuur, InkoopFactuurStatus } from '@/types'

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

export function InkoopfacturenLayout() {
  const navigate = useNavigate()
  const [facturen, setFacturen] = useState<InkoopFactuur[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [wachtendCount, setWachtendCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [toewijzingFilter, setToewijzingFilter] = useState<'alle' | 'niet-toegewezen'>('alle')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const [data, count] = await Promise.all([
          getInkoopfacturen().catch(() => []),
          countWachtendOpReview().catch(() => 0),
        ])
        if (!cancelled) {
          setFacturen(data)
          setWachtendCount(count)
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

    if (toewijzingFilter === 'niet-toegewezen') {
      result = result.filter(f => !f.toegewezen_aan_id)
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
  }, [facturen, filterStatus, searchQuery, toewijzingFilter])

  function formatBedrag(n: number): string {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
  }

  function formatDatum(d: string | null): string {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C44830]" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-[-0.3px]">
            inkoopfacturen<span className="text-[#F15025]">.</span>
          </h1>
          {wachtendCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#FDE8E2', color: '#C03A18' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current doen-pulse" />
              {wachtendCount} wachten op review
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1 -mx-1 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((option) => {
            const isActive = filterStatus === option.value
            const count = statusCounts[option.value] || 0
            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={cn(
                  'relative px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'text-[#1A535C] font-semibold'
                    : 'text-[#9B9B95] hover:text-[#6B6B66]'
                )}
              >
                {option.label}
                {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setToewijzingFilter(toewijzingFilter === 'alle' ? 'niet-toegewezen' : 'alle')}
            className={cn(
              'px-3 py-1 rounded-full text-[12px] font-medium border transition-colors',
              toewijzingFilter === 'niet-toegewezen'
                ? 'border-[#C44830] text-[#C44830] bg-[#FDE8E2]'
                : 'border-[#E6E4E0] text-[#9B9B95] hover:border-[#C4C4BE]'
            )}
          >
            Niet toegewezen
          </button>
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#E6E4E0] text-[13px] w-48 focus:outline-none focus:ring-1 focus:ring-[#C44830]/30"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          module="inkoopfacturen"
          title="Nog geen inkoopfacturen"
          description={
            searchQuery || filterStatus !== 'alle'
              ? 'Probeer een ander filter of zoekterm.'
              : 'Koppel je factuur@ inbox in Instellingen.'
          }
          action={
            !searchQuery && filterStatus === 'alle' ? (
              <button
                onClick={() => navigate('/instellingen?tab=inkoopfactuur-inbox')}
                className="text-[13px] font-medium text-[#C44830] hover:underline"
              >
                Inbox instellen
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0EFEC]">
                <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3">Datum</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3">Leverancier</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3 hidden md:table-cell">Nummer</th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3">Totaal</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3 hidden lg:table-cell">Toegewezen</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#9B9B95] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((factuur) => {
                const config = STATUS_CONFIG[factuur.status]
                return (
                  <tr
                    key={factuur.id}
                    onClick={() => navigate(`/inkoopfacturen/${factuur.id}`)}
                    className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-[13px] text-[#4A4A46]">
                      {formatDatum(factuur.factuur_datum || factuur.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[#191919]">
                      {factuur.leverancier_naam || factuur.email_van || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#4A4A46] hidden md:table-cell font-mono">
                      {factuur.factuur_nummer || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-right font-mono text-[#191919]" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {formatBedrag(factuur.totaal)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#4A4A46] hidden lg:table-cell">
                      {factuur.toegewezen_aan_id ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E6E4E0] text-[11px] font-semibold text-[#5A5A55]">
                          ?
                        </span>
                      ) : (
                        <span className="text-[#9B9B95]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
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
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
