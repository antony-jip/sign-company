import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { fadeUp, popIn } from "../helpers/entrances";
import { WorkflowRail } from "./screens/WorkflowSpine";
import { ProjectCockpit } from "./cockpit/ProjectCockpit";
import { PlanningScreen } from "./screens/PlanningScreen";
import { EmailScreen } from "./screens/EmailScreen";
import { OfferteScreen } from "./screens/OfferteScreen";
import { PortaalScreen } from "./screens/PortaalScreen";
import { WerkbonEditorScreen } from "./screens/WerkbonEditorScreen";
import { FactuurScreen } from "./screens/FactuurScreen";

// Scene 4 - De hele workflow als leidraad. Verticale flow-rail links loopt node
// voor node op; rechts verschijnt de mockup van dat module-scherm. Van aanvraag
// tot factuur, een coherente doorlopende flow.
const RAIL_IN = 24;
const STAGE_START = 40;
const STAGE_DUR = 32;
const STAGES: { key: string; screen: React.ReactNode | null }[] = [
  { key: "klant", screen: <EmailScreen /> },
  { key: "project", screen: <ProjectCockpit /> },
  { key: "offerte", screen: <OfferteScreen /> },
  { key: "tekening", screen: <WerkbonEditorScreen /> },
  { key: "portaal", screen: <PortaalScreen /> },
  { key: "planning", screen: <PlanningScreen /> },
  { key: "factuur", screen: <FactuurScreen /> },
  { key: "gedaan", screen: null },
];

// Mockup: scherm op ontwerp-breedte 1790, geschaald naar de browser-breedte.
const BROWSER_W = 1230;
const SCREEN_SCALE = BROWSER_W / 1790; // ~0.687
const CONTENT_H = 624;

export const Scene04Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const idx = Math.max(0, Math.min(STAGES.length - 1, Math.floor((frame - STAGE_START) / STAGE_DUR)));
  const stage = frame < STAGE_START ? null : STAGES[idx];
  const stageStart = STAGE_START + idx * STAGE_DUR;
  const active = stage ? stage.key : "";
  const isGedaan = active === "gedaan";

  const railFade = fadeUp(frame, fps, { delay: 0, distance: 18 });
  const railOpacity = interpolate(frame, [0, RAIL_IN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mockupPop = popIn(frame, fps, { delay: stageStart, from: 0.97 });

  return (
    <SceneWrapper center={false}>
      {/* Linkerkolom: titel + verticale rail */}
      <div style={{ position: "absolute", left: 96, top: 70, opacity: railOpacity }}>
        <div style={{ ...railFade, marginBottom: 26 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8A8278", marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            de workflow
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1 }}>
            van aanvraag<br />tot factuur<FlameDot />
          </div>
        </div>
        <WorkflowRail active={active} />
      </div>

      {/* Rechts: mockup van het actieve scherm */}
      {stage && stage.screen && (
        <div style={{ position: "absolute", right: 80, top: "50%", transform: "translateY(-50%)" }}>
          <div style={mockupPop}>
            <DeviceFrame variant="browser" width={BROWSER_W}>
              <div style={{ position: "relative", width: BROWSER_W, height: CONTENT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
                <div style={{ width: 1790, transform: `scale(${SCREEN_SCALE})`, transformOrigin: "top left" }}>
                  {stage.screen}
                </div>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 72, background: "linear-gradient(180deg, transparent, #F4F3F0)", pointerEvents: "none" }} />
              </div>
            </DeviceFrame>
          </div>
        </div>
      )}

      {/* Gedaan-payoff rechts */}
      {isGedaan && (
        <div style={{ position: "absolute", right: 80, top: "50%", width: 1230, transform: "translateY(-50%)", textAlign: "center", ...mockupPop }}>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 84, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1.05 }}>
            één doorlopende flow<FlameDot />
          </div>
          <div style={{ marginTop: 20, fontSize: 30, fontWeight: 500, color: "#5A554D" }}>
            van aanvraag tot factuur. geen los systeem meer.
          </div>
        </div>
      )}
    </SceneWrapper>
  );
};
