import { PRICE_PER_MONTH } from '@/data/pricing'

const BASE_URL = 'https://doen.team'

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'doen.',
  url: BASE_URL,
  logo: `${BASE_URL}/logos/doen-logo.svg`,
}

export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'doen.',
  url: BASE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Alles-in-één bedrijfssoftware voor signmakers en reclamebedrijven. Van offerte tot factuur: projecten, planning, werkbonnen, klantportaal en facturatie in één systeem.',
  offers: {
    '@type': 'Offer',
    price: String(PRICE_PER_MONTH),
    priceCurrency: 'EUR',
  },
}
