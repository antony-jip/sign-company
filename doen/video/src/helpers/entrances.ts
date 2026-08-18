import { interpolate, spring } from "remotion";
import type { CSSProperties } from "react";

// Gedeelde entrance-helpers. Beweging komt van Remotion (frame-driven), niet
// van CSS-animaties in de geporte componenten. Elke helper neemt het huidige
// frame + fps en geeft een CSSProperties-object terug.

type Basis = {
  delay?: number; // frames te wachten voor de entrance start
};

// Fade + slide-up. Zacht, geen overshoot (damping hoog). Voor tekst, kaarten,
// regels die rustig moeten inkomen.
export const fadeUp = (
  frame: number,
  fps: number,
  { delay = 0, distance = 40, durationInFrames = 22 }: Basis & {
    distance?: number;
    durationInFrames?: number;
  } = {},
): CSSProperties => {
  const progress = spring({
    frame: frame - delay,
    fps,
    durationInFrames,
    config: { damping: 200 },
  });
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
};

// Spring scale-in met lichte overshoot (pop). Voor accenten: badges, het logo,
// een binnenkomend paneel dat aandacht mag trekken.
export const popIn = (
  frame: number,
  fps: number,
  { delay = 0, from = 0.9 }: Basis & { from?: number } = {},
): CSSProperties => {
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 140 },
  });
  return {
    opacity: interpolate(s, [0, 0.6], [0, 1], { extrapolateRight: "clamp" }),
    transform: `scale(${interpolate(s, [0, 1], [from, 1])})`,
  };
};

// Simpele fade zonder beweging. Voor achtergronden, overlays, cross-fades.
export const fadeIn = (
  frame: number,
  fps: number,
  { delay = 0, durationInFrames = 15 }: Basis & { durationInFrames?: number } = {},
): CSSProperties => ({
  opacity: interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }),
});

// Stagger-delay: geeft het delay-frame voor item `index` in een lijst. Combineer
// met fadeUp/popIn voor geORkestreerde binnenkomst van meerdere elementen.
export const stagger = (index: number, step = 4, offset = 0): number =>
  offset + index * step;
