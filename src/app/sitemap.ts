import type { MetadataRoute } from 'next'
import { modules } from '@/data/modules'
import { articles } from '@/data/kennisbank/articles'

const BASE_URL = 'https://doen.team'

const staticRoutes = ['', '/hoe-het-werkt', '/features', '/prijzen', '/over', '/contact', '/kennisbank']

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE_URL}${route}`,
    })),
    ...modules.map((module) => ({
      url: `${BASE_URL}${module.href}`,
    })),
    ...articles.map((article) => ({
      url: `${BASE_URL}/kennisbank/${article.slug}`,
      lastModified: article.updatedAt,
    })),
  ]
}
