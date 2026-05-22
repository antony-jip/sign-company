import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MapPin, ReceiptText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getWerkbonnen,
  getKlanten,
  getProjecten,
  getOffertes,
} from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Werkbon, Klant, Project, Offerte } from '@/types'

type StatusFilter = 'alle' | Werkbon['status']

const STATUS_CONFIG: Record<Werkbon['status'], { label: string; text: string; bg: string; dot: string }> = {
  concept: { label: 'Open', text: '#5A5A55', bg: '#EEEEED', dot: '#9B9B95' },
  definitief: { label: 'In uitvoering', text: '#C03A18', bg: '#FDE8E2', dot: '#F15025' },
  afgerond: { label: 'Afgetekend', text: '#1A535C', bg: '#E2F0F0', dot: '#2A8A8A' },
  gefactureerd: { label: 'Gefactureerd', text: '#3A5A9A', bg: '#E8EEF9', dot: '#4A7AC7' },
}

const FILTER_PILLS: { value: StatusFilter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'concept', label: 'Open' },
  { value: 'definitief', label: 'In uitvoering' },
  { value: 'afgerond', label: 'Afgetekend' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
]

function formatDateNL(s: string | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function buildMapsUrl(adres?: string, postcode?: string, stad?: string): string | null {
  const parts = [adres, postcode, stad].filter(Boolean)
  if (parts.length === 0) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(' '))}`
}

export function WerkbonnenLayoutMobile() {
  const navigate = useNavigate()
  const [werkbonnen, setWerkbonnen] = useState<Werkbon[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('alle')

  useEffect(() => {
    Promise.all([getWerkbonnen(), getKlanten(), getProjecten(), getOffertes()])
      .then(([w, k, p, o]) => { setWerkbonnen(w); setKlanten(k); setProjecten(p); setOffertes(o) })
      .catch((err) => {
        logger.error('WerkbonnenLayoutMobile load failed', err)
        toast.error('Kon werkbonnen niet laden')
      })
      .finally(() => setLoading(false))
  }, [])

  const klantById = useMemo(() => new Map(klanten.map((k) => [k.id, k])), [klanten])
  const projectById = useMemo(() => new Map(projecten.map((p) => [p.id, p])), [projecten])
  const offerteById = useMemo(() => new Map(offertes.map((o) => [o.id, o])), [offertes])

  const counts = useMemo(() => {
    const c: Record<string, number> = { alle: werkbonnen.length, concept: 0, definitief: 0, afgerond: 0, gefactureerd: 0 }
    for (const w of werkbonnen) c[w.status] = (c[w.status] ?? 0) + 1
    return c
  }, [werkbonnen])

  const filteredWerkbonnen = useMemo(() => {
    const lc = search.trim().toLowerCase()
    return werkbonnen
      .filter((w) => filter === 'alle' || w.status === filter)
      .filter((w) => {
        if (!lc) return true
        const klant = klantById.get(w.klant_id)
        const project = w.project_id ? projectById.get(w.project_id) : null
        const offerte = w.offerte_id ? offerteById.get(w.offerte_id) : null
        return (
          (w.werkbon_nummer ?? '').toLowerCase().includes(lc)
          || (w.titel ?? '').toLowerCase().includes(lc)
          || (klant?.bedrijfsnaam ?? '').toLowerCase().includes(lc)
          || (klant?.contactpersoon ?? '').toLowerCase().includes(lc)
          || (project?.naam ?? '').toLowerCase().includes(lc)
          || (offerte?.offerte_nummer ?? '').toLowerCase().includes(lc)
        )
      })
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
  }, [werkbonnen, filter, search, klantById, projectById, offerteById])

  return (
    <div className="h-full flex flex-col bg-background -m-3 sm:-m-4 md:-m-6">
      <header className="px-5 pt-5 pb-4 bg-white border-b border-border">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] leading-tight text-foreground">
          Werkbonnen<span className="text-[#F15025]">.</span>
        </h1>
        {!loading && (
          <p className="mt-1 text-[14px] text-foreground/70 tabular-nums">
            <span className="font-medium text-foreground">{filteredWerkbonnen.length}</span>
            <span className="text-muted-foreground"> / {werkbonnen.length}</span>
          </p>
        )}
      </header>

      <div className="px-4 pt-3 pb-2 bg-white border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op nummer, klant, project..."
            className="w-full h-10 pl-9 pr-9 rounded-lg bg-background border border-border focus:border-[#1A535C] focus:bg-white focus:ring-2 focus:ring-[#1A535C]/10 outline-none text-[14px] text-foreground placeholder:text-muted-foreground transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Wis zoekterm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto -mx-4 px-4 pb-1">
          {FILTER_PILLS.map((p) => {
            const isActive = filter === p.value
            const cnt = counts[p.value] ?? 0
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setFilter(p.value)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                  isActive
                    ? 'bg-[#1A535C] text-white'
                    : 'bg-muted text-foreground/70 active:bg-muted',
                )}
              >
                {p.label}
                <span className={cn('tabular-nums', isActive ? 'text-white/70' : 'text-muted-foreground')}>{cnt}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredWerkbonnen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white border border-border flex items-center justify-center mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <ReceiptText className="h-9 w-9 text-muted-foreground/80" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-foreground/70">
              {search.trim() || filter !== 'alle' ? 'Geen werkbonnen gevonden' : 'Geen werkbonnen'}
              <span className="text-[#F15025]">.</span>
            </p>
            {(search.trim() || filter !== 'alle') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilter('alle') }}
                className="mt-3 text-[13px] font-medium text-[#1A535C] hover:text-[#0F3C44] transition-colors"
              >
                Filters wissen
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#EBEBEB] bg-white">
            {filteredWerkbonnen.map((wb) => {
              const cfg = STATUS_CONFIG[wb.status] ?? STATUS_CONFIG.concept
              const klant = klantById.get(wb.klant_id)
              const klantNaam = klant?.bedrijfsnaam || klant?.contactpersoon || '—'
              const project = wb.project_id ? projectById.get(wb.project_id) : null
              const offerte = wb.offerte_id ? offerteById.get(wb.offerte_id) : null
              const ref = offerte?.offerte_nummer || project?.naam
              const mapsHref = buildMapsUrl(wb.locatie_adres, wb.locatie_postcode, wb.locatie_stad)
              const locationLabel = [wb.locatie_adres, wb.locatie_stad].filter(Boolean).join(', ')
              const subtitle = wb.titel ? klantNaam : ref || ''
              const datum = formatDateNL(wb.datum)

              return (
                <li key={wb.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/werkbonnen/${wb.id}`)}
                    className="w-full text-left px-5 py-3.5 active:bg-background transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[12px] font-mono font-semibold text-foreground/70 tabular-nums">
                        {wb.werkbon_nummer || 'concept'}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold flex-shrink-0"
                        style={{ color: cfg.text, backgroundColor: cfg.bg }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-medium text-foreground leading-snug truncate">
                      {wb.titel || klantNaam}
                    </h3>
                    {(subtitle || datum) && (
                      <p className="mt-0.5 text-[13px] text-foreground/70 truncate">
                        {subtitle}
                        {subtitle && datum && <span className="text-muted-foreground/70"> · </span>}
                        {datum && <span className="tabular-nums">{datum}</span>}
                      </p>
                    )}
                    {locationLabel && mapsHref && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-[#1A535C] max-w-full">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="truncate hover:underline"
                        >
                          {locationLabel}
                        </a>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {createPortal(
        <button
          type="button"
          onClick={() => navigate('/werkbonnen/nieuw')}
          className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 h-10 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white bg-[#F15025]/85 hover:bg-[#F15025] backdrop-blur-md shadow-[0_-2px_8px_rgba(0,0,0,0.08)] transition-colors duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
          Nieuwe werkbon
        </button>,
        document.body,
      )}
    </div>
  )
}
