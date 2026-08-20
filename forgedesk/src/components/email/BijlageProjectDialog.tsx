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
import { kiesVoorgesteldProject } from '@/utils/bijlageVoorstel'

/**
 * Drie bestemmingen: de situatiefoto's, de bestanden, of de inkoopoffertes van
 * het project. Die laatste wordt alleen vastgelegd; de regels eruit lezen kost
 * AI-budget en gebeurt in het inkooppaneel bij het maken van een offerte.
 */
export type BijlageBestemming = 'foto' | 'bestand' | 'inkoop'

export interface BijlageKandidaat {
  filename: string
  contentType: string
  /** Thumbnail-URL als de reader er al een heeft; alleen voor beeldbijlagen. */
  previewUrl?: string
}

export interface BijlageMetBestemming extends BijlageKandidaat {
  bestemming: BijlageBestemming
}

export interface BijlageProjectKeuze {
  project: Project
  /** De bijlagen die aangevinkt bleven staan, elk met hun bestemming. */
  bestanden: BijlageMetBestemming[]
  /** Alleen gevuld als er een bijlage naar de inkoopoffertes gaat. */
  leverancier?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Eén bijlage of de hele lijst; bij meer dan één verschijnt de voorselectie. */
  bijlagen: BijlageKandidaat[]
  threadId?: string | null
  senderEmail?: string
  /** Weergavenaam van de afzender; vult de leverancier voor bij een inkoopofferte. */
  senderNaam?: string
  bezig?: boolean
  /** Voortgang tijdens het toevoegen, bijvoorbeeld "2 van 3". */
  voortgang?: string | null
  onBevestig: (keuze: BijlageProjectKeuze) => void
}

type VoorstelReden = 'thread' | 'klant' | null

/**
 * De leverancier is bij een inkoopofferte vrijwel altijd de afzender. Uit
 * "BMD Signs <verkoop@bmd.nl>" komt "BMD Signs"; zonder naam blijft het domein
 * over. Het veld blijft bewerkbaar, want een doorgestuurde offerte komt soms
 * van een collega.
 */
