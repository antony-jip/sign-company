import { merk, modules } from "../../brand";
import { fonts } from "../../fonts";
import { T, TopNav, TabStrip } from "./AppChrome";

// Geporte e-mail-inbox (forgedesk EmailLayout), rijk gevuld met demo-afzenders
// (signbedrijf-context, fictief). Statische schil voor de montage.
const MAILS = [
  { a: "Hotel De Linde", s: "Akkoord op offerte lichtbakken", t: "20:22", on: true, sel: true, bijlage: true, kl: modules.klanten.kleur },
  { a: "Aluminium Benelux", s: "Levering profielen — week 24", t: "20:05", on: true, kl: "#2D7D52" },
  { a: "Gemeente Apeldoorn", s: "Vergunning gevelreclame verleend", t: "19:48", on: false, kl: modules.email.kleur },
  { a: "Bouwbedrijf Veld", s: "Nieuwe aanvraag: bewegwijzering", t: "18:36", on: true, kl: "#9A5A48" },
  { a: "Reclamebureau Nova", s: "Re: Ontwerp gevelletters", t: "16:19", on: false, kl: merk.flame },
  { a: "Sporthal De Veluwe", s: "Vraag over montageplanning", t: "15:02", on: false, bijlage: true, kl: "#3A7D52" },
  { a: "Folie Groothandel", s: "Offerte cast folie + laminaat", t: "14:20", on: false, kl: "#5A7A9A" },
  { a: "Lichtreclame Partners", s: "Prijslijst LED-modules 2026", t: "13:10", on: false, kl: "#6A5A8A" },
];

const RailIc: React.FC<{ d: string; actief?: boolean }> = ({ d, actief }) => (
  <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: actief ? merk.petrol : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d={d} stroke={actief ? "#fff" : "#9AA0A0"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

export const EmailScreen: React.FC = () => (
  <div style={{ backgroundColor: T.page, fontFamily: fonts.body }}>
    <TopNav active="Email" />
    <TabStrip active="Email" />
    <div style={{ display: "flex", height: 766 }}>
      {/* Rail */}
      <div style={{ width: 64, flexShrink: 0, backgroundColor: T.card, borderRight: `1px solid ${T.border}`, padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <RailIc d="M3 6h18v12H3V6zM4 7l8 6 8-6" actief />
        <RailIc d="M4 12l16-8-6 16-3-6-7-2z" />
        <RailIc d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
        <RailIc d="M4 12l4 4 8-9" />
        <RailIc d="M21 12.8A9 9 0 1 1 11 3a7 7 0 0 0 10 9.8z" />
        <RailIc d="M7 3h7l4 4v14H7V3z" />
        <RailIc d="M5 7h14M9 7V5h6v2M6 7l1 14h10l1-14" />
      </div>

      {/* Inbox-lijst */}
      <div style={{ width: 540, flexShrink: 0, backgroundColor: T.card, borderRight: `1px solid ${T.border}`, padding: "18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 22, color: T.fg }}>Inbox</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, backgroundColor: merk.flame, color: "#fff", fontSize: 14, fontWeight: 600 }}>✎ Nieuw bericht</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, fontSize: 14 }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${T.border}` }} />
          {["Alle", "Ongelezen", "Vastgepind", "Bijlagen"].map((f, i) => (
            <span key={f} style={{ fontWeight: i === 0 ? 700 : 500, color: i === 0 ? T.fg : T.mutedFg }}>{f}</span>
          ))}
        </div>
        <div style={{ height: 38, borderRadius: 9, border: `1px solid ${T.border}`, backgroundColor: T.muted, display: "flex", alignItems: "center", padding: "0 12px", color: T.mutedFg, fontSize: 14, marginBottom: 10 }}>⌕ Zoek in e-mails…</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: T.mutedFg, padding: "8px 4px" }}>VANDAAG</div>
        <div>
          {MAILS.map((m) => (
            <div key={m.a} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderRadius: 10, borderLeft: m.sel ? `2px solid ${merk.petrol}` : "2px solid transparent", backgroundColor: m.sel ? "#F1EFEA" : "transparent" }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${T.border}`, flexShrink: 0 }} />
              <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: m.kl, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{m.a.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: m.on ? 800 : 600, color: T.fg }}>{m.a}</div>
                <div style={{ fontSize: 14, color: m.on ? T.fg : T.mutedFg, fontWeight: m.on ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.s}</div>
              </div>
              {m.bijlage && <span style={{ color: T.mutedFg, fontSize: 14 }}>📎</span>}
              <span style={{ fontSize: 12, fontFamily: fonts.mono, color: m.on ? T.fg : T.mutedFg, fontWeight: m.on ? 700 : 400, flexShrink: 0 }}>{m.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leesvenster */}
      <div style={{ flex: 1, minWidth: 0, padding: "22px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 14, color: T.mutedFg, marginBottom: 18 }}>
          <span>← Terug</span><span>🗄</span><span>🗑</span><span>✉</span><span>⏱</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, color: merk.petrol, fontWeight: 600 }}>✦ Samenvatten</span>
          <span style={{ fontFamily: fonts.mono }}>1/398</span>
        </div>
        <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 28, color: merk.petrol }}>Akkoord op offerte lichtbakken</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: modules.klanten.kleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>H</div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.fg }}>Hotel De Linde</span>
            <span style={{ fontSize: 14, color: T.mutedFg }}> · lotte@hoteldelinde.nl</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, backgroundColor: merk.petrol, color: "#fff", fontSize: 14, fontWeight: 600 }}>↩ Beantwoorden</span>
          <span style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.fg, fontSize: 14, fontWeight: 500 }}>↩ Allen</span>
          <span style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${T.border}`, color: T.fg, fontSize: 14, fontWeight: 500 }}>→ Doorsturen</span>
        </div>
        <div style={{ marginTop: 26, fontSize: 17, lineHeight: 1.7, color: T.fg, maxWidth: 760 }}>
          <p>Beste Remco,</p>
          <p>Bedankt voor de offerte. We gaan akkoord met de drie lichtbakken zoals besproken. Wanneer kunnen jullie de montage inplannen? We zouden graag voor de opening klaar zijn.</p>
          <p>Alvast bedankt en met vriendelijke groet,<br />Lotte Brouwer<br /><span style={{ color: T.mutedFg }}>Hotel De Linde</span></p>
        </div>
      </div>
    </div>
  </div>
);
