import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setChromiumOpenGlRenderer('angle')

const wortel = process.cwd()
const src = path.resolve(wortel, '../src')
const stubs = path.resolve(wortel, 'src/stubs')

// Kleuren komen uit de Tailwind-config van de app. Die is ESM met een
// require() erin en kan niet de browserbundel in, dus we lezen hem hier in
// Node en schrijven de kleuren als JSON dat brand.ts importeert.
// jiti (dep van tailwindcss) laadt ESM-met-require net zoals Tailwind zelf doet.
const vereist = createRequire(path.join(wortel, 'package.json'))
const jiti = vereist('jiti')(path.join(wortel, 'remotion.config.ts'), { interopDefault: true })
const appTailwind = jiti('../tailwind.config.js')
const kleuren = (appTailwind.default ?? appTailwind).theme.extend.colors
fs.writeFileSync(path.join(wortel, 'src/kleuren.gen.json'), JSON.stringify(kleuren, null, 2) + '\n')

// Echte app-componenten worden rechtstreeks uit ../src geïmporteerd. Alles wat
// aan Supabase, auth, router of services hangt, wordt hier op de stub gezet zodat
// de bundel geen import.meta.env of netwerk nodig heeft. Exact-match (`$`) eerst.
Config.overrideWebpackConfig((config) => {
  const met = enableTailwind(config, { configLocation: path.join(wortel, 'tailwind.config.mjs') })
  return {
    ...met,
    resolve: {
      ...met.resolve,
      alias: {
        ...(met.resolve?.alias ?? {}),
        '@/services/supabaseService$': path.join(stubs, 'services.ts'),
        '@/services/supabaseClient$': path.join(stubs, 'services.ts'),
        '@/services/emailProjectService$': path.join(stubs, 'services.ts'),
        '@/services/emailService$': path.join(stubs, 'services.ts'),
        '@/services/aiService$': path.join(stubs, 'services.ts'),
        '@/hooks/useTijdSessies$': path.join(stubs, 'useTijdSessies.ts'),
        '@/contexts/AuthContext$': path.join(stubs, 'AuthContext.tsx'),
        '@/contexts/AppSettingsContext$': path.join(stubs, 'AppSettingsContext.tsx'),
        '@/contexts/TabsContext$': path.join(stubs, 'TabsContext.tsx'),
        '@/hooks/useTrialGuard$': path.join(stubs, 'useTrialGuard.ts'),
        '@/utils/auditLogger$': path.join(stubs, 'auditLogger.ts'),
        'react-router-dom$': path.join(stubs, 'reactRouterDom.tsx'),
        '@': src,
      },
      extensions: ['.tsx', '.ts', '.js', '.mjs', '.json'],
    },
  }
})
