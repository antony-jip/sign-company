import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMontageAfspraken, getTaken } from '@/services/supabaseService';
import { getAfwezigheid, getVrijPatronen, getBedrijfssluitingsdagen } from '@/services/planningService';
import { buildAfwezigheidIndex, resolveAfwezig } from '@/utils/afwezigheid';
import { contractUrenOpDag, maandagVan, datumPlusDagen, lokaleIso } from '@/utils/contracturen';
import type { Medewerker, MedewerkerContract, Verlof, MontageAfspraak, Taak, Afwezigheid, VrijPatroon, Bedrijfssluitingsdag } from '@/types';
import { cn, getInitials } from '@/lib/utils';

interface BezettingTabProps {
  medewerkers: Medewerker[];
  contracten: MedewerkerContract[];
  verlof: Verlof[];
  onNaarWerktijden: () => void;
}

interface CelOpbouw {
  contract: number;
  afwezig: number;
  verlof: number;
  sluiting: number;
  beschikbaar: number;
  montage: number;
  taken: number;
  gepland: number;
  pct: number | null;
}

const AANTAL_WEKEN = 4;
const STANDAARD_AFSPRAAK_UREN = 8;

function vandaagIso(): string {
  return lokaleIso(new Date());
}

function isoWeekNummer(datumIso: string): number {
  const d = new Date(Date.UTC(Number(datumIso.slice(0, 4)), Number(datumIso.slice(5, 7)) - 1, Number(datumIso.slice(8, 10))));
  const dag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dag);
  const jaarStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jaarStart) / 86400000 + 1) / 7);
}

function datumKort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function formatUren(n: number): string {
  const afgerond = Math.round(n * 10) / 10;
  return Number.isInteger(afgerond) ? String(afgerond) : afgerond.toFixed(1).replace('.', ',');
}

function minuten(tijd: string | null | undefined): number | null {
  if (!tijd || !/^\d{1,2}:\d{2}/.test(tijd)) return null;
  const [u, m] = tijd.split(':').map(Number);
  return u * 60 + m;
}

function afspraakUren(a: MontageAfspraak): number {
  const start = minuten(a.start_tijd);
  const eind = minuten(a.eind_tijd);
  if (start == null || eind == null || eind <= start) return STANDAARD_AFSPRAAK_UREN;
  return (eind - start) / 60;
}

// monteurs bevat medewerker-id's; oude afspraken kunnen nog namen bevatten.
function isMonteur(a: MontageAfspraak, m: Medewerker): boolean {
  const naam = m.naam.trim().toLowerCase();
  return (a.monteurs || []).some((x) => x === m.id || x.trim().toLowerCase() === naam);
}

function kleurKlasse(cel: CelOpbouw): string {
  const pct = cel.pct;
  if (pct == null) return cel.gepland > 0 ? 'bg-flame/10 text-flame-text dark:text-flame' : 'bg-muted/60 text-muted-foreground';
  if (pct < 60) return 'bg-muted/60 text-muted-foreground';
  if (pct < 90) return 'bg-petrol/10 text-petrol dark:text-petrol-light';
  if (pct <= 110) return 'bg-[#2D6B48]/10 text-[#2D6B48] dark:text-[#66BC85]';
  if (pct <= 130) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
  return 'bg-flame/10 text-flame-text dark:text-flame';
}

function pctLabel(cel: CelOpbouw): string {
  if (cel.pct == null) return cel.gepland > 0 ? 'geen uren' : 'vrij';
  return `${cel.pct}%`;
}

