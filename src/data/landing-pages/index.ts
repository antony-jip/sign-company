// Phase 1: Quick Wins
export { bootstickersEnkhuizen } from './bootstickers-enkhuizen';
export { bootbeletteringIjsselmeer } from './bootbelettering-ijsselmeer';
export { signingTexel } from './signing-texel';
export { gevelreclameEnkhuizen } from './gevelreclame-enkhuizen';
export { autobeletteringEnkhuizen } from './autobelettering-enkhuizen';
export { signingWestFriesland } from './signing-west-friesland';

// Phase 2: Nearby Cities - West-Friesland
export { gevelreclameMedemblik } from './gevelreclame-medemblik';
export { autobeletteringMedemblik } from './autobelettering-medemblik';
export { gevelreclameHoorn } from './gevelreclame-hoorn';
export { autobeletteringHoorn } from './autobelettering-hoorn';
export { gevelreclameSchagen } from './gevelreclame-schagen';
export { autobeletteringSchagen } from './autobelettering-schagen';
export { signingDenHelder } from './signing-den-helder';
export { bewegwijzeringWestFriesland } from './bewegwijzering-west-friesland';
export { interieurSigningNoordHolland } from './interieur-signing-noord-holland';
export { autobeletteringBovenkarspel } from './autobelettering-bovenkarspel';
export { autobeletteringGrootebroek } from './autobelettering-grootebroek';
export { autobeletteringWervershoof } from './autobelettering-wervershoof';
export { autobeletteringAndijk } from './autobelettering-andijk';
export { autobeletteringOpmeer } from './autobelettering-opmeer';
export { autobeletteringStedebroec } from './autobelettering-stede-broec';
export { autobeletteringDrechterland } from './autobelettering-drechterland';

// Phase 2: Noord-Holland overig
export { autobeletteringHeerhugowaard } from './autobelettering-heerhugowaard';
export { autobeletteringDenHelder } from './autobelettering-den-helder';
export { autobeletteringPurmerend } from './autobelettering-purmerend';
export { autobeletteringZaandam } from './autobelettering-zaandam';

// Phase 3: Flevoland & Expansion
export { signingLelystad } from './signing-lelystad';
export { carwrappingLelystad } from './carwrapping-lelystad';
export { gevelreclameLelystad } from './gevelreclame-lelystad';
export { signingAlmere } from './signing-almere';
export { gevelreclameAlkmaar } from './gevelreclame-alkmaar';
export { autobeletteringAlkmaar } from './autobelettering-alkmaar';
export { autobeletteringLelystad } from './autobelettering-lelystad';
export { autobeletteringAlmere } from './autobelettering-almere';
export { autobeletteringDronten } from './autobelettering-dronten';
export { autobeletteringZeewolde } from './autobelettering-zeewolde';

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
import { autobeletteringBovenkarspel } from './autobelettering-bovenkarspel';
import { autobeletteringGrootebroek } from './autobelettering-grootebroek';
import { autobeletteringWervershoof } from './autobelettering-wervershoof';
import { autobeletteringAndijk } from './autobelettering-andijk';
import { autobeletteringOpmeer } from './autobelettering-opmeer';
import { autobeletteringStedebroec } from './autobelettering-stede-broec';
import { autobeletteringDrechterland } from './autobelettering-drechterland';
import { autobeletteringHeerhugowaard } from './autobelettering-heerhugowaard';
import { autobeletteringDenHelder } from './autobelettering-den-helder';
import { autobeletteringPurmerend } from './autobelettering-purmerend';
import { autobeletteringZaandam } from './autobelettering-zaandam';
import { signingLelystad } from './signing-lelystad';
import { carwrappingLelystad } from './carwrapping-lelystad';
import { gevelreclameLelystad } from './gevelreclame-lelystad';
import { signingAlmere } from './signing-almere';
import { gevelreclameAlkmaar } from './gevelreclame-alkmaar';
import { autobeletteringAlkmaar } from './autobelettering-alkmaar';
import { autobeletteringLelystad } from './autobelettering-lelystad';
import { autobeletteringAlmere } from './autobelettering-almere';
import { autobeletteringDronten } from './autobelettering-dronten';
import { autobeletteringZeewolde } from './autobelettering-zeewolde';
import { LandingPageData } from '@/types/landing-page';

export const allLandingPages: LandingPageData[] = [
  // Phase 1
  bootstickersEnkhuizen,
  bootbeletteringIjsselmeer,
  signingTexel,
  gevelreclameEnkhuizen,
  autobeletteringEnkhuizen,
  signingWestFriesland,
  // Phase 2 - West-Friesland
  gevelreclameMedemblik,
  autobeletteringMedemblik,
  gevelreclameHoorn,
  autobeletteringHoorn,
  gevelreclameSchagen,
  autobeletteringSchagen,
  signingDenHelder,
  bewegwijzeringWestFriesland,
  interieurSigningNoordHolland,
  autobeletteringBovenkarspel,
  autobeletteringGrootebroek,
  autobeletteringWervershoof,
  autobeletteringAndijk,
  autobeletteringOpmeer,
  autobeletteringStedebroec,
  autobeletteringDrechterland,
  // Phase 2 - Noord-Holland overig
  autobeletteringHeerhugowaard,
  autobeletteringDenHelder,
  autobeletteringPurmerend,
  autobeletteringZaandam,
  // Phase 3 - Flevoland & Expansion
  signingLelystad,
  carwrappingLelystad,
  gevelreclameLelystad,
  signingAlmere,
  gevelreclameAlkmaar,
  autobeletteringAlkmaar,
  autobeletteringLelystad,
  autobeletteringAlmere,
  autobeletteringDronten,
  autobeletteringZeewolde,
];

export const getLandingPageBySlug = (slug: string): LandingPageData | undefined => {
  return allLandingPages.find((page) => page.slug === slug);
};

export const getLandingPagesByPhase = (phase: 1 | 2 | 3): LandingPageData[] => {
  return allLandingPages.filter((page) => page.phase === phase);
};
