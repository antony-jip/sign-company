import { FileText, Receipt, Users, ClipboardList, Calendar, Sparkles, Mail, type LucideIcon } from 'lucide-react'

// ─── Feature Data ───────────────────────────────────────────

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
  detail: string
  color: string
}

export const FEATURES: Feature[] = [
  {
    icon: FileText,
    title: 'Professionele offertes',
    description: 'Maak en verstuur offertes als PDF in je eigen huisstijl. Inclusief regelitems, kortingen en voorwaarden.',
    detail: 'PDF export met je eigen logo en huisstijl',
    color: '#E8866A',
  },
  {
    icon: Receipt,
    title: 'Facturen & betalingen',
    description: 'Genereer facturen vanuit offertes in één klik. Houd betalingen bij en stuur herinneringen automatisch.',
    detail: 'Van offerte naar factuur in één klik',
    color: '#7EB5A6',
  },
  {
    icon: Users,
    title: 'Klanten & projecten',
    description: 'Beheer al je klanten, contactpersonen en projecten op één plek. Volledige historie per klant.',
    detail: 'Alles per klant op één plek',
    color: '#8BAFD4',
  },
  {
    icon: ClipboardList,
    title: 'Digitale werkbonnen',
    description: 'Maak werkbonnen aan met foto\'s, handtekeningen en tijdregistratie. Direct beschikbaar voor je team.',
    detail: 'Foto\'s, handtekeningen en tijdregistratie',
    color: '#C4A882',
  },
  {
    icon: Calendar,
    title: 'Planning & montage',
    description: 'Plan montages en afspraken visueel. Sleep en plan met een interactieve kalender voor je hele team.',
    detail: 'Visuele planning voor je hele team',
    color: '#9B8EC4',
  },
  {
    icon: Mail,
    title: 'Professionele email',
    description: 'Verstuur en ontvang emails vanuit FORGEdesk. Gedeelde inbox, templates en automatische opvolging.',
    detail: 'Gedeelde inbox met slimme opvolging',
    color: '#8BAFD4',
  },
  {
    icon: Sparkles,
    title: 'AI-assistent Forgie',
    description: 'Laat Forgie je helpen met offerteteksten, emails en projectbeschrijvingen. Schrijf in een handomdraai.',
    detail: 'Schrijf offerteteksten in seconden',
    color: '#D4836A',
  },
]

// ─── Step Colors ────────────────────────────────────────────

export const STEP_COLORS = [
  { bg: 'rgba(126, 181, 166, 0.12)', text: '#7EB5A6' }, // sage
  { bg: 'rgba(232, 134, 106, 0.12)', text: '#E8866A' }, // coral
  { bg: 'rgba(139, 175, 212, 0.12)', text: '#8BAFD4' }, // blue
  { bg: 'rgba(155, 142, 196, 0.12)', text: '#9B8EC4' }, // purple
]

// ─── Brand Colors ───────────────────────────────────────────

export const BRAND_COLORS = ['#E8866A', '#7EB5A6', '#8BAFD4', '#9B8EC4', '#C4A882']

// ─── Framer Motion Variants ─────────────────────────────────

export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}

export const snappySpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 35,
}

export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.96,
  }),
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
}

export const scaleIn = {
  hidden: { scale: 0, rotate: -30 },
  show: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
  },
}
