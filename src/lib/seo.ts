/**
 * Centrale SEO- en structured-data-helpers voor de doen.-marketingsite.
 *
 * De schema's hier maken de site beter leesbaar voor AI-zoekervaringen
 * (Google AI Mode / Gemini, en andere LLM-crawlers): heldere entiteiten,
 * prijs, en vraag-antwoord-content die betrouwbaar te citeren is.
 */

export const SITE_URL = 'https://doen.team'
export const SITE_NAME = 'doen.'
export const LEGAL_NAME = 'Sign Company'
export const CONTACT_EMAIL = 'info@signcompany.nl'
export const APP_URL = 'https://app.doen.team'

export const SITE_DESCRIPTION =
  'Van offerte tot factuur. Alles-in-een bedrijfssoftware voor signmakers en ' +
  'reclamebedrijven. €79 per maand ex. btw, tot 10 gebruikers, 30 dagen gratis.'

const ORG_ID = `${SITE_URL}/#organization`
const SOFTWARE_ID = `${SITE_URL}/#software`
const WEBSITE_ID = `${SITE_URL}/#website`

/** Verwijst naar een absolute URL op basis van een pad (of laat absolute URLs intact). */
export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** De organisatie achter doen. — het entiteits-anker voor de hele site. */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logos/doen-logo.svg'),
    email: CONTACT_EMAIL,
    description:
      'doen. is de bedrijfssoftware van Sign Company voor signmakers en ' +
      'reclamebedrijven — van offerte en planning tot werkbon en factuur.',
    areaServed: { '@type': 'Country', name: 'Nederland' },
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'customer support',
      availableLanguage: ['nl'],
    },
  }
}

/** Het product zelf: een web-applicatie met een vast abonnement. */
export function softwareApplicationSchema() {
  return {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android (browser)',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'nl',
    publisher: { '@id': ORG_ID },
    offers: {
      '@type': 'Offer',
      price: '79',
      priceCurrency: 'EUR',
      url: `${APP_URL}/register`,
      description:
        '€79 per maand ex. btw, tot 10 gebruikers. Maandelijks opzegbaar. ' +
        'Eerste 30 dagen gratis, geen creditcard nodig.',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Offertes',
      'Projecten',
      'Planning',
      'Werkbonnen',
      'Facturen',
      'Klantportaal',
      'E-mail / Sales Inbox',
      'AI-assistent',
    ],
  }
}

/** De website-entiteit, gekoppeld aan de organisatie. */
export function webSiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'nl',
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORG_ID },
  }
}

/** Bouwt een FAQPage uit een lijst vraag-antwoorden (markdown wordt gestript). */
export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripMarkdown(item.a),
      },
    })),
  }
}

/** Bouwt een BreadcrumbList uit een reeks { name, url }-stappen. */
export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.url),
    })),
  }
}

/** Bouwt een Article (kennisbank) met auteur- en herkomstsignalen (E-E-A-T). */
export function articleSchema(article: {
  title: string
  excerpt: string
  url: string
  updatedAt: string
  author: string
}) {
  return {
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    inLanguage: 'nl',
    url: absoluteUrl(article.url),
    mainEntityOfPage: absoluteUrl(article.url),
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: article.author, url: SITE_URL },
    publisher: { '@id': ORG_ID },
  }
}

/** Verpakt één of meer schema's in een geldige @graph met @context. */
export function jsonLdGraph(...nodes: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  }
}

/** Verwijdert de **bold**-markdown uit FAQ-antwoorden voor schoon schema-tekst. */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1')
}
