import { useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { fadeUp, popIn } from "../helpers/entrances";
import { T } from "./screens/AppChrome";

// Maatje: nieuwe mobiele meet-tool voor de monteur. Op locatie een foto van de
// reclameplek, maten erbij, en direct gekoppeld aan het project. Prominente
// telefoon zodat de mobiele UX duidelijk in beeld is.
const GROEN = "#2D7D52";
const DONE = 96; // maten doorgegeven

const Maatlabel: React.FC<{ x: number; y: number; tekst: string }> = ({ x, y, tekst }) => (
  <span style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", padding: "4px 10px", borderRadius: 8, backgroundColor: "rgba(18,26,30,0.82)", color: "#fff", fontFamily: fonts.mono, fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>{tekst}</span>
);

const MaatjePhone: React.FC<{ doorgegeven: boolean }> = ({ doorgegeven }) => (
  <DeviceFrame variant="iphone" width={430}>
    <div style={{ position: "relative", height: "100%", overflow: "hidden", backgroundColor: "#B68E63" }}>
      {/* lucht */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "20%", background: "linear-gradient(180deg, #ABBFCC 0%, #CBD6DC 100%)" }} />
      {/* gevel-wand */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "15%", bottom: 0, background: "linear-gradient(180deg, #C7A179 0%, #B58D62 100%)" }} />
      {/* baksteen-textuur */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "15%", bottom: 0, opacity: 0.16, backgroundImage: "repeating-linear-gradient(0deg, transparent 0 13px, rgba(70,48,30,0.7) 13px 14px), repeating-linear-gradient(90deg, transparent 0 27px, rgba(70,48,30,0.6) 27px 28px)" }} />
      {/* reclame-fascia (het opgemeten vlak) */}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "24%", height: "20%", background: "linear-gradient(180deg, #2F3D44 0%, #243136 100%)", borderRadius: 2, boxShadow: "0 5px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)" }} />
      {/* vage bestaande belettering */}
      <div style={{ position: "absolute", left: "15%", top: "31%", width: "34%", height: "6%", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 }} />
      {/* etalagepui */}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "52%", bottom: "7%", background: "linear-gradient(160deg, #738389 0%, #4B595F 100%)", border: "3px solid #8A6F4E" }} />
      <div style={{ position: "absolute", left: "49.5%", top: "52%", width: "1%", bottom: "7%", backgroundColor: "#5A4838" }} />
      {/* glas-reflectie */}
      <div style={{ position: "absolute", left: "10%", top: "53%", width: "32%", height: "22%", background: "linear-gradient(120deg, rgba(255,255,255,0.25), transparent 60%)" }} />
      {/* stoep */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "7%", background: "linear-gradient(180deg, #9C958C, #847C72)" }} />
      {/* licht-vignet voor foto-gevoel */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(125% 85% at 50% 28%, transparent 52%, rgba(18,13,8,0.32))" }} />

      {/* meetlijnen rond de fascia */}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "47%", height: 2, backgroundColor: "#fff", boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", top: "24%", bottom: "56%", right: "5%", width: 2, backgroundColor: "#fff", boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
      <Maatlabel x={50} y={47} tekst="840 cm" />
      <Maatlabel x={88} y={34} tekst="385 cm" />
      {/* focus-hoeken */}
      {([["t", "l"], ["t", "r"], ["b", "l"], ["b", "r"]] as const).map(([v, h], i) => (
        <div key={i} style={{ position: "absolute", width: 22, height: 22, [v === "t" ? "top" : "bottom"]: 14, [h === "l" ? "left" : "right"]: 14, borderTop: v === "t" ? "2px solid rgba(255,255,255,0.85)" : "none", borderBottom: v === "b" ? "2px solid rgba(255,255,255,0.85)" : "none", borderLeft: h === "l" ? "2px solid rgba(255,255,255,0.85)" : "none", borderRight: h === "r" ? "2px solid rgba(255,255,255,0.85)" : "none" }} />
      ))}
      {/* Maatje-pill */}
      <div style={{ position: "absolute", left: 16, top: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, backgroundColor: "rgba(16,24,28,0.62)" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 8h18v8H3V8zM7 8v4M11 8v3M15 8v4M19 8v3" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Maatje</span>
        <FlameDot />
      </div>

      {/* bottom-sheet: opmeting + koppeling aan project */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderRadius: "24px 24px 0 0", padding: "16px 20px 22px", boxShadow: "0 -12px 34px rgba(0,0,0,0.28)" }}>
        <div style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#E2DED6", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 16, color: T.mutedFg }}>Opgemeten</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 700, color: T.fg }}>840 × 385 cm</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: T.mutedFg, marginBottom: 8 }}>PROJECT</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 13, border: `1px solid ${merk.petrol}33`, backgroundColor: `${merk.petrol}0D`, marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M15 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" stroke={merk.petrol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.fg }}>Lichtbakken De Linde</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg }}>PRJ-2026-042</div>
          </div>
          <span style={{ color: merk.petrol, fontSize: 18 }}>⌄</span>
        </div>
        {doorgegeven ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, height: 54, borderRadius: 14, backgroundColor: "#E4F0EA", color: GROEN, fontSize: 18, fontWeight: 700 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={GROEN} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Toegevoegd aan project
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 54, borderRadius: 14, backgroundColor: merk.flame, color: "#fff", fontSize: 18, fontWeight: 700, boxShadow: "0 10px 24px -8px rgba(223,92,54,0.5)" }}>
            Toevoegen aan project
          </div>
        )}
      </div>
    </div>
  </DeviceFrame>
);

