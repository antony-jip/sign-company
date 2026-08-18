import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { popIn } from "../helpers/entrances";
import { ProjectCockpit, ActiesPaneel, ActiviteitPaneel } from "./cockpit/ProjectCockpit";
import { T } from "./screens/AppChrome";

// Scene na Daan: subtiel door de project-cockpit scrollen, daarna drie highlights:
// Acties (elke volgende stap, een klik) -> Verstuur (via portaal of email) ->
// Portaal (klant keurt online goed).
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const SCROLL_MAX = 612;

const SCROLL_FROM = 14;
const SCROLL_TO = 136;
const ACTIES_START = 146;
const ACTIVITEIT_START = 234;
const VERSTUUR_START = 322;
const PORTAAL_START = 410;
const EASE = Easing.inOut(Easing.cubic);

const OFFERTENR = "OFF-2026-0042";
const BEDRAG = "€ 4.250,00";
const RING = `0 0 0 4px ${merk.flame}44, 0 40px 80px -24px rgba(0,0,0,0.5)`;

export const VerstuurPaneel: React.FC = () => {
  const Knop: React.FC<{ children: React.ReactNode; bg?: string; outline?: boolean; chevron?: boolean }> = ({ children, bg, outline, chevron }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 11, fontSize: 16, fontWeight: 600, color: outline ? T.fg : "#fff", backgroundColor: bg, border: outline ? `1px solid ${T.border}` : "none" }}>
      {children}{chevron && <span style={{ opacity: 0.8 }}>⌄</span>}
    </div>
  );
  const Optie: React.FC<{ d: string; tint: string; titel: string; sub: string }> = ({ d, tint, titel, sub }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={d} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.fg }}>{titel}</div>
        <div style={{ fontSize: 15, color: T.mutedFg, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Knop outline>↓ PDF</Knop>
        <Knop bg={merk.petrol}>Opslaan</Knop>
        <Knop bg={merk.flame} chevron>↗ Verstuur</Knop>
      </div>
      <div style={{ width: 500, borderRadius: 16, backgroundColor: "#fff", boxShadow: RING, overflow: "hidden", textAlign: "left" }}>
        <Optie d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" tint={merk.petrol} titel="Via portaal" sub="Klant bekijkt online + email-notificatie" />
        <div style={{ height: 1, backgroundColor: T.border }} />
        <Optie d="M3 6h18v12H3V6zM4 7l8 6 8-6" tint={merk.flame} titel="Via email" sub="PDF-bijlage + gepersonaliseerde email" />
      </div>
    </div>
  );
};

