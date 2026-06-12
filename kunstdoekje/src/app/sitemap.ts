import type { MetadataRoute } from 'next'
import { getArtworks, getCategories } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statisch: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/hoe-het-werkt`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/eigen-foto`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/maatwerk`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/zakelijk`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'yearly', priority: 0.4 },
  ]

  try {
    const [artworks, categories] = await Promise.all([getArtworks(), getCategories()])
    const cats: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${BASE_URL}/shop?categorie=${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
    const producten: MetadataRoute.Sitemap = artworks.map((a) => ({
      url: `${BASE_URL}/product/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
    return [...statisch, ...cats, ...producten]
  } catch {
    return statisch
  }
}
