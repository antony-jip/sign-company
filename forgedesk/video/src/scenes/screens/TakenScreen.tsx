import { interpolate } from "remotion";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Taken-scherm: de Team-swimlane uit de echte app (forgedesk
// TasksLayout.tsx, viewMode === 'swimlane'). Rijen = medewerkers, kolommen
// = MA t/m VR, plus een "Niet toegewezen"-lane onderaan. Kritieke taken
// krijgen een flame-rand/tint (exacte hex uit TasksLayout.tsx
// PRIORITEIT_COLORS), overige taken blijven rustig petrol/blauw.
// Zelf render-puur: alle beweging komt binnen als kant-en-klare
// voortgangs-getallen (0..1) vanuit ModuleTaken, dat frame/fps kent.
const FLAME = "#F15025";
const FLAME_BG = "rgba(241,80,37,0.09)";
const FLAME_TEXT = "#C03A18";
const PETROL = "#1A535C";
const PETROL_BG = "rgba(26,83,92,0.07)";

const DAGEN = ["MA", "DI", "WO", "DO", "VR"];
const DATA = [18, 19, 20, 21, 22];
const VANDAAG = 2; // woensdag

type Taak = { titel: string; sub: string; kritiek?: boolean };
type Lane = { naam: string; init: string; avBg: string; avFg: string; taken: Partial<Record<number, Taak[]>> };

const LANES: Lane[] = [
  {
    naam: "Remco",
    init: "RM",
    avBg: "#E8F2EC",
    avFg: "#3A7D52",
    taken: {
      0: [{ titel: "Materiaal bestellen", sub: "3M-folie · Folie Groothandel" }],
      2: [
        { titel: "Offerte opvolgen", sub: "Jansen Bouw · OFF-2026-0158", kritiek: true },
        { titel: "Klant terugbellen", sub: "Sporthal De Veluwe" },
      ],
    },
  },
  {
    naam: "Jos Bootsma",
    init: "JB",
    avBg: "#E8EEF9",
    avFg: "#3A5A9A",
    taken: {
      2: [{ titel: "Drukproef goedkeuren", sub: "Hotel De Linde · lichtbakken" }],
      3: [{ titel: "Bus inrichten voor montage", sub: "Bouwbedrijf Veld" }],
    },
  },
  {
    naam: "Lars Bakker",
    init: "LB",
    avBg: "#F2EAE0",
    avFg: "#9A6A3A",
    taken: {
      4: [{ titel: "Inkoopfactuur inboeken", sub: "Aluminium Benelux" }],
    },
  },
];

const NIET_TOEGEWEZEN: Partial<Record<number, Taak[]>> = {
  1: [{ titel: "Support-melding checken", sub: "via de website" }],
};

const WrenchIcon: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={T.mutedFg}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Afvinkbare checkbox: rand + vulling worden flame (zoals in TasksLayout
// `data-[state=checked]:bg-flame`). Vinkje tekent zich via
// stroke-dashoffset. `p` is de voortgang (0..1).
const Vink: React.FC<{ p: number }> = ({ p }) => (
  <div
    style={{
      position: "relative",
      width: 15,
      height: 15,
      marginTop: 1,
      borderRadius: 4,
      border: `1.5px solid ${p > 0.05 ? FLAME : "#C9C4BA"}`,
      flexShrink: 0,
      backgroundColor: "#fff",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: FLAME,
        transform: `scale(${Math.min(1, p * 1.4)})`,
        borderRadius: 2,
      }}
    />
    <svg width={13} height={13} viewBox="0 0 20 20" style={{ position: "absolute", left: 0, top: 0 }}>
      <path
        d="M4.5 10.5l3.5 3.5 7-8"
        fill="none"
        stroke="#fff"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.max(0, (p - 0.35) / 0.65)}
      />
    </svg>
  </div>
);

const TaakKaart: React.FC<{ taak: Taak; kritiek: boolean; pulse: number; vinkP: number }> = ({
  taak,
  kritiek,
  pulse,
  vinkP,
}) => {
  const ringOp = interpolate(pulse, [1, 1.09, 1.18], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kleur = kritiek ? FLAME : PETROL;
  const tekst = kritiek ? FLAME_TEXT : PETROL;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        border: `1px solid ${kleur}`,
        borderLeft: `3px solid ${kleur}`,
        backgroundColor: kritiek ? FLAME_BG : PETROL_BG,
        borderRadius: 6,
        padding: "5px 8px 5px 6px",
        marginBottom: 4,
        transform: `scale(${pulse})`,
        boxShadow: ringOp > 0 ? `0 0 0 5px rgba(241,80,37,${ringOp})` : "none",
      }}
    >
      <Vink p={vinkP} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: tekst, opacity: 1 - vinkP * 0.4 }}>{taak.titel}</span>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "55%",
              height: 1.5,
              width: `${Math.min(1, vinkP * 1.2) * 100}%`,
              backgroundColor: "#8A8278",
              borderRadius: 1,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: kritiek ? "rgba(192,58,24,0.75)" : "rgba(26,83,92,0.65)",
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {taak.sub}
        </div>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: kleur, marginTop: 4, flexShrink: 0 }} />
    </div>
  );
};

export type TakenScreenProps = {
  toolbarReveal?: number;
  headerReveal?: number;
  laneReveal?: [number, number, number, number];
  kritiekPulse?: number;
  vinkProgress?: number;
  tellerOpen?: number;
  tellerTotaal?: number;
  tellerPop?: number;
};

