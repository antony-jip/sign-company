import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { EmailScreen } from "../screens/EmailScreen";
import { T } from "../screens/AppChrome";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Email: de inbox, een mail opent, Daan stelt een antwoord voor
// (samenvatten/beantwoorden, conform framework-regel), het antwoord vult de
// composer en gaat de deur uit. Aan het eind sluit het leesvenster weer,
// gelijk aan de beginstand: naadloze loop.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const LEFT = (1920 - BROWSER_W) / 2;
const TOP = 48;
const BALK = 52;
const EASE = Easing.inOut(Easing.cubic);

// Ontwerpcoordinaten (1790 breed). Leesvenster = rechts van rail + lijst.
const PANE = { x: 604, y: 104, w: 1186, h: 766 };

const KLIK_MAIL = 56;
const DAAN = 96;
const KLIK_GEBRUIK = 152;
const COMPOSER = 168;
const KLIK_VERSTUUR = 208;
const TOAST = 222;
const RESET = 244;
export const MODULE_EMAIL_DUUR = 270;

const ANTWOORD =
  "Beste Lotte, dank voor het akkoord. We plannen de montage in week 24 en sturen vandaag de bevestiging met de planning mee.";

const dcx = (x: number) => LEFT + x * SCALE;
const dcy = (y: number) => TOP + BALK + y * SCALE;

const DaanAvatar: React.FC = () => (
  <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: merk.petrol, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>D</span>
  </div>
);

