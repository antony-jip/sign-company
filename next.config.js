/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/rondleiding', destination: '/features', permanent: true },
    ]
  },
  transpilePackages: ['framer-motion'],
  experimental: {
    viewTransition: true,
  },
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
