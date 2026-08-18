import {
  LayoutDashboard, Hammer, FileText, Building2, Truck, ClipboardCheck, Ruler, Wand2,
  Banknote, Inbox, TrendingUp, Calendar, ListChecks, Mail, MessageSquare, Globe,
  SlidersHorizontal, LifeBuoy, Newspaper, Calculator, BarChart3, LineChart, ShoppingCart,
  type LucideIcon,
} from 'lucide-react'

export type NavSectie = 'WERK' | 'FINANCIEEL' | 'PLANNING' | 'COMMUNICATIE'

export interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  color: string
}

export interface NavGroep {
  section: NavSectie
  items: NavItem[]
}

// Eén bron voor label, pad, icoon en kleur van elke module. Zijbalk en topbalk
// lezen hier allebei uit, zodat dezelfde module in beide menu's hetzelfde
// icoon en dezelfde kleur houdt. Kleuren volgen het doen. design-systeem.
const WERK_ITEMS: NavItem[] = [
  { label: 'Projecten', icon: Hammer, path: '/projecten', color: '#1A535C' },
  { label: 'Offertes', icon: FileText, path: '/offertes', color: '#F15025' },
  { label: 'Klanten', icon: Building2, path: '/klanten', color: '#3A6B8C' },
  { label: 'Leveranciers', icon: Truck, path: '/leveranciers', color: '#3A6B8C' },
  { label: 'Werkbonnen', icon: ClipboardCheck, path: '/werkbonnen', color: '#C44830' },
  { label: 'Maatjes', icon: Ruler, path: '/maatjes', color: '#F15025' },
  { label: 'Studio', icon: Wand2, path: '/visualizer', color: '#9A5A48' },
  { label: 'Nacalculatie', icon: Calculator, path: '/nacalculatie', color: '#1A535C' },
]

const FINANCIEEL_ITEMS: NavItem[] = [
  { label: 'Facturen', icon: Banknote, path: '/facturen', color: '#2D6B48' },
  { label: 'Inkoopfacturen', icon: Inbox, path: '/inkoopfacturen', color: '#C44830' },
  { label: 'Inkoopoffertes', icon: ShoppingCart, path: '/inkoopoffertes', color: '#C44830' },
  { label: 'Financieel', icon: TrendingUp, path: '/financieel', color: '#2D6B48' },
  { label: 'Rapportages', icon: BarChart3, path: '/rapportages', color: '#3A6B8C' },
  { label: 'Forecast', icon: LineChart, path: '/forecast', color: '#3A6B8C' },
]

const PLANNING_ITEMS: NavItem[] = [
  { label: 'Planning', icon: Calendar, path: '/planning', color: '#9A5A48' },
  { label: 'Taken', icon: ListChecks, path: '/taken', color: 'hsl(var(--muted-foreground))' },
]

const COMMUNICATIE_ITEMS: NavItem[] = [
  { label: 'Email', icon: Mail, path: '/email', color: '#6A5A8A' },
  { label: 'Aanvragen', icon: MessageSquare, path: '/aanvragen', color: '#6A5A8A' },
  { label: 'Portaal', icon: Globe, path: '/portalen', color: '#6A5A8A' },
]

export const DASHBOARD_ITEM: NavItem = { label: 'Dashboard', icon: LayoutDashboard, path: '/', color: '#1A535C' }
export const SETTINGS_ITEM: NavItem = { label: 'Instellingen', icon: SlidersHorizontal, path: '/instellingen', color: 'hsl(var(--muted-foreground))' }
export const SUPPORT_ITEM: NavItem = { label: 'Support', icon: LifeBuoy, path: '/support', color: '#F15025' }
// Owner-only: nieuwsbrief-module is persoonlijk voor de eigenaar (zie 149_nieuwsbrief.sql).
export const NIEUWSBRIEF_ITEM: NavItem = { label: 'Nieuwsbrief', icon: Newspaper, path: '/nieuwsbrief', color: '#6A5A8A' }

export const NAV_GROEPEN: NavGroep[] = [
  { section: 'WERK', items: WERK_ITEMS },
  { section: 'FINANCIEEL', items: FINANCIEEL_ITEMS },
  { section: 'PLANNING', items: PLANNING_ITEMS },
  { section: 'COMMUNICATIE', items: COMMUNICATIE_ITEMS },
]

// Vlakke lijst van alle modules, zonder Dashboard: Dashboard hoort in geen
// enkele sectie en wordt door beide menu's apart bovenaan gezet.
export const ALLE_MODULES: NavItem[] = NAV_GROEPEN.flatMap(g => g.items)

// Modules die los in de topbalk staan; de rest valt onder "Overig".
export const PRIMAIRE_LABELS = ['Dashboard', 'Projecten', 'Taken', 'Offertes', 'Planning', 'Werkbonnen', 'Email']

// Mobiel is bewust lean: alleen het hoogstnodige voor de buitendienst.
// Dit is de startset voor wie zijn mobiele menu nog nooit heeft ingesteld —
// géén plafond meer. De eigen keuze staat op profiles.mobiel_menu_items
// (migratie 169) en is los van de desktop-keuze in sidebar_items.
export const MOBIELE_NAV_LABELS = ['Dashboard', 'Projecten', 'Email', 'Maatjes']

// Aantal modules in de bottom-nav. Er staan altijd twee vaste vakjes naast:
// Daan en Meer. Vijf vakjes op de smalste telefoon (320px) geeft nog een
// tikdoel van 64px; meer wordt frunniken.
export const MOBIELE_NAV_MAX = 3

// Alles wat je op mobiel in je menu kunt zetten. Dashboard hoort erbij: op
// mobiel is er geen logo-knop die je terugbrengt naar de start.
export const MOBIELE_MENU_KANDIDATEN: NavItem[] = [DASHBOARD_ITEM, ...ALLE_MODULES]

// Oude opgeslagen voorkeuren gebruiken nog 'Kalender' voor '/planning'.
export function normaliseerMenuVoorkeur(items: unknown): string[] {
  if (!Array.isArray(items) || items.length === 0) return []
  return items.map((s: string) => (s === 'Kalender' ? 'Planning' : s))
}

// De mobiele menukeuze, opgeschoond en op volgorde. Onbekende labels (module
// hernoemd of verwijderd) vallen weg; een lege array betekent "bewust alles
// uitgezet" en blijft leeg, alleen NULL/undefined valt terug op de default.
export function mobieleMenuItems(voorkeur: string[] | null | undefined): NavItem[] {
  const labels = voorkeur == null
    ? MOBIELE_NAV_LABELS
    : normaliseerMenuVoorkeur(voorkeur)
  return labels
    .map((label) => MOBIELE_MENU_KANDIDATEN.find((i) => i.label === label))
    .filter((i): i is NavItem => !!i)
}
