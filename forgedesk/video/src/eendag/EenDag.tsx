import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { FLAME, GRIJS, INK, OFFWHITE, PETROL } from "./palet";
import { SHOTS, VO, type Scherm, type Shot } from "./tijdlijn";
import { SchermBeeld } from "./schermen";

// Schermen die op de telefoon staan; de rest is bureaublad. Sectie 6 van het
// productieboek bepaalt welke waar hoort.
const TELEFOON: Scherm[] = ["lockscreen", "dashboard", "leads", "klantkaart", "offerte", "offertestatus", "werkbon", "push"];

/**
 * Lichte handheld. Twee sinussen met onderling priemachtige perioden, zodat de
 * beweging niet hoorbaar herhaalt binnen een shot. Amplitude bewust klein: het
 * brief vraagt schouder of easyrig, geen gimbal en geen shaky cam.
 */
const Handheld: React.FC<{ children: React.ReactNode; kracht?: number }> = ({ children, kracht = 1 }) => {
  const f = useCurrentFrame();
  const x = (Math.sin(f / 37) * 3 + Math.sin(f / 13) * 1.2) * kracht;
  const y = (Math.cos(f / 43) * 2.4 + Math.cos(f / 17) * 0.9) * kracht;
  const r = Math.sin(f / 59) * 0.12 * kracht;
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }}>{children}</AbsoluteFill>
  );
};

/** Elk shot komt op met een korte dekkingsopbouw; harde cuts zonder flits. */
const Inkomen: React.FC<{ children: React.ReactNode; frames?: number }> = ({ children, frames = 3 }) => {
  const f = useCurrentFrame();
  const d = interpolate(f, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: d }}>{children}</AbsoluteFill>;
};

/**
 * Plaatshouder voor een live-action shot. Bewust geen nagemaakte foto: dit is
 * een animatic, en een slecht nagetekend interieur laat het ritme verkeerd
 * lezen. Hij noemt wat er gedraaid moet worden en wat het shot moet bewijzen,
 * zodat je bij het kijken kunt beoordelen of die bewijslast klopt.
 */
const Plaatshouder: React.FC<{ shot: Shot }> = ({ shot }) => {
  const sec = ((shot.tot - shot.van) / 24).toFixed(1).replace(".", ",");
  return (
    <AbsoluteFill style={{ backgroundColor: PETROL, padding: 110, justifyContent: "center", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 30, color: FLAME }}>{shot.id}</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 26, color: "rgba(248,247,245,0.45)" }}>{sec}s</span>
        <span style={{ fontFamily: fonts.body, fontSize: 24, color: "rgba(248,247,245,0.45)" }}>live-action</span>
      </div>
      <div style={{ fontFamily: fonts.kop, fontSize: 74, lineHeight: 1.06, color: OFFWHITE, letterSpacing: "-0.02em", maxWidth: 1500 }}>
        {shot.beeld}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: 30, color: "rgba(248,247,245,0.6)" }}>
        bewijst: {shot.bewijst}
      </div>
    </AbsoluteFill>
  );
};

/** Shot 11C. Twaalf frames in, houden, twaalf frames uit naar zwart. */
const EndCard: React.FC<{ duur: number }> = ({ duur }) => {
  const f = useCurrentFrame();
  const d = interpolate(f, [0, 12, duur - 12, duur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ backgroundColor: PETROL, opacity: d, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: fonts.kop, fontSize: 190, color: OFFWHITE, letterSpacing: "-0.04em" }}>
          doen<span style={{ color: FLAME }}>.</span>
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SchermShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const telefoon = TELEFOON.includes(shot.scherm as Scherm);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B181C", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: telefoon ? 604 : 1560,
          height: telefoon ? 1006 : 878,
          borderRadius: telefoon ? 42 : 20,
          overflow: "hidden",
          border: `1px solid rgba(248,247,245,0.10)`,
          boxShadow: "0 60px 140px -50px rgba(0,0,0,0.8)",
        }}
      >
        <SchermBeeld scherm={shot.scherm as Scherm} stap={shot.stap} />
      </div>
    </AbsoluteFill>
  );
};

/** Voice-over als ondertitel. Alleen voor de animatic; gaat uit in de eindmontage. */
const Ondertitel: React.FC = () => {
  const f = useCurrentFrame();
  const actief = [...VO].reverse().find((r) => f >= r.frame && f < r.frame + 66);
  if (!actief) return null;
  const d = interpolate(f - actief.frame, [0, 6, 58, 66], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 74, opacity: d }}>
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: 38,
          fontWeight: 500,
          color: OFFWHITE,
          backgroundColor: "rgba(11,24,28,0.72)",
          padding: "14px 30px",
          borderRadius: 12,
          letterSpacing: "-0.01em",
        }}
      >
        {actief.tekst}
      </span>
    </AbsoluteFill>
  );
};

export const EenDag: React.FC<{ ondertitels?: boolean }> = ({ ondertitels = true }) => (
  <AbsoluteFill style={{ backgroundColor: "#000", color: INK }}>
    {SHOTS.map((shot) => (
      <Sequence key={shot.id} from={shot.van} durationInFrames={shot.tot - shot.van} name={`${shot.id} ${shot.soort}`}>
        <Handheld kracht={shot.soort === "eind" ? 0 : 1}>
          <Inkomen>
            {shot.soort === "beeld" ? <Plaatshouder shot={shot} /> : null}
            {shot.soort === "scherm" ? <SchermShot shot={shot} /> : null}
            {shot.soort === "eind" ? <EndCard duur={shot.tot - shot.van} /> : null}
          </Inkomen>
        </Handheld>
      </Sequence>
    ))}
    {ondertitels ? <Ondertitel /> : null}
  </AbsoluteFill>
);
