import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, FileText, CheckSquare, Users,
  Check, Loader2, Circle, ArrowRight, Sparkles, AlertCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getKlanten } from '@/services/supabaseService'
import { vulOfferteMetCalculatie } from '@/services/offerteService'
import type { Klant } from '@/types'
import { KlantContactSelector } from '@/components/shared/KlantContactSelector'
import {
  bouwCalculatieConceptViaCatalogus,
  type ConceptInputRegel,
  type CalculatieConcept,
} from '@/utils/calculatieConcept'
import { ForgieActieKaart } from './ForgieActieKaart'
import type { ForgieActie } from '@/services/forgieChatService'

const STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; order: number; route?: (id: string) => string }> = {
  klant: { label: 'Klant', icon: Users, order: 0 },
  project: { label: 'Project', icon: FolderOpen, order: 1, route: (id) => `/projecten/${id}` },
  offerte: { label: 'Offerte', icon: FileText, order: 2, route: (id) => `/offertes/${id}` },
  taak: { label: 'Taak', icon: CheckSquare, order: 3 },
}

type StepState = 'done' | 'busy' | 'pending' | 'failed'

const norm = (s: string) => s.trim().toLowerCase()

// Lichte Levenshtein-afstand (geen extra package) voor tikfout-tolerant zoeken.
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// "Lijkt erg op" — tolereert kleine typfouten (Floreks → Florex), schaalt met lengte.
function lijktOp(doel: string, kandidaat: string): boolean {
  const langer = Math.max(doel.length, kandidaat.length)
  if (Math.abs(doel.length - kandidaat.length) > 3) return false
  const drempel = langer <= 4 ? 1 : langer <= 8 ? 2 : 3
  const dist = levenshtein(doel, kandidaat)
  return dist > 0 && dist <= drempel
}

function stepLabel(type: string, state: StepState): string {
  const base = STEP_CONFIG[type]?.label ?? 'Stap'
  if (state === 'busy') return `${base} aanmaken…`
  if (state === 'failed') return `${base} — mislukt`
  return base
}

interface DaanActiePlanProps {
  acties: ForgieActie[]
}

