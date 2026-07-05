// Route-chunk prefetch: laadt de lazy chunk van een module alvast op
// sidebar/topnav-hover en tijdens idle na login, zodat de eerste
// navigatie geen chunk-download meer hoeft te wachten. De data-laag
// wordt apart voorgewarmd (zie lib/coreData); dit dekt de code-kant.
//
// De import-specifiers MOETEN gelijk zijn aan die in App.tsx, zodat
// Rollup ze naar dezelfde chunk resolvet.

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches

const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/components/dashboard/FORGEdeskDashboard'),
  '/projecten': () => import('@/components/projects/ProjectsList'),
  '/klanten': () => import('@/components/clients/ClientsLayout'),
  '/offertes': () => import('@/components/quotes/QuotesPipeline'),
  '/facturen': () => import('@/components/invoices/FacturenLayout'),
  '/inkoopfacturen': () => import('@/components/invoices/FacturenLayout'),
  '/taken': () =>
    isDesktop()
      ? import('@/components/planning/TasksLayout')
      : import('@/components/planning/TasksLayoutMobile'),
  '/planning': () =>
    isDesktop()
      ? import('@/components/planning/PlanningLayout')
      : import('@/components/planning/MontagePlanningLayoutMobile'),
  '/werkbonnen': () =>
    isDesktop()
      ? import('@/components/werkbonnen/WerkbonnenLayout')
      : import('@/components/werkbonnen/WerkbonnenLayoutMobile'),
  '/maatjes': () =>
    window.matchMedia('(min-width: 1024px)').matches
      ? import('@/components/maatjes/MaatjeBeheer')
      : import('@/components/maatjes/MaatjeKladblok'),
  '/email': () => import('@/components/email/EmailLayout'),
  '/aanvragen': () => import('@/components/website/WebsiteAanvragenLayout'),
  '/financieel': () => import('@/components/financial/FinancialLayout'),
  '/portalen': () => import('@/components/portaal/PortalenOverzicht'),
  '/visualizer': () => import('@/components/visualizer/VisualizerLayout'),
  '/instellingen': () => import('@/components/settings/SettingsLayout'),
  '/support': () => import('@/components/support/SupportInboxPage'),
}

const loaded = new Set<string>()

export function prefetchRoute(path: string): void {
  const load = ROUTE_LOADERS[path]
  if (!load || loaded.has(path)) return
  loaded.add(path)
  load().catch(() => loaded.delete(path))
}

// Meest-bezochte modules; volgorde = laadvolgorde tijdens idle.
const TOP_ROUTES = ['/projecten', '/taken', '/planning', '/offertes', '/facturen', '/klanten', '/werkbonnen']

// Sequentieel i.p.v. parallel, zodat de warmup nooit met echte
// navigatie of data-fetches om bandbreedte vecht.
export function prefetchTopRoutes(): void {
  const queue = TOP_ROUTES.filter((p) => ROUTE_LOADERS[p] && !loaded.has(p))
  const next = () => {
    const path = queue.shift()
    if (!path) return
    loaded.add(path)
    ROUTE_LOADERS[path]()
      .catch(() => loaded.delete(path))
      .then(() => next())
  }
  next()
}
