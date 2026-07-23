import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Achtergrond zoals op de doen.-login: een fijn constellatie-netwerk van puntjes
// verbonden met dunne lijnen (sommige met flame-accent), op off-white met een
// zachte warme gloed. Traag driftend, frame-driven (geen flicker, deterministisch).
const W = 1920;
const H = 1080;
const THRESH = 240;

// Deterministische PRNG zodat de node-posities vast en flicker-vrij zijn.
function maakNodes() {
  let s = 20260602;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: 56 }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    phase: rnd() * Math.PI * 2,
    sp: 0.08 + rnd() * 0.14,
    amp: 10 + rnd() * 22,
    flame: rnd() < 0.12,
  }));
}
const NODES = maakNodes();

export const DoenBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const pts = NODES.map((n) => ({
    x: n.x + Math.sin(t * n.sp + n.phase) * n.amp,
    y: n.y + Math.cos(t * n.sp * 0.82 + n.phase) * n.amp,
    flame: n.flame,
  }));

  const lijnen: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < THRESH) {
        lijnen.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y, o: (1 - d / THRESH) * 0.15 });
      }
    }
  }

  const warm =
    "radial-gradient(42% 52% at 6% -4%, rgba(241,150,120,0.09), transparent 60%)," +
    "radial-gradient(40% 42% at 102% 0%, rgba(204,162,120,0.05), transparent 55%)," +
    "radial-gradient(55% 55% at 50% 116%, rgba(126,181,166,0.045), transparent 60%)";

  return (
    <AbsoluteFill style={{ background: warm, pointerEvents: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {lijnen.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={`rgba(110,120,118,${l.o})`} strokeWidth={1} />
        ))}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.flame ? 3 : 2.3}
            fill={p.flame ? "rgba(223,92,54,0.5)" : "rgba(110,120,118,0.34)"}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
