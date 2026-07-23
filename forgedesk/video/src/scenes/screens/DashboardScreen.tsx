import type { CSSProperties, ReactNode } from "react";
import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav } from "./AppChrome";

// Geport doen.-dashboard (forgedesk home), rijk gevuld met demo-data die
// consistent is met de rest van de video (Remco, fictieve signbedrijf-data). Ontworpen
// op 1790px breedte zodat het in de browser-frame meeschaalt zoals de andere
// schermen. Dit is de "alles op één plek"-onthulling van scene 2.
const SAGE = "#3A7D52";
const MIST = "#3A5A9A";
const CORAL = "#C0451A";
const PETROL = merk.petrol;
const FLAME = merk.flame;

const IC = {
  mail: "M3 6h18v12H3V6zM4 7l8 6 8-6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  check: "M20 7L9 18l-5-5",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6",
  doc: "M7 3h8l4 4v14H7V3zM15 3v4h4",
  box: "M4 5h16v16H4zM8 13l3 3 6-7",
  cloud: "M7 17h9a3.5 3.5 0 000-7 5 5 0 00-9.6 1.2A3 3 0 007 17z",
  sun: "M12 4V2M12 22v-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M4 12H2M22 12h-2M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9",
  chevL: "M15 6l-6 6 6 6",
  chevR: "M9 6l6 6-6 6",
};

const Ico: React.FC<{ d: string; c?: string; s?: number; w?: number }> = ({ d, c = T.mutedFg, s = 20, w = 1.7 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Av: React.FC<{ t: string; bg?: string; fg?: string; s?: number }> = ({ t, bg = "#E8F2EC", fg = SAGE, s = 34 }) => (
  <div style={{ width: s, height: s, borderRadius: "50%", backgroundColor: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * 0.38, fontWeight: 700, flexShrink: 0 }}>{t}</div>
);

const Spark: React.FC<{ c: string }> = ({ c }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 26 }}>
    {[9, 13, 10, 16, 13, 19, 16, 24].map((h, i) => (
      <div key={i} style={{ width: 5, height: h, borderRadius: 2, backgroundColor: c, opacity: 0.3 + i * 0.085 }} />
    ))}
  </div>
);

// kaart-skelet
const Card: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 20, ...style }}>{children}</div>
);

// sectiekop met flame-punt + cursieve mono-suffix (zoals "Deze week. · week 23")
const Kop: React.FC<{ t: string; suffix?: string; right?: ReactNode; size?: number }> = ({ t, suffix, right, size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: size, letterSpacing: "-0.01em", color: T.fg }}>
        {t}<span style={{ color: FLAME }}>.</span>
      </span>
      {suffix && <span style={{ fontStyle: "italic", fontSize: size * 0.66, color: T.mutedFg }}>{suffix}</span>}
    </div>
    {right}
  </div>
);

const VERWACHT = [
  { dag: "MORGEN", t: "16°" },
  { dag: "OVERMORGEN", t: "17°" },
  { dag: "ZA 6", t: "19°" },
  { dag: "ZO 7", t: "19°" },
  { dag: "MA 8", t: "20°" },
];

// Verzonnen demo-data — geen echte klanten of bedrijfscijfers.
const TAKEN = [
  ["Designs maken", "Gevelreclame vernieuwen"],
  ["Offerte maken", "Lichtbak sportschool"],
  ["Inplannen", "6 reclameborden"],
  ["Bestickering", "Bedrijfsbus garage"],
  ["Vlaggen ontwerpen", ""],
];

const OPVOLGEN = [
  ["Bakkerij De Korenbloem", "OFF-2026-019", "€ 1.620,00", "28 dagen."],
  ["Garage Van Dijk", "OFF-2026-157", "€ 615,20", "22 dagen."],
  ["Fysio Centraal", "OFF-2026-163", "€ 6.553,48", "20 dagen."],
  ["Sportschool Vital", "OFF-2026-154", "€ 10.850,00", "20 dagen."],
  ["Hotel De Linde", "OFF-2026-165", "€ 198,00", "18 dagen."],
];

const ACTIVITEIT: [string, string, string, string][] = [
  [IC.send, "Offerte verstuurd", "Bakkerij De Korenbloem", "ongeveer 14 uur"],
  [IC.send, "Offerte verstuurd", "Garage Van Dijk", "ongeveer 15 uur"],
  [IC.check, "Akkoord ontvangen", "Hotel De Linde", "ongeveer 18 uur"],
  [IC.eye, "Offerte bekeken", "Hotel De Linde", "ongeveer 18 uur"],
];

