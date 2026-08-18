import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { DoenBackground } from "./DoenBackground";

// Gedeelde drager voor elke scene: vult het frame, zet de merk-achtergrond,
// Inter als body-font en ink als basis-tekstkleur. Scenes vullen alleen hun
// eigen inhoud in. center=true plaatst de inhoud gecentreerd (cold open, prijs);
// center=false laat de scene zelf de layout bepalen.
export const SceneWrapper: React.FC<{
  children: ReactNode;
  background?: string;
  center?: boolean;
  style?: CSSProperties;
}> = ({ children, background = merk.offWhite, center = true, style }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        fontFamily: fonts.body,
        color: merk.ink,
        ...(center
          ? { alignItems: "center", justifyContent: "center" }
          : {}),
        ...style,
      }}
    >
      <DoenBackground />
      {children}
    </AbsoluteFill>
  );
};
