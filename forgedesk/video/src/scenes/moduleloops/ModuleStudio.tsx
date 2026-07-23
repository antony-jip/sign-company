import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { T, TopNav, TabStrip } from "../screens/AppChrome";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Studio: gestileerde AI-visualisatie-flow als app-scherm.
// Een foto van de bestelbus komt binnen, de studio verwerkt (subtiele
// pulse) en dezelfde bus verschijnt met belettering "De Linde". Daarna
// opslaan bij het project en rustig terug naar de beginstand.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const LEFT = (1920 - BROWSER_W) / 2;
const TOP = 48;
const BALK = 52;
const EASE = Easing.inOut(Easing.cubic);

const FOTO = 14; // foto-kaart landt in de dropzone
const KLIK_VIS = 64; // klik op Visualiseer
const VERWERK = 74; // verwerken-status start
const RESULTAAT = 150; // bus met belettering
const KLIK_OPSLAAN = 208;
const RESET = 236;
export const MODULE_STUDIO_DUUR = 270;

const dcx = (x: number) => LEFT + x * SCALE;
const dcy = (y: number) => TOP + BALK + y * SCALE;

// Clean SVG-illustratie van een bestelbus, zijaanzicht. `belettering`
// (0..1) laat het logo "De Linde" in petrol/flame op de zijkant verschijnen.
const Bus: React.FC<{ belettering?: number; w: number }> = ({ belettering = 0, w }) => {
  const b = belettering;
  return (
    <svg width={w} viewBox="0 0 640 290" fill="none">
      {/* grondschaduw */}
      <ellipse cx={320} cy={252} rx={272} ry={12} fill="rgba(26,53,60,0.08)" />
      {/* carrosserie */}
      <path
        d="M72 208 L72 96 Q72 78 92 78 L430 78 Q464 78 482 94 L540 122 Q562 132 566 154 L570 190 Q571 208 552 208 Z"
        fill="#FBFBFA"
        stroke="#B9C4C4"
        strokeWidth={3}
      />
      {/* voorruit */}
      <path d="M488 100 L536 126 Q553 135 556 152 L558 172 L498 172 Z" fill="#D8E4E6" stroke="#B9C4C4" strokeWidth={2} />
      {/* zijruit cabine */}
      <rect x={440} y={94} width={40} height={52} rx={7} fill="#D8E4E6" stroke="#B9C4C4" strokeWidth={2} />
      {/* deurnaad + greep */}
      <path d="M430 78 L430 208" stroke="#D5DBDA" strokeWidth={2.5} />
      <rect x={438} y={158} width={22} height={5} rx={2.5} fill="#B9C4C4" />
      {/* koplamp + bumper */}
      <path d="M560 176 L570 176 Q571 186 566 192 L556 192 Z" fill="#EFE6C8" stroke="#B9C4C4" strokeWidth={1.5} />
      <path d="M540 208 L570 208 Q576 202 574 194" stroke="#B9C4C4" strokeWidth={3} strokeLinecap="round" />
      {/* wielen */}
      {[158, 476].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy={210} r={33} fill="#2A3335" />
          <circle cx={wx} cy={210} r={13} fill="#C9CFCE" />
          <circle cx={wx} cy={210} r={5} fill="#8A9494" />
        </g>
      ))}
      {/* belettering: De Linde in petrol met flame-punt en swoosh */}
      <g opacity={b} transform={`translate(0 ${(1 - b) * 8})`}>
        <text x={116} y={152} fontFamily={fonts.kop} fontWeight={800} fontSize={52} fill={merk.petrol}>
          De Linde
          <tspan fill={merk.flame}>.</tspan>
        </text>
        <text x={118} y={180} fontFamily={fonts.body} fontWeight={600} fontSize={17} letterSpacing={2} fill="#4A6B70">
          HOTEL · APELDOORN
        </text>
        <path
          d="M116 196 Q230 216 372 192"
          stroke={merk.flame}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - b}
        />
      </g>
    </svg>
  );
};

