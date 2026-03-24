'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'
import {
  PlanningMockup,
  WerkbonnenMockup,
  KlantportaalMockup,
  OffertesMockup,
  FacturenMockup,
  DaanAIMockup,
} from '../mockups/ModuleMockups'
import { ReactNode } from 'react'

const modules: {
  id: string
  name: string
  color: string
  lightBg: string
  headline: string
  status: string
  description: string
  highlights: string[]
  mockup: ReactNode
}[] = [
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    lightBg: '#F2E8E5',
    headline: 'Wie doet wat, wanneer, waar.',
    status: 'gepland.',
    description: 'Een visueel planbord met dag-, week- en maandweergave. Montage planning met locatie, team en tijdslots. Verlof, Nederlandse feestdagen en bedrijfssluitingsdagen worden automatisch verwerkt. Je klant kan zelfs online een afspraak inplannen via een publieke boekingspagina.',
    highlights: [
      'Week-, maand- en dagweergave',
      'Drag-and-drop montage planning',
      'Taken met prioriteit (kritiek/hoog/medium/laag)',
      'Verlof- en sluitingsdagen beheer',
      'Nederlandse feestdagen automatisch',
      'Publieke boekingspagina voor klanten',
      'Koppeling met projecten en werkbonnen',
      'Team beschikbaarheid in een oogopslag',
    ],
    mockup: <PlanningMockup />,
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#C44830',
    lightBg: '#FAE5E0',
    headline: 'Digitaal. Op locatie. Getekend.',
    status: 'getekend.',
    description: 'Je monteur opent de app op zijn telefoon, ziet de instructie-items met exacte specificaties (breedte en hoogte in mm), maakt foto\'s op locatie en laat de klant digitaal tekenen. Alles gekoppeld aan het project en de offerte. Eén klik en het wordt een factuur.',
    highlights: [
      'Digitale werkbonnen op je telefoon',
      'Instructie-items met specificaties in mm',
      'Foto\'s uploaden direct op locatie',
      'Digitale handtekening van de klant',
      'Gekoppeld aan project en offerte',
      'Direct factureerbaar met een klik',
      'PDF export (landscape A4)',
      'Uren en materiaal registreren',
    ],
    mockup: <WerkbonnenMockup />,
  },
  {
    id: 'klantportaal',
    name: 'Klantportaal',
    color: '#3A6B8C',
    lightBg: '#E5ECF6',
    headline: 'Je klant ziet wat hij moet zien.',
    status: 'goedgekeurd.',
    description: 'Elke klant krijgt een unieke link (30 dagen geldig, verlengbaar). Daarin ziet hij een chat-achtige tijdlijn met berichten, offertes, tekeningen en facturen. Tekeningen goedkeuren, drukproeven bekijken, facturen online betalen via Mollie. Reageert je klant niet binnen 3 dagen? Automatische herinnering.',
    highlights: [
      'Unieke link per klant (30 dagen geldig)',
      'Chat-achtige tijdlijn',
      'Tekening goedkeuring en revisie aanvragen',
      'Drukproeven bekijken en goedkeuren',
      'Facturen inzien en direct online betalen (Mollie)',
      'Bestanden uploaden (foto\'s, PDF\'s)',
      'Automatische herinneringen na 3 dagen',
      'Professionele uitstraling met je eigen branding',
    ],
    mockup: <KlantportaalMockup />,
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    lightBg: '#FDE8E2',
    headline: 'Professionele offertes in minuten.',
    status: 'verstuurd.',
    description: 'Kanban pipeline van concept tot gefactureerd. Sjablonen, productbibliotheek en smart calculator met kostprijsberekening. Probo-koppeling voor live printprijzen. Je klant bekijkt de offerte online en jij ziet precies wanneer hij kijkt. Digitaal akkoord met handtekening, en het project wordt automatisch aangemaakt.',
    highlights: [
      'Kanban pipeline (concept, verstuurd, bekeken, akkoord)',
      'Sjablonen en herbruikbare productbibliotheek',
      'Smart calculator met kostprijsberekening',
      'Probo-koppeling voor live printprijzen',
      'Versiegeschiedenis (elke wijziging bewaard)',
      'Publieke link met view tracking',
      'Digitale handtekening en akkoordknop',
      'Automatisch project aanmaken bij akkoord',
      'Inkoopoffertes (leverancierszijde)',
      'PDF export met eigen briefpapier',
    ],
    mockup: <OffertesMockup />,
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    lightBg: '#E4F0EA',
    headline: 'Verstuurd. Herinnerd. Betaald.',
    status: 'betaald.',
    description: 'Eén klik factuur vanuit je offerte of werkbon. Mollie betaallinks zodat je klant direct online betaalt via iDEAL of creditcard. Automatische herinneringen met configureerbare templates. Creditnota\'s en voorschotfacturen. En alles synchroniseert automatisch met Exact Online voor je boekhouding.',
    highlights: [
      'Eén klik factuur vanuit offerte of werkbon',
      'Mollie betaallinks (iDEAL, creditcard)',
      'Automatische betalingsherinneringen',
      'Exact Online koppeling (boekhouding sync)',
      'Creditnota\'s en voorschotfacturen',
      'Betaalstatus realtime bijgehouden',
      'Aging indicator (dagen open, kleurcode)',
      'Voldoet aan Nederlandse factuureisen',
      'PDF met eigen briefpapier',
      'Bulk acties en filters',
    ],
    mockup: <FacturenMockup />,
  },
  {
    id: 'daan-ai',
    name: 'Daan AI',
    color: '#6A5A8A',
    lightBg: '#EEE8F5',
    headline: 'Je slimste collega werkt 24/7.',
    status: 'slim.',
    description: 'Een AI chatbot die je bedrijfsdata kent. Schrijft offerteteksten, vat projecten samen, beantwoordt vragen als "hoeveel offertes staan open?" of "wie is mijn grootste klant?". 10 herschrijfacties (korter, langer, professioneler), email schrijfassistent, en importeer je eigen data voor meer context.',
    highlights: [
      'AI chatbot die je bedrijfsdata kent',
      'Offerteteksten genereren en verbeteren',
      'Projectsamenvattingen',
      '10 herschrijfacties (korter, langer, professioneler)',
      'Email schrijfassistent',
      'Business analytics ("hoeveel offertes?", "top klanten?")',
      'CSV data importeren voor extra context',
      'Altijd beschikbaar, wordt steeds slimmer',
    ],
    mockup: <DaanAIMockup />,
  },
]

