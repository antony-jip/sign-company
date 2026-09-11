import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { ThreeCanvas } from '@remotion/three'
import { Easing } from 'remotion'
import * as THREE from 'three'
import { LOGO_PUNT, LOGO_VIEWBOX } from '../kern/LogoDoen'
import { lerp, veer, vlak } from '../tijd'
import { O } from './beats4'
import { KAART_PX, TOOL_KAARTEN, type Texturen } from './texturen'
import { thema } from './thema'

// De 3D-wereld: het doen.-logo als verlicht object in de ruimte (geen paneel eromheen), één Flame-punt als lampje, en zes losse
// tool-kaartjes die ervoor zweven. Alles wordt uit t (ms) berekend; niets
// beweegt uit zichzelf (geen useFrame).

// Maten in wereld-eenheden. Het bord is één zwevend paneel met ronde hoeken
// en een dunne dikte; de voorkant staat op z = 0.
export const BORD = { b: 10.4, h: 3.5, d: 0.16, hoek: 0.34 }
export const VLAK = { b: 10.4, h: 3.5, z: 0.006 }
export const LOGO = { b: 8.8, z: VLAK.z + 0.012 }

const rondeVorm = (b: number, h: number, r: number) => {
  const v = new THREE.Shape()
  const x = -b / 2, y = -h / 2
  v.moveTo(x + r, y)
  v.lineTo(x + b - r, y); v.absarc(x + b - r, y + r, r, -Math.PI / 2, 0, false)
  v.lineTo(x + b, y + h - r); v.absarc(x + b - r, y + h - r, r, 0, Math.PI / 2, false)
  v.lineTo(x + r, y + h); v.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  v.lineTo(x, y + r); v.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return v
}
const logoH = LOGO.b * (LOGO_VIEWBOX.h / LOGO_VIEWBOX.b)
// Wereldpositie van de punt in het logo (logo gecentreerd op 0,0).
export const PUNT_THUIS = {
  x: -LOGO.b / 2 + ((LOGO_PUNT.x - LOGO_VIEWBOX.x) / LOGO_VIEWBOX.b) * LOGO.b,
  y: logoH / 2 - ((LOGO_PUNT.y - LOGO_VIEWBOX.y) / LOGO_VIEWBOX.h) * logoH,
  z: LOGO.z + thema.punt.straal * 0.55,
}
// Waar de punt de kaartjes verzamelt: midden vóór het bord.
const PUNT_MIDDEN = { x: 0, y: 0, z: 1.3 }

// Camera: recht voor het bord. Stap 1: stil, met vanaf pushOp een lichte push
// als prelude op de duik (stap 2).
export const cameraStand = (t: number) => {
  const push = vlak(t, O.pushOp, O.eind, thema.ease.inUit)
  return { x: 0, y: 0.15, z: lerp(11.6, 10.9, push), fov: thema.camera.fov }
}

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree()
  const s = cameraStand(t)
  camera.position.set(s.x, s.y, s.z)
  camera.lookAt(0, 0, 0)
  if (camera instanceof THREE.PerspectiveCamera && camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix() }
  return null
}

// Logo komt strak op: geen lichtbak, geen flikker, gewoon 450 ms ease-out.
export const logoLicht = (t: number) => vlak(t, O.logoOp, O.logoOp + 450, thema.ease.uit)

// Stand van de punt: positie, schaal, gloed.
export const puntStand = (t: number) => {
  const op = veer(t, O.puntOp, { demping: 12, duurMs: 700 })
  const inslag = vlak(t, O.inslagOp, O.inslagOp + 320, thema.ease.uit)
  const val = vlak(t, O.puntValt, O.puntLandt, thema.ease.inUit)
  const landing = veer(t, O.puntLandt, { demping: 10, duurMs: 600 })
  const x = lerp(PUNT_MIDDEN.x, PUNT_THUIS.x, val)
  const y = lerp(PUNT_MIDDEN.y, PUNT_THUIS.y, val) + Math.sin(val * Math.PI) * 0.7
  const z = lerp(PUNT_MIDDEN.z, PUNT_THUIS.z, val) + Math.sin(val * Math.PI) * 0.5
  // Ademen zolang hij in het midden hangt.
  const adem = t >= O.puntOp && t < O.puntValt ? 1 + Math.sin((t / 700) * Math.PI * 2) * 0.04 : 1
  const spike = t >= O.inslagOp ? 1 + Math.sin(inslag * Math.PI) * 0.5 : 1
  const land = t >= O.puntLandt ? 1 + (1 - landing) * 0.25 : 1
  const schaal = (t < O.puntOp ? 0 : op) * adem * spike * land
  const gloed = t < O.puntOp ? 0 : 0.55 * op + Math.sin(inslag * Math.PI) * 0.6 + (t >= O.puntLandt ? 0.25 * (1 - landing) : 0)
  return { x, y, z, schaal, gloed }
}

// Kaartje-posities (wereld), rust en fase voor het zweven.
const KAART_PLEK: Record<string, { x: number; y: number; z: number; rot: number; fase: number }> = {
  mail: { x: -3.7, y: 1.5, z: 2.8, rot: -0.08, fase: 0.1 },
  excel: { x: 3.6, y: 1.7, z: 3.0, rot: 0.09, fase: 0.5 },
  whatsapp: { x: -0.4, y: 2.3, z: 3.3, rot: 0.03, fase: 0.8 },
  agenda: { x: -3.8, y: -1.6, z: 3.1, rot: 0.06, fase: 0.3 },
  werkbon: { x: 3.7, y: -1.4, z: 2.6, rot: -0.06, fase: 0.7 },
  telefoon: { x: 0.8, y: -2.3, z: 3.2, rot: 0.05, fase: 0.4 },
}
const KAART_B = 2.2, KAART_H = KAART_B * (KAART_PX.h / KAART_PX.b)

