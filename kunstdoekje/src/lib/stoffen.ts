// Gedeelde stof-informatie voor de vergelijkpagina (/stoffen) én de
// stoffen-strip op de productpagina. Eén bron van waarheid voor beeld + tekst.

export interface StofInfo {
  key: 'velvet' | 'deco'
  naam: string
  ondertitel: string
  img: string
  alt: string
  beschrijving: string
  populair?: boolean
  eigenschappen: { label: string; waarde: string }[]
}

export const STOFFEN: StofInfo[] = [
  {
    key: 'deco',
    naam: 'Deco',
    ondertitel: 'De klassieke keuze',
    img: 'https://kunstdoekje.nl/wp-content/uploads/2024/05/decostof-kunstdoekje-1.png',
    alt: 'Kunstdoek op decostof · mat en strak',
    beschrijving:
      'Matte, strakke stof zonder reflectie. Rustig en tijdloos · perfect voor moderne interieurs, kantoren en galerie-achtige wanden.',
    eigenschappen: [
      { label: 'Textuur', waarde: 'Glad & mat' },
      { label: 'Licht', waarde: 'Geen reflectie' },
      { label: 'Sfeer', waarde: 'Strak & modern' },
      { label: 'Onderhoud', waarde: 'Gemakkelijk' },
    ],
  },
  {
    key: 'velvet',
    naam: 'Fluweel',
    ondertitel: 'De luxe ervaring',
    img: 'https://kunstdoekje.nl/wp-content/uploads/2024/04/kunstdoekje-fluweel-100-2.jpg',
    alt: 'Kunstdoek op fluweel · diepe kleuren en zachte glans',
    beschrijving:
      'Rijke, zachte stof die licht vasthoudt. Kleuren krijgen diepte en je kunstwerk komt echt tot leven · ideaal voor de woon- en slaapkamer.',
    populair: true,
    eigenschappen: [
      { label: 'Textuur', waarde: 'Zacht fluweel' },
      { label: 'Licht', waarde: 'Subtiele glans, diepe kleuren' },
      { label: 'Sfeer', waarde: 'Warm & luxe' },
      { label: 'Onderhoud', waarde: 'Voorzichtig afstoffen' },
    ],
  },
]
