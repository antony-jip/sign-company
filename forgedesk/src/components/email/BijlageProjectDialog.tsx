import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Briefcase, Check, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import {
  getProjectVoorThread,
  getProjectSuggestiesVoorEmail,
  zoekProjecten,
} from '@/services/emailProjectService'
import {
  DOCUMENT_MAPPEN,
  MAP_BIJLAGEN,
  kiesVoorgesteldProject,
  stelMapVoor,
} from '@/utils/bijlageVoorstel'

export interface BijlageKandidaat {
  filename: string
  contentType: string
}

export interface BijlageProjectKeuze {
  project: Project
  map: string
  /** De bijlagen die aangevinkt bleven staan. */
  bestanden: BijlageKandidaat[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Eén bijlage of de hele lijst; bij meer dan één verschijnt de voorselectie. */
  bijlagen: BijlageKandidaat[]
  threadId?: string | null
  senderEmail?: string
  bezig?: boolean
  /** Voortgang tijdens het toevoegen, bijvoorbeeld "2 van 3". */
  voortgang?: string | null
  onBevestig: (keuze: BijlageProjectKeuze) => void
}

type VoorstelReden = 'thread' | 'klant' | null

const MAP_KEUZES = [...DOCUMENT_MAPPEN, MAP_BIJLAGEN]

export function BijlageProjectDialog({
  open,
  onOpenChange,
  bijlagen,
  threadId,
  senderEmail,
  bezig = false,
  voortgang = null,
  onBevestig,
}: Props) {
  const [laden, setLaden] = useState(false)
  const [gekozenProject, setGekozenProject] = useState<Project | null>(null)
  const [voorstelReden, setVoorstelReden] = useState<VoorstelReden>(null)
  const [klantProjecten, setKlantProjecten] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [zoekResultaten, setZoekResultaten] = useState<Project[]>([])
  const [zoekt, setZoekt] = useState(false)
  const [kiesZelf, setKiesZelf] = useState(false)
  const [map, setMap] = useState(MAP_BIJLAGEN)
  // Alles staat aangevinkt bij openen; afvinken is bedoeld als correctie op een
  // volledige selectie, niet als lijstje dat je zelf moet samenstellen.
  const [aangevinkt, setAangevinkt] = useState<Set<string>>(new Set())

  const meervoud = bijlagen.length > 1
  const eerste = bijlagen[0]
  const bestandsnaam = eerste?.filename ?? ''
  const contentType = eerste?.contentType ?? ''
  const selectie = useMemo(
    () => bijlagen.filter((b) => aangevinkt.has(b.filename)),
    [bijlagen, aangevinkt],
  )

  // Afbeeldingen landen bij de situatiefoto's van het project, niet in een
  // documentenmap; de map-keuze is daar dus niet van toepassing.
  const isAfbeeldingBestand = useCallback((b: BijlageKandidaat) => {
    const extensie = b.filename.split('.').pop()?.toLowerCase() || ''
    return (b.contentType || '').toLowerCase().startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extensie)
  }, [])

  // De mapkeuze geldt alleen voor de niet-afbeeldingen: foto's gaan altijd naar
  // de situatiefoto's van het project. Bij een gemengde selectie tonen we dus
  // zowel de mapkeuze als de uitleg over de foto's.
  const aantalAfbeeldingen = selectie.filter(isAfbeeldingBestand).length
  const alleenAfbeeldingen = selectie.length > 0 && aantalAfbeeldingen === selectie.length
  const bevatDocumenten = selectie.length > aantalAfbeeldingen

