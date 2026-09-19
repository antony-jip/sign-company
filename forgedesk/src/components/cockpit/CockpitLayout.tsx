import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { getStatusLabel } from '@/utils/statusColors'
import { useFunctie } from '@/hooks/useFunctie'
import type { AuditLogEntry } from '@/types'
import {
  abonneerCockpit,
  getCockpitActiviteit,
  getCockpitOverzicht,
  type CockpitOverzicht,
  type CockpitPeriode,
  type CockpitSignaal,
  type CockpitSignaalSoort,
} from '@/services/cockpitService'

// De cockpit: één scherm waar samenkomt wat er in het bedrijf gebeurt. Alleen
// voor beheerders (profiles.rol = admin); de route stuurt anderen terug naar
// het dashboard en het menu-item bestaat voor hen niet.
//
// Vijf lagen, van urgent naar achtergrond: verdient aandacht, cijfers, nu,
// wat er gebeurt, systeem. Alle bedragen ex btw (zie btwWeergave.ts).

const VERVERS_MS = 120_000
const PERIODE_KEY = 'doen_cockpit_periode'
// Kleuren via de status-tokens, zodat de stippen in dark mode meekleuren.
const KLEUR = { rood: 'var(--status-flame-text)', amber: 'var(--status-amber-text)', groen: 'var(--status-green-text)' }

const PERIODES: { id: CockpitPeriode; label: string }[] = [
  { id: 'maand', label: 'Deze maand' },
  { id: 'kwartaal', label: 'Dit kwartaal' },
  { id: 'jaar', label: 'Dit jaar' },
  { id: 'twaalf_maanden', label: 'Laatste 12 maanden' },
]

interface SignaalGroep {
  id: string
  titel: string
  uitleg: string
  href: string
  /** Waar "Naar …" heen gaat, in woorden. */
  module: string
  urgent?: boolean
  rijen: CockpitSignaal[]
  /** Wat er rechts van de titel staat: dagen, bedrag of iets specifieks. */
  meta: (s: CockpitSignaal) => string
}

const dagenTekst = (n: number | null | undefined, enkel = 'dag', meer = 'dagen') =>
  n == null ? '' : `${n} ${Math.abs(n) === 1 ? enkel : meer}`

function detailGetal(s: CockpitSignaal, sleutel: string): number {
  const v = s.detail[sleutel]
  return typeof v === 'number' ? v : 0
}

/**
 * De signalen uit de RPC gegroepeerd zoals een beheerder ze leest: eerst wat
 * geld of een klant kost als je het laat liggen, daarna het huishoudelijke.
 */
