import { interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { FLAME, flameA, GRIJS, INK, KAART, OFFWHITE, PAGINA, PETROL } from "./palet";
import { CursorPulse, StatusBadge, TelOp } from "./overlays";
import type { Scherm } from "./tijdlijn";

// Doorlopende dataset door de hele film. Sectie 6 van het productieboek: als
// het bedrag verandert tussen offerte en factuur is de kijker de film kwijt.
export const KLANT = "Bouwbedrijf Kuiper";
export const PROJECT = "Lichtbakken hoofdvestiging";
export const REGEL = "Lichtbak 3000x800 enkelzijdig";
export const STUKS = 3;
export const STUKPRIJS = 1485;
export const MONTAGE = 780;
export const TOTAAL = STUKS * STUKPRIJS + MONTAGE; // 5235

const euro = (n: number) => n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Balk: React.FC<{ titel: string }> = ({ titel }) => (
  <div style={{ backgroundColor: PETROL, color: OFFWHITE, padding: "26px 34px", display: "flex", alignItems: "center", gap: 16 }}>
    <span style={{ fontFamily: fonts.kop, fontSize: 30, letterSpacing: "-0.02em" }}>
      doen<span style={{ color: FLAME }}>.</span>
    </span>
    <span style={{ fontFamily: fonts.body, fontSize: 24, opacity: 0.72 }}>{titel}</span>
  </div>
);

const Kaart: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ backgroundColor: KAART, borderRadius: 18, border: "1px solid rgba(26,83,92,0.10)", padding: 26, ...style }}>
    {children}
  </div>
);

