import { createContext, useContext } from 'react'

// Filmformaat. Alle overlays en de camera lezen hieruit, zodat dezelfde
// tijdlijn in 4:3 en 9:16 rendert.
export type Formaat = {
  naam: '4:3' | '9:16' | '16:9'
  b: number; h: number
  middenX: number; middenY: number
  // Vermenigvuldiger op de camera-zoom (de stops zijn afgestemd op 9:16).
  zoomFactor: number
  belofteBoven: number; belofteOnder: number; belofteZijkant: number; belofteSize: [number, number]
  faseBottom: number; faseZijkant: number; faseSchaal: number
  toastTop: number; toastLeft: number; toastBreedte: number; toastSchaal: number
  wordmarkSize: number
}

export const FORMATEN: Record<Formaat['naam'], Formaat> = {
  '9:16': {
    naam: '9:16', b: 1080, h: 1920, middenX: 540, middenY: 860, zoomFactor: 1,
    belofteBoven: 330, belofteOnder: 560, belofteZijkant: 72, belofteSize: [92, 72],
    faseBottom: 250, faseZijkant: 90, faseSchaal: 1,
    toastTop: 300, toastLeft: 50, toastBreedte: 610, toastSchaal: 1.6,
    wordmarkSize: 330,
  },
  '16:9': {
    naam: '16:9', b: 1920, h: 1080, middenX: 960, middenY: 540, zoomFactor: 1,
    belofteBoven: 60, belofteOnder: 90, belofteZijkant: 120, belofteSize: [72, 58],
    faseBottom: 20, faseZijkant: 500, faseSchaal: 0.6,
    toastTop: 60, toastLeft: 60, toastBreedte: 520, toastSchaal: 1.25,
    wordmarkSize: 300,
  },
  '4:3': {
    naam: '4:3', b: 1440, h: 1080, middenX: 720, middenY: 470, zoomFactor: 0.72,
    belofteBoven: 56, belofteOnder: 128, belofteZijkant: 80, belofteSize: [72, 58],
    faseBottom: 20, faseZijkant: 390, faseSchaal: 0.6,
    toastTop: 60, toastLeft: 60, toastBreedte: 520, toastSchaal: 1.25,
    wordmarkSize: 300,
  },
}

export const FormaatCtx = createContext<Formaat>(FORMATEN['9:16'])
export const useFormaat = () => useContext(FormaatCtx)
