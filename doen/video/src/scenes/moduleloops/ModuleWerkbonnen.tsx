import { AbsoluteFill, interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { DeviceFrame } from "../../components/DeviceFrame";
import { WerkbonSchil } from "../Scene05Monteur";
import { LoopAchtergrond, LoopChip } from "./LoopKader";

// Module-loop Werkbonnen: de werkbon-choreografie uit Scene05 (vinkjes, uren,
// handtekening, afronden) maar fullscreen: iPhone gecentreerd en groot, geen
// marketingtekst-kolom. De binnenkant kruist aan het eind terug naar de
// beginstand zodat de loop naadloos sluit.
const TELEFOON_W = 440; // totale hoogte ~918px = ~85% van 1080
// De schil is ontworpen voor een smaller scherm; iets opschalen zodat het
// grote toestel netjes gevuld is (schermbreedte binnen frame = 410px).
const SCHIL_W = 356;
const SCHIL_SCALE = 410 / SCHIL_W;
export const MODULE_WERKBONNEN_DUUR = 168;

export const ModuleWerkbonnen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Strakker dan de bron: de originele schil-tijdlijn (taken 40/66/92,
  // handtekening 150, afronden 185) wordt versneld afgespeeld.
  const eff = interpolate(frame, [0, 130], [10, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Laatste ~25 frames: rustig terug naar de beginstand (crossfade in de schil).
  const resetOp = interpolate(frame, [142, 162], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <LoopAchtergrond>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <DeviceFrame variant="iphone" width={TELEFOON_W}>
          <div style={{ position: "relative", height: "100%" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <div style={{ width: SCHIL_W, transform: `scale(${SCHIL_SCALE})`, transformOrigin: "top left" }}>
                <WerkbonSchil frame={eff} fps={fps} />
              </div>
            </div>
            {resetOp > 0 && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "#F4F3F0", opacity: resetOp }}>
                <div style={{ width: SCHIL_W, transform: `scale(${SCHIL_SCALE})`, transformOrigin: "top left" }}>
                  <WerkbonSchil frame={0} fps={fps} />
                </div>
              </div>
            )}
          </div>
        </DeviceFrame>
      </AbsoluteFill>

      {/* Caption-chip naast het toestel, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", left: 170, top: "50%", transform: "translateY(-50%)" }}>
        <LoopChip titel="Werkbonnen" sub="de monteur rondt af op locatie" />
      </div>
    </LoopAchtergrond>
  );
};
