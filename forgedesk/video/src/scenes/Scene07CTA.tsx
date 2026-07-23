import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { fadeUp, popIn } from "../helpers/entrances";

// Scene 7 - CTA. Logo, propositie, en de afsluiter. Flame-knop voor de
// high-intent actie (begin vandaag). Zie DOEN-VIDEO-FRAMEWORK.md scene 7.
const FRASES = ["30 dagen gratis", "geen contract", "in 10 minuten live"];

export const Scene07CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = popIn(frame, fps, { delay: 0, from: 0.92 });
  const payoff = fadeUp(frame, fps, { delay: 18, distance: 18 });
  const frasesStijl = fadeUp(frame, fps, { delay: 32, distance: 20 });
  const knop = popIn(frame, fps, { delay: 54, from: 0.9 });
  const url = fadeUp(frame, fps, { delay: 70, distance: 14 });

  return (
    <SceneWrapper style={{ flexDirection: "column", gap: 30 }}>
      <Img src={staticFile("logos/doen-logo.svg")} style={{ width: 460, ...logo }} />

      <div style={{ ...payoff, fontFamily: fonts.kop, fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", color: merk.ink }}>
        slim gedaan<FlameDot />
      </div>

      <div
        style={{
          ...frasesStijl,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 34,
          fontWeight: 600,
          color: merk.ink,
        }}
      >
        {FRASES.map((f, i) => (
          <span key={f} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && (
              <span style={{ color: merk.flame, margin: "0 18px", fontWeight: 700 }}>·</span>
            )}
            {f}
            <FlameDot />
          </span>
        ))}
      </div>

      <div
        style={{
          ...knop,
          padding: "18px 40px",
          borderRadius: 14,
          backgroundColor: merk.flame,
          color: "#fff",
          fontSize: 28,
          fontWeight: 600,
          boxShadow: "0 12px 30px -10px rgba(223,92,54,0.45)",
        }}
      >
        begin vandaag
      </div>

      <div
        style={{
          ...url,
          fontFamily: fonts.mono,
          fontSize: 26,
          letterSpacing: "0.04em",
          color: merk.petrol,
        }}
      >
        app.doen.team
      </div>
    </SceneWrapper>
  );
};
