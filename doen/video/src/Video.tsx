import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { merk } from "./brand";
import { fonts } from "./fonts";
import { Scene01ColdOpen } from "./scenes/Scene01ColdOpen";
import { Scene02Probleem } from "./scenes/Scene02Probleem";
import { Scene03DaanOfferte } from "./scenes/Scene03DaanOfferte";
import { Scene04Workflow } from "./scenes/Scene04Workflow";
import { Scene06Prijs } from "./scenes/Scene06Prijs";
import { Scene07CTA } from "./scenes/Scene07CTA";
import { Scene08CockpitTour } from "./scenes/Scene08CockpitTour";
import { Scene09Import } from "./scenes/Scene09Import";
import { Scene10FactuurExact } from "./scenes/Scene10FactuurExact";
import { Scene11Maatje } from "./scenes/Scene11Maatje";

// Scene-volgorde. Daan komt NA de workflow: eerst laten zien hoe doen. werkt
// (van aanvraag tot factuur), daarna de AI-collega introduceren.
type SceneDef = { component: React.FC; duur: number };

export const SCENES: SceneDef[] = [
  { component: Scene01ColdOpen, duur: 200 },
  { component: Scene02Probleem, duur: 410 },
  { component: Scene04Workflow, duur: 330 },
  { component: Scene11Maatje, duur: 180 },
  { component: Scene03DaanOfferte, duur: 360 },
  { component: Scene08CockpitTour, duur: 506 },
  { component: Scene10FactuurExact, duur: 200 },
  { component: Scene09Import, duur: 210 },
  { component: Scene06Prijs, duur: 180 },
  { component: Scene07CTA, duur: 150 },
];

// Hero-loop: cold open, Daan, prijs, CTA.
export const HERO_SCENES: SceneDef[] = [
  { component: Scene01ColdOpen, duur: 200 },
  { component: Scene03DaanOfferte, duur: 360 },
  { component: Scene06Prijs, duur: 180 },
  { component: Scene07CTA, duur: 150 },
];

// Zachte crossfade tussen scenes.
const TRANS = 14;
const totaal = (s: SceneDef[]) => s.reduce((a, x) => a + x.duur, 0) - TRANS * (s.length - 1);
export const VOLLE_DUUR = totaal(SCENES);
export const HERO_DUUR = totaal(HERO_SCENES);

const Reeks: React.FC<{ scenes: SceneDef[] }> = ({ scenes }) => {
  const kinderen: ReactNode[] = [];
  scenes.forEach((s, i) => {
    if (i > 0) {
      kinderen.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          timing={linearTiming({ durationInFrames: TRANS })}
          presentation={fade()}
        />,
      );
    }
    const Scene = s.component;
    kinderen.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={s.duur}>
        <Scene />
      </TransitionSeries.Sequence>,
    );
  });
  return <TransitionSeries>{kinderen}</TransitionSeries>;
};

// SFX op montage-frames: whoosh bij overgangen, pop bij reveals, ding bij
// succes-momenten (Maatje, Daan, Exact, import), typen bij de chat.
const SFX_LEN: Record<string, number> = { whoosh: 18, pop: 8, ding: 30, typing: 92 };
const SFX: { f: number; s: string; v: number }[] = [
  { f: 96, s: "pop", v: 0.55 },     // logo-onthulling
  { f: 306, s: "pop", v: 0.65 },    // dashboard-reveal
  { f: 994, s: "ding", v: 0.55 },   // toegevoegd aan project
  { f: 1124, s: "typing", v: 0.5 }, // Daan typt
  { f: 1346, s: "ding", v: 0.55 },  // project aangemaakt
  { f: 1556, s: "pop", v: 0.5 },    // eerste highlight
  { f: 2020, s: "ding", v: 0.6 },   // gesynct met Exact
  { f: 2174, s: "ding", v: 0.55 },  // geimporteerd
  { f: 2300, s: "pop", v: 0.55 },   // prijs
  { f: 2508, s: "pop", v: 0.6 },    // begin vandaag
];

// Volledige demo, 16:9. Geen muziek-bed; alleen subtiele SFX op de beats.
export const DoenDemoFull: React.FC = () => (
  <AbsoluteFill>
    <Reeks scenes={SCENES} />
    {SFX.map((x, i) => (
      <Sequence key={i} from={x.f} durationInFrames={SFX_LEN[x.s]} name={`sfx:${x.s}`}>
        <Audio src={staticFile(`audio/${x.s}.wav`)} volume={x.v} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

// 4:3-variant: het 16:9-beeld gecentreerd op een 1440x1080 merk-canvas. De
// lichte balken boven/onder vallen weg tegen de off-white scenes.
export const DoenDemo43: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: merk.offWhite, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 1920, height: 1080, transform: `scale(${1440 / 1920})`, transformOrigin: "center" }}>
      <DoenDemoFull />
    </div>
  </AbsoluteFill>
);

// Hero-loop, 16:9.
export const DoenHeroLoop: React.FC = () => <Reeks scenes={HERO_SCENES} />;

// 9:16-frame: het 16:9-beeld gecentreerd op een merk-canvas, met logo boven en
// url onder. Eerste pass voor social; echte verticale her-layouts volgen later.
const VerticaalFrame: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: merk.offWhite, alignItems: "center", justifyContent: "center" }}>
    <Img src={staticFile("logos/doen-logo.svg")} style={{ position: "absolute", top: 200, width: 360 }} />
    <div
      style={{
        width: 1920,
        height: 1080,
        transform: `scale(${1080 / 1920})`,
        transformOrigin: "center",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 40px 90px -30px rgba(120,90,50,0.35)",
      }}
    >
      {children}
    </div>
    <div style={{ position: "absolute", bottom: 220, fontFamily: fonts.mono, fontSize: 44, letterSpacing: "0.04em", color: merk.petrol }}>
      app.doen.team
    </div>
  </AbsoluteFill>
);

// Volledige demo, 9:16 (social).
export const DoenSocial916: React.FC = () => (
  <VerticaalFrame>
    <DoenDemoFull />
  </VerticaalFrame>
);
