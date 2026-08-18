import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { PlanningScreen } from "../screens/PlanningScreen";
import { T } from "../screens/AppChrome";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Planning: het weekoverzicht, een projectkaart wordt vanuit de
// te-plannen-lijst naar vrijdag gesleept (cursor + kaart langs een boog),
// het blok landt in het grid en krijgt een werkbon-badge. Aan het eind
// vloeit alles terug naar de beginstand zodat de loop naadloos sluit.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const LEFT = (1920 - BROWSER_W) / 2;
const TOP = 48;
const BALK = 52;
const EASE = Easing.inOut(Easing.cubic);

// Ontwerpcoordinaten (1790 breed). Via stills geverifieerd.
const KAART = { x: 16, y: 262, w: 228, h: 66 }; // sidebar-kaart "Lichtbak entree"
const CEL = { x: 1502, y: 319, w: 284, h: 92 }; // vrijdag, rij 09:00

const PAK = 58; // oppakken
const SLEEP_TOT = 118; // einde sleep
const BADGE = 152;
const RESET = 228;
export const MODULE_PLANNING_DUUR = 270;

const dcx = (x: number) => LEFT + x * SCALE;
const dcy = (y: number) => TOP + BALK + y * SCALE;

export const ModulePlanning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sleep-voortgang: van kaart-midden naar cel-midden, met een lichte boog.
  const sp = interpolate(frame, [PAK + 4, SLEEP_TOT], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const van = { x: KAART.x + KAART.w / 2, y: KAART.y + KAART.h / 2 };
  const naar = { x: CEL.x + CEL.w / 2, y: CEL.y + CEL.h / 2 };
  const px = van.x + (naar.x - van.x) * sp;
  const py = van.y + (naar.y - van.y) * sp - Math.sin(sp * Math.PI) * 70;

  // Cursor: eerst naar de kaart lopen, dan mee met de sleep, dan weg.
  const ap = interpolate(frame, [24, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const aanloop = {
    x: 620 + (dcx(van.x) - 620) * ap,
    y: 900 + (dcy(van.y) - 900) * ap - Math.sin(ap * Math.PI) * 24,
  };
  const cursorX = frame < PAK ? aanloop.x : dcx(px);
  const cursorY = frame < PAK ? aanloop.y : dcy(py);
  const cursorOp =
    interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [SLEEP_TOT + 22, SLEEP_TOT + 38], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klik = interpolate(frame, [PAK - 6, PAK + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slepen: kaart licht op met schaduw en lichte rotatie; bij het loslaten
  // kruist hij naar een planning-blok in de cel.
  const sleepActief = frame >= PAK && frame < SLEEP_TOT + 8;
  const drop = interpolate(frame, [SLEEP_TOT, SLEEP_TOT + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const dropPop = popIn(frame, fps, { delay: SLEEP_TOT, from: 0.94 });

  // Ghost op de oorspronkelijke plek zolang de kaart onderweg of gepland is.
  const ghost = interpolate(frame, [PAK - 2, PAK + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Reset: blok en badge vloeien uit, de sidebar-kaart komt terug.
  const uit = interpolate(frame, [RESET, RESET + 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  const badgeIn = popIn(frame, fps, { delay: BADGE, from: 0.85 });

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/planning">
          <div style={{ position: "relative", width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <PlanningScreen />
            </div>

            {/* Overlays in ontwerpcoordinaten, meegeschaald met het scherm */}
            <div style={{ position: "absolute", inset: 0, width: 1790, height: VIEWPORT_H / SCALE, transform: `scale(${SCALE})`, transformOrigin: "top left", fontFamily: fonts.body }}>
              {/* Ghost: lege plek waar de kaart vandaan komt */}
              {ghost > 0 && (
                <div style={{ position: "absolute", left: KAART.x, top: KAART.y, width: KAART.w, height: KAART.h, opacity: ghost * uit }}>
                  <div style={{ position: "absolute", inset: 0, backgroundColor: T.card }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: 10, border: `1.5px dashed #C9C4BA` }} />
                </div>
              )}

              {/* Slepende kaart / gepland blok */}
              {frame >= PAK && uit > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: px - KAART.w / 2 - (CEL.w - KAART.w) * 0.5 * drop,
                    top: py - KAART.h / 2,
                    width: KAART.w + (CEL.w - 8 - KAART.w) * drop,
                    opacity: uit,
                  }}
                >
                  {/* Onderweg: witte projectkaart */}
                  <div
                    style={{
                      opacity: 1 - drop,
                      transform: `scale(${sleepActief ? 1.06 : 1}) rotate(${sleepActief ? -2 * (1 - drop) : 0}deg)`,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${T.border}`,
                      backgroundColor: "#fff",
                      boxShadow: sleepActief ? "0 22px 40px -14px rgba(13,52,60,0.35)" : "none",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>Lichtbak entree</div>
                    <div style={{ fontSize: 13, color: T.mutedFg, marginTop: 2 }}>Hotel De Linde</div>
                  </div>

                  {/* Geland: planning-blok met tijd en werkbon-badge */}
                  {drop > 0 && (
                    <div style={{ position: "absolute", inset: 0, opacity: drop, ...(frame >= SLEEP_TOT ? dropPop : {}) }}>
                      <div style={{ height: CEL.h - 8, borderRadius: 8, backgroundColor: "#E2F0F0", borderLeft: `3px solid ${merk.petrol}`, padding: "8px 10px", boxShadow: "0 10px 22px -10px rgba(13,52,60,0.25)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: merk.petrol }}>Montage: Lichtbak entree</div>
                        <div style={{ fontSize: 11, color: "#4A6B70" }}>Hotel De Linde</div>
                        <div style={{ fontSize: 11, fontFamily: fonts.mono, color: "#4A6B70", marginTop: 2 }}>09:00 – 12:30</div>
                      </div>
                      {/* Werkbon-badge aan de kaart */}
                      {frame >= BADGE && (
                        <div style={{ position: "absolute", right: 8, top: -13, ...badgeIn }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#943520", backgroundColor: "#FAE5E0", border: "1px solid #EDD0C5", borderRadius: 999, padding: "4px 10px", boxShadow: "0 6px 14px -6px rgba(148,53,32,0.35)" }}>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none"><path d="M7 3h8l4 4v14H7V3zM15 3v4h4M10 13l2 2 4-5" stroke="#943520" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Werkbon
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DeviceFrame>
      </div>

      <LoopCursor x={cursorX} y={cursorY} opacity={cursorOp} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Planning" sub="slepen is plannen" />
      </div>
    </LoopAchtergrond>
  );
};
