// Alle tekst van de film op één plek. FilmV2 leest hieruit.
// Regels: één kernwoord per belofte dat letterlijk in tekst staat, maximaal 34 tekens
// per regel, uitleg maximaal 9 woorden met de labels uit de app, geen em-dashes.
// Belofte.tsx zet de Flame-punt alleen als het kernwoord de regel sluit of direct
// door een punt gevolgd wordt; daarom staat het kernwoord bijna overal achteraan.
export type Regel = { tekst: string; kernwoord: string; uitleg?: string }

export const COPY = {
  opening: { tekst: 'Van mail tot betaald. In één app', kernwoord: 'één app' },
  mail: { tekst: 'Je mail is je werkvoorraad', kernwoord: 'werkvoorraad', uitleg: 'Daan herkent de aanvraag, de klantkaart vult zich.' },
  project: { tekst: 'Eén klik. Het project staat', kernwoord: 'staat', uitleg: 'Klant, briefing en bijlage hangen al aan het project.' },
  offerte: { tekst: 'Je marge zie je vóór je verstuurt', kernwoord: 'marge', uitleg: 'Inkoop, Verkoop, Marge per regel, dan Verstuur via portaal.' },
  portaal: { tekst: 'Klant tekent. Jij ziet het meteen', kernwoord: 'tekent', uitleg: 'Geen inlog. Naam, handtekening, Bevestigen. Project op Akkoord klant.' },
  montage: { tekst: 'Eén sleep. De montage staat', kernwoord: 'staat', uitleg: 'De kaart landt op donderdag, project springt naar Ingepland.' },
  werkbon: { tekst: 'Werkbon op locatie. Niets overtypen', kernwoord: 'Niets overtypen', uitleg: 'Foto en handtekening, meteen in het project.' },
  mailUitProject: { tekst: 'Tekening erbij. Zonder zoeken', kernwoord: 'Zonder zoeken', uitleg: 'Uit project pakt de tekening, Opvolgen staat aan.' },
  factuur: { tekst: 'Factuur eruit. Betaald', kernwoord: 'Betaald', uitleg: 'Versturen, klant klikt Betaal nu, factuur springt op betaald.' },
  alles: { tekst: 'Eén project. Alles erin', kernwoord: 'Alles erin' },
  eindkaart: { regel: 'slim gedaan', url: '', sub: '' },
} as const
