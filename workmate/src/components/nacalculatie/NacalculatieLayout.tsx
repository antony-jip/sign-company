import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  ChevronRight,
  Clock,
  Package,
  Euro,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import {
  getProjecten,
  getOffertes,
  getOfferteItems,
  getTijdregistraties,
  getFacturen,
} from '@/services/supabaseService'
import type { Project, Offerte, OfferteItem, Tijdregistratie, Factuur } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { exportCSV, exportExcel } from '@/lib/export'
import { toast } from 'sonner'

// ============ DEMO DATA ============

const DEMO_PROJECTEN: Project[] = [
  {
    id: 'p1',
    user_id: 'u1',
    klant_id: 'k1',
    klant_naam: 'Bakkerij van Dijk',
    naam: 'Gevelreclame + lichtreclame',
    beschrijving: 'Nieuwe gevelreclame met LED verlichting voor de bakkerij',
    status: 'afgerond',
    prioriteit: 'hoog',
    start_datum: '2025-09-01',
    eind_datum: '2025-10-15',
    budget: 8500,
    besteed: 7200,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-09-01',
    updated_at: '2025-10-15',
  },
  {
    id: 'p2',
    user_id: 'u1',
    klant_id: 'k2',
    klant_naam: 'Autogarage Jansen',
    naam: 'Autobelettering wagenpark (12 voertuigen)',
    beschrijving: 'Complete belettering van het wagenpark',
    status: 'afgerond',
    prioriteit: 'medium',
    start_datum: '2025-08-01',
    eind_datum: '2025-09-20',
    budget: 14400,
    besteed: 16800,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-08-01',
    updated_at: '2025-09-20',
  },
  {
    id: 'p3',
    user_id: 'u1',
    klant_id: 'k3',
    klant_naam: 'Restaurant De Gouden Leeuw',
    naam: 'Menukaarten + raamfolie',
    beschrijving: 'Nieuwe menukaarten en raamfolie met logo',
    status: 'afgerond',
    prioriteit: 'laag',
    start_datum: '2025-10-01',
    eind_datum: '2025-10-20',
    budget: 3200,
    besteed: 2650,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-10-01',
    updated_at: '2025-10-20',
  },
  {
    id: 'p4',
    user_id: 'u1',
    klant_id: 'k4',
    klant_naam: 'Sportschool FitLife',
    naam: 'Interieur signing + wayfinding',
    beschrijving: 'Bewegwijzering en interieur signing voor nieuw filiaal',
    status: 'afgerond',
    prioriteit: 'hoog',
    start_datum: '2025-07-15',
    eind_datum: '2025-09-30',
    budget: 22000,
    besteed: 24500,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-07-15',
    updated_at: '2025-09-30',
  },
  {
    id: 'p5',
    user_id: 'u1',
    klant_id: 'k5',
    klant_naam: 'Makelaardij Hoekstra',
    naam: 'Makelaarsborden (50 stuks)',
    beschrijving: 'Productie en levering van 50 makelaarsborden',
    status: 'afgerond',
    prioriteit: 'medium',
    start_datum: '2025-11-01',
    eind_datum: '2025-11-25',
    budget: 5000,
    besteed: 3900,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-11-01',
    updated_at: '2025-11-25',
  },
  {
    id: 'p6',
    user_id: 'u1',
    klant_id: 'k6',
    klant_naam: 'Bouwbedrijf De Vries',
    naam: 'Bouwbordenserie + hekwerkbanners',
    beschrijving: 'Bouwborden en hekwerkbanners voor 3 projectlocaties',
    status: 'afgerond',
    prioriteit: 'medium',
    start_datum: '2025-10-10',
    eind_datum: '2025-11-15',
    budget: 6800,
    besteed: 6950,
    voortgang: 100,
    team_leden: [],
    created_at: '2025-10-10',
    updated_at: '2025-11-15',
  },
]

