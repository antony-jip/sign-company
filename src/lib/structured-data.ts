import { PRICE_PER_MONTH } from '@/data/pricing'
import { faqs, prijzenFaqs } from '@/data/faq'

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

function buildFaqPageSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a.replace(/\*\*/g, ''),
      },
    })),
  }
}

export const faqPageSchema = buildFaqPageSchema(faqs)
export const prijzenFaqPageSchema = buildFaqPageSchema(prijzenFaqs)
