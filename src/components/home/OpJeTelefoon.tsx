'use client'

import { useState } from 'react'
import IphoneMockup, { u } from '@/components/IphoneMockup'

/* Tweede sectie op de home. De hero is petrol-deep en het bewijsblok eronder
   is wit, dus deze staat op het body-vlak: donker, tint, wit als ladder.

   Het toestel is doorklikbaar: de menubalk onderin wisselt echt van scherm.
   De vijf schermen volgen de UX van de app zelf (koptekst met flame-punt,
   hairline-rijen, statusbolletjes met dezelfde kleuren en labels als
   `ProjectsList`, de vaste totaalbalk uit de offerte-editor) en staan vol
   demodata.

   Alle klantnamen zijn verzonnen. Er staat geen echte opdrachtgever op de
   site, ook niet in een mockup.

   Het eerste scherm staat er zonder dat er iets geklikt of geanimeerd hoeft
   te worden; doorklikken is winst, geen voorwaarde. Zie DESIGN.md, Motion. */

type Tab = 'dashboard' | 'projecten' | 'offertes' | 'daan' | 'meer'

const MENU: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projecten', label: 'Projecten' },
  { id: 'offertes', label: 'Offertes' },
  { id: 'daan', label: 'Daan' },
  { id: 'meer', label: 'Meer' },
]

/* Tekens voor de menubalk. Met de hand getekend op 16 bij 16 in plaats van een
   icoonpakket: het gaat om vijf vormen die klein nog leesbaar moeten zijn, en
   een bibliotheek meesturen voor één mockup is zonde. */
