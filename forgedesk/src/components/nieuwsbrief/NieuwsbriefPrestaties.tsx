import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, UserMinus, AlertTriangle, Flame, ShieldCheck, ShieldAlert } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  getVerzendReeks, getAfmeldRedenen, getAdresProblemen, getBetrokkenheid, getDomeinStatus,
  AFMELD_REDEN_LABEL,
  type VerzendingSamenvatting, type AfmeldReden, type AdresProbleem, type Betrokkenheid, type DomeinStatus,
} from '@/services/nieuwsbriefService'

// Twee reeksen, beide een percentage, dus één as. De stappen zijn apart gekozen
// voor licht en donker (niet omgeklapt) en gecontroleerd op kleurenblind-afstand.
const SERIE_OPEN_LICHT = '#3A5A9A'
const SERIE_KLIK_LICHT = '#F15025'
const SERIE_OPEN_DONKER = '#5F8AD6'
const SERIE_KLIK_DONKER = '#E8613A'

interface Punt {
  naam: string
  onderwerp: string
  datum: string
  geopend: number | null
  geklikt: number | null
}

function gemiddelde(waarden: (number | null)[]): number | null {
  const echt = waarden.filter((w): w is number => w !== null)
  if (echt.length === 0) return null
  return echt.reduce((a, b) => a + b, 0) / echt.length
}

function pct(waarde: number | null): string {
  return waarde === null ? '—' : `${waarde.toFixed(waarde < 10 ? 1 : 0)}%`
}

