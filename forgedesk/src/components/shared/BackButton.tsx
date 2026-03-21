import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  fallbackPath: string
  label?: string
}

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
}

export function BackButton({ fallbackPath, label }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const displayLabel = label || PATH_LABELS[fallbackPath] || 'Terug'

  function handleClick() {
    // If we have history (not a direct link), go back
    if (window.history.length > 2 && location.key !== 'default') {
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