const Veld: React.FC<{ label: string; waarde: string; zichtbaarOp?: number }> = ({ label, waarde, zichtbaarOp }) => {
  const f = useCurrentFrame();
  const aan = zichtbaarOp === undefined || f >= zichtbaarOp;
  const dekking = zichtbaarOp === undefined ? 1 : interpolate(f, [zichtbaarOp, zichtbaarOp + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid rgba(26,83,92,0.08)", opacity: aan ? dekking : 0 }}>
      <span style={{ color: GRIJS, fontSize: 24 }}>{label}</span>
      <span style={{ color: INK, fontSize: 24, fontWeight: 500 }}>{waarde}</span>
    </div>
  );
};

/** Elk scherm krijgt de frame-offset van zijn eigen shot, zodat overlays lokaal tellen. */
type Props = { stap?: string };

const Lockscreen: React.FC<Props> = () => (
  <div style={{ width: "100%", height: "100%", backgroundColor: "#0E1B1F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 60 }}>
    <div style={{ fontFamily: fonts.body, color: OFFWHITE, fontSize: 130, fontWeight: 300, letterSpacing: "-0.03em" }}>06:45</div>
    <Kaart style={{ width: 780, backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
        <span style={{ fontFamily: fonts.kop, fontSize: 26, color: OFFWHITE }}>
          doen<span style={{ color: FLAME }}>.</span>
        </span>
        <span style={{ color: "rgba(248,247,245,0.55)", fontSize: 22 }}>nu</span>
      </div>
      <div style={{ color: OFFWHITE, fontSize: 30, fontWeight: 600 }}>nieuwe lead</div>
      <div style={{ color: "rgba(248,247,245,0.72)", fontSize: 26 }}>{KLANT}</div>
    </Kaart>
  </div>
);

const Dashboard: React.FC<Props> = () => (
  <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
    <Balk titel="vandaag" />
    <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 22 }}>
      <Kaart>
        <div style={{ color: GRIJS, fontSize: 24, marginBottom: 8 }}>omzet deze maand</div>
        <TelOp start={6} naar={48320} duur={16} prefix="EUR " style={{ fontSize: 68, fontWeight: 500, letterSpacing: "-0.02em" }} />
      </Kaart>
      <div style={{ display: "flex", gap: 22 }}>
        <Kaart style={{ flex: 1 }}>
          <div style={{ color: GRIJS, fontSize: 22 }}>projecten</div>
          <TelOp start={10} naar={3} duur={8} style={{ fontSize: 52, fontWeight: 500 }} />
        </Kaart>
        <Kaart style={{ flex: 1 }}>
          <div style={{ color: GRIJS, fontSize: 22 }}>vandaag gepland</div>
          <TelOp start={12} naar={5} duur={8} style={{ fontSize: 52, fontWeight: 500 }} />
        </Kaart>
      </div>
      <Kaart>
        <div style={{ color: INK, fontSize: 26, fontWeight: 600 }}>{PROJECT}</div>
        <div style={{ color: GRIJS, fontSize: 23, marginTop: 6 }}>{KLANT}</div>
      </Kaart>
    </div>
  </div>
);

const Leads: React.FC<Props> = () => (
  <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
    <Balk titel="leads" />
    <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
      <Kaart style={{ border: `1px solid ${FLAME}44` }}>
        <div style={{ color: INK, fontSize: 30, fontWeight: 600 }}>{KLANT}</div>
        <div style={{ color: GRIJS, fontSize: 24, marginTop: 6 }}>drie lichtbakken, hoofdvestiging</div>
        <StatusBadge woord="nieuw" actief style={{ marginTop: 16 }} />
      </Kaart>
      <Kaart style={{ opacity: 0.45 }}>
        <div style={{ color: INK, fontSize: 28, fontWeight: 600 }}>Garage Bakker</div>
        <div style={{ color: GRIJS, fontSize: 23, marginTop: 6 }}>gevelbelettering</div>
      </Kaart>
      <Kaart style={{ opacity: 0.28 }}>
        <div style={{ color: INK, fontSize: 28, fontWeight: 600 }}>De Vries Transport</div>
      </Kaart>
      <CursorPulse start={22} x={420} y={150} />
    </div>
  </div>
);

const Klantkaart: React.FC<Props> = () => (
  <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
    <Balk titel="klantkaart" />
    <div style={{ padding: 34 }}>
      <Kaart>
        <div style={{ color: INK, fontSize: 34, fontWeight: 600, marginBottom: 14 }}>{KLANT}</div>
        {/* Veld voor veld, 5 frames uit elkaar: alles tegelijk leest als een laadscherm. */}
        <Veld label="KvK" waarde="37109482" zichtbaarOp={14} />
        <Veld label="adres" waarde="Nijverheidsweg 12" zichtbaarOp={19} />
        <Veld label="plaats" waarde="Hoorn" zichtbaarOp={24} />
        <Veld label="contact" waarde="R. Kuiper" zichtbaarOp={29} />
        <Veld label="e-mail" waarde="r.kuiper@bbkuiper.nl" zichtbaarOp={34} />
      </Kaart>
    </div>
  </div>
);

const Offerte: React.FC<Props> = ({ stap }) => {
  const toonRegel = stap !== "offerte openen" && stap !== "regel toevoegen";
  const toonPrijs = stap === "prijs telt op" || stap === "totaal" || stap === "versturen";
  const toonTotaal = stap === "totaal" || stap === "versturen";
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
      <Balk titel="offerte" />
      <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 20, position: "relative", flex: 1 }}>
        <Kaart>
          <div style={{ color: GRIJS, fontSize: 22 }}>klant</div>
          <div style={{ color: INK, fontSize: 30, fontWeight: 600 }}>{KLANT}</div>
        </Kaart>
        <Kaart style={{ flex: 1 }}>
          {toonRegel ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ color: INK, fontSize: 26, fontWeight: 500 }}>{REGEL}</div>
                <div style={{ color: GRIJS, fontSize: 22, marginTop: 4 }}>{STUKS} stuks</div>
              </div>
              {toonPrijs ? (
                <TelOp start={2} naar={STUKS * STUKPRIJS} duur={12} prefix="EUR " decimalen={2} style={{ fontSize: 34, fontWeight: 500 }} />
              ) : (
                <span style={{ color: GRIJS, fontSize: 30 }}>EUR ...</span>
              )}
            </div>
          ) : (
            <div style={{ color: GRIJS, fontSize: 26, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 40, color: FLAME }}>+</span> regel toevoegen
            </div>
          )}
          {toonTotaal ? (
            <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid rgba(26,83,92,0.12)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: INK, fontSize: 28, fontWeight: 600 }}>totaal excl. btw</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 36, fontWeight: 500 }}>EUR {euro(TOTAAL)}</span>
            </div>
          ) : null}
        </Kaart>
        {stap === "versturen" ? (
          <div style={{ backgroundColor: FLAME, color: OFFWHITE, borderRadius: 14, padding: "22px 0", textAlign: "center", fontSize: 30, fontWeight: 600 }}>
            versturen
          </div>
        ) : null}
        {stap === "regel toevoegen" ? <CursorPulse start={6} x={200} y={330} /> : null}
        {stap === "versturen" ? <CursorPulse start={8} x={540} y={880} /> : null}
      </div>
    </div>
  );
};

