import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { T } from "../screens/AppChrome";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Klantportaal: het portaal vanuit klant-perspectief. De klant
// bekijkt de gedeelde offerte, klikt op Akkoord en krijgt een groene
// bevestiging. Daarna vloeit de akkoord-laag rustig terug naar de
// beginstand zodat de loop naadloos sluit.
const BROWSER_W = 1240;
const VIEWPORT_H = 560;
const TOP = 160;
const BALK = 52;
const LEFT = (1920 - BROWSER_W) / 2;
const EASE = Easing.inOut(Easing.cubic);

const KLIK = 78;
export const MODULE_PORTAAL_DUUR = 240;

const GROEN = "#3A7D52";
const GROEN_BG = "#E8F2EC";

export const ModulePortaal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kaartIn = popIn(frame, fps, { delay: 6, from: 0.95 });

  // Cursor loopt naar de Akkoord-knop en klikt.
  const p = interpolate(frame, [34, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const van = { x: 1240, y: 880 };
  const naar = { x: 812, y: 600 }; // midden Akkoord-knop (canvas), via stills geverifieerd
  const cursorX = van.x + (naar.x - van.x) * p;
  const cursorY = van.y + (naar.y - van.y) * p - Math.sin(p * Math.PI) * 26;
  const cursorOp =
    interpolate(frame, [28, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [KLIK + 18, KLIK + 34], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klik = interpolate(frame, [KLIK, KLIK + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Akkoord-laag: knop en status kruisen naar groen, en vloeien aan het
  // eind terug (loop-stand).
  const akkoordIn = interpolate(frame, [KLIK + 6, KLIK + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const akkoordUit = interpolate(frame, [204, 228], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const a = akkoordIn * akkoordUit;

  // Groene bevestigings-toast.
  const toastIn = popIn(frame, fps, { delay: KLIK + 24, from: 0.92 });
  const toastOp = (frame >= KLIK + 24 ? (toastIn.opacity as number) : 0) *
    interpolate(frame, [188, 206], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  // Vink-animatie in de groene knop.
  const vink = interpolate(frame, [KLIK + 14, KLIK + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: LEFT }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="portaal.doen.team/hotel-de-linde">
          <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: T.page, fontFamily: fonts.body }}>
            {/* Portaal-kop: klant ziet het bedrijf, geen app-navigatie */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 96, background: `linear-gradient(135deg, ${merk.petrol}, ${T.petrolDark})`, color: "#fff" }}>
              <div>
                <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 26 }}>
                  Portaal<span style={{ color: merk.flame }}>.</span>
                </div>
                <div style={{ fontSize: 14, opacity: 0.75, marginTop: 2 }}>voor Hotel De Linde</div>
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "8px 16px" }}>
                beveiligde link · geen inlog nodig
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "34px 0" }}>
              <div style={{ width: 640, ...kaartIn }}>
                <div style={{ fontSize: 14, color: T.mutedFg, marginBottom: 12 }}>Gedeeld met je op 2 juni</div>

                {/* Offerte-kaart */}
                <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, borderTop: `3px solid ${merk.flame}`, backgroundColor: T.card, padding: 26, boxShadow: "0 20px 44px -20px rgba(120,90,50,0.22)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: merk.flame, marginBottom: 10 }}>OFFERTE</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.fg }}>Offerte OFF-2026-0042</div>
                  <div style={{ fontSize: 15, color: T.mutedFg, marginTop: 4 }}>Lichtbakken gevel · 3 stuks · incl. montage</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                    <span style={{ fontFamily: fonts.mono, fontSize: 28, fontWeight: 700, color: T.fg }}>€ 4.250,00</span>
                    <span style={{ position: "relative", fontSize: 15, fontWeight: 600 }}>
                      <span style={{ color: "#3A5A9A", opacity: 1 - a }}>Verstuurd<span style={{ color: merk.flame }}>.</span></span>
                      <span style={{ position: "absolute", right: 0, top: 0, whiteSpace: "nowrap", color: GROEN, opacity: a }}>Goedgekeurd<span style={{ color: merk.flame }}>.</span></span>
                    </span>
                  </div>

                  {/* Knoppenrij: Akkoord kruist naar gevuld groen */}
                  <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
                    <div style={{ position: "relative", flex: 1, height: 50 }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: GROEN_BG, color: GROEN, fontSize: 16, fontWeight: 600, opacity: 1 - a }}>
                        Akkoord
                      </div>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 11, backgroundColor: GROEN, color: "#fff", fontSize: 16, fontWeight: 600, opacity: a }}>
                        <svg width={18} height={18} viewBox="0 0 20 20">
                          <path d="M4 10.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - vink} />
                        </svg>
                        Goedgekeurd
                      </div>
                    </div>
                    <div style={{ flex: 1, height: 50, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, border: `1px solid ${T.border}`, backgroundColor: "#fff", color: T.fg, fontSize: 16, fontWeight: 500 }}>
                      Vragen stellen
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 14, color: T.mutedFg }}>
                  <span>Download als PDF</span>
                  <span>
                    powered by <span style={{ fontFamily: fonts.kop, fontWeight: 800, color: merk.petrol }}>doen<span style={{ color: merk.flame }}>.</span></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>

      {/* Groene bevestiging bovenin het venster */}
      {toastOp > 0 && (
        <div style={{ position: "absolute", top: TOP + BALK + 21, left: "50%", transform: `translateX(-50%) ${((toastIn.transform as string) ?? "")}`, opacity: toastOp }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, backgroundColor: GROEN_BG, border: "1px solid #C2DFCC", borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 36px -16px rgba(13,52,60,0.25)" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: GROEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={14} height={14} viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: GROEN }}>Akkoord doorgegeven. Het signbedrijf gaat voor je aan de slag.</span>
          </div>
        </div>
      )}

      <LoopCursor x={cursorX} y={cursorY} opacity={cursorOp} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Klantportaal" sub="één link, geen inlog" />
      </div>
    </LoopAchtergrond>
  );
};
