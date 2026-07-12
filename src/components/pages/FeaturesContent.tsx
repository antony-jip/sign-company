'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import CTASection from '@/components/home/CTASection'
import AppShowcase, { type View as AppView } from '@/components/home/AppShowcase'

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1]

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Pillar = {
  title: string
  description: string
  image?: string
  alt?: string
  w?: number
  h?: number
}

type ModuleDetail = {
  slug: string
  name: string
  heading: string
  sub: string
  overview: string
  pillars: Pillar[]
}

const details: ModuleDetail[] = [
  {
    slug: 'projecten',
    name: 'Projecten',
    heading: 'Eén cockpit, alles gedaan',
    sub: 'Offerte, werkbon, planning en factuur op één plek. Je monteur weet wat hij moet doen, je klant ziet wat er gebeurt.',
    overview:
      'Open een project en alles zit erin: offerte, werkbon, planning en factuur. Wat je klant goedkeurt in het portaal, zie jij direct terug in de timeline.',
    pillars: [
      {
        title: 'Eén klik, de juiste actie',
        description:
          'Offerte maken, werkbon aanmaken, montage inplannen, factuur versturen. Alles start vanuit het project, je hoeft niet te zoeken waar je gebleven was.',
        image: '/images/features/acties-overlay.webp',
        alt: 'Project acties',
        w: 1024,
        h: 572,
      },
      {
        title: 'Je klant kijkt mee',
        description:
          'Eén link, geen inlog. Je klant keurt goed, bekijkt tekeningen en stelt vragen. Geen reactie na drie dagen? doen. stuurt een herinnering.',
        image: '/images/features/portaal-overlay.webp',
        alt: 'Klantportaal',
        w: 1024,
        h: 572,
      },
      {
        title: 'De status staat er al',
        description:
          'Verstuurd, akkoord, ingepland, gefactureerd. Elke stap staat in de timeline, niemand hoeft meer te vragen hoe het ervoor staat.',
        image: '/images/features/activiteit-overlay.webp',
        alt: 'Activiteiten log',
        w: 1434,
        h: 1070,
      },
    ],
  },
  {
    slug: 'offertes',
    name: 'Offertes',
    heading: 'Offerte? Zo gedaan',
    sub: 'Eigen templates, eigen producten, eigen calculatie. Verstuur per mail of laat goedkeuren via het portaal.',
    overview:
      'Bouw één keer je producten en templates, daarna calculeer je in minuten. Inkoopprijs plus marge is verkoopprijs. Versturen als PDF of goedkeuren via het portaal.',
    pillars: [
      {
        title: 'Inkoop, marge, verkoopprijs',
        description:
          'Bouw één keer je producten en templates. Voer inkoop in, stel je marge in, doen. rekent de verkoopprijs uit. Geen Excel meer.',
        image: '/images/features/offerte-calculatie.webp',
        alt: 'Offerte calculatie',
        w: 1536,
        h: 1350,
      },
      {
        title: 'Grip op uren en marge',
        description:
          'Ook bij tien offerteregels zie je in één oogopslag wat het kost en wat het oplevert. Totalen, marge en uren per medewerker.',
        image: '/images/features/overzicht-offerte.webp',
        alt: 'Offerte overzicht',
        w: 1147,
        h: 1536,
      },
      {
        title: 'Leveranciersprijzen bij de hand',
        description:
          'Upload de PDF van je leverancier, doen. leest hem uit. Inkoopprijzen zitten direct in je marge, overtypen hoeft niet meer.',
        image: '/images/features/inkoopofferte.webp',
        alt: 'Inkoopofferte leveranciers',
        w: 960,
        h: 1200,
      },
    ],
  },
  {
    slug: 'portaal',
    name: 'Klantportaal',
    heading: 'Niet mailen, gewoon delen',
    sub: 'Je klant ziet alles via één link: tekening, offerte, factuur en foto’s. Goedkeuren en betalen zonder inlog.',
    overview:
      'Je klant krijgt één link en ziet alles: tekeningen, offertes, facturen en foto’s. Goedkeuren, reageren en betalen zonder in te loggen.',
    pillars: [
      {
        title: 'Goedkeuren in één klik',
        description:
          'Offerte akkoord, tekening goedgekeurd, opdrachtbevestiging digitaal getekend. Alles vanuit dezelfde link, jij ziet direct de status.',
        image: '/images/features/portaal-overlay.webp',
        alt: 'Klantportaal goedkeuren',
        w: 1024,
        h: 572,
      },
      {
        title: 'Alles wat je klant moet zien',
        description:
          'Tekeningen, offertes, montagefoto’s en facturen in chronologische volgorde. Reageren kan direct, niks raakt kwijt in een mailbox.',
        image: '/images/features/portaal-floating.webp',
        alt: 'Bestanden delen in het portaal',
        w: 768,
        h: 1024,
      },
      {
        title: 'doen. volgt op',
        description:
          'Geen reactie na drie dagen? Er gaat automatisch een herinnering uit met jouw tekst. Open factuur? Ook daar gaat een herinnering achteraan.',
        image: '/images/features/activiteit-overlay.webp',
        alt: 'Automatische opvolging',
        w: 1434,
        h: 1070,
      },
    ],
  },
  {
    slug: 'planning',
    name: 'Planning',
    heading: 'Slepen, droppen, gepland',
    sub: 'Sleep een project naar een dag, de werkbon zit er direct aan vast. Je monteur ziet tijd, adres en weerbericht.',
    overview:
      'Sleep een project naar een dag en het staat ingepland, per monteur of per ploeg. De werkbon hangt er direct aan, je monteur ziet alles op zijn telefoon.',
    pillars: [
      {
        title: 'Je week in één overzicht',
        description:
          'Weekweergave per monteur of per ploeg. Slepen is plannen, verplaatsen is net zo makkelijk. Geen gedeelde Google Calendar meer.',
        image: '/images/features/planning-kalender.png',
        alt: 'Planning kalender',
        w: 1536,
        h: 857,
      },
      {
        title: 'Ingepland is klaar voor de monteur',
        description:
          'Bij het inplannen wordt de werkbon aangemaakt met alle offerteregels. Je monteur opent zijn telefoon en gaat direct aan de slag.',
        image: '/images/features/planning-werkbon.png',
        alt: 'Werkbon koppeling',
        w: 1024,
        h: 572,
      },
      {
        title: 'Weer, conflicten, beschikbaarheid',
        description:
          'Buiten-montage gepland? Het weerbericht staat erbij. Monteur al bezet? doen. waarschuwt je voordat het misgaat.',
        image: '/images/features/planning-slim.png',
        alt: 'Slim plannen',
        w: 1434,
        h: 1070,
      },
    ],
  },
  {
    slug: 'werkbonnen',
    name: 'Werkbonnen',
    heading: 'Werkbon gemaakt in één klik',
    sub: 'Vanuit de offerte of de planning: één klik en de werkbon staat klaar, met alle regels erop. Niks overtypen, niks vergeten.',
    overview:
      'Een werkbon maken kost geen werk meer: één klik vanuit de offerte of de planning en hij staat klaar, met alle offerteregels erop. Je monteur vult aan met uren, foto’s en een handtekening.',
    pillars: [
      {
        title: 'Maken is één klik',
        description:
          'Plan je een montage in of keur je klant de offerte goed? De werkbon maakt zichzelf, met omschrijving, aantallen en instructiefoto’s. Geen overtypen, geen vergeten regels.',
        image: '/images/features/werkbon-links.png',
        alt: 'Werkbon regels',
        w: 1024,
        h: 572,
      },
      {
        title: 'Uren en foto’s op locatie',
        description:
          'Uren tikken, foto’s van het resultaat, opmerkingen per regel. Alles komt direct terug in het project, zonder dat jij hoeft te bellen.',
        image: '/images/features/werkbon-midden.png',
        alt: 'Uren en foto’s registreren',
        w: 1024,
        h: 572,
      },
      {
        title: 'Klant tekent, jij factureert',
        description:
          'De klant tekent digitaal op de telefoon van je monteur. Werkbon afgerond, jij ziet het direct en de factuur staat klaar.',
        image: '/images/features/werkbon-rechts.png',
        alt: 'Digitale handtekening',
        w: 1024,
        h: 572,
      },
    ],
  },
  {
    slug: 'facturen',
    name: 'Facturen',
    heading: 'Verzonden én ontvangen',
    sub: 'Verkoopfactuur in één klik met Mollie-betaallink. Inkoopfacturen leest Daan uit, daarna door naar Exact Online.',
    overview:
      'Verkoopfactuur in één klik vanuit de offerte, met betaallink en automatische herinneringen. Inkoopfacturen leest Daan uit. Goedgekeurd? Door naar Exact Online.',
    pillars: [
      {
        title: 'Van offerte naar factuur in één klik',
        description:
          'Factuur direct uit de offerte, Mollie-betaallink erbij (iDEAL of creditcard). Niet betaald? doen. stuurt zelf de herinnering.',
      },
      {
        title: 'Daan leest je inkoopfacturen uit',
        description:
          'Je leverancier mailt zijn PDF naar de inkoop-inbox. Daan haalt leverancier, factuurnummer, datum en regels eruit. Jij controleert en keurt goed.',
      },
      {
        title: 'Door naar Exact Online',
        description:
          'Goedgekeurde facturen gaan automatisch door naar Exact voor je boekhouding. Geen dubbel invoerwerk, geen losse exports.',
      },
    ],
  },
  {
    slug: 'visualizer',
    name: 'Studio',
    heading: 'Laat zien, niet vertellen',
    sub: 'Upload een foto van een bus, gevel of pand en beschrijf wat je wilt. AI maakt er een realistische visualisatie van. Werkt met credits: 10 inbegrepen, bijkopen wanneer je wilt.',
    overview:
      'Upload een foto, beschrijf wat je wilt en AI toont het eindresultaat voordat je produceert. Delen via het portaal, het beeld doet het verkoopwerk.',
    pillars: [
      {
        title: 'Daan verbetert je input',
        description:
          'Je typt in gewone taal wat je wilt zien. Daan maakt er de juiste opdracht van en kiest de stijl die bij het werk past.',
      },
      {
        title: 'Gekoppeld aan je project',
        description:
          'Elke visualisatie hangt aan een project of offerte. Deel hem via het portaal en laat het beeld het verkoopwerk doen.',
      },
      {
        title: 'Betalen per beeld',
        description:
          '10 credits inbegrepen, bijkopen wanneer je wilt. Je betaalt alleen voor wat je genereert, geen extra abonnement.',
      },
    ],
  },
  {
    slug: 'ai',
    name: 'AI-assistent',
    heading: 'Daan doet het denkwerk',
    sub: 'Daan kent je bedrijf. Cijfers, teksten, calculaties: vraag het en Daan doet het.',
    overview:
      'Daan kent je bedrijfsdata: open posten, grootste klanten, marges. Hij vat mails samen, verbetert je teksten en rekent calculaties uit.',
    pillars: [
      {
        title: 'Kent je cijfers',
        description:
          'Hoeveel staat er open? Wie is je grootste klant? Daan haalt het antwoord direct uit je eigen data, zonder rapporten te bouwen.',
      },
      {
        title: 'Schrijft en verbetert',
        description:
          'Selecteer een tekst en Daan herschrijft hem in jouw toon. Offerteteksten, mails, productomschrijvingen.',
      },
      {
        title: 'Rekent voor je',
        description:
          'Vierkante meters, marges, nacalculatie. Vraag het en Daan rekent het uit, met je projectdata erbij.',
      },
    ],
  },
  {
    slug: 'email',
    name: 'Email',
    heading: 'Jouw mailbox, slim gekoppeld',
    sub: 'Je eigen zakelijke mailbox, gekoppeld via IMAP/SMTP. Mails hangen automatisch aan de juiste klant en het juiste project.',
    overview:
      'Koppel je eigen mailbox via IMAP/SMTP. Mails hangen automatisch aan de juiste klant en het juiste project, en Daan vat lange mails samen.',
    pillars: [
      {
        title: 'Je eigen mailbox',
        description:
          'Koppel je zakelijke adres via IMAP/SMTP. Je inbox blijft van jou, alleen mail die bij een klant of project hoort is zichtbaar voor het team.',
      },
      {
        title: 'Automatisch gekoppeld',
        description:
          'Inkomende en verzonden mails hangen vanzelf aan de juiste klant en het juiste project. Het hele dossier op één plek.',
      },
      {
        title: 'Daan leest mee',
        description:
          'Lange mail binnen? Daan vat hem samen en zet een antwoord klaar in jouw toon. Jij hoeft alleen te versturen.',
      },
    ],
  },
  {
    slug: 'taken',
    name: 'Taken',
    heading: 'Alles naast de montage',
    sub: 'Montage plan je in de planning. Taken zijn er voor de rest: opvolgen, inkoop, drukproeven, bestanden opvragen.',
    overview:
      'Voor al het werk naast de montage: offertes opvolgen, inkoop regelen, bestanden opvragen. Per project of klant, met eigenaar en deadline.',
    pillars: [
      {
        title: 'Gekoppeld aan je werk',
        description:
          'Elke taak hangt aan een project of klant. Je ziet meteen waar hij bij hoort en wat er speelt.',
      },
      {
        title: 'Toegewezen met deadline',
        description:
          'Wijs een taak toe aan een collega en zet er een datum op. Iedereen weet wat van hem is en wanneer het klaar moet zijn.',
      },
      {
        title: 'Niks valt tussen wal en schip',
        description:
          'Notificaties bij wijzigingen en vervaldatums. Opvolgen gebeurt, ook als de werkplaats vol staat.',
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Kleine bouwstenen                                                   */
/* ------------------------------------------------------------------ */

function FlameDot() {
  return <span className="text-flame">.</span>
}

/* Studio is live; extern tonen we alleen het Beta-label. */
function StudioBadges() {
  return (
    <span className="inline-flex items-center shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] border border-flame text-flame">
        Beta
      </span>
    </span>
  )
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion() ?? false
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: reduce ? 0 : delay, ease: easing }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Module-specifieke demo's                                            */
/* ------------------------------------------------------------------ */

/* Portaal: nagebouwde klant-view. font-mono alleen voor data in de mockup. */
function PortaalDemo() {
  return (
    <div className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
          <Reveal>
            <h2
              className="font-heading font-bold text-petrol leading-[1.05]"
              style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', letterSpacing: '-0.03em' }}
            >
              Zo ziet je klant het<FlameDot />
            </h2>
            <p className="mt-5 text-[15px] md:text-[16px] text-muted leading-[1.6] max-w-md">
              Je klant opent de link en ziet alles in chronologische volgorde: tekeningen,
              offertes, opdrachtbevestigingen, facturen en foto&apos;s. Reageren kan direct.
              Geen inlog, geen app, geen gedoe.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white rounded-xl border border-petrol/10 shadow-[0_24px_56px_-30px_rgba(19,62,69,0.35)] overflow-hidden max-w-[420px] mx-auto">
              <div className="px-5 py-3 flex items-center justify-between bg-petrol-deep">
                <span className="text-white text-[13px] font-bold tracking-tight">De Vries Reclame</span>
                <span className="font-mono text-[9px] text-white/50">Geldig tot 15 mei 2026</span>
              </div>

              <div className="px-5 py-2.5 text-[12px] border-b border-petrol/10 bg-bg text-muted">
                Bekijk de items hieronder en geef uw reactie.
              </div>

              <div className="divide-y divide-petrol/10">
                {/* Tekening */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[13px] font-semibold text-ink">De Vries Reclame</span>
                    <span className="font-mono text-[10px] text-muted/70">1 apr, 09:15</span>
                  </div>
                  <div className="bg-bg rounded-lg p-3 mb-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#EEE8F5]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A5A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#6A5A8A]">Tekening</p>
                      <p className="text-[12px] text-ink">Ontwerp-gevelreclame-v2.pdf</p>
                      <p className="text-[10px] text-muted/70">245 KB · PDF</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted">
                    Hierbij de tekening voor jullie gevelreclame. Graag je akkoord zodat we kunnen bestellen.
                  </p>
                </div>

                {/* Offerte */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3 bg-flame" />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-ink">Offerte</p>
                      <p className="text-[11px] text-muted">Gevelreclame LED</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#E2F0F0] text-petrol">Goedgekeurd</span>
                  </div>
                  <p className="font-mono text-[15px] font-bold text-ink mt-1">&euro; 3.850,00</p>
                  <div className="flex items-center gap-2 mt-2 pl-3 border-l-2 border-flame">
                    <span className="text-[11px] font-semibold text-petrol">Goedgekeurd</span>
                    <span className="text-[11px] text-muted/70">Jan de Vries · 2 apr, 14:32</span>
                  </div>
                </div>

                {/* Opdrachtbevestiging */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3 bg-petrol" />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-ink">Opdrachtbevestiging</p>
                      <p className="text-[11px] text-muted">OB-2026-0089</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#E2F0F0] text-petrol">Getekend</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-3 border-l-2 border-petrol">
                    <span className="text-[11px] font-semibold text-petrol">Digitaal getekend</span>
                    <span className="text-[11px] text-muted/70">Jan de Vries · 2 apr, 15:10</span>
                  </div>
                </div>

                {/* Factuur */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3 bg-[#2D6B48]" />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-ink">Factuur</p>
                      <p className="font-mono text-[11px] text-muted">FAC-2026-0089</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#E4F0EA] text-[#2D6B48]">Betaald</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="font-mono text-[15px] font-bold text-ink">&euro; 3.850,00</p>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#E4F0EA] text-[#2D6B48]">✓ Betaald via iDEAL</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-petrol/10 text-center">
                <span className="text-[10px] text-muted/70">
                  Aangedreven door <span className="font-semibold text-petrol">doen.</span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

/* Offertes: werktekening-upload met resultaat-toggle. */
function WerktekeningDemo() {
  const [showResult, setShowResult] = useState(false)

  return (
    <div className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
          <Reveal>
            <h2
              className="font-heading font-bold text-petrol leading-[1.05]"
              style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', letterSpacing: '-0.03em' }}
            >
              Upload je tekening<FlameDot /> doen<FlameDot /> doet de rest<FlameDot />
            </h2>
            <p className="mt-5 text-[15px] md:text-[16px] text-muted leading-[1.6] max-w-md">
              Sleep je werktekening in de offerte. De omschrijving van de offerteregel wordt
              automatisch overgenomen als titel. Je klant ziet een professionele tekening met
              uitleg, zonder dat jij Illustrator opent.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex items-center gap-2 mb-4" role="tablist" aria-label="Werktekening voorbeeld">
              <button
                onClick={() => setShowResult(false)}
                role="tab"
                aria-selected={!showResult}
                className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors duration-300 ${
                  !showResult ? 'bg-flame text-white' : 'bg-petrol/5 text-muted hover:text-ink'
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setShowResult(true)}
                role="tab"
                aria-selected={showResult}
                className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors duration-300 ${
                  showResult ? 'bg-flame text-white' : 'bg-petrol/5 text-muted hover:text-ink'
                }`}
              >
                Resultaat
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!showResult ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: easing }}
                >
                  <div className="bg-white rounded-xl p-5 md:p-6 border border-petrol/10 shadow-[0_24px_56px_-30px_rgba(19,62,69,0.35)]">
                    <div className="flex items-center justify-between pb-4 border-b border-petrol/10">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-flame text-white text-[11px] font-bold flex items-center justify-center">1</span>
                        <span className="text-[14px] font-semibold text-ink">Autobelettering bedrijfsbus</span>
                      </div>
                      <span className="font-mono text-[14px] font-semibold text-ink">&euro; 1.850,00</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A5A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#6A5A8A]">Tekening / bijlage</span>
                    </div>
                    <div className="border-2 border-dashed border-[#6A5A8A]/30 rounded-lg py-8 md:py-10 flex flex-col items-center justify-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#54666A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-[13px] text-muted">Sleep, plak of klik om te uploaden</p>
                      <p className="text-[11px] text-muted/70">JPG, PNG of PDF · max 10MB</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: easing }}
                >
                  <div className="bg-white rounded-xl border border-petrol/10 shadow-[0_24px_56px_-30px_rgba(19,62,69,0.35)] overflow-hidden">
                    <div className="px-5 md:px-6 pt-5 pb-4 border-b border-petrol/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-ink tracking-tight">sign company</span>
                        <div className="flex items-center gap-6 text-[11px] text-muted/70">
                          <span>Omschrijving <span className="text-ink font-medium ml-2">Autobelettering bedrijfsbus</span></span>
                          <span>Aantal <span className="text-ink font-medium ml-2">1 stuk</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 md:p-6 bg-bg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 flex items-end justify-center h-[140px] col-span-2">
                          <svg viewBox="0 0 440 120" className="w-full h-auto" aria-label="Werktekening bedrijfsbus">
                            <rect x="30" y="20" width="340" height="70" rx="6" fill="#E8E6E2" />
                            <path d="M320 20 L370 20 Q390 20 390 40 L390 90 L320 90 Z" fill="#D4D2CE" />
                            <path d="M330 28 L365 28 Q380 28 380 40 L380 55 L330 55 Z" fill="#C4C2BE" />
                            <text x="100" y="62" fontFamily="var(--font-heading, system-ui)" fontWeight="800" fontSize="28" fill="#1A535C" letterSpacing="-1">doen</text>
                            <text x="186" y="62" fontFamily="var(--font-heading, system-ui)" fontWeight="800" fontSize="28" fill="#F15025">.</text>
                            <text x="100" y="78" fontWeight="400" fontSize="9" fill="#8A8A85">doen.team</text>
                            <circle cx="100" cy="90" r="16" fill="#B0AEA8" />
                            <circle cx="100" cy="90" r="8" fill="#D4D2CE" />
                            <circle cx="340" cy="90" r="16" fill="#B0AEA8" />
                            <circle cx="340" cy="90" r="8" fill="#D4D2CE" />
                            <rect x="390" y="70" width="12" height="20" rx="3" fill="#D4D2CE" />
                            <rect x="392" y="35" width="8" height="12" rx="2" fill="#C4C2BE" />
                          </svg>
                        </div>
                        <div className="bg-white rounded-lg p-4 h-[120px] flex flex-col justify-center">
                          <span className="font-heading text-[14px] font-extrabold leading-tight text-petrol">
                            doen<FlameDot /> gedaan<FlameDot />
                          </span>
                          <span className="text-[9px] text-muted/70 mt-1">doen.team</span>
                        </div>
                        <div className="bg-ink rounded-lg p-4 h-[120px] flex items-center justify-center gap-2">
                          <span className="font-heading text-[16px] font-extrabold text-white">d<FlameDot /></span>
                          <span className="font-heading text-[16px] font-extrabold text-white">doen<FlameDot /></span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 md:px-6 py-3 border-t border-petrol/10 flex items-center justify-between">
                      <span className="text-[10px] text-muted/70">Pagina 2 van 2</span>
                      <span className="text-[10px] text-muted/70">Automatisch gegenereerd door doen.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

/* Studio: de flow in drie stappen. */
function VisualizerFlow() {
  const steps = [
    { n: '1', title: 'Upload je foto', text: 'Bus, gevel, pand of schets. Beschrijf erbij wat je wilt zien en kies ratio en resolutie.' },
    { n: '2', title: 'Daan gaat aan de slag', text: 'Daan scherpt je beschrijving aan en genereert binnen seconden een realistische visualisatie.' },
    { n: '3', title: 'Klaar om te delen', text: 'Download het beeld, koppel het aan je project en deel het via het klantportaal.' },
  ]
  return (
    <div className="bg-bg">
      <div className="container-site py-16 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8 md:mb-12">
          <h2
            className="font-heading font-bold text-petrol leading-[1.05]"
            style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', letterSpacing: '-0.03em' }}
          >
            Foto erin<FlameDot /> Visualisatie eruit<FlameDot />
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-sm leading-[1.55]">
            Geen prompt-kennis nodig. Drie stappen en je klant ziet het eindresultaat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="bg-white rounded-[10px] border border-petrol/10 p-7 h-full">
                <span className="font-heading text-[15px] font-bold text-flame">{s.n}</span>
                <h3 className="font-heading text-[19px] font-bold text-petrol mt-2 leading-tight">
                  {s.title}
                  <FlameDot />
                </h3>
                <p className="text-[15px] text-muted mt-2.5 leading-[1.6]">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overzichtspagina (/features)                                        */
/* ------------------------------------------------------------------ */

function FeaturesOverview() {
  const reduce = useReducedMotion() ?? false

  return (
    <>
      {/* Hero: entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) */}
      <section className="bg-bg">
        <div className="container-site pt-28 md:pt-44 pb-10 md:pb-20">
          <h1
            className="font-heading font-bold text-petrol leading-[1.0] max-w-3xl"
            style={{ fontSize: 'clamp(34px, 5.5vw, 72px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                Tien modules, één systeem<FlameDot />
              </span>
            </span>
          </h1>
          <p
            className="hero-fade mt-4 md:mt-6 text-[16px] md:text-[18px] text-muted leading-[1.6] max-w-xl"
            style={{ animationDelay: '0.3s' }}
          >
            Alles van eerste klantvraag tot betaalde factuur zit erin, en alles werkt samen.
            Dit is wat elke module voor je doet.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-site py-14 md:py-28">
          <ul className="border-t border-petrol/10">
            {details.map((d, i) => (
              <motion.li
                key={d.slug}
                className="border-b border-petrol/10"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.03 * i, ease: easing }}
              >
                <Link
                  href={`/features/${d.slug}`}
                  className="group grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-x-10 gap-y-2 items-baseline py-5 md:py-8"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-heading text-[21px] md:text-[23px] font-bold text-ink leading-none transition-colors duration-200 group-hover:text-petrol">
                      {d.name}
                      <FlameDot />
                    </span>
                    {d.slug === 'visualizer' && <StudioBadges />}
                  </span>
                  <p className="text-[15px] text-muted leading-[1.6] max-w-2xl transition-colors duration-200 group-hover:text-ink">
                    {d.overview}
                  </p>
                  <span className="text-[14px] font-semibold text-petrol whitespace-nowrap transition-colors duration-200 group-hover:text-flame">
                    Bekijk module <span aria-hidden className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      <CTASection />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Detailpagina (/features/[module])                                   */
/* ------------------------------------------------------------------ */

/* Korte UX-loops, gerenderd uit het doen-video Remotion-project (echte app-flows). */
const moduleVideos: Record<string, { src: string; poster: string; caption: string }> = {
  projecten: {
    src: '/videos/module-projecten.mp4',
    poster: '/videos/module-projecten.jpg',
    caption: 'De project-cockpit: acties, verstuur en portaal-goedkeuring in één flow.',
  },
  werkbonnen: {
    src: '/videos/module-werkbonnen.mp4',
    poster: '/videos/module-werkbonnen.jpg',
    caption: 'De werkbon stond al klaar vanuit de offerte; je monteur vult aan en de klant tekent op het scherm.',
  },
  facturen: {
    src: '/videos/module-facturen.mp4',
    poster: '/videos/module-facturen.jpg',
    caption: 'Van werkbon naar factuur, met betaallink en boeking in Exact Online.',
  },
  offertes: {
    src: '/videos/module-offertes.mp4',
    poster: '/videos/module-offertes.jpg',
    caption: 'Calculeren, versturen en laten goedkeuren, alles vanuit één editor.',
  },
  portaal: {
    src: '/videos/module-portaal.mp4',
    poster: '/videos/module-portaal.jpg',
    caption: 'Je klant bekijkt de offerte via één link en keurt online goed.',
  },
  planning: {
    src: '/videos/module-planning.mp4',
    poster: '/videos/module-planning.jpg',
    caption: 'Sleep een project naar een dag en de werkbon hangt er direct aan.',
  },
  email: {
    src: '/videos/module-email.mp4',
    poster: '/videos/module-email.jpg',
    caption: 'Je eigen mailbox, gekoppeld aan projecten. Daan stelt een antwoord voor.',
  },
  taken: {
    src: '/videos/module-taken.mp4',
    poster: '/videos/module-taken.jpg',
    caption: 'Alles naast de montage: taken per collega, met deadlines.',
  },
  visualizer: {
    src: '/videos/module-visualizer.mp4',
    poster: '/videos/module-visualizer.jpg',
    caption: 'Upload een foto en Studio toont het eindresultaat vóór je produceert.',
  },
  ai: {
    src: '/videos/module-ai.mp4',
    poster: '/videos/module-ai.jpg',
    caption: 'Vraag het aan Daan: hij maakt het project aan en jij gaat verder.',
  },
}

/* Welke AppShowcase-view hoort bij welke module (voor "Zelf klikken"). */
const moduleViews: Record<string, AppView> = {
  projecten: 'projecten',
  offertes: 'offerte',
  planning: 'planning',
  facturen: 'factuur',
  email: 'email',
  taken: 'taken',
}

function ModuleVideo({ slug }: { slug: string }) {
  const video = moduleVideos[slug]
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.removeAttribute('autoplay')
      el.pause()
      el.controls = true
    }
  }, [])

  if (!video) return null
  return (
    <>
      <div className="rounded-[12px] overflow-hidden border border-petrol/10 shadow-[0_1px_2px_rgba(20,40,40,0.04),0_24px_60px_-32px_rgba(13,52,60,0.35)]">
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-auto block"
          aria-label={video.caption}
        />
      </div>
      <p className="mt-4 text-[14px] text-muted">{video.caption}</p>
    </>
  )
}

/* Video kijken of zelf door de app klikken; toggle als beide bestaan. */
function ModuleDemo({ slug }: { slug: string }) {
  const video = moduleVideos[slug]
  const view = moduleViews[slug]
  const [mode, setMode] = useState<'video' | 'zelf'>(video ? 'video' : 'zelf')

  if (!video && !view) return null

  return (
    <section className="bg-bg">
      {/* Mobiel: altijd de video; de geschaalde desktop-app klikt niet prettig op een telefoon */}
      {video && (
        <div className="md:hidden container-site pb-14">
          <ModuleVideo slug={slug} />
        </div>
      )}

      <div className="hidden md:block container-site pb-4 md:pb-6">
        {video && view && (
          <div
            className="inline-flex p-1 rounded-full bg-white border border-petrol/10 mb-6"
            role="tablist"
            aria-label="Demo-weergave"
          >
            {([
              { id: 'video', label: 'Bekijk de flow' },
              { id: 'zelf', label: 'Klik zelf door' },
            ] as const).map((t) => {
              const active = mode === t.id
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(t.id)}
                  className={`px-5 h-10 inline-flex items-center text-[14px] font-semibold rounded-full transition-colors ${
                    active ? 'bg-petrol text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                  <span className={active ? 'text-flame' : 'text-transparent'}>.</span>
                </button>
              )
            })}
          </div>
        )}

        {mode === 'video' && video ? (
          <div className="pb-16 md:pb-24">
            <ModuleVideo slug={slug} />
          </div>
        ) : null}
      </div>
      {mode === 'zelf' && view ? (
        <div className="hidden md:block">
          <AppShowcase initialView={view} key={view} />
        </div>
      ) : null}
    </section>
  )
}

function ModuleDetailPage({ detail }: { detail: ModuleDetail }) {
  const index = details.findIndex((d) => d.slug === detail.slug)
  const prev = details[(index - 1 + details.length) % details.length]
  const next = details[(index + 1) % details.length]

  return (
    <>
      {/* Hero: kop + subregel, verder niks.
          Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */}
      <section className="bg-bg">
        <div className="container-site pt-28 md:pt-44 pb-10 md:pb-20">
          {detail.slug === 'visualizer' && (
            <div className="hero-fade mb-5" style={{ animationDelay: '0.05s' }}>
              <StudioBadges />
            </div>
          )}
          <h1
            className="font-heading font-bold text-petrol leading-[1.0] max-w-3xl"
            style={{ fontSize: 'clamp(36px, 5.5vw, 68px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span className="hero-line" style={{ animationDelay: '0.1s' }}>
                {detail.heading}
                <FlameDot />
              </span>
            </span>
          </h1>
          <p
            className="hero-fade mt-4 md:mt-6 text-[16px] md:text-[18px] text-muted leading-[1.6] max-w-xl"
            style={{ animationDelay: '0.3s' }}
          >
            {detail.sub}
          </p>
        </div>
      </section>

      {/* Echte UX uit de app: video kijken of zelf klikken */}
      <ModuleDemo slug={detail.slug} />

      {/* Drie pijlers */}
      <section className="bg-white">
        <div className="container-site py-14 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10 md:gap-y-12">
            {detail.pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                {p.image ? (
                  <div className="rounded-[10px] border border-petrol/10 bg-bg p-6 mb-6 h-[240px] flex items-center justify-center overflow-hidden">
                    <Image
                      src={p.image}
                      alt={p.alt ?? p.title}
                      width={p.w ?? 1024}
                      height={p.h ?? 572}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="border-t border-petrol/10 pt-6 mb-0" />
                )}
                <h2 className="font-heading text-[19px] md:text-[21px] font-bold text-petrol leading-tight">
                  {p.title}
                  <FlameDot />
                </h2>
                <p className="mt-3 text-[15px] text-muted leading-[1.6]">{p.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Module-specifieke demo */}
      {detail.slug === 'offertes' && <WerktekeningDemo />}
      {detail.slug === 'portaal' && <PortaalDemo />}
      {detail.slug === 'visualizer' && <VisualizerFlow />}

      {/* Vorige / volgende module */}
      <nav aria-label="Module navigatie" className="bg-white border-t border-petrol/10">
        <div className="container-site py-8 md:py-10 flex items-center justify-between gap-6">
          <Link href={`/features/${prev.slug}`} className="group">
            <span className="block text-[13px] text-muted mb-1">Vorige</span>
            <span className="font-heading text-[16px] md:text-[18px] font-bold text-petrol transition-colors duration-200 group-hover:text-flame">
              <span aria-hidden className="inline-block mr-1.5 transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
              {prev.name}
            </span>
          </Link>
          <Link href="/features" className="hidden sm:block text-[14px] font-semibold text-muted hover:text-petrol transition-colors duration-200">
            Alle modules
          </Link>
          <Link href={`/features/${next.slug}`} className="group text-right">
            <span className="block text-[13px] text-muted mb-1">Volgende</span>
            <span className="font-heading text-[16px] md:text-[18px] font-bold text-petrol transition-colors duration-200 group-hover:text-flame">
              {next.name}
              <span aria-hidden className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        </div>
      </nav>

      <CTASection />
    </>
  )
}

/* ------------------------------------------------------------------ */

export default function FeaturesContent({ moduleSlug }: { moduleSlug?: string }) {
  const detail = moduleSlug ? details.find((d) => d.slug === moduleSlug) : undefined
  if (detail) return <ModuleDetailPage detail={detail} />
  return <FeaturesOverview />
}
