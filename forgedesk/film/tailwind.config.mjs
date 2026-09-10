// Film-Tailwind: de app-config als preset, zodat elke klasse in geïmporteerde
// app-componenten (text-flame, rounded-card, shadow-elevation-md, bg-mod-*) hier
// exact hetzelfde rendert. Content dekt film/src én de app-mappen die we importeren.
import appConfig from '../tailwind.config.js'

export default {
  presets: [appConfig],
  // Versie 2 speelt op desktopschermen in een 3D-ruimte. De viewport is 1080
  // breed, dus md: en lg: zijn actief en app-componenten kiezen hun
  // desktopvariant. Telefoonschermen worden apart in een 390-container gezet.
  content: {
    relative: true,
    files: [
    './src/**/*.{ts,tsx}',
    '../src/components/portaal/**/*.tsx',
    '../src/components/quotes/OffertePubliekPagina.tsx',
    '../src/components/shared/{HandtekeningVeld,StatusBadge}.tsx',
    '../src/components/projects/cockpit/*.tsx',
    '../src/components/werkbonnen/{WerkbonMonteurFeedback,WerkbonVanProjectDialog}.tsx',
    '../src/components/email/{AanvraagKaart,EmailListItem}.tsx',
    '../src/components/email/shell/*.tsx',
    '../src/components/ui/**/*.tsx',
    '../src/utils/statusColors.ts',
    ],
  },
}
