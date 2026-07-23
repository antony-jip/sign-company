import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { merk, modules } from "../../brand";
import { fonts } from "../../fonts";

// Geporte OVERZICHT-tab van forgedesk ProjectDetail (cockpit-subcomponenten:
// CockpitTopBar, ProjectFaseBar, BriefingCard, TakenOfferteGrid, KlantCard,
// ActiesCard). Shadcn-tokens vertaald naar expliciete waarden; hooks/data/
// handlers gestript; verzonnen, on-brand data (geen echte klantgegevens).
const T = {
  fg: merk.ink,
  mutedFg: "#8A8278",
  page: "#F4F3F0",
  card: "#FFFFFF",
  border: "#EAE7E1",
  petrol: merk.petrol,
  petrolDark: "#143F46",
  flame: merk.flame,
};
const serif: CSSProperties = { fontStyle: "italic", color: T.mutedFg };

// Verzonnen data (on-brand signbedrijf)
const PROJECT = "Lichtbakken De Linde";
const PRJ = "PRJ-2026-042";
const KLANT_VOL = "Hotel De Linde";
const STAD = "Apeldoorn";
const ADRES = "Stationsweg 14, 7311 NZ Apeldoorn";
const TEL = "055-3071620";
const EMAIL = "info@hoteldelinde.nl";
const DEB = "10428";
const CONTACT = "Lotte Brouwer";
const OFFERTENR = "OFF-2026-0042";
const BEDRAG = "€ 4.250,00";

// ── Inline-iconen ──
const S: React.FC<{ d: string; size?: number; c?: string; sw?: number; fill?: string }> = ({
  d,
  size = 18,
  c = "currentColor",
  sw = 1.7,
  fill = "none",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
    <path d={d} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IcCal = (p: { c?: string; size?: number }) => (
  <S d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" {...p} />
);
const IcEye = (p: { c?: string; size?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke={p.c ?? "currentColor"} strokeWidth={1.7} />
    <circle cx="12" cy="12" r="3" stroke={p.c ?? "currentColor"} strokeWidth={1.7} />
  </svg>
);
const IcCheck = (p: { c?: string; size?: number }) => <S d="M5 12l4 4 10-10" {...p} sw={2.2} />;
const IcWrench = (p: { c?: string; size?: number }) => (
  <S d="M14.5 6a3.5 3.5 0 0 0-4.8 4.4l-5.4 5.4a1.5 1.5 0 0 0 2.1 2.1l5.4-5.4A3.5 3.5 0 0 0 18 8l-2 2-2-2 2-2z" {...p} />
);
const IcEuro = (p: { c?: string; size?: number }) => (
  <S d="M15 7a5 5 0 1 0 0 10M5 10h7M5 14h7" {...p} />
);
const IcSmile = (p: { c?: string; size?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={p.c ?? "currentColor"} strokeWidth={1.7} />
    <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" stroke={p.c ?? "currentColor"} strokeWidth={1.7} strokeLinecap="round" />
  </svg>
);
const IcDoc = (p: { c?: string; size?: number }) => <S d="M7 3h7l4 4v14H7V3zM14 3v4h4" {...p} />;
const IcSpark = (p: { c?: string; size?: number }) => (
  <S d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5L12 4z" {...p} />
);
const IcList = (p: { c?: string; size?: number }) => <S d="M4 6l2 2 3-3M4 13l2 2 3-3M13 7h7M13 14h7" {...p} />;
const IcPin = (p: { c?: string; size?: number }) => (
  <S d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" {...p} />
);
const IcPhone = (p: { c?: string; size?: number }) => (
  <S d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l2 5v3a1 1 0 0 1-1 1A16 16 0 0 1 4 6a1 1 0 0 1 1-2z" {...p} />
);
const IcMail = (p: { c?: string; size?: number }) => <S d="M3 6h18v12H3V6zM4 7l8 6 8-6" {...p} />;
const IcReceipt = (p: { c?: string; size?: number }) => (
  <S d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3zM9 8h6M9 12h6" {...p} />
);
const IcClip = (p: { c?: string; size?: number }) => (
  <S d="M9 4h6v3H9V4zM7 5H5v15h14V5h-2M9 12l1.5 1.5L14 10" {...p} />
);
const IcCard = (p: { c?: string; size?: number }) => <S d="M3 6h18v12H3V6zM3 10h18" {...p} />;
const IcBrief = (p: { c?: string; size?: number }) => (
  <S d="M4 7h16v12H4V7zM9 7V5h6v2" {...p} c={p.c} />
);

// ── Globale nav ──
const NAV = ["Dashboard", "Projecten.", "Taken", "Offertes", "Planning", "Werkbonnen", "Email", "Overig"];
const TopNav: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 28,
      padding: "0 26px",
      height: 64,
      backgroundColor: T.card,
      borderBottom: `1px solid ${T.border}`,
    }}
  >
    <Img src={staticFile("logos/doen-logo.svg")} style={{ width: 78 }} />
    <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 16 }}>
      {NAV.map((n) => {
        const actief = n === "Projecten.";
        return (
          <span
            key={n}
            style={{
              fontWeight: actief ? 700 : 500,
              color: actief ? T.fg : T.mutedFg,
            }}
          >
            {n === "Projecten." ? (
              <>Projecten<span style={{ color: T.flame }}>.</span></>
            ) : (
              n
            )}
          </span>
        );
      })}
    </div>
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 280,
          height: 38,
          borderRadius: 10,
          backgroundColor: "#F4F2EE",
          border: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          color: T.mutedFg,
          fontSize: 15,
        }}
      >
        Zoeken…
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 13px",
          borderRadius: 999,
          backgroundColor: T.flame,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        5 nieuwe notificaties
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 12px 5px 5px",
          borderRadius: 999,
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: T.petrol,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          R
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>Remco</span>
      </div>
    </div>
  </div>
);

