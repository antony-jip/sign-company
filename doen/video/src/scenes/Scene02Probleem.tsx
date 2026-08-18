import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { DashboardScreen } from "./screens/DashboardScreen";

// Mockup: dashboard op ontwerp-breedte 1790, geschaald naar de venster-breedte.
const VENSTER_W = 1240;
const SCREEN_SCALE = VENSTER_W / 1790; // ~0.693
const VENSTER_H = 720; // hoog genoeg om de Gedaan-kaart volledig te tonen
const TITEL_H = 52; // browser-titelbalk in DeviceFrame
// Stage = de hele browser-frame, van nature gecentreerd op het 1920x1080-canvas.
const STAGE_H = TITEL_H + VENSTER_H;
const STAGE_LEFT = (1920 - VENSTER_W) / 2; // 340
const STAGE_TOP = (1080 - STAGE_H) / 2; // 154

// Scene 2 - Het probleem, resonerend met een signmaker: herkenbare losse eindjes
// (offerte in Word, opmeting op de telefoon, WhatsApp van de klant...) als rijke,
// gedifferentieerde kaarten die soepel samenvloeien tot een enkel doen.-venster.
const SHADOW =
  "0 2px 4px rgba(70,55,40,0.04), 0 10px 24px -8px rgba(120,90,50,0.14), 0 34px 64px -24px rgba(120,90,50,0.20)";

const CONV_START = 116;
const CONV_DUUR = 38;
// Camera-fases over de stage. Een enkel scale+focus-model: het venster popt,
// houdt vast (volledig dashboard), zoomt full-bleed in, en duwt daarna door naar
// de Activiteit/Gedaan-kaarten in de zijbalk (de "houd bij wat iedereen doet"-beat).
const WINDOW_IN = 120;
const HOLD_A = 200; // einde eerste hold (volledig dashboard, klein gecentreerd)
const FULL_END = 262; // dashboard vult het scherm
const FULL_HOLD = 300; // einde fullscreen-hold
const SPOT_END = 348; // camera bij de zijbalk-kaarten
// Focuspunten in stage-lokale px (0,0 = linksboven van de browser-frame).
const FOCUS_BOX = 386; // verticaal midden van de hele frame (TITEL_H + VENSTER_H)/2
const FOCUS_CONTENT = TITEL_H + VENSTER_H / 2; // 412, midden van de schermzone
const FOCUS_SB_X = 1090; // ~midden zijbalk (design x≈1568 × SCREEN_SCALE)
const FOCUS_SB_Y = 520; // ~midden van Activiteit+Gedaan
const EASE = Easing.bezier(0.5, 0, 0.2, 1);

