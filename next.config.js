/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['framer-motion'],
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
