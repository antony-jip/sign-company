import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Lock, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import { createTijdregistratie, updateTijdregistratie, deleteTijdregistratie, standaardUrenStatus, urenBeschermdMelding, zetUrenStatus } from '@/services/tijdregistratieService'
import { stuurUrenWeekMelding } from '@/services/urenWeekService'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getProjectUrenBudget, type ProjectUrenBudget } from '@/services/projectUrenService'
import { kostprijsVoor, uurtariefVoorkeuze } from '@/utils/kostprijs'
import { contractOpDatum, contractUrenOpDag, datumPlusDagen, lokaleIso, maandagVan } from '@/utils/contracturen'
import { isPseudoMedewerker, koppelbaarMedewerkerId } from '@/utils/medewerkerKoppeling'
import type { AppSettings, Medewerker, MedewerkerContract, Project, Tijdregistratie } from '@/types'

export const DAG_KORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

export function weekNummer(datumIso: string): number {
  const d = new Date(datumIso.slice(0, 10) + 'T00:00:00')
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dag = u.getUTCDay() || 7
  u.setUTCDate(u.getUTCDate() + 4 - dag)
  const jaarStart = new Date(Date.UTC(u.getUTCFullYear(), 0, 1))
  return Math.ceil(((u.getTime() - jaarStart.getTime()) / 86400000 + 1) / 7)
}

export function vandaagIso(): string {
  return lokaleIso(new Date())
}

/** Maandag van de week met offset t.o.v. deze week. */
export function maandagMetOffset(weekOffset: number): string {
  return datumPlusDagen(maandagVan(vandaagIso()), weekOffset * 7)
}

