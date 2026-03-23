import { FileText, Calendar, Receipt, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPipelineStep } from './PipelineBar'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

interface DoenConfig {
  tekst: string
  bg: string
  border: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  /** Button label */
  btnLabel: string
  btnAction: () => void
  /** true = flame (#F15025), false = petrol (#1A535C) */
  btnFlame: boolean
}

interface DoenBannerProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  facturen: Factuur[]
  onCreateOfferte: () => void
  onCreateWerkbon: () => void
  onCreateMontage: () => void
  onCreateFactuur: () => void
  onArchive: () => void
}

export function DoenBanner({
  project,
  offertes,
  montageAfspraken,
  facturen,
  ...callbacks
}: DoenBannerProps) {
  const navigate = useNavigate()
  const step = getPipelineStep(project, offertes, montageAfspraken, facturen)

  const config = getDoenConfig(step, offertes, facturen, callbacks, navigate)
  if (!config) return null

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        backgroundColor: config.bg,
        border: `0.5px solid ${config.border}`,
      }}
    >
      {/* Icon */}
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: config.iconBg, color: config.iconColor }}
      >
        {config.icon}
      </div>

      {/* Text */}
      <span className="text-[13px] text-foreground/80 flex-1 min-w-0">
        {config.tekst}
      </span>

      {/* Action button */}
      <button
        onClick={config.btnAction}
        className="flex-shrink-0 text-[14px] font-bold text-white rounded-lg hover:opacity-90 transition-all shadow-sm"
        style={{
          backgroundColor: config.btnFlame ? '#F15025' : '#1A535C',
          padding: '10px 24px',
        }}
      >
        {config.btnLabel}
      </button>
    </div>
  )
}

function getDoenConfig(
  step: number,
  offertes: Offerte[],
  facturen: Factuur[],
  callbacks: {
    onCreateOfferte: () => void
    onCreateWerkbon: () => void
    onCreateMontage: () => void
    onCreateFactuur: () => void
    onArchive: () => void
  },
  navigate: ReturnType<typeof useNavigate>,
): DoenConfig | null {
  // Step 0: no offerte — no banner (flame CTA in header + empty card handle this)
  if (step === 0) return null

  // Step 1: has offerte(s) in early stage
  if (step === 1) {
    const conceptOfferte = offertes.find(o => o.status === 'concept')
    if (conceptOfferte) {
      // Concept offerte — user needs to finish editing. NOT an irreversible action.
      return {
        tekst: 'Je offerte is nog niet af.',
        bg: '#FDE8E2',
        border: '#F5C4B4',
        iconBg: '#F15025',
        iconColor: '#FFFFFF',
        icon: <Pencil className="h-4 w-4" />,
        btnLabel: 'Offerte bewerken',
        btnAction: () => navigate(`/offertes/${conceptOfferte.id}/bewerken`),
        btnFlame: false, // petrol — not irreversible
      }
    }
    // Offerte exists but not concept (e.g. verzonden/bekeken waiting for approval) — no banner
    return null
  }

  // Step 2: approved / waiting — no banner
  if (step === 2) return null

  // Step 3: in production — no banner (work is happening)
  if (step === 3) return null

  // Step 4: ready for montage — irreversible scheduling moment
  if (step === 4) {
    return {
      tekst: 'Alles klaar voor montage.',
      bg: '#F2E8E5',
      border: '#E0D0C8',
      iconBg: '#3A6B8C',
      iconColor: '#FFFFFF',
      icon: <Calendar className="h-4 w-4" />,
      btnLabel: 'Doen',
      btnAction: callbacks.onCreateMontage,
      btnFlame: true,
    }
  }

  // Step 5: ready to invoice — irreversible billing moment
  if (step === 5) {
    const hasFactuur = facturen.length > 0
    if (hasFactuur) return null
    return {
      tekst: 'Klaar om te factureren.',
      bg: '#E4F0EA',
      border: '#C4DCC8',
      iconBg: '#2D6B48',
      iconColor: '#FFFFFF',
      icon: <Receipt className="h-4 w-4" />,
      btnLabel: 'Doen',
      btnAction: callbacks.onCreateFactuur,
      btnFlame: true,
    }
  }

  return null
}