const Offertestatus: React.FC<Props> = ({ stap }) => {
  const woord = stap === "getekend" ? "getekend" : "verstuurd";
  const flip = stap === "concept" ? undefined : 4;
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
      <Balk titel="offerte" />
      <div style={{ padding: 34 }}>
        <Kaart>
          <div style={{ color: INK, fontSize: 32, fontWeight: 600 }}>{PROJECT}</div>
          <div style={{ color: GRIJS, fontSize: 24, marginTop: 6 }}>{KLANT}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 40, fontWeight: 500, marginTop: 18 }}>EUR {euro(TOTAAL)}</div>
          <div style={{ marginTop: 24 }}>
            {stap === "concept" ? <StatusBadge woord="concept" /> : <StatusBadge woord={woord} flipOp={flip} />}
          </div>
        </Kaart>
      </div>
    </div>
  );
};

const Werkbon: React.FC<Props> = ({ stap }) => {
  const toonFoto = stap === "foto landt" || stap === "uren loggen" || stap === "gelogd";
  const toonUren = stap === "uren loggen" || stap === "gelogd";
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
      <Balk titel="werkbon" />
      <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <Kaart>
          <div style={{ color: INK, fontSize: 28, fontWeight: 600 }}>{PROJECT}</div>
        </Kaart>
        <Kaart style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {toonFoto ? (
            <div style={{ width: "100%", height: 260, borderRadius: 12, background: "linear-gradient(140deg,#2A4A52,#16323A)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(248,247,245,0.5)", fontSize: 22 }}>
              foto gefreesde letter
            </div>
          ) : (
            <div style={{ color: GRIJS, fontSize: 26 }}>foto toevoegen</div>
          )}
        </Kaart>
        <Kaart>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: GRIJS, fontSize: 26 }}>uren</span>
            {toonUren ? (
              <TelOp start={2} naar={3.5} duur={14} decimalen={1} achtervoegsel=" u" style={{ fontSize: 44, fontWeight: 500 }} />
            ) : (
              <span style={{ fontFamily: fonts.mono, fontSize: 44, color: GRIJS }}>0,0 u</span>
            )}
          </div>
        </Kaart>
        {stap === "gelogd" ? <StatusBadge woord="gelogd" flipOp={4} style={{ alignSelf: "flex-start" }} /> : null}
        {stap === "camera openen" ? <CursorPulse start={5} x={540} y={430} /> : null}
        {stap === "gelogd" ? <CursorPulse start={2} x={540} y={760} /> : null}
      </div>
    </div>
  );
};

const Planning: React.FC<Props> = ({ stap }) => {
  const f = useCurrentFrame();
  const sleept = stap === "slepen";
  const geland = stap === "landt" || stap === "conflict dooft";
  const dooft = stap === "conflict dooft";
  // 12 frames doven, zoals shot 7F voorschrijft.
  const conflict = dooft ? interpolate(f, [6, 18], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const x = sleept ? interpolate(f, [0, 30], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : geland ? 300 : 0;
  const dagen = ["ma", "di", "wo", "do", "vr"];
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
      <Balk titel="planning" />
      <div style={{ padding: 34, position: "relative" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {dagen.map((d) => (
            <div key={d} style={{ flex: 1 }}>
              <div style={{ color: GRIJS, fontSize: 24, marginBottom: 12 }}>{d}</div>
              <div style={{ minHeight: 420, borderRadius: 14, backgroundColor: "rgba(26,83,92,0.04)", border: "1px dashed rgba(26,83,92,0.14)" }} />
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: 34 + x,
            top: 118,
            width: 290,
            backgroundColor: KAART,
            borderRadius: 14,
            border: `2px solid ${dooft ? flameA(conflict * 0.6) : flameA(0.6)}`,
            padding: 20,
            boxShadow: "0 18px 40px -18px rgba(26,83,92,0.4)",
          }}
        >
          <div style={{ color: INK, fontSize: 24, fontWeight: 600 }}>Montage Kuiper</div>
          <div style={{ color: GRIJS, fontSize: 21, marginTop: 4 }}>2 monteurs</div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, opacity: conflict }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FLAME }} />
            <span style={{ color: FLAME, fontSize: 20, fontWeight: 600 }}>conflict</span>
          </div>
        </div>
        {sleept ? <CursorPulse start={2} x={34 + x + 145} y={190} /> : null}
      </div>
    </div>
  );
};

const Portaal: React.FC<Props> = ({ stap }) => (
  <div style={{ width: "100%", height: "100%", backgroundColor: OFFWHITE, display: "flex", flexDirection: "column" }}>
    <Balk titel="klantportaal" />
    <div style={{ padding: 44, position: "relative", flex: 1 }}>
      <Kaart style={{ maxWidth: 900 }}>
        <div style={{ color: GRIJS, fontSize: 24 }}>offerte van Signbedrijf</div>
        <div style={{ color: INK, fontSize: 38, fontWeight: 600, marginTop: 8 }}>{PROJECT}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 44, fontWeight: 500, marginTop: 20 }}>EUR {euro(TOTAAL)}</div>
        <div style={{ marginTop: 30, display: "flex", gap: 16 }}>
          <div style={{ backgroundColor: stap === "akkoord" ? FLAME : "rgba(26,83,92,0.10)", color: stap === "akkoord" ? OFFWHITE : INK, borderRadius: 12, padding: "18px 40px", fontSize: 26, fontWeight: 600 }}>
            akkoord
          </div>
          <div style={{ color: GRIJS, borderRadius: 12, padding: "18px 30px", fontSize: 26 }}>vraag stellen</div>
        </div>
      </Kaart>
      {stap === "akkoord" ? <CursorPulse start={8} x={200} y={430} /> : null}
    </div>
  </div>
);