function gebruiktDonker(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function NieuwsbriefPrestaties() {
  const [reeks, setReeks] = useState<VerzendingSamenvatting[]>([])
  const [redenen, setRedenen] = useState<AfmeldReden[]>([])
  const [problemen, setProblemen] = useState<AdresProbleem[]>([])
  const [warm, setWarm] = useState<Betrokkenheid[]>([])
  const [domein, setDomein] = useState<DomeinStatus | null>(null)
  const [laden, setLaden] = useState(true)
  const [donker, setDonker] = useState(gebruiktDonker)

  useEffect(() => {
    const kijker = new MutationObserver(() => setDonker(gebruiktDonker()))
    kijker.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => kijker.disconnect()
  }, [])

  useEffect(() => {
    let actief = true
    Promise.all([getVerzendReeks(8), getAfmeldRedenen(), getAdresProblemen(), getBetrokkenheid()])
      .then(([r, a, p, b]) => {
        if (!actief) return
        setReeks(r)
        setRedenen(a)
        setProblemen(p)
        setWarm(b.filter(x => x.score >= 4).slice(0, 6))
      })
      .catch(err => console.error('[nieuwsbrief] prestaties laden mislukt:', err))
      .finally(() => { if (actief) setLaden(false) })
    return () => { actief = false }
  }, [])

  useEffect(() => {
    let actief = true
    getDomeinStatus()
      .then(d => { if (actief) setDomein(d) })
      .catch(err => console.error('[nieuwsbrief] domeincheck mislukt:', err))
    return () => { actief = false }
  }, [])

  // De bezorgbaarheidskaart is juist vóór de eerste verzending het nuttigst,
  // dus die hangt niet aan het bestaan van een reeks.
  if (laden && !domein) return null
  if (reeks.length === 0 && !domein) return null
  const heeftReeks = reeks.length > 0

  const kleurOpen = donker ? SERIE_OPEN_DONKER : SERIE_OPEN_LICHT
  const kleurKlik = donker ? SERIE_KLIK_DONKER : SERIE_KLIK_LICHT

  const punten: Punt[] = reeks.map((v, i) => ({
    naam: `${i + 1}`,
    onderwerp: v.onderwerp,
    datum: v.verzondenOp ? formatDate(v.verzondenOp) : '',
    geopend: v.percentages.geopend,
    geklikt: v.percentages.geklikt,
  }))

  const gemOpen = gemiddelde(punten.map(p => p.geopend))
  const gemKlik = gemiddelde(punten.map(p => p.geklikt))
  const hardeProblemen = problemen.filter(p => p.hard)

  return (
    <section className="space-y-3">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" /> Hoe je nieuwsbrief het doet
      </div>

      <div className={heeftReeks ? 'grid gap-3 lg:grid-cols-3' : 'grid gap-3 lg:max-w-sm'}>
        {heeftReeks && (
        <div className="doen-slate-surface rounded-2xl p-5 lg:col-span-2">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-heading text-[15px] font-bold text-foreground">
              Laatste {reeks.length} verzendingen<span className="text-flame">.</span>
            </span>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
              gemiddeld {pct(gemOpen)} geopend · {pct(gemKlik)} geklikt
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={punten} margin={{ top: 12, right: 16, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="naam"
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--border))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                  width={46}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(_l, nutslading) => {
                    const p = nutslading?.[0]?.payload as Punt | undefined
                    return p ? `${p.onderwerp}${p.datum ? ` · ${p.datum}` : ''}` : ''
                  }}
                  formatter={(waarde: number, naam: string) => [`${Math.round(waarde)}%`, naam]}
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="geopend"
                  name="Geopend"
                  stroke={kleurOpen}
                  strokeWidth={2}
                  strokeLinecap="round"
                  dot={{ r: 4, fill: kleurOpen, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="geklikt"
                  name="Geklikt"
                  stroke={kleurKlik}
                  strokeWidth={2}
                  strokeLinecap="round"
                  dot={{ r: 4, fill: kleurKlik, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Van links naar rechts: oudste tot nieuwste verzending. Beweeg over een punt voor het onderwerp.
          </p>
        </div>
        )}

        <div className="space-y-3">
          {warm.length > 0 && (
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="mb-2.5 inline-flex items-center gap-2">
                <Flame className="h-[18px] w-[18px] text-flame" strokeWidth={1.75} />
                <span className="font-heading text-[14px] font-bold text-foreground">
                  Warm<span className="text-flame">.</span>
                </span>
              </div>
              <ul className="space-y-1.5">
                {warm.map(w => (
                  <li key={w.email} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-foreground">{w.bedrijfsnaam || w.naam || w.email}</span>
                    <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                      {w.geklikt}× klik
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Openen en klikken elke keer. Die kun je bellen.
              </p>
            </div>
          )}

          {redenen.length > 0 && (
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="mb-2.5 inline-flex items-center gap-2">
                <UserMinus className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
                <span className="font-heading text-[14px] font-bold text-foreground">
                  Waarom ze weggaan<span className="text-flame">.</span>
                </span>
              </div>
              <ul className="space-y-1.5">
                {redenen.slice(0, 5).map(r => (
                  <li key={r.reden} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-foreground">{AFMELD_REDEN_LABEL[r.reden] ?? r.reden}</span>
                    <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{r.aantal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {domein && <Bezorgbaarheid domein={domein} />}

          {hardeProblemen.length > 0 && (
            <div className="doen-slate-surface rounded-2xl p-5">
              <div className="mb-2.5 inline-flex items-center gap-2">
                <AlertTriangle className="h-[18px] w-[18px] text-[#C0451A]" strokeWidth={1.75} />
                <span className="font-heading text-[14px] font-bold text-foreground">
                  Uit de lijst<span className="text-flame">.</span>
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                <strong className="font-mono tabular-nums text-foreground">{hardeProblemen.length}</strong> adressen
                bouncen permanent of meldden spam. Die slaan we voortaan over, zodat de rest wel aankomt.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Vier dingen die stil kapot kunnen zijn: authenticatie van het domein, en of
// Resend opens en kliks doorgeeft. Staat dat laatste uit, dan blijven alle
// cijfers hierboven nul zonder dat iets dat vertelt.
function Bezorgbaarheid({ domein }: { domein: DomeinStatus }) {
  const rijen = [
    { label: 'SPF', goed: domein.spf === 'verified', tekst: domein.spf ?? 'niet ingesteld' },
    { label: 'DKIM', goed: domein.dkim === 'verified', tekst: domein.dkim ?? 'niet ingesteld' },
    {
      label: 'DMARC',
      goed: domein.dmarc.aanwezig,
      tekst: domein.dmarc.aanwezig ? `p=${domein.dmarc.beleid ?? 'none'}` : 'niet gevonden',
    },
    { label: 'Open-tracking', goed: !!domein.openTracking, tekst: domein.openTracking ? 'aan' : 'uit' },
    { label: 'Klik-tracking', goed: !!domein.klikTracking, tekst: domein.klikTracking ? 'aan' : 'uit' },
    { label: 'Webhook', goed: domein.webhookIngesteld, tekst: domein.webhookIngesteld ? 'ingesteld' : 'ontbreekt' },
  ]
  const alles = rijen.every(r => r.goed)
  const Icon = alles ? ShieldCheck : ShieldAlert

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="mb-2.5 inline-flex items-center gap-2">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} style={{ color: alles ? '#3A7D52' : '#B7791F' }} />
        <span className="font-heading text-[14px] font-bold text-foreground">
          Komt het aan<span className="text-flame">?</span>
        </span>
      </div>
      <ul className="space-y-1.5">
        {rijen.map(r => (
          <li key={r.label} className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-foreground">{r.label}</span>
            <span
              className="flex-shrink-0 font-mono text-[12px] tabular-nums"
              style={{ color: r.goed ? '#3A7D52' : '#B7791F' }}
            >
              {r.tekst}
            </span>
          </li>
        ))}
      </ul>
      {!alles && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          Wat hier oranje staat, kost je bezorging of cijfers. Tracking en webhook zet je aan bij Resend, DMARC in je DNS.
        </p>
      )}
    </div>
  )
}
