import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { fadeUp, popIn } from "../helpers/entrances";

// Scene 1 - Cold open. Eerst een hook die de signmaker direct aanspreekt
// ("verwacht jij ook méér van je software?"), die inhaakt op de pijnpunten van
// scene 2. Daarna onthult het doen.-logo het antwoord.
const HOOK_OUT = 80; // hook begint te verdwijnen
const HANDOFF = 96; // hook volledig weg; logo neemt het over (geen overlap)

export const Scene01ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hookLead = fadeUp(frame, fps, { delay: 6, distance: 18 });
  const hookVraag = fadeUp(frame, fps, { delay: 20, distance: 22 });
  const hookUit = interpolate(frame, [HOOK_OUT, HANDOFF], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const logo = popIn(frame, fps, { delay: HANDOFF, from: 0.92 });
  const subregel = fadeUp(frame, fps, { delay: HANDOFF + 16, distance: 24 });

  return (
    <SceneWrapper center={false}>
      {/* Hook: spreek de signmaker direct aan */}
      {frame < HANDOFF + 2 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: hookUit }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ ...hookLead, fontSize: 40, fontWeight: 600, color: "#5A554D" }}>
              Hé signmaker<FlameDot />
            </div>
            <div style={{ ...hookVraag, marginTop: 16, fontFamily: fonts.kop, fontWeight: 800, fontSize: 66, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1.08 }}>
              verwacht jij ook <span style={{ fontStyle: "italic" }}>méér</span><br />van je software?
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Onthulling: het logo als antwoord */}
      {frame >= HANDOFF && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 }}>
          <Img src={staticFile("logos/doen-logo.svg")} style={{ width: 640, ...logo }} />
          <div style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.01em", color: merk.ink, ...subregel }}>
            alles voor je signbedrijf op één plek<FlameDot />
          </div>
        </AbsoluteFill>
      )}
    </SceneWrapper>
  );
};
