import "./index.css";
import { Composition } from "remotion";
import { Scene01ColdOpen } from "./scenes/Scene01ColdOpen";
import { Scene02Probleem } from "./scenes/Scene02Probleem";
import { Scene03DaanOfferte } from "./scenes/Scene03DaanOfferte";
import { Scene04Workflow } from "./scenes/Scene04Workflow";
import { Scene05Monteur } from "./scenes/Scene05Monteur";
import { Scene06Prijs } from "./scenes/Scene06Prijs";
import { Scene07CTA } from "./scenes/Scene07CTA";
import { Scene08CockpitTour } from "./scenes/Scene08CockpitTour";
import { Scene09Import } from "./scenes/Scene09Import";
import { Scene10FactuurExact } from "./scenes/Scene10FactuurExact";
import { Scene11Maatje } from "./scenes/Scene11Maatje";
import { DoenDemoFull, DoenDemo43, DoenSocial916, DoenHeroLoop, HERO_DUUR, VOLLE_DUUR } from "./Video";
import { ModuleProjecten, MODULE_PROJECTEN_DUUR } from "./scenes/moduleloops/ModuleProjecten";
import { ModuleWerkbonnen, MODULE_WERKBONNEN_DUUR } from "./scenes/moduleloops/ModuleWerkbonnen";
import { ModuleFacturen, MODULE_FACTUREN_DUUR } from "./scenes/moduleloops/ModuleFacturen";
import { ModuleOffertes, MODULE_OFFERTES_DUUR } from "./scenes/moduleloops/ModuleOffertes";
import { ModulePortaal, MODULE_PORTAAL_DUUR } from "./scenes/moduleloops/ModulePortaal";
import { ModulePlanning, MODULE_PLANNING_DUUR } from "./scenes/moduleloops/ModulePlanning";
import { ModuleEmail, MODULE_EMAIL_DUUR } from "./scenes/moduleloops/ModuleEmail";
import { ModuleTaken, MODULE_TAKEN_DUUR } from "./scenes/moduleloops/ModuleTaken";
import { ModuleStudio, MODULE_STUDIO_DUUR } from "./scenes/moduleloops/ModuleStudio";
import { ModuleAI, MODULE_AI_DUUR } from "./scenes/moduleloops/ModuleAI";

// Hoofdformaat: 1920x1080 16:9 30fps. DoenDemo = de volle montage (Series van
// alle 7 scenes). Hero-loop en 9:16-variant als aparte Composities. De losse
// scenes blijven geregistreerd voor geisoleerde preview/scrubben.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DoenDemo"
        component={DoenDemoFull}
        durationInFrames={VOLLE_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DoenHeroLoop"
        component={DoenHeroLoop}
        durationInFrames={HERO_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DoenDemo43"
        component={DoenDemo43}
        durationInFrames={VOLLE_DUUR}
        fps={30}
        width={1440}
        height={1080}
      />
      <Composition
        id="DoenSocial916"
        component={DoenSocial916}
        durationInFrames={VOLLE_DUUR}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Schone module-UX-loops voor de marketing-site (embed) */}
      <Composition
        id="ModuleProjecten"
        component={ModuleProjecten}
        durationInFrames={MODULE_PROJECTEN_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleWerkbonnen"
        component={ModuleWerkbonnen}
        durationInFrames={MODULE_WERKBONNEN_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleFacturen"
        component={ModuleFacturen}
        durationInFrames={MODULE_FACTUREN_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleOffertes"
        component={ModuleOffertes}
        durationInFrames={MODULE_OFFERTES_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModulePortaal"
        component={ModulePortaal}
        durationInFrames={MODULE_PORTAAL_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModulePlanning"
        component={ModulePlanning}
        durationInFrames={MODULE_PLANNING_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleEmail"
        component={ModuleEmail}
        durationInFrames={MODULE_EMAIL_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleTaken"
        component={ModuleTaken}
        durationInFrames={MODULE_TAKEN_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleStudio"
        component={ModuleStudio}
        durationInFrames={MODULE_STUDIO_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ModuleAI"
        component={ModuleAI}
        durationInFrames={MODULE_AI_DUUR}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Scene01ColdOpen"
        component={Scene01ColdOpen}
        durationInFrames={200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene02Probleem"
        component={Scene02Probleem}
        durationInFrames={410}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene03DaanOfferte"
        component={Scene03DaanOfferte}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene04Workflow"
        component={Scene04Workflow}
        durationInFrames={330}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene05Monteur"
        component={Scene05Monteur}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene06Prijs"
        component={Scene06Prijs}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene07CTA"
        component={Scene07CTA}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene08CockpitTour"
        component={Scene08CockpitTour}
        durationInFrames={506}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene09Import"
        component={Scene09Import}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene10FactuurExact"
        component={Scene10FactuurExact}
        durationInFrames={200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene11Maatje"
        component={Scene11Maatje}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