const ICONS: Record<string, string> = {
  doc: "M7 3h7l4 4v14H7V3zM14 3v4h4M9 12h6M9 16h4",
  sheet: "M3 4h18v16H3V4zM3 9h18M9 9v11M15 9v11",
  phone: "M7 2h10v20H7V2zM10 5h4M11 18h2",
  chat: "M4 5h16v11H9l-4 4v-4H4V5z",
  paper: "M6 3h9l4 4v14H6V3zM8 9h8M8 13h8M8 17l2 2 3-3",
  image: "M4 5h16v14H4V5zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 16l5-5 4 4 3-3 4 4",
  list: "M5 7h.01M5 12h.01M5 17h.01M9 7h10M9 12h10M9 17h7",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 20a5 5 0 0 1 10 0M16 11a3 3 0 1 0 0-6M20 20a5 5 0 0 0-5-5",
  mail: "M3 6h18v12H3V6zM4 7l8 6 8-6",
  calc: "M6 3h12v18H6V3zM9 7h6M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01",
  monitor: "M3 4h18v12H3V4zM8 20h8M12 16v4M6 8h7M6 11h4",
  euro: "M16 7a5 5 0 1 0 0 10M6 10h8M6 14h8",
  warn: "M12 4l9 16H3L12 4zM12 10v4M12 17h.01",
};
const Ico: React.FC<{ d: string; c: string; size?: number }> = ({ d, c, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d={d} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Variant = "card" | "note" | "chat";
type Kaart = { label: string; sub?: string; icon: string; tint: string; variant: Variant; x: number; y: number; rot: number; seed: number };
// Gebalanceerde 2-koloms lay-out (5 links, 5 rechts) rond de man: scherpe
// signmaker-pijnpunten van de losse, dure, gedateerde manier van werken.
const KAARTEN: Kaart[] = [
  // Links
  { label: "Offerte in Word", sub: "v3_final_DEF.docx", icon: "doc", tint: "#3A5A9A", variant: "card", x: 405, y: 250, rot: -2.5, seed: 0 },
  { label: "Calculatie apart", sub: "geen overzicht", icon: "calc", tint: merk.petrol, variant: "card", x: 405, y: 432, rot: 2.5, seed: 2 },
  { label: "Geen klantportaal", sub: "drukproeven via mail", icon: "image", tint: "#8A6A3A", variant: "card", x: 405, y: 614, rot: -2.5, seed: 4 },
  { label: "Email apart", sub: "niet geïntegreerd", icon: "mail", tint: "#6A5A8A", variant: "card", x: 405, y: 796, rot: 2.5, seed: 6 },
  { label: "Werkbon op papier", sub: "ergens in de bus", icon: "paper", tint: "#9A5A48", variant: "card", x: 405, y: 978, rot: -2.5, seed: 8 },
  // Rechts
  { label: "Aanvragen overal", sub: "mail · WhatsApp · telefoon", icon: "chat", tint: "#1FA855", variant: "chat", x: 1515, y: 250, rot: 3, seed: 1 },
  { label: "Software uit 2015", sub: "traag en gedateerd", icon: "monitor", tint: "#6E6A62", variant: "card", x: 1515, y: 432, rot: -2.5, seed: 3 },
  { label: "Dure software", sub: "hoge maandlasten", icon: "euro", tint: "#B0512A", variant: "card", x: 1515, y: 614, rot: 2.5, seed: 5 },
  { label: "Matige kwaliteit", sub: "bugs & trage support", icon: "warn", tint: "#B8883A", variant: "card", x: 1515, y: 796, rot: -2.5, seed: 7 },
  { label: "Facturen in Excel", sub: "boekhouding_2026.xlsx", icon: "sheet", tint: "#2D7D52", variant: "card", x: 1515, y: 978, rot: 2.5, seed: 9 },
];

const KaartInhoud: React.FC<{ k: Kaart }> = ({ k }) => {
  if (k.variant === "note") {
    return (
      <div style={{ position: "relative", width: 260, padding: "20px 22px", borderRadius: 6, backgroundColor: "#FBF1C0", boxShadow: "0 2px 4px rgba(70,55,40,0.05), 0 16px 34px -12px rgba(150,120,40,0.30)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 26px 26px 0", borderColor: `transparent #F1E29A transparent transparent` }} />
        <Ico d={ICONS[k.icon]} c="#9A7A2A" size={22} />
        <div style={{ marginTop: 12, fontSize: 21, fontWeight: 600, color: "#6A551E", lineHeight: 1.25 }}>{k.label}</div>
      </div>
    );
  }
  const chat = k.variant === "chat";
  return (
    <div
      style={{
        position: "relative",
        width: 320,
        padding: "18px 20px",
        borderRadius: 18,
        backgroundColor: chat ? "#ECF8F0" : "#FFFFFE",
        border: `1px solid ${chat ? "#BFE6CC" : "rgba(120,90,50,0.09)"}`,
        boxShadow: SHADOW,
        display: "flex",
        alignItems: "center",
        gap: 15,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent 40%)", pointerEvents: "none" }} />
      {chat && <div style={{ position: "absolute", left: -7, bottom: 16, width: 16, height: 16, backgroundColor: "#ECF8F0", borderLeft: "1px solid #BFE6CC", borderBottom: "1px solid #BFE6CC", transform: "rotate(45deg)" }} />}
      <div style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: `${k.tint}16`, border: `1px solid ${k.tint}26`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ico d={ICONS[k.icon]} c={k.tint} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: merk.ink, lineHeight: 1.2 }}>{k.label}</div>
        {k.sub && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "#8A8278", marginTop: 4 }}>
            {chat && <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: k.tint }} />}
            <span style={{ fontFamily: k.sub.includes(".") ? fonts.mono : fonts.body }}>{k.sub}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Line-art figuur in het midden: een signmaker die de draad kwijt is. Hoofd in