const DEMO_OFFERTES: Offerte[] = [
  {
    id: 'o1', user_id: 'u1', klant_id: 'k1', klant_naam: 'Bakkerij van Dijk',
    project_id: 'p1', nummer: 'OFF-2025-041', titel: 'Gevelreclame + lichtreclame',
    status: 'goedgekeurd', subtotaal: 7024.79, btw_bedrag: 1475.21, totaal: 8500,
    geldig_tot: '2025-09-30', notities: '', voorwaarden: '',
    created_at: '2025-08-25', updated_at: '2025-08-28',
  },
  {
    id: 'o2', user_id: 'u1', klant_id: 'k2', klant_naam: 'Autogarage Jansen',
    project_id: 'p2', nummer: 'OFF-2025-038', titel: 'Autobelettering wagenpark',
    status: 'goedgekeurd', subtotaal: 11900.83, btw_bedrag: 2499.17, totaal: 14400,
    geldig_tot: '2025-08-31', notities: '', voorwaarden: '',
    created_at: '2025-07-20', updated_at: '2025-07-25',
  },
  {
    id: 'o3', user_id: 'u1', klant_id: 'k3', klant_naam: 'Restaurant De Gouden Leeuw',
    project_id: 'p3', nummer: 'OFF-2025-045', titel: 'Menukaarten + raamfolie',
    status: 'goedgekeurd', subtotaal: 2644.63, btw_bedrag: 555.37, totaal: 3200,
    geldig_tot: '2025-10-31', notities: '', voorwaarden: '',
    created_at: '2025-09-25', updated_at: '2025-09-28',
  },
  {
    id: 'o4', user_id: 'u1', klant_id: 'k4', klant_naam: 'Sportschool FitLife',
    project_id: 'p4', nummer: 'OFF-2025-032', titel: 'Interieur signing + wayfinding',
    status: 'goedgekeurd', subtotaal: 18181.82, btw_bedrag: 3818.18, totaal: 22000,
    geldig_tot: '2025-08-15', notities: '', voorwaarden: '',
    created_at: '2025-07-01', updated_at: '2025-07-10',
  },
  {
    id: 'o5', user_id: 'u1', klant_id: 'k5', klant_naam: 'Makelaardij Hoekstra',
    project_id: 'p5', nummer: 'OFF-2025-050', titel: 'Makelaarsborden 50 stuks',
    status: 'goedgekeurd', subtotaal: 4132.23, btw_bedrag: 867.77, totaal: 5000,
    geldig_tot: '2025-11-30', notities: '', voorwaarden: '',
    created_at: '2025-10-25', updated_at: '2025-10-28',
  },
  {
    id: 'o6', user_id: 'u1', klant_id: 'k6', klant_naam: 'Bouwbedrijf De Vries',
    project_id: 'p6', nummer: 'OFF-2025-047', titel: 'Bouwborden + hekwerkbanners',
    status: 'goedgekeurd', subtotaal: 5619.83, btw_bedrag: 1180.17, totaal: 6800,
    geldig_tot: '2025-11-10', notities: '', voorwaarden: '',
    created_at: '2025-10-05', updated_at: '2025-10-08',
  },
]