export const ModuleStudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fase-voortgang, met nette terugkeer naar de beginstand.
  const uit = interpolate(frame, [RESET, RESET + 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const fotoIn = popIn(frame, fps, { delay: FOTO, from: 0.92 });
  const fotoOp = (frame >= FOTO ? (fotoIn.opacity as number) : 0) * uit;

  const verwerkOp =
    interpolate(frame, [VERWERK, VERWERK + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [RESULTAAT - 8, RESULTAAT + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Subtiele pulse tijdens het verwerken (sinus op het frame).
  const puls = 1 + Math.sin((frame / 30) * Math.PI * 2.4) * 0.045;

  const resultIn = popIn(frame, fps, { delay: RESULTAAT, from: 0.95 });
  const resultOp = (frame >= RESULTAAT ? (resultIn.opacity as number) : 0) * uit;
  const belettering = interpolate(frame, [RESULTAAT + 8, RESULTAAT + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  const opgeslagen = interpolate(frame, [KLIK_OPSLAAN + 6, KLIK_OPSLAAN + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }) * uit;

  // Cursor: naar Visualiseer, dan naar Opslaan bij project.
  const p1 = interpolate(frame, [30, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const p2 = interpolate(frame, [RESULTAAT + 26, KLIK_OPSLAAN - 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const d1 = { x: dcx(302), y: dcy(724) }; // Visualiseer-knop
  const d2 = { x: dcx(1560), y: dcy(724) }; // Opslaan bij project
  const van = { x: 640, y: 900 };
  let cursorX = van.x + (d1.x - van.x) * p1;
  let cursorY = van.y + (d1.y - van.y) * p1 - Math.sin(p1 * Math.PI) * 26;
  if (frame >= RESULTAAT + 26) {
    cursorX = d1.x + (d2.x - d1.x) * p2;
    cursorY = d1.y + (d2.y - d1.y) * p2 - Math.sin(p2 * Math.PI) * 44;
  }
  const cursorOp =
    interpolate(frame, [24, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [70, 86], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) +
    interpolate(frame, [RESULTAAT + 24, RESULTAAT + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [KLIK_OPSLAAN + 12, KLIK_OPSLAAN + 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let klik = 0;
  for (const k of [KLIK_VIS, KLIK_OPSLAAN]) {
    const kp = interpolate(frame, [k, k + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    if (kp > 0 && kp < 1) klik = kp;
  }

  const statusTekst = frame < VERWERK + 6 ? "wacht op foto" : verwerkOp > 0.01 ? "verwerken" : resultOp > 0.01 ? "klaar" : "wacht op foto";
  const statusKleur = verwerkOp > 0.01 ? { bg: "#F7EEDC", fg: "#B8883A", bd: "#EBD9B0" } : resultOp > 0.01 ? { bg: "#E8F2EC", fg: "#3A7D52", bd: "#C2DFCC" } : { bg: "#F4F2EE", fg: "#8A8278", bd: "#EAE7E1" };

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/studio">
          <div style={{ position: "relative", width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left", fontFamily: fonts.body }}>
              <div style={{ backgroundColor: T.page, height: 945 }}>
                <TopNav active="Overig" />
                <TabStrip active="Studio" />
                <div style={{ padding: "24px 32px" }}>
                  {/* Kop */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 38, letterSpacing: "-0.5px", color: T.fg }}>
                        Studio<span style={{ color: merk.flame }}>.</span>
                      </span>
                      <span style={{ fontStyle: "italic", fontSize: 17, color: T.mutedFg }}>zie het resultaat voor je produceert</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.fg, border: `1px solid ${T.border}`, backgroundColor: "#fff", borderRadius: 10, padding: "9px 16px" }}>
                      Project: Hotel De Linde <span style={{ color: T.mutedFg }}>⌄</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 22, marginTop: 20, alignItems: "stretch" }}>
                    {/* Links: foto van de klant */}
                    <div style={{ width: 560, flexShrink: 0, backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column" }}>
                      <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 17, color: merk.petrol, marginBottom: 14 }}>
                        Foto<span style={{ color: merk.flame }}>.</span> <span style={{ fontFamily: fonts.body, fontWeight: 400, fontStyle: "italic", fontSize: 14, color: T.mutedFg }}>zoals de bus er nu bij staat</span>
                      </div>
                      <div style={{ height: 430, borderRadius: 14, border: `1.5px dashed #C9C4BA`, backgroundColor: T.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}>
                        {/* leeg: upload-hint */}
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 1 - fotoOp }}>
                          <svg width={44} height={44} viewBox="0 0 24 24" fill="none"><path d="M12 16V5M8 9l4-4 4 4M5 16v3h14v-3" stroke="#B7B1A6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          <span style={{ fontSize: 15, color: T.mutedFg }}>Sleep een foto hierheen</span>
                        </div>
                        {/* foto-kaart met kale bus */}
                        <div style={{ position: "absolute", inset: 14, borderRadius: 10, backgroundColor: "#fff", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: fotoOp }}>
                          <Bus w={420} belettering={0} />
                          <span style={{ position: "absolute", left: 12, bottom: 10, fontFamily: fonts.mono, fontSize: 12.5, color: T.mutedFg, backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 9px" }}>bus-zijkant.jpg</span>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, height: 52, borderRadius: 11, backgroundColor: merk.flame, color: "#fff", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: fotoOp > 0.5 ? 1 : 0.45 }}>
                        <svg width={17} height={17} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.7 5.7 1.3-5.7 1.3L12 17l-1.8-5.7L4.5 10l5.7-1.3L12 3z" fill="#fff" /></svg>
                        Visualiseer
                      </div>
                    </div>

                    {/* Rechts: resultaat */}
                    <div style={{ flex: 1, minWidth: 0, backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 17, color: merk.petrol }}>
                          Resultaat<span style={{ color: merk.flame }}>.</span>
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: statusKleur.fg, backgroundColor: statusKleur.bg, border: `1px solid ${statusKleur.bd}`, borderRadius: 999, padding: "5px 13px" }}>
                          {statusTekst}
                        </span>
                      </div>
                      <div style={{ height: 430, borderRadius: 14, backgroundColor: "#F0F3F2", border: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
                        {/* leeg */}
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: Math.max(0, 1 - fotoOp) }}>
                          <span style={{ fontSize: 15, color: T.mutedFg }}>Hier verschijnt je visualisatie</span>
                        </div>
                        {/* verwerken: subtiele pulse */}
                        {verwerkOp > 0 && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, opacity: verwerkOp * uit }}>
                            <div style={{ width: 74, height: 74, borderRadius: "50%", backgroundColor: "#E2F0F0", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${puls})` }}>
                              <svg width={30} height={30} viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.7 5.7 1.3-5.7 1.3L12 17l-1.8-5.7L4.5 10l5.7-1.3L12 3z" fill={merk.petrol} /></svg>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              {[0, 1, 2].map((i) => {
                                const dp = (((frame - i * 6) % 24) + 24) % 24;
                                return <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: merk.petrol, opacity: 0.25 + Math.sin((dp / 24) * Math.PI) * 0.6 }} />;
                              })}
                            </div>
                            <span style={{ fontSize: 15.5, color: T.mutedFg }}>De belettering wordt op je foto gezet…</span>
                          </div>
                        )}
                        {/* resultaat: dezelfde bus, nu met De Linde */}
                        {resultOp > 0 && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: resultOp }}>
                            <Bus w={860} belettering={belettering} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
                        <span style={{ fontSize: 14, color: T.mutedFg }}>Deel via het portaal of bewaar bij het project</span>
                        <div style={{ marginLeft: "auto", position: "relative", height: 52, width: 300 }}>
                          <div style={{ position: "absolute", inset: 0, borderRadius: 11, backgroundColor: merk.petrol, color: "#fff", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", opacity: (1 - opgeslagen) * (resultOp > 0.01 ? 1 : 0.45) }}>
                            Opslaan bij project
                          </div>
                          <div style={{ position: "absolute", inset: 0, borderRadius: 11, backgroundColor: "#E8F2EC", border: "1px solid #C2DFCC", color: "#3A7D52", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: opgeslagen }}>
                            <svg width={17} height={17} viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#3A7D52" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Opgeslagen bij project
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>

      <LoopCursor x={cursorX} y={cursorY} opacity={Math.min(1, cursorOp)} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Studio" sub="zie het resultaat vóór je produceert" />
      </div>
    </LoopAchtergrond>
  );
};
