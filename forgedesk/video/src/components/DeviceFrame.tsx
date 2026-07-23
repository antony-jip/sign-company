import type { CSSProperties, ReactNode } from "react";

// Drager voor geporte forgedesk-schermen (Fase 2). Twee varianten:
//   - browser: titelbalk + adresbalk, voor desktop-schermen (offerte, Daan).
//   - iphone:  frame met dynamic-island + safe-area, voor de monteur-scene.
// Warme schaduw (bruin-getint), geen zwart. iPhone-bezel is donker-petrol,
// niet puur zwart, zodat het op-merk blijft.

// Warme elevatie, in lijn met forgedesk (--shadow rgba(120,90,50,...)).
const WARME_SCHADUW =
  "0 30px 80px -24px rgba(120,90,50,0.34), 0 12px 32px -14px rgba(120,90,50,0.22)";

const BEZEL = "#15323A"; // donker-petrol, geen zwart

type BrowserProps = {
  variant: "browser";
  url?: string;
  width?: number;
  children: ReactNode;
  style?: CSSProperties;
};

type IphoneProps = {
  variant: "iphone";
  width?: number; // breedte van het hele toestel
  children: ReactNode;
  style?: CSSProperties;
};

type DeviceFrameProps = BrowserProps | IphoneProps;

const Browser: React.FC<Omit<BrowserProps, "variant">> = ({
  url = "app.doen.team",
  width = 1400,
  children,
  style,
}) => {
  const balkHoogte = 52;
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        backgroundColor: "#FFFFFE",
        boxShadow: WARME_SCHADUW,
        overflow: "hidden",
        border: "1px solid rgba(120,90,50,0.10)",
        ...style,
      }}
    >
      {/* Titelbalk */}
      <div
        style={{
          height: balkHoogte,
          backgroundColor: "#EFece6",
          borderBottom: "1px solid rgba(120,90,50,0.10)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        {/* Verkeerslicht-stippen, warm-grijs (geen fel rood/geel/groen) */}
        <div style={{ display: "flex", gap: 9 }}>
          {["#D7B8AE", "#E0D2B0", "#B9D2BE"].map((c) => (
            <div
              key={c}
              style={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                backgroundColor: c,
              }}
            />
          ))}
        </div>
        {/* Adresbalk */}
        <div
          style={{
            flex: 1,
            maxWidth: 520,
            margin: "0 auto",
            height: 32,
            borderRadius: 9,
            backgroundColor: "#F8F6F2",
            border: "1px solid rgba(120,90,50,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#7A746B",
            fontSize: 15,
            fontFamily: '"DM Mono", ui-monospace, monospace',
          }}
        >
          <span style={{ fontSize: 12 }}>{"\u{1F512}"}</span>
          {url}
        </div>
        {/* Rechter-vulling zodat de adresbalk optisch gecentreerd blijft */}
        <div style={{ width: 67 }} />
      </div>
      {/* Scherm-inhoud (geport forgedesk-component) */}
      <div style={{ backgroundColor: "#F4F3F0" }}>{children}</div>
    </div>
  );
};

const Iphone: React.FC<Omit<IphoneProps, "variant">> = ({
  width = 380,
  children,
  style,
}) => {
  const bezel = Math.round(width * 0.035);
  // Scherm-aspect ~9:19.5 (modern iPhone). Een 9:16-werkbon past hier netjes in.
  const schermBreedte = width - bezel * 2;
  const schermHoogte = Math.round(schermBreedte * (19.5 / 9));
  const radiusBuiten = Math.round(width * 0.16);
  const radiusScherm = radiusBuiten - bezel;
  const safeTop = Math.round(schermHoogte * 0.055); // ruimte onder de island

  return (
    <div
      style={{
        width,
        padding: bezel,
        borderRadius: radiusBuiten,
        backgroundColor: BEZEL,
        boxShadow: WARME_SCHADUW,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: schermBreedte,
          height: schermHoogte,
          borderRadius: radiusScherm,
          overflow: "hidden",
          backgroundColor: "#F4F3F0",
        }}
      >
        {/* Safe-area boven: content begint onder de island */}
        <div style={{ height: safeTop }} />
        <div style={{ height: schermHoogte - safeTop, overflow: "hidden" }}>
          {children}
        </div>
        {/* Dynamic island */}
        <div
          style={{
            position: "absolute",
            top: Math.round(schermHoogte * 0.018),
            left: "50%",
            transform: "translateX(-50%)",
            width: Math.round(schermBreedte * 0.3),
            height: Math.round(schermBreedte * 0.085),
            borderRadius: 999,
            backgroundColor: BEZEL,
          }}
        />
      </div>
    </div>
  );
};

export const DeviceFrame: React.FC<DeviceFrameProps> = (props) => {
  if (props.variant === "browser") {
    const { variant: _v, ...rest } = props;
    return <Browser {...rest} />;
  }
  const { variant: _v, ...rest } = props;
  return <Iphone {...rest} />;
};
