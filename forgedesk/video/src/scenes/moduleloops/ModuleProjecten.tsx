import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../../brand";
import { DeviceFrame } from "../../components/DeviceFrame";
import { popIn } from "../../helpers/entrances";
import { ProjectCockpit, ActiesPaneel, ActiviteitPaneel } from "../cockpit/ProjectCockpit";
import { VerstuurPaneel, PortaalPaneel } from "../Scene08CockpitTour";
import { LoopAchtergrond, LoopChip } from "./LoopKader";

// Module-loop Projecten: dezelfde cockpit-choreografie als Scene08 (scroll,
// acties, activiteit, verstuur, portaal) maar als schone app-loop. Strak
// getimed, caption-chips onderin, en aan het eind rustig terug naar de
// beginstand zodat de loop naadloos sluit.
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const SCROLL_MAX = 612;
const EASE = Easing.inOut(Easing.cubic);
const RING = `0 0 0 4px ${merk.flame}44, 0 40px 80px -24px rgba(0,0,0,0.5)`;

const ACTIES = 96;
const ACTIVITEIT = 158;
const VERSTUUR = 220;
const PORTAAL = 282;
const RELEASE = 336; // scrim los, scroll terug naar boven
export const MODULE_PROJECTEN_DUUR = 380;

const CHIPS = [
  { titel: "Projecten", sub: "briefing, offerte, klant en planning in één overzicht" },
  { titel: "Acties", sub: "elke volgende stap, één klik" },
  { titel: "Activiteit", sub: "elke stap legt zichzelf vast" },
  { titel: "Versturen", sub: "via portaal of via email, jij kiest" },
  { titel: "Portaal", sub: "je klant keurt online goed" },
];

export const ModuleProjecten: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scroll omlaag tijdens de intro, en tijdens de release rustig terug omhoog.
  const scroll = interpolate(
    frame,
    [8, 88, RELEASE, RELEASE + 32],
    [0, SCROLL_MAX, SCROLL_MAX, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
  );
  const scrim = interpolate(
    frame,
    [ACTIES, ACTIES + 14, RELEASE, RELEASE + 18],
    [0, 0.66, 0.66, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
  );

  // Per highlight: pop-in, en uitfaden zodra de volgende (of de release) start.
  const fase = (start: number, next: number) => {
    const inS = popIn(frame, fps, { delay: start + 2, from: 0.9 });
    const out = interpolate(frame, [next, next + 14], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE,
    });
    return { ...inS, opacity: (inS.opacity as number) * out };
  };

  // Chip-zichtbaarheid per beat; chip 0 komt aan het eind terug (loop-stand).
  const chipOp = (i: number): number => {
    if (i === 0) {
      return frame < 200
        ? interpolate(frame, [ACTIES - 12, ACTIES + 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : interpolate(frame, [RELEASE + 18, RELEASE + 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    }
    const start = [0, ACTIES, ACTIVITEIT, VERSTUUR, PORTAAL][i];
    const eind = [0, ACTIVITEIT, VERSTUUR, PORTAAL, RELEASE][i];
    return interpolate(
      frame,
      [start + 4, start + 16, eind - 6, eind + 6],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  };

  return (
    <LoopAchtergrond>
      {/* Browser met project-cockpit, statisch geplaatst (loopveilig) */}
      <div style={{ position: "absolute", top: 48, left: "50%", transform: "translateX(-50%)" }}>
        <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/projecten">
          <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
            <div style={{ width: 1790, transform: `translateY(${-scroll}px) scale(${SCALE})`, transformOrigin: "top left" }}>
              <ProjectCockpit />
            </div>
          </div>
        </DeviceFrame>
      </div>

      {scrim > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(18,32,36,${scrim})` }} />}

      {/* Acties */}
      {frame >= ACTIES && frame < ACTIVITEIT + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 640, borderRadius: 20, boxShadow: RING, ...fase(ACTIES, ACTIVITEIT) }}>
            <ActiesPaneel />
          </div>
        </AbsoluteFill>
      )}

      {/* Activiteit */}
      {frame >= ACTIVITEIT && frame < VERSTUUR + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 640, borderRadius: 20, boxShadow: RING, ...fase(ACTIVITEIT, VERSTUUR) }}>
            <ActiviteitPaneel />
          </div>
        </AbsoluteFill>
      )}

      {/* Verstuur-keuze */}
      {frame >= VERSTUUR && frame < PORTAAL + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...fase(VERSTUUR, PORTAAL) }}>
            <VerstuurPaneel />
          </div>
        </AbsoluteFill>
      )}

      {/* Portaal */}
      {frame >= PORTAAL && frame < RELEASE + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...fase(PORTAAL, RELEASE) }}>
            <PortaalPaneel />
          </div>
        </AbsoluteFill>
      )}

      {/* Caption-chips onderin, buiten de UI */}
      {CHIPS.map((c, i) => {
        const op = chipOp(i);
        if (op <= 0) return null;
        return (
          <div
            key={c.titel}
            style={{
              position: "absolute",
              bottom: 26,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: op,
              textAlign: "center",
            }}
          >
            <LoopChip titel={c.titel} sub={c.sub} />
          </div>
        );
      })}
    </LoopAchtergrond>
  );
};
