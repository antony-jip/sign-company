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
  seoTitle: string
  seoDescription: string
}

export const modules: Module[] = [
  { label: 'Projecten', sub: 'Alles in één cockpit', href: '/features/projecten', color: '#1A535C', icon: IconProjecten, seoTitle: 'Projectbeheer voor signbedrijven | doen.', seoDescription: 'Alle projecten van je signbedrijf in één cockpit. Offerte, werkbon, planning en factuur gekoppeld per project.' },
  { label: 'Offertes', sub: 'Professioneel in minuten', href: '/features/offertes', color: '#F15025', icon: IconOffertes, seoTitle: 'Offertesoftware voor signmakers | doen.', seoDescription: 'Calculeer en verstuur professionele offertes in minuten. Je klant keurt goed via het portaal, doen. volgt automatisch op.' },
  { label: 'Klantportaal', sub: 'Deel, bespreek, accordeer', href: '/features/portaal', color: '#6A5A8A', icon: IconPortaal, seoTitle: 'Klantportaal voor je signbedrijf | doen.', seoDescription: 'Eén link, geen inlog. Je klant bekijkt tekeningen, keurt offertes goed en reageert op bestanden.' },
  { label: 'Planning', sub: 'Sleep je week in elkaar', href: '/features/planning', color: '#9A5A48', icon: IconPlanning, seoTitle: 'Planningsoftware voor signbedrijven | doen.', seoDescription: 'Sleep je week in elkaar. Planning en werkbonnen gekoppeld, je monteur ziet alles op zijn telefoon.' },
  { label: 'Werkbonnen', sub: 'Digitaal op locatie', href: '/features/werkbonnen', color: '#1A535C', icon: IconWerkbonnen, seoTitle: 'Werkbon-app voor signbedrijven | doen.', seoDescription: 'Digitale werkbonnen op locatie. Uren, foto\'s en een handtekening van de klant — direct vanaf de telefoon van je monteur.' },
  { label: 'Facturen', sub: 'Verkoop én inkoop, AI leest uit', href: '/features/facturen', color: '#2D6B48', icon: IconFacturen, seoTitle: 'Factuursoftware voor signbedrijven | doen.', seoDescription: 'Van offerte naar factuur in één klik, met Mollie-betaallink en koppeling naar Exact Online. AI leest inkoopfacturen uit.' },
  { label: 'Email', sub: 'Jouw mailbox, slim gekoppeld', href: '/features/email', color: '#3A6B8C', icon: IconEmail, seoTitle: 'Zakelijke mailbox voor je signbedrijf | doen.', seoDescription: 'Jouw eigen mailbox (IMAP/SMTP), slim gekoppeld aan klanten en projecten. Daan AI vat samen en beantwoordt in jouw toon.' },
  { label: 'Taken', sub: 'Alles naast de montage', href: '/features/taken', color: '#F15025', icon: IconTaken, seoTitle: 'Takenbeheer voor signbedrijven | doen.', seoDescription: 'Alles naast de montage: taken per project en per collega, met deadlines. Niks valt tussen wal en schip.' },
  { label: 'Studio', sub: 'AI toont het eindresultaat', href: '/features/visualizer', color: '#9A5A48', icon: IconVisualizer, seoTitle: 'Studio: AI-visualisatie voor signbedrijven | doen.', seoDescription: 'Upload een foto van een bus, gevel of pand en Studio toont het eindresultaat voordat je produceert. Onderdeel van doen.' },
  { label: 'AI-assistent', sub: 'Je slimste collega', href: '/features/ai', color: '#1A535C', icon: IconAIAssistent, seoTitle: 'AI-assistent voor signbedrijven | doen.', seoDescription: 'Daan kent je bedrijf: vat mails samen, leest inkoopfacturen uit en beantwoordt klantvragen in jouw toon.' },
]
