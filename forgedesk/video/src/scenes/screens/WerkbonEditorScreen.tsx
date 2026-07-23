import { merk, modules } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geporte werkbon-editor (forgedesk WerkbonDetail). Verzonnen De Linde-data; de
// situatiefoto is een nette abstractie met opmeting-annotaties (echte foto n.v.t.).
const WERKBON = "WB-2026-0188";
const WB_FLAME = modules.werkbonnen.kleur; // #C44830

const Veld: React.FC<{ label: string; value?: string; placeholder?: string; w?: number | string }> = ({ label, value, placeholder, w = "100%" }) => (
  <div style={{ width: w }}>
    <div style={{ fontSize: 13, color: T.mutedFg, marginBottom: 6 }}>{label}</div>
    <div style={{ height: 44, borderRadius: 10, border: `1px solid ${T.border}`, backgroundColor: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: value ? T.fg : "#B6B0A6" }}>
      {value || placeholder}
    </div>
  </div>
);

const Knopje: React.FC<{ d: string }> = ({ d }) => (
  <div style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={d} stroke={T.mutedFg} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

export const WerkbonEditorScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Werkbonnen" />
    <TabStrip active={WERKBON} />
    <div style={{ padding: "22px 32px" }}>
      {/* Kop */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, color: T.mutedFg }}>← Werkbonnen</span>
          <div style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: WB_FLAME, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 4h6v3H9V4zM7 5H5v15h14V5h-2M9 12l1.5 1.5L14 10" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 26, color: merk.petrol }}>
              Werkbon <span style={{ fontFamily: fonts.mono, fontWeight: 700 }}>{WERKBON}</span>
            </span>
            <div style={{ display: "inline-block", marginLeft: 12, fontSize: 13, fontWeight: 600, color: "#8A6A2A", backgroundColor: "#F5F2E8", border: "1px solid #E0D8C0", padding: "2px 10px", borderRadius: 999 }}>
              Concept<span style={{ color: merk.flame }}>.</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Knopje d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <Knopje d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v6H8z" />
          <Knopje d="M7 3h7l4 4v14H7V3z" />
          <Knopje d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10.5 10.5l5 3.5M15.5 7l-5 3.5" />
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 15, color: T.fg }}>Concept <span style={{ color: T.mutedFg }}>⌄</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", borderRadius: 10, backgroundColor: merk.flame, color: "#fff", fontSize: 15, fontWeight: 600 }}>Afronden</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", borderRadius: 10, backgroundColor: merk.petrol, color: "#fff", fontSize: 15, fontWeight: 600 }}>Opslaan</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
        {/* Linkerkolom */}
        <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <Veld label="Klant *" value="Hotel De Linde" />
            <Veld label="Titel" placeholder="Bijv. Montage gevelreclame" />
            <div style={{ display: "flex", gap: 12 }}>
              <Veld label="Datum" value="2 jun. 2026" w={170} />
              <Veld label="Project" value="Lichtbakken De Linde" w="100%" />
            </div>
          </div>
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: T.mutedFg }}>Locatie</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: merk.petrol }}>⌖ Route</span>
            </div>
            <Veld label="" value="Stationsweg 14" />
            <div style={{ display: "flex", gap: 12 }}>
              <Veld label="" value="7311 NZ" w={170} />
              <Veld label="" value="Apeldoorn" />
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              <Veld label="Contact op locatie" value="Lotte Brouwer" />
            </div>
          </div>
        </div>

        {/* Rechterkolom: items */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: T.mutedFg }}>ITEMS (3)</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", backgroundColor: merk.flame, padding: "8px 14px", borderRadius: 9 }}>+ Item toevoegen</span>
          </div>
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ color: T.mutedFg }}>⠿</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "3px 10px" }}>#1</span>
            </div>
            <div style={{ fontSize: 13, color: T.mutedFg, marginBottom: 6 }}>Omschrijving</div>
            <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "14px 16px", fontSize: 17, color: T.fg, marginBottom: 18 }}>Geveltekst zijkant</div>
            <div style={{ display: "flex", gap: 18, marginBottom: 18 }}>
              <Veld label="Breedte (mm)" placeholder="bijv. 1200" />
              <Veld label="Hoogte (mm)" placeholder="bijv. 800" />
            </div>
            {/* Situatiefoto + mockup */}
            <div style={{ display: "flex", gap: 16, borderRadius: 12, border: `1px solid ${T.border}`, padding: 14 }}>
              <div style={{ flex: 1, position: "relative", height: 300, borderRadius: 8, overflow: "hidden", background: "linear-gradient(160deg, #9BB0C0 0%, #7C8A8F 45%, #6E6258 100%)" }}>
                {/* abstracte gevel */}
                <div style={{ position: "absolute", left: "18%", top: "42%", width: "16%", height: "26%", backgroundColor: "rgba(240,240,235,0.85)", borderRadius: 2 }} />
                <div style={{ position: "absolute", left: "40%", bottom: 0, width: "44%", height: "34%", backgroundColor: "rgba(150,120,90,0.55)" }} />
                {/* opmeting-annotaties (flame-roze) */}
                <div style={{ position: "absolute", left: "10%", right: "10%", bottom: 22, height: 2, backgroundColor: "#F03AA0" }} />
                <span style={{ position: "absolute", left: "44%", bottom: 26, fontSize: 13, fontWeight: 700, color: "#F03AA0" }}>840 cm</span>
                <div style={{ position: "absolute", right: 26, top: "26%", bottom: "20%", width: 2, backgroundColor: "#F03AA0" }} />
                <span style={{ position: "absolute", right: 30, top: "48%", fontSize: 13, fontWeight: 700, color: "#F03AA0", writingMode: "vertical-rl" }}>385 cm</span>
              </div>
              <div style={{ flex: 1, position: "relative", height: 300, borderRadius: 8, border: `1px solid ${T.border}`, backgroundColor: "#fff", overflow: "hidden" }}>
                <span style={{ position: "absolute", left: 12, top: 8, fontSize: 14, color: T.mutedFg }}>2</span>
                {/* guide-lines */}
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#7FCBD0" }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: "42%", width: 1, backgroundColor: "#7FCBD0" }} />
                {/* mockup-vorm (fictief, geen echt logo) */}
                <div style={{ position: "absolute", left: "12%", top: "30%", right: "8%", bottom: 0, backgroundColor: "#6E4B33", clipPath: "polygon(0 28%, 100% 0, 100% 100%, 0 100%)" }} />
                <div style={{ position: "absolute", left: "16%", bottom: "12%", width: 54, height: 54, backgroundColor: "#fff" }} />
              </div>
            </div>
            {/* Notitie voor monteur */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: T.mutedFg, marginBottom: 6 }}>Notitie voor monteur</div>
              <div style={{ borderRadius: 10, border: "1px solid #E6CF8A", backgroundColor: "#FCF7E3", padding: "14px 16px", fontSize: 16, color: T.fg }}>
                Blauwe letters / witte outline
              </div>
            </div>
          </div>
          {/* begin #2 */}
          <div style={{ marginTop: 16, backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: T.mutedFg }}>⠿</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.fg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "3px 10px" }}>#2</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
