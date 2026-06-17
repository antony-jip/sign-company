import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { articles } from '@/data/kennisbank/articles'
import { modules } from '@/data/modules'

/**
 * Sitemap voor crawlers en AI-zoekagents. Next.js serveert dit op /sitemap.xml.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/features', priority: 0.9 },
    { path: '/prijzen', priority: 0.9 },
    { path: '/hoe-het-werkt', priority: 0.8 },
    { path: '/over', priority: 0.7 },
    { path: '/kennisbank', priority: 0.7 },
    { path: '/contact', priority: 0.6 },
  ]

  const staticEntries = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: route.priority,
  }))

  const moduleEntries = modules.map((module) => ({
    url: `${SITE_URL}${module.href}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const articleEntries = articles.map((article) => ({
    url: `${SITE_URL}/kennisbank/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticEntries, ...moduleEntries, ...articleEntries]
}
