import React, { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { getKlant, getProject, getOfferte, getDeal, getWerkbon, getBestelbon, getLeveringsbon } from '@/services/supabaseService'

const ROUTE_LABELS: Record<string, string> = {
  projecten: 'Projecten',
  klanten: 'Klanten',
  offertes: 'Offertes',
  facturen: 'Facturen',
  deals: 'Deals',
  werkbonnen: 'Werkbonnen',
  bestelbonnen: 'Bestelbonnen',
  leveringsbonnen: 'Leveringsbonnen',
  taken: 'Taken',
  documenten: 'Documenten',
  email: 'Email',
  kalender: 'Kalender',
  montage: 'Montage',
  tijdregistratie: 'Tijdregistratie',
  team: 'Team',
  voorraad: 'Voorraad',
  leads: 'Lead Capture',
  forecast: 'Forecast',
  booking: 'Booking',
  instellingen: 'Instellingen',
  nieuwsbrieven: 'Nieuwsbrieven',
  rapportages: 'Rapportages',
  nacalculatie: 'Nacalculatie',
  financieel: 'Financieel',
  uitgaven: 'Uitgaven',
  leveranciers: 'Leveranciers',
  ai: 'AI Assistent',
  importeren: 'Importeren',
  nieuw: 'Nieuw',
}

// Detail pages: resolve the ID to a human-readable name
async function resolveDetailName(section: string, id: string): Promise<string> {
  if (id === 'nieuw') return 'Nieuw'

  try {
    switch (section) {
      case 'klanten': {
        const klant = await getKlant(id)
        return klant?.bedrijfsnaam || id
      }
      case 'projecten': {
        const project = await getProject(id)
        return project?.naam || id
      }
      case 'offertes': {
        const offerte = await getOfferte(id)
        return offerte ? `${offerte.nummer} - ${offerte.titel}` : id
      }
      case 'deals': {
        const deal = await getDeal(id)
        return deal?.titel || id
      }
      case 'werkbonnen': {
        const werkbon = await getWerkbon(id)
        return werkbon?.werkbon_nummer || id
      }
      case 'bestelbonnen': {
        const bestelbon = await getBestelbon(id)
        return bestelbon?.bestelbon_nummer || id
      }
      case 'leveringsbonnen': {
        const leveringsbon = await getLeveringsbon(id)
        return leveringsbon?.leveringsbon_nummer || id
      }
      default:
        return id
    }
  } catch {
    return id
  }
}

interface Crumb {
  label: string
  path: string
}

export function Breadcrumbs() {
  const location = useLocation()
  const [crumbs, setCrumbs] = useState<Crumb[]>([])

  const pathname = location.pathname

  useEffect(() => {
    let cancelled = false

    async function buildCrumbs() {
      const segments = pathname.split('/').filter(Boolean)

      // Don't show breadcrumbs on dashboard or single-level pages
      if (segments.length <= 1) {
        setCrumbs([])
        return
      }

      const result: Crumb[] = []

      // First segment is always the section
      const section = segments[0]
      result.push({
        label: ROUTE_LABELS[section] || section,
        path: `/${section}`,
      })

      // Second segment could be an ID or a sub-path
      if (segments.length >= 2) {
        const second = segments[1]
        if (ROUTE_LABELS[second]) {
          result.push({
            label: ROUTE_LABELS[second],
            path: `/${section}/${second}`,
          })
        } else {
          // It's an ID — resolve to name
          const name = await resolveDetailName(section, second)
          if (!cancelled) {
            result.push({
              label: name,
              path: `/${section}/${second}`,
            })
          }
        }
      }

      // Third segment if exists
      if (segments.length >= 3) {
        const third = segments[2]
        result.push({
          label: ROUTE_LABELS[third] || third,
          path: `/${segments.slice(0, 3).join('/')}`,
        })
      }

      if (!cancelled) {
        setCrumbs(result)
      }
    }

    buildCrumbs()
    return () => { cancelled = true }
  }, [pathname])

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <React.Fragment key={crumb.path}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
