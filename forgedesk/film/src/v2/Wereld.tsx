import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AbsoluteFill } from 'remotion'
import { merk } from '../brand'
import { ease, lerp, vlak } from '../tijd'
import { VENSTER_B, VENSTER_H } from './DesktopChrome'
import { useFormaat } from './formaat'

// 2.5D-ruimte. Schermen liggen op vaste plekken in een vlak; de camera is
// {x, y, zoom} en vliegt tussen stops. Schermen die niet actief zijn kantelen
// licht, staan verder weg (kleiner, waziger). Alles in filmcoördinaten bij
// zoom 1; de film is 1080 x 1920 met het midden op (540, 960).
export type Camera = { x: number; y: number; zoom: number }
export type CameraStop = { ms: number; x: number; y: number; zoom: number; duurMs?: number; maxMs?: number }

// Vluchtduur schaalt met sqrt(afstand) (MOTION.md): een reframe binnen een
// scherm blijft op zijn duurMs, een vlucht tussen schermen wordt 1200-2000 ms
// (1200 bij 1600 wereld-px, 2000 bij 4400). Afstand in wereld-px bij zoom 1,
// plus een zoomterm (600 px per ln-eenheid). maxMs kapt af waar de beats geen
// ruimte laten.
export const vluchtDuur = (van: { x: number; y: number; zoom: number }, naar: CameraStop) => {
  const afstand = Math.hypot(naar.x - van.x, naar.y - van.y) + Math.abs(Math.log(naar.zoom / van.zoom)) * 600
  const geschaald = 1200 * Math.sqrt(afstand / 1600)
  return Math.max(naar.duurMs ?? 900, Math.min(naar.maxMs ?? 2000, geschaald))
}

export const useCamera = (t: number, stops: CameraStop[]): Camera => {
  let cam: Camera = { x: stops[0].x, y: stops[0].y, zoom: stops[0].zoom }
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i]
    const p = vlak(t, s.ms, s.ms + vluchtDuur(stops[i - 1], s), ease.camera)
    // Zoom logaritmisch, zodat in- en uitzoomen even snel voelen.
    cam = { x: lerp(cam.x, s.x, p), y: lerp(cam.y, s.y, p), zoom: Math.exp(lerp(Math.log(cam.zoom), Math.log(s.zoom), p)) }
  }
  return cam
}

// Schaal waarop een desktopvenster (1440 css-px) in de wereld staat bij zoom 1.
export const SCHERM_SCHAAL = 0.62
export const SCHERM_B = VENSTER_B * SCHERM_SCHAAL
export const SCHERM_H = VENSTER_H * SCHERM_SCHAAL

const CameraCtx = createContext<Camera>({ x: 0, y: 0, zoom: 1 })
export const useHuidigeCamera = () => useContext(CameraCtx)

// Wereldpunt naar filmpunt.
export const MIDDEN_Y = 860
export const naarFilm = (cam: Camera, wx: number, wy: number) => ({ x: 540 + (wx - cam.x) * cam.zoom, y: MIDDEN_Y + (wy - cam.y) * cam.zoom })

export const Wereld: React.FC<{ camera: Camera; children: ReactNode; grond?: string }> = ({ camera, children, grond = merk.pagina }) => {
  const f = useFormaat()
  const zoom = camera.zoom * f.zoomFactor
  return (
  <CameraCtx.Provider value={camera}>
    <AbsoluteFill style={{ backgroundColor: grond, overflow: 'hidden' }}>
      {/* Zachte petrol-gloed die meebeweegt met de camera, als omgevingslicht */}
      <div style={{ position: 'absolute', left: f.middenX - 900, top: f.middenY - 900, width: 1800, height: 1800, borderRadius: '50%', background: `radial-gradient(circle, ${merk.petrol}2E 0%, ${merk.petrol}0F 40%, transparent 68%)` }} />
      <div style={{ position: 'absolute', left: f.middenX, top: f.middenY, width: 0, height: 0, transform: `scale(${zoom}) translate(${-camera.x}px, ${-camera.y}px)`, transformOrigin: '0 0' }}>
        {children}
      </div>
    </AbsoluteFill>
  </CameraCtx.Provider>
  )
}

