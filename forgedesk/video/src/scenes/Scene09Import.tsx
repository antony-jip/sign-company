import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { fadeUp, popIn } from "../helpers/entrances";
import { ImportScreen } from "./screens/ImportScreen";
import { T } from "./screens/AppChrome";

// Migratie-bezwaar wegnemen, vlak voor de prijs: "en jouw bestaande data?".
// Links de twee routes (zelf importeren of wij doen het), rechts de import-tool
// waar een CSV in de bedrijfsdata-zone valt en naar "Geïmporteerd" flipt.
const BROWSER_W = 1100;
const SCALE = BROWSER_W / 1790;
const VIEWPORT_H = 772;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);

const DROP_START = 52;
const DROP_END = 84;
const IMPORT_DONE = 86;
const PAYOFF = 106;

const OPTIES: { d: string; tekst: React.ReactNode }[] = [
  { d: "M5 3h10l4 4v14H5V3zM14 3v4h4M8 12h8M8 16h6", tekst: <>Sleep je CSV erin met de <strong style={{ fontWeight: 600, color: merk.ink }}>import-tool</strong>.</> },
  { d: "M3 6h18v12H3V6zM4 7l8 6 8-6", tekst: <>Of stuur 'm op. Wij doen het <strong style={{ fontWeight: 600, color: merk.ink }}>gratis</strong> voor je.</> },
];

const FileChip: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 14, backgroundColor: "#fff", border: `1px solid ${T.border}`, boxShadow: "0 18px 40px -12px rgba(120,90,50,0.4)" }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "#E4F0EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 3h10l4 4v14H5V3zM14 3v4h4M8 13h8M8 17h5" stroke="#2D7D52" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, color: merk.ink }}>administratie.csv</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg }}>1.120 regels</div>
    </div>
  </div>
);

export const Scene09Import: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const klaar = frame >= IMPORT_DONE;

  const intro = fadeUp(frame, fps, { delay: 4, distance: 20 });

  // CSV-bestand dat in de bedrijfsdata-dropzone valt.
  const p = interpolate(frame, [DROP_START, DROP_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const chipX = interpolate(p, [0, 1], [830, 1235]);
  const chipY = interpolate(p, [0, 1], [486, 432]);
  const chipScale = interpolate(p, [0, 1], [1, 0.72]);
  const chipOp = interpolate(frame, [DROP_END - 10, DROP_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SceneWrapper center={false}>
      {/* Rechts: import-tool */}
      <div style={{ position: "absolute", right: 70, top: "50%", transform: "translateY(-50%)" }}>
        <div style={popIn(frame, fps, { delay: 6, from: 0.97 })}>
          <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/import">
            <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
              <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
                <ImportScreen klaar={klaar} />
              </div>
            </div>
          </DeviceFrame>
        </div>
      </div>

      {/* Vallend CSV-bestand */}
      {frame >= DROP_START && frame < IMPORT_DONE && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: chipX, top: chipY, transform: `translate(-50%, -50%) scale(${chipScale}) rotate(-4deg)`, opacity: chipOp }}>
            <FileChip />
          </div>
        </AbsoluteFill>
      )}

      {/* Links: copy */}
      <div style={{ position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)", width: 580 }}>
        <div style={intro}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8A8278", marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            geen gedoe met overstappen
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 60, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1.02 }}>
            oja, en jouw<br />data?<FlameDot />
          </div>
        </div>

        <div style={{ marginTop: 38, display: "flex", flexDirection: "column", gap: 20 }}>
          {OPTIES.map((o, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, ...fadeUp(frame, fps, { delay: 16 + i * 8, distance: 16 }) }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, backgroundColor: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(120,90,50,0.05)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={o.d} stroke={merk.petrol} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ fontSize: 24, color: "#5A554D", lineHeight: 1.35 }}>{o.tekst}</div>
            </div>
          ))}
        </div>

        {frame >= PAYOFF - 2 && (
          <div style={{ marginTop: 34, ...popIn(frame, fps, { delay: PAYOFF, from: 0.86 }) }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 999, backgroundColor: merk.flame, color: "#fff", fontSize: 24, fontWeight: 700, boxShadow: "0 12px 30px -10px rgba(223,92,54,0.5)" }}>
              binnen 10 minuten aan de bak
              <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#fff" }} />
            </div>
          </div>
        )}
      </div>
    </SceneWrapper>
  );
};