export default function FeaturesContent() {
  const [activeModule, setActiveModule] = useState(0)
  const mod = modules[activeModule]

  return (
    <div className="pt-32 md:pt-40">
      {/* Header */}
      <section className="pb-12 md:pb-16">
        <div className="container-site text-center">
          <SectionReveal>
            <p className="font-mono text-sm text-flame mb-4">Features</p>
            <h1 className="hero-heading font-heading text-petrol mb-6">
              Alles wat je nodig hebt<span className="text-flame">.</span>
            </h1>
            <p className="text-muted text-lg max-w-lg mx-auto">
              Zes kernmodules, tientallen functies. Gekoppeld aan Mollie, Exact Online, Probo en KVK. Alles erin, geen add-ons.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Module navigation + content */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar nav */}
            <div className="lg:w-56 shrink-0">
              <div className="lg:sticky lg:top-28">
                <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {modules.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveModule(i)}
                      className={`text-left whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[48px] flex items-center gap-2.5 ${
                        activeModule === i
                          ? 'bg-white border border-black/[0.05] shadow-sm'
                          : 'text-muted hover:bg-white/50'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <span style={activeModule === i ? { color: m.color } : undefined}>
                        {m.name}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="bg-white rounded-2xl p-8 md:p-12 border border-black/[0.05] relative overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
                    {/* Left accent */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{ backgroundColor: mod.color }}
                    />

                    <div className="pl-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: mod.color }}
                        />
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.1em] font-bold"
                          style={{ color: mod.color }}
                        >
                          {mod.name}
                        </span>
                      </div>

                      <h2 className="font-heading text-3xl md:text-4xl text-petrol tracking-tight mt-3 mb-4">
                        {mod.headline}
                      </h2>
                      <p className="text-muted leading-relaxed mb-8 max-w-xl">
                        {mod.description}
                      </p>

                      {/* Status badge */}
                      <span
                        className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-full mb-8"
                        style={{ backgroundColor: mod.lightBg, color: mod.color }}
                      >
                        {mod.status.slice(0, -1)}
                        <span className="text-flame">.</span>
                      </span>

                      {/* Module mockup */}
                      <div
                        className="w-full aspect-[16/9] rounded-xl border border-black/[0.03] mb-8 overflow-hidden"
                        style={{ background: `linear-gradient(160deg, ${mod.lightBg} 0%, ${mod.lightBg}80 100%)` }}
                      >
                        {mod.mockup}
                      </div>

                      {/* Highlights */}
                      <h3 className="font-semibold text-sm text-petrol mb-4">Wat je krijgt</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mod.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                              style={{ backgroundColor: mod.color }}
                            />
                            <span className="text-ink/70">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="pb-16 md:pb-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol text-center mb-4">
              Koppelingen<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-center max-w-lg mx-auto mb-12">
              doen. praat met de tools die je al gebruikt.
            </p>
          </SectionReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { name: 'Mollie', desc: 'Je klant betaalt facturen direct online via iDEAL, creditcard of andere methodes.' },
              { name: 'Exact Online', desc: 'Facturen automatisch synchroniseren met je boekhouding.' },
              { name: 'Probo', desc: 'Live printprijzen ophalen vanuit de offerte-editor. Configureer en bestel direct.' },
              { name: 'KVK', desc: 'Bedrijfsgegevens automatisch ophalen bij het aanmaken van een nieuwe klant.' },
              { name: 'Email (IMAP/SMTP)', desc: 'Je eigen email in doen. Versturen, ontvangen, templates, geplande emails.' },
              { name: 'AI (Claude)', desc: 'Teksten schrijven, verbeteren, samenvatten, analyseren. Geintegreerd in elke module.' },
            ].map((integ, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-black/[0.05]" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
                <p className="font-mono text-xs font-bold text-petrol mb-1.5">{integ.name}</p>
                <p className="text-muted text-xs leading-relaxed">{integ.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra features */}
      <section className="pb-16 md:pb-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="section-heading font-heading text-petrol text-center mb-4">
              En nog meer<span className="text-flame">.</span>
            </h2>
            <p className="text-muted text-center max-w-lg mx-auto mb-12">
              Naast de zes kernmodules zit er nog veel meer in doen.
            </p>
          </SectionReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              'CRM met deals pipeline',
              'Klantprofielen en contactpersonen',
              'Email met gedeelde inbox',
              'Nieuwsbrieven builder',
              'Leveranciersbeheer',
              'Bestelbonnen en leveringsbonnen',
              'Voorraad management',
              'Tijdregistratie per project',
              'Nacalculatie',
              'Rapportages en forecast',
              'Documenten management',
              'Lead capture formulieren',
              'Signing Visualizer (AI mockups)',
              'Multi-tab interface',
              'NL/EN taalondersteuning',
              'Dark mode en 4 thema\'s',
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-flame mt-1.5 shrink-0" />
                <span className="text-ink/70">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Note about all features included */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="bg-petrol/[0.04] rounded-2xl p-8 md:p-12 text-center border border-petrol/10">
            <p className="font-heading text-xl md:text-2xl text-petrol mb-2">
              Alles zit in elk plan<span className="text-flame">.</span>
            </p>
            <p className="text-muted text-sm max-w-md mx-auto mb-6">
              Geen add-ons. Geen premium features. Bij anderen betaal je extra voor
              planning, klantportaal of AI. Bij ons zit alles erin. Inclusief alle koppelingen.
            </p>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