  // Voorstel opbouwen zodra de dialog opengaat: eerst de thread-koppeling,
  // anders de projecten van de klant achter de afzender.
  useEffect(() => {
    if (!open) return
    let afgebroken = false
    setLaden(true)
    setKiesZelf(false)
    setQuery('')
    setMap(stelMapVoor(bestandsnaam, contentType))
    setAangevinkt(new Set(bijlagen.map((b) => b.filename)))

    const bepaalVoorstel = async () => {
      if (threadId) {
        const koppeling = await getProjectVoorThread(threadId).catch(() => null)
        if (afgebroken) return
        if (koppeling) {
          setGekozenProject(koppeling.project)
          setVoorstelReden('thread')
          setKlantProjecten([])
          return
        }
      }
      const suggesties = senderEmail
        ? await getProjectSuggestiesVoorEmail(senderEmail).catch(() => [] as Project[])
        : []
      if (afgebroken) return
      setKlantProjecten(suggesties)
      const voorstel = kiesVoorgesteldProject(suggesties)
      setGekozenProject(voorstel)
      setVoorstelReden(voorstel ? 'klant' : null)
    }

    bepaalVoorstel().finally(() => {
      if (!afgebroken) setLaden(false)
    })
    return () => { afgebroken = true }
  }, [open, threadId, senderEmail, bestandsnaam, contentType, bijlagen])

  // Zoeken pas laden als er ook echt een lijst getoond wordt.
  const lijstZichtbaar = !laden && (kiesZelf || !gekozenProject)

  useEffect(() => {
    if (!open || !lijstZichtbaar) return
    let afgebroken = false
    const handle = setTimeout(() => {
      setZoekt(true)
      zoekProjecten(query)
        .then((res) => { if (!afgebroken) setZoekResultaten(res) })
        .catch(() => { if (!afgebroken) setZoekResultaten([]) })
        .finally(() => { if (!afgebroken) setZoekt(false) })
    }, 200)
    return () => { afgebroken = true; clearTimeout(handle) }
  }, [open, lijstZichtbaar, query])

  const { klantItems, overigeItems } = useMemo(() => {
    if (query.trim().length > 0) {
      return { klantItems: [] as Project[], overigeItems: zoekResultaten }
    }
    const gezien = new Set(klantProjecten.map((p) => p.id))
    return {
      klantItems: klantProjecten,
      overigeItems: zoekResultaten.filter((p) => !gezien.has(p.id)),
    }
  }, [query, klantProjecten, zoekResultaten])

  const handleKies = useCallback((project: Project) => {
    setGekozenProject(project)
    setVoorstelReden(null)
    setKiesZelf(false)
  }, [])

