import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { FactuurScreen } from "../screens/FactuurScreen";
import { ExactKaart } from "../Scene10FactuurExact";
import { LoopAchtergrond, LoopChip } from "./LoopKader";

// Module-loop Facturen: de offerte-naar-factuur plus Exact-sync-choreografie
// uit Scene10, als schone app-loop. De scrim en de kaart laten aan het eind
// los naar de lichte app, die gelijk is aan de beginstand: naadloze loop.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const EASE = Easing.inOut(Easing.cubic);
const RELEASE = 132;
export const MODULE_FACTUREN_DUUR = 164;

export const ModuleFacturen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scrim = interpolate(frame, [6, 20, RELEASE, RELEASE + 18], [0, 0.66, 0.66, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const kaartIn = popIn(frame, fps, { delay: 10, from: 0.92 });
  const kaartUit = interpolate(frame, [RELEASE, RELEASE + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  // Strakker dan de bron: de kaart-tijdlijn (sync start 70, klaar 116) wordt
  // versneld afgespeeld zodat er geen dode momenten zijn.
  const kaartFrame = interpolate(frame, [0, 140], [0, 196], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <LoopAchtergrond>
      {/* Factuur-app als context, statisch geplaatst (loopveilig) */}
      <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/facturen/2026117">
          <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <FactuurScreen />
            </div>
          </div>
        </DeviceFrame>
      </div>

      {scrim > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(18,32,36,${scrim})` }} />}

      {/* Gecentreerde Exact-sync-kaart */}
      {frame >= 10 && frame < RELEASE + 18 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...kaartIn, opacity: (kaartIn.opacity as number) * kaartUit }}>
            <ExactKaart frame={kaartFrame} />
          </div>
        </AbsoluteFill>
      )}

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Facturen" sub="van offerte naar factuur, gesynct met Exact" />
      </div>
    </LoopAchtergrond>
  );
};