const TabStrip: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 26,
      padding: "0 26px",
      height: 46,
      backgroundColor: T.card,
      borderBottom: `1px solid ${T.border}`,
      fontSize: 15,
    }}
  >
    {["Offertes", "Werkbonnen", "Facturen", "Projecten", "Email"].map((t) => (
      <span key={t} style={{ color: T.mutedFg }}>{t}</span>
    ))}
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        color: T.fg,
        fontWeight: 600,
      }}
    >
      Project <span style={{ color: T.mutedFg }}>×</span>
    </span>
  </div>
);

// ── Kop + acties + tabbalk ──
const Kop: React.FC = () => (
  <div>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.mutedFg, marginBottom: 8 }}>
          <span>← Projecten</span>
          <span>·</span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              backgroundColor: "#F1EFEA",
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              padding: "2px 8px",
            }}
          >
            {PRJ}
          </span>
        </div>
        <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 44, letterSpacing: "-0.5px", color: T.fg, lineHeight: 1 }}>
          {PROJECT}<span style={{ color: T.flame }}>.</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 17 }}>
          <span style={{ fontWeight: 600, color: T.fg }}>{KLANT_VOL}</span>
          <span style={{ color: T.mutedFg }}> · {STAD} · </span>
          <span style={serif}>aangemaakt 2 juni 2026</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, backgroundColor: T.flame, color: "#fff", fontSize: 16, fontWeight: 600 }}>
          Offerte bewerken
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, border: `1px solid ${T.border}`, color: T.fg, fontSize: 16, fontWeight: 600 }}>
          Maak factuur
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.mutedFg }}>···</div>
      </div>
    </div>
    {/* Tabbalk */}
    <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 22, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
      {[
        { l: "Overzicht", ic: <IcList c={T.flame} size={17} />, actief: true },
        { l: "Werkbon", ic: <IcWrench c={T.mutedFg} size={17} />, actief: false },
        { l: "Financieel", ic: <IcEuro c={T.mutedFg} size={17} />, actief: false },
        { l: "E-mail", ic: <IcMail c={T.mutedFg} size={17} />, actief: false },
        { l: "Notities", ic: <IcDoc c={T.mutedFg} size={17} />, actief: false },
      ].map((t) => (
        <div
          key={t.l}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingBottom: 12,
            fontSize: 17,
            fontWeight: t.actief ? 700 : 500,
            color: t.actief ? T.fg : T.mutedFg,
            borderBottom: t.actief ? `2px solid ${T.flame}` : "2px solid transparent",
          }}
        >
          {t.ic}
          {t.l}
        </div>
      ))}
    </div>
  </div>
);

