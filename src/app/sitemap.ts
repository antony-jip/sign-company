import type { MetadataRoute } from 'next'
import { modules } from '@/data/modules'
import { articles } from '@/data/kennisbank/articles'
import { verticals } from '@/data/verticals'
import { SITE_URL } from '@/lib/site'

const BASE_URL = SITE_URL

// Hoog-waarde landingsroutes krijgen een hogere priority + reëlere changefreq,
// zodat crawlers begrijpen welke pagina's het belangrijkst zijn en hoe vaak ze
// wijzigen.
const staticRoutes: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/prijzen', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/hoe-het-werkt', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/over', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/kennisbank', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/veelgestelde-vragen', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/voorwaarden', priority: 0.2, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE_URL}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...modules.map((module) => ({
      url: `${BASE_URL}${module.href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...verticals.map((vertical) => ({
      url: `${BASE_URL}/voor/${vertical.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...articles.map((article) => ({
      url: `${BASE_URL}/kennisbank/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
