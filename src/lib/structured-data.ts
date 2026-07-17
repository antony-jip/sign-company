import { PRICE_PER_MONTH } from '@/data/pricing'
import { faqs, prijzenFaqs } from '@/data/faq'
import { SITE_URL, CURRENCY, CONTACT_EMAIL } from './site'

const BASE_URL = SITE_URL

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'doen.',
  url: BASE_URL,
  logo: `${BASE_URL}/logos/doen-logo.svg`,
  description:
    'Alles-in-één bedrijfssoftware voor signmakers en reclamebedrijven. Gebouwd vanuit een signbedrijf dat sinds 1983 bestaat.',
  foundingDate: '1983',
  email: CONTACT_EMAIL,
  contactPoint: {
    '@type': 'ContactPoint',
    email: CONTACT_EMAIL,
    contactType: 'sales',
    availableLanguage: ['nl'],
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'doen.',
  url: BASE_URL,
  inLanguage: 'nl-NL',
  publisher: { '@type': 'Organization', name: 'doen.', url: BASE_URL },
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
    priceCurrency: CURRENCY,
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

/** BreadcrumbList voor diepe routes (kennisbank/vertical/module). */
export function buildBreadcrumbSchema(
  trail: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  }
}

/** Article/BlogPosting voor kennisbank-artikelen. */
export function buildArticleSchema(article: {
  title: string
  excerpt: string
  slug: string
  updatedAt: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    dateModified: article.updatedAt,
    inLanguage: 'nl-NL',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/kennisbank/${article.slug}`,
    },
    author: { '@type': 'Organization', name: 'doen.', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'doen.',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logos/doen-logo.svg`,
      },
    },
  }
}