// ── Voortgang-stepper (6 fases) ──
const FASES = [
  { label: "Gepland", caption: "klaar om te starten", Icon: IcCal },
  { label: "In review", caption: "offerte gestuurd", Icon: IcEye },
  { label: "Akkoord klant", caption: "klant akkoord, te plannen", Icon: IcCheck },
  { label: "Actief", caption: "aan het werk", Icon: IcWrench },
  { label: "Ingepland", caption: "montage ingepland", Icon: IcEuro },
  { label: "Gedaan", caption: "klaar om te factureren", Icon: IcSmile },
];
const CURRENT = 1;

const Card: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 18, ...style }}>
    {children}
  </div>
);

const CardKop: React.FC<{ titel: string; rechts?: ReactNode; icoon?: ReactNode; sub?: string }> = ({
  titel,
  rechts,
  icoon,
  sub,
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icoon}
      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 18, color: T.fg }}>
        {titel}<span style={{ color: T.flame }}>.</span>
      </span>
      {sub && <span style={{ fontSize: 14, ...serif }}>· {sub}</span>}
    </div>
    {rechts}
  </div>
);

const Voortgang: React.FC = () => (
  <Card style={{ padding: 26 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 18, color: T.fg }}>
        Voortgang<span style={{ color: T.flame }}>.</span>
      </span>
      <span style={{ fontSize: 14, ...serif }}>fase 2 van 6 · in review</span>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
        {FASES.map((f, i) => {
          const past = i < CURRENT;
          const active = i === CURRENT;
          const Icon = f.Icon;
          const isLast = i === FASES.length - 1;
          const circleBg = past ? T.petrol : T.card;
          const circleBorder = past || active ? T.petrol : "#D8D4CC";
          const iconColor = past ? "#fff" : active ? T.petrol : "#B8B2A8";
          return (
            <div key={f.label} style={{ display: "flex", alignItems: "flex-start", flex: isLast ? "0 0 auto" : 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, width: 116 }}>
                <div
                  style={{
                    position: "relative",
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    backgroundColor: circleBg,
                    border: `2px solid ${circleBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: active ? `0 0 0 4px ${T.flame}22` : undefined,
                  }}
                >
                  <Icon c={iconColor} size={20} />
                  {active && (
                    <span style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", backgroundColor: T.flame, border: "2px solid #fff" }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 15, color: active ? T.fg : past ? T.petrol : "#A39C90", textAlign: "center" }}>
                    {f.label}<span style={{ color: T.flame }}>.</span>
                  </span>
                  <span style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: active ? "#6A645B" : "#B0AA9E", textAlign: "center", maxWidth: 108, lineHeight: 1.4 }}>
                    {f.caption}
                  </span>
                </div>
              </div>
              {!isLast && (
                <div style={{ flex: 1, marginTop: 26, position: "relative", minWidth: 24 }}>
                  <div
                    style={{
                      height: 1,
                      backgroundImage: past ? "none" : `linear-gradient(90deg, #D8D4CC 50%, transparent 50%)`,
                      backgroundColor: past ? T.petrol : "transparent",
                      backgroundSize: "8px 1px",
                    }}
                  />
                  <span style={{ position: "absolute", top: -2, right: 0, width: 5, height: 5, borderRadius: "50%", backgroundColor: T.flame }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, borderLeft: `1px solid ${T.border}`, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: T.mutedFg }}>Bedrag</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: T.fg }}>{BEDRAG}</span>
      </div>
    </div>
  </Card>
);

const Briefing: React.FC = () => (
  <Card style={{ padding: 22 }}>
    <CardKop
      titel="Briefing"
      icoon={<IcBrief c={T.petrol} size={17} />}
      sub="wat moet er gebeuren"
      rechts={
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, fontWeight: 600, color: "#6A645B" }}>
          <IcSpark c={T.petrol} size={14} /> Daan AI
        </div>
      }
    />
    <div style={{ minHeight: 96, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px", fontSize: 16, color: T.fg, lineHeight: 1.5 }}>
      Drie lichtbakken voor de nieuwe vestiging. Gevelmontage, dubbelzijdig LED. Zelfde uitstraling als vorig jaar.
    </div>
  </Card>
);

const Taken: React.FC = () => (
  <Card style={{ padding: 22 }}>
    <CardKop
      titel="Taken"
      icoon={<IcList c={T.petrol} size={17} />}
      rechts={<span style={{ fontSize: 14, fontWeight: 600, color: T.petrol }}>+ Taak</span>}
    />
    <div style={{ borderRadius: 12, border: `1px dashed #D8D4CC`, padding: "30px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <IcList c="#B7B1A6" size={26} />
      <span style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>Eerste taak toevoegen</span>
      <span style={{ fontSize: 14, ...serif }}>wat moet er gebeuren?</span>
    </div>
  </Card>
);

const Offertes: React.FC = () => (
  <Card style={{ padding: 22 }}>
    <CardKop
      titel="Offertes"
      icoon={<IcReceipt c={T.flame} size={17} />}
      rechts={<span style={{ fontSize: 14, fontWeight: 600, color: T.flame }}>+ Offerte</span>}
    />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.fg }}>{PROJECT}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 12, color: T.mutedFg, backgroundColor: "#F1EFEA", padding: "2px 7px", borderRadius: 5 }}>{OFFERTENR}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#3A5A9A", backgroundColor: "#E8EEF9", border: "1px solid #C2D0EE", padding: "2px 9px", borderRadius: 999 }}>Verzonden</span>
        </div>
      </div>
      <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: T.fg }}>{BEDRAG}</span>
    </div>
  </Card>
);

