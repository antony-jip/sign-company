import type { Metadata } from 'next'

/* Eén plek voor paginametadata.

   Reden: zonder dit erfde elke route de openGraph-blok uit layout.tsx, dus
   deelde je een link naar /features/planning of een kennisbank-artikel, dan
   zag de ontvanger overal "doen. | Slim gedaan." met og:url naar de
   homepage. Voor outreach waar links rondgaan is dat de duurste misser die
   je met de minste moeite oplost.

   Gebruik: `export const metadata = paginaMeta({ title, description, pad })`
   of binnen generateMetadata hetzelfde. */

const BASIS = 'https://doen.team'

export function paginaMeta({
  title,
  description,
  pad,
  type = 'website',
}: {
  title: string
  description: string
  /** Pad met leidende slash, bijvoorbeeld '/prijzen'. Leeg voor de homepage. */
  pad: string
  type?: 'website' | 'article'
}): Metadata {
  const url = `${BASIS}${pad}`
  return {
    title,
    description,
    alternates: { canonical: pad === '' ? '/' : pad },
    openGraph: {
      title,
      description,
      url,
      siteName: 'doen.',
      locale: 'nl_NL',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
