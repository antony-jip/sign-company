import { defineConfig } from 'vite'
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

export default defineConfig({
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
          // Services layer — shared by many lazy chunks, must be separate
          if (id.includes('/src/services/')) {
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
})