type SchermProps = {
  id: string
  x: number
  y: number
  // Filmtijd in ms, voor de ambient drift (sin-gedreven, nooit stil).
  t?: number
  // Diepte 0 = actief vlak. Groter = verder weg: kleiner, waziger, lichter.
  diepte?: number
  kantel?: number
  // Secundaire laag: de slagschaduw volgt de kantel 2-3 f later.
  schaduwKantel?: number
  breedte?: number
  hoogte?: number
  children: ReactNode
  zicht?: number
  gloed?: number
  // Extra schaal (magneet aan het eind), 1 = normaal.
  extraSchaal?: number
  rotatie?: number
}

// Vaste fase per scherm, zodat de ambient drift per venster anders loopt.
const faseVan = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; return (h / 997) * Math.PI * 2 }

// Een venster in de ruimte. x/y = middelpunt in wereldcoördinaten.
// Drie lagen (MOTION.md): het paneel is de hoofdlaag, de slagschaduw de
// secundaire laag (kantel 2-3 f later), gloed en drift zijn ambient.
export const Scherm: React.FC<SchermProps> = ({ id, x, y, t = 0, diepte = 0, kantel = 0, schaduwKantel = kantel, breedte = SCHERM_B, hoogte = SCHERM_H, children, zicht = 1, gloed = 0, extraSchaal = 1, rotatie = 0 }) => {
  const schaal = extraSchaal / (1 + diepte * 0.22)
  const blur = diepte * 2.6
  const dim = 1 - Math.min(0.12, diepte * 0.08)
  const fase = faseVan(id)
  // Ambient: gloed ademt 15 procent in 2,6 s; een niet-actief venster drijft 6 px in 3,4 s.
  const adem = 0.85 + 0.15 * Math.sin((t / 2600) * Math.PI * 2 + fase)
  const drift = Math.min(1, diepte) * 6
  const dy = Math.sin((t / 3400) * Math.PI * 2 + fase) * drift
  const dx = Math.cos((t / 4100) * Math.PI * 2 + fase) * drift * 0.5
  return (
    <div data-scherm={id} style={{ position: 'absolute', left: x - breedte / 2, top: y - hoogte / 2, width: breedte, height: hoogte, opacity: zicht, perspective: 2600 }}>
      {gloed > 0 && <div style={{ position: 'absolute', left: '50%', top: '50%', width: breedte * 1.5, height: hoogte * 1.5, transform: `translate(-50%,-50%) scale(${0.96 + 0.04 * adem})`, borderRadius: '50%', background: `radial-gradient(closest-side, ${merk.petrol}40, transparent)`, opacity: gloed * adem, filter: 'blur(30px)' }} />}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 22,
        transform: `translate(${dx}px, ${dy}px) scale(${schaal}) rotateY(${schaduwKantel}deg) rotate(${rotatie}deg)`, transformOrigin: 'center',
        boxShadow: '0 24px 48px -12px rgba(120,90,50,.20), 0 80px 120px -40px rgba(120,90,50,.28)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', backgroundColor: merk.wit,
        transform: `translate(${dx}px, ${dy}px) scale(${schaal}) rotateY(${kantel}deg) rotate(${rotatie}deg)`, transformOrigin: 'center',
        filter: `blur(${blur}px) brightness(${dim})`,
        boxShadow: '0 2px 4px rgba(70,55,40,.04), 0 0 0 1px rgba(255,255,255,.6) inset',
      }}>
        <div style={{ width: breedte / SCHERM_SCHAAL, height: hoogte / SCHERM_SCHAAL, transform: `scale(${SCHERM_SCHAAL})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