export const ModuleEmail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Leesvenster: dicht aan het begin, opent na de klik, sluit bij de reset.
  const dekIn = interpolate(frame, [KLIK_MAIL + 6, KLIK_MAIL + 24], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const dekUit = interpolate(frame, [RESET, RESET + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const dek = Math.max(dekIn, dekUit);

  // Cursor-choreografie: mailrij -> Gebruik antwoord -> Verstuur.
  const DOELEN = [
    { van: { x: 700, y: 900 }, naar: { x: dcx(340), y: dcy(304) }, t: [22, 50] as const },
    { van: { x: dcx(340), y: dcy(304) }, naar: { x: dcx(1244), y: dcy(636) }, t: [116, 146] as const },
    { van: { x: dcx(1244), y: dcy(636) }, naar: { x: dcx(1610), y: dcy(760) }, t: [180, 204] as const },
  ];
  let cursorX = DOELEN[0].van.x;
  let cursorY = DOELEN[0].van.y;
  for (const d of DOELEN) {
    const p = interpolate(frame, [d.t[0], d.t[1]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
    if (frame >= d.t[0]) {
      cursorX = d.van.x + (d.naar.x - d.van.x) * p;
      cursorY = d.van.y + (d.naar.y - d.van.y) * p - Math.sin(p * Math.PI) * 24;
    }
  }
  const cursorOp =
    interpolate(frame, [16, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [KLIK_VERSTUUR + 10, KLIK_VERSTUUR + 26], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klikken = [KLIK_MAIL, KLIK_GEBRUIK, KLIK_VERSTUUR];
  let klik = 0;
  for (const k of klikken) {
    const p = interpolate(frame, [k, k + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    if (p > 0 && p < 1) klik = p;
  }

  // Daan-suggestieblok.
  const daanIn = popIn(frame, fps, { delay: DAAN, from: 0.94 });
  const daanUit = interpolate(frame, [KLIK_GEBRUIK + 8, KLIK_GEBRUIK + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const daanZichtbaar = frame >= DAAN && frame < KLIK_GEBRUIK + 22;

  // Composer met gevuld antwoord.
  const compIn = popIn(frame, fps, { delay: COMPOSER, from: 0.96 });
  const compUit = interpolate(frame, [KLIK_VERSTUUR + 6, KLIK_VERSTUUR + 18], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const compZichtbaar = frame >= COMPOSER && frame < KLIK_VERSTUUR + 20;

  // Verzonden-toast.
  const toastIn = popIn(frame, fps, { delay: TOAST, from: 0.9 });
  const toastUit = interpolate(frame, [RESET - 4, RESET + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const toastZichtbaar = frame >= TOAST && frame < RESET + 14;

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/email">
          <div style={{ position: "relative", width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <EmailScreen />
            </div>

            {/* Overlays in ontwerpcoordinaten */}
            <div style={{ position: "absolute", inset: 0, width: 1790, height: VIEWPORT_H / SCALE, transform: `scale(${SCALE})`, transformOrigin: "top left", fontFamily: fonts.body }}>
              {/* Dek over het leesvenster: mail is nog niet geopend */}
              {dek > 0 && (
                <div style={{ position: "absolute", left: PANE.x, top: PANE.y, width: PANE.w, height: PANE.h, backgroundColor: T.page, opacity: dek, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <svg width={54} height={54} viewBox="0 0 24 24" fill="none"><path d="M3 6h18v12H3V6zM4 7l8 6 8-6" stroke="#C9C4BA" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span style={{ fontSize: 17, color: T.mutedFg }}>Selecteer een e-mail om te lezen</span>
                </div>
              )}

              {/* Daan stelt een antwoord voor */}
              {daanZichtbaar && (
                <div style={{ position: "absolute", left: 640, top: 486, width: 740, ...daanIn, opacity: (daanIn.opacity as number) * daanUit }}>
                  <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, borderLeft: `3px solid ${merk.petrol}`, backgroundColor: "#fff", padding: "18px 20px", boxShadow: "0 24px 48px -20px rgba(120,90,50,0.35)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <DaanAvatar />
                      <span style={{ fontSize: 16, fontWeight: 700, color: T.fg }}>Daan stelt een antwoord voor<span style={{ color: merk.flame }}>.</span></span>
                      <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: merk.petrol, backgroundColor: "#E2F0F0", borderRadius: 999, padding: "4px 11px" }}>concept</span>
                    </div>
                    <div style={{ fontSize: 15.5, lineHeight: 1.55, color: T.fg, backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 15px" }}>
                      {ANTWOORD}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                      <span style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.mutedFg, fontSize: 14, fontWeight: 500 }}>Aanpassen</span>
                      <span style={{ padding: "9px 18px", borderRadius: 9, backgroundColor: merk.petrol, color: "#fff", fontSize: 14, fontWeight: 600 }}>Gebruik antwoord</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Composer: antwoord gevuld, klaar om te versturen */}
              {compZichtbaar && (
                <div style={{ position: "absolute", left: 640, top: 560, width: 1050, ...compIn, opacity: (compIn.opacity as number) * compUit }}>
                  <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, backgroundColor: "#fff", padding: "18px 20px", boxShadow: "0 24px 48px -20px rgba(120,90,50,0.35)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: T.mutedFg, marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, color: T.fg }}>Aan:</span> lotte@hoteldelinde.nl
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: merk.petrol }}>
                        <DaanAvatar /> voorstel van Daan
                      </span>
                    </div>
                    <div style={{ fontSize: 15.5, lineHeight: 1.55, color: T.fg, minHeight: 96, borderRadius: 10, border: `1px solid ${T.border}`, padding: "12px 15px" }}>
                      {ANTWOORD}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
                      <span style={{ fontSize: 13.5, color: T.mutedFg }}>Concept opgeslagen</span>
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, backgroundColor: merk.flame, color: "#fff", fontSize: 15, fontWeight: 600 }}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-3-6-7-2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                        Verstuur
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verzonden-toast */}
              {toastZichtbaar && (
                <div style={{ position: "absolute", left: PANE.x + PANE.w / 2, top: 700 }}>
                  <div style={{ transform: "translateX(-50%)", ...toastIn, opacity: (toastIn.opacity as number) * toastUit }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, backgroundColor: "#E8F2EC", border: "1px solid #C2DFCC", borderRadius: 12, padding: "12px 20px", fontSize: 16, fontWeight: 600, color: "#3A7D52", whiteSpace: "nowrap", boxShadow: "0 16px 32px -14px rgba(13,52,60,0.3)" }}>
                      <svg width={16} height={16} viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#3A7D52" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Verzonden<span style={{ color: merk.flame }}>.</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DeviceFrame>
      </div>

      <LoopCursor x={cursorX} y={cursorY} opacity={cursorOp} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Email" sub="jouw mailbox, slim gekoppeld" />
      </div>
    </LoopAchtergrond>
  );
};
