import { useEffect, useMemo, useRef, useState } from 'react'
import { Users, Filter, ListChecks, Search, Check, RefreshCw, UserMinus, Building2, Bookmark, BookmarkPlus, Trash2, Activity, Upload, ClipboardList, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getKlantKeuzes, verzamelOntvangers, klantVoldoet, syncContactenVolledig,
  getSegmenten, bewaarSegment, verwijderSegment, markeerSegmentGebruikt, omschrijfSelectie,
  getLijsten, maakLijst, verwijderLijst, voegAdressenToe, parseAdressen,
  GEDRAG_LABEL,
  type OntvangerSelectie, type KlantKeuze, type Ontvanger, type Segment, type Gedrag, type Lijst,
} from '@/services/nieuwsbriefService'

interface Props {
  selectie: OntvangerSelectie
  onChange: (s: OntvangerSelectie) => void
  onTelling: (aantal: number | null) => void
  disabled?: boolean
}

const STATUS_LABEL: Record<string, string> = { actief: 'Actieve klanten', prospect: 'Prospects', inactief: 'Inactieve klanten' }

export function OntvangerKiezer({ selectie, onChange, onTelling, disabled }: Props) {
  const [klanten, setKlanten] = useState<KlantKeuze[]>([])
  const [laden, setLaden] = useState(true)
  const [ontvangers, setOntvangers] = useState<Ontvanger[]>([])
  const [afgemeld, setAfgemeld] = useState(0)
  const [tellen, setTellen] = useState(false)
  const [zoek, setZoek] = useState('')
  const [lijstZoek, setLijstZoek] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncInfo, setSyncInfo] = useState<string | null>(null)
  const [segmenten, setSegmenten] = useState<Segment[]>([])
  const [segmentNaam, setSegmentNaam] = useState('')
  const [segmentBezig, setSegmentBezig] = useState(false)
  const [lijsten, setLijsten] = useState<Lijst[]>([])
  const [nieuweLijstNaam, setNieuweLijstNaam] = useState('')
  const [plakTekst, setPlakTekst] = useState('')
  const [lijstBezig, setLijstBezig] = useState(false)
  const bestandRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSegmenten()
      .then(setSegmenten)
      .catch(err => console.error('[nieuwsbrief] segmenten laden mislukt:', err))
  }, [])

  useEffect(() => {
    getLijsten()
      .then(setLijsten)
      .catch(err => console.error('[nieuwsbrief] lijsten laden mislukt:', err))
  }, [])

  useEffect(() => {
    getKlantKeuzes()
      .then(setKlanten)
      .catch(err => { toast.error('Kon klanten niet laden'); console.error('[nieuwsbrief] klanten laden mislukt:', err) })
      .finally(() => setLaden(false))
  }, [])

  useEffect(() => {
    let actueel = true
    setTellen(true)
    verzamelOntvangers(selectie)
      .then(r => { if (!actueel) return; setOntvangers(r.ontvangers); setAfgemeld(r.afgemeld); onTelling(r.ontvangers.length) })
      .catch(err => { if (actueel) { console.error('[nieuwsbrief] tellen mislukt:', err); onTelling(null) } })
      .finally(() => { if (actueel) setTellen(false) })
    return () => { actueel = false }
  }, [selectie, onTelling])

  const alleLabels = useMemo(() => Array.from(new Set(klanten.flatMap(k => k.labels))).sort(), [klanten])
  const statusTelling = useMemo(() => {
    const t: Record<string, number> = { actief: 0, prospect: 0, inactief: 0 }
    for (const k of klanten) t[k.status] = (t[k.status] ?? 0) + 1
    return t
  }, [klanten])

  const set = (v: Partial<OntvangerSelectie>) => onChange({ ...selectie, ...v })
  const toggleIn = (lijst: string[] | undefined, waarde: string) => {
    const huidig = lijst ?? []
    return huidig.includes(waarde) ? huidig.filter(x => x !== waarde) : [...huidig, waarde]
  }

  const gefilterdeKlanten = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return klanten.filter(k => !q || k.bedrijfsnaam.toLowerCase().includes(q) || k.contactpersoon.toLowerCase().includes(q) || k.email.toLowerCase().includes(q))
  }, [klanten, zoek])

  const gefilterdeOntvangers = useMemo(() => {
    const q = lijstZoek.trim().toLowerCase()
    return ontvangers.filter(o => !q || o.email.includes(q) || o.naam.toLowerCase().includes(q) || o.bedrijfsnaam.toLowerCase().includes(q))
  }, [ontvangers, lijstZoek])

  const klantenInFilter = useMemo(() => klanten.filter(k => klantVoldoet(k, selectie)).length, [klanten, selectie])

  const handleSync = async () => {
    setSyncing(true)
    try {
      let nieuw = 0
      const r = await syncContactenVolledig(p => { nieuw += p.nieuwToegevoegd; setSyncInfo(`Bezig: ${p.aantalContacten} adressen bij Resend, nog ${p.resterend} te gaan`) })
      setSyncInfo(`${r.aantalContacten} adressen bij Resend, ${r.afgemeld} afgemeld overgeslagen`)
      toast.success(`Lijst bijgewerkt: ${nieuw} nieuw toegevoegd`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bijwerken mislukt')
    } finally {
      setSyncing(false)
    }
  }

  const gekozenLijst = useMemo(() => lijsten.find(l => l.id === selectie.lijstId) ?? null, [lijsten, selectie.lijstId])

  const herlaadLijsten = async (lijstId?: string) => {
    const verse = await getLijsten()
    setLijsten(verse)
    // Nieuw object doorgeven dwingt de tel-effect opnieuw, anders blijft het
    // aantal ontvangers staan op wat het vóór de import was.
    if (lijstId) onChange({ ...selectie, type: 'lijst', lijstId })
    else onChange({ ...selectie })
  }

  const handleMaakLijst = async () => {
    const naam = nieuweLijstNaam.trim()
    if (!naam) { toast.error('Geef de lijst een naam'); return }
    setLijstBezig(true)
    try {
      const l = await maakLijst(naam)
      setNieuweLijstNaam('')
      await herlaadLijsten(l.id)
      toast.success(`Lijst "${l.naam}" aangemaakt`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Aanmaken mislukt')
    } finally {
      setLijstBezig(false)
    }
  }

  const importeer = async (tekst: string) => {
    if (!selectie.lijstId) { toast.error('Kies eerst een lijst'); return }
    const rijen = parseAdressen(tekst)
    if (rijen.length === 0) { toast.error('Geen e-mailadressen gevonden'); return }
    setLijstBezig(true)
    try {
      const r = await voegAdressenToe(selectie.lijstId, rijen)
      setPlakTekst('')
      await herlaadLijsten(selectie.lijstId)
      toast.success(r.overgeslagen > 0
        ? `${r.toegevoegd} toegevoegd, ${r.overgeslagen} overgeslagen (dubbel of ongeldig)`
        : `${r.toegevoegd} adressen toegevoegd`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toevoegen mislukt')
    } finally {
      setLijstBezig(false)
    }
  }

  const handleBestand = async (bestand: File | undefined) => {
    if (!bestand) return
    if (/\.xlsx?$/i.test(bestand.name)) {
      toast.error('Sla je Excel eerst op als CSV (Bestand > Opslaan als > CSV)')
      return
    }
    await importeer(await bestand.text())
    if (bestandRef.current) bestandRef.current.value = ''
  }

  const handleVerwijderLijst = async (l: Lijst) => {
    setLijstBezig(true)
    try {
      await verwijderLijst(l.id)
      setLijsten(vorig => vorig.filter(x => x.id !== l.id))
      if (selectie.lijstId === l.id) onChange({ ...selectie, lijstId: undefined })
      toast.success(`Lijst "${l.naam}" verwijderd`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verwijderen mislukt')
    } finally {
      setLijstBezig(false)
    }
  }

  const handleBewaarSegment = async () => {
    if (!segmentNaam.trim()) { toast.error('Geef het segment een naam'); return }
    setSegmentBezig(true)
    try {
      const s = await bewaarSegment(segmentNaam.trim(), selectie)
      setSegmenten(vorig => [...vorig.filter(x => x.id !== s.id && x.naam !== s.naam), s].sort((a, b) => a.naam.localeCompare(b.naam)))
      setSegmentNaam('')
      toast.success(`Segment "${s.naam}" bewaard`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bewaren mislukt')
    } finally {
      setSegmentBezig(false)
    }
  }

  const handleGebruikSegment = (s: Segment) => {
    onChange(s.selectie)
    markeerSegmentGebruikt(s.id)
    toast.success(`Segment "${s.naam}" toegepast`)
  }

  const handleVerwijderSegment = async (s: Segment) => {
    try {
      await verwijderSegment(s.id)
      setSegmenten(vorig => vorig.filter(x => x.id !== s.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verwijderen mislukt')
    }
  }

  const soortKaart = (soort: OntvangerSelectie['type'], Icon: typeof Users, titel: string, uitleg: string) => {
    const actief = selectie.type === soort
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => set({ type: soort })}
        className={cn(
          'flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all',
          actief ? 'border-flame bg-flame/[0.04] shadow-[0_0_0_3px_rgba(241,80,37,0.12)]' : 'border-border bg-card hover:border-petrol/40',
          disabled && 'opacity-60',
        )}
      >
        <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', actief ? 'bg-flame text-white' : 'bg-petrol/[0.08] text-petrol dark:bg-white/[0.06] dark:text-foreground')}>
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-foreground">{titel}</span>
          <span className="block text-[12px] leading-relaxed text-muted-foreground">{uitleg}</span>
        </span>
      </button>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h2 className="text-[20px] font-extrabold tracking-[-0.3px] text-foreground">Wie krijgt deze nieuwsbrief<span className="text-flame">?</span></h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Adressen komen uit je klanten en contactpersonen in doen., of uit een losse lijst die daar helemaal buiten staat. Wie zich heeft afgemeld, wordt automatisch overgeslagen.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {soortKaart('alle', Users, 'Iedereen', 'Alle klanten en hun contactpersonen met een e-mailadres.')}
        {soortKaart('filter', Filter, 'Op status of label', 'Bijvoorbeeld alleen actieve klanten, of alleen het label "Retail".')}
        {soortKaart('handmatig', ListChecks, 'Zelf kiezen', 'Vink precies de klanten aan die je wilt bereiken.')}
        {soortKaart('lijst', ClipboardList, 'Losse lijst', 'Een eigen adressenlijst. Je klanten krijgen deze mail niet.')}
      </div>

      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-petrol" />
          <span className="text-[14px] font-bold text-foreground">Zeef op gedrag<span className="text-flame">.</span></span>
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
          Kijkt naar wat mensen met je vorige nieuwsbrieven deden. Vult de keuze hierboven aan, hij vervangt hem niet.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GEDRAG_LABEL) as Gedrag[]).map(g => {
            const aan = (selectie.gedrag ?? 'alle') === g
            return (
              <button
                key={g}
                type="button"
                disabled={disabled}
                onClick={() => set({ gedrag: g })}
                title={GEDRAG_LABEL[g].uitleg}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors',
                  aan ? 'border-petrol bg-petrol text-white dark:border-white/40' : 'border-border bg-card text-foreground hover:border-petrol/50',
                )}
              >
                {aan && <Check className="h-3.5 w-3.5" />}
                {GEDRAG_LABEL[g].titel}
              </button>
            )
          })}
        </div>
        {(selectie.gedrag ?? 'alle') !== 'alle' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span>{GEDRAG_LABEL[selectie.gedrag ?? 'alle'].uitleg}</span>
            {(selectie.gedrag === 'betrokken' || selectie.gedrag === 'sluimerend') && (
              <label className="inline-flex items-center gap-2">
                over de laatste
                <select
                  value={selectie.gedragVenster ?? 3}
                  disabled={disabled}
                  onChange={e => set({ gedragVenster: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-[13px] text-foreground outline-none focus:border-petrol dark:focus:border-white/25"
                >
                  {[1, 2, 3, 5, 8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                verzendingen
              </label>
            )}
          </div>
        )}
      </div>

      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-petrol" />
          <span className="text-[14px] font-bold text-foreground">Segmenten<span className="text-flame">.</span></span>
          <span className="ml-auto text-[12px] text-muted-foreground">bewaar deze groep om hem vaker te mailen</span>
        </div>
        {segmenten.length > 0 && (
          <ul className="mb-3 divide-y divide-border/50">
            {segmenten.map(sg => (
              <li key={sg.id} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleGebruikSegment(sg)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[14px] font-semibold text-foreground hover:text-flame">{sg.naam}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{omschrijfSelectie(sg.selectie)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerwijderSegment(sg)}
                  aria-label={`Verwijder segment ${sg.naam}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-[#C0451A]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            value={segmentNaam}
            onChange={e => setSegmentNaam(e.target.value)}
            placeholder="Naam voor deze groep"
            disabled={disabled}
            maxLength={80}
            className="min-w-[200px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-petrol dark:focus:border-white/25"
          />
          <button
            type="button"
            onClick={handleBewaarSegment}
            disabled={disabled || segmentBezig || !segmentNaam.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-petrol/50 disabled:opacity-50"
          >
            {segmentBezig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4 text-petrol" />}
            Bewaar
          </button>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Een segment bewaart de keuze, niet de mensen. Nieuwe klanten die eraan voldoen vallen er vanzelf in.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {selectie.type === 'filter' && (
            <div className="doen-slate-surface space-y-5 rounded-2xl p-5">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Klantstatus</div>
                <div className="flex flex-wrap gap-2">
                  {(['actief', 'prospect', 'inactief'] as const).map(s => {
                    const aan = (selectie.statussen ?? []).includes(s)
                    return (
                      <button key={s} type="button" disabled={disabled} onClick={() => set({ statussen: toggleIn(selectie.statussen, s) })} className={cn('inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors', aan ? 'border-petrol bg-petrol text-white dark:border-white/40' : 'border-border bg-card text-foreground hover:border-petrol/50')}>
                        {aan && <Check className="h-3.5 w-3.5" />}
                        {STATUS_LABEL[s]}
                        <span className={cn('font-mono text-[11px] tabular-nums', aan ? 'text-white/70' : 'text-muted-foreground')}>{statusTelling[s] ?? 0}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">Niets aangevinkt betekent: alle statussen.</p>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">Labels</div>
                {alleLabels.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Je klanten hebben nog geen labels. Geef ze labels in de Klanten-module om hier op te filteren.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {alleLabels.map(l => {
                      const aan = (selectie.labels ?? []).includes(l)
                      return (
                        <button key={l} type="button" disabled={disabled} onClick={() => set({ labels: toggleIn(selectie.labels, l) })} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors', aan ? 'border-petrol bg-petrol/10 font-semibold text-petrol dark:border-white/40 dark:bg-white/10 dark:text-foreground' : 'border-border bg-card text-foreground hover:border-petrol/50')}>
                          {aan && <Check className="h-3 w-3" />}{l}
                        </button>
                      )
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[12px] text-muted-foreground">Met meerdere labels geldt: minstens één ervan.</p>
              </div>
              <p className="text-[13px] text-foreground"><span className="font-mono font-semibold tabular-nums">{klantenInFilter}</span> van {klanten.length} klanten vallen binnen dit filter.</p>
            </div>
          )}

          {selectie.type === 'handmatig' && (
            <div className="doen-slate-surface overflow-hidden rounded-2xl">
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek klant..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-petrol dark:focus:border-white/25" />
                </div>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{(selectie.klantIds ?? []).length} gekozen</span>
                <button type="button" disabled={disabled} onClick={() => set({ klantIds: gefilterdeKlanten.map(k => k.id) })} className="text-[12px] font-medium text-petrol hover:underline dark:text-foreground">Alles</button>
                <button type="button" disabled={disabled} onClick={() => set({ klantIds: [] })} className="text-[12px] font-medium text-muted-foreground hover:underline">Niets</button>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {laden ? (
                  <div className="p-6 text-center text-[13px] text-muted-foreground">Klanten laden...</div>
                ) : gefilterdeKlanten.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-muted-foreground">Geen klanten gevonden</div>
                ) : gefilterdeKlanten.map(k => {
                  const aan = (selectie.klantIds ?? []).includes(k.id)
                  const adressen = (k.email ? 1 : 0) + (selectie.inclusiefContactpersonen !== false ? k.aantalContactpersonen : 0)
                  return (
                    <label key={k.id} className={cn('flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0 hover:bg-petrol/[0.04] dark:hover:bg-white/[0.03]', disabled && 'cursor-default')}>
                      <input type="checkbox" checked={aan} disabled={disabled} onChange={() => set({ klantIds: toggleIn(selectie.klantIds, k.id) })} className="h-4 w-4 rounded border-border accent-[#1A535C]" />
                      <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-foreground">{k.bedrijfsnaam || k.contactpersoon || k.email}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{[k.contactpersoon, k.email].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums', adressen === 0 ? 'bg-muted text-muted-foreground' : 'bg-petrol/10 text-petrol dark:bg-white/10 dark:text-foreground')}>{adressen} {adressen === 1 ? 'adres' : 'adressen'}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {selectie.type === 'lijst' && (
            <div className="doen-slate-surface space-y-4 rounded-2xl p-5">
              <div className="flex items-start gap-2.5 rounded-xl bg-petrol/[0.06] px-3.5 py-2.5 dark:bg-petrol/15">
                <ClipboardList className="mt-0.5 h-4 w-4 flex-shrink-0 text-petrol dark:text-[#7FB5BF]" />
                <p className="text-[12px] leading-relaxed text-foreground/80">
                  Deze adressen staan los van je klantenbestand. Ze komen niet in Klanten of Leads te staan,
                  en ze gaan nooit mee in een verzending naar "Iedereen".
                </p>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold text-foreground">Kies een lijst</div>
                {lijsten.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Je hebt nog geen lijst. Maak er hieronder een aan.</p>
                ) : (
                  <div className="space-y-1.5">
                    {lijsten.map(l => {
                      const aan = selectie.lijstId === l.id
                      return (
                        <div key={l.id} className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors', aan ? 'border-petrol bg-petrol/[0.06] dark:bg-white/[0.06]' : 'border-border bg-card')}>
                          <button type="button" disabled={disabled} onClick={() => set({ lijstId: l.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            {aan && <Check className="h-4 w-4 flex-shrink-0 text-petrol dark:text-foreground" />}
                            <span className="min-w-0">
                              <span className="block truncate text-[14px] font-medium text-foreground">{l.naam}</span>
                              <span className="block text-[12px] text-muted-foreground">{l.aantal ?? 0} {(l.aantal ?? 0) === 1 ? 'adres' : 'adressen'}</span>
                            </span>
                          </button>
                          <button type="button" disabled={disabled || lijstBezig} onClick={() => handleVerwijderLijst(l)} title="Lijst verwijderen" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={nieuweLijstNaam}
                  onChange={e => setNieuweLijstNaam(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMaakLijst() } }}
                  placeholder='Naam van een nieuwe lijst, bijvoorbeeld "Signmakers NL"'
                  disabled={disabled || lijstBezig}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-petrol dark:focus:border-white/25"
                />
                <button type="button" disabled={disabled || lijstBezig} onClick={handleMaakLijst} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60">
                  <Plus className="h-4 w-4 text-petrol" /> Aanmaken
                </button>
              </div>

              {gekozenLijst && (
                <div className="space-y-2 border-t border-border/60 pt-4">
                  <div className="text-[13px] font-semibold text-foreground">Adressen toevoegen aan "{gekozenLijst.naam}"</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Plak een kolom uit Excel, of upload een CSV. Een kopregel met "email" wordt herkend, net als kolommen voor naam en bedrijf.
                    Zonder kopregel pakt hij per regel het veld met een @. Dubbele adressen worden overgeslagen.
                  </p>
                  <textarea
                    value={plakTekst}
                    onChange={e => setPlakTekst(e.target.value)}
                    disabled={disabled || lijstBezig}
                    rows={5}
                    placeholder={'email;naam;bedrijf\ninfo@signmaker.nl;Jan de Vries;Signmaker BV'}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-petrol dark:focus:border-white/25"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={disabled || lijstBezig || !plakTekst.trim()} onClick={() => importeer(plakTekst)} className="inline-flex items-center gap-1.5 rounded-lg bg-flame px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#D9481F] disabled:opacity-60">
                      {lijstBezig ? 'Bezig...' : 'Adressen toevoegen'}
                    </button>
                    <button type="button" disabled={disabled || lijstBezig} onClick={() => bestandRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60">
                      <Upload className="h-4 w-4 text-petrol" /> CSV uploaden
                    </button>
                    <input ref={bestandRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleBestand(e.target.files?.[0])} />
                  </div>
                </div>
              )}
            </div>
          )}

          {(selectie.type === 'filter' || selectie.type === 'handmatig') && <label className="doen-slate-surface flex cursor-pointer items-center gap-3 rounded-2xl p-4">
            <input type="checkbox" checked={selectie.inclusiefContactpersonen !== false} disabled={disabled} onChange={e => set({ inclusiefContactpersonen: e.target.checked })} className="h-4 w-4 rounded border-border accent-[#1A535C]" />
            <span>
              <span className="block text-[14px] font-semibold text-foreground">Ook de contactpersonen van elke klant</span>
              <span className="block text-[12px] text-muted-foreground">Uit: alleen het hoofdadres van de klant.</span>
            </span>
          </label>}

          {selectie.type === 'alle' && (
            <div className="doen-slate-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground">Verzendlijst bij Resend</div>
                <div className="text-[12px] text-muted-foreground">{syncInfo ?? 'Bij "Iedereen" gaat de mail via je Resend-lijst. Die wordt bij het versturen automatisch bijgewerkt; hier kun je dat alvast doen.'}</div>
              </div>
              <button type="button" onClick={handleSync} disabled={syncing || disabled} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:border-petrol/50 disabled:opacity-60">
                <RefreshCw className={cn('h-4 w-4 text-petrol', syncing && 'animate-spin')} />
                {syncing ? 'Bijwerken...' : 'Lijst bijwerken'}
              </button>
            </div>
          )}
        </div>

        <div className="doen-slate-surface flex max-h-[640px] flex-col overflow-hidden rounded-2xl">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-cijfer text-[28px] font-bold leading-none tabular-nums text-foreground">{tellen ? '…' : ontvangers.length}</span>
              <span className="text-[13px] text-muted-foreground">ontvangers<span className="text-flame">.</span></span>
            </div>
            {afgemeld > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground"><UserMinus className="h-3.5 w-3.5" /> {afgemeld} afgemeld, overgeslagen</div>
            )}
          </div>
          <div className="border-b border-border/60 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={lijstZoek} onChange={e => setLijstZoek(e.target.value)} placeholder="Zoek in de lijst..." className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-[12px] text-foreground outline-none focus:border-petrol dark:focus:border-white/25" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {gefilterdeOntvangers.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-muted-foreground">{tellen ? 'Tellen...' : 'Nog niemand in de lijst'}</div>
            ) : gefilterdeOntvangers.slice(0, 500).map(o => (
              <div key={o.email} className="border-b border-border/40 px-4 py-2 last:border-0">
                <div className="truncate text-[13px] font-medium text-foreground">{o.naam || o.bedrijfsnaam || o.email}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{o.email}{o.bedrijfsnaam && o.naam ? ` · ${o.bedrijfsnaam}` : ''}</div>
              </div>
            ))}
            {gefilterdeOntvangers.length > 500 && <div className="p-3 text-center text-[12px] text-muted-foreground">en nog {gefilterdeOntvangers.length - 500} meer</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
