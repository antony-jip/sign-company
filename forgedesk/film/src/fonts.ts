import { loadFont as loadInstrumentSans } from '@remotion/google-fonts/InstrumentSans'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadDMMono } from '@remotion/google-fonts/DMMono'

// Zelfde fonts als de app: Instrument Sans voor koppen, Inter voor body.
// DM Mono voor cijfers en labels, zoals het portaal die al gebruikt.
const kop = loadInstrumentSans('normal', { weights: ['500', '600', '700'], subsets: ['latin'] })
const body = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })
const mono = loadDMMono('normal', { weights: ['400', '500'], subsets: ['latin'] })

export const fonts = {
  kop: kop.fontFamily,
  body: body.fontFamily,
  mono: mono.fontFamily,
} as const

// Wacht tot de fonts geladen zijn (nodig voor canvas-texturen in 3D).
export const fontsKlaar = Promise.all([kop.waitUntilDone(), body.waitUntilDone(), mono.waitUntilDone()])
