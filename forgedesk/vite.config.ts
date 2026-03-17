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
  },
})
