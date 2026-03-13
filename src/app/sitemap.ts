import { MetadataRoute } from 'next';
import { allLandingPages } from '@/data/landing-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://forgedesk.nl';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/over-ons`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/projecten`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  // Landing pages from data
  const landingPages = allLandingPages.map((page) => ({
    url: `${baseUrl}/${page.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: page.phase === 1 ? 0.9 : page.phase === 2 ? 0.8 : 0.7,
  }));

  return [...staticPages, ...landingPages];
}
