import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk, modules } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { DeviceFrame } from "../components/DeviceFrame";
import { popIn } from "../helpers/entrances";
import { FactuurScreen } from "./screens/FactuurScreen";
import { T } from "./screens/AppChrome";

// Feature-beat vlak voor de prijs, in dezelfde highlight-stijl als de cockpit-
// tour: gedimde factuur-app, gecentreerde kop, en een kaart die de offerte->
// factuur->Exact-sync toont (one-way: doen. -> Exact). Laat aan het eind los naar
// de lichte app voor een schone overgang naar de import-scene.
const GROEN = modules.facturen.kleur;
const BROWSER_W = 1560;
const VIEWPORT_H = 824;
const SCALE = BROWSER_W / 1790;
const EASE = Easing.inOut(Easing.cubic);
const RING = `0 0 0 4px ${merk.flame}44, 0 40px 80px -24px rgba(0,0,0,0.5)`;

const SYNC_START = 70;
const SYNC_DONE = 116;
const EIND = 178; // begin van de licht-release

const Vink: React.FC<{ c?: string; s?: number }> = ({ c = GROEN, s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Spinner: React.FC<{ frame: number }> = ({ frame }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${(frame * 13) % 360}deg)` }}>
    <circle cx="12" cy="12" r="9" stroke="#CFCABF" strokeWidth="2.6" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke={merk.petrol} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);
const Chip: React.FC<{ children: React.ReactNode; tint?: string }> = ({ children, tint = T.mutedFg }) => (
  <span style={{ fontFamily: fonts.mono, fontSize: 14, color: tint, backgroundColor: "#F1EFEA", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 11px" }}>{children}</span>
);

export const ExactKaart: React.FC<{ frame: number }> = ({ frame }) => {
  const fase = frame >= SYNC_DONE ? 2 : frame >= SYNC_START ? 1 : 0;
  const rij = [
    { bg: "#fff", ico: <Vink c={merk.petrol} />, titel: "Klaar om te syncen", sub: "factuurregels · btw · grootboek", actie: "Sync Exact", actieBg: merk.petrol },
    { bg: "#F4F2EE", ico: <Spinner frame={frame} />, titel: "Synchroniseren met Exact…", sub: "factuurregels · btw · grootboek", actie: null, actieBg: "" },
    { bg: "#E4F0EA", ico: <Vink />, titel: "Gesynct met Exact", sub: "je boekhouding is bijgewerkt", actie: "Gesynct", actieBg: GROEN },
  ][fase];
  return (
    <div style={{ width: 680, borderRadius: 20, overflow: "hidden", backgroundColor: T.card, boxShadow: RING, textAlign: "left" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: `linear-gradient(135deg, ${merk.petrol}, #143F46)`, color: "#fff" }}>
        <span style={{ fontSize: 15, letterSpacing: "0.08em", fontWeight: 700 }}>FACTUUR <span style={{ fontWeight: 500, opacity: 0.85 }}>2026117 · vanuit offerte</span></span>
        <span style={{ fontSize: 15, opacity: 0.85 }}>Openen →</span>
      </div>
      {/* body */}
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Chip tint="#C0451A">OFF-2026-0042</Chip>
          <span style={{ color: T.mutedFg, fontSize: 20 }}>→</span>
          <Chip tint={merk.petrol}>Factuur 2026117</Chip>
          <span style={{ fontSize: 15, color: T.mutedFg }}>regels automatisch overgenomen</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderRadius: 12, border: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.fg }}>Hotel De Linde</div>
            <div style={{ fontSize: 14, color: T.mutedFg, marginTop: 2 }}>Apeldoorn · lichtbakken gevel</div>
          </div>
          <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 700, color: T.fg }}>€ 5.142,50</span>
        </div>
        {/* Exact-sync-rij */}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 15, padding: "15px 18px", borderRadius: 12, backgroundColor: rij.bg, border: `1px solid ${T.border}` }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{rij.ico}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.fg }}>{rij.titel}</div>
            <div style={{ fontSize: 14, color: T.mutedFg, marginTop: 2 }}>{rij.sub}</div>
          </div>
          {rij.actie && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, backgroundColor: rij.actieBg, color: "#fff", fontSize: 15, fontWeight: 600 }}>
              {fase === 2 && <Vink c="#fff" s={16} />}{rij.actie}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const Scene10FactuurExact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const browserPop = popIn(frame, fps, { delay: 0, from: 0.97 });
  const scrim = interpolate(frame, [0, 14, EIND, EIND + 16], [0, 0.66, 0.66, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const inhoud = popIn(frame, fps, { delay: 8, from: 0.92 });
  const eindUit = interpolate(frame, [EIND, EIND + 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  return (
    <SceneWrapper center={false}>
      {/* Gedimde factuur-app als context */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={browserPop}>
          <DeviceFrame variant="browser" width={BROWSER_W} url="app.doen.team/facturen/2026117">
            <div style={{ width: BROWSER_W, height: VIEWPORT_H, overflow: "hidden", backgroundColor: "#F4F3F0" }}>
              <div style={{ width: 1790, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
                <FactuurScreen />
              </div>
            </div>
          </DeviceFrame>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: `rgba(18,32,36,${scrim})` }} />

      {/* Gecentreerde highlight: kop + Exact-sync-kaart */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: eindUit }}>
        <div style={{ textAlign: "center", ...inhoud }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            van offerte naar factuur
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 52, letterSpacing: "-0.02em", color: "#fff", marginBottom: 28 }}>
            in één klik gefactureerd<FlameDot />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ExactKaart frame={frame} />
          </div>
        </div>
      </AbsoluteFill>
    </SceneWrapper>
  );
};