const PUNTEN: { d: string; tekst: React.ReactNode }[] = [
  { d: "M4 7h3l2-2h6l2 2h3v12H4V7zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", tekst: <>Foto van de reclameplek, <strong style={{ fontWeight: 600, color: merk.ink }}>maten</strong> erbij.</> },
  { d: "M9 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M15 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1", tekst: <>Direct <strong style={{ fontWeight: 600, color: merk.ink }}>toegevoegd</strong> aan het project.</> },
  { d: "M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z", tekst: <>Al je <strong style={{ fontWeight: 600, color: merk.ink }}>situatiefoto's</strong> netjes geordend.</> },
];

export const Scene11Maatje: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = fadeUp(frame, fps, { delay: 4, distance: 20 });

  return (
    <SceneWrapper center={false}>
      {/* Rechts: telefoon */}
      <div style={{ position: "absolute", right: 200, top: "50%", transform: "translateY(-50%) rotate(2deg)" }}>
        <div style={popIn(frame, fps, { delay: 6, from: 0.94 })}>
          <MaatjePhone doorgegeven={frame >= DONE} />
        </div>
      </div>

      {/* Links: uitleg */}
      <div style={{ position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)", width: 620 }}>
        <div style={intro}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8A8278", marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            nieuw · voor de monteur
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: "#5A554D", lineHeight: 1.3, marginBottom: 14 }}>
            Situatie opnemen bij je klant?
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 72, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1 }}>
            Maatje<FlameDot />
          </div>
          <div style={{ marginTop: 18, fontSize: 26, color: "#5A554D", lineHeight: 1.4, maxWidth: 540 }}>
            Meet de reclameplek met je telefoon.
          </div>
        </div>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 20 }}>
          {PUNTEN.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, ...fadeUp(frame, fps, { delay: 16 + i * 8, distance: 16 }) }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, backgroundColor: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(120,90,50,0.05)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d={p.d} stroke={merk.petrol} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{ fontSize: 24, color: "#5A554D", lineHeight: 1.35 }}>{p.tekst}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 30, display: "inline-flex", alignItems: "center", gap: 9, padding: "9px 16px", borderRadius: 999, border: `1px solid ${T.border}`, backgroundColor: "#fff", fontSize: 16, color: T.mutedFg, boxShadow: "0 1px 3px rgba(120,90,50,0.05)", ...fadeUp(frame, fps, { delay: 36, distance: 14 }) }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: merk.flame }} />
          beschikbaar in de <strong style={{ color: merk.petrol, fontWeight: 700 }}>doen.</strong>-app
        </div>
      </div>
    </SceneWrapper>
  );
};
