import type { CSSProperties } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { merk } from "../brand";
import { fonts } from "../fonts";
import { FlameDot } from "../components/FlameDot";
import { SceneWrapper } from "../components/SceneWrapper";
import { fadeUp, popIn } from "../helpers/entrances";
import { T } from "./screens/AppChrome";

// Scene Daan - introductie van de AI-collega, na de workflow. Links wat Daan
// allemaal doet (mails schrijven/beantwoorden, inkoopfacturen uitlezen, projecten
// aanmaken); rechts het chatpaneel dat het live demonstreert.
const PROMPT = "Maak een project voor Hotel De Linde, 3 lichtbakken";
const TYPE_START = 60;
const TYPE_END = 145;
const USER_BUBBLE = 150;
const THINK_START = 168;
const PLAN_START = 224;
const PROJECT_DONE = 282;
const DONE_MSG = 292;

const CAPS = [
  { key: "mailschrijf", label: "Mails schrijven", cap: "concept in seconden", icon: "penmail" },
  { key: "mailbeantwoord", label: "Mails beantwoorden", cap: "Daan stelt een antwoord voor", icon: "reply" },
  { key: "inkoop", label: "Inkoopfacturen uitlezen", cap: "automatisch ingelezen", icon: "scan" },
  { key: "project", label: "Projecten aanmaken", cap: "gewoon even vragen", icon: "folder" },
] as const;
const CAP_AT = [70, 150, 225, 296];

const CAP_PATHS: Record<string, string> = {
  penmail: "M3 6h13v7M3 6l7 5 4-3M16 14l5-5 3 3-5 5h-3v-3z",
  reply: "M9 7L4 12l5 5M4 12h9a6 6 0 0 1 6 6",
  scan: "M4 7V5h3M20 7V5h-3M4 17v2h3M20 17v2h-3M7 9h10v6H7zM9 12h6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM12 11v4M10 13h4",
};

const CapIco: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d={CAP_PATHS[name]} stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Chat-iconen ──
const IcoonSend: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-3-6-7-2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>
);
const IcoonCheck: React.FC = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#3A7D52" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IcoonSpinner: React.FC<{ frame: number }> = ({ frame }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${(frame * 14) % 360}deg)` }}>
    <circle cx="12" cy="12" r="9" stroke="#8A8278" strokeWidth="2.4" opacity="0.25" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke="#8A8278" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const IcoonFolder: React.FC = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke={merk.petrol} strokeWidth="1.7" strokeLinejoin="round" /></svg>
);

const DaanAvatar: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <div style={{ flexShrink: 0, width: size, height: size, borderRadius: "50%", backgroundColor: merk.petrol, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ color: "#fff", fontSize: size * 0.44, fontWeight: 800 }}>D</span>
  </div>
);

const DaanBubble: React.FC<{ children: React.ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ display: "flex", gap: 11, alignItems: "flex-start", ...style }}>
    <DaanAvatar />
    <div style={{ maxWidth: "84%", padding: "12px 16px", fontSize: 19, lineHeight: 1.5, backgroundColor: "#fff", color: T.fg, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(120,90,50,0.06)", borderRadius: 18, borderBottomLeftRadius: 6 }}>
      {children}
    </div>
  </div>
);

export const ChatPaneel: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const typedCount = Math.floor(interpolate(frame, [TYPE_START, TYPE_END], [0, PROMPT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const aanHetTypen = frame >= TYPE_START && frame < USER_BUBBLE;
  const getypt = aanHetTypen ? PROMPT.slice(0, typedCount) : "";
  const cursor = aanHetTypen && Math.floor(frame / 8) % 2 === 0 ? "|" : "";
  const klaar = frame >= PROJECT_DONE;

  return (
    <div style={{ width: 580, height: 760, display: "flex", flexDirection: "column", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 24px 60px -18px rgba(120,90,50,0.30)", overflow: "hidden", backgroundColor: T.card }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: `linear-gradient(135deg, ${merk.petrol} 0%, #143F46 100%)` }}>
        <div style={{ position: "relative", width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>D</span>
          <span style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", backgroundColor: merk.flame, border: `2px solid ${merk.petrol}` }} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Daan<span style={{ color: merk.flame }}>.</span></div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>je digitale collega</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, backgroundColor: T.card }}>
        <DaanBubble>Hoi, ik ben <strong>Daan</strong>. Vraag me iets aan te maken, op te zoeken of te schrijven.</DaanBubble>

        {frame >= USER_BUBBLE && (
          <div style={{ display: "flex", justifyContent: "flex-end", ...popIn(frame, fps, { delay: USER_BUBBLE, from: 0.92 }) }}>
            <div style={{ maxWidth: "84%", padding: "12px 16px", fontSize: 19, lineHeight: 1.5, backgroundColor: merk.petrol, color: "#fff", borderRadius: 18, borderBottomRightRadius: 6 }}>{PROMPT}</div>
          </div>
        )}

        {frame >= THINK_START && frame < PLAN_START && (
          <DaanBubble>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, color: T.mutedFg, fontSize: 17 }}>
              <span style={{ display: "inline-flex", gap: 5 }}>
                {[0, 1, 2].map((i) => {
                  const p = (((frame - i * 5) % 20) + 20) % 20;
                  return <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "rgba(138,130,120,0.6)", transform: `translateY(${Math.sin((p / 20) * Math.PI) * -5}px)` }} />;
                })}
              </span>
              Daan denkt na…
            </span>
          </DaanBubble>
        )}

        {frame >= PLAN_START && (
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", ...popIn(frame, fps, { delay: PLAN_START, from: 0.94 }) }}>
            <DaanAvatar />
            <div style={{ flex: 1, backgroundColor: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, borderBottomLeftRadius: 6, padding: "8px 16px", boxShadow: "0 1px 3px rgba(120,90,50,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: klaar ? "#E8F2EC" : T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {klaar ? <IcoonCheck /> : <IcoonSpinner frame={frame} />}
                </div>
                <IcoonFolder />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.fg }}>Project</div>
                  <div style={{ fontSize: 14, color: T.mutedFg }}>Hotel De Linde</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: klaar ? "#3A7D52" : T.mutedFg }}>{klaar ? "klaar" : "bezig"}</span>
              </div>
            </div>
          </div>
        )}

        {frame >= DONE_MSG && (
          <div style={popIn(frame, fps, { delay: DONE_MSG, from: 0.96 })}>
            <DaanBubble>Klaar. Het project staat in je overzicht.</DaanBubble>
          </div>
        )}
      </div>

      <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, backgroundColor: T.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, padding: "11px 14px", fontSize: 18, backgroundColor: T.muted, borderRadius: 10, border: `1px solid ${T.border}`, color: getypt ? T.fg : "rgba(138,130,120,0.8)", whiteSpace: "nowrap", overflow: "hidden" }}>
            {getypt ? `${getypt}${cursor}` : "Zeg het tegen Daan…"}
          </div>
          <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, backgroundColor: merk.flame, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(223,92,54,0.25)" }}><IcoonSend /></div>
        </div>
      </div>
    </div>
  );
};

