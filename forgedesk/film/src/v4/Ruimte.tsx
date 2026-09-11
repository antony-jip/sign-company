import type { ReactNode } from 'react'
import { Easing } from 'remotion'
import { VensterCtx } from '../v2/DesktopChrome'
import { lerp, vlak } from '../tijd'
import { thema } from './thema'

// De ruimte van de app-schermen (v4): echte app-UI op panelen in een CSS-3D
// ruimte. De camera staat tijdens een handeling recht voor het actieve paneel
// (nul perspectief); tussen hoofdstukken dollyt hij in 1,2 s met lichte
// parallax (niet-actieve panelen liggen dieper, kantelen 6 graden en vervagen).
// Detailzoom is een push van de hele ruimte (1,4x), geen CSS-scale op een blok.

// Vensterformaat van de app-schermen in v4: 16:10, zodat een breed paneel 76
// procent van het beeld vult zonder de UI te croppen.
export const VENSTER4 = { b: 1600, h: 1000 }
export const PANEEL_SCHAAL = 0.918
export const PANEEL_B = VENSTER4.b * PANEEL_SCHAAL
export const PANEEL_H = VENSTER4.h * PANEEL_SCHAAL

export type Plek = { x: number; y: number }
export type CameraStop4 = { ms: number; x: number; y: number; zoom?: number; duurMs?: number }

const inUitCubic = Easing.inOut(Easing.cubic)

// Camera uit stops: dolly 1,2 s easeInOutCubic; zoom (push) 400 ms.
export const camera4 = (t: number, stops: CameraStop4[]) => {
  let cam = { x: stops[0].x, y: stops[0].y, zoom: stops[0].zoom ?? 1 }
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i]
    const duur = s.duurMs ?? thema.camera.dollyMs
    const p = vlak(t, s.ms, s.ms + duur, duur <= 500 ? thema.ease.camera : inUitCubic)
    cam = { x: lerp(cam.x, s.x, p), y: lerp(cam.y, s.y, p), zoom: lerp(cam.zoom, s.zoom ?? 1, p) }
  }
  return cam
}

export const Ruimte: React.FC<{ cam: { x: number; y: number; zoom: number }; children: ReactNode; zicht?: number }> = ({ cam, children, zicht = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: zicht, perspective: 2600, perspectiveOrigin: '50% 50%' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(960px, 540px) scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)`, transformStyle: 'preserve-3d' }}>
      <VensterCtx.Provider value={VENSTER4}>{children}</VensterCtx.Provider>
    </div>
  </div>
)

type PaneelProps = {
  id: string
  plek: Plek
  // 0 = actief vlak, 1 = een hoofdstuk verder weg (dieper, gekanteld, wazig).
  diepte: number
  kantel?: number
  zicht?: number
  breedte?: number
  hoogte?: number
  // Kaal: geen witte kaart (voor telefoons die hun eigen frame hebben).
  kaal?: boolean
  // Vaste kantel in graden, ook als het paneel actief is (3D-telefoon: 8).
  vasteKantel?: number
  children: ReactNode
}

// Een paneel met echte UI: wit, ronde hoeken, een dunne lichte rand en een
// zachte petrol-schaduw. Diepte gaat via translateZ, zodat de parallax in de
// dolly echt is.
export const Paneel: React.FC<PaneelProps> = ({ id, plek, diepte, kantel = 6, zicht = 1, breedte = PANEEL_B, hoogte = PANEEL_H, kaal = false, vasteKantel = 0, children }) => {
  const z = -diepte * 900
  const blur = Math.max(0, diepte - 0.15) * 7
  const inhoud = (
    <div style={{ width: breedte / PANEEL_SCHAAL, height: hoogte / PANEEL_SCHAAL, transform: `scale(${PANEEL_SCHAAL})`, transformOrigin: '0 0' }}>
      {children}
    </div>
  )
  return (
    <div data-scherm={id} style={{ position: 'absolute', left: plek.x - breedte / 2, top: plek.y - hoogte / 2, width: breedte, height: hoogte, opacity: zicht * (1 - Math.min(0.35, diepte * 0.3)), transform: `translateZ(${z}px) rotateY(${vasteKantel + kantel * diepte}deg)`, transformOrigin: 'center', filter: blur > 0 ? `blur(${blur}px)` : undefined }}>
      {kaal ? inhoud : (
        <>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 26, boxShadow: '0 40px 90px -30px rgba(26,83,92,0.38), 0 120px 160px -80px rgba(26,83,92,0.30)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backgroundColor: thema.kleur.wit, boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 1px 0 rgba(255,255,255,1) inset' }}>
            {inhoud}
          </div>
        </>
      )}
    </div>
  )
}