const Kaartjes: React.FC<{ t: number; tex: Texturen }> = ({ t, tex }) => {
  if (t >= O.inslagOp) return null
  return (
    <>
      {TOOL_KAARTEN.map((k, i) => {
        const p = KAART_PLEK[k.id]
        const popP = vlak(t, O.kaartjesOp + i * 90, O.kaartjesOp + i * 90 + 500, thema.ease.enter)
        // Ambient zweven: 2,4 tot 3,3 s per cyclus, nooit stil.
        const zweefY = Math.sin((t / 1000) * 2.1 + p.fase * Math.PI * 2) * 0.09
        const zweefX = Math.cos((t / 1000) * 1.6 + p.fase * 5) * 0.05
        const zweefRot = Math.sin((t / 1000) * 1.9 + p.fase * 7) * 0.025
        // Trek naar de punt: gestaggerd, versnellend.
        const trekStart = O.trekVan + p.fase * 700
        const trek = vlak(t, trekStart, O.inslagOp, Easing.in(Easing.cubic))
        const x = lerp(p.x + zweefX, PUNT_MIDDEN.x, trek)
        const y = lerp(p.y + zweefY + (1 - popP) * 0.2, PUNT_MIDDEN.y, trek)
        const z = lerp(p.z, PUNT_MIDDEN.z, trek)
        const rot = lerp(p.rot + zweefRot, p.rot * 6, trek)
        const schaal = lerp(1, 0.12, trek) * (0.96 + popP * 0.04)
        return (
          <mesh key={k.id} position={[x, y, z]} rotation={[0, 0, rot]} scale={[schaal, schaal, 1]}>
            <planeGeometry args={[KAART_B, KAART_H]} />
            <meshBasicMaterial map={tex.kaarten[k.id]} transparent opacity={popP} toneMapped={false} />
          </mesh>
        )
      })}
    </>
  )
}

const Bord: React.FC<{ t: number; tex: Texturen }> = ({ t, tex }) => {
  const licht = logoLicht(t)
  return (
    <group>
      {/* Het logo: plat, zonder gloed of schaduw (het 3D-werk zit straks op de schermen) */}
      <mesh position={[0, 0, LOGO.z]} scale={[0.97 + licht * 0.03, 0.97 + licht * 0.03, 1]}>
        <planeGeometry args={[LOGO.b, logoH]} />
        <meshBasicMaterial map={tex.logo} transparent opacity={licht} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

const Punt: React.FC<{ t: number; tex: Texturen }> = ({ t, tex }) => {
  const s = puntStand(t)
  const flame = useMemo(() => new THREE.Color(thema.kleur.flame), [])
  if (s.schaal <= 0) return null
  const r = thema.punt.straal
  return (
    <group position={[s.x, s.y, s.z]}>
      <mesh scale={[s.schaal, s.schaal, s.schaal]}>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial color={flame} emissive={flame} emissiveIntensity={1.6} roughness={0.35} toneMapped={false} />
      </mesh>
      {/* Gloed: sprite met radiale textuur, altijd naar de camera */}
      <sprite scale={[r * 9 * s.schaal, r * 9 * s.schaal, 1]}>
        <spriteMaterial map={tex.gloed} transparent opacity={Math.min(1, s.gloed)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight color={flame} intensity={1.5 + s.gloed * 7} distance={7} decay={2} />
    </group>
  )
}

// Ring bij de inslag en bij de landing: vlakke ring die uitdijt en vervaagt.
const Ring: React.FC<{ t: number; op: number; x: number; y: number; z: number; maxR: number; duurMs: number }> = ({ t, op, x, y, z, maxR, duurMs }) => {
  const flame = useMemo(() => new THREE.Color(thema.kleur.flame), [])
  const p = vlak(t, op, op + duurMs, thema.ease.uit)
  if (p <= 0 || p >= 1) return null
  const r = lerp(0.3, maxR, p)
  return (
    <mesh position={[x, y, z]}>
      <ringGeometry args={[r * 0.9, r, 96]} />
      <meshBasicMaterial color={flame} transparent opacity={(1 - p) * 0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

export const Wereld3D: React.FC<{ t: number; tex: Texturen; width: number; height: number }> = ({ t, tex, width, height }) => {
  const inslagFlits = t >= O.inslagOp ? Math.sin(vlak(t, O.inslagOp, O.inslagOp + 260) * Math.PI) : 0
  return (
    <ThreeCanvas width={width} height={height} dpr={1} gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }} camera={{ fov: thema.camera.fov, near: 0.1, far: 100, position: [0, 0.15, 11.6] }}>
      <CameraRig t={t} />
      {/* Lichte studio: zacht hemellicht, hoofdlicht van linksboven, warm invullicht */}
      <hemisphereLight intensity={1.35} color="#FFFFFF" groundColor="#ECEDEA" />
      <directionalLight position={[-6, 9, 8]} intensity={1.6} color="#FFFFFF" />
      <directionalLight position={[8, -4, 6]} intensity={0.5} color="#F7E3C8" />
      <pointLight position={[0, 0, 3]} color="#FFFFFF" intensity={inslagFlits * 22} distance={12} decay={2} />
      <Bord t={t} tex={tex} />
      <Kaartjes t={t} tex={tex} />
      <Punt t={t} tex={tex} />
      <Ring t={t} op={O.inslagOp} x={0} y={0} z={1.2} maxR={6.5} duurMs={750} />
      <Ring t={t} op={O.puntLandt} x={PUNT_THUIS.x} y={PUNT_THUIS.y} z={PUNT_THUIS.z + 0.05} maxR={1.6} duurMs={550} />
    </ThreeCanvas>
  )
}