export const Scene03DaanOfferte: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intro = fadeUp(frame, fps, { delay: 0, distance: 20 });
  const activeCap = CAP_AT.filter((t) => frame >= t).length - 1;

  return (
    <SceneWrapper center={false}>
      {/* Links: intro + capabilities */}
      <div style={{ position: "absolute", left: 110, top: "50%", transform: "translateY(-50%)", width: 740 }}>
        <div style={{ ...intro }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8A8278", marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: merk.flame }} />
            maak kennis met Daan
          </div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 58, letterSpacing: "-0.02em", color: merk.ink, lineHeight: 1.04 }}>
            je digitale<br />collega<FlameDot />
          </div>
          <div style={{ marginTop: 18, fontSize: 28, fontWeight: 600, color: merk.ink, lineHeight: 1.35, maxWidth: 580 }}>
            AI als <span style={{ color: merk.petrol, fontWeight: 700 }}>werkwoord</span>, niet als <span style={{ color: "#A7A096" }}>toverwoord</span><FlameDot />
          </div>
          <div style={{ marginTop: 12, fontSize: 21, color: "#5A554D", maxWidth: 560, lineHeight: 1.5 }}>
            Vraag het gewoon. Daan regelt het werk eromheen.
          </div>
          <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 9, padding: "8px 16px", borderRadius: 999, border: `1px solid ${T.border}`, backgroundColor: "#fff", fontSize: 16, color: T.mutedFg, boxShadow: "0 1px 3px rgba(120,90,50,0.05)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.7L19.5 10l-5.7 1.3L12 17l-1.8-5.7L4.5 10l5.7-1.3L12 3z" fill={merk.flame} /></svg>
            powered by <strong style={{ color: merk.petrol, fontWeight: 700 }}>Claude</strong>
          </div>
          <div style={{ marginTop: 12, fontSize: 15, color: T.mutedFg, maxWidth: 520, lineHeight: 1.5 }}>
            Krachtige modellen onder de motorkap. Alleen waar het écht telt.
          </div>
        </div>

        <div style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 22 }}>
          {CAPS.map((c, i) => {
            const isActive = i === activeCap;
            const done = i < activeCap;
            const rij = fadeUp(frame, fps, { delay: 24 + i * 8, distance: 16 });
            const kleurCirkel = done || isActive ? merk.petrol : "#FFFFFF";
            const border = done || isActive ? merk.petrol : "#C7D2D0";
            const ico = done || isActive ? "#FFFFFF" : "#A7B4B2";
            const lab = isActive ? merk.ink : done ? merk.petrol : "#8A8278";
            return (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 18, ...rij }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 15,
                    backgroundColor: kleurCirkel,
                    border: `2px solid ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transform: `scale(${isActive ? 1.08 : 1})`,
                    boxShadow: isActive ? `0 0 0 6px ${merk.flame}22` : "none",
                  }}
                >
                  <CapIco name={c.icon} color={ico} />
                </div>
                <div>
                  <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 28, color: lab, lineHeight: 1 }}>
                    {c.label}<span style={{ color: merk.flame }}>.</span>
                  </div>
                  <div style={{ fontSize: 17, color: isActive ? "#5A554D" : "#9AA0A0", marginTop: 4 }}>{c.cap}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rechts: chatpaneel */}
      <div style={{ position: "absolute", right: 130, top: "50%", transform: "translateY(-50%)" }}>
        <div style={popIn(frame, fps, { delay: 6, from: 0.96 })}>
          <ChatPaneel frame={frame} fps={fps} />
        </div>
      </div>
    </SceneWrapper>
  );
};
