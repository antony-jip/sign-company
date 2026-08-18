import { Img, staticFile } from "remotion";
import { merk } from "../../brand";
import { fonts } from "../../fonts";

// Gedeelde tokens + chrome voor de geporte app-schermen (montage). Shadcn-tokens
// vertaald naar expliciete waarden, zodat alle schermen cohesief als doen. lezen.
export const T = {
  fg: merk.ink,
  mutedFg: "#8A8278",
  page: "#F4F3F0",
  card: "#FFFFFF",
  border: "#EAE7E1",
  muted: "#F4F2EE",
  petrol: merk.petrol,
  petrolDark: "#143F46",
  flame: merk.flame,
};

const NAV = ["Dashboard", "Projecten", "Taken", "Offertes", "Planning", "Werkbonnen", "Email", "Overig"];

export const TopNav: React.FC<{ active: string; gebruiker?: string; initiaal?: string }> = ({ active, gebruiker = "Remco", initiaal = "R" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 26px", height: 60, backgroundColor: T.card, borderBottom: `1px solid ${T.border}` }}>
    <Img src={staticFile("logos/doen-logo.svg")} style={{ width: 74 }} />
    <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 15 }}>
      {NAV.map((n) => {
        const act = n === active;
        return (
          <span key={n} style={{ fontWeight: act ? 700 : 500, color: act ? T.fg : T.mutedFg }}>
            {n}
            {act && <span style={{ color: T.flame }}>.</span>}
          </span>
        );
      })}
    </div>
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 240, height: 36, borderRadius: 10, backgroundColor: T.muted, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 14px", color: T.mutedFg, fontSize: 14 }}>Zoeken…</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999, backgroundColor: T.flame, color: "#fff", fontSize: 12, fontWeight: 600 }}>5 nieuwe notificaties</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 11px 4px 4px", borderRadius: 999, border: `1px solid ${T.border}` }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: T.petrol, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{initiaal}</div>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.fg }}>{gebruiker}</span>
      </div>
    </div>
  </div>
);

export const TabStrip: React.FC<{ active: string }> = ({ active }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 26px", height: 44, backgroundColor: T.card, borderBottom: `1px solid ${T.border}`, fontSize: 14 }}>
    {["Offertes", "Werkbonnen", "Facturen", "Projecten", "Email"].map((t) => (
      <span key={t} style={{ color: T.mutedFg }}>{t}</span>
    ))}
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 8, border: `1px solid ${T.border}`, color: T.fg, fontWeight: 600, fontFamily: fonts.body }}>
      {active} <span style={{ color: T.mutedFg }}>×</span>
    </span>
  </div>
);
