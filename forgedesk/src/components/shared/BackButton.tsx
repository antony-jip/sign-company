import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  fallbackPath: string
  label?: string
}

/** Labels voor lijst-pagina's */
const PATH_LABELS: Record<string, string> = {
  '/projecten': 'Projecten',
  '/offertes': 'Offertes',
  '/facturen': 'Facturen',
  '/klanten': 'Klanten',
  '/werkbonnen': 'Werkbonnen',
  '/planning': 'Planning',
  '/taken': 'Taken',
  '/email': 'Email',
  '/portalen': 'Portalen',
  '/instellingen': 'Instellingen',
  '/bestelbonnen': 'Bestelbonnen',
  '/leveringsbonnen': 'Leveringsbonnen',
  '/leads': 'Leads',
  '/deals': 'Deals',
}

/** Labels voor detail-pagina's (prefix match) */
const DETAIL_PREFIXES: { prefix: string; label: string }[] = [
  { prefix: '/projecten/', label: 'Project' },
  { prefix: '/offertes/', label: 'Offerte' },
  { prefix: '/facturen/', label: 'Factuur' },
  { prefix: '/klanten/', label: 'Klant' },
  { prefix: '/werkbonnen/', label: 'Werkbon' },
  { prefix: '/bestelbonnen/', label: 'Bestelbon' },
  { prefix: '/leveringsbonnen/', label: 'Leveringsbon' },
  { prefix: '/leads/', label: 'Lead' },
  { prefix: '/deals/', label: 'Deal' },
]

function getLabelForPath(path: string): string {
  // Exact match op lijst-pagina
  if (PATH_LABELS[path]) return PATH_LABELS[path]
  // Prefix match op detail-pagina
  for (const { prefix, label } of DETAIL_PREFIXES) {
    if (path.startsWith(prefix)) return label
  }
  return 'Terug'
}

export function BackButton({ fallbackPath, label }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from

  const displayLabel = label || getLabelForPath(from || fallbackPath)

  function handleClick() {
    if (from) {
      // Navigeer terug naar herkomst (bijv. project waar je vandaan kwam)
      navigate(from)
    } else if (window.history.length > 2 && location.key !== 'default') {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium rounded-lg px-2 py-1 -ml-2 transition-colors hover:bg-[#F4F2EE]"
      style={{ color: '#5A5A55' }}
    >
      <ArrowLeft className="w-[18px] h-[18px]" />
      {displayLabel}
    </button>
  )
}
