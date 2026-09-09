import { interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { FLAME, flameA, GRIJS, INK } from "./palet";

// De drie overlays uit sectie 7 van het productieboek. Ze zitten hier bij
// elkaar omdat ze samen de UI-behandeling van de hele film zijn: wat hier
// verandert, verandert in alle 27 schermshots tegelijk.

/**
 * Cursor-pulse bij elke tik. Groeit van 0 naar 44 px over 8 frames terwijl de
 * dekking van 40 procent naar 0 gaat. Nooit twee tegelijk in beeld.
 */
export const CursorPulse: React.FC<{ start: number; x: number; y: number }> = ({ start, x, y }) => {
  const f = useCurrentFrame() - start;
  if (f < 0 || f > 8) return null;
  const maat = interpolate(f, [0, 8], [0, 44]);
  const dekking = interpolate(f, [0, 8], [0.4, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - maat / 2,
        top: y - maat / 2,
        width: maat,
        height: maat,
        borderRadius: "50%",
        backgroundColor: FLAME,
        opacity: dekking,
      }}
    />
  );
};

/**
 * Cijfers die optellen, in DM Mono met vaste cijferbreedte zodat het getal niet
 * danst tijdens het tellen. Begint bewust niet op nul bij grote bedragen: dan
 * leest het als een teller in plaats van als een bedrag dat klopt.
 */
export const TelOp: React.FC<{
  start: number;
  naar: number;
  duur?: number;
  vanaf?: number;
  prefix?: string;
  decimalen?: number;
  achtervoegsel?: string;
  style?: React.CSSProperties;
}> = ({ start, naar, duur = 12, vanaf, prefix = "", decimalen = 0, achtervoegsel = "", style }) => {
  const f = useCurrentFrame() - start;
  const begin = vanaf ?? (naar > 1000 ? naar * 0.6 : 0);
  const waarde = interpolate(f, [0, duur], [begin, naar], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const tekst = waarde.toLocaleString("nl-NL", {
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  });
  return (
    <span style={{ fontFamily: fonts.mono, fontVariantNumeric: "tabular-nums", color: INK, ...style }}>
      {prefix}
      {tekst}
      {achtervoegsel}
    </span>
  );
};

/**
 * Status-badge die van grijs naar Flame flipt. Hij draait en schuift niet, hij
 * wisselt van kleur over 4 frames en krijgt daarna een pulse. De Flame-punt
 * achter het woord landt 2 frames na het woord zelf, zodat het oog eerst het
 * woord leest en dan pas de punt ziet.
 */
export const StatusBadge: React.FC<{
  woord: string;
  flipOp?: number;
  actief?: boolean;
  style?: React.CSSProperties;
}> = ({ woord, flipOp, actief = false, style }) => {
  const frame = useCurrentFrame();
  const f = flipOp === undefined ? (actief ? 999 : -999) : frame - flipOp;
  const om = f >= 0;

  const kleur = om ? FLAME : GRIJS;
  const achter = om ? flameA(0.1) : "rgba(138,143,144,0.12)";
  const rand = om ? flameA(0.3) : "rgba(138,143,144,0.28)";

  const schaal = interpolate(f, [0, 5, 10], [1, 1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 14px",
        borderRadius: 999,
        backgroundColor: achter,
        border: `1px solid ${rand}`,
        color: kleur,
        fontFamily: fonts.body,
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "-0.01em",
        transform: `scale(${schaal})`,
        transformOrigin: "left center",
        ...style,
      }}
    >
      {woord}
      {om && f >= 2 ? <span style={{ color: FLAME }}>.</span> : null}
    </span>
  );
};
