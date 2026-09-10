import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AbsoluteFill, staticFile } from 'remotion'
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

// Aurora: vier zachte kleurvlekken (flame, petrol, zand, petrol-licht) die
// traag drijven en licht meebewegen met de camera. Het licht, wazige
// gradiëntveld van moderne SaaS-launchfilms, in de kleuren van doen.
const VLEKKEN: { kleur: string; alpha: string; x: number; y: number; r: number; fase: number; periode: number }[] = [
  { kleur: merk.flame, alpha: '3A', x: 0.18, y: 0.22, r: 720, fase: 0.3, periode: 13000 },
  { kleur: merk.petrol, alpha: '36', x: 0.84, y: 0.30, r: 780, fase: 2.1, periode: 16000 },
  { kleur: merk.zand, alpha: '70', x: 0.30, y: 0.86, r: 700, fase: 4.0, periode: 14500 },
  { kleur: merk.petrolLight, alpha: 'FF', x: 0.78, y: 0.88, r: 760, fase: 1.2, periode: 12000 },
]
export const Aurora: React.FC<{ t: number; camera: Camera; zicht: number }> = ({ t, camera, zicht }) => {
  const f = useFormaat()
  if (zicht <= 0) return null
  const px = -camera.x * 0.2, py = -camera.y * 0.2
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: zicht, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: -300, filter: 'blur(74px) saturate(1.35)' }}>
        {VLEKKEN.map((v, i) => {
          const dx = Math.sin((t / v.periode) * Math.PI * 2 + v.fase) * 90
          const dy = Math.cos((t / (v.periode * 1.3)) * Math.PI * 2 + v.fase) * 70
          return <div key={i} style={{ position: 'absolute', left: 300 + f.b * v.x - v.r + dx + px, top: 300 + f.h * v.y - v.r + dy + py, width: v.r * 2, height: v.r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${v.kleur}${v.alpha} 0%, ${v.kleur}00 68%)` }} />
        })}
      </div>
    </div>
  )
}

export const Wereld: React.FC<{ camera: Camera; children: ReactNode; grond?: string; t?: number }> = ({ camera, children, grond = merk.pagina, t = 0 }) => {
  const f = useFormaat()
  const zoom = camera.zoom * f.zoomFactor
  return (
  <CameraCtx.Provider value={camera}>
    <AbsoluteFill style={{ backgroundColor: grond, overflow: 'hidden' }}>
      <Aurora t={t} camera={camera} zicht={grond === 'transparent' ? 0 : 1} />
      {/* Licht vignet: de randen iets dieper, het midden blijft open */}
      {grond !== 'transparent' && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${merk.petrol}14 100%)` }} />}
      {/* Grain: tileable ruis op overlay, 6 procent, verschuift 1 px per frame (HIGHEND 18) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', backgroundImage: `url(${staticFile('sfeer/ruis.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${Math.round(t / 33) % 256}px ${Math.round(t / 47) % 256}px`, mixBlendMode: 'overlay', opacity: 0.06 }} />
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
  // Camerasnelheid 0-1: niet-actieve schermen vervagen extra tijdens de vlucht.
  snelheid?: number
  // Momenten (ms) waarop een speculaire glint over de rand loopt (landingen).
  glintOp?: number[]
  // Momenten (ms) waarop de lichtrand één keer pulseert (fasesprong).
  pulsOp?: number[]
}

const RADIUS = 28

// Vaste fase per scherm, zodat de ambient drift per venster anders loopt.
const faseVan = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; return (h / 997) * Math.PI * 2 }

// Een venster in de ruimte. x/y = middelpunt in wereldcoördinaten.
// Drie lagen (MOTION.md): het paneel is de hoofdlaag, de slagschaduw de
// secundaire laag (kantel 2-3 f later), gloed en drift zijn ambient.
const laatsteVoor = (lijst: number[] | undefined, t: number) => { let b = -Infinity; for (const m of lijst ?? []) if (m <= t && m > b) b = m; return b }

export const Scherm: React.FC<SchermProps> = ({ id, x, y, t = 0, diepte = 0, kantel = 0, schaduwKantel = kantel, breedte = SCHERM_B, hoogte = SCHERM_H, children, zicht = 1, gloed = 0, extraSchaal = 1, rotatie = 0, snelheid = 0, glintOp, pulsOp }) => {
  const schaal = extraSchaal / (1 + diepte * 0.22)
  const rand = Math.max(0, Math.min(1, gloed))
  // Scherptediepte: scherp tot diepte 0,25, dan kwadratisch naar 9 px bij 1,5
  // (HIGHEND 4). Tijdens een vlucht vervagen niet-actieve schermen extra.
  const dofP = Math.max(0, (diepte - 0.25) / 1.25)
  const blur = dofP * dofP * 9 + Math.min(1, diepte * 2) * snelheid * 4
  const dim = 1 - Math.min(0.10, diepte * 0.07)
  // Draaiende lichtrand: hoek uit t, 360 graden per 8 s (HIGHEND 2).
  const hoek = ((t / 8000) * 360) % 360
  const RAND = `conic-gradient(from ${hoek}deg, ${merk.flame} 0%, ${merk.zand} 30%, ${merk.petrolLight} 60%, ${merk.flame} 100%)`
  // Glint: 220 px witte veeg over de rand, 600 ms, 120 ms na de landing (HIGHEND 3).
  const glintVan = laatsteVoor(glintOp, t) + 120
  const glintP = Number.isFinite(glintVan) ? vlak(t, glintVan, glintVan + 600, ease.camera) : 0
  // Puls: de rand licht één keer op in de hold van een fasesprong (HIGHEND 15).
  const pulsVan = laatsteVoor(pulsOp, t)
  const puls = Number.isFinite(pulsVan) ? Math.sin(vlak(t, pulsVan, pulsVan + 900, ease.inUit) * Math.PI) : 0
  const randOp = Math.min(1, 0.22 + rand * 0.5 + puls * 0.45)
  const fase = faseVan(id)
  // Ambient: gloed ademt 15 procent in 2,6 s; een niet-actief venster drijft 6 px in 3,4 s.
  const adem = 0.85 + 0.15 * Math.sin((t / 2600) * Math.PI * 2 + fase)
  const drift = Math.min(1, diepte) * 6
  const dy = Math.sin((t / 3400) * Math.PI * 2 + fase) * drift
  const dx = Math.cos((t / 4100) * Math.PI * 2 + fase) * drift * 0.5
  return (
    <div data-scherm={id} style={{ position: 'absolute', left: x - breedte / 2, top: y - hoogte / 2, width: breedte, height: hoogte, opacity: zicht, perspective: 2600 }}>
      {gloed > 0 && <div style={{ position: 'absolute', left: '50%', top: '50%', width: breedte * 1.5, height: hoogte * 1.5, transform: `translate(-50%,-50%) scale(${0.96 + 0.04 * adem})`, borderRadius: '50%', background: `radial-gradient(closest-side, ${merk.petrol}30, transparent)`, opacity: gloed * adem, filter: 'blur(30px)' }} />}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: RADIUS,
        transform: `translate(${dx}px, ${dy}px) scale(${schaal}) rotateY(${schaduwKantel}deg) rotate(${rotatie}deg)`, transformOrigin: 'center',
        boxShadow: '0 30px 60px -20px rgba(26,83,92,.22), 0 100px 160px -60px rgba(26,83,92,.32)',
      }} />
      {/* Lichtrand: een dunne gradiëntlijn (flame, zand, petrol) om het paneel,
          met dezelfde gradiënt als zachte gloed erachter. Sterk op het actieve
          scherm, zwak op de rest. */}
      <div style={{
        position: 'absolute', inset: -3, borderRadius: RADIUS + 3, background: RAND,
        transform: `translate(${dx}px, ${dy}px) scale(${schaal}) rotateY(${kantel}deg) rotate(${rotatie}deg)`, transformOrigin: 'center',
        filter: 'blur(14px)', opacity: (0.08 + rand * 0.30 + puls * 0.3) * adem,
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden', backgroundColor: merk.wit,
        transform: `translate(${dx}px, ${dy}px) scale(${schaal}) rotateY(${kantel}deg) rotate(${rotatie}deg)`, transformOrigin: 'center',
        filter: `blur(${blur}px) brightness(${dim})`,
        boxShadow: '0 2px 4px rgba(70,55,40,.04), 0 0 0 1px rgba(255,255,255,.6) inset',
      }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', borderRadius: RADIUS, padding: 1.5, background: RAND, opacity: randOp, WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
        {glintP > 0 && glintP < 1 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', borderRadius: RADIUS, padding: 2, opacity: Math.sin(glintP * Math.PI), background: `linear-gradient(115deg, transparent ${glintP * 140 - 24}%, rgba(255,255,255,0.95) ${glintP * 140 - 8}%, transparent ${glintP * 140 + 6}%)`, WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
        )}
        <div style={{ width: breedte / SCHERM_SCHAAL, height: hoogte / SCHERM_SCHAAL, transform: `scale(${SCHERM_SCHAAL})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
