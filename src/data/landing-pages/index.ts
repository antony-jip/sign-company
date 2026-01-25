// Phase 1: Quick Wins
export { bootstickersEnkhuizen } from './bootstickers-enkhuizen';
export { bootbeletteringIjsselmeer } from './bootbelettering-ijsselmeer';
export { signingTexel } from './signing-texel';
export { gevelreclameEnkhuizen } from './gevelreclame-enkhuizen';
export { autobeletteringEnkhuizen } from './autobelettering-enkhuizen';
export { signingWestFriesland } from './signing-west-friesland';

// Phase 2: Nearby Cities
export { gevelreclameMedemblik } from './gevelreclame-medemblik';
export { autobeletteringMedemblik } from './autobelettering-medemblik';
export { gevelreclameHoorn } from './gevelreclame-hoorn';
export { autobeletteringHoorn } from './autobelettering-hoorn';
export { gevelreclameSchagen } from './gevelreclame-schagen';
export { autobeletteringSchagen } from './autobelettering-schagen';
export { signingDenHelder } from './signing-den-helder';
export { bewegwijzeringWestFriesland } from './bewegwijzering-west-friesland';
export { interieurSigningNoordHolland } from './interieur-signing-noord-holland';

// Phase 3: Flevoland & Expansion
export { signingLelystad } from './signing-lelystad';
export { carwrappingLelystad } from './carwrapping-lelystad';
export { gevelreclameLelystad } from './gevelreclame-lelystad';
export { signingAlmere } from './signing-almere';
export { gevelreclameAlkmaar } from './gevelreclame-alkmaar';
export { autobeletteringAlkmaar } from './autobelettering-alkmaar';

// Import all data for iteration
import { bootstickersEnkhuizen } from './bootstickers-enkhuizen';
import { bootbeletteringIjsselmeer } from './bootbelettering-ijsselmeer';
import { signingTexel } from './signing-texel';
import { gevelreclameEnkhuizen } from './gevelreclame-enkhuizen';
import { autobeletteringEnkhuizen } from './autobelettering-enkhuizen';
import { signingWestFriesland } from './signing-west-friesland';
import { gevelreclameMedemblik } from './gevelreclame-medemblik';
import { autobeletteringMedemblik } from './autobelettering-medemblik';
import { gevelreclameHoorn } from './gevelreclame-hoorn';
import { autobeletteringHoorn } from './autobelettering-hoorn';
import { gevelreclameSchagen } from './gevelreclame-schagen';
import { autobeletteringSchagen } from './autobelettering-schagen';
import { signingDenHelder } from './signing-den-helder';
import { bewegwijzeringWestFriesland } from './bewegwijzering-west-friesland';
import { interieurSigningNoordHolland } from './interieur-signing-noord-holland';
import { signingLelystad } from './signing-lelystad';
import { carwrappingLelystad } from './carwrapping-lelystad';
import { gevelreclameLelystad } from './gevelreclame-lelystad';
import { signingAlmere } from './signing-almere';
import { gevelreclameAlkmaar } from './gevelreclame-alkmaar';
import { autobeletteringAlkmaar } from './autobelettering-alkmaar';
import { LandingPageData } from '@/types/landing-page';

export const allLandingPages: LandingPageData[] = [
  // Phase 1
  bootstickersEnkhuizen,
  bootbeletteringIjsselmeer,
  signingTexel,
  gevelreclameEnkhuizen,
  autobeletteringEnkhuizen,
  signingWestFriesland,
  // Phase 2
  gevelreclameMedemblik,
  autobeletteringMedemblik,
  gevelreclameHoorn,
  autobeletteringHoorn,
  gevelreclameSchagen,
  autobeletteringSchagen,
  signingDenHelder,
  bewegwijzeringWestFriesland,
  interieurSigningNoordHolland,
  // Phase 3
  signingLelystad,
  carwrappingLelystad,
  gevelreclameLelystad,
  signingAlmere,
  gevelreclameAlkmaar,
  autobeletteringAlkmaar,
];

// Note: Additional autobelettering landing pages are available as static HTML files
// in /public/autobelettering/ for the following cities:
// - West-Friesland: Bovenkarspel, Grootebroek, Wervershoof, Andijk, Opmeer, Stede Broec, Drechterland
// - Noord-Holland: Heerhugowaard, Den Helder, Purmerend, Zaandam
// - Flevoland: Lelystad, Almere, Dronten, Zeewolde

export const getLandingPageBySlug = (slug: string): LandingPageData | undefined => {
  return allLandingPages.find((page) => page.slug === slug);
};

export const getLandingPagesByPhase = (phase: 1 | 2 | 3): LandingPageData[] => {
  return allLandingPages.filter((page) => page.phase === phase);
};
