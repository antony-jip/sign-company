export { ConversationView, type ConversationViewProps } from './ConversationView'
export { Bericht, type AntwoordModus } from './Bericht'
export { bepaalOpenBerichten, buurBericht, deelnemersVan, deelnemersLabel, kortePreview, sorteerOudNaarNieuw } from './thread'

/**
 * Acties die de shell aan toetsen hangt terwijl het leesvenster open staat.
 * De reader houdt zelf geen keydown-listener bij; de shell is de enige plek
 * met toetsafhandeling (zie shell/toetsen.ts).
 */
export const readerActies = {
  volgendeBericht: 'n',
  vorigeBericht: 'p',
  citaatTonen: 'q',
  afbeeldingenLaden: 'i',
} as const
export type ReaderActie = keyof typeof readerActies
