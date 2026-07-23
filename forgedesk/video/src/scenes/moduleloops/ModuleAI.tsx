import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Easing } from "remotion";
import { DeviceFrame } from "../../components/DeviceFrame";
import { ChatPaneel } from "../Scene03DaanOfferte";
import { DashboardScreen } from "../screens/DashboardScreen";
import { LoopAchtergrond, LoopChip } from "./LoopKader";

// Module-loop AI-assistent: het Daan-chatpaneel uit Scene03, fullscreen in
// app-context (dashboard gedimd op de achtergrond). De gebruiker vraagt om
// een project voor Hotel De Linde, Daan denkt na, maakt het PROJECT aan en
// bevestigt. Aan het eind kruist het paneel terug naar de beginstand zodat
// de loop naadloos sluit. Conform framework: Daan maakt het project aan,
// geen offerte-capability tonen.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const PANEEL_SCHAAL = 1.04;

const RESET = 268;
export const MODULE_AI_DUUR = 300;

export const ModuleAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // De interne chat-tijdlijn (typen 60-145, denken 168-224, klaar 292) wordt
  // versneld afgespeeld zodat de loop strak blijft.
  const eff = interpolate(frame, [0, 252], [24, 320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Laatste frames: rustig terug naar de beginstand (crossfade in het paneel).
  const resetOp = interpolate(frame, [RESET, RESET + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <LoopAchtergrond>
      {/* App-context: gedimd dashboard achter het chatpaneel (statisch, loopveilig) */}
      <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team">
          <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <DashboardScreen />
            </div>
          </div>
        </DeviceFrame>
      </div>
      <AbsoluteFill style={{ backgroundColor: "rgba(18,32,36,0.55)" }} />

      {/* Daan-chatpaneel, gecentreerd en groot */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", transform: `scale(${PANEEL_SCHAAL})` }}>
          <ChatPaneel frame={eff} fps={fps} />
          {resetOp > 0 && (
            <div style={{ position: "absolute", inset: 0, opacity: resetOp }}>
              <ChatPaneel frame={0} fps={fps} />
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Caption-chip links van het paneel, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", left: 150, top: "50%", transform: "translateY(-50%)" }}>
        <LoopChip titel="AI-assistent" sub="vraag het gewoon aan Daan" />
      </div>
    </LoopAchtergrond>
  );
};
