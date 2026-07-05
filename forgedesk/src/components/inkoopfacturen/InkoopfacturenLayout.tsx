import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Download, FileText, CheckCircle2, X, ChevronLeft, ChevronRight, Loader2, Check, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { avatarTint } from '@/utils/avatarTint'
import { EmptyState } from '@/components/ui/empty-state'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { exportCSV, exportExcel } from '@/lib/export'
import {
  getInkoopfacturen,
  countWachtendOpReview,
  getInboxConfig,
  syncInkoopfacturen,
  extractInkoopfactuur,
  getInkoopAIUsage,
  koppelInkoopfactuurAanProject,
} from '@/services/inkoopfactuurService'
import { getProjecten, getKlanten } from '@/services/supabaseService'
import { getCached, fetchQuery } from '@/lib/queryCache'
import { InkoopAILimietBanner } from '@/components/shared/InkoopAILimietBanner'
import type { InkoopFactuurInboxConfig, InkoopFactuur, InkoopFactuurStatus, Project, Klant } from '@/types'

const STATUS_CONFIG: Record<InkoopFactuurStatus, { label: string; bg: string; text: string; dot: boolean }> = {
  nieuw: { label: 'Nieuw', bg: '#FDE8E2', text: '#C03A18', dot: true },
  verwerkt: { label: 'Te reviewen', bg: '#FFF3E0', text: '#D4621A', dot: true },
  toegewezen: { label: 'Toegewezen', bg: '#E3F2FD', text: '#2A5580', dot: false },
  goedgekeurd: { label: 'Goedgekeurd', bg: '#E4F0EA', text: '#2D6B48', dot: false },
  afgewezen: { label: 'Afgewezen', bg: '#EEEEED', text: '#5A5A55', dot: false },
}

