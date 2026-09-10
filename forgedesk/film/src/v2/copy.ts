// Alle tekst van de film op één plek. FilmV2 leest hieruit.
// Regels: één kernwoord per belofte, uitleg maximaal 9 woorden, geen em-dashes.
export type Regel = { tekst: string; kernwoord: string; uitleg?: string }

export const COPY = {
  opening: { tekst: 'Alles wat een signmaker nodig heeft. In één app', kernwoord: 'één app' },
  mail: { tekst: 'Je mail is je werkvoorraad', kernwoord: 'werkvoorraad', uitleg: 'Daan herkent de aanvraag, de klant staat klaar.' },
  project: { tekst: 'Eén klik. Het project staat', kernwoord: 'staat', uitleg: 'Klant, briefing en bijlage staan er al in.' },
  offerte: { tekst: 'Je marge zie je vóór je verstuurt', kernwoord: 'marge', uitleg: 'Calculatie per regel, verzenden via het portaal.' },
  portaal: { tekst: 'Je klant tekent. Jij ziet het meteen', kernwoord: 'tekent', uitleg: 'Eén link, geen inlog, akkoord met handtekening.' },
  montage: { tekst: 'Eén sleep. De montage staat', kernwoord: 'staat', uitleg: 'Planning is alleen montage, de rest zijn taken.' },
  werkbon: { tekst: "Uren en foto's. Op locatie", kernwoord: 'locatie', uitleg: 'Inklokken, foto maken, het staat in het project.' },
  mailUitProject: { tekst: 'Mail uit het project. Tekening erbij', kernwoord: 'Tekening', uitleg: 'Bijlage uit het project, opvolgen aan.' },
  factuur: { tekst: 'Factuur eruit. Betaald', kernwoord: 'Betaald', uitleg: 'Betaald via Mollie, je ziet het meteen.' },
  alles: { tekst: 'Eén project. Alles erin', kernwoord: 'Alles' },
  eindkaart: { regel: 'Alles wat een signmaker nodig heeft. In één app.', url: 'app.doen.team' },
} as const