// handen, gefronste blik. Verschijnt na de kaarten, zakt iets onderuit op
// "ken je dat gevoel?", en lost op zodra alles samenvloeit in het venster.
const VerdwaaldeMan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inAnim = spring({ frame: frame - 26, fps, config: { damping: 18, mass: 0.8 } });
  const uit = interpolate(frame, [104, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const opacity = interpolate(inAnim, [0, 1], [0, 0.82]) * uit;
  const scale = interpolate(inAnim, [0, 1], [0.82, 1]);
  const sway = Math.sin(frame / 26) * 2;
  const tilt = Math.sin(frame / 33) * 1.5;
  const slump = interpolate(frame, [64, 88], [0, 7], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const c = merk.ink;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", opacity, transform: `translate(-50%, calc(-50% + ${slump + sway}px)) rotate(${tilt}deg) scale(${scale})`, willChange: "transform, opacity" }}>
      <svg width={230} height={250} viewBox="0 0 220 240" fill="none" stroke={c} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        {/* torso / hangende schouders */}
        <path d="M52 226 C 60 170, 84 148, 110 148 C 136 148, 160 170, 168 226" />
        {/* armen omhoog, handen tegen het hoofd */}
        <path d="M76 188 C 60 158, 66 120, 86 104" />
        <path d="M144 188 C 160 158, 154 120, 134 104" />
        <path d="M82 100 q 8 -2 12 5" />
        <path d="M138 100 q -8 -2 -12 5" />
        {/* nek */}
        <path d="M99 124 L99 140" />
        <path d="M121 124 L121 140" />
        {/* hoofd */}
        <circle cx="110" cy="86" r="38" />
        {/* gefronste wenkbrauwen */}
        <path d="M88 74 L102 80" />
        <path d="M132 74 L118 80" />
        {/* ogen */}
        <circle cx="96" cy="91" r="3.4" fill={c} stroke="none" />
        <circle cx="124" cy="91" r="3.4" fill={c} stroke="none" />
        {/* zorgelijke mond */}
        <path d="M94 110 Q110 100 126 110" />
      </svg>
    </div>
  );
};

export const Scene02Probleem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Kop in drie beats: herkenning -> empathie -> belofte. Elke beat fade-t in
  // over ~13 frames, houdt vast, en vertrekt iets naar boven bij de volgende.
  const kopBeat = (inF: number, uitF: number): CSSProperties => ({
    opacity: interpolate(frame, [inF, inF + 13, uitF, uitF + 13], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
    transform: `translateY(${interpolate(frame, [inF, inF + 13, uitF, uitF + 13], [12, 0, 0, -12], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px)`,
  });
  const KOPPEN = [
    { node: <>allemaal losse eindjes<FlameDot /></>, in: 8, uit: 60 },
    { node: <>ken je dat gevoel?</>, in: 66, uit: 110 },
    { node: <>nu alles op één plek<FlameDot /></>, in: 116, uit: 9999 },
  ];

  // Camera: scale + focuspunt (stage-lokaal) dat naar het doel-schermpunt landt.
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE } as const;
  const camS = interpolate(frame, [WINDOW_IN, 145, HOLD_A, FULL_END, FULL_HOLD, SPOT_END], [0.86, 0.92, 0.92, 1.6, 1.6, 2.0], clamp);
  const camFx = interpolate(frame, [HOLD_A, FULL_END, FULL_HOLD, SPOT_END], [620, 620, 620, FOCUS_SB_X], clamp);
  const camFy = interpolate(frame, [WINDOW_IN, HOLD_A, FULL_END, FULL_HOLD, SPOT_END], [FOCUS_BOX, FOCUS_BOX, FOCUS_CONTENT, FOCUS_CONTENT, FOCUS_SB_Y], clamp);
  const camTx = interpolate(frame, [FULL_HOLD, SPOT_END], [960, 1240], clamp);
  const camX = camTx - STAGE_LEFT - camS * camFx;
  const camY = 540 - STAGE_TOP - camS * camFy;
  const winOp = interpolate(frame, [WINDOW_IN - 2, WINDOW_IN + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kopUit = interpolate(frame, [HOLD_A - 6, FULL_END - 28], [1, 0], clamp);

  return (
    <SceneWrapper center={false}>
      {/* Losse eindjes */}
      <AbsoluteFill>
        {KAARTEN.map((k, i) => {
          const enterS = spring({ frame: frame - i * 3, fps, config: { damping: 16, mass: 0.7 } });
          const enterOpacity = interpolate(enterS, [0, 0.6], [0, 1], { extrapolateRight: "clamp" });
          const enterScale = interpolate(enterS, [0, 1], [0.7, 1]);
          const cStart = CONV_START + (k.seed % 4) * 4;
          const conv = interpolate(frame, [cStart, cStart + CONV_DUUR], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          const drift = Math.sin((frame + k.seed * 9) / 26) * 6 * (1 - conv);
          const x = k.x + (960 - k.x) * conv;
          const y = k.y + (540 - k.y) * conv + drift;
          const scale = enterScale * (1 - 0.85 * conv);
          const stijl: CSSProperties = {
            position: "absolute",
            left: x,
            top: y,
            opacity: enterOpacity * (1 - conv),
            transform: `translate(-50%, -50%) rotate(${k.rot * (1 - conv)}deg) scale(${scale})`,
            willChange: "transform, opacity",
          };
          return (
            <div key={i} style={stijl}>
              <KaartInhoud k={k} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* De man die de draad kwijt is, midden in de chaos */}
      {frame < 122 && (
        <AbsoluteFill>
          <VerdwaaldeMan />
        </AbsoluteFill>
      )}

      {/* Consolidatie: het doen.-venster popt, zoomt full-bleed en duwt door naar de zijbalk */}
      <AbsoluteFill>
        {frame >= WINDOW_IN - 2 && (
          <div style={{ position: "absolute", left: STAGE_LEFT, top: STAGE_TOP, width: VENSTER_W, opacity: winOp, transform: `translate(${camX}px, ${camY}px) scale(${camS})`, transformOrigin: "0 0", willChange: "transform" }}>
            <DeviceFrame variant="browser" width={VENSTER_W} url="app.doen.team/dashboard">
              <div style={{ width: VENSTER_W, height: VENSTER_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
                <div style={{ width: 1790, transform: `scale(${SCREEN_SCALE})`, transformOrigin: "top left" }}>
                  <DashboardScreen />
                </div>
              </div>
            </DeviceFrame>
          </div>
        )}
      </AbsoluteFill>

      {/* Kop bovenin (fade-t weg zodra het dashboard inzoomt) */}
      <div style={{ position: "absolute", top: 48, left: 0, right: 0, textAlign: "center", opacity: kopUit }}>
        <div style={{ position: "relative", height: 80 }}>
          {KOPPEN.map((kop, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, ...kopBeat(kop.in, kop.uit), fontFamily: fonts.kop, fontWeight: 800, fontSize: 66, letterSpacing: "-0.02em", color: merk.ink }}>
              {kop.node}
            </div>
          ))}
        </div>
      </div>

      {/* Spotlight op Activiteit + Gedaan: dim de rest, tekst ernaast */}
      {frame >= FULL_HOLD && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {/* dim-laag met een uitsparing over de twee zijbalk-kaarten */}
          <div style={{ position: "absolute", left: 944, top: 148, width: 588, height: 802, borderRadius: 22, boxShadow: `0 0 0 9999px rgba(18,14,10,${interpolate(frame, [FULL_HOLD + 38, SPOT_END + 18, 392, 408], [0, 0.6, 0.6, 0], clamp)})` }} />
          {/* caption links op de dim-laag (laat los voor de overgang) */}
          <div style={{ position: "absolute", left: 130, top: 0, bottom: 0, width: 740, display: "flex", flexDirection: "column", justifyContent: "center", opacity: interpolate(frame, [SPOT_END, SPOT_END + 28, 390, 404], [0, 1, 1, 0], clamp), transform: `translateY(${interpolate(frame, [SPOT_END, SPOT_END + 28], [16, 0], clamp)}px)` }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: fonts.mono, fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: merk.flame }} />
              activiteit · team-log
            </div>
            <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 70, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#fff" }}>
              houd bij wat<br />iedereen doet<FlameDot />
            </div>
            <div style={{ marginTop: 22, fontSize: 31, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
              en wat er al gedaan is.
            </div>
          </div>
        </AbsoluteFill>
      )}
    </SceneWrapper>
  );
};