const DEMO_OFFERTE_ITEMS: Record<string, OfferteItem[]> = {
  o1: [
    { id: 'oi1', offerte_id: 'o1', beschrijving: 'Dibond gevelletters 3D (set)', aantal: 1, eenheidsprijs: 3200, btw_percentage: 21, korting_percentage: 0, totaal: 3200, volgorde: 1, created_at: '2025-08-25' },
    { id: 'oi2', offerte_id: 'o1', beschrijving: 'LED verlichting module', aantal: 8, eenheidsprijs: 185, btw_percentage: 21, korting_percentage: 0, totaal: 1480, volgorde: 2, created_at: '2025-08-25' },
    { id: 'oi3', offerte_id: 'o1', beschrijving: 'Montage op hoogte (hoogwerker)', aantal: 1, eenheidsprijs: 1850, btw_percentage: 21, korting_percentage: 0, totaal: 1850, volgorde: 3, created_at: '2025-08-25' },
    { id: 'oi4', offerte_id: 'o1', beschrijving: 'Elektra aansluiting', aantal: 1, eenheidsprijs: 650, btw_percentage: 21, korting_percentage: 0, totaal: 650, volgorde: 4, created_at: '2025-08-25' },
    { id: 'oi5', offerte_id: 'o1', beschrijving: 'Ontwerp en DTP', aantal: 4, eenheidsprijs: 85, btw_percentage: 21, korting_percentage: 0, totaal: 340, volgorde: 5, created_at: '2025-08-25' },
  ],
  o2: [
    { id: 'oi6', offerte_id: 'o2', beschrijving: 'Carwrap folie per voertuig', aantal: 12, eenheidsprijs: 650, btw_percentage: 21, korting_percentage: 0, totaal: 7800, volgorde: 1, created_at: '2025-07-20' },
    { id: 'oi7', offerte_id: 'o2', beschrijving: 'Ontwerp belettering per voertuig', aantal: 3, eenheidsprijs: 280, btw_percentage: 21, korting_percentage: 0, totaal: 840, volgorde: 2, created_at: '2025-07-20' },
    { id: 'oi8', offerte_id: 'o2', beschrijving: 'Applicatie per voertuig', aantal: 12, eenheidsprijs: 320, btw_percentage: 21, korting_percentage: 0, totaal: 3840, volgorde: 3, created_at: '2025-07-20' },
    { id: 'oi9', offerte_id: 'o2', beschrijving: 'Beschermende laminaat', aantal: 12, eenheidsprijs: 85, btw_percentage: 21, korting_percentage: 0, totaal: 1020, volgorde: 4, created_at: '2025-07-20' },
  ],
  o3: [
    { id: 'oi10', offerte_id: 'o3', beschrijving: 'Menukaarten ontwerp + druk (200 st)', aantal: 1, eenheidsprijs: 1400, btw_percentage: 21, korting_percentage: 0, totaal: 1400, volgorde: 1, created_at: '2025-09-25' },
    { id: 'oi11', offerte_id: 'o3', beschrijving: 'Raamfolie met logo (6m2)', aantal: 6, eenheidsprijs: 185, btw_percentage: 21, korting_percentage: 0, totaal: 1110, volgorde: 2, created_at: '2025-09-25' },
    { id: 'oi12', offerte_id: 'o3', beschrijving: 'Applicatie raamfolie', aantal: 1, eenheidsprijs: 350, btw_percentage: 21, korting_percentage: 0, totaal: 350, volgorde: 3, created_at: '2025-09-25' },
  ],
  o4: [
    { id: 'oi13', offerte_id: 'o4', beschrijving: 'Wayfinding systeem (40 borden)', aantal: 40, eenheidsprijs: 145, btw_percentage: 21, korting_percentage: 0, totaal: 5800, volgorde: 1, created_at: '2025-07-01' },
    { id: 'oi14', offerte_id: 'o4', beschrijving: 'Grote wandsigning (3 stuks)', aantal: 3, eenheidsprijs: 2800, btw_percentage: 21, korting_percentage: 0, totaal: 8400, volgorde: 2, created_at: '2025-07-01' },
    { id: 'oi15', offerte_id: 'o4', beschrijving: 'Ontwerp interieur concept', aantal: 1, eenheidsprijs: 2200, btw_percentage: 21, korting_percentage: 0, totaal: 2200, volgorde: 3, created_at: '2025-07-01' },
    { id: 'oi16', offerte_id: 'o4', beschrijving: 'Montage en installatie', aantal: 1, eenheidsprijs: 3600, btw_percentage: 21, korting_percentage: 0, totaal: 3600, volgorde: 4, created_at: '2025-07-01' },
  ],
  o5: [
    { id: 'oi17', offerte_id: 'o5', beschrijving: 'Makelaarsbord Dibond 60x80cm', aantal: 50, eenheidsprijs: 65, btw_percentage: 21, korting_percentage: 0, totaal: 3250, volgorde: 1, created_at: '2025-10-25' },
    { id: 'oi18', offerte_id: 'o5', beschrijving: 'Aluminium bordhouders', aantal: 50, eenheidsprijs: 22, btw_percentage: 21, korting_percentage: 0, totaal: 1100, volgorde: 2, created_at: '2025-10-25' },
    { id: 'oi19', offerte_id: 'o5', beschrijving: 'Ontwerp en opmaak', aantal: 1, eenheidsprijs: 350, btw_percentage: 21, korting_percentage: 0, totaal: 350, volgorde: 3, created_at: '2025-10-25' },
  ],
  o6: [
    { id: 'oi20', offerte_id: 'o6', beschrijving: 'Bouwbord 244x122cm (3 stuks)', aantal: 3, eenheidsprijs: 850, btw_percentage: 21, korting_percentage: 0, totaal: 2550, volgorde: 1, created_at: '2025-10-05' },
    { id: 'oi21', offerte_id: 'o6', beschrijving: 'Hekwerkbanner 340x176cm (6 stuks)', aantal: 6, eenheidsprijs: 420, btw_percentage: 21, korting_percentage: 0, totaal: 2520, volgorde: 2, created_at: '2025-10-05' },
    { id: 'oi22', offerte_id: 'o6', beschrijving: 'Plaatsing op locatie (3 locaties)', aantal: 3, eenheidsprijs: 380, btw_percentage: 21, korting_percentage: 0, totaal: 1140, volgorde: 3, created_at: '2025-10-05' },
  ],
}