function groepeer(signalen: CockpitSignaal[]): SignaalGroep[] {
  const van = (soort: CockpitSignaalSoort) => signalen.filter((s) => s.soort === soort)
  const offertes = van('offerte_wacht')
  const facturen = van('factuur_open')
  const verlooptBinnenkort = (s: CockpitSignaal) => {
    const tot = s.detail.verloopt_op
    return typeof tot === 'string' && (new Date(tot).getTime() - Date.now()) / 864e5 <= 7
  }
  const groepen: SignaalGroep[] = [
    {
      id: 'facturen_vervallen',
      titel: 'Facturen te laat',
      uitleg: 'Vervaldatum voorbij, nog niet betaald',
      href: '/facturen',
      module: 'facturen',
      urgent: true,
      rijen: facturen.filter((s) => (s.dagen ?? 0) > 0).sort((a, b) => (b.dagen ?? 0) - (a.dagen ?? 0)),
      meta: (s) => `${dagenTekst(s.dagen)} te laat`,
    },
    {
      id: 'offertes_verlopen',
      titel: 'Offertes (bijna) verlopen',
      uitleg: 'Geldigheid verstreken of binnen 7 dagen, zonder akkoord',
      href: '/offertes',
      module: 'offertes',
      urgent: true,
      rijen: offertes.filter(verlooptBinnenkort),
      meta: (s) => (s.detail.verlopen ? 'verlopen' : `verloopt ${new Date(String(s.detail.verloopt_op)).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`),
    },
    {
      id: 'offertes_wachten',
      titel: 'Offertes wachten op de klant',
      uitleg: 'Verstuurd, al een week of langer geen antwoord',
      href: '/offertes',
      module: 'offertes',
      rijen: offertes.filter((s) => (s.dagen ?? 0) >= 7 && !verlooptBinnenkort(s)).sort((a, b) => (b.dagen ?? 0) - (a.dagen ?? 0)),
      meta: (s) => {
        const keer = detailGetal(s, 'keer_bekeken')
        const extra = s.detail.status === 'wijziging_gevraagd' ? ' · wijziging gevraagd' : keer >= 3 ? ` · ${keer}× bekeken` : ''
        return `${dagenTekst(s.dagen)} open${extra}`
      },
    },
    {
      id: 'offertes_check',
      titel: 'Collega-checks open',
      uitleg: 'Een offerte wacht op een tweede paar ogen',
      href: '/offertes',
      module: 'offertes',
      rijen: van('offerte_check'),
      meta: (s) => `${dagenTekst(s.dagen)} geleden gevraagd`,
    },
    {
      id: 'facturen_vervalt',
      titel: 'Vervalt deze week',
      uitleg: 'Facturen die nog niet betaald zijn, vervaldatum binnen 7 dagen',
      href: '/facturen',
      module: 'facturen',
      rijen: facturen.filter((s) => s.dagen != null && s.dagen <= 0 && s.dagen >= -7),
      meta: (s) => (s.dagen === 0 ? 'vervalt vandaag' : `vervalt over ${dagenTekst(-(s.dagen ?? 0))}`),
    },
    {
      id: 'peppol',
      titel: 'Peppol-verzending mislukt',
      uitleg: 'De e-factuur is niet afgeleverd',
      href: '/facturen',
      module: 'facturen',
      urgent: true,
      rijen: van('factuur_peppol_mislukt'),
      meta: (s) => String(s.detail.fout ?? 'onbekende fout').slice(0, 60),
    },
    {
      id: 'werkbonnen',
      titel: 'Werkbonnen klaar om te factureren',
      uitleg: 'Afgerond, nog geen factuur',
      href: '/werkbonnen',
      module: 'werkbonnen',
      rijen: van('werkbon_te_factureren'),
      meta: (s) => `${dagenTekst(s.dagen)} geleden afgerond`,
    },
    {
      id: 'portaal',
      titel: 'Portaal wacht op de klant',
      uitleg: 'Tekening, offerte of opdrachtbevestiging verstuurd, nog geen reactie',
      href: '/portalen',
      module: 'portalen',
      rijen: van('portaal_wacht'),
      meta: (s) => `${String(s.detail.type)} · ${s.detail.status === 'bekeken' ? 'bekeken' : 'nog niet geopend'} · ${dagenTekst(s.dagen)}`,
    },
    {
      id: 'projecten_planning',
      titel: 'Projecten zonder planning',
      uitleg: 'Akkoord van de klant, nog geen montage ingepland',
      href: '/planning',
      module: 'planning',
      rijen: van('project_zonder_planning'),
      meta: (s) => String(s.detail.status),
    },
    {
      id: 'projecten_deadline',
      titel: 'Deadlines deze week',
      uitleg: 'Einddatum binnen 7 dagen of al voorbij',
      href: '/projecten',
      module: 'projecten',
      rijen: van('project_deadline').sort((a, b) => (a.dagen ?? 0) - (b.dagen ?? 0)),
      meta: (s) => ((s.dagen ?? 0) < 0 ? `${dagenTekst(-(s.dagen ?? 0))} over tijd` : s.dagen === 0 ? 'vandaag' : `nog ${dagenTekst(s.dagen)}`),
    },
    {
      id: 'projecten_budget',
      titel: 'Projecten bij of over budget',
      uitleg: 'Besteed bereikt de waarschuwingsgrens',
      href: '/projecten',
      module: 'projecten',
      rijen: van('project_over_budget'),
      meta: (s) => `${formatCurrency(detailGetal(s, 'besteed'))} van ${formatCurrency(detailGetal(s, 'budget'))}`,
    },
    {
      id: 'inkoop',
      titel: 'Inkoopfacturen wachten op review',
      uitleg: 'Binnengekomen, nog niet goedgekeurd',
      href: '/facturen?tab=inkoop',
      module: 'inkoop',
      rijen: van('inkoop_review'),
      meta: (s) => `${dagenTekst(s.dagen)} geleden${s.detail.vertrouwen === 'laag' ? ' · uitlezen onzeker' : ''}`,
    },
    {
      id: 'montages',
      titel: 'Montages niet afgerond',
      uitleg: 'Stonden gepland, nooit op afgerond gezet',
      href: '/planning',
      module: 'planning',
      rijen: van('montage_niet_afgerond'),
      meta: (s) => `${dagenTekst(s.dagen)} geleden gepland`,
    },
  ]
  return groepen.filter((g) => g.rijen.length > 0)
}

