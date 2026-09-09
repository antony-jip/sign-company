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
  /* De echte kop van het dashboard: petrol-deep band met "Klaar om te
     <werkwoord>, <naam>." waarin het werkwoord in serif-cursief staat, en de
     flame-punt erachter. Daaronder de KPI-strip met precies de twee kaarten
     die de app toont, en het Vandaag-blok. */
  const kpi = [
    { label: 'In pijplijn', bedrag: '€ 24.180', sub: '7 offertes, ex btw', kleur: '#1A535C', vlak: 'rgba(26,83,92,0.08)' },
    { label: 'Deze week', bedrag: '€ 8.940', sub: 'gefactureerd, ex btw', kleur: '#3A7D52', vlak: '#E8F2EC' },
  ]
  const vandaag = [
    ['08:00', 'Montage Bakker Bouw'],
    ['11:30', 'Drukproef Hotel De Wadden'],
    ['14:00', 'Inmeten Van Dijk Tandarts'],
  ]
  return (
    <>
      <div className="flex-shrink-0 bg-petrol-deep" style={{ padding: `${u(10)} ${u(18)} ${u(16)}` }}>
        <p
          className="font-heading font-bold text-white"
          style={{ fontSize: u(23), letterSpacing: u(-1), lineHeight: 1.05 }}
        >
          Klaar om te{' '}
          <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontWeight: 400 }}>
            maken
          </span>
          , Antony<span style={{ color: '#D24620' }}>.</span>
        </p>
      </div>

      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <div className="grid grid-cols-2" style={{ gap: u(8), marginBottom: u(14) }}>
          {kpi.map((k) => (
            <div key={k.label} className="bg-white" style={{ borderRadius: u(12), padding: u(11) }}>
              <span
                className="inline-flex items-center font-semibold"
                style={{ background: k.vlak, color: k.kleur, borderRadius: u(6), padding: `${u(2)} ${u(6)}`, fontSize: u(9) }}
              >
                {k.label}
              </span>
              <p className="font-mono font-bold text-ink" style={{ fontSize: u(17), marginTop: u(7) }}>
                {k.bedrag}
              </p>
              <p className="text-muted" style={{ fontSize: u(9.5), marginTop: u(2) }}>
                {k.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white" style={{ borderRadius: u(12), padding: `${u(11)} ${u(12)}` }}>
          <p className="font-heading font-bold text-ink" style={{ fontSize: u(13), marginBottom: u(6) }}>
            Vandaag<span className="text-flame">.</span>
          </p>
          {vandaag.map(([tijd, wat], i) => (
            <span
              key={tijd}
              className={`flex items-center ${i > 0 ? 'border-t border-petrol/10' : ''}`}
              style={{ gap: u(10), padding: `${u(8)} 0` }}
            >
              <span className="flex-shrink-0 font-mono font-semibold text-petrol" style={{ fontSize: u(11) }}>
                {tijd}
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: u(12) }}>
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
  /* De mobiele projectkaart uit de app: gekleurde balk links via een inset
     box-shadow, naam en klant boven elkaar, statuspil rechtsboven met een
     flame-punt achter het label, en onderin nummer, dagen open en bedrag in
     mono. Kleuren zijn letterlijk die van getStatusTextColor en statusBg. */
  const projecten = [
    { naam: 'Gevelreclame nieuwe vestiging', klant: 'Bakker Bouw', status: 'Actief', tekst: '#3A5A9A', vlak: '#E8EEF9', nr: 'PRJ-2026-118', dagen: '4d', bedrag: '€ 4.820' },
    { naam: 'Raambelettering praktijk', klant: 'Van Dijk Tandarts', status: 'Te plannen', tekst: '#8A7A4A', vlak: '#F5F2E8', nr: 'PRJ-2026-121', dagen: '11d', bedrag: '€ 1.240' },
    { naam: 'Lichtbak entree', klant: 'Hotel De Wadden', status: 'In review', tekst: '#3A5A9A', vlak: '#E8EEF9', nr: 'PRJ-2026-124', dagen: '2d', bedrag: '€ 7.350' },
    { naam: 'Spandoeken toernooi', klant: 'Sportclub Enkhuizen', status: 'Te factureren', tekst: '#3A7D52', vlak: '#E8F2EC', nr: 'PRJ-2026-109', dagen: '38d', bedrag: '€ 980' },
  ]
  return (
    <>
      <div className="flex-shrink-0 bg-white" style={{ padding: `${u(8)} ${u(18)} ${u(12)}` }}>
        <p
          className="font-heading font-bold text-[#1A4A52]"
          style={{ fontSize: u(21), letterSpacing: '-0.03em' }}
        >
          Projecten<span className="text-flame">.</span>
        </p>
      </div>
      <div className="flex-1 overflow-hidden" style={{ padding: u(14) }}>
        <div className="flex flex-col" style={{ gap: u(7) }}>
          {projecten.map((p) => (
            <div
              key={p.nr}
              className="bg-white"
              style={{ borderRadius: u(12), padding: u(11), boxShadow: `inset ${u(3)} 0 0 0 ${p.tekst}` }}
            >
              <div className="flex items-start justify-between" style={{ gap: u(8), marginBottom: u(6) }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[#1A4A52]" style={{ fontSize: u(12.5) }}>
                    {p.naam}
                  </span>
                  <span className="block truncate text-muted" style={{ fontSize: u(10.5), marginTop: u(1) }}>
                    {p.klant}
                  </span>
                </span>
                <span
                  className="flex-shrink-0 font-semibold"
                  style={{ color: p.tekst, background: p.vlak, borderRadius: u(20), padding: `${u(2)} ${u(7)}`, fontSize: u(9.5) }}
                >
                  {p.status}
                  <span className="text-flame">.</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-muted" style={{ fontSize: u(9.5) }}>
                <span className="font-mono">{p.nr}</span>
                <span className="flex items-center" style={{ gap: u(8) }}>
                  <span className="font-mono font-medium" style={{ color: '#9B9B95' }}>
                    {p.dagen}
                  </span>
                  <span className="font-mono font-medium text-ink/80">{p.bedrag}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Daan() {
  /* Zoals ForgieChatPage: sparkles-tegel in de kop, jouw vraag rechts in een
     lichte tint (geen petrol-vlak), Daan links in een kaart met rand en een
     eigen sparkles-rondje, en onderin het invoerveld met de echte
     placeholder. */
  const Sparkle = ({ maat }: { maat: number }) => (
    <svg viewBox="0 0 24 24" style={{ width: u(maat), height: u(maat) }} fill="none" stroke="#1A535C" strokeWidth={1.8} aria-hidden>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" strokeLinejoin="round" />
    </svg>
  )
  return (
    <>
      <div className="flex flex-shrink-0 items-center bg-white" style={{ gap: u(9), padding: `${u(10)} ${u(16)} ${u(12)}` }}>
        <span
          className="flex items-center justify-center"
          style={{ width: u(30), height: u(30), borderRadius: u(8), background: 'rgba(42,111,122,0.16)' }}
        >
          <Sparkle maat={16} />
        </span>
        <span>
          <span className="block font-bold text-ink" style={{ fontSize: u(15) }}>
            Daan
          </span>
          <span className="block text-muted" style={{ fontSize: u(10.5) }}>
            Je bedrijfsgeheugen
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden" style={{ padding: u(14), gap: u(10) }}>
        <span
          className="self-end"
          style={{
            maxWidth: '85%',
            background: 'rgba(58,107,140,0.10)',
            padding: `${u(9)} ${u(11)}`,
            borderRadius: u(14),
            fontSize: u(11.5),
            lineHeight: 1.5,
          }}
        >
          Wat staat er nog open bij Bakker Bouw?
        </span>

        <span className="flex self-start" style={{ gap: u(7), maxWidth: '92%' }}>
          <span
            className="flex flex-shrink-0 items-center justify-center bg-white"
            style={{ width: u(22), height: u(22), borderRadius: u(11) }}
          >
            <Sparkle maat={12} />
          </span>
          <span
            className="border border-petrol/12 bg-white"
            style={{ padding: `${u(9)} ${u(11)}`, borderRadius: u(14), fontSize: u(11.5), lineHeight: 1.5 }}
          >
            Offerte OFF-2026-388 van <span className="font-mono font-semibold">€ 1.960,00</span> staat
            sinds dinsdag open. De montage is gepland op 14 oktober en de drukproef wacht nog op akkoord.
          </span>
        </span>

        <span className="mt-auto flex items-center" style={{ gap: u(7) }}>
          <span
            className="flex flex-1 items-center border border-petrol/15 bg-white text-muted"
            style={{ height: u(34), padding: `0 ${u(12)}`, borderRadius: u(10), fontSize: u(11) }}
          >
            Vraag het aan Daan...
          </span>
          <span
            className="flex flex-shrink-0 items-center justify-center bg-petrol"
            style={{ width: u(34), height: u(34), borderRadius: u(10) }}
          >
            <svg viewBox="0 0 24 24" style={{ width: u(15), height: u(15) }} fill="none" stroke="#fff" strokeWidth={2} aria-hidden>
              <path d="M4 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </div>
    </>
  )
}

function Meer() {
  /* Meer is in de app geen lijst maar een blad dat van onderen opkomt: greep,
     jouw naam met initialen-tegel, dan de modules als gekleurde tegels in vier
     kolommen. De kleuren komen uit lib/navigatie. */
  const modules = [
    ['Werkbonnen', '#C44830'],
    ['Planning', '#9A5A48'],
    ['Taken', '#6B6B66'],
    ['Facturen', '#2D6B48'],
    ['Klanten', '#3A6B8C'],
    ['Inkoop', '#C44830'],
    ['Studio', '#9A5A48'],
    ['Rapportages', '#3A6B8C'],
  ]
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white" style={{ borderTopLeftRadius: u(22), borderTopRightRadius: u(22) }}>
      <span className="flex flex-shrink-0 justify-center" style={{ paddingTop: u(9), paddingBottom: u(4) }}>
        <span className="bg-ink/15" style={{ height: u(4), width: u(36), borderRadius: u(2) }} />
      </span>

      <div className="flex flex-shrink-0 items-center" style={{ gap: u(10), padding: `${u(6)} ${u(18)} ${u(14)}` }}>
        <span
          className="flex flex-shrink-0 items-center justify-center bg-petrol font-bold text-white"
          style={{ width: u(38), height: u(38), borderRadius: u(11), fontSize: u(13) }}
        >
          AB
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold text-ink" style={{ fontSize: u(13) }}>
            Antony Bootsma
          </span>
          <span className="block truncate text-muted" style={{ fontSize: u(10.5), marginTop: u(1) }}>
            antony@signcompany.nl
          </span>
        </span>
      </div>

      <div className="flex-1 overflow-hidden" style={{ padding: `0 ${u(12)}` }}>
        <p
          className="font-semibold uppercase text-muted"
          style={{ fontSize: u(9), letterSpacing: '0.14em', padding: `0 ${u(4)} ${u(9)}` }}
        >
          Modules
        </p>
        <div className="grid grid-cols-4" style={{ columnGap: u(3), rowGap: u(11) }}>
          {modules.map(([naam, kleur]) => (
            <span key={naam} className="flex flex-col items-center" style={{ gap: u(5) }}>
              <span
                className="flex items-center justify-center"
                style={{ width: u(46), height: u(46), borderRadius: u(14), background: `${kleur}14` }}
              >
                <span style={{ width: u(18), height: u(18), borderRadius: u(4), background: kleur, opacity: 0.85 }} />
              </span>
              <span className="truncate text-center text-ink/75" style={{ fontSize: u(9.5), maxWidth: '100%' }}>
                {naam}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const SCHERMEN: Record<Tab, () => JSX.Element> = {
  dashboard: Dashboard,
  projecten: Projecten,
  offertes: Offertes,
  daan: Daan,
  meer: Meer,
}

// ─── Het toestel ───────────────────────────────────────────────────────────

/* Alleen de telefoon, zonder sectie eromheen. Hij hangt nu rechtsonder in
   DitZitErin; de kaarten daar vertellen wat erin zit, dit toestel laat zien
   dat het ook in je broekzak past. */
export default function TelefoonMetDoen({ className = '' }: { className?: string }) {
  const [tab, zetTab] = useState<Tab>('offertes')
  const Scherm = SCHERMEN[tab]

  return (
    <IphoneMockup className={className}>
      <div className="flex h-full w-full flex-col bg-bg font-sans text-ink">
        <Statusbalk />
        <Scherm />

        {/* De menubalk van de app. Welke vijf er staan kiest de gebruiker
            zelf, dus Offertes mag hier in beeld staan. */}
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
  )
}