const DEMO_TIJDREGISTRATIES: Tijdregistratie[] = [
  // Project 1 - Bakkerij van Dijk (totaal: 1802.50 + 520 + 675 + 225 = ~3222)
  { id: 't1', user_id: 'u1', project_id: 'p1', project_naam: 'Gevelreclame + lichtreclame', omschrijving: 'Ontwerp gevelletters', datum: '2025-09-05', start_tijd: '08:00', eind_tijd: '11:30', duur_minuten: 210, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2025-09-05', updated_at: '2025-09-05' },
  { id: 't2', user_id: 'u1', project_id: 'p1', project_naam: 'Gevelreclame + lichtreclame', omschrijving: 'Productie letters', datum: '2025-09-15', start_tijd: '07:00', eind_tijd: '15:00', duur_minuten: 480, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-09-15', updated_at: '2025-09-15' },
  { id: 't3', user_id: 'u1', project_id: 'p1', project_naam: 'Gevelreclame + lichtreclame', omschrijving: 'Montage op locatie', datum: '2025-10-01', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2025-10-01', updated_at: '2025-10-01' },
  { id: 't4', user_id: 'u1', project_id: 'p1', project_naam: 'Gevelreclame + lichtreclame', omschrijving: 'Elektra aansluiting', datum: '2025-10-02', start_tijd: '09:00', eind_tijd: '12:00', duur_minuten: 180, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2025-10-02', updated_at: '2025-10-02' },
  // Project 2 - Autogarage Jansen (over budget)
  { id: 't5', user_id: 'u1', project_id: 'p2', project_naam: 'Autobelettering wagenpark', omschrijving: 'Ontwerp belettering 3 varianten', datum: '2025-08-05', start_tijd: '08:00', eind_tijd: '16:00', duur_minuten: 480, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2025-08-05', updated_at: '2025-08-05' },
  { id: 't6', user_id: 'u1', project_id: 'p2', project_naam: 'Autobelettering wagenpark', omschrijving: 'Snijden en wieden folie', datum: '2025-08-15', start_tijd: '07:00', eind_tijd: '15:30', duur_minuten: 510, uurtarief: 55, facturabel: true, gefactureerd: false, created_at: '2025-08-15', updated_at: '2025-08-15' },
  { id: 't7', user_id: 'u1', project_id: 'p2', project_naam: 'Autobelettering wagenpark', omschrijving: 'Applicatie voertuigen batch 1 (6 st)', datum: '2025-08-25', start_tijd: '07:00', eind_tijd: '17:00', duur_minuten: 600, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-08-25', updated_at: '2025-08-25' },
  { id: 't8', user_id: 'u1', project_id: 'p2', project_naam: 'Autobelettering wagenpark', omschrijving: 'Applicatie voertuigen batch 2 (6 st)', datum: '2025-09-05', start_tijd: '07:00', eind_tijd: '17:00', duur_minuten: 600, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-09-05', updated_at: '2025-09-05' },
  { id: 't9', user_id: 'u1', project_id: 'p2', project_naam: 'Autobelettering wagenpark', omschrijving: 'Herstelwerk en extra folie', datum: '2025-09-15', start_tijd: '08:00', eind_tijd: '14:00', duur_minuten: 360, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-09-15', updated_at: '2025-09-15' },
  // Project 3 - Restaurant De Gouden Leeuw (under budget)
  { id: 't10', user_id: 'u1', project_id: 'p3', project_naam: 'Menukaarten + raamfolie', omschrijving: 'Ontwerp menukaart', datum: '2025-10-03', start_tijd: '09:00', eind_tijd: '13:00', duur_minuten: 240, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2025-10-03', updated_at: '2025-10-03' },
  { id: 't11', user_id: 'u1', project_id: 'p3', project_naam: 'Menukaarten + raamfolie', omschrijving: 'Applicatie raamfolie', datum: '2025-10-15', start_tijd: '08:00', eind_tijd: '12:00', duur_minuten: 240, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-10-15', updated_at: '2025-10-15' },
  // Project 4 - Sportschool FitLife (over budget)
  { id: 't12', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Concept en ontwerp wayfinding', datum: '2025-07-20', start_tijd: '08:00', eind_tijd: '17:00', duur_minuten: 540, uurtarief: 95, facturabel: true, gefactureerd: false, created_at: '2025-07-20', updated_at: '2025-07-20' },
  { id: 't13', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Productie wandsigning', datum: '2025-08-10', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-08-10', updated_at: '2025-08-10' },
  { id: 't14', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Productie wayfinding borden', datum: '2025-08-20', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-08-20', updated_at: '2025-08-20' },
  { id: 't15', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Montage dag 1', datum: '2025-09-15', start_tijd: '07:00', eind_tijd: '17:00', duur_minuten: 600, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2025-09-15', updated_at: '2025-09-15' },
  { id: 't16', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Montage dag 2 + oplevering', datum: '2025-09-16', start_tijd: '07:00', eind_tijd: '17:00', duur_minuten: 600, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2025-09-16', updated_at: '2025-09-16' },
  { id: 't17', user_id: 'u1', project_id: 'p4', project_naam: 'Interieur signing + wayfinding', omschrijving: 'Extra revisie wandsigning', datum: '2025-09-25', start_tijd: '09:00', eind_tijd: '15:00', duur_minuten: 360, uurtarief: 75, facturabel: true, gefactureerd: false, created_at: '2025-09-25', updated_at: '2025-09-25' },
  // Project 5 - Makelaardij Hoekstra (under budget, good margin)
  { id: 't18', user_id: 'u1', project_id: 'p5', project_naam: 'Makelaarsborden', omschrijving: 'Opmaak borden', datum: '2025-11-05', start_tijd: '09:00', eind_tijd: '12:00', duur_minuten: 180, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2025-11-05', updated_at: '2025-11-05' },
  { id: 't19', user_id: 'u1', project_id: 'p5', project_naam: 'Makelaarsborden', omschrijving: 'Productie en snijden', datum: '2025-11-12', start_tijd: '07:00', eind_tijd: '14:00', duur_minuten: 420, uurtarief: 55, facturabel: true, gefactureerd: false, created_at: '2025-11-12', updated_at: '2025-11-12' },
  // Project 6 - Bouwbedrijf De Vries (close to budget, orange)
  { id: 't20', user_id: 'u1', project_id: 'p6', project_naam: 'Bouwbordenserie + hekwerkbanners', omschrijving: 'Ontwerp bouwborden', datum: '2025-10-12', start_tijd: '09:00', eind_tijd: '14:00', duur_minuten: 300, uurtarief: 85, facturabel: true, gefactureerd: false, created_at: '2025-10-12', updated_at: '2025-10-12' },
  { id: 't21', user_id: 'u1', project_id: 'p6', project_naam: 'Bouwbordenserie + hekwerkbanners', omschrijving: 'Productie borden + banners', datum: '2025-10-25', start_tijd: '07:00', eind_tijd: '15:00', duur_minuten: 480, uurtarief: 55, facturabel: true, gefactureerd: false, created_at: '2025-10-25', updated_at: '2025-10-25' },
  { id: 't22', user_id: 'u1', project_id: 'p6', project_naam: 'Bouwbordenserie + hekwerkbanners', omschrijving: 'Plaatsing 3 locaties', datum: '2025-11-05', start_tijd: '07:00', eind_tijd: '16:00', duur_minuten: 540, uurtarief: 65, facturabel: true, gefactureerd: false, created_at: '2025-11-05', updated_at: '2025-11-05' },
]

// ============ INTERNAL TYPES ============

interface NacalculatieRegel {
  projectId: string
  projectNaam: string
  klantNaam: string
  offerteTotaal: number
  werkelijkeKosten: number
  tijdKosten: number
  materiaalKosten: number
  verschil: number
  margePercentage: number
  offerteItems: OfferteItem[]
  tijdregistraties: Tijdregistratie[]
}

// ============ COMPONENT ============

export function NacalculatieLayout() {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [alleOfferteItems, setAlleOfferteItems] = useState<Record<string, OfferteItem[]>>({})
  const [tijdregistraties, setTijdregistraties] = useState<Tijdregistratie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('alle')
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [proj, off, tijd] = await Promise.all([
          getProjecten(),
          getOffertes(),
          getTijdregistraties(),
        ])

        const afgerondeProjecten = proj.filter((p) => p.status === 'afgerond')
        const goedgekeurdeOffertes = off.filter(
          (o) => o.status === 'goedgekeurd' && o.project_id
        )

        const itemsMap: Record<string, OfferteItem[]> = {}
        await Promise.all(
          goedgekeurdeOffertes.map(async (offerte) => {
            try {
              const items = await getOfferteItems(offerte.id)
              itemsMap[offerte.id] = items
            } catch {
              itemsMap[offerte.id] = []
            }
          })
        )

        if (afgerondeProjecten.length === 0) {
          setProjecten(DEMO_PROJECTEN)
          setOffertes(DEMO_OFFERTES)
          setAlleOfferteItems(DEMO_OFFERTE_ITEMS)
          setTijdregistraties(DEMO_TIJDREGISTRATIES)
        } else {
          setProjecten(afgerondeProjecten)
          setOffertes(goedgekeurdeOffertes)
          setAlleOfferteItems(itemsMap)
          setTijdregistraties(tijd)
        }
      } catch {
        setProjecten(DEMO_PROJECTEN)
        setOffertes(DEMO_OFFERTES)
        setAlleOfferteItems(DEMO_OFFERTE_ITEMS)
        setTijdregistraties(DEMO_TIJDREGISTRATIES)
        toast.error('Fout bij laden data. Demogegevens worden getoond.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const nacalculatieData = useMemo<NacalculatieRegel[]>(() => {
    return projecten.map((project) => {
      const projectOfferte = offertes.find((o) => o.project_id === project.id)
      const offerteTotaal = projectOfferte?.totaal ?? project.budget
      const offerteId = projectOfferte?.id ?? ''
      const items = alleOfferteItems[offerteId] ?? []

      const projectTijd = tijdregistraties.filter((t) => t.project_id === project.id)
      const tijdKosten = projectTijd.reduce(
        (sum, t) => sum + (t.duur_minuten / 60) * t.uurtarief,
        0
      )

      const werkelijkeKosten = Math.max(project.besteed, tijdKosten)
      const materiaalKosten = Math.max(0, werkelijkeKosten - tijdKosten)

      const verschil = offerteTotaal - werkelijkeKosten
      const margePercentage =
        offerteTotaal > 0 ? (verschil / offerteTotaal) * 100 : 0

      return {
        projectId: project.id,
        projectNaam: project.naam,
        klantNaam: project.klant_naam ?? 'Onbekende klant',
        offerteTotaal,
        werkelijkeKosten,
        tijdKosten,
        materiaalKosten,
        verschil,
        margePercentage,
        offerteItems: items,
        tijdregistraties: projectTijd,
      }
    })
  }, [projecten, offertes, alleOfferteItems, tijdregistraties])

  const gefilterdeData = useMemo(() => {
    if (selectedProjectId === 'alle') return nacalculatieData
    return nacalculatieData.filter((d) => d.projectId === selectedProjectId)
  }, [nacalculatieData, selectedProjectId])

  const samenvatting = useMemo(() => {
    if (nacalculatieData.length === 0) {
      return { gemiddeldeMarge: 0, bovenBudget: 0, onderBudget: 0, totaalVerschil: 0 }
    }
    const gemiddeldeMarge =
      nacalculatieData.reduce((sum, d) => sum + d.margePercentage, 0) /
      nacalculatieData.length
    const bovenBudget = nacalculatieData.filter((d) => d.verschil < 0).length
    const onderBudget = nacalculatieData.filter((d) => d.verschil > 0).length
    const totaalVerschil = nacalculatieData.reduce((sum, d) => sum + d.verschil, 0)
    return { gemiddeldeMarge, bovenBudget, onderBudget, totaalVerschil }
  }, [nacalculatieData])

  const detailData = useMemo(() => {
    if (!detailProjectId) return null
    return nacalculatieData.find((d) => d.projectId === detailProjectId) ?? null
  }, [nacalculatieData, detailProjectId])

  function getStatusIndicator(margePercentage: number) {
    if (margePercentage >= 15) {
      return {
        kleur: 'bg-green-500',
        tekstKleur: 'text-green-700 dark:text-green-400',
        badgeKleur: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        label: 'Winstgevend',
        icon: TrendingUp,
      }
    }
    if (margePercentage >= 0) {
      return {
        kleur: 'bg-orange-500',
        tekstKleur: 'text-orange-700 dark:text-orange-400',
        badgeKleur: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        label: 'Krap',
        icon: AlertTriangle,
      }
    }
    return {
      kleur: 'bg-red-500',
      tekstKleur: 'text-red-700 dark:text-red-400',
      badgeKleur: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      label: 'Verliesgevend',
      icon: TrendingDown,
    }
  }

  function handleExportCSV() {
    const headers = [
      'Project',
      'Klant',
      'Offerte totaal',
      'Werkelijke kosten',
      'Verschil',
      'Marge %',
      'Tijd kosten',
      'Materiaal kosten',
    ]
    const rows = gefilterdeData.map((d) => ({
      'Project': d.projectNaam,
      'Klant': d.klantNaam,
      'Offerte totaal': Math.round(d.offerteTotaal * 100) / 100,
      'Werkelijke kosten': Math.round(d.werkelijkeKosten * 100) / 100,
      'Verschil': Math.round(d.verschil * 100) / 100,
      'Marge %': Math.round(d.margePercentage * 10) / 10,
      'Tijd kosten': Math.round(d.tijdKosten * 100) / 100,
      'Materiaal kosten': Math.round(d.materiaalKosten * 100) / 100,
    }))
    exportCSV('nacalculatie', headers, rows)
    toast.success('CSV gedownload')
  }

  function handleExportExcel() {
    const headers = [
      'Project',
      'Klant',
      'Offerte totaal',
      'Werkelijke kosten',
      'Verschil',
      'Marge %',
      'Tijd kosten',
      'Materiaal kosten',
    ]
    const rows = gefilterdeData.map((d) => ({
      'Project': d.projectNaam,
      'Klant': d.klantNaam,
      'Offerte totaal': Math.round(d.offerteTotaal * 100) / 100,
      'Werkelijke kosten': Math.round(d.werkelijkeKosten * 100) / 100,
      'Verschil': Math.round(d.verschil * 100) / 100,
      'Marge %': Math.round(d.margePercentage * 10) / 10,
      'Tijd kosten': Math.round(d.tijdKosten * 100) / 100,
      'Materiaal kosten': Math.round(d.materiaalKosten * 100) / 100,
    }))
    exportExcel('nacalculatie', headers, rows, 'Nacalculatie')
    toast.success('Excel bestand gedownload')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nacalculatie
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vergelijk offertes met werkelijke kosten
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nacalculatie
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vergelijk offertes met werkelijke kosten
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* ==================== SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Gemiddelde marge
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  samenvatting.gemiddeldeMarge >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                )}>
                  {samenvatting.gemiddeldeMarge.toFixed(1)}%
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                samenvatting.gemiddeldeMarge >= 0
                  ? 'bg-green-50 dark:bg-green-900/30'
                  : 'bg-red-50 dark:bg-red-900/30'
              )}>
                <BarChart3 className={cn(
                  'w-5 h-5',
                  samenvatting.gemiddeldeMarge >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Projecten boven budget
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {samenvatting.bovenBudget}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  projecten
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Projecten onder budget
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {samenvatting.onderBudget}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  projecten
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Totaal verschil
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  samenvatting.totaalVerschil >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                )}>
                  {samenvatting.totaalVerschil >= 0 ? '+' : ''}
                  {formatCurrency(samenvatting.totaalVerschil)}
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                samenvatting.totaalVerschil >= 0
                  ? 'bg-green-50 dark:bg-green-900/30'
                  : 'bg-red-50 dark:bg-red-900/30'
              )}>
                <Euro className={cn(
                  'w-5 h-5',
                  samenvatting.totaalVerschil >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== PROJECT SELECTOR ==================== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Projectselectie</CardTitle>
              <CardDescription>
                Selecteer een afgerond project om te analyseren
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle projecten ({projecten.length})</SelectItem>
                  {projecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.naam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ==================== COMPARISON TABLE ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Vergelijking offerte vs. werkelijk
          </CardTitle>
          <CardDescription>
            {gefilterdeData.length} afgerond{gefilterdeData.length !== 1 ? 'e' : ''} project{gefilterdeData.length !== 1 ? 'en' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gefilterdeData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Geen afgeronde projecten gevonden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Project
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Klant
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Offerte
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Werkelijk
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Verschil
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Marge
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gefilterdeData.map((regel) => {
                    const status = getStatusIndicator(regel.margePercentage)
                    const StatusIcon = status.icon
                    return (
                      <tr
                        key={regel.projectId}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {regel.projectNaam}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          {regel.klantNaam}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">
                          {formatCurrency(regel.offerteTotaal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">
                          {formatCurrency(regel.werkelijkeKosten)}
                        </td>
                        <td className={cn(
                          'py-3 px-4 text-right font-mono font-semibold',
                          status.tekstKleur,
                        )}>
                          <span className="inline-flex items-center gap-1">
                            {regel.verschil > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : regel.verschil < 0 ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                            {regel.verschil >= 0 ? '+' : ''}
                            {formatCurrency(regel.verschil)}
                          </span>
                        </td>
                        <td className={cn(
                          'py-3 px-4 text-right font-semibold',
                          status.tekstKleur,
                        )}>
                          {regel.margePercentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={cn('gap-1', status.badgeKleur)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailProjectId(regel.projectId)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Bekijken
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== OVERVIEW TABLE WITH MARGIN BARS ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overzicht alle projecten</CardTitle>
          <CardDescription>
            Margeverdeling van alle afgeronde projecten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {nacalculatieData.map((regel) => {
              const status = getStatusIndicator(regel.margePercentage)
              const barWidth = Math.min(Math.abs(regel.margePercentage), 100)

              return (
                <div
                  key={regel.projectId}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setDetailProjectId(regel.projectId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {regel.projectNaam}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                          {regel.klantNaam}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                          {formatCurrency(regel.offerteTotaal)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                          {formatCurrency(regel.werkelijkeKosten)}
                        </span>
                        <span className={cn('text-sm font-semibold w-20 text-right', status.tekstKleur)}>
                          {regel.verschil >= 0 ? '+' : ''}{formatCurrency(regel.verschil)}
                        </span>
                        <span className={cn('text-sm font-bold w-14 text-right', status.tekstKleur)}>
                          {regel.margePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'absolute top-0 left-0 h-full rounded-full transition-all duration-500',
                          status.kleur,
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ==================== DETAIL DIALOG ==================== */}
      <Dialog
        open={detailProjectId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProjectId(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="text-xl">Nacalculatie: {detailData.projectNaam}</span>
                  <Badge className={getStatusIndicator(detailData.margePercentage).badgeKleur}>
                    {getStatusIndicator(detailData.margePercentage).label}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {detailData.klantNaam}
                </p>
              </DialogHeader>

              <Separator />

              {/* Side by side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Left: Offerte regels */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Offerte regels (gecalculeerd)
                  </h3>
                  {detailData.offerteItems.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic py-4">
                      Geen offerte-items beschikbaar
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailData.offerteItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                              {item.beschrijving}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {item.aantal} x {formatCurrency(item.eenheidsprijs)}
                            </p>
                          </div>
                          <span className="font-mono font-semibold text-gray-900 dark:text-white ml-2 shrink-0">
                            {formatCurrency(item.totaal)}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex items-center justify-between p-2 font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">
                          Totaal offerte
                        </span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          {formatCurrency(detailData.offerteTotaal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Werkelijke kosten */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Werkelijke kosten
                  </h3>

                  {/* Tijdregistratie uren x tarief */}
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Tijdregistratie
                    </h4>
                    {detailData.tijdregistraties.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                        Geen uren geregistreerd
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailData.tijdregistraties.map((t) => {
                          const uren = t.duur_minuten / 60
                          const kosten = uren * t.uurtarief
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {t.omschrijving}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {uren.toFixed(1)} uur x {formatCurrency(t.uurtarief)}/u
                                </p>
                              </div>
                              <span className="font-mono font-semibold text-gray-900 dark:text-white ml-2 shrink-0">
                                {formatCurrency(kosten)}
                              </span>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between p-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            Subtotaal uren
                          </span>
                          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                            {formatCurrency(detailData.tijdKosten)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Materiaalkosten (from besteed) */}
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      Materiaalkosten (besteed)
                    </h4>
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Materialen en externe kosten
                      </span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(detailData.materiaalKosten)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Totaal werkelijk */}
                  <div className="flex items-center justify-between p-2 font-semibold mt-2">
                    <span className="text-gray-700 dark:text-gray-300">
                      Totaal werkelijk
                    </span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {formatCurrency(detailData.werkelijkeKosten)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Totaal vergelijking with profit/loss */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Totaal vergelijking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Offerte bedrag
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(detailData.offerteTotaal)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Werkelijke kosten
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(detailData.werkelijkeKosten)}
                    </p>
                  </div>
                  <div className={cn(
                    'text-center p-3 rounded-lg',
                    detailData.verschil >= 0
                      ? 'bg-green-50 dark:bg-green-900/30'
                      : 'bg-red-50 dark:bg-red-900/30',
                  )}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {detailData.verschil >= 0 ? 'Winst' : 'Verlies'}
                    </p>
                    <p className={cn(
                      'text-lg font-bold',
                      detailData.verschil >= 0
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400',
                    )}>
                      {detailData.verschil >= 0 ? '+' : ''}
                      {formatCurrency(detailData.verschil)}
                    </p>
                    <p className={cn(
                      'text-sm font-semibold',
                      detailData.verschil >= 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500',
                    )}>
                      ({detailData.margePercentage.toFixed(1)}% marge)
                    </p>
                  </div>
                </div>

                {/* Cost breakdown bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Kostenverdeling</span>
                    <span>
                      {detailData.werkelijkeKosten > 0
                        ? `${((detailData.tijdKosten / detailData.werkelijkeKosten) * 100).toFixed(0)}% arbeid / ${((detailData.materiaalKosten / detailData.werkelijkeKosten) * 100).toFixed(0)}% materiaal`
                        : '0% arbeid / 0% materiaal'
                      }
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{
                        width: detailData.werkelijkeKosten > 0
                          ? `${(detailData.tijdKosten / detailData.werkelijkeKosten) * 100}%`
                          : '0%',
                      }}
                    />
                    <div
                      className="bg-orange-500 h-full transition-all duration-300"
                      style={{
                        width: detailData.werkelijkeKosten > 0
                          ? `${(detailData.materiaalKosten / detailData.werkelijkeKosten) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
                      <span className="text-gray-500 dark:text-gray-400">
                        Arbeid ({formatCurrency(detailData.tijdKosten)})
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block" />
                      <span className="text-gray-500 dark:text-gray-400">
                        Materiaal ({formatCurrency(detailData.materiaalKosten)})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
