/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Security-headers voor alle routes. De site is volledig self-contained
  // (fonts via next/font, geen externe scripts), dus de CSP kan strak.
  //
  // Uitzondering voor de dev-server: de hot-reload van Next draait op eval en
  // liep stuk op deze CSP. Gevolg was dat de client-bundel lokaal nooit
  // startte en er dus niets interactief was, van de klikbare app-demo tot de
  // stappenreeks. In productie blijft het onveranderd streng.
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self'",
      "font-src 'self'",
      `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ')
    return [
      {
        source: '/:pad*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      { source: '/rondleiding', destination: '/features', permanent: true },
    ]
  },
  transpilePackages: ['framer-motion'],
  // De sleutel experimental.viewTransition bestaat pas vanaf Next 15 en zorgde
  // hier alleen voor een waarschuwing bij elke start zonder iets te doen.
  // Terugzetten zodra de site meegaat naar Next 15.
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
