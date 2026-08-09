import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Stub for framer-motion — prevents TDZ error "Cannot access 'Ge' before
// initialization" caused by framer-motion v12 being resolved from root
// node_modules via hoisting, even though forgedesk doesn't depend on it.
const framerMotionStub = `
  export const motion = new Proxy({}, { get: () => 'div' });
  export const AnimatePresence = ({ children }) => children;
  export const useAnimation = () => ({});
  export const useMotionValue = (v) => ({ get: () => v, set: () => {} });
  export const useTransform = () => ({ get: () => 0 });
`

export default defineConfig(({ mode, command }) => {
  // Zonder VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY valt de app terug op de
  // demo-modus: authService maakt dan zelf een gebruiker aan en ProtectedRoute
  // laat alles door. In productie is dat een app zonder inlogscherm. Eén
  // verkeerd gescopete variabele op Vercel is genoeg, en je merkt het niet
  // omdat de build gewoon slaagt. Daarom hier stoppen in plaats van daar.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const ontbreekt = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k])
    if (ontbreekt.length) {
      throw new Error(
        `Build gestopt: ${ontbreekt.join(' en ')} ontbreekt. Zonder die waarden ` +
        'draait de app in demo-modus en is er geen inlogscherm. Zet ze in de ' +
        'omgeving van deze deploy en bouw opnieuw.'
      )
    }
  }

  // Vercel zet het commit-sha in de build-omgeving, maar niet met een
  // VITE_-prefix, dus de client ziet hem niet. Zonder deze injectie staat er in
  // Sentry alleen een bundelhash en moet je gokken uit welke deploy een fout
  // komt. Dat kostte vandaag echte tijd.
  const release =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.VITE_RELEASE ||
    'lokaal'

  return {
  define: {
    __APP_RELEASE__: JSON.stringify(release),
  },
  plugins: [
    react(),
    // Virtual module plugin to stub framer-motion
    {
      name: 'stub-framer-motion',
      resolveId(id) {
        if (id === 'framer-motion' || id.startsWith('framer-motion/')) {
          return '\0framer-motion-stub'
        }
      },
      load(id) {
        if (id === '\0framer-motion-stub') {
          return framerMotionStub
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['framer-motion'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Split chunks to prevent TDZ "Cannot access 'X' before initialization"
        // errors caused by Rollup concatenating too many modules into a single
        // scope where the initialisation order breaks.
        manualChunks(id) {
          // Vendor: React ecosystem
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react'
          }
          // Vendor: Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          // Vendor: Radix UI + class-variance-authority
          if (id.includes('node_modules/@radix-ui/') ||
              id.includes('node_modules/class-variance-authority')) {
            return 'vendor-ui'
          }
          // Vendor: lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // Vendor: DOMPurify (CJS module — isolate to prevent TDZ with ESM)
          if (id.includes('node_modules/dompurify')) {
            return 'vendor-dompurify'
          }
          // jsPDF + autotable: only used by pdf services, keep out of eager load
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf'
          }
          // Services layer — shared by many lazy chunks, must be separate.
          // PDF services excluded: they pull in jsPDF (~430 kB) and the
          // services chunk loads eagerly at startup via contexts.
          if (id.includes('/src/services/')) {
            if (/pdfservice/i.test(id)) return undefined
            return 'services'
          }
          // Contexts — loaded eagerly, shared across all routes
          if (id.includes('/src/contexts/')) {
            return 'contexts'
          }
        },
      },
    },
  },
  }
})
