import type { Metadata } from 'next'
import { SITE_URL, LOCALES, OG_LOCALE } from './site'

/**
 * Canonical + hreflang alternates voor een pad. Nu één taal, maar zodra er
 * extra locales in LOCALES staan (doen.de, doen.fr, …) genereert dit
 * automatisch wederkerige hreflang-links + x-default, zodat de landendomeinen
 * elkaar niet als duplicate content beconcurreren in Google.
 */
export function alternatesFor(path: string): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const locale of LOCALES) {
    languages[locale.hrefLang] = `${locale.url}${path}`
  }
  languages['x-default'] = `${SITE_URL}${path}`
  return { canonical: path, languages }
}

/**
 * Per-pagina OG/Twitter-override, bovenop de defaults uit layout.tsx. Zorgt dat
 * elke gedeelde link een eigen titel/omschrijving/URL-kaart krijgt in plaats
 * van de globale doen.-kaart.
 */
export function openGraphFor({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: 'doen.',
      locale: OG_LOCALE,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/**
 * Volledige metadata voor een contentpagina in één call: unieke title +
 * description, canonical + hreflang, en een eigen OG/Twitter-kaart.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  return {
    title,
    description,
    alternates: alternatesFor(path),
    ...openGraphFor({ title, description, path }),
  }
}