const Factuur: React.FC<Props> = ({ stap }) => {
  const f = useCurrentFrame();
  const regels = [
    { naam: REGEL, bedrag: STUKS * STUKPRIJS },
    { naam: "Montage op locatie", bedrag: MONTAGE },
  ];
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: PAGINA, display: "flex", flexDirection: "column" }}>
      <Balk titel="factuur" />
      <div style={{ padding: 44 }}>
        <Kaart style={{ maxWidth: 1000 }}>
          <div style={{ color: GRIJS, fontSize: 24 }}>uit project</div>
          <div style={{ color: INK, fontSize: 34, fontWeight: 600, marginTop: 4 }}>{PROJECT}</div>
          <div style={{ marginTop: 26 }}>
            {regels.map((r, i) => {
              // Regels rollen van boven naar beneden uit het project, 8 frames uit elkaar.
              const op = stap === "rolt uit project" ? 6 + i * 8 : 0;
              const d = interpolate(f, [op, op + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={r.naam} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid rgba(26,83,92,0.08)", opacity: d }}>
                  <span style={{ color: INK, fontSize: 26 }}>{r.naam}</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 26 }}>EUR {euro(r.bedrag)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: INK, fontSize: 30, fontWeight: 600 }}>totaal</span>
            {stap === "bedrag telt op" ? (
              <TelOp start={2} naar={TOTAAL} duur={14} prefix="EUR " decimalen={2} style={{ fontSize: 46, fontWeight: 500 }} />
            ) : (
              <span style={{ fontFamily: fonts.mono, fontSize: 46, fontWeight: 500 }}>EUR {euro(TOTAAL)}</span>
            )}
          </div>
          {stap === "verstuurd" ? <StatusBadge woord="verstuurd" flipOp={6} style={{ marginTop: 24 }} /> : null}
        </Kaart>
      </div>
    </div>
  );
};

const Push: React.FC<Props> = () => (
  <div style={{ width: "100%", height: "100%", backgroundColor: "#0E1B1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Kaart style={{ width: 860, backgroundColor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <span style={{ fontFamily: fonts.kop, fontSize: 28, color: OFFWHITE }}>
          doen<span style={{ color: FLAME }}>.</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <StatusBadge woord="betaald" flipOp={8} style={{ fontSize: 34, padding: "10px 22px" }} />
        <span style={{ color: "rgba(248,247,245,0.72)", fontSize: 28, fontFamily: fonts.mono }}>EUR {euro(TOTAAL)}</span>
      </div>
      <div style={{ color: "rgba(248,247,245,0.55)", fontSize: 24, marginTop: 12 }}>{KLANT}</div>
    </Kaart>
  </div>
);

const REGISTER: Record<Scherm, React.FC<Props>> = {
  lockscreen: Lockscreen,
  dashboard: Dashboard,
  leads: Leads,
  klantkaart: Klantkaart,
  offerte: Offerte,
  offertestatus: Offertestatus,
  werkbon: Werkbon,
  planning: Planning,
  portaal: Portaal,
  factuur: Factuur,
  push: Push,
};

export const SchermBeeld: React.FC<{ scherm: Scherm; stap?: string }> = ({ scherm, stap }) => {
  const C = REGISTER[scherm];
  return <C stap={stap} />;
};
