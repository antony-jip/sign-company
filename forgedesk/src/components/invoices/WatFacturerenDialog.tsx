import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Loader2, Minus, Plus, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getOfferteItems, updateOfferte } from '@/services/offerteService'
import {
  getGefactureerdeAantallenVoorOfferte,
  getVoorschottenVoorOfferte,
  getConceptFacturenVoorKlant,
  voegRegelsToeAanConcept,
  updateFactuur,
  type NieuweFactuurRegel,
} from '@/services/factuurService'
import { getMeetellendeVarianten, nettoStuksprijs } from '@/utils/offerteTotalen'
import { schrijfFactuurPrefill, voerPrefillTevensUit, type FactuurPrefill, type PrefillTevens } from '@/components/invoices/factuurPrefill'
import { formatCurrency, cn } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '@/utils/logger'
import type { Offerte, OfferteItem, Project, Taak, Factuur } from '@/types'

type Voorschot = Awaited<ReturnType<typeof getVoorschottenVoorOfferte>>[number]

interface Keuze {
  aan: boolean
  aantal: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerte: Offerte
  project?: Project | null
  projectTaken?: Taak[]
  onProjectBijgewerkt?: (project: Project) => void
  onTakenAfgerond?: () => void
}

// Eén meetellende prijsoptie: aantal en prijs komen van die optie. Meerdere
// opties: de post blijft heel, het aantal is dan niet los te kiezen.
//
// De korting hoort hier bij de vorm en niet bij het item: staat er een
// prijsoptie onder, dan zit de korting op die optie en is oi.korting_percentage
// doorgaans 0. Dit venster rekende met die 0 en liet daardoor een te hoog
// bedrag zien; de factuur zelf klopte wel, want naarFactuurRegels() geeft de
// variant-korting gewoon door.
export function regelVorm(oi: OfferteItem): { aantal: number; eenheidsprijs: number; korting_percentage: number; vast: boolean } {
  const meetellend = getMeetellendeVarianten(oi.prijs_varianten, oi.actieve_variant_id)
  if (meetellend.length === 1) {
    return { aantal: meetellend[0].aantal, eenheidsprijs: meetellend[0].eenheidsprijs, korting_percentage: meetellend[0].korting_percentage || 0, vast: false }
  }
  if (meetellend.length > 1) {
    // Alle opties samen in één post: elk stuk telt netto mee, dus de korting is
    // hier al verwerkt en mag er niet nog een keer af.
    const netto = round2(meetellend.reduce((s, v) => s + round2(v.aantal * v.eenheidsprijs * (1 - (v.korting_percentage || 0) / 100)), 0))
    return { aantal: 1, eenheidsprijs: netto, korting_percentage: 0, vast: true }
  }
  return { aantal: oi.aantal, eenheidsprijs: oi.eenheidsprijs, korting_percentage: oi.korting_percentage || 0, vast: false }
}

function btwVanVoorschot(v: Voorschot): number {
  if (!v.subtotaal) return 21
  const pct = Math.round(((v.totaal - v.subtotaal) / v.subtotaal) * 100)
  return [21, 9, 0].reduce((best, kandidaat) => (Math.abs(kandidaat - pct) < Math.abs(best - pct) ? kandidaat : best), 21)
}

function naarFactuurRegels(oi: OfferteItem, aantal: number): NieuweFactuurRegel[] {
  const meetellend = getMeetellendeVarianten(oi.prijs_varianten, oi.actieve_variant_id)
  const basis = { grootboek_code: oi.grootboek_code || '', detail_regels: oi.detail_regels || [], offerte_item_id: oi.id }
  if (meetellend.length === 0) {
    return [{ beschrijving: oi.beschrijving, aantal, eenheidsprijs: oi.eenheidsprijs, btw_percentage: oi.btw_percentage, korting_percentage: oi.korting_percentage, ...basis }]
  }
  return meetellend.map((v, i) => ({
    beschrijving: meetellend.length > 1 && v.label ? `${oi.beschrijving} · ${v.label}` : oi.beschrijving,
    aantal: meetellend.length === 1 ? aantal : v.aantal,
    eenheidsprijs: v.eenheidsprijs,
    btw_percentage: v.btw_percentage,
    korting_percentage: v.korting_percentage,
    ...basis,
    detail_regels: i === 0 ? basis.detail_regels : [],
  }))
}

