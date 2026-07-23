import { merk } from "../../brand";
import { fonts } from "../../fonts";
import { T } from "./AppChrome";

// De doen.-workflow als verticale rail (van boven naar beneden): Klant -> Project
// -> Offerte -> Tekening -> Portaal -> Planning -> Factuur -> Gedaan. De actieve
// node licht op; de mockup ernaast toont dat scherm. Leidraad voor scene 4.
type Node = {
  key: string;
  label: string;
  cap: string;
  icon: "person" | "tools" | "clip" | "image" | "monitor" | "cal" | "receipt" | "smile";
};

export const NODES: Node[] = [
  { key: "klant", label: "Klant", cap: "doet aanvraag", icon: "person" },
  { key: "project", label: "Project", cap: "alles op één plek", icon: "tools" },
  { key: "offerte", label: "Offerte", cap: "calculeer en verstuur", icon: "clip" },
  { key: "tekening", label: "Tekening", cap: "drukproef en akkoord", icon: "image" },
  { key: "portaal", label: "Portaal", cap: "klant keurt goed", icon: "monitor" },
  { key: "planning", label: "Planning", cap: "werkbon en montage", icon: "cal" },
  { key: "factuur", label: "Factuur", cap: "incasseer eenvoudig", icon: "receipt" },
  { key: "gedaan", label: "Gedaan", cap: "klaar", icon: "smile" },
];

const PATHS: Record<string, string> = {
  person: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20a7 7 0 0 1 14 0",
  tools: "M5 19l6-6M14 6l4 4-9 9H5v-4l9-9zM13 7l4 4",
  clip: "M9 4h6v3H9V4zM7 5H5v15h14V5h-2M9 11h6M9 15h6",
  image: "M4 5h16v14H4V5zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 17l5-5 4 4 3-3 4 4",
  monitor: "M4 5h16v10H4V5zM9 19h6M12 15v4M8.5 10l2 2 3.5-4",
  cal: "M7 3v3M17 3v3M4 8h16M5 6h14v14H5V6z",
  receipt: "M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3zM9 8h6M9 12h6",
  smile: "M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01",
};

const Ico: React.FC<{ name: Node["icon"]; color: string; size?: number }> = ({ name, color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {name === "smile" && <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.7" />}
    <path d={PATHS[name]} stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TOP = 30;
const GAP = 108;
const CX = 30; // hart van de cirkel-kolom

export const WorkflowRail: React.FC<{ active: string }> = ({ active }) => {
  const activeIdx = NODES.findIndex((n) => n.key === active);
  const lastY = (NODES.length - 1) * GAP;

  return (
    <div style={{ position: "relative", width: 520, height: lastY + 90 }}>
      {/* basislijn */}
      <div style={{ position: "absolute", left: CX - 1, top: TOP + 28, width: 2, height: lastY, backgroundColor: "#D4DEDC" }} />
      {/* flame-voortgang tot de actieve node */}
      <div style={{ position: "absolute", left: CX - 1.5, top: TOP + 28, width: 3, height: Math.max(0, activeIdx) * GAP, backgroundColor: merk.flame, borderRadius: 2 }} />

      {NODES.map((n, i) => {
        const y = TOP + i * GAP;
        const isActive = i === activeIdx;
        const done = activeIdx >= 0 && i < activeIdx;
        const filled = n.key === "gedaan" && (isActive || done);
        const circleBg = filled ? "#0F3C44" : done ? merk.petrol : "#FFFFFF";
        const circleBorder = filled ? "#0F3C44" : done || isActive ? merk.petrol : "#C7D2D0";
        const iconColor = filled || done ? "#FFFFFF" : isActive ? merk.petrol : "#A7B4B2";
        const labelColor = isActive ? merk.ink : done || filled ? merk.petrol : "#A7B4B2";
        return (
          <div key={n.key}>
            <div
              style={{
                position: "absolute",
                left: CX,
                top: y,
                transform: `translateX(-50%) scale(${isActive ? 1.12 : 1})`,
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: circleBg,
                border: `2px solid ${circleBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isActive ? `0 0 0 6px ${merk.flame}22` : filled ? "0 6px 18px rgba(15,60,68,0.28)" : "none",
              }}
            >
              <Ico name={n.icon} color={iconColor} />
              {isActive && !filled && (
                <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", backgroundColor: merk.flame, border: "2px solid #fff" }} />
              )}
            </div>
            <div style={{ position: "absolute", left: CX + 48, top: y, height: 56, width: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: fonts.kop, fontWeight: 800, fontSize: 27, color: labelColor, lineHeight: 1 }}>
                {n.label}<span style={{ color: merk.flame }}>.</span>
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 14, letterSpacing: "0.08em", color: isActive ? T.mutedFg : "#B4BCBA", marginTop: 5, textTransform: "uppercase" }}>
                {n.cap}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
