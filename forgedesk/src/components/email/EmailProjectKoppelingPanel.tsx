import { useEffect, useMemo, useRef, useState } from 'react'
import { Briefcase, Loader2, Search, X, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '@/types'
import {
  getProjectVoorThread,
  koppelEmailAanProject,
  ontkoppelEmailVanProject,
  getProjectSuggestiesVoorEmail,
  getProjectById,
  zoekProjecten,
} from '@/services/emailProjectService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  // Read-mode: thread_id is bekend, koppeling wordt direct gepersisteerd
  threadId?: string | null
  senderEmail?: string
  // Compose-mode: thread_id bestaat pas na verzenden; parent controlt het
  // geselecteerde project en schrijft de koppeling zelf zodra het bericht
  // verstuurd is. Voor de panel: gewoon ge-controlled.
  composeMode?: boolean
  selectedProjectId?: string | null
  onSelectProject?: (project: Project | null) => void
}

export function EmailProjectKoppelingPanel({
  threadId,
  senderEmail,
  composeMode = false,
  selectedProjectId,
  onSelectProject,
}: Props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [linkedProject, setLinkedProject] = useState<Project | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Project[]>([])
  const [searchResults, setSearchResults] = useState<Project[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  // Read-mode: huidige koppeling ophalen
  useEffect(() => {
    if (composeMode || !threadId) {
      setLinkedProject(null)
      return
    }
    let cancelled = false
    setLoading(true)
    getProjectVoorThread(threadId)
      .then((res) => { if (!cancelled) setLinkedProject(res?.project || null) })
      .catch(() => { if (!cancelled) setLinkedProject(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [threadId, composeMode])

  // Compose-mode: project-selectie wordt door parent gestuurd
  useEffect(() => {
    if (!composeMode) return
    if (!selectedProjectId) {
      setLinkedProject(null)
      return
    }
    // Haal projectdetails op via gerichte SELECT zodat nieuwe of zelden
    // gebruikte projecten ook resolven (vroeger: zoekProjecten('').find()
    // miste ze als ze niet in top-12 actief zaten).
    let cancelled = false
    getProjectById(selectedProjectId).then((p) => {
      if (cancelled) return
      setLinkedProject(p)
    })
    return () => { cancelled = true }
  }, [composeMode, selectedProjectId])

  // Suggesties op afzender (alleen relevant zodra picker open is)
  useEffect(() => {
    if (!pickerOpen || !senderEmail) return
    let cancelled = false
    getProjectSuggestiesVoorEmail(senderEmail)
      .then((res) => { if (!cancelled) setSuggestions(res) })
      .catch(() => { /* stil */ })
    return () => { cancelled = true }
  }, [pickerOpen, senderEmail])

  // Vrije zoekopdracht (debounced 200ms)
  useEffect(() => {
    if (!pickerOpen) return
    const handle = setTimeout(() => {
      setSearching(true)
      zoekProjecten(query)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 200)
    return () => clearTimeout(handle)
  }, [pickerOpen, query])

  // Klik-buiten sluit picker
  useEffect(() => {
    if (!pickerOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [pickerOpen])

  const handleSelect = async (project: Project) => {
    if (composeMode) {
      onSelectProject?.(project)
      setLinkedProject(project)
      setPickerOpen(false)
      return
    }
    if (!threadId) return
    setSaving(true)
    try {
      await koppelEmailAanProject(threadId, project.id)
      setLinkedProject(project)
      setPickerOpen(false)
      toast.success('Gekoppeld aan project')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Koppelen mislukt')
    } finally {
      setSaving(false)
    }
  }

  const handleOntkoppel = async () => {
    if (composeMode) {
      onSelectProject?.(null)
      setLinkedProject(null)
      return
    }
    if (!threadId) return
    setSaving(true)
    try {
      await ontkoppelEmailVanProject(threadId)
      setLinkedProject(null)
      toast.success('Ontkoppeld')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ontkoppelen mislukt')
    } finally {
      setSaving(false)
    }
  }

  const renderProjectRow = (p: Project) => {
    const active = linkedProject?.id === p.id
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => handleSelect(p)}
        disabled={saving}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 rounded-md text-left disabled:opacity-50 transition-colors duration-150',
          active ? 'bg-[#1A535C]/[0.06]' : 'hover:bg-muted',
        )}
      >
        <Briefcase className={cn('h-3.5 w-3.5 flex-shrink-0', active ? 'text-[#1A535C]' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-foreground truncate">{p.naam}</div>
          {p.project_nummer && (
            <div className="text-[10px] text-muted-foreground font-mono">{p.project_nummer}</div>
          )}
        </div>
        {active && <Check className="h-3.5 w-3.5 text-[#1A535C] flex-shrink-0" />}
      </button>
    )
  }

  // Lijst gesplitst in twee groepen zodat de UI per groep een header toont
  // ("Voorgesteld op basis van afzender" + "Alle actieve projecten").
  const { suggestieItems, restItems } = useMemo(() => {
    if (query.trim().length > 0) {
      return { suggestieItems: [] as Project[], restItems: searchResults }
    }
    const seen = new Set<string>(suggestions.map((p) => p.id))
    const rest = searchResults.filter((p) => !seen.has(p.id))
    return { suggestieItems: suggestions, restItems: rest }
  }, [query, suggestions, searchResults])

  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Project</span>
        {(linkedProject || pickerOpen) && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-[#1A535C] transition-colors duration-150"
          >
            {pickerOpen ? 'Sluiten' : 'Wijzigen'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Laden.
        </div>
      ) : linkedProject ? (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A535C]/[0.08] flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-4 w-4 text-[#1A535C]" />
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/projecten/${linkedProject.id}`)}
              className="text-[13px] font-medium text-foreground hover:text-[#1A535C] truncate text-left transition-colors duration-150 block w-full"
              title={linkedProject.naam}
            >
              {linkedProject.naam}
            </button>
            {linkedProject.project_nummer && (
              <p className="text-[11px] text-muted-foreground font-mono">{linkedProject.project_nummer}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleOntkoppel}
            disabled={saving}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-[#C0451A] disabled:opacity-50 transition-colors duration-150"
            title="Ontkoppel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-[12px] text-[#1A535C] font-medium hover:border-[#1A535C]/30 hover:bg-[#1A535C]/[0.03] transition-colors duration-150"
        >
          <Briefcase className="h-3.5 w-3.5" />
          Koppel aan project
        </button>
      )}

      {pickerOpen && (
        <div ref={pickerRef} className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 h-8 px-2.5 bg-background rounded-md focus-within:ring-2 focus-within:ring-[#1A535C]/20 transition-shadow">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek project."
              className="flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-0.5 hover:bg-border rounded">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="mt-1 max-h-[260px] overflow-y-auto -mx-1">
            {searching && suggestieItems.length === 0 && restItems.length === 0 ? (
              <div className="flex items-center gap-2 px-2 py-3 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Zoeken.
              </div>
            ) : suggestieItems.length === 0 && restItems.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-muted-foreground">Geen projecten gevonden.</p>
            ) : (
              <>
                {suggestieItems.length > 0 && (
                  <>
                    <p className="px-2 pt-1 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                      Voorgesteld op basis van afzender
                    </p>
                    {suggestieItems.map((p) => renderProjectRow(p))}
                  </>
                )}
                {restItems.length > 0 && (
                  <>
                    <p className={cn(
                      'px-2 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.08em]',
                      suggestieItems.length > 0 ? 'pt-3 mt-1 border-t border-border' : 'pt-1',
                    )}>
                      {query.trim().length > 0 ? 'Zoekresultaten' : 'Andere actieve projecten'}
                    </p>
                    {restItems.map((p) => renderProjectRow(p))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