function leverancierUitAfzender(naam?: string, email?: string): string {
  const schoon = (naam || '').replace(/["']/g, '').trim()
  if (schoon && !schoon.includes('@')) return schoon
  const domein = (email || '').split('@')[1] || ''
  const kern = domein.split('.')[0]
  return kern ? kern.charAt(0).toUpperCase() + kern.slice(1) : ''
}

export function BijlageProjectDialog({
  open,
  onOpenChange,
  bijlagen,
  threadId,
  senderEmail,
  senderNaam,
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
  // Alles staat aangevinkt bij openen; afvinken is bedoeld als correctie op een
  // volledige selectie, niet als lijstje dat je zelf moet samenstellen.
  const [aangevinkt, setAangevinkt] = useState<Set<string>>(new Set())
  // De bestemming per bestand. Het bestandstype geeft alleen de eerste gok: een
  // foto van de gevel hoort bij de situatiefoto's, maar een JPG met kleurcodes
  // is een document. Dat verschil ziet alleen de gebruiker.
  const [bestemmingen, setBestemmingen] = useState<Record<string, BijlageBestemming>>({})
  const [leverancier, setLeverancier] = useState('')

  const meervoud = bijlagen.length > 1
  const eerste = bijlagen[0]
  const bestandsnaam = eerste?.filename ?? ''
  const contentType = eerste?.contentType ?? ''
  const selectie = useMemo(
    () => bijlagen.filter((b) => aangevinkt.has(b.filename)),
    [bijlagen, aangevinkt],
  )
  const heeftInkoop = useMemo(
    () => selectie.some((b) => bestemmingen[b.filename] === 'inkoop'),
    [selectie, bestemmingen],
  )

  // Het bestandstype bepaalt alleen de beginstand van de foto/bestand-keuze.
  const isAfbeeldingBestand = useCallback((b: BijlageKandidaat) => {
    const extensie = b.filename.split('.').pop()?.toLowerCase() || ''
    return (b.contentType || '').toLowerCase().startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extensie)
  }, [])

  // Inkoop alleen aanbieden waar het uitlezen later ook kan: PDF of afbeelding.
  // Een DWG of zip als inkoopofferte vastleggen levert straks een lege offerte op.
  const kanInkoop = useCallback((b: BijlageKandidaat) => {
    const extensie = b.filename.split('.').pop()?.toLowerCase() || ''
    return isAfbeeldingBestand(b) ||
      (b.contentType || '').toLowerCase().includes('pdf') ||
      extensie === 'pdf'
  }, [isAfbeeldingBestand])


  // Voorstel opbouwen zodra de dialog opengaat: eerst de thread-koppeling,
  // anders de projecten van de klant achter de afzender.
  useEffect(() => {
    if (!open) return
    let afgebroken = false
    setLaden(true)
    setKiesZelf(false)
    setQuery('')
    setAangevinkt(new Set(bijlagen.map((b) => b.filename)))
    setBestemmingen(Object.fromEntries(
      bijlagen.map((b) => [b.filename, isAfbeeldingBestand(b) ? 'foto' : 'bestand'] as const),
    ))
    setLeverancier(leverancierUitAfzender(senderNaam, senderEmail))

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
  }, [open, threadId, senderEmail, senderNaam, bestandsnaam, contentType, bijlagen, isAfbeeldingBestand])

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
        <div className="text-[13px] font-medium text-foreground truncate">
          {p.naam}
          {p.klant_naam && (
            <span className="font-normal text-muted-foreground"> · {p.klant_naam}</span>
          )}
        </div>
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
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {gekozenProject.naam}
                    {/* Projectnamen als "Gevelreclame" komen vaker voor dan je
                        denkt; zonder klantnaam weet je niet of je bij de goede
                        zit. */}
                    {gekozenProject.klant_naam && (
                      <span className="font-normal text-muted-foreground"> · {gekozenProject.klant_naam}</span>
                    )}
                  </p>
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
                    placeholder="Zoek op project of klant"
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

          <div className="px-7 pb-4 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block">
              {meervoud ? 'Bijlagen' : 'Bijlage'}
            </label>
            <div className="rounded-lg border border-border divide-y divide-border/60 max-h-[240px] overflow-y-auto">
              {bijlagen.map((b) => {
                const aan = aangevinkt.has(b.filename)
                const bestemming = bestemmingen[b.filename] ?? 'bestand'
                return (
                  <div key={b.filename} className="flex items-center gap-2.5 px-3 py-2">
                    {/* De vinkjes staan alleen bij meerdere bijlagen: bij één
                        bijlage is wegvinken hetzelfde als annuleren. */}
                    {meervoud && (
                      <button
                        type="button"
                        onClick={() => setAangevinkt((prev) => {
                          const next = new Set(prev)
                          if (next.has(b.filename)) next.delete(b.filename)
                          else next.add(b.filename)
                          return next
                        })}
                        aria-pressed={aan}
                        title={aan ? 'Niet toevoegen' : 'Wel toevoegen'}
                        className={cn(
                          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                          aan ? 'border-petrol bg-petrol text-white' : 'border-border bg-background text-transparent hover:border-petrol/40',
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>
                    )}
                    {/* Zien wat je toevoegt scheelt het openen van de bijlage:
                        bij beeld een miniatuur, anders de extensie. */}
                    <span className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted',
                      !aan && 'opacity-40',
                    )}>
                      {b.previewUrl ? (
                        <img src={b.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground">
                          {b.filename.split('.').pop()?.slice(0, 4) || 'bestand'}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px]',
                        aan ? 'text-foreground' : 'text-muted-foreground line-through',
                      )}
                      title={b.filename}
                    >
                      {b.filename}
                    </span>
                    {/* Drie bestemmingen: situatiefoto's, bestanden, inkoopoffertes.
                        Het bestandstype kiest de eerste stand; een JPG met
                        kleurcodes is immers geen situatiefoto. Inkoop verschijnt
                        alleen bij PDF of afbeelding, want alleen die kan het
                        inkooppaneel later uitlezen. */}
                    <div className={cn('flex flex-shrink-0 rounded-md border border-border overflow-hidden', !aan && 'opacity-40')}>
                      {(kanInkoop(b)
                        ? [['foto', 'Foto'], ['bestand', 'Bestand'], ['inkoop', 'Inkoop']] as const
                        : [['foto', 'Foto'], ['bestand', 'Bestand']] as const
                      ).map(([waarde, label]) => (
                        <button
                          key={waarde}
                          type="button"
                          disabled={!aan}
                          onClick={() => setBestemmingen((prev) => ({ ...prev, [b.filename]: waarde }))}
                          className={cn(
                            'px-2 py-1 text-[11px] font-medium transition-colors',
                            bestemming === waarde
                              ? 'bg-petrol text-white'
                              : 'bg-background text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {heeftInkoop && (
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="bijlage-leverancier"
                  className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground block"
                >
                  Leverancier
                </label>
                <input
                  id="bijlage-leverancier"
                  type="text"
                  value={leverancier}
                  onChange={(e) => setLeverancier(e.target.value)}
                  placeholder="Naam leverancier"
                  className="w-full h-9 px-2.5 bg-background rounded-lg text-[13px] text-foreground outline-none focus:ring-2 focus:ring-petrol/20 transition-shadow placeholder:text-muted-foreground"
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Foto’s komen bij de situatiefoto’s van het project, bestanden bij de bestanden.
              {heeftInkoop && ' Een inkoopofferte wordt vastgelegd bij het project; de regels lees je uit in het inkooppaneel bij het maken van een offerte.'}
            </p>
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
            onClick={() => gekozenProject && selectie.length > 0 && onBevestig({
              project: gekozenProject,
              bestanden: selectie.map((b) => ({ ...b, bestemming: bestemmingen[b.filename] ?? 'bestand' })),
              ...(heeftInkoop ? { leverancier: leverancier.trim() } : {}),
            })}
            disabled={!gekozenProject || bezig || selectie.length === 0 || (heeftInkoop && !leverancier.trim())}
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
