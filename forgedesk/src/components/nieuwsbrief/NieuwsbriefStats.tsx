import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, MailCheck, Eye, MousePointerClick, AlertTriangle, Users, UserMinus,
  RefreshCw, Link2, Trophy, Loader2, Search, ListPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { createTaak } from '@/services/projectService'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  getStats, getKliksPerLink, getOntvangerActiviteit, telNietGeopend, herzendNaarNietOpeners,
  berekenPercentages,
  type Nieuwsbrief, type NieuwsbriefStats as Stats, type LinkPrestatie, type OntvangerActiviteit,
} from '@/services/nieuwsbriefService'

interface Props {
  nieuwsbrief: Nieuwsbrief
  onTerug: () => void
  onHerzonden?: () => void
}

function pct(waarde: number | null): string {
  return waarde === null ? '—' : `${waarde.toFixed(waarde < 10 ? 1 : 0)}%`
}

function korteLink(link: string): string {
  try {
    const url = new URL(link)
    const pad = url.pathname === '/' ? '' : url.pathname
    return `${url.hostname.replace(/^www\./, '')}${pad}`
  } catch {
    return link
  }
}

type Filter = 'alle' | 'geklikt' | 'geopend' | 'niets'

export function NieuwsbriefStats({ nieuwsbrief, onTerug, onHerzonden }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [links, setLinks] = useState<LinkPrestatie[]>([])
  const [activiteit, setActiviteit] = useState<OntvangerActiviteit[]>([])
  const [laden, setLaden] = useState(true)
  const [filter, setFilter] = useState<Filter>('alle')
  const [zoek, setZoek] = useState('')
  const [nietGeopend, setNietGeopend] = useState<number | null>(null)
  const [herzendOpen, setHerzendOpen] = useState(false)
  const [herzendOnderwerp, setHerzendOnderwerp] = useState('')
  const [herzendBezig, setHerzendBezig] = useState(false)
  const [opvolgBezig, setOpvolgBezig] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    let actief = true
    setLaden(true)
    Promise.all([
      getStats(nieuwsbrief.id, nieuwsbrief.aantal_ontvangers),
      getKliksPerLink(nieuwsbrief.id),
      getOntvangerActiviteit(nieuwsbrief.id),
    ])
      .then(([s, l, a]) => {
        if (!actief) return
        setStats(s)
        setLinks(l)
        setActiviteit(a)
      })
      .catch(err => { toast.error('Kon statistieken niet laden'); console.error('[nieuwsbrief] stats mislukt:', err) })
      .finally(() => { if (actief) setLaden(false) })
    return () => { actief = false }
  }, [nieuwsbrief.id, nieuwsbrief.aantal_ontvangers])

  // Het aantal niet-openers komt van de server, want die past dezelfde
  // uitsluitingen toe als bij het verzenden (afgemeld, bounce, klacht).
  useEffect(() => {
    let actief = true
    if (nieuwsbrief.herzending_van) return
    telNietGeopend(nieuwsbrief.id)
      .then(n => { if (actief) setNietGeopend(n) })
      .catch(() => { if (actief) setNietGeopend(null) })
    return () => { actief = false }
  }, [nieuwsbrief.id, nieuwsbrief.herzending_van])

  const percentages = useMemo(() => (stats ? berekenPercentages(stats) : null), [stats])
  const ontvangers = stats?.verstuurd || nieuwsbrief.aantal_ontvangers || 0
  const geenData = stats && stats.delivered + stats.opened + stats.clicked + stats.bounced === 0

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase()
    return activiteit.filter(a => {
      if (filter === 'geklikt' && a.geklikt === 0) return false
      if (filter === 'geopend' && a.geopend === 0) return false
      if (filter === 'niets' && (a.geopend > 0 || a.geklikt > 0)) return false
      if (!term) return true
      return a.email.includes(term) || a.naam.toLowerCase().includes(term) || a.bedrijfsnaam.toLowerCase().includes(term)
    })
  }, [activiteit, filter, zoek])

  const tegels = [
    {
      key: 'afgeleverd', label: 'Afgeleverd', Icon: MailCheck, kleur: '#3A7D52',
      waarde: stats?.delivered ?? 0, rate: pct(percentages?.afgeleverd ?? null), sub: `van ${ontvangers} verstuurd`,
    },
    {
      key: 'geopend', label: 'Geopend', Icon: Eye, kleur: '#3A5A9A',
      waarde: stats?.opened ?? 0, rate: pct(percentages?.geopend ?? null),
      sub: stats && stats.openTotaal > stats.opened ? `${stats.openTotaal} keer in totaal` : 'unieke openers',
    },
    {
      key: 'geklikt', label: 'Geklikt', Icon: MousePointerClick, kleur: '#F15025',
      waarde: stats?.clicked ?? 0, rate: pct(percentages?.geklikt ?? null),
      sub: `${pct(percentages?.ctor ?? null)} van wie hem opende`,
    },
    {
      key: 'afgemeld', label: 'Afgemeld', Icon: UserMinus, kleur: '#8A7B5F',
      waarde: stats?.unsubscribed ?? 0, rate: pct(percentages?.afgemeld ?? null), sub: 'zegden op',
    },
  ]

  // Een klik is een signaal, geen taak. Daarom maakt doen. de taak niet zelf
  // aan maar zet hem hier klaar: pas als je erop drukt, gebeurt er iets.
  async function volgOp(a: OntvangerActiviteit) {
    if (!user?.id) { toast.error('Niet ingelogd'); return }
    setOpvolgBezig(a.email)
    try {
      const wie = a.bedrijfsnaam || a.naam || a.email
      const watKlikte = a.links.length > 0 ? `\n\nAangeklikt:\n${a.links.map(l => `- ${l}`).join('\n')}` : ''
      await createTaak({
        user_id: user.id,
        klant_id: a.klantId || undefined,
        titel: `Bel ${wie} over de nieuwsbrief`,
        beschrijving: `${wie} (${a.email}) klikte in "${nieuwsbrief.onderwerp || 'de nieuwsbrief'}".${watKlikte}`,
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: '',
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success(`Taak aangemaakt voor ${wie}`)
    } catch (err) {
      toast.error('Kon de taak niet aanmaken')
      console.error('[nieuwsbrief] taak aanmaken mislukt:', err)
    } finally {
      setOpvolgBezig(null)
    }
  }

  async function herzend() {
    if (!herzendOnderwerp.trim()) { toast.error('Geef een nieuw onderwerp op'); return }
    setHerzendBezig(true)
    try {
      const r = await herzendNaarNietOpeners(nieuwsbrief.id, herzendOnderwerp.trim(), nieuwsbrief.preheader ?? undefined)
      toast.success(`Opnieuw verstuurd naar ${r.aantalOntvangers} mensen die hem niet openden`)
      setHerzendOpen(false)
      setHerzendOnderwerp('')
      onHerzonden?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setHerzendBezig(false)
    }
  }

  return (
    <div className="flex h-full flex-col -m-3 sm:-m-4 md:-m-6">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 md:px-8">
        <button
          type="button"
          onClick={onTerug}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Terug"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[22px] font-extrabold tracking-[-0.5px] text-foreground">
              {nieuwsbrief.onderwerp || 'Zonder onderwerp'}
            </h1>
            <StatusBadge status="verzonden" label="Verzonden" className="hidden sm:inline-flex" />
            {nieuwsbrief.herzending_van && (
              <span className="hidden rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
                Herzending
              </span>
            )}
          </div>
          {nieuwsbrief.verzonden_op && (
            <p className="mt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
              {formatDateTime(nieuwsbrief.verzonden_op)} · {ontvangers} ontvangers
            </p>
          )}
        </div>
        {!nieuwsbrief.herzending_van && nietGeopend !== null && nietGeopend > 0 && (
          <Button variant="outline" size="sm" className="flex-shrink-0 gap-2" onClick={() => setHerzendOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Stuur naar {nietGeopend} niet-openers</span>
            <span className="sm:hidden">{nietGeopend}</span>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tegels.map(t => (
              <div key={t.key} className="doen-slate-surface rounded-xl px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <t.Icon className="h-[18px] w-[18px]" strokeWidth={1.75} style={{ color: t.kleur }} />
                  <span className="font-heading text-[14px] font-bold text-foreground">
                    {t.label}<span className="text-flame">.</span>
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-[28px] font-bold leading-none text-foreground tabular-nums">
                    {laden ? '—' : t.waarde}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums">{t.rate}</span>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">{t.sub}</div>
              </div>
            ))}
          </div>

          {stats && (stats.bounced > 0 || stats.complained > 0) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border px-5 py-3 text-[13px]">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-[#C0451A]" strokeWidth={1.75} />
                <strong className="font-mono tabular-nums text-foreground">{stats.bounced}</strong> niet bezorgd
                <span className="font-mono tabular-nums">({pct(percentages?.gebouncet ?? null)})</span>
              </span>
              {stats.complained > 0 && (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <strong className="font-mono tabular-nums text-foreground">{stats.complained}</strong> markeerde hem als spam
                </span>
              )}
              <span className="text-muted-foreground">Deze adressen slaan we voortaan over.</span>
            </div>
          )}

          {nieuwsbrief.ab_actief && <AbUitslag nieuwsbrief={nieuwsbrief} />}

          {geenData && (
            <div className="doen-slate-surface flex items-start gap-3 rounded-xl p-4 text-[13px] text-muted-foreground">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-petrol" />
              <span>
                Nog geen gegevens. Statistieken verschijnen zodra Resend events terugstuurt. Zorg dat open- en
                clicktracking aanstaan en dat de webhook naar /api/nieuwsbrief-webhook wijst.
              </span>
            </div>
          )}

          {links.length > 0 && (
            <section>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Welke link werkte
              </div>
              <div className="doen-slate-surface overflow-hidden rounded-2xl">
                <table className="w-full">
                  <tbody>
                    {links.map(l => (
                      <tr key={l.link} className="border-b border-border/60 last:border-0">
                        <td className="max-w-0 py-3 pl-5 pr-4">
                          <a
                            href={l.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block truncate text-[14px] text-foreground hover:text-flame hover:underline"
                            title={l.link}
                          >
                            {korteLink(l.link)}
                          </a>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-5 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                          {l.klikkers} {l.klikkers === 1 ? 'persoon' : 'mensen'}
                          {l.kliks > l.klikkers && <span className="ml-2 text-muted-foreground/70">{l.kliks} kliks</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activiteit.length > 0 && (
            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Wie deed wat
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={zoek}
                      onChange={e => setZoek(e.target.value)}
                      placeholder="Zoek op klant of adres"
                      className="h-8 w-56 pl-8 text-[13px]"
                    />
                  </div>
                  {([
                    ['alle', 'Iedereen'],
                    ['geklikt', 'Klikten'],
                    ['geopend', 'Openden'],
                    ['niets', 'Deden niets'],
                  ] as [Filter, string][]).map(([waarde, label]) => (
                    <button
                      key={waarde}
                      type="button"
                      onClick={() => setFilter(waarde)}
                      className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                        filter === waarde ? 'bg-petrol text-white' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="doen-slate-surface overflow-hidden rounded-2xl">
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full">
                    <tbody>
                      {zichtbaar.slice(0, 300).map(a => (
                        <tr key={a.email} className="border-b border-border/60 last:border-0">
                          <td className="max-w-0 py-2.5 pl-5 pr-4">
                            <div className="truncate text-[14px] font-semibold text-foreground">
                              {a.bedrijfsnaam || a.naam || a.email}
                            </div>
                            <div className="truncate font-mono text-[12px] text-muted-foreground">{a.email}</div>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-5 text-right">
                            {a.geklikt > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-flame/10 px-2 py-0.5 text-[12px] font-semibold text-flame">
                                <MousePointerClick className="h-3 w-3" /> {a.geklikt}
                              </span>
                            )}
                            {a.geopend > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[12px] font-semibold text-muted-foreground">
                                <Eye className="h-3 w-3" /> {a.geopend}
                              </span>
                            )}
                            {a.afgemeld && (
                              <span className="ml-2 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[12px] font-semibold text-muted-foreground">
                                Afgemeld
                              </span>
                            )}
                            {a.gebouncet && (
                              <span className="ml-2 inline-flex items-center rounded-md bg-[#C0451A]/10 px-2 py-0.5 text-[12px] font-semibold text-[#C0451A]">
                                Niet bezorgd
                              </span>
                            )}
                            {a.geklikt === 0 && a.geopend === 0 && !a.afgemeld && !a.gebouncet && (
                              <span className="font-mono text-[12px] text-muted-foreground/70">stil</span>
                            )}
                            {a.geklikt > 0 && !a.afgemeld && (
                              <button
                                type="button"
                                onClick={() => volgOp(a)}
                                disabled={opvolgBezig === a.email}
                                title="Maak een taak om deze klant te bellen"
                                className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-flame/50 hover:text-flame disabled:opacity-50"
                              >
                                {opvolgBezig === a.email ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListPlus className="h-3 w-3" />}
                                Opvolgen
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {zichtbaar.length > 300 && (
                  <div className="border-t border-border/60 px-5 py-2.5 text-[12px] text-muted-foreground">
                    Eerste 300 van {zichtbaar.length} getoond. Zoek om verder te filteren.
                  </div>
                )}
                {zichtbaar.length === 0 && (
                  <div className="px-5 py-6 text-center text-[13px] text-muted-foreground">Niemand in deze selectie.</div>
                )}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Wat je verstuurde
            </div>
            <div className="doen-slate-surface overflow-hidden rounded-2xl" style={{ height: 520 }}>
              <iframe
                title="Verzonden nieuwsbrief"
                srcDoc={nieuwsbrief.html}
                className="h-full w-full border-0"
                sandbox=""
              />
            </div>
          </section>
        </div>
      </div>

      <Dialog open={herzendOpen} onOpenChange={setHerzendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stuur naar wie hem niet opende</DialogTitle>
            <DialogDescription>
              Dezelfde nieuwsbrief gaat naar {nietGeopend} mensen die hem de eerste keer lieten liggen. Geef hem een
              ander onderwerp, want het oude werkte bij deze groep niet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={herzendOnderwerp}
              onChange={e => setHerzendOnderwerp(e.target.value)}
              placeholder="Nieuw onderwerp"
              maxLength={200}
              autoFocus
            />
            <p className="text-[12px] text-muted-foreground">
              Oorspronkelijk onderwerp: {nieuwsbrief.onderwerp || 'zonder onderwerp'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHerzendOpen(false)} disabled={herzendBezig}>Annuleren</Button>
            <Button onClick={herzend} disabled={herzendBezig || !herzendOnderwerp.trim()} className="gap-2">
              {herzendBezig ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verstuur opnieuw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AbUitslag({ nieuwsbrief }: { nieuwsbrief: Nieuwsbrief }) {
  const beslist = Boolean(nieuwsbrief.ab_winnaar)
  const winnaarA = nieuwsbrief.ab_winnaar === 'a'
  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-petrol/55 dark:text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" /> Onderwerptest
      </div>
      {beslist ? (
        <div className="space-y-2.5">
          <div className={`rounded-xl px-4 py-3 ${winnaarA ? 'bg-flame/8 ring-1 ring-flame/25' : 'bg-muted/60'}`}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              A {winnaarA && '· won'}
            </div>
            <div className="text-[14px] font-semibold text-foreground">{nieuwsbrief.onderwerp}</div>
          </div>
          <div className={`rounded-xl px-4 py-3 ${!winnaarA ? 'bg-flame/8 ring-1 ring-flame/25' : 'bg-muted/60'}`}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              B {!winnaarA && '· won'}
            </div>
            <div className="text-[14px] font-semibold text-foreground">{nieuwsbrief.onderwerp_b}</div>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Het winnende onderwerp ging naar {nieuwsbrief.ab_rest_verstuurd ?? 0} mensen buiten de testgroep.
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          De test loopt. Over {nieuwsbrief.ab_wachttijd_uren} uur na verzenden kiest doen. het onderwerp met de meeste
          opens en stuurt dat naar de rest van je selectie.
        </p>
      )}
    </section>
  )
}
