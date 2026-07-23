import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { merk, modules } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { fadeUp, popIn } from "../helpers/entrances";

// Scene 5 - De monteur. Werkbon op de bouwplaats, op de iPhone. Geporte schil
// uit forgedesk WerkbonMonteurView (uitgevoerd werk, uren, handtekening,
// afronden). Beweging frame-driven.
const T = { fg: merk.ink, card: "#FFFFFF", border: "#EAE7E1", muted: "#F4F2EE", mutedFg: "#8A8278" };

const TAKEN = [
  "Lichtbak gevel gemonteerd",
  "Entree-bak afgehangen",
  "Zuil geplaatst + aangesloten",
];

const TAAK_START = 40;
const HANDTEKENING = 150;
const AFGEROND = 185;

const IcoonCheck: React.FC<{ color?: string }> = ({ color = "#fff" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l4 4 10-10" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WerkbonSchil: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const afgerond = frame >= AFGEROND;
  return (
    <div style={{ padding: "22px 22px", fontFamily: fonts.body }}>
      {/* Kop */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.mutedFg, fontFamily: fonts.mono }}>
        WB-2026-0188
      </div>
      <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 30, color: T.fg, marginTop: 4, lineHeight: 1 }}>
        Werkbon<span style={{ color: merk.flame }}>.</span>
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 7, fontSize: 15 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: modules.klanten.kleur }} />
        <span style={{ fontWeight: 600, color: T.fg }}>Hotel De Linde</span>
        <span style={{ color: T.mutedFg }}> · Apeldoorn</span>
      </div>

      {/* Uitgevoerd werk */}
      <div style={{ marginTop: 22, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.mutedFg }}>
        Uitgevoerd werk
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {TAKEN.map((t, i) => {
          const aan = frame >= TAAK_START + i * 26;
          return (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: aan ? "#E8F2EC" : T.muted,
                border: `1px solid ${aan ? "#C2DFCC" : T.border}`,
                transition: "none",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: aan ? "#3A7D52" : "#D8D5CE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  ...(aan ? popIn(frame, fps, { delay: TAAK_START + i * 26, from: 0.5 }) : {}),
                }}
              >
                {aan && <IcoonCheck />}
              </div>
              <span style={{ fontSize: 17, color: T.fg, fontWeight: 500 }}>{t}</span>
            </div>
          );
        })}
      </div>

      {/* Uren */}
      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, border: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 16, color: T.mutedFg }}>Uren gewerkt</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 600, color: T.fg }}>6,5 u</span>
      </div>

      {/* Handtekening */}
      <div style={{ marginTop: 18, fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.mutedFg }}>
        Handtekening klant
      </div>
      <div
        style={{
          marginTop: 8,
          height: 92,
          borderRadius: 12,
          border: `1px dashed ${T.border}`,
          backgroundColor: T.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: fonts.kop,
            fontSize: 34,
            color: merk.petrol,
            transform: "rotate(-6deg)",
            ...fadeUp(frame, fps, { delay: HANDTEKENING, distance: 8 }),
            opacity: interpolate(frame, [HANDTEKENING, HANDTEKENING + 16], [0, 0.85], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          L. Brouwer
        </span>
      </div>

      {/* Afronden */}
      <div
        style={{
          marginTop: 18,
          padding: "15px 0",
          borderRadius: 12,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 600,
          color: "#fff",
          backgroundColor: afgerond ? "#3A7D52" : merk.flame,
        }}
      >
        {afgerond ? "Afgerond." : "Werkbon afronden"}
      </div>
    </div>
  );
};

export const Scene05Monteur: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tekst = fadeUp(frame, fps, { delay: 6, distance: 26 });
  const telefoon = popIn(frame, fps, { delay: 0, from: 0.94 });

  return (
    <SceneWrapper center={false}>
      {/* Tekst links */}
      <div style={{ position: "absolute", left: 150, top: 0, bottom: 0, width: 720, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ ...tekst }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontFamily: fonts.mono,
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#8A8278",
              marginBottom: 20,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            op de bouwplaats
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 60, lineHeight: 1.05, letterSpacing: "-0.02em", color: merk.ink }}>
            de monteur tekent<br />op locatie af<FlameDot />
          </div>
          <div style={{ marginTop: 24, fontSize: 24, color: "#5A554D", maxWidth: 560, lineHeight: 1.5 }}>
            Werkbon invullen, klant laten tekenen, klaar. Direct in de app, zonder papier.
          </div>
        </div>
      </div>

      {/* iPhone rechts */}
      <div style={{ position: "absolute", right: 220, top: 90, ...telefoon }}>
        <DeviceFrame variant="iphone" width={430}>
          <WerkbonSchil frame={frame} fps={fps} />
        </DeviceFrame>
      </div>
    </SceneWrapper>
  );
};
