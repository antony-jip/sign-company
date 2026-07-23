import { merk, modules } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geporte factuur-editor (forgedesk FactuurEditor) conform screenshot. Verzonnen
// De Linde-data; bedragen consistent met offerte/factuur-thread.
const GROEN = modules.facturen.kleur; // #2D6B48
const FACTNR = "2026117";

const Kaart: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>{children}</div>
);
const KaartTitel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 16, color: merk.petrol, marginBottom: 14 }}>{children}</div>
);
const Veld: React.FC<{ label: string; value: string; w?: number | string }> = ({ label, value, w = "100%" }) => (
  <div style={{ width: w }}>
    <div style={{ fontSize: 12, color: T.mutedFg, marginBottom: 5 }}>{label}</div>
    <div style={{ height: 42, borderRadius: 9, border: `1px solid ${T.border}`, backgroundColor: "#fff", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: T.fg }}>{value}</div>
  </div>
);

const REGELS = [
  { o: "Lichtbakken gevel De Linde", a: "3", p: "1.350,00", g: "8001 - omzet", tot: "€ 4.050,00" },
  { o: "Montage op locatie", a: "1", p: "200,00", g: "8002 - montage", tot: "€ 200,00" },
];

const HdrBtn: React.FC<{ children: React.ReactNode; tint?: string }> = ({ children, tint }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, height: 42, padding: "0 14px", borderRadius: 10, border: `1px solid ${tint ? `${tint}55` : T.border}`, fontSize: 14, fontWeight: 600, color: tint || T.fg }}>{children}</div>
);

export const FactuurScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Overig" />
    <TabStrip active={FACTNR} />
    <div style={{ padding: "22px 32px" }}>
      {/* Kop */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, color: T.mutedFg, marginBottom: 6 }}>← Facturen</div>
          <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 30, color: merk.petrol }}>
            Factuur <span style={{ fontFamily: fonts.mono }}>{FACTNR}</span>
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 14, color: T.mutedFg, marginTop: 2 }}>{FACTNR}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HdrBtn tint={GROEN}>✓ Markeer als betaald</HdrBtn>
          <HdrBtn>EXACT</HdrBtn>
          <HdrBtn>BIJLAGE</HdrBtn>
          <div style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.mutedFg }}>···</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 10, backgroundColor: merk.petrol, color: "#fff", fontSize: 15, fontWeight: 600 }}>Bijwerken</div>
        </div>
      </div>

      {/* Statusregel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 15, color: T.fg }}>✈ Verstuurd · wachtend op betaling<span style={{ color: merk.flame }}>.</span></span>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, color: "#9AA4A2" }}>app.doen.team/betalen/8f2c…</span>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 22, alignItems: "flex-start" }}>
        {/* Linkerkolom */}
        <div style={{ width: 410, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <Kaart>
            <KaartTitel>▦ Klant</KaartTitel>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: T.mutedFg, marginBottom: 8 }}>KLANT</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3A6B8C, #2A5580)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>H</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.fg }}>Hotel De Linde</div>
                <div style={{ fontSize: 13, color: T.mutedFg }}>Apeldoorn</div>
              </div>
              <span style={{ color: T.mutedFg }}>×</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: merk.flame, margin: "16px 0 8px" }}>VERZENDEN NAAR</div>
            <Veld label="" value="de administratie" />
          </Kaart>
          <Kaart>
            <KaartTitel>▤ Factuurgegevens</KaartTitel>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Veld label="Factuurnummer" value={FACTNR} />
              <Veld label="Titel" value="Lichtbakken gevel" />
              <div style={{ display: "flex", gap: 12 }}>
                <Veld label="Factuurdatum" value="2 jun. 2026" />
                <Veld label="Vervaldatum" value="16 jun. 2026" />
              </div>
            </div>
          </Kaart>
          <Kaart>
            <KaartTitel>€ Financieel</KaartTitel>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "4px 0" }}>
              <span style={{ color: T.mutedFg }}>Subtotaal</span><span style={{ fontFamily: fonts.mono, color: T.fg }}>€ 4.250,00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "4px 0" }}>
              <span style={{ color: T.mutedFg }}>BTW 21%</span><span style={{ fontFamily: fonts.mono, color: T.fg }}>€ 892,50</span>
            </div>
          </Kaart>
        </div>

        {/* Rechterkolom */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <Kaart>
            <KaartTitel>Intro tekst</KaartTitel>
            <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "14px 16px", fontSize: 15, color: T.fg, lineHeight: 1.5 }}>
              Hierbij ontvang je de factuur voor de uitgevoerde werkzaamheden. Heel erg bedankt voor de prettige samenwerking.
            </div>
          </Kaart>
          <Kaart>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 16, color: merk.petrol }}>Factuurregels (2)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px" }}>+ Regel</span>
            </div>
            {/* tabelkop */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: T.mutedFg, padding: "0 0 10px" }}>
              <span style={{ flex: 1 }}>OMSCHRIJVING</span>
              <span style={{ width: 60, textAlign: "center" }}>AANTAL</span>
              <span style={{ width: 70, textAlign: "center" }}>PRIJS</span>
              <span style={{ width: 50, textAlign: "center" }}>BTW%</span>
              <span style={{ width: 120, textAlign: "center" }}>GROOTBOEK</span>
              <span style={{ width: 100, textAlign: "right" }}>TOTAAL</span>
            </div>
            {REGELS.map((r) => (
              <div key={r.o} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.border}` }}>
                <span style={{ flex: 1, fontSize: 15, color: T.fg, backgroundColor: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px" }}>{r.o}</span>
                <span style={{ width: 60, textAlign: "center", fontFamily: fonts.mono, fontSize: 14, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 0" }}>{r.a}</span>
                <span style={{ width: 70, textAlign: "center", fontFamily: fonts.mono, fontSize: 14, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 0" }}>{r.p}</span>
                <span style={{ width: 50, textAlign: "center", fontFamily: fonts.mono, fontSize: 14, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 0" }}>21</span>
                <span style={{ width: 120, textAlign: "center", fontSize: 12, color: T.mutedFg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.g}</span>
                <span style={{ width: 100, textAlign: "right", fontFamily: fonts.mono, fontSize: 15, fontWeight: 700, color: T.fg }}>{r.tot}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 4px", borderTop: `1px solid ${T.border}`, marginTop: 6 }}>
              <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 16, color: merk.petrol }}>Totaal</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: GROEN }}>€ 5.142,50</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: merk.flame, marginTop: 8 }}>+ Regel toevoegen</div>
          </Kaart>
        </div>
      </div>
    </div>
  </div>
);