const InfoRij: React.FC<{ icoon: ReactNode; tekst: string; mono?: boolean }> = ({ icoon, tekst, mono }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 4px" }}>
    {icoon}
    <span style={{ fontSize: 15, color: T.fg, fontFamily: mono ? fonts.mono : fonts.body }}>{tekst}</span>
  </div>
);

const Klant: React.FC = () => (
  <Card style={{ padding: 22 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 18, color: T.fg }}>
        Klant<span style={{ color: T.flame }}>.</span>
      </span>
      <span style={{ color: T.mutedFg }}>···</span>
    </div>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "linear-gradient(135deg, #3A6B8C 0%, #2A5580 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        H
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.fg }}>{KLANT_VOL}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: T.mutedFg, marginTop: 4 }}>
          Deb<span style={{ color: T.flame }}>.</span> {DEB}
        </div>
      </div>
    </div>
    <div style={{ marginBottom: 6 }}>
      <InfoRij icoon={<IcPin c={T.mutedFg} size={16} />} tekst={ADRES} />
      <InfoRij icoon={<IcPhone c={T.mutedFg} size={16} />} tekst={TEL} mono />
      <InfoRij icoon={<IcMail c={T.mutedFg} size={16} />} tekst={EMAIL} />
    </div>
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.mutedFg, marginBottom: 10 }}>Contactpersoon</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: `1px solid ${T.border}`, backgroundColor: "#fff" }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg, #3A6B8C, #2A5580)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>L</div>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.fg }}>{CONTACT}</span>
        <span style={{ color: T.mutedFg }}>⌄</span>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px 0", borderRadius: 12, backgroundColor: T.petrol, color: "#fff", fontSize: 15, fontWeight: 600 }}>
        <IcMail c="#fff" size={16} /> Mail contactpersoon
      </div>
      <div style={{ marginTop: 12, fontSize: 14, color: "#6A645B" }}>✎ Bewerk {CONTACT}</div>
      <div style={{ marginTop: 8, fontSize: 14, color: "#6A645B" }}>+ Nieuw contactpersoon</div>
    </div>
  </Card>
);