export function DaanActiePlan({ acties }: DaanActiePlanProps) {
  const navigate = useNavigate()

  const baseOrdered = useMemo(
    () => [...acties].sort((a, b) => (STEP_CONFIG[a.type]?.order ?? 9) - (STEP_CONFIG[b.type]?.order ?? 9)),
    [acties],
  )

  // Project en offerte hebben een klant_id + contactpersoon nodig; resolve de klant vooraf.
  const needsKlant = baseOrdered.some((a) => a.type === 'project' || a.type === 'offerte')
  const klantNaam = useMemo(() => {
    const fromRef = baseOrdered.find((a) => a.type !== 'klant' && typeof a.data.klant_naam === 'string')?.data.klant_naam
    const fromKlant = baseOrdered.find((a) => a.type === 'klant')?.data.bedrijfsnaam
    return (fromRef ?? fromKlant) as string | undefined
  }, [baseOrdered])

  // Ruwe offerte-regels (uit de opdracht); de calculator maakt er een concept van.
  const offerteRuweRegels = useMemo(() => {
    const r = baseOrdered.find((a) => a.type === 'offerte')?.data.regels
    return Array.isArray(r) ? (r as ConceptInputRegel[]) : []
  }, [baseOrdered])
  const hasRegels = offerteRuweRegels.length > 0

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [resolving, setResolving] = useState(needsKlant && !!klantNaam)
  const [resolvedKlant, setResolvedKlant] = useState<{ id: string; naam: string }>()
  const [klantMatches, setKlantMatches] = useState<Klant[] | null>(null)
  const [createNew, setCreateNew] = useState(false)
  const [contactpersoonId, setContactpersoonId] = useState('')
  const [contactNaam, setContactNaam] = useState<string>()
  const [projectNaam, setProjectNaam] = useState(
    () => String(baseOrdered.find((a) => a.type === 'project')?.data.naam ?? ''),
  )

  const [regels, setRegels] = useState<ConceptInputRegel[]>(() => offerteRuweRegels)
  const [concept, setConcept] = useState<CalculatieConcept | null>(null)
  const [conceptLoading, setConceptLoading] = useState(hasRegels)

  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [createdIds, setCreatedIds] = useState<Record<string, string>>({})
  const [pendingProjectId, setPendingProjectId] = useState<string>()
  const [busyType, setBusyType] = useState<string | null>(null)
  const [failedType, setFailedType] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const [cancelled, setCancelled] = useState(false)
  const [filling, setFilling] = useState(false)
  // De offerte is optioneel: na het project vraagt Daan of er een offerte bij moet.
  const [offerteKeuze, setOfferteKeuze] = useState<'idle' | 'ja' | 'nee'>('idle')
  const [offerteError, setOfferteError] = useState<string>()
  const [offerteRetry, setOfferteRetry] = useState(0)

  const fetchKlanten = useCallback(() => {
    getKlanten().then(setKlanten).catch(() => {})
  }, [])

  // Eén fetch: vul de klantenlijst (voor de selector) én resolve de naam.
  // Eenduidige match -> auto-koppelen; meerdere/gelijkend -> kiezen; geen -> nieuw (geen gok).
  useEffect(() => {
    let abort = false
    getKlanten()
      .then((lijst) => {
        if (abort) return
        setKlanten(lijst)
        if (!needsKlant || !klantNaam) {
          setResolving(false)
          return
        }
        const doel = norm(klantNaam)
        const exact = lijst.filter((k) => norm(k.bedrijfsnaam) === doel)
        if (exact.length === 1) {
          setResolvedKlant({ id: exact[0].id, naam: exact[0].bedrijfsnaam })
        } else if (exact.length > 1) {
          setKlantMatches(exact)
        } else {
          const kandidaten = lijst.filter((k) => {
            const kn = norm(k.bedrijfsnaam)
            return kn.includes(doel) || doel.includes(kn) || lijktOp(doel, kn)
          })
          if (kandidaten.length >= 1) setKlantMatches(kandidaten)
          else setCreateNew(true)
        }
        setResolving(false)
      })
      .catch(() => {
        if (abort) return
        setCreateNew(true)
        setResolving(false)
      })
    return () => {
      abort = true
    }
  }, [needsKlant, klantNaam])

  // De uit te voeren keten. De klant wordt buiten de keten geresolveerd/aangemaakt
  // (via de selector), dus die stap zit niet in de keten. De offerte zit er evenmin
  // in: die is optioneel en wordt pas ná het project aangeboden (zie offerteKeuze).
  const ordered = useMemo(
    () => (needsKlant ? baseOrdered.filter((a) => a.type !== 'klant' && a.type !== 'offerte') : baseOrdered),
    [baseOrdered, needsKlant],
  )

  const hasProject = ordered.some((a) => a.type === 'project')

  // De (lege) offerte die op "ja" wordt aangemaakt: gebruik Daans voorstel als dat er
  // is, anders een kale offerte. De gebruiker vult 'm daarna zelf in de editor.
  const offerteActie = useMemo(
    () => baseOrdered.find((a) => a.type === 'offerte') ?? { type: 'offerte', data: {} as Record<string, unknown> },
    [baseOrdered],
  )
  const klantNaamCheck = resolvedKlant?.naam ?? klantNaam ?? ''
  // Geldige projectnaam: niet leeg, niet de klantnaam, niet de "Nieuw project"-default.
  const projectNaamReady =
    !hasProject ||
    (projectNaam.trim() !== '' &&
      norm(projectNaam) !== norm(klantNaamCheck) &&
      norm(projectNaam) !== 'nieuw project')

  // Een voorgestelde naam die toevallig de klantnaam is, niet voorvullen.
  useEffect(() => {
    const kn = resolvedKlant?.naam ?? klantNaam
    if (kn && norm(projectNaam) === norm(kn)) setProjectNaam('')
  }, [resolvedKlant, klantNaam])

  // Bouw het calculatie-concept (regels -> catalogus-match + totalen) en de vragen.
  // Pure rekenlogica uit stap 2; het model rekent niet. Herberekent bij een antwoord.
  useEffect(() => {
    if (regels.length === 0) {
      setConcept(null)
      setConceptLoading(false)
      return
    }
    let abort = false
    setConceptLoading(true)
    bouwCalculatieConceptViaCatalogus({ klant: klantNaam ?? '', regels })
      .then((c) => { if (!abort) { setConcept(c); setConceptLoading(false) } })
      .catch(() => { if (!abort) setConceptLoading(false) })
    return () => { abort = true }
  }, [regels, klantNaam])

  // Antwoord op een vraag verfijnt de bijbehorende ruwe regel -> concept herberekent.
  const answerVraag = useCallback((veld: string, value: string) => {
    const m = veld.match(/regel\[(\d+)\]\.(\w+)/)
    if (!m) return
    const idx = Number(m[1])
    const field = m[2]
    setRegels((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r
        if (field === 'marge') return { ...r, marge_type: value } as ConceptInputRegel
        return { ...r, omschrijving: value } as ConceptInputRegel
      }),
    )
  }, [])

  const handleCreated = useCallback(async (type: string, id: string) => {
    if (type === 'project') setPendingProjectId(id)
    // Offerte met regels: vul 'm via het calculatie->offerte-pad (zelfde roll-up als de editor).
    if (type === 'offerte' && concept && concept.regels.length > 0) {
      setFilling(true)
      setBusyType('offerte')
      try {
        await vulOfferteMetCalculatie(id, concept.regels)
      } catch {
        setFilling(false)
        setBusyType(null)
        setFailedType('offerte')
        setError('Offerte vullen mislukt')
        return
      }
      setFilling(false)
    }
    setCreatedIds((prev) => ({ ...prev, [type]: id }))
    setBusyType(null)
    setCurrentIndex((i) => i + 1)
  }, [concept])

  const handleStatusChange = useCallback((status: string, type: string) => {
    setBusyType(status === 'creating' ? type : null)
  }, [])

  // Fout halverwege: stop op deze stap (geen half-en-half); eerdere stappen blijven staan.
  const handleError = useCallback((type: string, msg: string) => {
    setBusyType(null)
    setFailedType(type)
    setError(msg)
  }, [])

  const done = currentIndex >= ordered.length
  const halted = cancelled || !!failedType
  const activeActie = started && !done && !halted ? ordered[currentIndex] : undefined
  // Het project staat: nu mag Daan een offerte aanbieden.
  const projectDone = done && !halted && !!createdIds.project

  // Naam + contactpersoon_id meegeven aan project/offerte (de kaart leest ze uit data).
  const cardActie = !activeActie
    ? activeActie
    : activeActie.type === 'project'
      ? { ...activeActie, data: { ...activeActie.data, naam: projectNaam.trim(), contactpersoon_id: contactpersoonId } }
      : activeActie.type === 'offerte'
        ? { ...activeActie, data: { ...activeActie.data, contactpersoon_id: contactpersoonId } }
        : activeActie

  // Stepper-rijen: de (eventueel) gekoppelde klant + contactpersoon als done-rij, dan de keten.
  const displaySteps = useMemo(() => {
    const rows: { type: string; label: string; state: StepState }[] = []
    if (resolvedKlant) {
      rows.push({ type: 'klant', label: `Klant gekoppeld — ${resolvedKlant.naam}`, state: 'done' })
    }
    if (contactNaam) {
      rows.push({ type: 'contactpersoon', label: `Contactpersoon — ${contactNaam}`, state: 'done' })
    }
    ordered.forEach((actie) => {
      const t = actie.type
      const state: StepState = createdIds[t]
        ? 'done'
        : failedType === t
          ? 'failed'
          : busyType === t
            ? 'busy'
            : 'pending'
      const label = t === 'offerte' && state === 'busy' && filling ? 'Offerte vullen…' : stepLabel(t, state)
      rows.push({ type: t, label, state })
    })
    return rows
  }, [resolvedKlant, contactNaam, ordered, createdIds, failedType, busyType, filling])

  // Diepste aangemaakte record voor de samenvattingslink: offerte > project.
  const linkType = createdIds.offerte ? 'offerte' : createdIds.project ? 'project' : undefined
  const linkRoute = linkType && STEP_CONFIG[linkType].route?.(createdIds[linkType])

  const showChooser = !!klantMatches && !resolvedKlant && !createNew
  const klantReady = !needsKlant || !!resolvedKlant
  const contactReady = !needsKlant || !!contactpersoonId
  const conceptReady = !hasRegels || (!!concept && concept.klaar)
  const showConfirm = !started && !done && !cancelled && ordered.length > 0

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden mt-1 w-full">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-flame-light border-b border-flame-border/50">
        <Sparkles className="w-3.5 h-3.5 text-flame" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-flame-text">
          Daan zet dit klaar
        </span>
      </div>

      <div className="p-3">
        {resolving ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-petrol" />
            Klant opzoeken…
          </div>
        ) : showChooser ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground mb-1">
              Welke klant bedoel je met “{klantNaam}”?
            </p>
            {klantMatches!.map((k) => (
              <button
                key={k.id}
                onClick={() => setResolvedKlant({ id: k.id, naam: k.bedrijfsnaam })}
                className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg border border-border/60 hover:border-petrol hover:bg-petrol-light/40 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-petrol flex-shrink-0" />
                <span className="text-foreground">{k.bedrijfsnaam}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setKlantMatches(null)
                setCreateNew(true)
              }}
              className="text-xs text-muted-foreground hover:text-petrol underline-offset-2 hover:underline mt-0.5"
            >
              Geen van deze — nieuw aanmaken
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displaySteps.map((step, i) => (
                <div key={`${step.type}-${i}`} className="flex items-center gap-2.5 text-sm">
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {step.state === 'done' ? (
                      <Check className="w-4 h-4" style={{ color: 'var(--status-green-text)' }} />
                    ) : step.state === 'busy' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-flame" />
                    ) : step.state === 'failed' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Circle className="w-2 h-2 text-muted-foreground/40" />
                    )}
                  </span>
                  <span
                    className={cn(
                      step.state === 'busy' && 'text-flame font-medium',
                      step.state === 'failed' && 'text-red-600 dark:text-red-400 font-medium',
                      step.state === 'pending' && 'text-muted-foreground/60',
                    )}
                    style={step.state === 'done' ? { color: 'var(--status-green-text)' } : undefined}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {error && failedType && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
            )}

            {/* Projectnaam (verplicht) — voorgevuld met Daans suggestie, aanpasbaar. */}
            {hasProject && !started && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Projectnaam
                </label>
                <input
                  value={projectNaam}
                  onChange={(e) => setProjectNaam(e.target.value)}
                  placeholder="Hoe wil je dit project noemen?"
                  className="w-full px-3 py-2 text-[13px] text-foreground bg-background rounded-lg border border-border/60 focus:border-petrol outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            )}

            {/* Contactpersoon-keuze — optioneel voor een kaal project; verplicht zodra
                je er een offerte bij maakt (dan vraagt Daan er opnieuw om). */}
            {needsKlant && !started && (
              <div className="mt-3 pt-3 border-t border-border/40 max-h-64 overflow-y-auto">
                <KlantContactSelector
                  contactOnly={!!resolvedKlant && !createNew}
                  autoSelect="singleOnly"
                  requireContactEmail
                  klantId={resolvedKlant?.id ?? ''}
                  onKlantChange={(_id, klant) => {
                    if (klant) setResolvedKlant({ id: klant.id, naam: klant.bedrijfsnaam })
                  }}
                  contactpersoonId={contactpersoonId}
                  onContactpersoonChange={setContactpersoonId}
                  onContactpersoonResolved={(cp) => { if (cp?.naam) setContactNaam(cp.naam) }}
                  onContactpersoonPicked={(id, naam) => {
                    setContactpersoonId(id)
                    if (naam) setContactNaam(naam)
                  }}
                  klanten={klanten}
                  onKlantenRefresh={fetchKlanten}
                />
              </div>
            )}

            {/* Offerte-inhoud: concept + vragen (geen gok). Bevestigen pas als alles helder is. */}
            {hasRegels && !started && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Offerte
                </label>
                {conceptLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-petrol" />
                    Calculatie opbouwen…
                  </div>
                ) : concept && concept.vragen.length > 0 ? (
                  <div className="space-y-2.5">
                    {concept.vragen.map((v) => (
                      <div key={v.veld} className="text-xs">
                        <p className="text-foreground mb-1.5">{v.vraag}</p>
                        {v.opties && v.opties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {v.opties.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => answerVraag(v.veld, opt)}
                                className="px-2.5 py-1 rounded-lg border border-border/60 hover:border-petrol hover:bg-petrol-light/40 text-foreground transition-colors"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : concept && concept.klaar && concept.regels.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {concept.regels.length} regel{concept.regels.length > 1 ? 's' : ''} ·{' '}
                    {formatCurrency(concept.totalen.totaalVerkoop)} excl. btw
                  </p>
                ) : null}
              </div>
            )}

            {/* Voert de keten headless uit na één bevestiging; voortgang loopt via de stepper. */}
            {cardActie && (
              <ForgieActieKaart
                actie={cardActie}
                silent
                autoStart
                onCreated={handleCreated}
                onCancel={() => setCancelled(true)}
                onStatusChange={(status) => handleStatusChange(status, cardActie.type)}
                onError={(msg) => handleError(cardActie.type, msg)}
                pendingKlantId={resolvedKlant?.id}
                pendingProjectId={pendingProjectId}
              />
            )}

            {showConfirm && (
              <div className="mt-3">
                {hasProject && !projectNaamReady ? (
                  <p className="text-[11px] text-muted-foreground mb-2">Geef het project een naam.</p>
                ) : null}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setCancelled(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => setStarted(true)}
                    disabled={!klantReady || !projectNaamReady}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-flame text-white text-sm font-semibold shadow-sm hover:bg-flame/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Bevestigen
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {cancelled && !failedType && (
              <p className="text-xs text-muted-foreground mt-2">Geannuleerd.</p>
            )}

            {/* Project staat — bied de offerte optioneel aan (ontstaat nooit automatisch). */}
            {projectDone && hasProject && offerteKeuze === 'idle' && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <p className="text-sm text-foreground mb-2">Wil je hier ook een offerte bij maken?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOfferteKeuze('ja')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-flame text-white text-xs font-semibold shadow-sm hover:bg-flame/90 transition-colors"
                  >
                    Ja, offerte erbij
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setOfferteKeuze('nee')}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                  >
                    Nee, klaar
                  </button>
                </div>
              </div>
            )}

            {/* Ja → contactpersoon is nu verplicht; kies 'm als dat nog niet is gebeurd. */}
            {projectDone && offerteKeuze === 'ja' && !contactpersoonId && (
              <div className="mt-3 pt-3 border-t border-border/40 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">Kies een contactpersoon voor de offerte.</p>
                <KlantContactSelector
                  contactOnly
                  autoSelect="singleOnly"
                  requireContactEmail
                  klantId={resolvedKlant?.id ?? ''}
                  onKlantChange={(_id, klant) => {
                    if (klant) setResolvedKlant({ id: klant.id, naam: klant.bedrijfsnaam })
                  }}
                  contactpersoonId={contactpersoonId}
                  onContactpersoonChange={setContactpersoonId}
                  onContactpersoonResolved={(cp) => { if (cp?.naam) setContactNaam(cp.naam) }}
                  onContactpersoonPicked={(id, naam) => {
                    setContactpersoonId(id)
                    if (naam) setContactNaam(naam)
                  }}
                  klanten={klanten}
                  onKlantenRefresh={fetchKlanten}
                />
              </div>
            )}

            {/* Contactpersoon gekozen — maak een lege offerte (klant/project/contact
                gekoppeld) en open 'm in de volle editor zodat de gebruiker 'm zelf vult. */}
            {projectDone && offerteKeuze === 'ja' && !!contactpersoonId && (
              <div className="mt-3">
                {offerteError ? (
                  <div className="space-y-2">
                    <p className="text-xs text-red-600 dark:text-red-400">{offerteError}</p>
                    <button
                      onClick={() => { setOfferteError(undefined); setOfferteRetry((n) => n + 1) }}
                      className="text-xs font-medium text-petrol hover:underline underline-offset-2"
                    >
                      Opnieuw proberen
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-flame" />
                      Offerte klaarzetten en openen…
                    </div>
                    <ForgieActieKaart
                      key={offerteRetry}
                      actie={{ ...offerteActie, data: { ...offerteActie.data, contactpersoon_id: contactpersoonId } }}
                      silent
                      autoStart
                      onCreated={(_type, id) => navigate(`/offertes/${id}`)}
                      onCancel={() => setOfferteKeuze('nee')}
                      onError={(msg) => setOfferteError(msg)}
                      pendingKlantId={resolvedKlant?.id}
                      pendingProjectId={createdIds.project}
                    />
                  </>
                )}
              </div>
            )}

            {/* Geen offerte: alleen het project; toon de samenvattingslink. */}
            {((offerteKeuze === 'nee' && linkRoute) || (done && !hasProject && linkRoute)) && (
              <button
                onClick={() => navigate(linkRoute!)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-petrol hover:gap-2 transition-all"
              >
                Bekijk {linkType === 'offerte' ? 'de offerte' : 'het project'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