const GEDAAN: [string, string, string, string, string][] = [
  ["KW", "#E8EEF9", MIST, "Offerte verstuurd · Bak…", "ongeveer 14 uur"],
  ["YA", "#E8F2EC", SAGE, "Montage afgerond · Sp…", "ongeveer 15 uur"],
  ["CO", "#FDE8E4", CORAL, "Offerte verstuurd · Gar…", "ongeveer 15 uur"],
];

export const DashboardScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body, color: T.fg }}>
    <TopNav active="Dashboard" gebruiker="Remco" initiaal="R" />
    {/* Tabbalk met geopende vensters */}
    <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 26px", height: 44, backgroundColor: T.card, borderBottom: `1px solid ${T.border}`, fontSize: 14 }}>
      {["Offertes", "Werkbonnen", "Facturen", "Projecten", "Email", "Offerte", "Offertes"].map((t, i) => (
        <span key={i} style={{ color: T.mutedFg }}>{t}</span>
      ))}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "6px 13px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.fg, fontWeight: 600 }}>
        Dashboard <span style={{ color: T.mutedFg }}>×</span>
      </span>
      <span style={{ color: T.mutedFg }}>+</span>
    </div>

    <div style={{ display: "flex", gap: 24, padding: "26px 32px" }}>
      {/* Hoofdkolom */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Hero-banner */}
        <div style={{ display: "flex", borderRadius: 22, overflow: "hidden", backgroundColor: PETROL, color: "#fff", minHeight: 196 }}>
          <div style={{ flex: 1, padding: "30px 34px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontFamily: fonts.mono, fontSize: 14, letterSpacing: "0.14em", color: "rgba(255,255,255,0.7)", marginBottom: 18 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: FLAME }} />
              WOENSDAG 3 JUNI
            </div>
            <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 54, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              Klaar om te <span style={{ fontStyle: "italic" }}>beginnen</span>, Remco<span style={{ color: FLAME }}>.</span>
            </div>
          </div>
          <div style={{ width: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
          <div style={{ width: 470, padding: "26px 30px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Ico d={IC.cloud} c="rgba(255,255,255,0.85)" s={34} w={1.6} />
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 40 }}>15°</span>
              <span style={{ fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.88)" }}>Helder maar trui aan.</span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "4px 0 16px 48px" }}>Wisselend bewolkt</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Ico d={IC.chevL} c="rgba(255,255,255,0.45)" s={18} />
              <div style={{ display: "flex", gap: 18, flex: 1, justifyContent: "space-between" }}>
                {VERWACHT.map((v) => (
                  <div key={v.dag} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{v.dag}</div>
                    <Ico d={IC.cloud} c="rgba(255,255,255,0.6)" s={18} w={1.6} />
                    <div style={{ fontSize: 15, marginTop: 4 }}>{v.t}</div>
                  </div>
                ))}
              </div>
              <Ico d={IC.chevR} c="rgba(255,255,255,0.45)" s={18} />
            </div>
          </div>
        </div>

        {/* KPI-rij */}
        <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
          <Card style={{ flex: 1, padding: 22, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico d={IC.mail} c={T.mutedFg} s={22} />
              </div>
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 15, color: T.fg }}>DOEN<span style={{ color: FLAME }}>.</span></span>
            </div>
            <div style={{ fontStyle: "italic", fontSize: 16, color: "#6A645B", lineHeight: 1.4, margin: "16px 0 18px" }}>Wacht-op-reactie-vlag laat geen offerte vergeten. Doen ze.</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.mutedFg, marginBottom: 7 }}>
              <span style={{ letterSpacing: "0.08em" }}>SALES</span>
              <span style={{ fontFamily: fonts.mono }}>23/33</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, backgroundColor: T.muted, overflow: "hidden" }}>
              <div style={{ width: "70%", height: "100%", backgroundColor: FLAME, borderRadius: 3 }} />
            </div>
          </Card>

          {[
            { label: "IN PIJPLIJN", bedrag: "€ 42.350,00", sub: "14 offertes", c: PETROL },
            { label: "DEZE WEEK", bedrag: "€ 9.480,00", sub: "11 montages", c: SAGE },
          ].map((k) => (
            <Card key={k.label} style={{ flex: 1, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico d={k.label === "IN PIJPLIJN" ? IC.doc : IC.check} c={k.c} s={22} />
                </div>
                <span style={{ fontFamily: fonts.mono, fontSize: 13, letterSpacing: "0.08em", color: T.mutedFg }}>{k.label}</span>
              </div>
              <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 38, color: T.fg, marginTop: 16, letterSpacing: "-0.01em" }}>{k.bedrag}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                <span style={{ fontSize: 15, color: T.mutedFg }}>{k.sub}</span>
                <Spark c={k.c} />
              </div>
            </Card>
          ))}
        </div>

        {/* Vandaag + Opvolgen */}
        <div style={{ display: "flex", gap: 22, marginTop: 22, alignItems: "flex-start" }}>
          {/* Vandaag */}
          <Card style={{ flex: 1, padding: 24 }}>
            <Kop t="Vandaag" suffix="wat staat er klaar" right={<span style={{ fontSize: 15, color: T.mutedFg }}>5 taken</span>} />
            <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: T.muted, borderRadius: 12, marginBottom: 18 }}>
              {["Ma", "Di", "Vandaag", "Do", "Vr"].map((d) => {
                const act = d === "Vandaag";
                return (
                  <span key={d} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 9, fontSize: 15, fontWeight: act ? 700 : 500, color: act ? "#fff" : T.mutedFg, backgroundColor: act ? PETROL : "transparent" }}>{d}</span>
                );
              })}
            </div>
            {TAKEN.map(([titel, sub], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}>
                <Ico d={IC.box} c="#B7B1A6" s={26} w={1.5} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: T.fg }}>{titel}</div>
                  {sub && <div style={{ fontSize: 14, color: T.mutedFg, marginTop: 2 }}>{sub}</div>}
                </div>
                <Av t="RM" s={32} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <div style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: T.muted, display: "flex", alignItems: "center", padding: "0 16px", color: T.mutedFg, fontSize: 15 }}>+ Nieuwe taak voor vandaag…</div>
              <span style={{ marginLeft: 16, fontSize: 15, fontWeight: 600, color: PETROL }}>Volledige planning →</span>
            </div>
          </Card>

          {/* Opvolgen */}
          <Card style={{ width: 470, padding: 24 }}>
            <Kop t="Opvolgen" suffix="wacht op antwoord" right={<span style={{ fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg }}>€ 19.836,68 in de pijplijn</span>} />
          {/* som = optelling van de demo-regels hieronder */}
            {OPVOLGEN.map(([naam, nr, bedrag, dagen], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210 }}>{naam}</div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg, marginTop: 3 }}>{nr}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: fonts.mono, fontSize: 16, color: T.fg }}>{bedrag}</div>
                  <div style={{ fontSize: 14, color: CORAL, marginTop: 3 }}>{dagen}</div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "right", marginTop: 14, fontSize: 15, fontWeight: 600, color: PETROL }}>Alle offertes →</div>
          </Card>
        </div>
      </div>

      {/* Rechter zijbalk */}
      <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Deze week */}
        <Card style={{ padding: 22 }}>
          <Kop t="Deze week" suffix="week 23" size={20} right={
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg }}>
              <Ico d={IC.chevL} s={15} /> JUNI 2026 <Ico d={IC.chevR} s={15} />
            </span>
          } />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: T.mutedFg, marginRight: 4 }}>Iedereen</span>
            <Av t="RM" s={30} />
            <Av t="JB" s={30} bg="#E8EEF9" fg={MIST} />
            <Av t="LB" s={30} bg="#F2EAE0" fg="#9A6A3A" />
            <span style={{ fontSize: 13, color: T.mutedFg }}>+1 ⌄</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg, marginBottom: 8 }}>
            {["M", "D", "W", "D", "V", "Z", "Z"].map((d, i) => <span key={i} style={{ width: 34, textAlign: "center" }}>{d}</span>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const act = d === 3;
              return (
                <span key={d} style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: act ? 700 : 500, color: act ? "#fff" : T.fg, backgroundColor: act ? PETROL : "transparent" }}>{d}</span>
              );
            })}
          </div>
          <div style={{ fontSize: 14, color: T.mutedFg }}>Geen afspraken deze week.</div>
        </Card>

        {/* Activiteit */}
        <Card style={{ padding: 22 }}>
          <Kop t="Activiteit" suffix="portaal-logs" size={20} />
          {ACTIVITEIT.map(([icon, titel, sub, tijd], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}>
              <Ico d={icon} c={icon === IC.check ? SAGE : icon === IC.eye ? T.mutedFg : PETROL} s={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>{titel}</div>
                <div style={{ fontSize: 13, color: T.mutedFg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
              </div>
              <span style={{ fontSize: 12, color: T.mutedFg, whiteSpace: "nowrap" }}>{tijd}</span>
            </div>
          ))}
        </Card>

        {/* Gedaan */}
        <Card style={{ padding: 22 }}>
          <Kop t="Gedaan" suffix="team-log" size={20} right={<span style={{ fontSize: 13, color: SAGE }}>2 actief</span>} />
          {GEDAAN.map(([init, bg, fg, sub, tijd], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}>
              <Av t={init} s={30} bg={bg} fg={fg} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.mutedFg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
              </div>
              <span style={{ fontSize: 12, color: T.mutedFg, whiteSpace: "nowrap" }}>{tijd}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  </div>
);
