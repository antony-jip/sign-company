import { interpolate } from "remotion";
import { SITE } from "./LoopKader";

// Muiscursor voor de module-loops: donkere pijl met witte rand, plus een
// klik-ring die vanuit de punt uitdijt. De positie (x, y) is de punt van
// de pijl, in canvas-coordinaten. `klik` is de voortgang van de klik-puls
// (0..1); buiten dat bereik is de ring onzichtbaar.
export const LoopCursor: React.FC<{
  x: number;
  y: number;
  opacity?: number;
  klik?: number;
}> = ({ x, y, opacity = 1, klik = 0 }) => {
  const ringActief = klik > 0 && klik < 1;
  const ringR = interpolate(klik, [0, 1], [8, 36]);
  const ringOp = interpolate(klik, [0, 0.15, 1], [0, 0.6, 0]);
  const duw = ringActief
    ? interpolate(klik, [0, 0.2, 0.5], [1, 0.86, 1], { extrapolateRight: "clamp" })
    : 1;
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none" }}>
      {ringActief && (
        <div
          style={{
            position: "absolute",
            left: -ringR,
            top: -ringR,
            width: ringR * 2,
            height: ringR * 2,
            borderRadius: "50%",
            border: `3px solid ${SITE.flame}`,
            opacity: ringOp,
          }}
        />
      )}
      <svg
        width={30}
        height={34}
        viewBox="0 0 24 28"
        style={{
          position: "absolute",
          left: -3,
          top: -2,
          transform: `scale(${duw})`,
          transformOrigin: "4px 3px",
          filter: "drop-shadow(0 2px 5px rgba(13,52,60,0.35))",
        }}
      >
        <path
          d="M4 2 L4 22 L9.1 17.3 L12.3 24.5 L15.8 22.9 L12.8 15.9 L19.5 15.4 Z"
          fill="#1E2A2E"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
