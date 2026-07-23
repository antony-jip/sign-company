import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geport klantportaal-blok (forgedesk PortaalPanel). Verzonnen De Linde-data.
// Statische schil voor de montage.
export const PortaalScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Projecten" />
    <TabStrip active="Project" />
    <div style={{ padding: "26px 32px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: 1100 }}>
        {/* Portaal-balk */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderRadius: 14, background: `linear-gradient(135deg, ${merk.petrol}, ${T.petrolDark})`, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, letterSpacing: "0.08em", fontWeight: 700 }}>
            ⌄ PORTAAL <span style={{ fontWeight: 500, opacity: 0.85 }}>Actief<span style={{ color: merk.flame }}>.</span> · 1 gedeeld</span>
          </div>
          <span style={{ fontSize: 15, opacity: 0.85 }}>Openen →</span>
        </div>

        {/* Tijdlijn */}
        <div style={{ textAlign: "center", margin: "22px 0", fontSize: 13, fontFamily: fonts.mono, color: T.mutedFg, letterSpacing: "0.1em" }}>2 JUN</div>
        <div style={{ fontSize: 14, color: T.mutedFg, marginBottom: 12 }}>● Jij · vandaag 16:01</div>

        {/* Gedeelde offerte-kaart */}
        <div style={{ maxWidth: 560, borderRadius: 14, border: `1px solid ${T.border}`, borderTop: `3px solid ${merk.flame}`, backgroundColor: T.card, padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: merk.flame, marginBottom: 8 }}>OFFERTE</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.fg }}>Offerte OFF-2026-0042</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 24, fontWeight: 700, color: T.fg }}>€ 4.250,00</span>
            <span style={{ fontSize: 15, color: "#3A5A9A" }}>Verstuurd<span style={{ color: merk.flame }}>.</span></span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            <span style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, backgroundColor: "#E8F2EC", color: "#3A7D52", fontSize: 15, fontWeight: 600 }}>Goedkeuren</span>
            <span style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 10, border: `1px solid ${T.border}`, color: T.fg, fontSize: 15, fontWeight: 500 }}>Vragen stellen</span>
          </div>
        </div>

        {/* Composer */}
        <div style={{ marginTop: 24, borderRadius: 14, border: `1px solid ${T.border}`, backgroundColor: T.card, padding: 18 }}>
          <div style={{ fontSize: 15, color: T.mutedFg, paddingBottom: 28 }}>Bericht…</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
            {["Tekening", "Offerte", "OB", "Factuur", "Foto"].map((c) => (
              <span key={c} style={{ fontSize: 13, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>{c}</span>
            ))}
            <span style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 10, backgroundColor: merk.flame, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>➤</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
