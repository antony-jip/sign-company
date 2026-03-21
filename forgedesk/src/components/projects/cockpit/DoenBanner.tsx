import { FileText, Wrench, Calendar, Receipt } from 'lucide-react'
import { getPipelineStep } from './PipelineBar'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

interface DoenConfig {
  tekst: string
  bg: string
  border: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  doenLabel: string
  doenAction: () => void
}

function getDoenConfig(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  facturen: Factuur[],
  callbacks: {
    onCreateOfferte: () => void
    onCreateWerkbon: () => void
    onCreateMontage: () => void
    onCreateFactuur: () => void
    onArchive: () => void
  },
): DoenConfig | null {
  const step = getPipelineStep(project, offertes, montageAfspraken, facturen)

  // Step 0: no offerte yet — no banner (the empty state in offerte card handles this)
  if (step === 0) return null

  // Step 1: concept offerte — tell user to send it
  if (step === 1) {
    const isConcept = offertes.some(o => o.status === 'concept')
    if (!isConcept) return null
    return {
      tekst: 'Offerte is nog concept. Verstuur naar de klant zodat je verder kunt.',
      bg: '#FDE8E2',
      border: '#F5C4B4',
      iconBg: '#F15025',
      iconColor: '#FFFFFF',
      icon: <FileText className="h-4.5 w-4.5" />,
      doenLabel: 'Doen',
      doenAction: callbacks.onCreateOfferte,
    }
  }

  // Step 2: offerte sent/viewed, waiting for approval — no banner
  if (step === 2) {
    return null
  }

  // Step 3: in production — no banner (work is happening)
  if (step === 3) return null

  // Step 4: ready for montage
  if (step === 4) {
    return {
      tekst: 'Alles klaar voor montage.',
      bg: '#F2E8E5',
      border: '#E0D0C8',
      iconBg: '#3A6B8C',
      iconColor: '#FFFFFF',
      icon: <Calendar className="h-4.5 w-4.5" />,
      doenLabel: 'Doen',
      doenAction: callbacks.onCreateMontage,
    }
  }

  // Step 5: ready to invoice
  if (step === 5) {
    const hasFactuur = facturen.length > 0
    if (hasFactuur) return null
    return {
      tekst: 'Klaar om te factureren.',
      bg: '#E4F0EA',
      border: '#C4DCC8',
      iconBg: '#2D6B48',
      iconColor: '#FFFFFF',
      icon: <Receipt className="h-4.5 w-4.5" />,
      doenLabel: 'Doen',
      doenAction: callbacks.onCreateFactuur,
    }
  }

  return null
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
  const config = getDoenConfig(project, offertes, montageAfspraken, facturen, callbacks)
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

      {/* Doen button */}
      <button
        onClick={config.doenAction}
        className="flex-shrink-0 text-[14px] font-bold text-white rounded-lg hover:opacity-90 transition-all shadow-sm"
        style={{
          backgroundColor: '#F15025',
          padding: '10px 24px',
        }}
      >
        Doen
      </button>
    </div>
  )
}
