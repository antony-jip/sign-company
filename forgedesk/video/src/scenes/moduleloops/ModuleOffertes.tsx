import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { OfferteScreen } from "../screens/OfferteScreen";
import { VerstuurPaneel } from "../Scene08CockpitTour";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Offertes: de offerte-editor bouwt zich op (regels en velden
// komen in beeld), een subtiele scroll toont de totalen, de cursor klikt op
// Verstuur en de verstuur-keuze (portaal/email) verschijnt. Aan het eind
// laat alles rustig los en vouwen de kaarten terug naar de beginstand,
// zodat de loop naadloos sluit.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const LEFT = (1920 - BROWSER_W) / 2;
const TOP = 48;
const BALK = 52; // titelbalk van het browser-frame
const EASE = Easing.inOut(Easing.cubic);

// Canvas-coordinaten vanuit scherm-ontwerpcoordinaten (1790 breed, scroll 0).
const cx = (x: number) => LEFT + x * SCALE;
const cy = (y: number) => TOP + BALK + y * SCALE;

const SCROLL_MAX = 175;
const KNOP = { x: 1688, y: 150 }; // midden van de Verstuur-knop
const KLIK = 212;
const PANEEL = 222;
const RELEASE = 264;
export const MODULE_OFFERTES_DUUR = 300;

export const ModuleOffertes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Kaarten komen gefaseerd binnen en vouwen aan het eind terug (loop-stand).
  const onthulIn = interpolate(frame, [4, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const onthulUit = interpolate(frame, [278, 298], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const onthul = Math.min(onthulIn, onthulUit);

  // Subtiele scroll naar de totalen en weer terug.
  const scroll = interpolate(frame, [84, 124, 150, 182], [0, SCROLL_MAX, SCROLL_MAX, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Cursor: verschijnt na de scroll, loopt in een lichte boog naar Verstuur.
  const p = interpolate(frame, [174, 206], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const van = { x: 1120, y: 780 };
  const naar = { x: cx(KNOP.x), y: cy(KNOP.y) };
  const cursorX = van.x + (naar.x - van.x) * p;
  const cursorY = van.y + (naar.y - van.y) * p - Math.sin(p * Math.PI) * 30;
  const cursorOp =
    interpolate(frame, [168, 178], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [KLIK + 10, KLIK + 22], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klik = interpolate(frame, [KLIK, KLIK + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scrim + verstuur-paneel, met nette release terug naar de app.
  const scrim = interpolate(frame, [PANEEL, PANEEL + 14, RELEASE, RELEASE + 20], [0, 0.62, 0.62, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const paneelIn = popIn(frame, fps, { delay: PANEEL + 4, from: 0.92 });
  const paneelUit = interpolate(frame, [RELEASE, RELEASE + 14], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/offertes/OFF-2026-0042">
          <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `translateY(${-scroll}px) scale(${SCALE})`, transformOrigin: "top left" }}>
              <OfferteScreen onthul={onthul} />
            </div>
          </div>
        </DeviceFrame>
      </div>

      {scrim > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(18,32,36,${scrim})` }} />}

      {/* Verstuur-keuze: portaal of email */}
      {frame >= PANEEL && frame < RELEASE + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...paneelIn, opacity: (paneelIn.opacity as number) * paneelUit }}>
            <VerstuurPaneel />
          </div>
        </AbsoluteFill>
      )}

      <LoopCursor x={cursorX} y={cursorY} opacity={cursorOp} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Offertes" sub="calculeren, versturen, goedkeuren" />
      </div>
    </LoopAchtergrond>
  );
};
