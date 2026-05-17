import {
  IconProjecten,
  IconOffertes,
  IconPortaal,
  IconPlanning,
  IconWerkbonnen,
  IconFacturen,
  IconEmail,
  IconTaken,
  IconVisualizer,
  IconAIAssistent,
} from '@/components/icons/DoenIcons'
import type { ComponentType, SVGProps } from 'react'

export type DoenIcon = ComponentType<SVGProps<SVGSVGElement>>

export type Module = {
  label: string
  sub: string
  href: string
  color: string
  icon: DoenIcon
  comingSoon?: boolean
}

export const modules: Module[] = [
  { label: 'Projecten', sub: 'Alles in één cockpit', href: '/features/projecten', color: '#1A535C', icon: IconProjecten },
  { label: 'Offertes', sub: 'Professioneel in minuten', href: '/features/offertes', color: '#F15025', icon: IconOffertes },
  { label: 'Klantportaal', sub: 'Deel, bespreek, accordeer', href: '/features/portaal', color: '#6A5A8A', icon: IconPortaal },
  { label: 'Planning', sub: 'Sleep je week in elkaar', href: '/features/planning', color: '#9A5A48', icon: IconPlanning },
  { label: 'Werkbonnen', sub: 'Digitaal op locatie', href: '/features/werkbonnen', color: '#1A535C', icon: IconWerkbonnen },
  { label: 'Facturen', sub: 'Verkoop en inkoop, geregeld', href: '/features/facturen', color: '#2D6B48', icon: IconFacturen },
  { label: 'Email', sub: 'Jouw mailbox, slim gekoppeld', href: '/features/email', color: '#3A6B8C', icon: IconEmail },
  { label: 'Taken', sub: 'Alles naast de montage', href: '/features/taken', color: '#F15025', icon: IconTaken },
  { label: 'Visualizer', sub: 'AI toont het eindresultaat', href: '/features/visualizer', color: '#9A5A48', icon: IconVisualizer, comingSoon: true },
  { label: 'AI-assistent', sub: 'Je slimste collega', href: '/features/ai', color: '#1A535C', icon: IconAIAssistent },
]
