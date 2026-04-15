import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSettings } from '@/contexts/AppSettingsContext'

export function FloatingEmailButton() {
  const { settings } = useAppSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [hovered, setHovered] = useState(false)

  if (!(settings.email_edge_button ?? true)) return null
  if (location.pathname.startsWith('/email')) return null

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => navigate('/email')}
        className={`flex items-center gap-2 py-2.5 rounded-l-xl border border-r-0 border-[#EBEBEB] shadow-lg transition-all duration-200 ${
          hovered
            ? 'pl-4 pr-3 bg-[#1A535C] text-white'
            : 'pl-2 pr-1.5 bg-white/90 backdrop-blur text-[#9B9B95] hover:text-[#1A535C]'
        }`}
      >
        <Mail className="w-4 h-4 flex-shrink-0" />
        {hovered && <span className="text-xs font-medium whitespace-nowrap">Inbox</span>}
      </button>
    </div>
  )
}
