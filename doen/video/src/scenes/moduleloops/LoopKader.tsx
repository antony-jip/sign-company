import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { fonts } from "../../fonts";

// Kader voor de module-loops op de marketing-site. Schoon: egale koele
// achtergrond (iets dieper dan site-bg #F4F7F7 zodat het witte app-frame
// afsteekt) plus een nauwelijks zichtbare koele radial. Geen DoenBackground,
// geen constellatie, geen mono-uppercase eyebrows.
export const SITE = {
  bg: "#EDF2F2",
  ink: "#16262B",
  muted: "#54666A",
  petrol: "#1A535C",
  flame: "#F15025",
} as const;

export const LoopAchtergrond: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: SITE.bg,
      backgroundImage:
        "radial-gradient(900px 620px at 50% 40%, rgba(26,83,92,0.05), rgba(26,83,92,0) 70%)",
      fontFamily: fonts.body,
      color: SITE.ink,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Caption-chip: witte kaart met alleen de titel (Bricolage 800 + flame-punt)
// en optioneel een subregel. Positionering bepaalt de scene zelf.
export const LoopChip: React.FC<{ titel: string; sub?: string; style?: CSSProperties }> = ({
  titel,
  sub,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      backgroundColor: "#FFFFFF",
      border: "1px solid rgba(26,83,92,0.10)",
      borderRadius: 14,
      padding: "18px 28px",
      boxShadow: "0 20px 44px -20px rgba(13,52,60,0.22), 0 4px 14px -6px rgba(13,52,60,0.10)",
      ...style,
    }}
  >
    <div
      style={{
        fontFamily: fonts.kop,
        fontWeight: 800,
        fontSize: 31,
        letterSpacing: "-0.01em",
        color: SITE.ink,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {titel}
      <span style={{ color: SITE.flame }}>.</span>
    </div>
    {sub && (
      <div style={{ marginTop: 6, fontSize: 15, color: SITE.muted, lineHeight: 1.4, whiteSpace: "nowrap" }}>
        {sub}
      </div>
    )}
  </div>
);
