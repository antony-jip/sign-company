import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geporte offerte-editor (forgedesk QuoteCreation), rijk gevuld met demo-data
// (De Linde, lichtbakken). Bedragen consistent met de rest van de video.
const GROEN = "#2D7D52";

const VELDEN = [
  ["MATERIAAL", "Aluminium frame + opaal acrylaat, LED"],
  ["AFMETING", "150 × 60 cm — dubbelzijdig"],
  ["MONTAGE", "Inclusief plaatsen op locatie"],
  ["LAY-OUT", "Conform aangeleverd logo"],
];

const SideRij: React.FC<{ l: string; v: string; c?: string; dot?: string; bold?: boolean }> = ({ l, v, c = T.fg, dot, bold }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 16, padding: "3px 0" }}>
    <span style={{ display: "flex", alignItems: "center", gap: 9, color: bold ? T.fg : T.mutedFg, fontWeight: bold ? 700 : 400 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: dot }} />}
      {l}
    </span>
    <span style={{ fontFamily: fonts.mono, color: c, fontWeight: bold ? 700 : 600 }}>{v}</span>
  </div>
);

// `onthul` (0..1, default 1) laat de kaarten gefaseerd binnenkomen; de
// beweging zelf komt van de aanroepende scene (frame-driven), dit scherm
// vertaalt alleen de voortgang naar opacity/translate per sectie.
export const OfferteScreen: React.FC<{ onthul?: number }> = ({ onthul = 1 }) => {
  const seg = (a: number, b: number) => {
    const p = Math.min(1, Math.max(0, (onthul - a) / (b - a)));
    return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
  };
  return (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Offertes" />
    <TabStrip active="Offerte" />
    <div style={{ padding: "24px 32px" }}>
      {/* Kop */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.mutedFg, marginBottom: 8 }}>
            <span>← Offertes</span><span>·</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 13, backgroundColor: "#F1EFEA", border: `1px solid ${T.border}`, borderRadius: 7, padding: "2px 8px" }}>OFF-2026-0042</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 38, letterSpacing: "-0.5px", color: T.fg }}>
              Offerte bewerken<span style={{ color: merk.flame }}>.</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#3A5A9A", backgroundColor: "#E8EEF9", border: "1px solid #C2D0EE", padding: "5px 12px", borderRadius: 999 }}>↗ Verstuurd · 2 jun</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 16, color: T.fg }}>
            <span style={{ fontWeight: 600 }}>Hotel De Linde</span><span style={{ color: T.mutedFg }}> · Apeldoorn · </span><span style={{ color: GROEN }}>✓ Opgeslagen</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ padding: "11px 18px", borderRadius: 10, border: `1px solid ${T.border}`, color: T.fg, fontSize: 15, fontWeight: 600 }}>↓ PDF</span>
          <span style={{ padding: "11px 18px", borderRadius: 10, backgroundColor: merk.petrol, color: "#fff", fontSize: 15, fontWeight: 600 }}>Opslaan</span>
          <span style={{ padding: "11px 18px", borderRadius: 10, backgroundColor: merk.flame, color: "#fff", fontSize: 15, fontWeight: 600 }}>↗ Verstuur</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 22, alignItems: "flex-start" }}>
        {/* Links */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Introductietekst */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, ...seg(0, 0.4) }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 17, color: merk.petrol }}>Introductietekst<span style={{ color: merk.flame }}>.</span></span>
              <span style={{ fontSize: 14, fontStyle: "italic", color: T.mutedFg, marginLeft: 8 }}>optioneel</span>
            </div>
            <div style={{ display: "flex", gap: 9, marginBottom: 12 }}>
              {["Standaard", "Na gesprek", "Bedankt"].map((c, i) => (
                <span key={c} style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? T.fg : T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 999, padding: "6px 14px", backgroundColor: i === 0 ? "#F4F2EE" : "#fff" }}>{c}</span>
              ))}
            </div>
            <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "14px 16px", fontSize: 15, color: T.fg, lineHeight: 1.5 }}>
              Bedankt voor je aanvraag. Hieronder vind je onze offerte voor de drie lichtbakken, op basis van wat we hebben besproken. Vragen of aanpassingen? Laat het weten.
            </div>
          </div>

          {/* Offerte-items */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 22, ...seg(0.18, 0.58) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 17, color: merk.petrol }}>Offerte-items<span style={{ color: merk.flame }}>.</span></span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: merk.flame, backgroundColor: `${merk.flame}14`, borderRadius: 999, padding: "2px 8px" }}>2</span>
            </div>
            {/* item 1 */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: merk.flame, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>1</div>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.fg }}>Lichtbakken gevel De Linde</span>
                <span style={{ marginLeft: "auto", fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: T.fg }}>€ 4.250,00</span>
              </div>
              {VELDEN.map(([l, v]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 0" }}>
                  <span style={{ width: 100, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: T.mutedFg }}>{l}</span>
                  <span style={{ flex: 1, fontSize: 15, color: T.fg, backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.mutedFg }}>Aantal <strong style={{ color: T.fg, fontFamily: fonts.mono }}>3</strong></span>
                <span style={{ fontSize: 13, color: T.mutedFg }}>Prijs <strong style={{ color: T.fg, fontFamily: fonts.mono }}>€ 1.416,67</strong></span>
                <span style={{ fontSize: 13, color: T.mutedFg }}>BTW <strong style={{ color: T.fg, fontFamily: fonts.mono }}>21%</strong></span>
                <span style={{ marginLeft: "auto", fontSize: 13, color: T.mutedFg }}>Totaal <strong style={{ color: T.fg, fontFamily: fonts.mono }}>€ 4.250,00</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, fontSize: 13 }}>
                <span style={{ color: "#3A5A9A" }}>▦ Calculatie: 6 regels — Inkoop € 1.487,50 · Verkoop € 4.250,00</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#B8883A", fontWeight: 600 }}>
                  Marge 65,0%
                  <span style={{ width: 90, height: 6, borderRadius: 3, backgroundColor: "#EFE6D2", overflow: "hidden" }}><span style={{ display: "block", width: "65%", height: "100%", backgroundColor: "#C49A30" }} /></span>
                </span>
              </div>
            </div>
            {/* item 2 collapsed */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", ...seg(0.4, 0.78) }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: merk.flame, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>2</div>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.fg }}>Benaderingsmateriaal</span>
              <span style={{ marginLeft: "auto", fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: T.fg }}>inbegrepen</span>
            </div>
          </div>
        </div>

        {/* Rechts: totaal + marge */}
        <div style={{ width: 380, flexShrink: 0, borderRadius: 18, overflow: "hidden", border: `1px solid ${T.border}`, ...seg(0.55, 1) }}>
          <div style={{ background: `linear-gradient(135deg, ${merk.petrol}, #143F46)`, padding: "22px 22px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)" }}>TOTAAL EX BTW<span style={{ color: merk.flame }}>.</span></div>
            <div style={{ fontFamily: fonts.mono, fontSize: 44, fontWeight: 700, color: "#fff", marginTop: 6 }}>€ 4.250,00</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: fonts.mono, marginTop: 4 }}>incl. btw € 5.142,50</div>
          </div>
          <div style={{ backgroundColor: T.card, padding: "18px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: T.mutedFg }}>SUBTOTAAL</div><div style={{ fontFamily: fonts.mono, fontSize: 17, fontWeight: 600, color: T.fg, marginTop: 3 }}>€ 4.250,00</div></div>
              <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: T.mutedFg }}>BTW</div><div style={{ fontFamily: fonts.mono, fontSize: 17, fontWeight: 600, color: T.fg, marginTop: 3 }}>€ 892,50</div></div>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.mutedFg, marginBottom: 8 }}>INKOOP &amp; VERKOOP<span style={{ color: merk.flame }}>.</span></div>
              <SideRij l="Inkoop" v="€ 1.487,50" c="#C0451A" dot="#C0451A" />
              <SideRij l="Verkoop" v="€ 4.250,00" c={GROEN} dot={GROEN} />
              <SideRij l="Winst" v="€ 2.762,50" c={GROEN} dot={GROEN} bold />
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.mutedFg }}>MARGE<span style={{ color: merk.flame }}>.</span></span>
                <span style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: "#C49A30" }}>65,0%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, backgroundColor: "#EFE6D2", overflow: "hidden" }}><span style={{ display: "block", width: "65%", height: "100%", backgroundColor: "#C49A30" }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