export function formatUren(minuten: number): string {
  return (minuten / 60).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Leest "1,5", "1.5" en "1:30" als uren. */
function parseUren(tekst: string): number | null {
  const t = tekst.trim()
  if (!t) return 0
  const dubbel = t.match(/^(\d{1,2}):(\d{1,2})$/)
  if (dubbel) return Number(dubbel[1]) + Number(dubbel[2]) / 60
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function datumKort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

/** Regels van de ingelogde medewerker: op medewerker_id, of op user_id voor oude regels zonder medewerker. */
export function isEigenRegel(r: Tijdregistratie, eigenMedewerker: Medewerker | null, userId: string | undefined): boolean {
  if (eigenMedewerker && r.medewerker_id) return r.medewerker_id === eigenMedewerker.id
  return !!userId && r.user_id === userId
}

interface Rij {
  sleutel: string
  projectId: string
  projectNaam: string
  urenveld: string | null
}

function rijSleutel(projectId: string, urenveld: string | null | undefined): string {
  return `${projectId}|${urenveld || ''}`
}

interface WeekstaatProps {
  registraties: Tijdregistratie[]
  projecten: Project[]
  urenVelden: string[]
  eigenMedewerker: Medewerker | null
  userId: string | undefined
  contracten: MedewerkerContract[]
  settings: AppSettings
  weekOffset: number
  onWeekOffsetChange: (offset: number) => void
  goedkeurenAan: boolean
  /** Beheerders mogen goedgekeurde en gefactureerde regels nog wijzigen; de databasetrigger laat dat alleen voor hen toe. */
  isAdmin: boolean
  onGewijzigd: () => Promise<void> | void
}

export function Weekstaat({
  registraties, projecten, urenVelden, eigenMedewerker, userId, contracten, settings,
  weekOffset, onWeekOffsetChange, goedkeurenAan, isAdmin, onGewijzigd,
}: WeekstaatProps) {
  const maandag = maandagMetOffset(weekOffset)
  const dagen = useMemo(() => Array.from({ length: 7 }, (_, i) => datumPlusDagen(maandag, i)), [maandag])
  const vandaag = vandaagIso()
  const medewerkerId = eigenMedewerker?.id ?? ''

  const eigen = useMemo(
    () => registraties.filter((r) => isEigenRegel(r, eigenMedewerker, userId)),
    [registraties, eigenMedewerker, userId],
  )

  const vorigeMaandag = datumPlusDagen(maandag, -7)
  const zondag = dagen[6]
  const [extraRijen, setExtraRijen] = useState<Rij[]>([])

  const rijen = useMemo(() => {
    const perSleutel = new Map<string, Rij>()
    for (const r of eigen) {
      if (r.datum < vorigeMaandag || r.datum > zondag) continue
      const sleutel = rijSleutel(r.project_id, r.urenveld)
      if (perSleutel.has(sleutel)) continue
      const project = projecten.find((p) => p.id === r.project_id)
      perSleutel.set(sleutel, { sleutel, projectId: r.project_id, projectNaam: project?.naam || r.project_naam || 'Project', urenveld: r.urenveld || null })
    }
    for (const rij of extraRijen) if (!perSleutel.has(rij.sleutel)) perSleutel.set(rij.sleutel, rij)
    return Array.from(perSleutel.values()).sort((a, b) =>
      a.projectNaam.localeCompare(b.projectNaam) || (a.urenveld || '').localeCompare(b.urenveld || ''))
  }, [eigen, projecten, extraRijen, vorigeMaandag, zondag])

  function celRegels(rij: Rij, datum: string): Tijdregistratie[] {
    return eigen
      .filter((r) => r.datum === datum && rijSleutel(r.project_id, r.urenveld) === rij.sleutel)
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  }

  function celMinuten(rij: Rij, datum: string): number {
    return celRegels(rij, datum).reduce((s, r) => s + (r.duur_minuten || 0), 0)
  }

  function celSlot(regels: Tijdregistratie[]): string | null {
    if (!isAdmin && regels.some((r) => r.gefactureerd)) return 'Gefactureerd, alleen een beheerder kan dit wijzigen'
    if (!goedkeurenAan) return null
    if (!isAdmin && regels.some((r) => r.status === 'goedgekeurd')) return 'Goedgekeurd, alleen een beheerder kan dit wijzigen'
    if (regels.some((r) => r.status === 'definitief')) return 'Ingediend, wacht op goedkeuring'
    return null
  }

  const dagTotalen = dagen.map((d) => eigen.filter((r) => r.datum === d).reduce((s, r) => s + (r.duur_minuten || 0), 0))
  const dagNormen = dagen.map((d) => (medewerkerId && contractOpDatum(contracten, medewerkerId, d) ? contractUrenOpDag(contracten, medewerkerId, d) : null))
  const weekTotaal = dagTotalen.reduce((s, m) => s + m, 0)

  const weekendHeeftInhoud = dagTotalen[5] + dagTotalen[6] > 0 || (dagNormen[5] ?? 0) + (dagNormen[6] ?? 0) > 0
  const [weekendOpen, setWeekendOpen] = useState(weekendHeeftInhoud)
  useEffect(() => { setWeekendOpen(weekendHeeftInhoud) }, [maandag, weekendHeeftInhoud])
  const zichtbareDagen = weekendOpen ? dagen : dagen.slice(0, 5)

  const [mobielDag, setMobielDag] = useState(() => (dagen.includes(vandaag) ? vandaag : maandag))
  useEffect(() => { setMobielDag(dagen.includes(vandaag) ? vandaag : maandag) }, [maandag, dagen, vandaag])

  const [concepten, setConcepten] = useState<Record<string, string>>({})
  const [bezigCel, setBezigCel] = useState<string | null>(null)
  const budgetten = useRef(new Map<string, Promise<ProjectUrenBudget | null>>())

  function budgetVan(projectId: string): Promise<ProjectUrenBudget | null> {
    let p = budgetten.current.get(projectId)
    if (!p) {
      p = getProjectUrenBudget(projectId, urenVelden).catch(() => null)
      budgetten.current.set(projectId, p)
    }
    return p
  }

  async function slaCelOp(rij: Rij, datum: string, tekst: string) {
    const celId = `${rij.sleutel}|${datum}`
    const vergeetConcept = () => setConcepten((prev) => { const { [celId]: _weg, ...rest } = prev; return rest })
    const uren = parseUren(tekst)
    if (uren === null) { toast.error('Vul een getal in uren in, bijvoorbeeld 1,5'); vergeetConcept(); return }
    const regels = celRegels(rij, datum)
    const doel = Math.round(uren * 60)
    const huidig = regels.reduce((s, r) => s + (r.duur_minuten || 0), 0)
    if (doel === huidig) { vergeetConcept(); return }
    setBezigCel(celId)
    try {
      if (doel <= 0) {
        for (const r of regels) await deleteTijdregistratie(r.id)
      } else if (regels.length === 0) {
        const budget = await budgetVan(rij.projectId)
        const tarief = rij.urenveld ? budget?.perVeld[rij.urenveld]?.tarief : null
        await createTijdregistratie({
          project_id: rij.projectId,
          project_naam: rij.projectNaam,
          urenveld: rij.urenveld,
          omschrijving: rij.urenveld || rij.projectNaam,
          datum,
          start_tijd: '',
          eind_tijd: '',
          duur_minuten: doel,
          uurtarief: uurtariefVoorkeuze(tarief, eigenMedewerker, settings),
          kostprijs_uur: kostprijsVoor(eigenMedewerker, settings),
          medewerker_id: koppelbaarMedewerkerId(eigenMedewerker),
          medewerker_naam: eigenMedewerker?.naam,
          facturabel: true,
          gefactureerd: false,
          status: standaardUrenStatus(settings.functies),
        } as Omit<Tijdregistratie, 'id' | 'created_at' | 'updated_at'>)
      } else if (doel > huidig) {
        await updateTijdregistratie(regels[0].id, { duur_minuten: regels[0].duur_minuten + (doel - huidig) })
      } else {
        // Inkorten van achteren naar voren; wat op nul komt gaat weg.
        let teHalen = huidig - doel
        for (const r of [...regels].reverse()) {
          if (teHalen <= 0) break
          const nieuw = Math.max(0, r.duur_minuten - teHalen)
          teHalen -= r.duur_minuten - nieuw
          if (nieuw === 0) await deleteTijdregistratie(r.id)
          else await updateTijdregistratie(r.id, { duur_minuten: nieuw })
        }
      }
      await onGewijzigd()
    } catch (err) {
      logger.error('Weekstaat opslaan mislukt:', err)
      toast.error(urenBeschermdMelding(err) ?? 'Uren opslaan mislukt')
    } finally {
      setBezigCel(null)
      vergeetConcept()
    }
  }

  const weekRegels = eigen.filter((r) => r.datum >= maandag && r.datum <= zondag)
  const conceptRegels = weekRegels.filter((r) => (r.status ?? 'goedgekeurd') === 'concept')
  const weekStatus: 'concept' | 'definitief' | 'goedgekeurd' | null = weekRegels.length === 0
    ? null
    : conceptRegels.length > 0 ? 'concept'
    : weekRegels.some((r) => r.status === 'definitief') ? 'definitief'
    : 'goedgekeurd'
  const [indienenBezig, setIndienenBezig] = useState(false)

  async function dienWeekIn() {
    if (conceptRegels.length === 0 || indienenBezig) return
    setIndienenBezig(true)
    const minuten = conceptRegels.reduce((s, r) => s + (r.duur_minuten || 0), 0)
    try {
      await zetUrenStatus(conceptRegels.map((r) => r.id), { status: 'definitief', definitief_op: new Date().toISOString() })
      await onGewijzigd()
      toast.success(<>Week {weekNummer(maandag)} ingediend<span className="text-flame">.</span></>)
      await stuurUrenWeekMelding({ actie: 'ingediend', weekStart: maandag, uren: minuten / 60 })
    } catch (err) {
      logger.error('Week indienen mislukt:', err)
      toast.error('Week indienen mislukt')
    } finally {
      setIndienenBezig(false)
    }
  }

  const statusKop = goedkeurenAan && (
    <div className="flex items-center gap-2">
      {weekStatus === 'concept' && <StatusBadge status="concept" label="Concept" />}
      {weekStatus === 'definitief' && <StatusBadge status="verzonden" label="Ingediend" />}
      {weekStatus === 'goedgekeurd' && <StatusBadge status="goedgekeurd" label="Goedgekeurd" />}
      {conceptRegels.length > 0 && (
        <Button size="sm" className="h-11 md:h-9 bg-flame hover:bg-flame/90 text-white" onClick={dienWeekIn} disabled={indienenBezig}>
          <Send className="mr-2 h-4 w-4" />
          {indienenBezig ? 'Indienen…' : 'Week indienen'}
        </Button>
      )}
    </div>
  )

  const [nieuwProjectId, setNieuwProjectId] = useState('')
  const [nieuwVeld, setNieuwVeld] = useState('')

  function voegRijToe() {
    const project = projecten.find((p) => p.id === nieuwProjectId)
    if (!project) { toast.error('Kies eerst een project'); return }
    const sleutel = rijSleutel(project.id, nieuwVeld || null)
    if (rijen.some((r) => r.sleutel === sleutel)) { toast.info('Die regel staat er al'); return }
    setExtraRijen((prev) => [...prev, { sleutel, projectId: project.id, projectNaam: project.naam, urenveld: nieuwVeld || null }])
    setNieuwProjectId('')
    setNieuwVeld('')
  }

  function renderCel(rij: Rij, datum: string, mobiel = false) {
    const regels = celRegels(rij, datum)
    const slot = celSlot(regels)
    const celId = `${rij.sleutel}|${datum}`
    const minuten = regels.reduce((s, r) => s + (r.duur_minuten || 0), 0)
    const waarde = concepten[celId] ?? (minuten > 0 ? formatUren(minuten) : '')
    return (
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          aria-label={`${rij.projectNaam} ${rij.urenveld || 'Overig'} ${datumKort(datum)}`}
          title={slot ?? undefined}
          disabled={!!slot || bezigCel === celId}
          value={waarde}
          placeholder={mobiel ? '0,0' : ''}
          onChange={(e) => setConcepten((prev) => ({ ...prev, [celId]: e.target.value }))}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => { if (concepten[celId] !== undefined) slaCelOp(rij, datum, e.target.value) }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className={cn(
            'w-full rounded-md border border-input bg-background text-right font-mono tabular-nums text-sm text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mobiel ? 'h-11 w-24 px-3' : 'h-9 px-2',
            slot && 'bg-muted text-muted-foreground cursor-not-allowed pr-6',
            datum === vandaag && !slot && 'border-petrol/40',
          )}
        />
        {slot && <Lock className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />}
      </div>
    )
  }

  function renderNorm(index: number, mobiel = false) {
    const norm = dagNormen[index]
    if (norm === null) return null
    const verschil = dagTotalen[index] / 60 - norm
    const absVerschil = Math.abs(verschil)
    const kleur = absVerschil < 0.05 ? 'text-muted-foreground' : absVerschil <= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
    const teken = verschil > 0 ? '+' : verschil < 0 ? '-' : ''
    return (
      <span className={cn('text-2xs font-mono tabular-nums', kleur, mobiel && 'text-xs')}>
        norm {norm.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}
        {absVerschil >= 0.05 && ` · ${teken}${absVerschil.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
      </span>
    )
  }

  const rijLabel = (rij: Rij) => (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-[#1A4A52] dark:text-foreground">{rij.projectNaam}</p>
      <p className="truncate text-xs text-muted-foreground">{rij.urenveld || 'Overig'}</p>
    </div>
  )

  const nieuweRij = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={nieuwProjectId} onValueChange={setNieuwProjectId}>
        <SelectTrigger className="h-11 md:h-9 sm:w-64"><SelectValue placeholder="Project kiezen" /></SelectTrigger>
        <SelectContent>
          {projecten.map((p) => <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>)}
        </SelectContent>
      </Select>
      <select
        className="flex h-11 md:h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:w-44"
        value={nieuwVeld}
        onChange={(e) => setNieuwVeld(e.target.value)}
        aria-label="Bewerking"
      >
        <option value="">Overig</option>
        {urenVelden.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <Button variant="outline" className="h-11 md:h-9" onClick={voegRijToe}>
        <Plus className="mr-2 h-4 w-4" />Regel toevoegen
      </Button>
    </div>
  )

  const mobielIndex = dagen.indexOf(mobielDag)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Weekstaat · week {weekNummer(maandag)}</CardTitle>
            <span className="text-sm text-muted-foreground">{datumKort(maandag)} t/m {datumKort(zondag)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusKop}
            <Button variant="outline" size="icon" className="h-11 w-11 md:h-9 md:w-9" aria-label="Vorige week" onClick={() => onWeekOffsetChange(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onWeekOffsetChange(0)} className={cn('h-11 md:h-9', weekOffset === 0 && 'bg-primary text-primary-foreground')}>
              Vandaag
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 md:h-9 md:w-9" aria-label="Volgende week" onClick={() => onWeekOffsetChange(weekOffset + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!eigenMedewerker || isPseudoMedewerker(eigenMedewerker.id)) && (
          <p className="text-sm text-muted-foreground">Je account is nog niet aan een medewerker gekoppeld. Uren worden op je gebruiker geschreven.</p>
        )}

        {/* Desktop: raster */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-3 font-medium text-muted-foreground">Project · bewerking</th>
                {zichtbareDagen.map((d, i) => (
                  <th key={d} className={cn('pb-2 px-1 text-center font-medium w-[88px]', d === vandaag ? 'text-petrol' : 'text-muted-foreground')}>
                    <div>{DAG_KORT[i]}</div>
                    <div className="text-2xs font-normal">{datumKort(d)}</div>
                  </th>
                ))}
                <th className="pb-2 pl-2 text-right font-medium text-muted-foreground w-[72px]">Totaal</th>
                <th className="pb-2 pl-1 w-[36px]">
                  <button type="button" onClick={() => setWeekendOpen((v) => !v)} className="text-muted-foreground hover:text-foreground" title={weekendOpen ? 'Weekend inklappen' : 'Weekend tonen'} aria-label={weekendOpen ? 'Weekend inklappen' : 'Weekend tonen'}>
                    {weekendOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rijen.length === 0 && (
                <tr><td colSpan={zichtbareDagen.length + 3} className="py-6 text-center text-sm text-muted-foreground">Nog geen regels deze week. Voeg hieronder een project toe.</td></tr>
              )}
              {rijen.map((rij) => {
                const rijTotaal = dagen.reduce((s, d) => s + celMinuten(rij, d), 0)
                return (
                  <tr key={rij.sleutel} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 max-w-[260px]">{rijLabel(rij)}</td>
                    {zichtbareDagen.map((d) => <td key={d} className="py-1.5 px-1">{renderCel(rij, d)}</td>)}
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums font-medium">{rijTotaal > 0 ? formatUren(rijTotaal) : '-'}</td>
                    <td />
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="pt-2 pr-3 text-sm font-medium">Dagtotaal</td>
                {zichtbareDagen.map((d, i) => (
                  <td key={d} className="pt-2 px-1 text-center">
                    <div className="font-mono tabular-nums font-semibold">{dagTotalen[i] > 0 ? formatUren(dagTotalen[i]) : '-'}</div>
                    {renderNorm(i)}
                  </td>
                ))}
                <td className="pt-2 pl-2 text-right"><Badge className="font-mono">{formatUren(weekTotaal)}</Badge></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobiel: één dag per scherm */}
        <div className="md:hidden space-y-3">
          <div className="flex gap-1 overflow-x-auto -mx-4 px-4 [scrollbar-width:none]">
            {dagen.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setMobielDag(d)}
                className={cn(
                  'flex h-11 min-w-[52px] flex-col items-center justify-center rounded-lg border px-2 text-xs',
                  d === mobielDag ? 'border-petrol bg-petrol text-white' : 'border-border bg-card text-foreground',
                  d === vandaag && d !== mobielDag && 'border-petrol/60',
                )}
              >
                <span className="font-medium">{DAG_KORT[i]}</span>
                <span className={cn('font-mono tabular-nums', d === mobielDag ? 'text-white/80' : 'text-muted-foreground')}>{dagTotalen[i] > 0 ? formatUren(dagTotalen[i]) : '-'}</span>
              </button>
            ))}
          </div>
          <p className="text-sm font-medium">{new Date(mobielDag + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {rijen.length === 0 && <p className="text-sm text-muted-foreground">Nog geen regels deze week. Voeg hieronder een project toe.</p>}
          {rijen.map((rij) => (
            <div key={rij.sleutel} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              {rijLabel(rij)}
              {renderCel(rij, mobielDag, true)}
            </div>
          ))}
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="font-medium">Dagtotaal</span>
            <div className="flex items-center gap-2">
              {mobielIndex >= 0 && renderNorm(mobielIndex, true)}
              <Badge className="font-mono">{mobielIndex >= 0 ? formatUren(dagTotalen[mobielIndex]) : '-'}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>Week {weekNummer(maandag)}</span>
            <span className="font-mono tabular-nums">{formatUren(weekTotaal)} uur</span>
          </div>
        </div>

        {nieuweRij}
      </CardContent>
    </Card>
  )
}
