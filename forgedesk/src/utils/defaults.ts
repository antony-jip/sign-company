// LET OP: deze tekst moet identiek blijven aan de DEFAULT in
// supabase/migrations/096_offerte_voorwaarden_app_settings.sql
export const DEFAULT_OFFERTE_VOORWAARDEN = `1. Deze offerte is geldig gedurende de aangegeven termijn.
2. Betaling dient te geschieden binnen 30 dagen na factuurdatum.
3. Alle genoemde bedragen zijn exclusief BTW, tenzij anders vermeld.
4. Levertijd wordt in overleg bepaald na akkoord op deze offerte.
5. Op al onze leveringen en diensten zijn onze algemene voorwaarden van toepassing.
6. Kleuren en materialen kunnen licht afwijken van getoonde voorbeelden.
7. Wijzigingen na akkoord kunnen tot meerkosten leiden.
8. Garantie: 2 jaar op materiaal en constructie, 1 jaar op elektronica.`

// LET OP: deze twee moeten identiek blijven aan de DEFAULTs in
// supabase/migrations/224_offerte_levertijd_betalingsconditie.sql
export const DEFAULT_OFFERTE_LEVERTIJD = 'In overleg'
export const DEFAULT_OFFERTE_BETALINGSCONDITIE = 'Betaling binnen 30 dagen na factuurdatum.'

/** Snelkeuzes in het blok Levering & betaling van het offertescherm. */
export const LEVERTIJD_SUGGESTIES = [
  'In overleg',
  '1 tot 2 weken na akkoord',
  '3 tot 4 weken na akkoord',
  '6 tot 8 weken na akkoord',
]

export const BETALINGSCONDITIE_SUGGESTIES = [
  'Betaling binnen 30 dagen na factuurdatum.',
  'Betaling binnen 14 dagen na factuurdatum.',
  '50% bij opdracht, 50% bij oplevering.',
  'Volledige betaling vooraf.',
]