export const PortaalPaneel: React.FC = () => (
  <div style={{ width: 700, borderRadius: 18, overflow: "hidden", backgroundColor: T.card, textAlign: "left", boxShadow: RING }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: `linear-gradient(135deg, ${merk.petrol}, #143F46)`, color: "#fff" }}>
      <span style={{ fontSize: 15, letterSpacing: "0.08em", fontWeight: 700 }}>PORTAAL <span style={{ fontWeight: 500, opacity: 0.85 }}>Actief<span style={{ color: merk.flame }}>.</span> · 1 gedeeld</span></span>
      <span style={{ fontSize: 15, opacity: 0.85 }}>Openen →</span>
    </div>
    <div style={{ padding: 22 }}>
      <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, borderTop: `3px solid ${merk.flame}`, padding: 18, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: merk.flame, marginBottom: 6 }}>OFFERTE</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.fg }}>Offerte {OFFERTENR}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: 700, color: T.fg }}>{BEDRAG}</span>
          <span style={{ fontSize: 15, color: "#3A5A9A" }}>Verstuurd<span style={{ color: merk.flame }}>.</span></span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <span style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 10, backgroundColor: "#E8F2EC", color: "#3A7D52", fontSize: 15, fontWeight: 600 }}>Goedkeuren</span>
          <span style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, color: T.fg, fontSize: 15, fontWeight: 500 }}>Vragen stellen</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: T.mutedFg }}>Deel:</span>
        {["Tekening", "Offerte", "OB", "Factuur", "Foto"].map((c) => (
          <span key={c} style={{ fontSize: 13, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>{c}</span>
        ))}
      </div>
    </div>
  </div>
);

export const Scene08CockpitTour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scroll = interpolate(frame, [SCROLL_FROM, SCROLL_TO], [0, SCROLL_MAX], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const browserPop = popIn(frame, fps, { delay: 0, from: 0.97 });
  const scrim = interpolate(frame, [ACTIES_START, ACTIES_START + 16], [0, 0.66], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  // Intro-caption tijdens de openings-scroll: maakt duidelijk dat je een
  // project-overzicht opent. Fade weg voordat de eerste highlight start.
  const introOp = interpolate(frame, [10, 30, 120, 138], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const introY = interpolate(frame, [10, 30], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  // Per highlight: pop-in, en uitfaden zodra de volgende start.
  const fase = (start: number, next?: number) => {
    const inS = popIn(frame, fps, { delay: start + 2, from: 0.9 });
    const out = next ? interpolate(frame, [next, next + 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }) : 1;
    return { ...inS, opacity: (inS.opacity as number) * out };
  };

  const Label: React.FC<{ eyebrow: string; titel: React.ReactNode }> = ({ eyebrow, titel }) => (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
        {eyebrow}
      </div>
      <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 52, letterSpacing: "-0.02em", color: "#fff", marginBottom: 40 }}>{titel}</div>
    </>
  );

  return (
    <SceneWrapper center={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={browserPop}>
          <DeviceFrame variant="browser" width={BROWSER_W}>
            <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
              <div style={{ width: 1790, transform: `translateY(${-scroll}px) scale(${SCALE})`, transformOrigin: "top left" }}>
                <ProjectCockpit />
              </div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>

      {/* Intro: er opent een project-overzicht */}
      {frame < 142 && (
        <div style={{ position: "absolute", left: 118, bottom: 92, opacity: introOp, transform: `translateY(${introY}px)` }}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.94)", border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px 30px", boxShadow: "0 28px 64px -22px rgba(120,90,50,0.4)", maxWidth: 520 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 15, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8A8278", marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
              je opent een project
            </div>
            <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 42, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1.05 }}>
              alles in één overzicht<FlameDot />
            </div>
            <div style={{ marginTop: 12, fontSize: 20, color: "#5A554D", lineHeight: 1.45 }}>
              briefing, offerte, klant en planning. op één scherm.
            </div>
          </div>
        </div>
      )}

      {frame >= ACTIES_START && <AbsoluteFill style={{ backgroundColor: `rgba(18,32,36,${scrim})` }} />}

      {/* Acties */}
      {frame >= ACTIES_START && frame < ACTIVITEIT_START + 18 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...fase(ACTIES_START, ACTIVITEIT_START) }}>
            <Label eyebrow="vanuit je project" titel={<>elke volgende stap, één klik<FlameDot /></>} />
            <div style={{ width: 640, borderRadius: 20, boxShadow: RING }}>
              <ActiesPaneel />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Activiteitenlog: alles legt zichzelf vast */}
      {frame >= ACTIVITEIT_START && frame < VERSTUUR_START + 18 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...fase(ACTIVITEIT_START, VERSTUUR_START) }}>
            <Label eyebrow="automatisch bijgehouden" titel={<>elke stap legt zichzelf vast<FlameDot /></>} />
            <div style={{ width: 640, borderRadius: 20, boxShadow: RING }}>
              <ActiviteitPaneel />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Verstuur-keuze */}
      {frame >= VERSTUUR_START && frame < PORTAAL_START + 18 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...fase(VERSTUUR_START, PORTAAL_START) }}>
            <Label eyebrow="verzend je offerte" titel={<>jij kiest hoe je verstuurt<FlameDot /></>} />
            <VerstuurPaneel />
          </div>
        </AbsoluteFill>
      )}

      {/* Portaal */}
      {frame >= PORTAAL_START && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", ...fase(PORTAAL_START) }}>
            <Label eyebrow="het klantportaal" titel={<>je klant keurt online goed<FlameDot /></>} />
            <PortaalPaneel />
          </div>
        </AbsoluteFill>
      )}
    </SceneWrapper>
  );
};