const INKOOP_STATUS_HEX: Record<string, string> = {
  nieuw: '#F15025',
  verwerkt: '#D4621A',
  toegewezen: '#3A5A9A',
  goedgekeurd: '#2D6B48',
  afgewezen: '#5A5A55',
}
function inkoopStatusHex(s: string): string {
  return INKOOP_STATUS_HEX[s] ?? '#5A5A55'
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
  const [facturen, setFacturen] = useState<InkoopFactuur[]>(() => getCached<InkoopFactuur[]>('inkoopfacturen') ?? [])
  const [isLoading, setIsLoading] = useState(() => getCached('inkoopfacturen') === undefined)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [wachtendCount, setWachtendCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [inboxConfig, setInboxConfig] = useState<InkoopFactuurInboxConfig | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<{ factuur: InkoopFactuur; pdfUrl: string } | null>(null)
  const [lightboxReden, setLightboxReden] = useState('')
  const [lightboxSaving, setLightboxSaving] = useState(false)
  const [lightboxAction, setLightboxAction] = useState<'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'>('idle')
  const [filterMaand, setFilterMaand] = useState<string>('alle')
  const [projecten, setProjecten] = useState<Project[]>(() => getCached<Project[]>('projecten') ?? [])
  const [klanten, setKlanten] = useState<Klant[]>(() => getCached<Klant[]>('klanten') ?? [])
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [projectQuery, setProjectQuery] = useState('')
  const [wisselAnim, setWisselAnim] = useState(false)

  useEffect(() => {
    setLightboxAction('idle')
    setProjectPickerOpen(false)
    setProjectQuery('')
  }, [lightbox?.factuur.id])

  useEffect(() => {
    fetchQuery('projecten', getProjecten).then(setProjecten).catch(() => {})
    fetchQuery('klanten', getKlanten).then(setKlanten).catch(() => {})
  }, [])
  const [isSyncing, setIsSyncing] = useState(false)
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(null)

  async function refreshData(): Promise<InkoopFactuur[]> {
    const [data, count, config] = await Promise.all([
      fetchQuery('inkoopfacturen', getInkoopfacturen).catch(() => []),
      countWachtendOpReview().catch(() => 0),
      getInboxConfig().catch(() => null),
    ])
    setFacturen(data)
    setWachtendCount(count)
    setInboxConfig(config)
    return data
  }

  async function extractBatch(ids: string[]) {
    if (ids.length === 0) return

    let plannedIds = ids
    let truncatedByPreflight = false
    try {
      const usage = await getInkoopAIUsage()
      const remaining = usage.extract.remaining
      if (remaining <= 0) {
        toast.error('AI-limiet bereikt. Mail hello@doen.team om te verhogen.')
        return
      }
      if (remaining < ids.length) {
        plannedIds = ids.slice(0, remaining)
        truncatedByPreflight = true
      }
    } catch {
      // Pre-flight is een hint; bij netwerk/fetch-fout ga gewoon door
    }

    setExtractProgress({ current: 0, total: plannedIds.length })
    let gelukt = 0
    let laatsteFout = ''
    let capRaceHit = false
    for (let i = 0; i < plannedIds.length; i++) {
      setExtractProgress({ current: i + 1, total: plannedIds.length })
      try {
        const result = await extractInkoopfactuur(plannedIds[i])
        if (result.capHit) {
          capRaceHit = true
          break
        }
        if (result.success) gelukt++
        else laatsteFout = result.error || 'Onbekende fout'
      } catch (err) {
        laatsteFout = err instanceof Error ? err.message : 'Netwerk fout'
      }
    }
    setExtractProgress(null)

    const capReached = truncatedByPreflight || capRaceHit
    if (capReached) {
      const totaal = ids.length
      toast.error(`${gelukt} van ${totaal} verwerkt · AI-limiet bereikt. Mail hello@doen.team om te verhogen.`)
    } else if (gelukt > 0) {
      toast.success(`${gelukt} factuur${gelukt > 1 ? 'en' : ''} geextraheerd`)
    } else if (laatsteFout) {
      toast.error(`Extractie mislukt: ${laatsteFout}`)
    }
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

  const nieuwCount = facturen.filter(f => f.status === 'nieuw').length

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
        if (getCached('inkoopfacturen') === undefined) setIsLoading(true)
        const [data, count, config] = await Promise.all([
          fetchQuery('inkoopfacturen', getInkoopfacturen).catch(() => []),
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
    if (filterMaand !== 'alle') {
      result = result.filter(f => (f.factuur_datum || f.created_at || '').startsWith(filterMaand))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f =>
        f.leverancier_naam.toLowerCase().includes(q) ||
        (f.factuur_nummer || '').toLowerCase().includes(q) ||
        (f.email_van || '').toLowerCase().includes(q)
      )
    }
    // Open facturen eerst, daarna afgerond. Binnen elke groep: nieuwste eerst
    const afgerond = new Set(['goedgekeurd', 'afgewezen'])
    result.sort((a, b) => {
      const aAfgerond = afgerond.has(a.status) ? 1 : 0
      const bAfgerond = afgerond.has(b.status) ? 1 : 0
      if (aAfgerond !== bAfgerond) return aAfgerond - bAfgerond
      const dateA = new Date(a.factuur_datum || a.created_at).getTime()
      const dateB = new Date(b.factuur_datum || b.created_at).getTime()
      return dateB - dateA
    })
    return result
  }, [facturen, filterStatus, filterMaand, searchQuery])

  const beschikbareMaanden = useMemo(() => {
    const maanden = new Set<string>()
    for (const f of facturen) {
      const datum = f.factuur_datum || f.created_at
      if (datum) maanden.add(datum.slice(0, 7))
    }
    return Array.from(maanden).sort().reverse()
  }, [facturen])

  const klantNamen = useMemo(
    () => new Map(klanten.map(k => [k.id, k.bedrijfsnaam || k.contactpersoon || ''])),
    [klanten],
  )

  // Picker zoekt in bestaande projecten, op projectnaam, nummer én klantnaam.
  const projectResultaten = useMemo(() => {
    const q = projectQuery.trim().toLowerCase()
    const lijst = q
      ? projecten.filter(p =>
          (p.naam || '').toLowerCase().includes(q) ||
          (p.project_nummer || '').toLowerCase().includes(q) ||
          (klantNamen.get(p.klant_id) || '').toLowerCase().includes(q))
      : projecten
    return lijst.slice(0, 8)
  }, [projecten, klantNamen, projectQuery])

  async function openLightbox(factuur: InkoopFactuur) {
    try {
      const mod = await import('@/services/supabaseClient')
      const sb = mod.supabase || mod.default
      if (!sb) { toast.error('Supabase niet beschikbaar'); return }
      if (!factuur.pdf_storage_path) { toast.error('Geen PDF beschikbaar'); return }
      const { data, error } = await sb.storage.from('inkoopfacturen').createSignedUrl(factuur.pdf_storage_path, 3600)
      if (error || !data?.signedUrl) { toast.error('PDF URL ophalen mislukt'); return }
      setLightbox({ factuur, pdfUrl: data.signedUrl })
      setLightboxReden('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fout bij openen PDF')
    }
  }

  // Positie live afleiden i.p.v. opslaan: na goedkeuren/afwijzen
  // hersorteert de lijst en zou een opgeslagen index verlopen zijn.
  const lightboxIndex = lightbox ? filtered.findIndex(f => f.id === lightbox.factuur.id) : -1
  const gekoppeldProject = lightbox?.factuur.project_id
    ? projecten.find(p => p.id === lightbox.factuur.project_id)
    : undefined

  async function koppelProject(projectId: string | null) {
    if (!lightbox) return
    try {
      const updated = await koppelInkoopfactuurAanProject(lightbox.factuur.id, projectId)
      setLightbox(lb => (lb ? { ...lb, factuur: updated } : lb))
      setFacturen(prev => prev.map(f => (f.id === updated.id ? updated : f)))
      setProjectPickerOpen(false)
      setProjectQuery('')
      toast.success(projectId ? 'Gekoppeld aan project' : 'Projectkoppeling verwijderd')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Koppelen mislukt')
    }
  }

  function navigateLightbox(direction: 'prev' | 'next') {
    if (!lightbox) return
    const newIndex = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1
    if (newIndex < 0 || newIndex >= filtered.length) return
    openLightbox(filtered[newIndex])
  }

  // Na goedkeuren/afwijzen: door naar de volgende factuur die nog review
  // nodig heeft, in de lijstvolgorde zoals de gebruiker die zag (eerst
  // verder omlaag, dan wrap-around). Niets meer te reviewen → dicht.
  // De uit-animatie draait parallel aan de data-refresh; de keyed
  // remount van PDF en sidebar speelt daarna de in-animatie af.
  async function goToNextOrClose() {
    if (!lightbox) return
    const huidigeId = lightbox.factuur.id
    const volgorde = [...filtered.slice(lightboxIndex + 1), ...filtered.slice(0, Math.max(lightboxIndex, 0))]
    setWisselAnim(true)
    try {
      const [vers] = await Promise.all([
        refreshData(),
        new Promise(resolve => setTimeout(resolve, 220)),
      ])
      const versById = new Map(vers.map(f => [f.id, f]))
      const afgerond = new Set(['goedgekeurd', 'afgewezen'])
      const volgende = volgorde
        .map(f => versById.get(f.id))
        .find((f): f is InkoopFactuur => !!f && f.id !== huidigeId && !afgerond.has(f.status))
      if (volgende) await openLightbox(volgende)
      else setLightbox(null)
    } finally {
      setWisselAnim(false)
    }
  }

  async function handleLightboxApprove() {
    if (!lightbox) return
    setLightboxSaving(true)
    setLightboxAction('approving')
    try {
      const { approveInkoopfactuur } = await import('@/services/inkoopfactuurService')
      const mod = await import('@/services/supabaseClient')
      const sb = mod.supabase || mod.default
      const userId = (await sb?.auth.getUser())?.data?.user?.id
      if (!userId) { toast.error('Niet ingelogd'); setLightboxAction('idle'); return }
      await approveInkoopfactuur(lightbox.factuur.id, userId)
      setLightboxAction('approved')
      await new Promise(resolve => setTimeout(resolve, 700))
      await goToNextOrClose()
    } catch (err) {
      setLightboxAction('idle')
      toast.error(err instanceof Error ? err.message : 'Goedkeuren mislukt')
    } finally {
      setLightboxSaving(false)
    }
  }

  async function handleLightboxReject() {
    if (!lightbox || !lightboxReden.trim()) { toast.error('Vul een reden in'); return }
    setLightboxSaving(true)
    setLightboxAction('rejecting')
    try {
      const { rejectInkoopfactuur } = await import('@/services/inkoopfactuurService')
      await rejectInkoopfactuur(lightbox.factuur.id, lightboxReden)
      setLightboxAction('rejected')
      await new Promise(resolve => setTimeout(resolve, 700))
      await goToNextOrClose()
    } catch (err) {
      setLightboxAction('idle')
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
    toast.success(<>CSV gedownload<span style={{ color: '#F15025' }}>.</span></>)
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
    toast.success(<>Excel gedownload<span style={{ color: '#F15025' }}>.</span></>)
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
      <InkoopAILimietBanner variant="lokaal" route="extract" />
      {/* ── Header + KPI tiles ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
              Inkoopfacturen<span className="text-flame">.</span>
            </h1>
            <span className="text-[13px] text-muted-foreground font-mono tabular-nums">
              {filtered.length === facturen.length ? (
                <span className="font-medium text-foreground/70">{facturen.length}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground/70">{filtered.length}</span>
                  <span className="text-muted-foreground/70">/</span>{facturen.length}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {inboxConfig && (
              <button
                onClick={handleSync}
                disabled={isSyncing || !!extractProgress}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/70 hover:text-foreground hover:bg-white px-3.5 py-2 rounded-xl ring-1 ring-black/[0.06] transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', (isSyncing || !!extractProgress) && 'animate-spin')} />
                {isSyncing ? 'Ophalen...' : extractProgress ? `Extraheren ${extractProgress.current}/${extractProgress.total}...` : 'Synchroniseer'}
              </button>
            )}
          </div>
        </div>

        {/* KPI tiles · clickable triage entry-points */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { key: 'verwerkt' as FilterStatus,    label: 'Te reviewen',    sub: 'wacht op goedkeuring',   count: wachtendCount,                          isMoney: false, dot: '#F15025', pulse: true },
            { key: 'nieuw' as FilterStatus,       label: 'Open',           sub: 'totaal openstaand',      count: statistics.totaalOpen,                  isMoney: true,  dot: '#D4621A', pulse: false },
            { key: 'goedgekeurd' as FilterStatus, label: 'Goedgekeurd',    sub: 'verwerkt.',              count: statistics.goedgekeurdCount,            isMoney: false, dot: '#2D6B48', pulse: false },
            { key: 'alle' as FilterStatus,        label: 'Deze maand',     sub: `${maandStats.aantalDezeMaand} stuks`, count: maandStats.totaalDezeMaand, isMoney: true,  dot: '#8A7A4A', pulse: false },
          ]).map((tile) => {
            const isActive = filterStatus === tile.key && tile.key !== 'alle'
            const display = tile.isMoney ? formatCurrency(tile.count) : tile.count
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => {
                  if (tile.key === 'alle') return
                  setFilterStatus(isActive ? 'alle' : tile.key)
                }}
                className={cn(
                  'group doen-stat-tile relative rounded-xl px-5 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame/30 focus-visible:ring-offset-2',
                  isActive && 'doen-stat-tile-active',
                  tile.key === 'alle' && 'cursor-default'
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn('w-1.5 h-1.5 rounded-full', tile.pulse && 'doen-pulse')}
                      style={{ backgroundColor: tile.dot }}
                    />
                    <span className="font-heading text-[14px] font-bold text-foreground">
                      {tile.label}<span className="text-flame">.</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'font-heading font-bold leading-none text-foreground tabular-nums',
                    tile.isMoney ? 'text-[22px] font-mono' : 'text-[28px]'
                  )}>
                    {display}
                  </span>
                  <span
                    className="text-[13px] text-muted-foreground truncate"
                    style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                  >
                    · {tile.sub}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Toolbar card ── */}
      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="flex items-center gap-5">
          <div className="relative max-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Zoek op leverancier, nummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#C44830] focus:ring-2 focus:ring-[#C44830]/10 transition-all"
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
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background px-3 py-2 rounded-lg transition-all">
              <FileText className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
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
                      : 'text-muted-foreground hover:text-foreground/70'
                  )}
                >
                  {option.label}
                  {count > 0 && <span className="ml-1 font-mono text-[11px] opacity-50">{count}</span>}
                  {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#C44830] rounded-full" />}
                </button>
              )
            })}
          </div>

          {/* Maand-filter */}
          <select
            value={filterMaand}
            onChange={(e) => setFilterMaand(e.target.value)}
            className={cn(
              'text-[13px] font-medium bg-background border border-border rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-[#C44830] focus:ring-2 focus:ring-[#C44830]/10 transition-all',
              filterMaand !== 'alle' ? 'text-[#C44830] font-semibold' : 'text-muted-foreground',
            )}
          >
            <option value="alle">Alle maanden</option>
            {beschikbareMaanden.map((maand) => (
              <option key={maand} value={maand}>
                {new Date(`${maand}-01T00:00:00`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="doen-slate-surface rounded-2xl"
        style={{ clipPath: 'inset(0 round 16px)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'hsl(var(--card))', backdropFilter: 'blur(4px)' }}>
              <tr className="border-b border-border">
                <th className="py-3.5 pl-5 pr-3 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-[#1A4A52]/25 rounded-[5px] transition-colors data-[state=checked]:bg-flame data-[state=checked]:border-flame data-[state=checked]:text-white"
                  />
                </th>
                <th className="text-left py-3.5 pr-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1A4A52]/55 dark:text-muted-foreground">Datum</span>
                </th>
                <th className="text-left py-3.5 pr-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1A4A52]/55 dark:text-muted-foreground">Leverancier</span>
                </th>
                <th className="text-left py-3.5 pr-4 hidden md:table-cell">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1A4A52]/55 dark:text-muted-foreground">Nummer</span>
                </th>
                <th className="text-right py-3.5 pr-4 w-[110px]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1A4A52]/55 dark:text-muted-foreground">Bedrag</span>
                </th>
                <th className="text-left py-3.5 pr-4 w-[150px]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1A4A52]/55 dark:text-muted-foreground">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    {searchQuery || filterStatus !== 'alle' || filterMaand !== 'alle' ? (
                      <EmptyState
                        module="inkoopfacturen"
                        title="Geen resultaten"
                        description="Probeer een ander filter of zoekterm."
                      />
                    ) : (
                      <div className="py-16 px-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--status-flame-bg))] flex items-center justify-center mb-5">
                          <FileText className="w-7 h-7 text-[#C44830]" />
                        </div>
                        <h3 className="text-[16px] font-bold text-foreground mb-2">
                          {inboxConfig ? 'Inbox is gekoppeld' : 'Automatisch inkoopfacturen verwerken'}
                        </h3>
                        <p className="text-[13px] text-muted-foreground max-w-md mb-6">
                          {inboxConfig
                            ? 'Je inbox wordt elke 15 minuten gecheckt. Klik op Synchroniseer om nu te checken.'
                            : 'Koppel een Gmail inbox en ontvang automatisch inkoopfacturen. AI leest de PDF en extraheert alle gegevens · je hoeft alleen nog goed te keuren.'}
                        </p>
                        {!inboxConfig && (
                          <div className="bg-background rounded-xl border border-border p-5 max-w-sm w-full text-left space-y-3 mb-6">
                            <div className="flex gap-3 text-[13px]">
                              <span className="w-6 h-6 rounded-full bg-[#C44830] text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                              <span className="text-foreground/80">Maak een Gmail account aan voor je facturen (bijv. factuur@bedrijf.nl)</span>
                            </div>
                            <div className="flex gap-3 text-[13px]">
                              <span className="w-6 h-6 rounded-full bg-[#C44830] text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                              <span className="text-foreground/80">Genereer een app-wachtwoord via Google Account instellingen</span>
                            </div>
                            <div className="flex gap-3 text-[13px]">
                              <span className="w-6 h-6 rounded-full bg-[#C44830] text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                              <span className="text-foreground/80">Koppel de inbox in Instellingen en druk op Synchroniseer</span>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => inboxConfig ? handleSync() : navigate('/instellingen?tab=inkoopfactuur-inbox')}
                          className="inline-flex items-center gap-2 bg-[#C44830] text-white pl-5 pr-6 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-[#A33A26] transition-all"
                        >
                          {inboxConfig ? (
                            <><RefreshCw className="w-4 h-4" /> Synchroniseer</>
                          ) : (
                            'Inbox instellen'
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((factuur, idx) => {
                  const config = STATUS_CONFIG[factuur.status]
                  const isDimmed = factuur.status === 'goedgekeurd' || factuur.status === 'afgewezen'
                  const stripeHex = inkoopStatusHex(factuur.status)
                  const attention = factuur.status === 'verwerkt' || factuur.status === 'nieuw'
                  return (
                    <tr
                      key={factuur.id}
                      onClick={() => openLightbox(factuur)}
                      style={{ animationDelay: `${idx * 25}ms`, ['--row-accent' as string]: stripeHex } as React.CSSProperties}
                      className={cn(
                        'border-b border-border last:border-0 hover:bg-[rgba(26,83,92,0.04)] dark:hover:bg-white/[0.03] cursor-pointer transition-colors doen-row group',
                        attention && !selectedIds.has(factuur.id) && 'bg-[rgba(241,80,37,0.025)]',
                        selectedIds.has(factuur.id) && 'bg-petrol/[0.05]',
                        isDimmed && 'opacity-45'
                      )}
                    >
                      <td
                        className="py-3.5 pl-5 pr-3 w-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.has(factuur.id)}
                          onCheckedChange={() => toggleSelect(factuur.id)}
                          className="border-[#1A4A52]/25 rounded-[5px] transition-colors group-hover:border-[#1A4A52]/45 data-[state=checked]:bg-flame data-[state=checked]:border-flame data-[state=checked]:text-white"
                        />
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] text-muted-foreground">
                          {formatDatum(factuur.factuur_datum || factuur.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {(() => {
                            const naam = factuur.leverancier_naam || factuur.email_van || '-'
                            const t = avatarTint(naam)
                            return (
                              <span
                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase select-none"
                                style={{ backgroundColor: t.bg, color: t.fg }}
                              >
                                {naam.charAt(0)}
                              </span>
                            )
                          })()}
                          <span className="text-[13px] font-medium text-[#1A4A52] dark:text-foreground truncate">
                            {factuur.leverancier_naam || factuur.email_van || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 hidden md:table-cell">
                        <span className="text-[13px] font-mono text-muted-foreground">
                          {factuur.factuur_nummer || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span className="font-mono tabular-nums text-sm text-muted-foreground">
                          {formatCurrency(factuur.totaal)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusBadge
                          status={factuur.status}
                          label={config.label}
                          color={factuur.status === 'verwerkt' || factuur.status === 'toegewezen' ? stripeHex : undefined}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── PDF Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/70 z-50 flex" onClick={() => setLightbox(null)}>

          {/* PDF + Sidebar als één blok */}
          <div className="flex w-full h-full" onClick={e => e.stopPropagation()}>

            {/* PDF area · A4 ratio, past in viewport */}
            <div className="flex-1 flex items-center justify-center bg-[#1A1A1A] p-6">
              <div
                key={lightbox.factuur.id}
                style={{ aspectRatio: '210 / 297', height: 'calc(100vh - 48px)', maxWidth: '100%' }}
                className={cn(
                  'bg-white rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden inkoop-wissel-in',
                  wisselAnim && 'inkoop-wissel-uit',
                )}
              >
                <iframe
                  src={`${lightbox.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full"
                  title="PDF"
                  style={{ border: 'none' }}
                />
              </div>
            </div>

            {/* Sidebar rechts · sluit aan op PDF hoogte */}
            <div className="w-[360px] bg-white flex flex-col border-l border-border">

            {/* Nav + Close */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <button onClick={() => navigateLightbox('prev')} disabled={lightboxIndex <= 0} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-20 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-foreground/70" />
                </button>
                <span className="text-[12px] font-mono text-muted-foreground min-w-[32px] text-center">{lightboxIndex >= 0 ? lightboxIndex + 1 : '–'}/{filtered.length}</span>
                <button onClick={() => navigateLightbox('next')} disabled={lightboxIndex < 0 || lightboxIndex >= filtered.length - 1} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-20 transition-colors">
                  <ChevronRight className="w-4 h-4 text-foreground/70" />
                </button>
              </div>
              <button onClick={() => setLightbox(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div
              key={lightbox.factuur.id}
              className={cn(
                'flex-1 overflow-y-auto px-6 py-5 space-y-5 inkoop-wissel-in',
                wisselAnim && 'inkoop-wissel-uit',
              )}
            >

              {/* Leverancier */}
              <div>
                <h3 className="text-[18px] font-bold text-foreground leading-tight">
                  {lightbox.factuur.leverancier_naam || lightbox.factuur.email_van || 'Factuur'}<span className="text-flame">.</span>
                </h3>
                {lightbox.factuur.factuur_nummer && (
                  <p className="text-[13px] font-mono text-muted-foreground mt-1">#{lightbox.factuur.factuur_nummer}</p>
                )}
              </div>

              {/* Bedragen card */}
              <div className="rounded-xl bg-background border border-border p-4">
                <div className="flex justify-between text-[13px] text-muted-foreground">
                  <span>Subtotaal</span>
                  <span className="font-mono text-foreground/80">{formatCurrency(lightbox.factuur.subtotaal)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-muted-foreground mt-1.5">
                  <span>BTW</span>
                  <span className="font-mono text-foreground/80">{formatCurrency(lightbox.factuur.btw_bedrag)}</span>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-[15px] font-semibold text-foreground">Totaal</span>
                  <span className="text-[17px] font-bold font-mono text-foreground">{formatCurrency(lightbox.factuur.totaal)}</span>
                </div>
              </div>

              {/* Meta details */}
              <div className="space-y-2.5">
                {lightbox.factuur.factuur_datum && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Factuurdatum</span>
                    <span className="text-foreground/80">{formatDatum(lightbox.factuur.factuur_datum)}</span>
                  </div>
                )}
                {lightbox.factuur.vervaldatum && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Vervaldatum</span>
                    <span className="text-foreground/80">{formatDatum(lightbox.factuur.vervaldatum)}</span>
                  </div>
                )}
                {lightbox.factuur.email_van && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Van</span>
                    <span className="text-foreground/80 truncate ml-4">{lightbox.factuur.email_van}</span>
                  </div>
                )}
              </div>

              {/* Project-koppeling */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Project</label>
                {projectPickerOpen ? (
                  <div className="rounded-xl border border-border bg-background overflow-hidden">
                    <div className="flex items-center gap-2 px-3 border-b border-border">
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        autoFocus
                        placeholder="Zoek op project of klant..."
                        value={projectQuery}
                        onChange={e => setProjectQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setProjectPickerOpen(false) }}
                        className="w-full h-9 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {projectResultaten.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground px-2.5 py-2">Geen projecten gevonden</p>
                      ) : (
                        projectResultaten.map(p => (
                          <button
                            key={p.id}
                            onClick={() => koppelProject(p.id)}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <span className="block text-[13px] font-medium text-foreground truncate">{p.naam}</span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {[p.project_nummer, klantNamen.get(p.klant_id)].filter(Boolean).join(' · ')}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => setProjectPickerOpen(false)}
                      className="w-full text-[12px] text-muted-foreground hover:text-foreground py-2 border-t border-border transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                ) : lightbox.factuur.project_id ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-background border border-border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{gekoppeldProject?.naam || 'Gekoppeld project'}</p>
                      {gekoppeldProject && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[gekoppeldProject.project_nummer, klantNamen.get(gekoppeldProject.klant_id)].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <button
                        onClick={() => { setProjectPickerOpen(true); setProjectQuery('') }}
                        title="Ander project kiezen"
                        className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => koppelProject(null)}
                        title="Koppeling verwijderen"
                        className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setProjectPickerOpen(true); setProjectQuery('') }}
                    className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Koppel aan project
                  </button>
                )}
              </div>

              {/* Status */}
              <span
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: STATUS_CONFIG[lightbox.factuur.status].bg, color: STATUS_CONFIG[lightbox.factuur.status].text }}
              >
                {STATUS_CONFIG[lightbox.factuur.status].dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                {STATUS_CONFIG[lightbox.factuur.status].label}<span className="text-flame">.</span>
              </span>

              {lightbox.factuur.extractie_opmerkingen && (
                <div className="text-[12px] p-3 rounded-xl bg-[hsl(var(--status-amber-bg))] text-[#8B6914] border border-[#FFE082]">
                  {lightbox.factuur.extractie_opmerkingen}
                </div>
              )}

              {/* Notitie */}
              {lightbox.factuur.status !== 'goedgekeurd' && lightbox.factuur.status !== 'afgewezen' && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Notitie</label>
                  <Textarea
                    placeholder="Reden voor afwijzing..."
                    value={lightboxReden}
                    onChange={e => setLightboxReden(e.target.value)}
                    rows={3}
                    className="text-[13px] bg-background border-border resize-none rounded-xl"
                  />
                </div>
              )}

              {lightbox.factuur.status === 'afgewezen' && lightbox.factuur.afgewezen_reden && (
                <div className="text-[12px] p-3 rounded-xl bg-[#F5F5F3] text-foreground/70">
                  Afgewezen: {lightbox.factuur.afgewezen_reden}
                </div>
              )}
            </div>

            {/* Footer */}
            {lightbox.factuur.status !== 'goedgekeurd' && lightbox.factuur.status !== 'afgewezen' ? (
              <div className="px-6 py-5 border-t border-border space-y-2.5">
                <Button
                  onClick={handleLightboxApprove}
                  disabled={lightboxSaving}
                  className={cn(
                    'w-full text-white h-11 text-[14px] font-semibold rounded-xl transition-colors duration-200 disabled:opacity-100',
                    lightboxAction === 'approved' ? 'bg-[#2D6B48]' : 'bg-[#2D6B48] hover:bg-[#245A3B]',
                  )}
                >
                  {lightboxAction === 'approving' ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Bezig met goedkeuren…
                    </span>
                  ) : lightboxAction === 'approved' ? (
                    <span className="inline-flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Goedgekeurd
                    </span>
                  ) : (
                    'Goedkeuren'
                  )}
                </Button>
                {lightboxReden.trim() ? (
                  <Button
                    variant="outline"
                    onClick={handleLightboxReject}
                    disabled={lightboxSaving}
                    className={cn(
                      'w-full text-[#C03A18] border-[#C03A18]/30 hover:bg-[hsl(var(--status-flame-bg))] h-11 text-[14px] rounded-xl transition-colors duration-200 disabled:opacity-100',
                      lightboxAction === 'rejected' && 'bg-[hsl(var(--status-flame-bg))]',
                    )}
                  >
                    {lightboxAction === 'rejecting' ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Bezig met afwijzen…
                      </span>
                    ) : lightboxAction === 'rejected' ? (
                      <span className="inline-flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Afgewezen
                      </span>
                    ) : (
                      'Afwijzen'
                    )}
                  </Button>
                ) : (
                  <button onClick={() => setLightbox(null)} className="w-full text-[13px] text-muted-foreground hover:text-foreground/70 py-2 transition-colors">
                    Sluiten
                  </button>
                )}
              </div>
            ) : (
              <div className="px-6 py-5 border-t border-border">
                <button onClick={() => setLightbox(null)} className="w-full text-[13px] text-muted-foreground hover:text-foreground/70 py-2 transition-colors">
                  Sluiten
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
