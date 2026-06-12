/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage (vervang <project-ref> of laat staan; wildcard host)
      { protocol: 'https', hostname: '*.supabase.co' },
      // tijdelijke placeholder-beelden uit de seed
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // huidige WooCommerce media (tijdens migratie)
      { protocol: 'https', hostname: 'kunstdoekje.nl' },
      { protocol: 'https', hostname: 'www.kunstdoekje.nl' },
    ],
  },
}

module.exports = nextConfig