const ACTIES = [
  { l: "Offerte", s: "Stuur een prijsopgave", c: merk.flame, ic: IcReceipt },
  { l: "Werkbon", s: "Voor de monteur", c: modules.werkbonnen.kleur, ic: IcClip },
  { l: "Montage", s: "Plan de uitvoering", c: modules.planning.kleur, ic: IcWrench },
  { l: "Factuur", s: "Verstuur de rekening", c: modules.facturen.kleur, ic: IcCard },
];
export const ActiesPaneel: React.FC = () => (
  <Card style={{ padding: 20 }}>
    <CardKop titel="Acties" sub="wat is de volgende stap?" />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {ACTIES.map((a) => {
        const Icon = a.ic;
        return (
          <div key={a.l} style={{ display: "flex", gap: 11, padding: 13, borderRadius: 12, backgroundColor: "#fff", border: `1px solid ${a.c}26` }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: `${a.c}16`, border: `1px solid ${a.c}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon c={a.c} size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.fg }}>{a.l}</div>
              <div style={{ fontSize: 12, color: "#7A746B", marginTop: 2 }}>{a.s}</div>
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(43,83,92,0.08)", display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#5A554D" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5zM3 7l9 5 9-5M12 12v10" stroke={merk.petrol} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Pakbon
      </span>
      <span style={{ color: T.mutedFg }}>·</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#5A554D" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v7M7 3v18h6M15 21l5-5-2-2-5 5v2h2z" stroke={merk.petrol} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Bevestiging
      </span>
    </div>
  </Card>
);

const ACTIVITEIT = [
  { wat: "Jij wijzigde de status naar in-review", t: "4 uur geleden", ic: <IcDoc c={T.petrol} size={16} />, flame: false },
  { wat: `Offerte ${OFFERTENR} verstuurd naar klant`, t: "5 uur geleden", ic: <IcReceipt c={merk.flame} size={16} />, flame: true },
  { wat: `Jij maakte offerte ${OFFERTENR} aan`, t: "5 uur geleden", ic: <IcReceipt c={merk.flame} size={16} />, flame: true },
  { wat: "Jij maakte het project aan", t: "5 uur geleden", ic: <IcDoc c={T.petrol} size={16} />, flame: false },
];

export const ActiviteitPaneel: React.FC = () => (
  <Card style={{ padding: 22 }}>
    <CardKop titel="Activiteit" rechts={<span style={{ fontFamily: fonts.mono, fontSize: 13, color: T.mutedFg, backgroundColor: "#F1EFEA", borderRadius: 999, padding: "2px 9px" }}>4</span>} />
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ACTIVITEIT.map((a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${a.flame ? `${merk.flame}33` : T.border}`, backgroundColor: a.flame ? `${merk.flame}10` : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.ic}</div>
          <div>
            <div style={{ fontSize: 15, color: T.fg }}>{a.wat}</div>
            <div style={{ fontSize: 13, color: T.mutedFg, marginTop: 2 }}>{a.t}</div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const PortaalBlok: React.FC = () => (
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${merk.petrol}, #143F46)`, color: "#fff" }}>
      <span style={{ fontSize: 14, letterSpacing: "0.08em", fontWeight: 700 }}>⌄ PORTAAL <span style={{ fontWeight: 500, opacity: 0.85 }}>Actief<span style={{ color: merk.flame }}>.</span> · 1 gedeeld</span></span>
      <span style={{ fontSize: 14, opacity: 0.85 }}>Openen →</span>
    </div>
    <div style={{ marginTop: 16, maxWidth: 480, borderRadius: 12, border: `1px solid ${T.border}`, borderTop: `3px solid ${merk.flame}`, backgroundColor: T.card, padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: merk.flame, marginBottom: 6 }}>OFFERTE</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.fg }}>Offerte {OFFERTENR}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: T.fg }}>{BEDRAG}</span>
        <span style={{ fontSize: 14, color: "#3A5A9A" }}>Verstuurd<span style={{ color: merk.flame }}>.</span></span>
      </div>
    </div>
  </div>
);

const Bestanden: React.FC = () => (
  <Card style={{ padding: 20 }}>
    <CardKop titel="Bestanden" rechts={<span style={{ fontSize: 14, fontWeight: 600, color: merk.petrol }}>↑ Upload</span>} />
    <div style={{ borderRadius: 12, border: `1px dashed #D8D4CC`, padding: "26px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>Eerste bestand uploaden</span>
      <span style={{ fontSize: 13, ...serif }}>sleep of klik om te kiezen</span>
    </div>
  </Card>
);

export const ProjectCockpit: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav />
    <TabStrip />
    <div style={{ padding: "26px 32px" }}>
      <Kop />
      <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <Voortgang />
          <Briefing />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Taken />
            <Offertes />
          </div>
          <ActiviteitPaneel />
          <PortaalBlok />
        </div>
        <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          <Klant />
          <ActiesPaneel />
          <Bestanden />
        </div>
      </div>
    </div>
  </div>
);
