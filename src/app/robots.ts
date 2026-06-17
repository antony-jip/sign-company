import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * robots.txt voor zoekmachines en AI-crawlers. Next.js serveert dit op /robots.txt.
 * We staan alle crawlers toe (inclusief AI-zoekagents) en wijzen naar de sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