export function WatFacturerenDialog({ open, onOpenChange, offerte, project, projectTaken = [], onProjectBijgewerkt, onTakenAfgerond }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [laden, setLaden] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [items, setItems] = useState<OfferteItem[]>([])
  const [gefactureerd, setGefactureerd] = useState<Record<string, number>>({})
  const [voorschotten, setVoorschotten] = useState<Voorschot[]>([])
  const [concepten, setConcepten] = useState<Factuur[]>([])
  const [keuze, setKeuze] = useState<Record<string, Keuze>>({})
  const [doel, setDoel] = useState<'nieuw' | string>('nieuw')
  const [tevensProject, setTevensProject] = useState(false)
  const [projectStatus, setProjectStatus] = useState<'te-factureren' | 'gefactureerd'>('gefactureerd')
  const [tevensTaken, setTevensTaken] = useState(false)

  const openTaken = useMemo(() => projectTaken.filter((t) => t.status !== 'klaar'), [projectTaken])

  useEffect(() => {
    if (!open) return
    let afgebroken = false
    setLaden(true)
    setDoel('nieuw')
    setTevensProject(false)
    setTevensTaken(false)
    Promise.all([
      getOfferteItems(offerte.id),
      getGefactureerdeAantallenVoorOfferte(offerte.id).catch(() => ({} as Record<string, number>)),
      getVoorschottenVoorOfferte(offerte.id).catch(() => [] as Voorschot[]),
      getConceptFacturenVoorKlant(offerte.klant_id).catch(() => [] as Factuur[]),
    ])
      .then(([oiRijen, som, vs, cs]) => {
        if (afgebroken) return
        const prijsRegels = oiRijen
          .filter((oi) => (oi.soort || 'prijs') === 'prijs' && !oi.is_optioneel)
          .sort((a, b) => a.volgorde - b.volgorde)
        setItems(prijsRegels)
        setGefactureerd(som)
        setVoorschotten(vs.filter((v) => v.status === 'betaald' && !v.is_voorschot_verrekend))
        setConcepten(cs)
        const start: Record<string, Keuze> = {}
        for (const oi of prijsRegels) {
          const vorm = regelVorm(oi)
          const nog = Math.max(0, round2(vorm.aantal - (som[oi.id] || 0)))
          start[oi.id] = { aan: nog > 0, aantal: nog > 0 ? nog : vorm.aantal }
        }
        setKeuze(start)
      })
      .catch((err) => {
        logger.error('Wat factureren laden mislukt:', err)
        toast.error('Kon de offerteregels niet laden')
      })
      .finally(() => { if (!afgebroken) setLaden(false) })
    return () => { afgebroken = true }
  }, [open, offerte.id, offerte.klant_id])

  const gekozen = items.filter((oi) => keuze[oi.id]?.aan && keuze[oi.id].aantal > 0)
  const volledig = items.length > 0 && items.every((oi) => keuze[oi.id]?.aan && keuze[oi.id].aantal === regelVorm(oi).aantal)
  const regelsTotaal = round2(gekozen.reduce((s, oi) => {
    const vorm = regelVorm(oi)
    const bruto = round2(keuze[oi.id].aantal * vorm.eenheidsprijs)
    return s + round2(bruto - round2(bruto * (vorm.korting_percentage / 100)))
  }, 0))
  const voorschotTotaal = round2(voorschotten.reduce((s, v) => s + (v.subtotaal || 0), 0))
  const heeftOngekoppeld = Object.keys(gefactureerd).length === 0 && !!offerte.geconverteerd_naar_factuur_id

  const wijzig = (id: string, patch: Partial<Keuze>) => setKeuze((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const verrekenRegels = voorschotten.map((v) => ({
    beschrijving: `Verrekening voorschot ${v.nummer || ''}`.trim(),
    eenheidsprijs: -round2(v.subtotaal || 0),
    btw_percentage: btwVanVoorschot(v),
  }))

  // De "tevens"-acties gebeuren pas als de factuur bestaat: bij een concept
  // direct na de write, bij een nieuwe factuur via de prefill in de editor.
  const tevens = (): PrefillTevens | undefined => {
    const t: PrefillTevens = {}
    if (tevensProject && project) { t.project_id = project.id; t.project_status = projectStatus }
    if (tevensTaken && openTaken.length > 0) t.taak_ids = openTaken.map((x) => x.id)
    return t.project_id || t.taak_ids ? t : undefined
  }

  const voerTevensUit = async () => {
    const uitkomst = await voerPrefillTevensUit(tevens())
    if (uitkomst.project) onProjectBijgewerkt?.(uitkomst.project)
    else if (tevensProject && project) toast.error('Kon de projectstatus niet bijwerken')
    if (uitkomst.takenAfgerond) onTakenAfgerond?.()
    else if (tevensTaken && openTaken.length > 0) toast.error('Kon niet alle taken afronden')
  }

  const handleFactureren = async () => {
    if (gekozen.length === 0 && verrekenRegels.length === 0) {
      toast.error('Kies minimaal één regel')
      return
    }
    setBezig(true)
    try {
      if (doel === 'nieuw') {
        const prefill: FactuurPrefill = {
          offerte_id: offerte.id,
          regels: gekozen.map((oi) => ({ offerte_item_id: oi.id, aantal: keuze[oi.id].aantal })),
          volledig,
          verrekenRegels,
          verrekende_voorschot_ids: voorschotten.map((v) => v.id),
          tevens: tevens(),
        }
        schrijfFactuurPrefill(prefill)
        const params = new URLSearchParams({
          offerte_id: offerte.id,
          klant_id: offerte.klant_id,
          project_id: project?.id || offerte.project_id || '',
          titel: offerte.titel,
          prefill: '1',
        })
        onOpenChange(false)
        navigate(`/facturen/nieuw?${params.toString()}`, { state: { from: location.pathname } })
        return
      }

      const concept = concepten.find((c) => c.id === doel)
      if (!concept) throw new Error('Concept niet gevonden')
      const regels: NieuweFactuurRegel[] = [
        ...gekozen.flatMap((oi) => naarFactuurRegels(oi, keuze[oi.id].aantal)),
        ...verrekenRegels.map((v) => ({
          beschrijving: v.beschrijving, aantal: 1, eenheidsprijs: v.eenheidsprijs, btw_percentage: v.btw_percentage,
          korting_percentage: 0, grootboek_code: '', detail_regels: [], offerte_item_id: null,
        })),
      ]
      const extra: Partial<Factuur> = voorschotten.length > 0
        ? { factuur_type: 'eindafrekening', verrekende_voorschot_ids: [...(concept.verrekende_voorschot_ids || []), ...voorschotten.map((v) => v.id)] }
        : {}
      await voegRegelsToeAanConcept(concept.id, regels, user?.id || '', extra)
      await voerTevensUit()
      for (const v of voorschotten) {
        await updateFactuur(v.id, { is_voorschot_verrekend: true }).catch((err) => logger.error('Voorschot afvinken mislukt:', err))
      }
      try {
        await updateOfferte(offerte.id, {
          factuur_ids: [...new Set([...(offerte.factuur_ids || []), concept.id])],
          ...(volledig ? { geconverteerd_naar_factuur_id: concept.id, status: 'gefactureerd', geconverteerd_naar_factuur_op: offerte.geconverteerd_naar_factuur_op || new Date().toISOString() } : {}),
        })
      } catch (err) {
        logger.error('Offerte koppelen aan concept mislukt:', err)
      }
      toast.success(`${regels.length} regel${regels.length === 1 ? '' : 's'} toegevoegd aan ${concept.nummer || 'het concept'}`)
      onOpenChange(false)
      navigate(`/facturen/${concept.id}/bewerken`, { state: { from: location.pathname } })
    } catch (err) {
      logger.error('Factureren vanuit dialoog mislukt:', err)
      toast.error((err as { message?: string })?.message || 'Factureren mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => { if (!bezig) onOpenChange(o) }}
      className="sm:max-w-xl gap-3"
      titleClassName="text-base"
      descriptionClassName="text-xs"
      title="Wat wil je factureren?"
      description={`Offerte ${offerte.nummer} · ${offerte.titel}`}
      footer={(
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={bezig} className="min-h-[44px] sm:min-h-0">
            Annuleren
          </Button>
          <Button
            size="sm"
            onClick={handleFactureren}
            disabled={bezig || laden || (gekozen.length === 0 && verrekenRegels.length === 0)}
            className="bg-flame text-white hover:bg-flame/90 min-h-[44px] sm:min-h-0"
          >
            {bezig ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}
            {doel === 'nieuw' ? 'Factuur maken' : 'Toevoegen'}
          </Button>
        </>
      )}
    >

        {laden ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Regels laden
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {items.map((oi) => {
                const vorm = regelVorm(oi)
                const k = keuze[oi.id] || { aan: false, aantal: vorm.aantal }
                const al = gefactureerd[oi.id] || 0
                const nog = Math.max(0, round2(vorm.aantal - al))
                return (
                  <li key={oi.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5', !k.aan && 'opacity-60')}>
                    <label className="flex min-w-0 flex-1 basis-[200px] items-center gap-3 cursor-pointer min-h-[44px] sm:min-h-0">
                      <Checkbox checked={k.aan} onCheckedChange={(v) => wijzig(oi.id, { aan: v === true })} className="h-5 w-5" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{oi.beschrijving || 'Regel zonder omschrijving'}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatCurrency(nettoStuksprijs(vorm))} per stuk
                          {al > 0 ? ` · ${nog > 0 ? `nog ${nog} van ${vorm.aantal}` : 'al gefactureerd'}` : ` · ${vorm.aantal} op de offerte`}
                        </span>
                      </span>
                    </label>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        type="button" variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8"
                        disabled={vorm.vast || !k.aan || k.aantal <= 1}
                        onClick={() => wijzig(oi.id, { aantal: Math.max(1, round2(k.aantal - 1)) })}
                        aria-label="Minder"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number" inputMode="decimal" min={0} step="any"
                        value={k.aantal}
                        disabled={vorm.vast || !k.aan}
                        onChange={(e) => wijzig(oi.id, { aantal: Math.max(0, Number(e.target.value) || 0) })}
                        className="h-9 sm:h-8 w-16 text-center text-sm font-mono px-1"
                        aria-label="Aantal"
                      />
                      <Button
                        type="button" variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8"
                        disabled={vorm.vast || !k.aan}
                        onClick={() => wijzig(oi.id, { aantal: round2(k.aantal + 1) })}
                        aria-label="Meer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
              {items.length === 0 && (
                <li className="px-3 py-4 text-sm text-muted-foreground">Deze offerte heeft geen prijsregels.</li>
              )}
            </ul>
            {heeftOngekoppeld && (
              <p className="text-[11px] text-muted-foreground">
                Deze offerte is eerder gefactureerd, maar die regels zijn niet aan offerteregels gekoppeld. Ze tellen hier als niet gefactureerd.
              </p>
            )}

            {voorschotten.length > 0 && (
              <div className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Betaalde voorschotten, verrekend</p>
                {voorschotten.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-0.5">
                    <span>Verrekening voorschot {v.nummer}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(-(v.subtotaal || 0))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Te factureren ex btw</span>
              <span className="font-mono tabular-nums font-semibold">{formatCurrency(round2(regelsTotaal - voorschotTotaal))}</span>
            </div>

            {concepten.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Waarheen</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDoel('nieuw')}
                    className={cn('min-h-[44px] sm:min-h-0 rounded-lg border px-3 py-1.5 text-sm', doel === 'nieuw' ? 'border-petrol bg-petrol/[0.06] text-petrol dark:text-foreground font-semibold' : 'border-border text-muted-foreground')}
                  >
                    Nieuwe factuur
                  </button>
                  {concepten.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDoel(c.id)}
                      className={cn('min-h-[44px] sm:min-h-0 rounded-lg border px-3 py-1.5 text-sm max-w-full truncate', doel === c.id ? 'border-petrol bg-petrol/[0.06] text-petrol dark:text-foreground font-semibold' : 'border-border text-muted-foreground')}
                      title={c.titel}
                    >
                      Toevoegen aan {c.nummer || 'concept'} · {c.titel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(project || openTaken.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tevens</p>
                {project && (
                  <label className="flex items-center gap-3 text-sm cursor-pointer min-h-[44px] sm:min-h-0">
                    <Checkbox checked={tevensProject} onCheckedChange={(v) => setTevensProject(v === true)} className="h-5 w-5" />
                    <span>Project op</span>
                    <span className="inline-flex rounded-md border border-border overflow-hidden">
                      {(['te-factureren', 'gefactureerd'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setProjectStatus(s); setTevensProject(true) }}
                          className={cn('px-2 py-1 text-xs', projectStatus === s ? 'bg-petrol text-white' : 'text-muted-foreground')}
                        >
                          {s === 'te-factureren' ? 'Te factureren' : 'Gefactureerd'}
                        </button>
                      ))}
                    </span>
                    <span>zetten</span>
                  </label>
                )}
                {openTaken.length > 0 && (
                  <label className="flex items-center gap-3 text-sm cursor-pointer min-h-[44px] sm:min-h-0">
                    <Checkbox checked={tevensTaken} onCheckedChange={(v) => setTevensTaken(v === true)} className="h-5 w-5" />
                    <span>{openTaken.length} open {openTaken.length === 1 ? 'taak' : 'taken'} afronden</span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}
    </ResponsiveDialog>
  )
}
