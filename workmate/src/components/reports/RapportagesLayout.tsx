import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  BarChart3,
  Users,
  FileText,
  Download,
  FileSpreadsheet,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarDays,
} from 'lucide-react';
import {
  getKlanten,
  getProjecten,
  getOffertes,
  getFacturen,
  getTijdregistraties,
} from '@/services/supabaseService';
import type {
  Klant,
  Project,
  Offerte,
  Factuur,
  Tijdregistratie,
} from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { exportCSV, exportExcel } from '@/lib/export';

// ---------------------------------------------------------------------------
// Demo data generators
// ---------------------------------------------------------------------------

function generateDemoFacturen(): Factuur[] {
  const klanten = [
    { id: 'k1', naam: 'Albert Heijn BV' },
    { id: 'k2', naam: 'Gemeente Amsterdam' },
    { id: 'k3', naam: 'HEMA Nederland' },
    { id: 'k4', naam: 'Rijksmuseum' },
    { id: 'k5', naam: 'NS Stations' },
    { id: 'k6', naam: 'Bol.com' },
    { id: 'k7', naam: 'Ziggo Dome' },
  ];
  const statussen: Factuur['status'][] = [
    'betaald',
    'betaald',
    'betaald',
    'verzonden',
    'verzonden',
    'vervallen',
    'concept',
  ];
  const now = new Date();
  const facturen: Factuur[] = [];

  for (let i = 0; i < 24; i++) {
    const klant = klanten[i % klanten.length];
    const maandOffset = Math.floor(Math.random() * 12);
    const datum = new Date(now.getFullYear(), now.getMonth() - maandOffset, Math.floor(Math.random() * 28) + 1);
    const subtotaal = Math.round((2000 + Math.random() * 18000) * 100) / 100;
    const btw = Math.round(subtotaal * 0.21 * 100) / 100;
    const totaal = Math.round((subtotaal + btw) * 100) / 100;
    const status = statussen[i % statussen.length];
    const betaald = status === 'betaald' ? totaal : status === 'verzonden' ? Math.round(totaal * Math.random() * 0.5 * 100) / 100 : 0;
    const verval = new Date(datum);
    verval.setDate(verval.getDate() + 30);

    facturen.push({
      id: `f${i + 1}`,
      user_id: 'demo-user',
      klant_id: klant.id,
      klant_naam: klant.naam,
      nummer: `FAC-${now.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      titel: `Bewegwijzering project ${i + 1}`,
      status,
      subtotaal,
      btw_bedrag: btw,
      totaal,
      betaald_bedrag: betaald,
      factuurdatum: datum.toISOString().split('T')[0],
      vervaldatum: verval.toISOString().split('T')[0],
      notities: '',
      voorwaarden: 'Standaard betalingsvoorwaarden zijn van toepassing.',
      created_at: datum.toISOString(),
      updated_at: datum.toISOString(),
    });
  }
  return facturen;
}

function generateDemoProjecten(): Project[] {
  const projecten: Project[] = [
    {
      id: 'p1', user_id: 'demo-user', klant_id: 'k1', klant_naam: 'Albert Heijn BV',
      naam: 'Gevelreclame filiaal Amstelveen', beschrijving: 'Ontwerp en installatie van gevelreclame voor het nieuwe filiaal in Amstelveen.',
      status: 'actief', prioriteit: 'hoog',
      budget: 15000, besteed: 11200, voortgang: 75, team_leden: ['Jan', 'Pieter'],
      start_datum: '2025-09-01', eind_datum: '2026-03-15',
      created_at: '2025-09-01T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
    },
    {
      id: 'p2', user_id: 'demo-user', klant_id: 'k2', klant_naam: 'Gemeente Amsterdam',
      naam: 'Wayfinding systeem Zuidas', beschrijving: 'Compleet wayfinding systeem voor de Zuidas met bewegwijzering en informatieborden.',
      status: 'actief', prioriteit: 'hoog',
      budget: 45000, besteed: 38500, voortgang: 85, team_leden: ['Jan', 'Klaas', 'Pieter'],
      start_datum: '2025-06-01', eind_datum: '2026-04-01',
      created_at: '2025-06-01T00:00:00Z', updated_at: '2026-02-10T00:00:00Z',
    },
    {
      id: 'p3', user_id: 'demo-user', klant_id: 'k3', klant_naam: 'HEMA Nederland',
      naam: 'Lichtreclame 12 filialen', beschrijving: 'Vervanging van lichtreclame bij 12 HEMA filialen door het hele land.',
      status: 'afgerond', prioriteit: 'medium',
      budget: 62000, besteed: 54800, voortgang: 100, team_leden: ['Jan', 'Pieter', 'Maria'],
      start_datum: '2025-03-01', eind_datum: '2025-11-30',
      created_at: '2025-03-01T00:00:00Z', updated_at: '2025-11-30T00:00:00Z',
    },
    {
      id: 'p4', user_id: 'demo-user', klant_id: 'k4', klant_naam: 'Rijksmuseum',
      naam: 'Tentoonstellingsborden zomer', beschrijving: 'Ontwerp en productie van tijdelijke tentoonstellingsborden voor de zomerexpositie.',
      status: 'actief', prioriteit: 'medium',
      budget: 8500, besteed: 9200, voortgang: 95, team_leden: ['Klaas'],
      start_datum: '2025-11-01', eind_datum: '2026-02-28',
      created_at: '2025-11-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
    },
    {
      id: 'p5', user_id: 'demo-user', klant_id: 'k5', klant_naam: 'NS Stations',
      naam: 'Perronborden vernieuwing Utrecht', beschrijving: 'Vervanging en vernieuwing van alle perronborden op Utrecht Centraal.',
      status: 'actief', prioriteit: 'hoog',
      budget: 32000, besteed: 18600, voortgang: 55, team_leden: ['Jan', 'Pieter'],
      start_datum: '2025-10-15', eind_datum: '2026-06-01',
      created_at: '2025-10-15T00:00:00Z', updated_at: '2026-01-20T00:00:00Z',
    },
    {
      id: 'p6', user_id: 'demo-user', klant_id: 'k6', klant_naam: 'Bol.com',
      naam: 'Magazijnbebording Waalwijk', beschrijving: 'Interne bewegwijzering en veiligheidssignalering voor het distributiecentrum.',
      status: 'afgerond', prioriteit: 'medium',
      budget: 21000, besteed: 19500, voortgang: 100, team_leden: ['Maria', 'Klaas'],
      start_datum: '2025-07-01', eind_datum: '2025-10-15',
      created_at: '2025-07-01T00:00:00Z', updated_at: '2025-10-15T00:00:00Z',
    },
    {
      id: 'p7', user_id: 'demo-user', klant_id: 'k7', klant_naam: 'Ziggo Dome',
      naam: 'LED-display entree', beschrijving: 'Installatie van groot LED-display bij de hoofdentree van de Ziggo Dome.',
      status: 'gepland', prioriteit: 'laag',
      budget: 28000, besteed: 2400, voortgang: 10, team_leden: ['Jan'],
      start_datum: '2026-01-15', eind_datum: '2026-05-01',
      created_at: '2026-01-15T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
    },
    {
      id: 'p8', user_id: 'demo-user', klant_id: 'k1', klant_naam: 'Albert Heijn BV',
      naam: 'Interne signing DC Zaandam', beschrijving: 'Interne bewegwijzering en afdelingsborden voor het distributiecentrum in Zaandam.',
      status: 'actief', prioriteit: 'medium',
      budget: 18500, besteed: 16900, voortgang: 88, team_leden: ['Pieter', 'Maria'],
      start_datum: '2025-08-01', eind_datum: '2026-02-28',
      created_at: '2025-08-01T00:00:00Z', updated_at: '2026-02-05T00:00:00Z',
    },
  ];
  return projecten;
}

function generateDemoOffertes(): Offerte[] {
  const offertes: Offerte[] = [
    { id: 'o1', user_id: 'demo-user', klant_id: 'k1', klant_naam: 'Albert Heijn BV', nummer: 'OFF-2025-0012', titel: 'Gevelreclame 3 filialen', status: 'goedgekeurd', subtotaal: 34710.74, btw_bedrag: 7289.26, totaal: 42000, geldig_tot: '2025-05-12', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-04-12T00:00:00Z', updated_at: '2025-04-12T00:00:00Z' },
    { id: 'o2', user_id: 'demo-user', klant_id: 'k2', klant_naam: 'Gemeente Amsterdam', nummer: 'OFF-2025-0015', titel: 'Straatnaamborden Centrum', status: 'goedgekeurd', subtotaal: 15289.26, btw_bedrag: 3210.74, totaal: 18500, geldig_tot: '2025-06-20', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-05-20T00:00:00Z', updated_at: '2025-05-20T00:00:00Z' },
    { id: 'o3', user_id: 'demo-user', klant_id: 'k3', klant_naam: 'HEMA Nederland', nummer: 'OFF-2025-0018', titel: 'Lichtreclame rebrand', status: 'goedgekeurd', subtotaal: 51239.67, btw_bedrag: 10760.33, totaal: 62000, geldig_tot: '2025-03-10', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-02-10T00:00:00Z', updated_at: '2025-02-10T00:00:00Z' },
    { id: 'o4', user_id: 'demo-user', klant_id: 'k4', klant_naam: 'Rijksmuseum', nummer: 'OFF-2025-0022', titel: 'Museumroute borden', status: 'goedgekeurd', subtotaal: 7024.79, btw_bedrag: 1475.21, totaal: 8500, geldig_tot: '2025-11-05', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-10-05T00:00:00Z', updated_at: '2025-10-05T00:00:00Z' },
    { id: 'o5', user_id: 'demo-user', klant_id: 'k5', klant_naam: 'NS Stations', nummer: 'OFF-2025-0025', titel: 'Digitale informatieborden', status: 'goedgekeurd', subtotaal: 45454.55, btw_bedrag: 9545.45, totaal: 55000, geldig_tot: '2025-09-14', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-08-14T00:00:00Z', updated_at: '2025-08-14T00:00:00Z' },
    { id: 'o6', user_id: 'demo-user', klant_id: 'k6', klant_naam: 'Bol.com', nummer: 'OFF-2025-0028', titel: 'Warehouse signing', status: 'goedgekeurd', subtotaal: 17355.37, btw_bedrag: 3644.63, totaal: 21000, geldig_tot: '2025-07-01', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
    { id: 'o7', user_id: 'demo-user', klant_id: 'k7', klant_naam: 'Ziggo Dome', nummer: 'OFF-2025-0030', titel: 'LED-displays entree', status: 'goedgekeurd', subtotaal: 23140.50, btw_bedrag: 4859.50, totaal: 28000, geldig_tot: '2025-12-31', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-12-01T00:00:00Z', updated_at: '2025-12-01T00:00:00Z' },
    { id: 'o8', user_id: 'demo-user', klant_id: 'k1', klant_naam: 'Albert Heijn BV', nummer: 'OFF-2026-0002', titel: 'Parkeergarage bewegwijzering', status: 'verzonden', subtotaal: 11983.47, btw_bedrag: 2516.53, totaal: 14500, geldig_tot: '2026-02-10', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-01-10T00:00:00Z' },
    { id: 'o9', user_id: 'demo-user', klant_id: 'k2', klant_naam: 'Gemeente Amsterdam', nummer: 'OFF-2026-0003', titel: 'Fietsroute borden Noord', status: 'bekeken', subtotaal: 8099.17, btw_bedrag: 1700.83, totaal: 9800, geldig_tot: '2026-02-22', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2026-01-22T00:00:00Z', updated_at: '2026-01-22T00:00:00Z' },
    { id: 'o10', user_id: 'demo-user', klant_id: 'k5', klant_naam: 'NS Stations', nummer: 'OFF-2026-0005', titel: 'Stationsentree Den Haag', status: 'verzonden', subtotaal: 30578.51, btw_bedrag: 6421.49, totaal: 37000, geldig_tot: '2026-03-05', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2026-02-05T00:00:00Z', updated_at: '2026-02-05T00:00:00Z' },
    { id: 'o11', user_id: 'demo-user', klant_id: 'k3', klant_naam: 'HEMA Nederland', nummer: 'OFF-2025-0020', titel: 'Etalage displays zomer', status: 'afgewezen', subtotaal: 12396.69, btw_bedrag: 2603.31, totaal: 15000, geldig_tot: '2025-08-15', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-07-15T00:00:00Z', updated_at: '2025-07-15T00:00:00Z' },
    { id: 'o12', user_id: 'demo-user', klant_id: 'k4', klant_naam: 'Rijksmuseum', nummer: 'OFF-2025-0023', titel: 'Buitenreclame Museumplein', status: 'afgewezen', subtotaal: 26446.28, btw_bedrag: 5553.72, totaal: 32000, geldig_tot: '2025-10-20', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2025-09-20T00:00:00Z', updated_at: '2025-09-20T00:00:00Z' },
    { id: 'o13', user_id: 'demo-user', klant_id: 'k6', klant_naam: 'Bol.com', nummer: 'OFF-2026-0004', titel: 'Kantoor interieur signing', status: 'verzonden', subtotaal: 9256.20, btw_bedrag: 1943.80, totaal: 11200, geldig_tot: '2026-03-01', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' },
    { id: 'o14', user_id: 'demo-user', klant_id: 'k7', klant_naam: 'Ziggo Dome', nummer: 'OFF-2026-0006', titel: 'VIP-lounge bewegwijzering', status: 'bekeken', subtotaal: 5619.83, btw_bedrag: 1180.17, totaal: 6800, geldig_tot: '2026-03-12', notities: '', voorwaarden: 'Standaard leveringsvoorwaarden.', created_at: '2026-02-12T00:00:00Z', updated_at: '2026-02-12T00:00:00Z' },
  ];
  return offertes;
}

function generateDemoTijdregistraties(): Tijdregistratie[] {
  const registraties: Tijdregistratie[] = [
    { id: 't1', user_id: 'demo-user', project_id: 'p1', project_naam: 'Gevelreclame filiaal Amstelveen', omschrijving: 'Montage gevelletters', datum: '2026-01-15', start_tijd: '08:00', eind_tijd: '16:00', duur_minuten: 480, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2026-01-15T08:00:00Z', updated_at: '2026-01-15T16:00:00Z' },
    { id: 't2', user_id: 'demo-user', project_id: 'p2', project_naam: 'Wayfinding systeem Zuidas', omschrijving: 'Plaatsing wegwijzerborden', datum: '2026-01-20', start_tijd: '07:00', eind_tijd: '23:00', duur_minuten: 960, uurtarief: 95, facturabel: true, gefactureerd: false, created_at: '2026-01-20T07:00:00Z', updated_at: '2026-01-20T23:00:00Z' },
    { id: 't3', user_id: 'demo-user', project_id: 'p3', project_naam: 'Lichtreclame 12 filialen', omschrijving: 'Installatie lichtreclame', datum: '2025-10-10', start_tijd: '06:00', eind_tijd: '02:00', duur_minuten: 1200, uurtarief: 85, facturabel: true, gefactureerd: true, created_at: '2025-10-10T06:00:00Z', updated_at: '2025-10-10T22:00:00Z' },
    { id: 't4', user_id: 'demo-user', project_id: 'p4', project_naam: 'Tentoonstellingsborden zomer', omschrijving: 'Ontwerp en productie borden', datum: '2026-02-01', start_tijd: '09:00', eind_tijd: '15:00', duur_minuten: 360, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-02-01T15:00:00Z' },
    { id: 't5', user_id: 'demo-user', project_id: 'p5', project_naam: 'Perronborden vernieuwing Utrecht', omschrijving: 'Demontage oude borden en montage nieuwe', datum: '2026-01-25', start_tijd: '07:00', eind_tijd: '19:00', duur_minuten: 720, uurtarief: 90, facturabel: true, gefactureerd: false, created_at: '2026-01-25T07:00:00Z', updated_at: '2026-01-25T19:00:00Z' },
    { id: 't6', user_id: 'demo-user', project_id: 'p1', project_naam: 'Gevelreclame filiaal Amstelveen', omschrijving: 'Interne vergadering projectvoortgang', datum: '2026-02-05', start_tijd: '10:00', eind_tijd: '12:00', duur_minuten: 120, uurtarief: 85, facturabel: false, gefactureerd: false, created_at: '2026-02-05T10:00:00Z', updated_at: '2026-02-05T12:00:00Z' },
  ];
  return registraties;
}

// ---------------------------------------------------------------------------
// Period type and helpers
// ---------------------------------------------------------------------------

type Periode = 'deze_maand' | 'dit_kwartaal' | 'dit_jaar' | 'aangepast';

function getPeriodeLabel(p: Periode): string {
  switch (p) {
    case 'deze_maand': return 'Deze maand';
    case 'dit_kwartaal': return 'Dit kwartaal';
    case 'dit_jaar': return 'Dit jaar';
    case 'aangepast': return 'Aangepast';
  }
}

function getPeriodeRange(p: Periode): { start: Date; end: Date } {
  const now = new Date();
  switch (p) {
    case 'deze_maand':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case 'dit_kwartaal': {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), q * 3, 1),
        end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59),
      };
    }
    case 'dit_jaar':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case 'aangepast':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
  }
}

const MAAND_NAMEN = [
  'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RapportagesLayout() {
  const [periode, setPeriode] = useState<Periode>('dit_jaar');
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [offertes, setOffertes] = useState<Offerte[]>([]);
  const [tijdregistraties, setTijdregistraties] = useState<Tijdregistratie[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [facturenData, projectenData, offertesData, tijdData] = await Promise.all([
          getFacturen(),
          getProjecten(),
          getOffertes(),
          getTijdregistraties(),
        ]);

        setFacturen(facturenData.length > 0 ? facturenData : generateDemoFacturen());
        setProjecten(projectenData.length > 0 ? projectenData : generateDemoProjecten());
        setOffertes(offertesData.length > 0 ? offertesData : generateDemoOffertes());
        setTijdregistraties(tijdData.length > 0 ? tijdData : generateDemoTijdregistraties());
      } catch {
        toast.error('Fout bij het laden van rapportagegegevens. Demogegevens worden getoond.');
        setFacturen(generateDemoFacturen());
        setProjecten(generateDemoProjecten());
        setOffertes(generateDemoOffertes());
        setTijdregistraties(generateDemoTijdregistraties());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter data by selected period
  const range = useMemo(() => getPeriodeRange(periode), [periode]);

  const gefilterdeFacturen = useMemo(
    () =>
      facturen.filter((f) => {
        const d = new Date(f.factuurdatum);
        return d >= range.start && d <= range.end;
      }),
    [facturen, range],
  );

  const gefilterdeOffertes = useMemo(
    () =>
      offertes.filter((o) => {
        const d = new Date(o.created_at);
        return d >= range.start && d <= range.end;
      }),
    [offertes, range],
  );

  // ---------------------------------------------------------------------------
  // KPI calculations
  // ---------------------------------------------------------------------------

  const totaleOmzet = useMemo(
    () => gefilterdeFacturen.reduce((sum, f) => sum + f.totaal, 0),
    [gefilterdeFacturen],
  );

  const totaleWinst = useMemo(() => {
    const kosten = gefilterdeFacturen.reduce((sum, f) => sum + f.totaal * 0.35, 0);
    return totaleOmzet - kosten;
  }, [gefilterdeFacturen, totaleOmzet]);

  const conversieRatio = useMemo(() => {
    if (gefilterdeOffertes.length === 0) return 0;
    const goedgekeurd = gefilterdeOffertes.filter((o) => o.status === 'goedgekeurd').length;
    return Math.round((goedgekeurd / gefilterdeOffertes.length) * 100);
  }, [gefilterdeOffertes]);

  const gemiddeldeProjectwaarde = useMemo(() => {
    if (projecten.length === 0) return 0;
    return projecten.reduce((sum, p) => sum + p.budget, 0) / projecten.length;
  }, [projecten]);

  // ---------------------------------------------------------------------------
  // Monthly revenue data for bar chart (full year)
  // ---------------------------------------------------------------------------

  const maandelijksOmzet = useMemo(() => {
    const jaar = new Date().getFullYear();
    const data = Array.from({ length: 12 }, (_, i) => ({
      maand: MAAND_NAMEN[i],
      waarde: 0,
    }));
    facturen.forEach((f) => {
      const d = new Date(f.factuurdatum);
      if (d.getFullYear() === jaar) {
        data[d.getMonth()].waarde += f.totaal;
      }
    });
    return data;
  }, [facturen]);

  const maxMaandOmzet = useMemo(
    () => Math.max(...maandelijksOmzet.map((m) => m.waarde), 1),
    [maandelijksOmzet],
  );

  // ---------------------------------------------------------------------------
  // Top clients by revenue
  // ---------------------------------------------------------------------------

  const topKlanten = useMemo(() => {
    const map = new Map<
      string,
      {
        naam: string;
        aantalProjecten: number;
        totaalGefactureerd: number;
        openstaand: number;
        laatsteFactuur: string;
      }
    >();

    gefilterdeFacturen.forEach((f) => {
      const naam = f.klant_naam || f.klant_id;
      if (!map.has(naam)) {
        map.set(naam, {
          naam,
          aantalProjecten: 0,
          totaalGefactureerd: 0,
          openstaand: 0,
          laatsteFactuur: f.factuurdatum,
        });
      }
      const entry = map.get(naam)!;
      entry.totaalGefactureerd += f.totaal;
      if (f.status === 'verzonden' || f.status === 'vervallen') {
        entry.openstaand += f.totaal - f.betaald_bedrag;
      }
      if (f.factuurdatum > entry.laatsteFactuur) {
        entry.laatsteFactuur = f.factuurdatum;
      }
    });

    // Count projects per client
    projecten.forEach((p) => {
      const naam = p.klant_naam || p.klant_id;
      if (map.has(naam)) {
        map.get(naam)!.aantalProjecten += 1;
      }
    });

    return [...map.values()]
      .sort((a, b) => b.totaalGefactureerd - a.totaalGefactureerd)
      .slice(0, 5);
  }, [gefilterdeFacturen, projecten]);

  // ---------------------------------------------------------------------------
  // Project profitability
  // ---------------------------------------------------------------------------

  const projectWinstgevendheid = useMemo(
    () =>
      projecten.map((p) => {
        const marge =
          p.budget > 0
            ? Math.round(((p.budget - p.besteed) / p.budget) * 100)
            : 0;
        return { ...p, marge };
      }),
    [projecten],
  );

  // ---------------------------------------------------------------------------
  // Offerte conversion breakdown
  // ---------------------------------------------------------------------------

  const offerteStats = useMemo(() => {
    const totaal = gefilterdeOffertes.length;
    const goedgekeurd = gefilterdeOffertes.filter((o) => o.status === 'goedgekeurd').length;
    const afgewezen = gefilterdeOffertes.filter((o) => o.status === 'afgewezen').length;
    const inBehandeling = gefilterdeOffertes.filter(
      (o) => o.status === 'verzonden' || o.status === 'bekeken' || o.status === 'concept',
    ).length;
    const ratio = totaal > 0 ? Math.round((goedgekeurd / totaal) * 100) : 0;
    return { totaal, goedgekeurd, afgewezen, inBehandeling, ratio };
  }, [gefilterdeOffertes]);

  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------

  function handleExportKlanten(type: 'csv' | 'excel') {
    const headers = ['Klant', 'Aantal projecten', 'Totaal gefactureerd', 'Openstaand', 'Laatste factuur'];
    const data = topKlanten.map((k) => ({
      Klant: k.naam,
      'Aantal projecten': k.aantalProjecten,
      'Totaal gefactureerd': k.totaalGefactureerd,
      Openstaand: k.openstaand,
      'Laatste factuur': k.laatsteFactuur,
    }));
    if (type === 'csv') {
      exportCSV('top-klanten', headers, data);
    } else {
      exportExcel('top-klanten', headers, data);
    }
    toast.success(`Top klanten geexporteerd als ${type.toUpperCase()}`);
  }

  function handleExportProjecten(type: 'csv' | 'excel') {
    const headers = ['Project', 'Klant', 'Budget', 'Besteed', 'Marge %', 'Status'];
    const data = projectWinstgevendheid.map((p) => ({
      Project: p.naam,
      Klant: p.klant_naam || p.klant_id,
      Budget: p.budget,
      Besteed: p.besteed,
      'Marge %': p.marge,
      Status: p.status,
    }));
    if (type === 'csv') {
      exportCSV('project-winstgevendheid', headers, data);
    } else {
      exportExcel('project-winstgevendheid', headers, data);
    }
    toast.success(`Projecten geexporteerd als ${type.toUpperCase()}`);
  }

  function handleExportOffertes(type: 'csv' | 'excel') {
    const headers = ['Nummer', 'Titel', 'Klant', 'Status', 'Totaal', 'Datum'];
    const data = gefilterdeOffertes.map((o) => ({
      Nummer: o.nummer,
      Titel: o.titel,
      Klant: o.klant_naam || o.klant_id,
      Status: o.status,
      Totaal: o.totaal,
      Datum: o.created_at.split('T')[0],
    }));
    if (type === 'csv') {
      exportCSV('offertes', headers, data);
    } else {
      exportExcel('offertes', headers, data);
    }
    toast.success(`Offertes geexporteerd als ${type.toUpperCase()}`);
  }

  function handleExportOmzet(type: 'csv' | 'excel') {
    const headers = ['Maand', 'Omzet'];
    const data = maandelijksOmzet.map((m) => ({
      Maand: m.maand,
      Omzet: Math.round(m.waarde * 100) / 100,
    }));
    if (type === 'csv') {
      exportCSV('maandelijkse-omzet', headers, data);
    } else {
      exportExcel('maandelijkse-omzet', headers, data);
    }
    toast.success(`Omzetgegevens geexporteerd als ${type.toUpperCase()}`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDatum(datum: string): string {
    const d = new Date(datum);
    return d.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function margeKleur(marge: number): string {
    if (marge >= 20) return 'text-green-600';
    if (marge >= 5) return 'text-yellow-600';
    return 'text-red-600';
  }

  function margeBadgeVariant(marge: number): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (marge >= 20) return 'default';
    if (marge >= 5) return 'secondary';
    return 'destructive';
  }

  function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'actief': return 'default';
      case 'afgerond': return 'secondary';
      case 'gepland': return 'outline';
      default: return 'outline';
    }
  }

  function statusNaarNederlands(status: string): string {
    switch (status) {
      case 'actief': return 'Actief';
      case 'afgerond': return 'Afgerond';
      case 'gepland': return 'Gepland';
      case 'gepauzeerd': return 'Gepauzeerd';
      default: return status;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Rapportages laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapportages</h1>
          <p className="text-muted-foreground">
            Inzicht in omzet, projecten en offertes van uw signbedrijf
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select
            value={periode}
            onValueChange={(v) => setPeriode(v as Periode)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecteer periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deze_maand">Deze maand</SelectItem>
              <SelectItem value="dit_kwartaal">Dit kwartaal</SelectItem>
              <SelectItem value="dit_jaar">Dit jaar</SelectItem>
              <SelectItem value="aangepast">Aangepast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Cards */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Totale omzet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale omzet</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totaleOmzet)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {getPeriodeLabel(periode)}
            </p>
          </CardContent>
        </Card>

        {/* Totale winst */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale winst</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totaleWinst)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <span className="text-green-500 font-medium">65%</span> marge
            </p>
          </CardContent>
        </Card>

        {/* Conversieratio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversieratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversieRatio}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Offertes naar facturen
            </p>
          </CardContent>
        </Card>

        {/* Gemiddelde projectwaarde */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gem. projectwaarde
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(gemiddeldeProjectwaarde)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Over {projecten.length} projecten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Omzet Grafiek (bar chart) */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Omzet per maand
              </CardTitle>
              <CardDescription>
                Maandelijks gefactureerde omzet voor {new Date().getFullYear()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOmzet('csv')}
              >
                <Download className="mr-1 h-3 w-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOmzet('excel')}
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-[240px] pt-4">
            {maandelijksOmzet.map((m, i) => {
              const barHeight = maxMaandOmzet > 0 ? (m.waarde / maxMaandOmzet) * 200 : 0;
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {m.waarde > 0
                      ? formatCurrency(m.waarde).replace(/\s/g, '')
                      : ''}
                  </span>
                  <div
                    className={cn(
                      'w-full max-w-[48px] rounded-t-md transition-all duration-500',
                      m.waarde > 0
                        ? 'bg-primary hover:bg-primary/80'
                        : 'bg-muted',
                    )}
                    style={{
                      height: `${Math.max(barHeight, 2)}px`,
                    }}
                    title={`${m.maand}: ${formatCurrency(m.waarde)}`}
                  />
                  <span className="text-xs text-muted-foreground font-medium">
                    {m.maand}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Top Klanten Tabel */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top klanten
              </CardTitle>
              <CardDescription>
                Top 5 klanten op basis van gefactureerde omzet
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportKlanten('csv')}
              >
                <Download className="mr-1 h-3 w-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportKlanten('excel')}
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Klant</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Aantal projecten
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Totaal gefactureerd
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Openstaand
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Laatste factuur
                  </th>
                </tr>
              </thead>
              <tbody>
                {topKlanten.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Geen klantgegevens beschikbaar voor deze periode.
                    </td>
                  </tr>
                ) : (
                  topKlanten.map((k, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 font-medium">{k.naam}</td>
                      <td className="py-3 text-right">{k.aantalProjecten}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(k.totaalGefactureerd)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={cn(
                            k.openstaand > 0
                              ? 'text-orange-600'
                              : 'text-green-600',
                          )}
                        >
                          {formatCurrency(k.openstaand)}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatDatum(k.laatsteFactuur)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Project Winstgevendheid */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Project winstgevendheid
              </CardTitle>
              <CardDescription>
                Budget versus bestede kosten per project
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportProjecten('csv')}
              >
                <Download className="mr-1 h-3 w-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportProjecten('excel')}
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Project</th>
                  <th className="pb-3 font-medium text-muted-foreground">Klant</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Budget
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Besteed
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Marge %
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectWinstgevendheid.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Geen projectgegevens beschikbaar.
                    </td>
                  </tr>
                ) : (
                  projectWinstgevendheid.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 font-medium max-w-[220px] truncate">
                        {p.naam}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {p.klant_naam || p.klant_id}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(p.budget)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(p.besteed)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          {p.marge > 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-green-600" />
                          ) : p.marge < 0 ? (
                            <ArrowDownRight className="h-3 w-3 text-red-600" />
                          ) : (
                            <Minus className="h-3 w-3 text-yellow-600" />
                          )}
                          <span className={cn('font-medium', margeKleur(p.marge))}>
                            {p.marge}%
                          </span>
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={statusBadgeVariant(p.status)}>
                          {statusNaarNederlands(p.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Offerte Conversie */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Offerte conversie
              </CardTitle>
              <CardDescription>
                Overzicht van offertes en conversieratio voor{' '}
                {getPeriodeLabel(periode).toLowerCase()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOffertes('csv')}
              >
                <Download className="mr-1 h-3 w-3" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOffertes('excel')}
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Totaal offertes */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Totaal offertes</p>
              <p className="text-3xl font-bold">{offerteStats.totaal}</p>
            </div>

            {/* Goedgekeurd */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Goedgekeurd</p>
              <p className="text-3xl font-bold text-green-600">
                {offerteStats.goedgekeurd}
              </p>
            </div>

            {/* Afgewezen */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Afgewezen</p>
              <p className="text-3xl font-bold text-red-600">
                {offerteStats.afgewezen}
              </p>
            </div>

            {/* In behandeling */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">In behandeling</p>
              <p className="text-3xl font-bold text-yellow-600">
                {offerteStats.inBehandeling}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Conversieratio visual */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Conversieratio</p>
              <p className="text-sm font-bold">{offerteStats.ratio}%</p>
            </div>
            <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${offerteStats.ratio}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>
                {offerteStats.goedgekeurd} van {offerteStats.totaal} offertes
                goedgekeurd
              </span>
              <span>100%</span>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Visual breakdown bar */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Verdeling offertestatus</p>
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {offerteStats.goedgekeurd > 0 && (
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(offerteStats.goedgekeurd / Math.max(offerteStats.totaal, 1)) * 100}%`,
                  }}
                  title={`Goedgekeurd: ${offerteStats.goedgekeurd}`}
                />
              )}
              {offerteStats.inBehandeling > 0 && (
                <div
                  className="bg-yellow-400 transition-all duration-500"
                  style={{
                    width: `${(offerteStats.inBehandeling / Math.max(offerteStats.totaal, 1)) * 100}%`,
                  }}
                  title={`In behandeling: ${offerteStats.inBehandeling}`}
                />
              )}
              {offerteStats.afgewezen > 0 && (
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{
                    width: `${(offerteStats.afgewezen / Math.max(offerteStats.totaal, 1)) * 100}%`,
                  }}
                  title={`Afgewezen: ${offerteStats.afgewezen}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Goedgekeurd ({offerteStats.goedgekeurd})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                In behandeling ({offerteStats.inBehandeling})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Afgewezen ({offerteStats.afgewezen})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
