// Film-Tailwind: de app-config als preset, zodat elke klasse in geïmporteerde
// app-componenten (text-flame, rounded-card, shadow-elevation-md, bg-mod-*) hier
// exact hetzelfde rendert. Content dekt film/src én de app-mappen die we importeren.
import appConfig from '../tailwind.config.js'

export default {
  presets: [appConfig],
  // De film speelt alles op een telefoon. De viewport is 1080 breed, dus elke
  // md:-variant zou anders de desktoplayout kiezen. Breakpoints buiten bereik
  // leggen dwingt de mobiele varianten van de app-componenten af.
  theme: {
    screens: { sm: '9000px', md: '9000px', lg: '9000px', xl: '9000px', '2xl': '9000px' },
  },
  content: {
    relative: true,
    files: [
    './src/**/*.{ts,tsx}',
    '../src/components/portaal/**/*.tsx',
    '../src/components/quotes/OffertePubliekPagina.tsx',
    '../src/components/shared/{HandtekeningVeld,StatusBadge}.tsx',
    '../src/components/projects/cockpit/{ProjectFaseBar,TakenOfferteGrid,TaskChecklistView}.tsx',
    '../src/components/werkbonnen/{WerkbonMonteurFeedback,WerkbonVanProjectDialog}.tsx',
    '../src/components/email/AanvraagKaart.tsx',
    '../src/components/ui/**/*.tsx',
    '../src/utils/statusColors.ts',
    ],
  },
}
