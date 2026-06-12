import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/checkout', '/bedankt', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