export function BezettingTab({ medewerkers, contracten, verlof, onNaarWerktijden }: BezettingTabProps) {
  const [startMaandag, setStartMaandag] = useState(() => maandagVan(vandaagIso()));
  const [loading, setLoading] = useState(true);
  const [afspraken, setAfspraken] = useState<MontageAfspraak[]>([]);
  const [taken, setTaken] = useState<Taak[]>([]);
  const [afwezigheid, setAfwezigheid] = useState<Afwezigheid[]>([]);
  const [vrijPatronen, setVrijPatronen] = useState<VrijPatroon[]>([]);
  const [sluitingsdagen, setSluitingsdagen] = useState<Bedrijfssluitingsdag[]>([]);

  useEffect(() => {
    let actief = true;
    const stil = <T,>(p: Promise<T[]>, label: string) => p.catch((err) => { logger.warn(`Bezetting: ${label} niet geladen`, err); return [] as T[]; });
    Promise.all([
      stil(getMontageAfspraken(), 'afspraken'),
      stil(getTaken(), 'taken'),
      stil(getAfwezigheid(), 'afwezigheid'),
      stil(getVrijPatronen(), 'vrijpatronen'),
      stil(getBedrijfssluitingsdagen(), 'sluitingsdagen'),
    ]).then(([a, t, af, vp, sl]) => {
      if (!actief) return;
      setAfspraken(a);
      setTaken(t);
      setAfwezigheid(af);
      setVrijPatronen(vp);
      setSluitingsdagen(sl);
      setLoading(false);
    });
    return () => { actief = false; };
  }, []);

  const weken = useMemo(
    () => Array.from({ length: AANTAL_WEKEN }, (_, i) => datumPlusDagen(startMaandag, i * 7)),
    [startMaandag]
  );
  const rijen = useMemo(() => medewerkers.filter((m) => m.status === 'actief'), [medewerkers]);
  const afwezigIndex = useMemo(() => buildAfwezigheidIndex(vrijPatronen, afwezigheid), [vrijPatronen, afwezigheid]);

  const afsprakenPerDag = useMemo(() => {
    const map = new Map<string, MontageAfspraak[]>();
    for (const a of afspraken) {
      if (a.status === 'uitgesteld') continue;
      const dag = (a.datum || '').slice(0, 10);
      const lijst = map.get(dag);
      if (lijst) lijst.push(a); else map.set(dag, [a]);
    }
    return map;
  }, [afspraken]);

  const takenPerDag = useMemo(() => {
    const map = new Map<string, Taak[]>();
    for (const t of taken) {
      if (t.status === 'klaar' || !t.deadline || !t.toegewezen_aan_id) continue;
      const dag = t.deadline.slice(0, 10);
      const lijst = map.get(dag);
      if (lijst) lijst.push(t); else map.set(dag, [t]);
    }
    return map;
  }, [taken]);

  const isSluitingsdag = (dag: string) =>
    sluitingsdagen.some((s) => s.jaarlijks_herhalend ? s.datum.slice(5, 10) === dag.slice(5, 10) : s.datum.slice(0, 10) === dag);

  const cellen = useMemo(() => {
    const map = new Map<string, CelOpbouw>();
    for (const m of rijen) {
      for (const maandag of weken) {
        const cel: CelOpbouw = { contract: 0, afwezig: 0, verlof: 0, sluiting: 0, beschikbaar: 0, montage: 0, taken: 0, gepland: 0, pct: null };
        for (let i = 0; i < 7; i++) {
          const dag = datumPlusDagen(maandag, i);
          const uren = contractUrenOpDag(contracten, m.id, dag);
          cel.contract += uren;
          if (uren > 0) {
            const status = resolveAfwezig(afwezigIndex, m.id, dag, i);
            const heleDagAfwezig = status.afwezig && !(status.start_tijd && status.eind_tijd);
            if (heleDagAfwezig) cel.afwezig += uren;
            else if (verlof.some((v) => v.medewerker_id === m.id && v.status === 'goedgekeurd' && v.start_datum <= dag && dag <= v.eind_datum)) cel.verlof += uren;
            else if (isSluitingsdag(dag)) cel.sluiting += uren;
          }
          for (const a of afsprakenPerDag.get(dag) || []) {
            if (isMonteur(a, m)) cel.montage += afspraakUren(a);
          }
          for (const t of takenPerDag.get(dag) || []) {
            if (t.toegewezen_aan_id === m.id) cel.taken += Number(t.geschatte_tijd) || 0;
          }
        }
        cel.beschikbaar = Math.max(0, cel.contract - cel.afwezig - cel.verlof - cel.sluiting);
        cel.gepland = cel.montage + cel.taken;
        cel.pct = cel.beschikbaar > 0 ? Math.round((cel.gepland / cel.beschikbaar) * 100) : null;
        map.set(`${m.id}|${maandag}`, cel);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rijen, weken, contracten, afwezigIndex, verlof, sluitingsdagen, afsprakenPerDag, takenPerDag]);

  const totalen = useMemo(() => weken.map((maandag) => {
    const som: CelOpbouw = { contract: 0, afwezig: 0, verlof: 0, sluiting: 0, beschikbaar: 0, montage: 0, taken: 0, gepland: 0, pct: null };
    for (const m of rijen) {
      const cel = cellen.get(`${m.id}|${maandag}`);
      if (!cel) continue;
      som.contract += cel.contract; som.afwezig += cel.afwezig; som.verlof += cel.verlof; som.sluiting += cel.sluiting;
      som.beschikbaar += cel.beschikbaar; som.montage += cel.montage; som.taken += cel.taken; som.gepland += cel.gepland;
    }
    som.pct = som.beschikbaar > 0 ? Math.round((som.gepland / som.beschikbaar) * 100) : null;
    return som;
  }), [weken, rijen, cellen]);

  const dezeWeek = maandagVan(vandaagIso());

  if (contracten.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            module="planning"
            title="Nog geen werktijden"
            description="Bezetting rekent met contracturen. Leg eerst per medewerker de werktijden vast; dat doe je in het bewerkvenster van een medewerker."
            action={<Button onClick={onNaarWerktijden}>Naar werktijden</Button>}
          />
        </CardContent>
      </Card>
    );
  }

  const weekKop = (maandag: string) => (
    <div className="leading-tight">
      <div className={cn('text-sm font-semibold tabular-nums', maandag === dezeWeek ? 'text-petrol dark:text-petrol-light' : 'text-foreground')}>Wk {isoWeekNummer(maandag)}</div>
      <div className="text-2xs text-muted-foreground">{datumKort(maandag)} t/m {datumKort(datumPlusDagen(maandag, 6))}</div>
    </div>
  );

  const cellKnop = (cel: CelOpbouw, naam: string, maandag: string, compact = false) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full min-h-[44px] rounded-md px-2 py-1.5 text-left transition-colors hover:brightness-95 dark:hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol/40',
            kleurKlasse(cel)
          )}
          aria-label={`${naam}, week ${isoWeekNummer(maandag)}: ${formatUren(cel.gepland)} van ${formatUren(cel.beschikbaar)} uur gepland`}
        >
          <div className={cn('font-semibold tabular-nums leading-tight', compact ? 'text-xs' : 'text-sm')}>{pctLabel(cel)}</div>
          <div className="text-2xs tabular-nums opacity-80">{formatUren(cel.gepland)} / {formatUren(cel.beschikbaar)} u</div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-3">
        <p className="text-xs font-semibold text-foreground mb-2">{naam} · week {isoWeekNummer(maandag)}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs tabular-nums">
          <dt className="text-muted-foreground">Contract</dt><dd className="text-right">{formatUren(cel.contract)} u</dd>
          <dt className="text-muted-foreground">Afwezig</dt><dd className="text-right">{cel.afwezig > 0 ? `-${formatUren(cel.afwezig)}` : '0'} u</dd>
          <dt className="text-muted-foreground">Verlof</dt><dd className="text-right">{cel.verlof > 0 ? `-${formatUren(cel.verlof)}` : '0'} u</dd>
          <dt className="text-muted-foreground">Sluiting</dt><dd className="text-right">{cel.sluiting > 0 ? `-${formatUren(cel.sluiting)}` : '0'} u</dd>
          <dt className="font-medium text-foreground border-t pt-1">Beschikbaar</dt><dd className="text-right font-medium border-t pt-1">{formatUren(cel.beschikbaar)} u</dd>
          <dt className="text-muted-foreground">Montage</dt><dd className="text-right">{formatUren(cel.montage)} u</dd>
          <dt className="text-muted-foreground">Taken</dt><dd className="text-right">{formatUren(cel.taken)} u</dd>
          <dt className="font-medium text-foreground border-t pt-1">Gepland</dt><dd className="text-right font-medium border-t pt-1">{formatUren(cel.gepland)} u</dd>
        </dl>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Bezetting</h2>
          <p className="text-xs text-muted-foreground">Gepland tegenover beschikbaar, vier weken vooruit</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-11 w-11 p-0 sm:h-9 sm:w-9" aria-label="Vorige vier weken" onClick={() => setStartMaandag((s) => datumPlusDagen(s, -7 * AANTAL_WEKEN))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-11 sm:h-9" disabled={startMaandag === dezeWeek} onClick={() => setStartMaandag(dezeWeek)}>
            Deze week
          </Button>
          <Button variant="outline" size="sm" className="h-11 w-11 p-0 sm:h-9 sm:w-9" aria-label="Volgende vier weken" onClick={() => setStartMaandag((s) => datumPlusDagen(s, 7 * AANTAL_WEKEN))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : rijen.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Geen actieve medewerkers</p>
      ) : (
        <>
          {/* Desktop: tabel */}
          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pl-4 pr-2 font-medium text-muted-foreground w-56">Medewerker</th>
                    {weken.map((maandag) => (
                      <th key={maandag} className="text-left py-3 px-2 font-normal min-w-[120px]">{weekKop(maandag)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rijen.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2 pl-4 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-petrol/10 text-petrol dark:text-petrol-light flex items-center justify-center text-2xs font-semibold">{getInitials(m.naam)}</div>
                          <span className="truncate font-medium text-[#1A4A52] dark:text-foreground">{m.naam}</span>
                        </div>
                      </td>
                      {weken.map((maandag) => {
                        const cel = cellen.get(`${m.id}|${maandag}`);
                        return <td key={maandag} className="py-2 px-2 align-top">{cel && cellKnop(cel, m.naam, maandag)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="py-2 pl-4 pr-2 font-semibold text-foreground">Totaal</td>
                    {totalen.map((som, i) => (
                      <td key={weken[i]} className="py-2 px-2 align-top">{cellKnop(som, 'Totaal', weken[i])}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Mobiel: kaart per medewerker met vier weektegels */}
          <div className="md:hidden space-y-3">
            {rijen.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-petrol/10 text-petrol dark:text-petrol-light flex items-center justify-center text-xs font-semibold">{getInitials(m.naam)}</div>
                    <span className="truncate font-medium text-[#1A4A52] dark:text-foreground">{m.naam}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {weken.map((maandag) => {
                      const cel = cellen.get(`${m.id}|${maandag}`);
                      return (
                        <div key={maandag} className="space-y-1">
                          <div className={cn('text-2xs font-medium text-center tabular-nums', maandag === dezeWeek ? 'text-petrol dark:text-petrol-light' : 'text-muted-foreground')}>Wk {isoWeekNummer(maandag)}</div>
                          {cel && cellKnop(cel, m.naam, maandag, true)}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-3 space-y-2">
                <span className="font-semibold text-foreground">Totaal</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {totalen.map((som, i) => (
                    <div key={weken[i]} className="space-y-1">
                      <div className="text-2xs font-medium text-center text-muted-foreground tabular-nums">Wk {isoWeekNummer(weken[i])}</div>
                      {cellKnop(som, 'Totaal', weken[i], true)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
