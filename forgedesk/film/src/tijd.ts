import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const FPS = 30
export const msNaarFrames = (ms: number) => Math.round((ms / 1000) * FPS)

export type SceneProps = { play: boolean; durationMs: number }

// Tijd in ms sinds de start van de scene, uit het frame. play=false bevriest de
// scene op haar eerste frame, zodat je een scene los kunt zetten en timen.
export function useSceneTijd(play: boolean): number {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return play ? (frame / fps) * 1000 : 0
}

// Easings uit de app (index.css --ease-out, --ease-spring, --ease-smooth).
export const ease = {
  uit: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.5, 0, 0.75, 0),
  inUit: Easing.bezier(0.5, 0, 0.2, 1),
  veer: Easing.bezier(0.34, 1.56, 0.64, 1),
  glad: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  // MOTION.md: entree, kleine UI-feedback, verplaatsing, verdwijnen, camera.
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  uiUit: Easing.bezier(0.23, 1, 0.32, 1),
  move: Easing.bezier(0.65, 0, 0.35, 1),
  exit: Easing.bezier(0.7, 0, 0.84, 0),
  camera: Easing.bezier(0.22, 0.61, 0.36, 1),
} as const

// Woord-reveal (MOTION.md): 10 f per woord, 60 procent overlap, dus elk volgend
// woord start 4 f later. Opacity 0..1, translateY 12..0 px, blur 4..0 px.
export const WOORD_MS = 333
export const WOORD_STAP_MS = 133
export const woordStijl = (p: number, y = 12, blur = 4): React.CSSProperties => ({
  opacity: p, transform: `translateY(${(1 - p) * y}px)`, filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
})

// Voortgang 0..1 van t binnen [van, tot], geklemd, met easing.
export const vlak = (t: number, van: number, tot: number, e: (x: number) => number = ease.uit) =>
  interpolate(t, [van, tot], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e })

// In + uit in één: 0 voor `van`, 1 tussen, terug naar 0 na `tot`.
export const venster = (t: number, van: number, tot: number, fade = 250) =>
  Math.min(vlak(t, van, van + fade), 1 - vlak(t, tot - fade, tot, ease.in))

export const na = (t: number, ms: number) => t >= ms

// Veer op ms-basis (voor pops en landingen).
export function veer(t: number, vanMs: number, opties?: { demping?: number; duurMs?: number }) {
  const { demping = 14, duurMs = 600 } = opties ?? {}
  const frame = Math.max(0, ((t - vanMs) / 1000) * FPS)
  return spring({ frame, fps: FPS, durationInFrames: msNaarFrames(duurMs), config: { damping: demping, stiffness: 160, mass: 0.9 } })
}

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// Camera-pan over stappen: [[ms, waarde], ...]. Tussen twee stappen wordt
// in 400 ms geëased, daarvoor en daarna blijft de waarde staan.
export const pan = (t: number, stappen: [number, number][], duurMs = 400) => {
  let w = stappen[0][1]
  for (let i = 1; i < stappen.length; i++) {
    const [ms, naar] = stappen[i]
    w = lerp(w, naar, vlak(t, ms, ms + duurMs, ease.inUit))
  }
  return w
}