function Etiket({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
}

function Kop({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[18px] font-bold tracking-[-0.3px] text-foreground">{children}</h2>
  )
}

function Tegel({ label, waarde, sub, dot }: { label: string; waarde: string; sub?: string; dot?: string }) {
  return (
    <div className="doen-slate-surface rounded-xl px-5 py-4">
      <span className="inline-flex items-center gap-2">
        {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />}
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
      </span>
      <p className="mt-2 font-mono text-[18px] font-bold leading-none tabular-nums text-foreground md:text-[22px]">{waarde}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function SignaalKaart({ groep }: { groep: SignaalGroep }) {
  const [alles, setAlles] = useState(false)
  const rijen = alles ? groep.rijen : groep.rijen.slice(0, 5)
  return (
    <section className="doen-slate-surface rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foreground">
            {groep.urgent && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-flame align-middle" />}
            {groep.titel}
            <span className="ml-2 font-mono text-[13px] font-semibold text-muted-foreground">{groep.rijen.length}</span>
          </p>
          <p className="text-xs text-muted-foreground">{groep.uitleg}</p>
        </div>
        <Link to={groep.href} className="shrink-0 text-xs font-medium text-petrol underline-offset-4 hover:underline">
          Naar {groep.module}
        </Link>
      </div>
      <ul className="mt-2 space-y-0.5">
        {rijen.map((s) => (
          <li key={`${s.soort}-${s.id}`}>
            {/* Op een telefoon staat de toelichting onder de titel; vanaf sm op één regel. */}
            <Link to={s.href} className="-mx-2 flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="min-w-0 flex-1 truncate">
                <span className="text-foreground">{s.titel}</span>
                {s.klant && <span className="text-muted-foreground"> · {s.klant}</span>}
              </span>
              <span className="flex items-baseline justify-between gap-3 sm:contents">
                <span className="shrink-0 text-xs text-muted-foreground">{groep.meta(s)}</span>
                {s.bedrag != null && s.bedrag !== 0 && (
                  <span className="shrink-0 text-right font-mono text-sm tabular-nums text-foreground sm:w-28">{formatCurrency(s.bedrag)}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {groep.rijen.length > 5 && (
        <button type="button" onClick={() => setAlles((v) => !v)} className="mt-2 text-xs font-medium text-petrol underline-offset-4 hover:underline">
          {alles ? 'Minder tonen' : `Alle ${groep.rijen.length} tonen`}
        </button>
      )}
    </section>
  )
}

const ENTITY_LABEL: Record<string, string> = {
  taak: 'taak', project: 'project', offerte: 'offerte', factuur: 'factuur', klant: 'klant', werkbon: 'werkbon', montage: 'montage',
}
const ACTIE_LABEL: Record<string, string> = {
  aangemaakt: 'maakte een', gewijzigd: 'wijzigde een', verwijderd: 'verwijderde een', verstuurd: 'verstuurde een',
}

function activiteitTekst(a: AuditLogEntry): string {
  if (a.omschrijving) return a.omschrijving
  const wat = ENTITY_LABEL[a.entity_type] ?? a.entity_type
  if (a.actie === 'status_gewijzigd' && a.nieuwe_waarde) return `zette een ${wat} op ${getStatusLabel(a.nieuwe_waarde).toLowerCase()}`
  if (a.actie === 'goedgekeurd') return `keurde een ${wat} goed`
  return `${ACTIE_LABEL[a.actie] ?? a.actie} ${wat}`
}

const ENTITY_HREF: Record<string, (id: string) => string> = {
  offerte: (id) => `/offertes/${id}/detail`,
  factuur: (id) => `/facturen/${id}`,
  project: (id) => `/projecten/${id}`,
  werkbon: (id) => `/werkbonnen/${id}`,
  klant: (id) => `/klanten/${id}`,
}

function tijdTekst(iso: string): string {
  const d = new Date(iso)
  const vandaag = new Date().toDateString() === d.toDateString()
  return vandaag
    ? d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function duurSinds(iso: string, nu: number): string {
  const min = Math.max(0, Math.floor((nu - new Date(iso).getTime()) / 60000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}u${String(min % 60).padStart(2, '0')}`
}

export function CockpitLayout() {
  const { isAdmin, isLoading } = useAuth()
  const bezettingAan = useFunctie('planning_bezetting')
  const [periode, setPeriodeState] = useState<CockpitPeriode>(() => {
    try {
      const bewaard = localStorage.getItem(PERIODE_KEY)
      return PERIODES.some((p) => p.id === bewaard) ? (bewaard as CockpitPeriode) : 'maand'
    } catch { return 'maand' }
  })
  const setPeriode = (p: CockpitPeriode) => {
    setPeriodeState(p)
    try { localStorage.setItem(PERIODE_KEY, p) } catch { /* privémodus */ }
  }
  const [data, setData] = useState<CockpitOverzicht | null>(null)
  const [activiteit, setActiviteit] = useState<AuditLogEntry[]>([])
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(true)
  const [nu, setNu] = useState(Date.now())

  const laad = useCallback(async () => {
    try {
      const [overzicht, feed] = await Promise.all([getCockpitOverzicht(periode), getCockpitActiviteit(40)])
      setData(overzicht)
      setActiviteit(feed)
      setFout(null)
    } catch (err) {
      logger.error('Cockpit laden mislukt:', err)
      setFout(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setBezig(false)
    }
  }, [periode])

  useEffect(() => {
    if (!isAdmin) return
    setBezig(true)
    void laad()
    // Tien afgevinkte taken zijn tien audit-regels; één herlaad na de laatste.
    let timer: ReturnType<typeof setTimeout> | null = null
    const stop = abonneerCockpit(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void laad() }, 2000)
    })
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void laad() }, VERVERS_MS)
    const tik = setInterval(() => setNu(Date.now()), 30_000)
    return () => { stop(); if (timer) clearTimeout(timer); clearInterval(interval); clearInterval(tik) }
  }, [isAdmin, laad])

  const groepen = useMemo(() => (data ? groepeer(data.signalen) : []), [data])

  // AuthContext zet de rol vóór isLoading op false gaat; tot die tijd niets
  // renderen, daarna is "geen admin" een zekere uitspraak.
  if (isLoading) return null
  if (!isAdmin) return <Navigate to="/" replace />

  const c = data?.cijfers
  const marge = c ? c.gefactureerd - c.inkoop : 0
  const conversiePct = c && c.conversie.totaal > 0 ? Math.round((c.conversie.gewonnen / c.conversie.totaal) * 100) : null
  const ouderdom = c?.ouderdom
  const ouderdomTotaal = ouderdom ? ouderdom.nog_niet_vervallen + ouderdom.d1_30 + ouderdom.d31_60 + ouderdom.d61_90 + ouderdom.d90_plus : 0
  const maandData = (c?.per_maand ?? []).map((m) => ({
    maand: new Date(`${m.maand}-01`).toLocaleDateString('nl-NL', { month: 'short' }),
    Gefactureerd: Math.round(m.gefactureerd),
    Ontvangen: Math.round(m.ontvangen),
    Inkoop: Math.round(m.inkoop),
  }))
  const signaalAantal = groepen.reduce((n, g) => n + g.rijen.length, 0)
  const urgentAantal = groepen.filter((g) => g.urgent).reduce((n, g) => n + g.rijen.length, 0)
  const s = data?.systeem
  const trialDagen = s?.organisatie?.trial_einde ? Math.ceil((new Date(s.organisatie.trial_einde).getTime() - nu) / 864e5) : null

  return (
    <div className="space-y-10">
      <div className="space-y-10">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-foreground">
              Cockpit<span className="text-flame">.</span>
            </h1>
            <span className="doen-subtitel">
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}<span className="text-flame">.</span>
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm" aria-label="Periode">
            {PERIODES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriode(p.id)}
                className={periode === p.id ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </header>

        {bezig && !data && (
          <div className="flex items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-petrol" />
            Cockpit laden…
          </div>
        )}
        {fout && (
          <div>
            <p className="text-sm text-foreground">
              De cockpit kon niet laden. Staat migratie 259 al in de database?{' '}
              <button type="button" onClick={() => { setBezig(true); void laad() }} className="font-medium text-petrol underline-offset-4 hover:underline">Opnieuw proberen</button>
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{fout}</p>
          </div>
        )}
        {data === null && !bezig && !fout && (
          <p className="text-sm text-muted-foreground">Geen gegevens: de cockpit is alleen voor beheerders.</p>
        )}

        {data && c && (
          <>
            {/* ── Verdient aandacht ── */}
            <section className="space-y-4">
              <div className="flex items-baseline gap-3">
                <Kop>Verdient aandacht</Kop>
                <span className="text-sm text-muted-foreground">
                  {groepen.length === 0 ? 'Niets open' : `${signaalAantal} signalen${urgentAantal ? `, ${urgentAantal} urgent` : ''}`}
                </span>
              </div>
              {groepen.length > 0 && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {groepen.map((g) => <SignaalKaart key={g.id} groep={g} />)}
                </div>
              )}
            </section>

            {/* ── Cijfers ── */}
            <section className="space-y-4">
              <div className="flex items-baseline gap-3">
                <Kop>Cijfers</Kop>
                <span className={`text-sm text-muted-foreground transition-opacity ${bezig ? 'opacity-50' : ''}`}>ex btw · {PERIODES.find((p) => p.id === periode)?.label.toLowerCase()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <Tegel label="Pijplijn" waarde={formatCurrency(c.pijplijn)} sub={`${c.pijplijn_aantal} offertes wachten`} dot="#D24620" />
                <Tegel label="Gefactureerd" waarde={formatCurrency(c.gefactureerd)} sub="op factuurdatum" dot={KLEUR.groen} />
                <Tegel label="Ontvangen" waarde={formatCurrency(c.ontvangen)} sub="op betaaldatum" dot={KLEUR.groen} />
                <Tegel label="Openstaand" waarde={formatCurrency(c.openstaand)} sub={`${c.openstaand_aantal} facturen open`} dot={ouderdom && ouderdom.d90_plus > 0 ? KLEUR.rood : KLEUR.amber} />
                <Tegel label="Marge" waarde={formatCurrency(marge)} sub={`gefactureerd min inkoop (${formatCurrency(c.inkoop)})`} dot={marge >= 0 ? KLEUR.groen : KLEUR.rood} />
                <Tegel label="Conversie" waarde={conversiePct != null ? `${conversiePct}%` : '—'} sub={`${c.conversie.gewonnen} van ${c.conversie.totaal} aangemaakt in de periode`} dot={KLEUR.amber} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="doen-slate-surface rounded-xl p-5 lg:col-span-2">
                  <Etiket>Per maand · laatste 12</Etiket>
                  <div className="mt-3 h-[220px]">
                    {maandData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nog geen facturen.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={maandData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="maand" stroke="hsl(var(--border))" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis stroke="hsl(var(--border))" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} width={36} />
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
                          <Bar dataKey="Gefactureerd" fill="#2D6B48" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Ontvangen" fill="#2D6B48" fillOpacity={0.45} radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Inkoop" fill="#C44830" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="doen-slate-surface rounded-xl p-5">
                  <Etiket>Openstaand naar ouderdom</Etiket>
                  {ouderdom && ouderdomTotaal > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {[
                        ['Nog niet vervallen', ouderdom.nog_niet_vervallen, KLEUR.amber],
                        ['1–30 dagen', ouderdom.d1_30, KLEUR.amber],
                        ['31–60 dagen', ouderdom.d31_60, KLEUR.rood],
                        ['61–90 dagen', ouderdom.d61_90, KLEUR.rood],
                        ['Ouder dan 90', ouderdom.d90_plus, KLEUR.rood],
                      ].map(([label, bedrag, kleur]) => (
                        <li key={String(label)}>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono tabular-nums text-foreground">{formatCurrency(Number(bedrag))}</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-muted">
                            <div className="h-1 rounded-full" style={{ width: `${Math.round((Number(bedrag) / ouderdomTotaal) * 100)}%`, backgroundColor: String(kleur) }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Niets openstaand.</p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Nu ── */}
            <section className="space-y-4">
              <Kop>Nu</Kop>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="doen-slate-surface rounded-xl p-5">
                  <Etiket>Ingeklokt · {data.nu.ingeklokt.length}</Etiket>
                  {data.nu.ingeklokt.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Niemand is ingeklokt.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {data.nu.ingeklokt.map((k) => (
                        <li key={k.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate">
                            <span className="text-foreground">{k.medewerker || 'Onbekend'}</span>
                            <span className="text-muted-foreground"> · </span>
                            <Link to={`/projecten/${k.project_id}`} className="text-petrol hover:underline">{k.project || 'Onbekend project'}</Link>
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{duurSinds(k.sinds, nu)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="doen-slate-surface rounded-xl p-5">
                  <Etiket>Montage vandaag · {data.nu.montages_vandaag.length}</Etiket>
                  {data.nu.montages_vandaag.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">Geen montages vandaag{data.nu.montages_week ? `; ${data.nu.montages_week} deze week` : ''}.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {data.nu.montages_vandaag.map((m) => (
                        <li key={m.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate">
                            <span className="font-mono text-xs text-muted-foreground">{m.start ? String(m.start).slice(0, 5) : '—'}</span>{' '}
                            <span className="text-foreground">{m.titel}</span>
                            {m.klant && <span className="text-muted-foreground"> · {m.klant}</span>}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{(m.monteurs ?? []).join(', ') || getStatusLabel(m.status)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="doen-slate-surface rounded-xl p-5">
                  <Etiket>Team</Etiket>
                  <p className="mt-3 text-sm text-foreground">
                    <span className="font-mono tabular-nums">{data.nu.team_actief}</span> actief
                    {data.nu.uitnodigingen_open > 0 && <span className="text-muted-foreground"> · {data.nu.uitnodigingen_open} uitnodiging{data.nu.uitnodigingen_open === 1 ? '' : 'en'} open</span>}
                  </p>
                  {data.nu.afwezig_vandaag.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {data.nu.afwezig_vandaag.map((a, i) => (
                        <li key={`${a.medewerker}-${i}`}>{a.medewerker} · {a.type}{a.tot ? ` t/m ${new Date(a.tot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}` : ''}</li>
                      ))}
                    </ul>
                  )}
                  {bezettingAan && (
                    <Link to="/team?tab=bezetting" className="mt-3 inline-block text-xs font-medium text-petrol underline-offset-4 hover:underline">Bezetting 4 weken</Link>
                  )}
                </div>
              </div>
            </section>

            {/* ── Wat er gebeurt ── */}
            <section className="space-y-4">
              <div className="flex items-baseline gap-3">
                <Kop>Wat er gebeurt</Kop>
                <span className="text-sm text-muted-foreground">wie deed wat, live</span>
              </div>
              <div className="doen-slate-surface rounded-xl p-5">
                {activiteit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {activiteit.map((a) => {
                      const naar = ENTITY_HREF[a.entity_type]?.(a.entity_id)
                      const inhoud = (
                        <>
                          <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{tijdTekst(a.created_at)}</span>
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-foreground">{a.medewerker_naam || 'Iemand'}</span>{' '}
                            <span className="text-muted-foreground">{activiteitTekst(a)}</span>
                          </span>
                        </>
                      )
                      return (
                        <li key={a.id}>
                          {naar && a.actie !== 'verwijderd'
                            ? <Link to={naar} className="-mx-2 flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40">{inhoud}</Link>
                            : <div className="-mx-2 flex items-baseline gap-3 px-2 py-1.5 text-sm">{inhoud}</div>}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* ── Systeem ── */}
            {s && (
              <section className="space-y-4">
                <Kop>Systeem</Kop>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Tegel label="Exact-sync fouten" waarde={String(s.exact_sync_fouten)} sub="facturen die niet meekwamen" dot={s.exact_sync_fouten ? KLEUR.rood : KLEUR.groen} />
                  <Tegel label="Herinneringen mislukt" waarde={String(s.herinnering_fouten_14d)} sub="laatste 14 dagen" dot={s.herinnering_fouten_14d ? KLEUR.rood : KLEUR.groen} />
                  <Tegel
                    label="Daan nachtploeg"
                    waarde={s.laatste_nachtploeg ? (s.laatste_nachtploeg.status === 'klaar' ? 'klaar' : s.laatste_nachtploeg.status) : '—'}
                    sub={s.laatste_nachtploeg?.fout
                      ? s.laatste_nachtploeg.fout.slice(0, 40)
                      : s.laatste_nachtploeg?.klaar_op
                        ? `${tijdTekst(s.laatste_nachtploeg.klaar_op)}${s.laatste_nachtploeg.voorstellen ? ` · ${s.laatste_nachtploeg.voorstellen} voorstellen` : ''}`
                        : 'nog niet gedraaid'}
                    dot={s.laatste_nachtploeg?.fout ? KLEUR.rood : KLEUR.groen}
                  />
                  <Tegel
                    label="Abonnement"
                    waarde={s.organisatie?.abonnement_status ?? '—'}
                    sub={s.organisatie?.abonnement_status === 'trial' && trialDagen != null ? `nog ${trialDagen} dagen` : undefined}
                    dot={s.organisatie?.abonnement_status === 'trial' && trialDagen != null && trialDagen <= 7 ? KLEUR.rood : KLEUR.groen}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CockpitLayout
