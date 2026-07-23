import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DeviceFrame } from "../../components/DeviceFrame";
import { TakenScreen } from "../screens/TakenScreen";
import { LoopAchtergrond, LoopChip } from "./LoopKader";
import { LoopCursor } from "./LoopCursor";

// Module-loop Taken: de echte Team-swimlane (forgedesk TasksLayout.tsx,
// viewMode 'swimlane') in plaats van de oude lijst-per-collega. De
// toolbar komt op, de swimlane bouwt rij voor rij op, de kritieke taak
// van Remco op vandaag springt eruit, de cursor vinkt hem af (teller
// telt terug), en alles vloeit terug naar de opgebouwde beginstand zodat
// de loop naadloos sluit.
const BROWSER_W = 1560;
const VIEWPORT_H = 540;
const SCALE = BROWSER_W / 1790;
const LEFT = (1920 - BROWSER_W) / 2;
const TOP = 130;
const BALK = 52;
const EASE = Easing.inOut(Easing.cubic);

// Ontwerpcoordinaat van de checkbox op de kritieke taak (Remco, woensdag).
// Via stills geverifieerd tegen de 1790-brede layout in TakenScreen.tsx.
const BOX = { x: 861, y: 260 };

const HEADER_D = 10;
const LANE_D: [number, number, number, number] = [22, 34, 46, 58];
const KRITIEK_PULS = 92;
const CURSOR_START = 98;
const KLIK_FR = 132;
const VINK_START = 136;
const VINK_END = 154;
const TELLER_TICK = 146;
const CURSOR_FADE_START = 158;
const CURSOR_FADE_END = 174;
const RESET_START = 206;
const RESET_END = 234;
export const MODULE_TAKEN_DUUR = 240;

const dcx = (x: number) => LEFT + x * SCALE;
const dcy = (y: number) => TOP + BALK + y * SCALE;

// Kleine pop rond een moment: 1 -> 1+amp -> 1.
const pop = (frame: number, op: number, duur = 16, amp = 0.18): number => {
  const p = interpolate(frame, [op, op + duur * 0.4, op + duur], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return 1 + p * amp;
};

export const ModuleTaken: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const veer = (delay: number) => spring({ frame: frame - delay, fps, durationInFrames: 22, config: { damping: 200 } });

  const toolbarReveal = veer(0);
  const headerReveal = veer(HEADER_D);
  const laneReveal: [number, number, number, number] = [veer(LANE_D[0]), veer(LANE_D[1]), veer(LANE_D[2]), veer(LANE_D[3])];
  const kritiekPulse = pop(frame, KRITIEK_PULS, 34, 0.13);

  const vinkProgress = interpolate(frame, [VINK_START, VINK_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const tellerOpen = vinkProgress >= 0.5 ? 3 : 4;
  const tellerPop = pop(frame, TELLER_TICK, 16, 0.2);

  // Cursor: rustpunt onder het scherm -> checkbox -> klik -> weg.
  const van = { x: 1000, y: 840 };
  const doel = { x: dcx(BOX.x), y: dcy(BOX.y) };
  const p1 = interpolate(frame, [CURSOR_START, KLIK_FR], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const cursorX = van.x + (doel.x - van.x) * p1;
  const cursorY = van.y + (doel.y - van.y) * p1 - Math.sin(p1 * Math.PI) * 28;
  const cursorOp =
    interpolate(frame, [CURSOR_START - 10, CURSOR_START], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [CURSOR_FADE_START, CURSOR_FADE_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klikRaw = interpolate(frame, [KLIK_FR, KLIK_FR + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const klik = klikRaw > 0 && klikRaw < 1 ? klikRaw : 0;

  // Reset: kruis rustig terug naar de volledig opgebouwde beginstand (loop-stand).
  const resetOp = interpolate(frame, [RESET_START, RESET_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  return (
    <LoopAchtergrond>
      <div style={{ position: "absolute", top: TOP, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/taken">
          <div style={{ position: "relative", width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
              <TakenScreen
                toolbarReveal={toolbarReveal}
                headerReveal={headerReveal}
                laneReveal={laneReveal}
                kritiekPulse={kritiekPulse}
                vinkProgress={vinkProgress}
                tellerOpen={tellerOpen}
                tellerTotaal={12}
                tellerPop={tellerPop}
              />
            </div>
            {resetOp > 0 && (
              <div style={{ position: "absolute", inset: 0, opacity: resetOp }}>
                <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
                  <TakenScreen tellerOpen={4} tellerTotaal={12} />
                </div>
              </div>
            )}
          </div>
        </DeviceFrame>
      </div>

      <LoopCursor x={cursorX} y={cursorY} opacity={cursorOp} klik={klik} />

      {/* Caption-chip onderin, constant zichtbaar (loopveilig) */}
      <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)" }}>
        <LoopChip titel="Taken" sub="alles naast de montage, per collega" />
      </div>
    </LoopAchtergrond>
  );
};
