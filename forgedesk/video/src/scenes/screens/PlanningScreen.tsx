import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geporte Planning-week (forgedesk MontagePlanningLayout). Verzonnen, on-brand
// montage-opdrachten voor een signbedrijf. Statische schil voor de montage.
const TE_PLANNEN = [
  { t: "Gevelletters vervangen", k: "Bouwbedrijf Veld" },
  { t: "Lichtbak entree", k: "Hotel De Linde" },
  { t: "Raamfolie belettering", k: "Tandartspraktijk Noord" },
  { t: "Bewegwijzering hal", k: "Sporthal De Veluwe" },
  { t: "Zuil herstellen", k: "Garage Brinkman" },
  { t: "Vlaggen + banieren", k: "Evenementhal" },
];
const DAGEN = [
  { d: "Maandag", n: "1 jun", weer: "21°" },
  { d: "Dinsdag", n: "2 jun", weer: "23°" },
  { d: "Woensdag", n: "3 jun", weer: "20°" },
  { d: "Donderdag", n: "4 jun", weer: "18°" },
  { d: "Vrijdag", n: "5 jun", weer: "16°" },
];
const BLOKKEN: Record<number, { t: string; k: string; tijd: string }[]> = {
  0: [{ t: "Montage: Lichtbak gevel", k: "Hotel De Linde", tijd: "09:30 – 11:00" }],
  1: [{ t: "Montage: Gevelletters", k: "Bouwbedrijf Veld", tijd: "09:00 – 12:00" }],
  2: [{ t: "Montage: Bewegwijzering", k: "Sporthal De Veluwe", tijd: "09:00 – 16:00" }],
  3: [{ t: "Montage: Raamfolie", k: "Tandartspraktijk Noord", tijd: "09:00 – 13:00" }],
};

export const PlanningScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Planning" />
    <TabStrip active="Planning" />
    <div style={{ display: "flex" }}>
      {/* Te plannen */}
      <div style={{ width: 260, flexShrink: 0, backgroundColor: T.card, borderRight: `1px solid ${T.border}`, padding: "18px 16px", height: 760 }}>
        <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 18, color: T.fg, marginBottom: 4 }}>
          Planning<span style={{ color: T.flame }}>.</span> <span style={{ fontFamily: fonts.mono, fontSize: 14, color: T.mutedFg }}>27</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.flame, margin: "14px 0 10px" }}>TE PLANNEN · 6</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TE_PLANNEN.map((p) => (
            <div key={p.t} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, backgroundColor: "#fff" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>{p.t}</div>
              <div style={{ fontSize: 13, color: T.mutedFg, marginTop: 2 }}>{p.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekgrid */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Filterbalk */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: `1px solid ${T.border}` }}>
          {["Iedereen", "Mijn week", "Jos Bootsma"].map((f, i) => (
            <span key={f} style={{ fontSize: 14, fontWeight: i === 2 ? 700 : 500, color: i === 2 ? T.fg : T.mutedFg, padding: "5px 12px", borderRadius: 8, border: i === 2 ? `1px solid ${T.border}` : "none" }}>{f}</span>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, padding: 3, borderRadius: 9, backgroundColor: T.muted }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.fg, padding: "4px 12px", borderRadius: 7, backgroundColor: "#fff" }}>Week</span>
            <span style={{ fontSize: 13, color: T.mutedFg, padding: "4px 12px" }}>Maand</span>
          </div>
        </div>
        {/* Dagkolommen */}
        <div style={{ display: "grid", gridTemplateColumns: "70px repeat(5, 1fr)" }}>
          <div style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, height: 56 }} />
          {DAGEN.map((d) => (
            <div key={d.d} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: "8px 12px" }}>
              <div style={{ fontSize: 11, color: T.mutedFg }}>☁ {d.weer}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{d.d} <span style={{ color: T.mutedFg, fontWeight: 500 }}>{d.n}</span></div>
            </div>
          ))}
          {/* tijdrijen */}
          {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"].map((tijd, row) => (
            <>
              <div key={`t${tijd}`} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, height: 100, fontSize: 12, color: T.mutedFg, padding: "6px 8px", textAlign: "right" }}>{tijd}</div>
              {DAGEN.map((_, col) => {
                const blok = row === 1 ? BLOKKEN[col] : undefined;
                return (
                  <div key={`c${tijd}-${col}`} style={{ borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, height: 100, padding: 4, position: "relative" }}>
                    {blok?.map((b) => (
                      <div key={b.t} style={{ position: "absolute", inset: "4px", borderRadius: 8, backgroundColor: "#E2F0F0", borderLeft: `3px solid ${merk.petrol}`, padding: "8px 10px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: merk.petrol }}>{b.t}</div>
                        <div style={{ fontSize: 11, color: "#4A6B70" }}>{b.k}</div>
                        <div style={{ fontSize: 11, fontFamily: fonts.mono, color: "#4A6B70", marginTop: 2 }}>{b.tijd}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  </div>
);
