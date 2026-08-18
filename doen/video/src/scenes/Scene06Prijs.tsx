import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { fadeUp, popIn } from "../helpers/entrances";

// Scene 6 - De prijs. De optelsom van losse tools (EUR 208) wordt doorgestreept,
// de doen.-prijs (EUR 79) groeit. "geen verborgen kosten." Zie framework scene 6.
const OUD_IN = 12;
const STREEP_START = 40;
const STREEP_END = 64;
const NIEUW_IN = 70;
const SUB_IN = 110;

export const Scene06Prijs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const oud = fadeUp(frame, fps, { delay: OUD_IN, distance: 16 });
  const streep = interpolate(frame, [STREEP_START, STREEP_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const nieuw = popIn(frame, fps, { delay: NIEUW_IN, from: 0.7 });
  const sub = fadeUp(frame, fps, { delay: SUB_IN, distance: 18 });

  return (
    <SceneWrapper style={{ flexDirection: "column", gap: 8 }}>
      {/* Oude prijs, doorgestreept */}
      <div style={{ position: "relative", ...oud }}>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 52,
            fontWeight: 500,
            color: "#9A938A",
          }}
        >
          € 208 / maand
        </span>
        <div
          style={{
            position: "absolute",
            top: "52%",
            left: -6,
            right: -6,
            height: 4,
            backgroundColor: merk.flame,
            borderRadius: 2,
            transform: `scaleX(${streep})`,
            transformOrigin: "left",
          }}
        />
      </div>

      {/* Nieuwe prijs */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, ...nieuw }}>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 168,
            fontWeight: 600,
            color: merk.petrol,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          € 79
        </span>
        <span style={{ fontSize: 40, fontWeight: 500, color: "#5A554D" }}>/ maand</span>
      </div>

      {/* Subregel */}
      <div
        style={{
          ...sub,
          marginTop: 18,
          fontSize: 34,
          fontWeight: 600,
          color: merk.ink,
        }}
      >
        tot 10 personen<FlameDot /> geen verborgen kosten<FlameDot />
      </div>
    </SceneWrapper>
  );
};