export const TakenScreen: React.FC<TakenScreenProps> = ({
  toolbarReveal = 1,
  headerReveal = 1,
  laneReveal = [1, 1, 1, 1],
  kritiekPulse = 1,
  vinkProgress = 0,
  tellerOpen = 4,
  tellerTotaal = 12,
  tellerPop = 1,
}) => {
  return (
    <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
      <TopNav active="Taken" />
      <TabStrip active="Taken" />
      <div style={{ padding: "24px 32px 28px" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 16,
            opacity: toolbarReveal,
            transform: `translateY(${(1 - toolbarReveal) * 10}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 26, letterSpacing: "-0.3px", color: T.fg }}>
              Taken<span style={{ color: T.flame }}>.</span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                fontFamily: fonts.mono,
                fontSize: 14,
                fontWeight: 500,
                color: FLAME,
                backgroundColor: FLAME_BG,
                borderRadius: 999,
                padding: "5px 12px",
                transform: `scale(${tellerPop})`,
              }}
            >
              {tellerOpen}
              <span style={{ opacity: 0.6 }}>/{tellerTotaal}</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            {[
              ["Alle", true],
              ["Project", false],
              ["Los", false],
            ].map(([label, actief]) => (
              <span key={label as string} style={{ fontSize: 13, fontWeight: actief ? 700 : 500, color: actief ? T.fg : T.mutedFg }}>
                {label}
              </span>
            ))}
            <span style={{ width: 1, height: 14, backgroundColor: T.border }} />
            <span style={{ fontSize: 13, color: T.mutedFg, display: "flex", alignItems: "center", gap: 6 }}>
              <WrenchIcon />
              Montage
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 20 }} />

          <div
            style={{
              width: 27,
              height: 27,
              borderRadius: "50%",
              backgroundColor: "rgba(26,83,92,0.10)",
              color: PETROL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            JB
          </div>

          <div style={{ fontSize: 12.5, color: T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", flexShrink: 0, whiteSpace: "nowrap" }}>
            Alle medewerkers <span style={{ fontSize: 10 }}>⌄</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            {[
              ["Week", false],
              ["Maand", false],
              ["Team", true],
            ].map(([label, actief]) => (
              <span key={label as string} style={{ fontSize: 13, fontWeight: actief ? 700 : 500, color: actief ? PETROL : T.mutedFg }}>
                {label}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.fg, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
            <span style={{ color: T.mutedFg }}>‹</span> 18 – 22 mei <span style={{ color: T.mutedFg }}>›</span>
          </div>
        </div>

        {/* Swimlane-grid */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", backgroundColor: T.card }}>
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${T.border}`,
              opacity: headerReveal,
              transform: `translateY(${(1 - headerReveal) * 6}px)`,
            }}
          >
            <div style={{ width: 190, flexShrink: 0, padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.mutedFg }}>
              MEDEWERKER
            </div>
            {DAGEN.map((d, i) => {
              const isToday = i === VANDAAG;
              return (
                <div key={d} style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "9px 0", borderLeft: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: isToday ? PETROL : T.mutedFg }}>
                    {d}
                    {isToday && <span style={{ color: FLAME }}>.</span>}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                    {isToday ? (
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: PETROL,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {DATA[i]}
                      </span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{DATA[i]}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {LANES.map((lane, i) => {
            const totaal = Object.values(lane.taken).reduce((s, arr) => s + (arr?.length ?? 0), 0);
            const r = laneReveal[i];
            return (
              <div key={lane.naam} style={{ display: "flex", borderBottom: `1px solid ${T.border}`, opacity: r, transform: `translateY(${(1 - r) * 8}px)` }}>
                <div style={{ width: 190, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRight: `1px solid ${T.border}` }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      backgroundColor: lane.avBg,
                      color: lane.avFg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10.5,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {lane.init}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lane.naam}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10.5, fontFamily: fonts.mono, color: T.mutedFg }}>{totaal}</span>
                </div>
                {DAGEN.map((_, dagIdx) => (
                  <div
                    key={dagIdx}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderLeft: `1px solid ${T.border}`,
                      padding: 8,
                      backgroundColor: dagIdx === VANDAAG ? "rgba(26,83,92,0.03)" : "transparent",
                    }}
                  >
                    {(lane.taken[dagIdx] ?? []).map((t) => (
                      <TaakKaart key={t.titel} taak={t} kritiek={!!t.kritiek} pulse={t.kritiek ? kritiekPulse : 1} vinkP={t.kritiek ? vinkProgress : 0} />
                    ))}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Niet toegewezen */}
          <div style={{ display: "flex", opacity: laneReveal[3], transform: `translateY(${(1 - laneReveal[3]) * 8}px)` }}>
            <div style={{ width: 190, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRight: `1px solid ${T.border}` }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  backgroundColor: FLAME_BG,
                  color: FLAME_TEXT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ?
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: FLAME_TEXT }}>Niet toegewezen</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontFamily: fonts.mono, color: T.mutedFg }}>
                {NIET_TOEGEWEZEN[1]?.length ?? 0}
              </span>
            </div>
            {DAGEN.map((_, dagIdx) => (
              <div
                key={dagIdx}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: `1px solid ${T.border}`,
                  padding: 8,
                  backgroundColor: dagIdx === VANDAAG ? "rgba(26,83,92,0.03)" : "transparent",
                }}
              >
                {(NIET_TOEGEWEZEN[dagIdx] ?? []).map((t) => (
                  <TaakKaart key={t.titel} taak={t} kritiek={false} pulse={1} vinkP={0} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
