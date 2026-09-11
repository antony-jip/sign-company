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

// De 3D-wereld: een lichtreclamebord (petrol behuizing, acrylaat voorkant) met
// het doen.-logo als verlicht paneel, één Flame-punt als lampje, en zes losse
// tool-kaartjes die ervoor zweven. Alles wordt uit t (ms) berekend; niets
// beweegt uit zichzelf (geen useFrame).

// Maten in wereld-eenheden.
export const BORD = { b: 12, h: 4.0, d: 0.9 }
export const VLAK = { b: 11.2, h: 3.3, z: BORD.d / 2 + 0.01 }
export const LOGO = { b: 8.5, z: VLAK.z + 0.012 }
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

// Neon-flikker bij het aangaan: eerst twee korte dips, dan vol.
export const logoLicht = (t: number) => {
  if (t < O.logoOp) return 0
  const d = t - O.logoOp
  if (d < 140) return 0.65
  if (d < 230) return 0.12
  if (d < 380) return 0.85
  if (d < 470) return 0.30
  return lerp(0.55, 1, vlak(t, O.logoOp + 470, O.logoVol, thema.ease.uit))
}

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
  mail: { x: -3.9, y: 1.55, z: 2.8, rot: -0.08, fase: 0.1 },
  excel: { x: 3.8, y: 1.75, z: 3.0, rot: 0.09, fase: 0.5 },
  whatsapp: { x: -0.5, y: 2.35, z: 3.3, rot: 0.03, fase: 0.8 },
  agenda: { x: -4.0, y: -1.7, z: 3.1, rot: 0.06, fase: 0.3 },
  werkbon: { x: 3.9, y: -1.5, z: 2.6, rot: -0.06, fase: 0.7 },
  telefoon: { x: 0.9, y: -2.45, z: 3.2, rot: 0.05, fase: 0.4 },
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
  const behuizing = useMemo(() => new THREE.Color(thema.kleur.petrol), [])
  const acryl = useMemo(() => new THREE.Color(thema.kleur.acrylUit), [])
  const lijst = useMemo(() => new THREE.Color(thema.kleur.petrol).lerp(new THREE.Color(thema.kleur.petrolLicht), 0.18), [])
  const warm = useMemo(() => new THREE.Color(thema.kleur.lichtWarm), [])
  return (
    <group>
      {/* Behuizing */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[BORD.b, BORD.h, BORD.d]} />
        <meshStandardMaterial color={behuizing} roughness={0.55} metalness={0.12} />
      </mesh>
      {/* Lijst: een iets grotere, dunne rand aan de voorkant */}
      <mesh position={[0, 0, BORD.d / 2 - 0.04]}>
        <boxGeometry args={[BORD.b + 0.12, BORD.h + 0.12, 0.08]} />
        <meshStandardMaterial color={lijst} roughness={0.4} metalness={0.25} />
      </mesh>
      {/* Acrylaat voorkant: donker als het bord uit is, warm als het aan is */}
      <mesh position={[0, 0, VLAK.z]}>
        <planeGeometry args={[VLAK.b, VLAK.h]} />
        <meshStandardMaterial color={acryl} emissive={warm} emissiveIntensity={licht * 0.03} roughness={0.9} metalness={0} />
      </mesh>
      {/* Logo-gloed (geblurde kopie, additief) en het logo zelf */}
      <mesh position={[0, 0, LOGO.z - 0.004]}>
        <planeGeometry args={[LOGO.b * 1.08, logoH * 1.08]} />
        <meshBasicMaterial map={tex.logoGloed} transparent opacity={licht * 0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, LOGO.z]}>
        <planeGeometry args={[LOGO.b, logoH]} />
        <meshBasicMaterial map={tex.logo} transparent opacity={licht} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Warm licht uit het bord op de omgeving als het aan staat */}
      <pointLight position={[0, 1.2, 3.0]} color={thema.kleur.lichtWarm} intensity={licht * 5} distance={12} decay={2} />
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
      {/* Nacht: koel strijklicht van boven, warm straatlicht van onderen, weinig ambient */}
      <ambientLight intensity={0.22} color="#9FB8BF" />
      <directionalLight position={[-6, 9, 6]} intensity={1.3} color="#C9DDE3" />
      <directionalLight position={[8, -6, 5]} intensity={0.35} color="#F2D6B0" />
      <pointLight position={[0, 0, 3]} color="#FFFFFF" intensity={inslagFlits * 22} distance={12} decay={2} />
      <Bord t={t} tex={tex} />
      <Kaartjes t={t} tex={tex} />
      <Punt t={t} tex={tex} />
      <Ring t={t} op={O.inslagOp} x={0} y={0} z={1.2} maxR={6.5} duurMs={750} />
      <Ring t={t} op={O.puntLandt} x={PUNT_THUIS.x} y={PUNT_THUIS.y} z={PUNT_THUIS.z + 0.05} maxR={1.6} duurMs={550} />
    </ThreeCanvas>
  )
}