  const renderProjectRij = (p: Project) => (
    <button
      key={p.id}
      type="button"
      onClick={() => handleKies(p)}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150',
        gekozenProject?.id === p.id ? 'bg-petrol/[0.06]' : 'hover:bg-muted',
      )}
    >
      <Briefcase className={cn('h-3.5 w-3.5 flex-shrink-0', gekozenProject?.id === p.id ? 'text-petrol' : 'text-muted-foreground')} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground truncate">{p.naam}</div>
        {p.project_nummer && (
          <div className="text-[10px] text-muted-foreground font-mono">{p.project_nummer}</div>
        )}
      </div>
      {gekozenProject?.id === p.id && <Check className="h-3.5 w-3.5 text-petrol flex-shrink-0" />}
    </button>
  )

  const redenTekst = voorstelReden === 'thread'
    ? 'Deze mail hangt al aan dit project'
    : voorstelReden === 'klant'
      ? 'Enige lopende project van deze klant'
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="sr-only"><DialogTitle>Bijlage aan project toevoegen</DialogTitle></DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-7 pt-7 pb-1">
            <p className="text-[20px] font-bold text-foreground tracking-[-0.3px]">
              {meervoud ? 'Bijlagen toevoegen' : 'Bijlage toevoegen'}
            </p>
            {meervoud ? (
              <p className="text-[12px] text-muted-foreground mt-1">
                {selectie.length} van {bijlagen.length} geselecteerd
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground truncate mt-1" title={bestandsnaam}>{bestandsnaam}</p>
            )}
          </div>

          <div className="px-7 pt-5 pb-4 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block">Project</label>

            {laden ? (
              <div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Voorstel zoeken.
              </div>
            ) : gekozenProject && !kiesZelf ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-petrol/[0.08] flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-4 w-4 text-petrol" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{gekozenProject.naam}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {gekozenProject.project_nummer && (
                      <span className="font-mono">{gekozenProject.project_nummer}</span>
                    )}
                    {gekozenProject.project_nummer && redenTekst && <span> · </span>}
                    {redenTekst}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setKiesZelf(true)}
                  className="text-[12px] text-muted-foreground hover:text-petrol transition-colors duration-150 flex-shrink-0"
                >
                  Kies ander project
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 h-9 px-2.5 bg-background rounded-lg focus-within:ring-2 focus-within:ring-petrol/20 transition-shadow">
                  <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Zoek project."
                    className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="p-0.5 hover:bg-border rounded">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto -mx-1 pt-1">
                  {zoekt && klantItems.length === 0 && overigeItems.length === 0 ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-[13px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Zoeken.
                    </div>
                  ) : klantItems.length === 0 && overigeItems.length === 0 ? (
                    <p className="px-2 py-3 text-[13px] text-muted-foreground">Geen projecten gevonden.</p>
                  ) : (
                    <>
                      {klantItems.length > 0 && (
                        <>
                          <p className="px-2 pt-1 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                            Projecten van deze klant
                          </p>
                          {klantItems.map(renderProjectRij)}
                        </>
                      )}
                      {overigeItems.length > 0 && (
                        <>
                          <p className={cn(
                            'px-2 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.08em]',
                            klantItems.length > 0 ? 'pt-3 mt-1 border-t border-border' : 'pt-1',
                          )}>
                            {query.trim().length > 0 ? 'Zoekresultaten' : 'Andere projecten'}
                          </p>
                          {overigeItems.map(renderProjectRij)}
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {meervoud && (
            <div className="px-7 pb-4 space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block">
                Bijlagen
              </label>
              <div className="rounded-lg border border-border divide-y divide-border/60 max-h-[180px] overflow-y-auto">
                {bijlagen.map((b) => {
                  const aan = aangevinkt.has(b.filename)
                  return (
                    <button
                      key={b.filename}
                      type="button"
                      onClick={() => setAangevinkt((prev) => {
                        const next = new Set(prev)
                        if (next.has(b.filename)) next.delete(b.filename)
                        else next.add(b.filename)
                        return next
                      })}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors duration-150"
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                          aan ? 'border-petrol bg-petrol text-white' : 'border-border bg-background text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate text-[13px]', aan ? 'text-foreground' : 'text-muted-foreground line-through')}>
                        {b.filename}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="px-7 pb-6 space-y-2">
            {alleenAfbeeldingen ? (
              <p className="text-[12px] text-muted-foreground">
                {meervoud ? 'Deze foto\u2019s komen' : 'Komt'} bij de <span className="font-medium text-foreground">situatiefoto\u2019s</span> van het project.
              </p>
            ) : (
              <>
                <label htmlFor="bijlage-map" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block">Map</label>
                <select
                  id="bijlage-map"
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] border border-border bg-background rounded-lg outline-none focus:border-petrol focus:ring-1 focus:ring-petrol/20 transition-colors"
                >
                  {MAP_KEUZES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {aantalAfbeeldingen > 0 && (
                  <p className="text-[12px] text-muted-foreground">
                    De {aantalAfbeeldingen} foto{aantalAfbeeldingen > 1 ? '\u2019s' : ''} hierin {aantalAfbeeldingen > 1 ? 'gaan' : 'gaat'} naar de situatiefoto\u2019s en niet naar deze map.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="px-7 py-4 border-t border-border bg-background/60 flex items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={() => gekozenProject && selectie.length > 0 && onBevestig({ project: gekozenProject, map, bestanden: selectie })}
            disabled={!gekozenProject || bezig || selectie.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-semibold text-white bg-petrol hover:bg-[#0F3A40] shadow-sm disabled:opacity-50 transition-colors"
          >
            {bezig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {bezig && voortgang ? voortgang : 'Toevoegen'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
