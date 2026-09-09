// De 50 shots van "een dag", 24 fps, 1800 frames. Enige bron van waarheid voor
// de montage; de tabel in EEN-DAG-PRODUCTIEBOEK.md sectie 4 is dezelfde data.
// tijdlijn.test.mjs bewaakt dat de reeks aansluit en op 1800 uitkomt.

export const FPS = 24;
export const DUUR = 1800;

// beeld  = live-action, komt van de camera of van fal. Nu een plaatshouder.
// scherm = app-opname met overlay, hier als motion graphic gebouwd.
// eind   = de end card, volledig uit code.
export type Soort = "beeld" | "scherm" | "eind";

export type Scherm =
  | "lockscreen"
  | "dashboard"
  | "leads"
  | "klantkaart"
  | "offerte"
  | "offertestatus"
  | "werkbon"
  | "planning"
  | "portaal"
  | "factuur"
  | "push";

export type Shot = {
  id: string;
  scene: number;
  van: number;
  tot: number;
  soort: Soort;
  bewijst: string;
  // Alleen bij soort "beeld": wat er gedraaid of gegenereerd moet worden.
  beeld?: string;
  // Alleen bij soort "scherm".
  scherm?: Scherm;
  stap?: string;
};

export const SHOTS: Shot[] = [
  { id: "1A", scene: 1, van: 0, tot: 62, soort: "beeld", bewijst: "het uur waarop zijn dag begint", beeld: "wekkerdisplay 06:45, macro, hand tast" },
  { id: "1B", scene: 1, van: 62, tot: 120, soort: "scherm", scherm: "lockscreen", stap: "een melding", bewijst: "een melding is genoeg" },

  { id: "2A", scene: 2, van: 120, tot: 187, soort: "beeld", bewijst: "hij pakt niets anders op", beeld: "loopt door de gang naar de keuken" },
  { id: "2B", scene: 2, van: 187, tot: 230, soort: "beeld", bewijst: "de app wacht op hem", beeld: "telefoon tegen de fruitschaal, koffie aan" },
  { id: "2C", scene: 2, van: 230, tot: 288, soort: "scherm", scherm: "dashboard", stap: "omzet telt op", bewijst: "alles op een scherm" },

  { id: "3A", scene: 3, van: 288, tot: 355, soort: "beeld", bewijst: "niets, dit is ademruimte", beeld: "koffie loopt, stoom in tegenlicht" },
  { id: "3B", scene: 3, van: 355, tot: 413, soort: "scherm", scherm: "leads", stap: "lead openen", bewijst: "de lead staat er al" },
  { id: "3C", scene: 3, van: 413, tot: 480, soort: "scherm", scherm: "klantkaart", stap: "velden vullen zich", bewijst: "hij typt niets over" },

  { id: "4A", scene: 4, van: 480, tot: 509, soort: "beeld", bewijst: "het tempo breekt", beeld: "busdeur open, stapt in" },
  { id: "4B", scene: 4, van: 509, tot: 535, soort: "beeld", bewijst: "motor staat nog uit", beeld: "telefoon in de houder" },
  { id: "4C", scene: 4, van: 535, tot: 564, soort: "scherm", scherm: "offerte", stap: "offerte openen", bewijst: "offerte komt uit het project" },
  { id: "4D", scene: 4, van: 564, tot: 586, soort: "scherm", scherm: "offerte", stap: "regel toevoegen", bewijst: "een tik is een regel" },
  { id: "4E", scene: 4, van: 586, tot: 614, soort: "scherm", scherm: "offerte", stap: "regel vult", bewijst: "het product staat er al in" },
  { id: "4F", scene: 4, van: 614, tot: 636, soort: "scherm", scherm: "offerte", stap: "prijs telt op", bewijst: "de prijs rekent zichzelf" },
  { id: "4G", scene: 4, van: 636, tot: 670, soort: "scherm", scherm: "offerte", stap: "totaal", bewijst: "het totaal klopt zonder rekenwerk" },
  { id: "4H", scene: 4, van: 670, tot: 694, soort: "scherm", scherm: "offerte", stap: "versturen", bewijst: "versturen is een tik" },
  { id: "4I", scene: 4, van: 694, tot: 720, soort: "beeld", bewijst: "de rit begint pas nu", beeld: "hand terug aan het stuur, bus rijdt weg" },

  { id: "5A", scene: 5, van: 720, tot: 754, soort: "scherm", scherm: "offertestatus", stap: "concept", bewijst: "de status voor het versturen" },
  { id: "5B", scene: 5, van: 754, tot: 816, soort: "scherm", scherm: "offertestatus", stap: "verstuurd", bewijst: "het is echt weg" },

  { id: "6A", scene: 6, van: 816, tot: 845, soort: "beeld", bewijst: "de werkplaats is echt", beeld: "wide, printer loopt achterin" },
  { id: "6B", scene: 6, van: 845, tot: 869, soort: "beeld", bewijst: "hij loopt door naar het werk", beeld: "loopt door het beeld naar de statafel" },
  { id: "6C", scene: 6, van: 869, tot: 898, soort: "beeld", bewijst: "hij bedient het met een hand", beeld: "telefoon rechtop, gefreesde letter in de andere hand" },
  { id: "6D", scene: 6, van: 898, tot: 919, soort: "scherm", scherm: "werkbon", stap: "camera openen", bewijst: "de camera zit in de werkbon" },
  { id: "6E", scene: 6, van: 919, tot: 948, soort: "beeld", bewijst: "hij fotografeert echt werk", beeld: "gefreesde letter in de zoeker" },
  { id: "6F", scene: 6, van: 948, tot: 970, soort: "scherm", scherm: "werkbon", stap: "foto landt", bewijst: "de foto zit meteen op de bon" },
  { id: "6G", scene: 6, van: 970, tot: 1003, soort: "scherm", scherm: "werkbon", stap: "uren loggen", bewijst: "uren zijn twee tikken" },
  { id: "6H", scene: 6, van: 1003, tot: 1027, soort: "scherm", scherm: "werkbon", stap: "gelogd", bewijst: "de bon is klaar" },
  { id: "6I", scene: 6, van: 1027, tot: 1056, soort: "beeld", bewijst: "hij loopt weg van de telefoon", beeld: "pakt de letter op, loopt uit beeld" },

  { id: "7A", scene: 7, van: 1056, tot: 1087, soort: "beeld", bewijst: "geen apart kantoor", beeld: "kantoorhoek in de werkplaats" },
  { id: "7B", scene: 7, van: 1087, tot: 1116, soort: "scherm", scherm: "planning", stap: "conflict", bewijst: "het conflict is zichtbaar" },
  { id: "7C", scene: 7, van: 1116, tot: 1147, soort: "beeld", bewijst: "hij pakt het zelf vast", beeld: "hand komt in beeld, pakt de kaart" },
  { id: "7D", scene: 7, van: 1147, tot: 1181, soort: "scherm", scherm: "planning", stap: "slepen", bewijst: "verplaatsen is slepen" },
  { id: "7E", scene: 7, van: 1181, tot: 1210, soort: "scherm", scherm: "planning", stap: "landt", bewijst: "hij snapt in het raster" },
  { id: "7F", scene: 7, van: 1210, tot: 1248, soort: "scherm", scherm: "planning", stap: "conflict dooft", bewijst: "het conflict lost zichzelf op" },

  { id: "8A", scene: 8, van: 1248, tot: 1277, soort: "beeld", bewijst: "twee plekken tegelijk", beeld: "split screen, klant links, bus rechts" },
  { id: "8B", scene: 8, van: 1277, tot: 1303, soort: "scherm", scherm: "portaal", stap: "offerte open", bewijst: "de klant ziet het zelf" },
  { id: "8C", scene: 8, van: 1303, tot: 1332, soort: "scherm", scherm: "portaal", stap: "akkoord", bewijst: "tekenen is een tik" },
  { id: "8D", scene: 8, van: 1332, tot: 1358, soort: "beeld", bewijst: "hij hoort het zonder te bellen", beeld: "telefoon in de houder licht op" },
  { id: "8E", scene: 8, van: 1358, tot: 1392, soort: "scherm", scherm: "offertestatus", stap: "getekend", bewijst: "geen belletje nodig" },

  { id: "9A", scene: 9, van: 1392, tot: 1421, soort: "beeld", bewijst: "hij staat bij de bus", beeld: "schuift plaatmateriaal in de bus" },
  { id: "9B", scene: 9, van: 1421, tot: 1447, soort: "beeld", bewijst: "de dag loopt door", beeld: "achterdeuren dicht, harde klap" },
  { id: "9C", scene: 9, van: 1447, tot: 1476, soort: "scherm", scherm: "factuur", stap: "rolt uit project", bewijst: "niemand maakt de factuur" },
  { id: "9D", scene: 9, van: 1476, tot: 1502, soort: "scherm", scherm: "factuur", stap: "bedrag telt op", bewijst: "het bedrag komt uit de offerte" },
  { id: "9E", scene: 9, van: 1502, tot: 1536, soort: "scherm", scherm: "factuur", stap: "verstuurd", bewijst: "getekend is gefactureerd" },

  { id: "10A", scene: 10, van: 1536, tot: 1594, soort: "beeld", bewijst: "de dag sluit zichzelf af", beeld: "avondtafel, telefoon ligt, kind ver onscherp" },
  { id: "10B", scene: 10, van: 1594, tot: 1637, soort: "beeld", bewijst: "hij kijkt niet eens", beeld: "telefoon licht op" },
  { id: "10C", scene: 10, van: 1637, tot: 1680, soort: "scherm", scherm: "push", stap: "betaald", bewijst: "het geld komt binnen zonder hem" },

  { id: "11A", scene: 11, van: 1680, tot: 1718, soort: "beeld", bewijst: "hij sluit af", beeld: "laptop gaat dicht" },
  { id: "11B", scene: 11, van: 1718, tot: 1747, soort: "beeld", bewijst: "de dag is voorbij", beeld: "werkplaatslicht uit, wide" },
  { id: "11C", scene: 11, van: 1747, tot: 1800, soort: "eind", bewijst: "doen. gedaan." },
];

// De voice-over, in frames. Sectie 8 van het productieboek.
export const VO: { frame: number; tekst: string }[] = [
  { frame: 24, tekst: "Zes uur vijfenveertig. Je dag is al begonnen." },
  { frame: 144, tekst: "Geen mappen. Geen appjes. Een overzicht." },
  { frame: 312, tekst: "De lead staat er al in. De gegevens vult doen. zelf." },
  { frame: 528, tekst: "Offerte onderweg. Klaar voordat je er bent." },
  { frame: 744, tekst: "verstuurd." },
  { frame: 864, tekst: "De werkvloer typt niet. Die tikt." },
  { frame: 1080, tekst: "Planning schuift mee. Het conflict lost zichzelf op." },
  { frame: 1272, tekst: "De klant tekent digitaal. Jij hoeft niet te bellen." },
  { frame: 1416, tekst: "Getekend is gefactureerd." },
  { frame: 1608, tekst: "betaald." },
  { frame: 1728, tekst: "doen. gedaan." },
];
