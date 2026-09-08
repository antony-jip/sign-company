import type { ReactNode } from 'react'

/* iPhone-frame voor productbeeld op de site. Opmaak, geen plaatje: het scherm
   blijft daardoor scherp op elk toestel, de inhoud is gewone tekst die
   meebeweegt met de tokens, en er is geen asset om bij te houden.

   Alle maten hangen aan één variabele `--u`. Die staat in px en wordt per
   breekpunt groter; `u(n)` rekent elke maat daarop terug. Vandaar inline
   `style` in plaats van klassen: het gaat hier om tientallen exacte maten die
   samen moeten schalen, en die horen bij elkaar te blijven staan.

   Verhoudingen van een iPhone 15 Pro, teruggerekend naar 300 breed: 19,5:9,
   hoekstraal 15,5% van de breedte, rand van 11 rondom.

   `label` alleen meegeven als het toestel puur beeld is: dan krijgt een
   schermlezer één zin in plaats van losse woorden uit een mockup. Zit er iets
   klikbaars in, laat hem dan weg, anders verdwijnen die knoppen uit de
   toegankelijkheidsboom. */

export const u = (n: number) => `calc(var(--u) * ${n})`

type Props = {
  /** Wat er op het scherm staat. Vult de volle schermhoogte. */
  children: ReactNode
  /** Eén zin die vervangt wat er te zien is. Alleen voor een stil toestel. */
  label?: string
  className?: string
}

export default function IphoneMockup({ children, label, className = '' }: Props) {
  return (
    <div
      {...(label ? { role: 'img', 'aria-label': label } : {})}
      className={`relative [--u:0.78px] sm:[--u:0.86px] lg:[--u:0.9px] ${className}`}
      style={{ width: u(300) }}
    >
      {/* Zijknoppen. Steken 2 uit, dus het toestel wil links en rechts
          een paar pixels lucht van de sectie eromheen. */}
      {[
        { kant: 'left', top: 112, hoog: 30 },
        { kant: 'left', top: 158, hoog: 54 },
        { kant: 'left', top: 224, hoog: 54 },
        { kant: 'right', top: 186, hoog: 86 },
      ].map((knop, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute bg-[#2E3134]"
          style={{
            [knop.kant]: u(-2),
            top: u(knop.top),
            width: u(2),
            height: u(knop.hoog),
            borderRadius: knop.kant === 'left' ? `${u(2)} 0 0 ${u(2)}` : `0 ${u(2)} ${u(2)} 0`,
          }}
        />
      ))}

      {/* Behuizing */}
      <div
        className="relative bg-[#1B1D1F]"
        style={{
          height: u(650),
          borderRadius: u(47),
          padding: u(11),
          boxShadow: `0 ${u(2)} ${u(4)} ${u(-2)} rgba(13,52,60,0.28), 0 ${u(40)} ${u(70)} ${u(-34)} rgba(13,52,60,0.55)`,
        }}
      >
        {/* De dunne lichtlijn tussen behuizing en scherm. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ borderRadius: u(47), boxShadow: `inset 0 0 0 ${u(1.5)} rgba(255,255,255,0.10)` }}
        />

        {/* Scherm */}
        <div className="relative h-full w-full overflow-hidden bg-white" style={{ borderRadius: u(36) }}>
          {children}

          {/* Dynamic Island en het streepje horen boven de inhoud. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bg-black"
            style={{ top: u(10), height: u(26), width: u(86), borderRadius: u(13) }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bg-ink/25"
            style={{ bottom: u(7), height: u(4), width: u(104), borderRadius: u(2) }}
          />
        </div>
      </div>
    </div>
  )
}
