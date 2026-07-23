import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav } from "./AppChrome";

// Geport import-scherm (forgedesk onboarding/import). Eén CSV met alle
// bedrijfsdata + een CSV met contactpersonen. Op 1790px ontworpen zodat het in de
// browser-frame meeschaalt. De `klaar`-prop flipt de bedrijfsdata-zone naar de
// succes-staat (voor de "zo makkelijk overgezet"-beat).
const PETROL = merk.petrol;
const SAGE = "#3A7D52";

const IC = {
  sheet: "M5 3h10l4 4v14H5V3zM14 3v4h4M8 12h8M8 16h8M8 8h4",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-5-5.9",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2M12 17h.01",
  check: "M5 13l4 4L19 7",
};

const Ico: React.FC<{ d: string; c?: string; s?: number; w?: number }> = ({ d, c = T.mutedFg, s = 22, w = 1.7 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TemplateKnop: React.FC = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 11, border: `1px solid ${T.border}`, backgroundColor: "#fff", fontSize: 17, fontWeight: 700, color: T.fg, boxShadow: "0 1px 2px rgba(120,90,50,0.05)" }}>
    <Ico d={IC.download} c={T.fg} s={18} />
    Download template
  </div>
);

const Dropzone: React.FC<{ regel2?: string } > = ({ regel2 = ".csv bestanden" }) => (
  <div style={{ marginTop: 20, borderRadius: 16, border: `2px dashed #CFCABF`, padding: "44px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, backgroundColor: "#FCFBF9" }}>
    <Ico d={IC.upload} c="#A7A096" s={34} w={1.6} />
    <div style={{ fontSize: 21, color: "#6A645B" }}>
      Sleep je CSV-bestand hierheen of <span style={{ color: PETROL, fontWeight: 600 }}>klik om te uploaden</span>
    </div>
    <div style={{ fontSize: 15, color: T.mutedFg }}>{regel2}</div>
  </div>
);

// Succes-staat van een dropzone na import.
const Geimporteerd: React.FC<{ titel: string; detail: string }> = ({ titel, detail }) => (
  <div style={{ marginTop: 20, borderRadius: 16, border: `2px solid ${SAGE}55`, padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, backgroundColor: "#EEF6F0" }}>
    <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "#DCEFE3", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Ico d={IC.check} c={SAGE} s={28} w={2.4} />
    </div>
    <div style={{ fontSize: 21, fontWeight: 700, color: T.fg }}>{titel}</div>
    <div style={{ fontFamily: fonts.mono, fontSize: 15, color: SAGE }}>{detail}</div>
  </div>
);

const Kaart: React.FC<{ icon: string; titel: string; tekst: string; children: React.ReactNode }> = ({ icon, titel, tekst, children }) => (
  <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 36, boxShadow: "0 1px 3px rgba(120,90,50,0.04)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
      <Ico d={icon} c={PETROL} s={26} />
      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 28, color: T.fg }}>{titel}</span>
    </div>
    <div style={{ fontSize: 18, color: "#6A645B", lineHeight: 1.5, maxWidth: 980, marginBottom: 22 }}>{tekst}</div>
    <TemplateKnop />
    {children}
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 20, fontSize: 16, color: T.mutedFg }}>
      <Ico d={IC.help} c={T.mutedFg} s={18} />
      Hulp nodig bij het invullen? <span style={{ color: T.mutedFg }}>›</span>
    </div>
  </div>
);

export const ImportScreen: React.FC<{ klaar?: boolean }> = ({ klaar = false }) => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body, color: T.fg }}>
    <TopNav active="Overig" gebruiker="Remco" initiaal="R" />
    <div style={{ padding: "32px 40px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 38, letterSpacing: "-0.02em", color: T.fg, marginBottom: 4 }}>
        Data importeren<span style={{ color: merk.flame }}>.</span>
      </div>
      <div style={{ fontSize: 18, color: T.mutedFg, marginBottom: 26 }}>Neem je bestaande administratie in één keer mee.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Kaart icon={IC.sheet} titel="Bedrijfsdata" tekst="Upload één CSV-bestand met al je bedrijfsdata. Gebruik de eerste kolom om aan te geven wat voor type regel het is: relatie, project, offerte of factuur.">
          {klaar ? <Geimporteerd titel="Geïmporteerd" detail="248 relaties · 1.120 regels" /> : <Dropzone />}
        </Kaart>
        <Kaart icon={IC.people} titel="Contactpersonen" tekst="Upload een CSV-bestand met je contactpersonen. Vul de bedrijfsnaam in om ze aan een klant te koppelen, of laat deze leeg voor losse contacten.">
          <Dropzone />
        </Kaart>
      </div>
    </div>
  </div>
);