function MenuTeken({ naam }: { naam: Tab }) {
  if (naam === 'daan') {
    // Daan heeft in de app een eigen gevuld tegeltje, dat is zijn herkenning.
    return (
      <span
        className="flex items-center justify-center bg-petrol"
        style={{ width: u(17), height: u(17), borderRadius: u(5) }}
      >
        <svg viewBox="0 0 16 16" style={{ width: u(10), height: u(10) }} aria-hidden>
          <path
            d="M2.5 4.2A1.7 1.7 0 0 1 4.2 2.5h7.6a1.7 1.7 0 0 1 1.7 1.7v5a1.7 1.7 0 0 1-1.7 1.7H7l-3 2.6v-2.6h-0.8A1.7 1.7 0 0 1 2.5 9.2z"
            fill="#fff"
          />
        </svg>
      </span>
    )
  }
  return (
    <svg
      viewBox="0 0 16 16"
      style={{ width: u(16), height: u(16) }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      {naam === 'dashboard' && (
        <>
          <rect x="2" y="2" width="5" height="5" rx="1.2" />
          <rect x="9" y="2" width="5" height="5" rx="1.2" />
          <rect x="2" y="9" width="5" height="5" rx="1.2" />
          <rect x="9" y="9" width="5" height="5" rx="1.2" />
        </>
      )}
      {naam === 'projecten' && (
        <path
          d="M2 4.2a1.2 1.2 0 0 1 1.2-1.2h2.9l1.4 1.7h5.3A1.2 1.2 0 0 1 14 5.9v6a1.2 1.2 0 0 1-1.2 1.2H3.2A1.2 1.2 0 0 1 2 11.9z"
          strokeLinejoin="round"
        />
      )}
      {naam === 'offertes' && (
        <>
          <path d="M4 2.2h5l3 3v8.6H4z" strokeLinejoin="round" />
          <path d="M6.2 8.4h4M6.2 10.8h2.6" strokeLinecap="round" />
        </>
      )}
      {naam === 'meer' && (
        <>
          <circle cx="3.4" cy="8" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12.6" cy="8" r="1.1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

function Statusbalk() {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between font-semibold text-ink"
      style={{ padding: `${u(15)} ${u(26)} ${u(2)}`, fontSize: u(11) }}
    >
      <span>09:41</span>
      <span className="flex items-end" style={{ gap: u(4) }}>
        {[4, 6, 8, 10].map((h) => (
          <i key={h} className="block bg-ink" style={{ width: u(2.5), height: u(h), borderRadius: u(1) }} />
        ))}
        <i
          className="block border-ink"
          style={{ marginLeft: u(3), width: u(18), height: u(9), borderRadius: u(2.5), borderWidth: u(1.2) }}
        >
          <i className="block h-full bg-ink" style={{ width: '72%', borderRadius: u(1.5) }} />
        </i>
      </span>
    </div>
  )
}

function Kop({ terug, titel, sub }: { terug?: string; titel: string; sub?: string }) {
  return (
    <div className="flex-shrink-0 bg-white" style={{ padding: `${u(8)} ${u(18)} ${u(13)}` }}>
      {terug && (
        <p className="text-muted" style={{ fontSize: u(11) }}>
          &larr; {terug}
        </p>
      )}
      <p
        className="font-heading font-bold text-petrol"
        style={{ fontSize: u(21), letterSpacing: '-0.03em', marginTop: terug ? u(3) : 0 }}
      >
        {titel}
        <span className="text-flame">.</span>
      </p>
      {sub && (
        <p className="text-muted" style={{ fontSize: u(12), marginTop: u(3) }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function Kaart({ children, gap = 9 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div
      className="flex items-center bg-white"
      style={{ gap: u(gap), padding: `${u(11)} ${u(12)}`, borderRadius: u(10) }}
    >
      {children}
    </div>
  )
}

function Bloklabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-semibold uppercase text-muted"
      style={{ fontSize: u(9), letterSpacing: '0.09em', marginBottom: u(8) }}
    >
      {children}
    </p>
  )
}

// ─── De schermen ───────────────────────────────────────────────────────────

function Offertes() {
  const regels = [
    ['Gevelbelettering', '€ 1.240,00'],
    ['Freesletters RVS', '€ 340,00'],
    ['Montage · hoogwerker', '€ 380,00'],
  ]
  return (
    <>
      <Kop terug="Offertes" titel="Offerte bewerken" sub="Bakker Bouw · Enkhuizen" />
      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <Bloklabel>Offerte-items</Bloklabel>
        <div className="flex flex-col" style={{ gap: u(8) }}>
          {regels.map(([naam, bedrag], i) => (
            <Kaart key={naam}>
              <span
                className="flex flex-shrink-0 items-center justify-center bg-flame font-semibold text-white"
                style={{ width: u(20), height: u(20), borderRadius: u(10), fontSize: u(11) }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold" style={{ fontSize: u(13) }}>
                {naam}
              </span>
              <span className="flex-shrink-0 font-mono font-semibold" style={{ fontSize: u(13) }}>
                {bedrag}
              </span>
            </Kaart>
          ))}
          <span
            className="flex items-center justify-center border border-dashed border-petrol/25 font-semibold text-petrol/70"
            style={{ height: u(36), borderRadius: u(10), fontSize: u(12) }}
          >
            + Item toevoegen
          </span>
        </div>
      </div>

      {/* De vaste balk: het totaal blijft staan terwijl je rekent. */}
      <div
        className="flex flex-shrink-0 items-center border-t border-petrol/10 bg-white"
        style={{ gap: u(8), padding: `${u(10)} ${u(14)}` }}
      >
        <span className="min-w-0 flex-1">
          <span
            className="block font-semibold uppercase text-muted"
            style={{ fontSize: u(9), letterSpacing: '0.09em' }}
          >
            Totaal ex btw
          </span>
          <span className="block font-mono font-bold" style={{ fontSize: u(17), marginTop: u(1) }}>
            € 1.960,00
          </span>
        </span>
        <span
          className="flex flex-shrink-0 items-center bg-petrol font-semibold text-white"
          style={{ height: u(30), padding: `0 ${u(11)}`, borderRadius: u(8), fontSize: u(11.5) }}
        >
          Opslaan
        </span>
        <span
          className="flex flex-shrink-0 items-center bg-flame font-semibold text-white"
          style={{ height: u(30), padding: `0 ${u(11)}`, borderRadius: u(8), fontSize: u(11.5) }}
        >
          Verstuur
        </span>
      </div>
    </>
  )
}

function Dashboard() {
  const cijfers = [
    ['Omzet deze maand', '€ 48.320'],
    ['Offertes open', '7'],
    ['Te factureren', '3'],
  ]
  const vandaag = [
    ['08:00', 'Montage Bakker Bouw · gevelreclame'],
    ['11:30', 'Drukproef Hotel De Wadden nakijken'],
    ['14:00', 'Inmeten Van Dijk Tandarts'],
  ]
  return (
    <>
      <Kop titel="Vandaag" sub="Maandag 8 september" />
      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <Bloklabel>Cijfers</Bloklabel>
        <div className="flex flex-col" style={{ gap: u(6), marginBottom: u(14) }}>
          {cijfers.map(([label, waarde]) => (
            <Kaart key={label}>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: u(12.5) }}>
                {label}
              </span>
              <span className="flex-shrink-0 font-mono font-bold text-petrol" style={{ fontSize: u(13.5) }}>
                {waarde}
              </span>
            </Kaart>
          ))}
        </div>

        <Bloklabel>Vandaag</Bloklabel>
        <div className="bg-white" style={{ borderRadius: u(10), padding: `${u(2)} ${u(12)}` }}>
          {vandaag.map(([tijd, wat], i) => (
            <span
              key={tijd}
              className={`flex items-center ${i > 0 ? 'border-t border-petrol/10' : ''}`}
              style={{ gap: u(10), padding: `${u(10)} 0` }}
            >
              <span className="flex-shrink-0 font-mono font-semibold text-petrol" style={{ fontSize: u(11.5) }}>
                {tijd}
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: u(12.5) }}>
                {wat}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

function Projecten() {
  // Dezelfde statuslabels en bolkleuren als ProjectsList in de app zelf.
  const projecten: [string, string, string][] = [
    ['Bakker Bouw · gevelreclame', 'Actief', '#2D6B48'],
    ['Van Dijk Tandarts · raambelettering', 'Te plannen', '#F15025'],
    ['Hotel De Wadden · lichtbak', 'In review', '#5A5A55'],
    ['Sportclub Enkhuizen · spandoeken', 'Te factureren', '#2D6B48'],
    ['Garage Sluis · wagenpark', 'Gepland', '#2A5580'],
  ]
  return (
    <>
      <Kop titel="Projecten" sub="5 lopend" />
      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <div className="flex flex-col" style={{ gap: u(6) }}>
          {projecten.map(([naam, status, kleur]) => (
            <Kaart key={naam} gap={8}>
              <i
                className="block flex-shrink-0"
                style={{ width: u(7), height: u(7), borderRadius: u(4), background: kleur }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold" style={{ fontSize: u(12.5) }}>
                  {naam}
                </span>
                <span className="block text-muted" style={{ fontSize: u(10.5), marginTop: u(1) }}>
                  {status}
                </span>
              </span>
            </Kaart>
          ))}
        </div>
      </div>
    </>
  )
}

function Daan() {
  return (
    <>
      <Kop titel="Daan" sub="Je bedrijfsgeheugen" />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ padding: u(14), gap: u(10) }}>
        <span
          className="self-end bg-petrol text-white"
          style={{
            maxWidth: '82%',
            padding: `${u(9)} ${u(12)}`,
            borderRadius: `${u(12)} ${u(12)} ${u(3)} ${u(12)}`,
            fontSize: u(12),
            lineHeight: 1.5,
          }}
        >
          Wat staat er nog open bij Bakker Bouw?
        </span>
        <span
          className="self-start bg-white"
          style={{
            maxWidth: '88%',
            padding: `${u(9)} ${u(12)}`,
            borderRadius: `${u(12)} ${u(12)} ${u(12)} ${u(3)}`,
            fontSize: u(12),
            lineHeight: 1.5,
          }}
        >
          Offerte OFF-2026-388 van <span className="font-mono font-semibold">€ 1.960,00</span> staat
          sinds dinsdag open. De montage is gepland op 14 oktober en de drukproef wacht nog op akkoord.
        </span>
        <span
          className="mt-auto flex items-center border border-petrol/15 bg-white text-muted"
          style={{ height: u(34), padding: `0 ${u(12)}`, borderRadius: u(17), fontSize: u(11.5) }}
        >
          Vraag Daan iets
        </span>
      </div>
    </>
  )
}

function Meer() {
  const modules = ['Werkbonnen', 'Planning', 'Taken', 'Facturen', 'Inkoop', 'Klanten', 'Instellingen']
  return (
    <>
      <Kop titel="Meer" />
      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <div className="bg-white" style={{ borderRadius: u(10), padding: `0 ${u(12)}` }}>
          {modules.map((m, i) => (
            <span
              key={m}
              className={`flex items-center justify-between ${i > 0 ? 'border-t border-petrol/10' : ''}`}
              style={{ padding: `${u(11)} 0`, fontSize: u(12.5) }}
            >
              <span className="font-semibold">{m}</span>
              <span className="text-petrol/40">&rsaquo;</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

const SCHERMEN: Record<Tab, () => JSX.Element> = {
  dashboard: Dashboard,
  projecten: Projecten,
  offertes: Offertes,
  daan: Daan,
  meer: Meer,
}

// ─── De sectie ─────────────────────────────────────────────────────────────

export default function OpJeTelefoon() {
  const [tab, zetTab] = useState<Tab>('offertes')
  const Scherm = SCHERMEN[tab]

  return (
    <section>
      <div className="container-site py-14 md:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div>
            <h2
              className="font-heading font-bold text-petrol leading-[1.0]"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Ook vanuit de bus<span className="text-flame">.</span>
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] md:text-[16px] leading-[1.6] text-muted">
              Geen uitgeknepen desktopscherm. Je maakt de offerte, rekent hem door en verstuurt hem
              met je duim, tussen twee klussen in. Tik de menubalk aan, dan loop je er zelf doorheen.
            </p>

            <ul className="mt-8 border-t border-petrol/10">
              {[
                ['Offerte de deur uit', 'Klaar voor je terug bent op kantoor.'],
                ['Marge in beeld', 'Het totaal blijft staan terwijl je typt, ook op een klein scherm.'],
                ['De rest gaat mee', 'Mail, projecten, planning en werkbonnen. Zelfde app, kleiner scherm.'],
                [
                  'Op je beginscherm',
                  'Vanuit Safari of Chrome maak je er een webapp van. Hij opent zonder adresbalk, als een gewone app. Niks te installeren, geen app-store.',
                ],
              ].map(([kop, regel]) => (
                <li key={kop} className="flex flex-col gap-1 border-b border-petrol/10 py-4 sm:flex-row sm:gap-6">
                  <span className="w-[13rem] flex-shrink-0 text-[15px] font-semibold text-petrol">{kop}</span>
                  <span className="text-[15px] leading-[1.55] text-muted">{regel}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <IphoneMockup>
              <div className="flex h-full w-full flex-col bg-bg font-sans text-ink">
                <Statusbalk />
                <Scherm />

                {/* De menubalk van de app. Welke vijf er staan kiest de
                    gebruiker zelf, dus Offertes mag hier in beeld staan. */}
                <nav
                  aria-label="Schermen van doen."
                  className="flex flex-shrink-0 items-stretch border-t border-petrol/10 bg-white"
                  style={{ paddingBottom: u(14) }}
                >
                  {MENU.map(({ id, label }) => {
                    const actief = id === tab
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => zetTab(id)}
                        aria-pressed={actief}
                        className={`relative flex flex-1 flex-col items-center justify-center transition-colors ${
                          actief ? 'text-petrol' : 'text-petrol/45 hover:text-petrol/70'
                        }`}
                        style={{ gap: u(3), height: u(46) }}
                      >
                        {actief && (
                          <i
                            aria-hidden
                            className="absolute left-1/2 top-0 -translate-x-1/2 bg-flame"
                            style={{ height: u(2), width: u(24), borderRadius: `0 0 ${u(2)} ${u(2)}` }}
                          />
                        )}
                        <MenuTeken naam={id} />
                        <span className="font-semibold" style={{ fontSize: u(8.5), letterSpacing: '-0.01em' }}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </IphoneMockup>
          </div>
        </div>
      </div>
    </section>
  )
}
