'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const modules = [
  {
    id: 'projecten',
    name: 'Projecten',
    headline: 'Van eerste contact tot oplevering.',
    status: 'opgeleverd.',
    description: 'Elk project krijgt zijn eigen plek. Notities, documenten, foto\'s, alle communicatie — bij elkaar. Nooit meer zoeken door je mailbox of WhatsApp-groepen. Je ziet in een oogopslag waar elk project staat.',
    highlights: [
      'Onbeperkt projecten aanmaken',
      'Documenten en foto\'s uploaden',
      'Notities en communicatie per project',
      'Statusoverzicht in een dashboard',
      'Koppeling met offertes, werkbonnen en facturen',
    ],
  },
  {
    id: 'offertes',
    name: 'Offertes',
    headline: 'Professionele offertes in minuten.',
    status: 'verstuurd.',
    description: 'Geen Word-documenten meer kopiëren en plakken. Kies een sjabloon, selecteer je producten, pas de prijzen aan en verstuur. Je klant ontvangt een offerte die er professioneel uitziet — met digitale akkoordknop.',
    highlights: [
      'Sjablonen met je eigen huisstijl',
      'Herbruikbare productbibliotheek',
      'Digitale handtekening en akkoord',
      'Automatisch project aanmaken bij akkoord',
      'PDF export',
    ],
  },
  {
    id: 'facturen',
    name: 'Facturen',
    headline: 'Verstuurd. Herinnerd. Betaald.',
    status: 'betaald.',
    description: 'Genereer facturen vanuit je offertes of werkbonnen. Automatische herinneringen sturen als de betaaltermijn verstrekt. Je ziet altijd welke facturen openstaan en welke betaald zijn.',
    highlights: [
      'Eén klik factuur vanuit offerte of werkbon',
      'Automatische betalingsherinneringen',
      'Betaalstatus realtime bijgehouden',
      'Factuuroverzicht met filters',
      'Voldoet aan Nederlandse factuureisen',
    ],
  },
  {
    id: 'planning',
    name: 'Planning',
    headline: 'Wie doet wat, wanneer, waar.',
    status: 'gepland.',
    description: 'Een visuele planbord waar je taken en montages inplant per medewerker. Drag-and-drop, gekoppeld aan projecten, zichtbaar voor je hele team. Je monteur weet precies waar hij wanneer moet zijn.',
    highlights: [
      'Visueel planbord per week/maand',
      'Drag-and-drop planning',
      'Per medewerker of per project',
      'Automatische notificaties',
      'Mobiel toegankelijk voor je team',
    ],
  },
  {
    id: 'klantportaal',
    name: 'Klantportaal',
    headline: 'Je klant ziet wat hij moet zien.',
    status: 'goedgekeurd.',
    description: 'Geef je klant een eigen inlogomgeving. Daar ziet hij de status van zijn project, kan hij ontwerpen goedkeuren, facturen inzien en berichten sturen. Minder bellen, meer vertrouwen.',
    highlights: [
      'Eigen login voor elke klant',
      'Projectstatus en timeline',
      'Ontwerp goedkeuring',
      'Factuuroverzicht',
      'Berichten uitwisselen',
    ],
  },
  {
    id: 'daan-ai',
    name: 'Daan AI',
    headline: 'Je slimste collega werkt 24/7.',
    status: 'slim.',
    description: 'Daan AI helpt je met het schrijven van offerteteksten, het samenvatten van projecten en het doen van slimme suggesties. Geen vervanging van jou — een versterking. Als een collega die altijd beschikbaar is.',
    highlights: [
      'Offerteteksten genereren',
      'Projectsamenvattingen',
      'Slimme suggesties op basis van je data',
      'Teksten verbeteren en herschrijven',
      'Altijd leren, steeds slimmer',
    ],
  },
]

export default function FeaturesContent() {
  const [activeModule, setActiveModule] = useState(0)

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
              Zes modules die samenwerken als een team. Van offerte tot factuur,
              van planning tot klantportaal.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Module navigation — sticky on desktop */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar nav */}
            <div className="lg:w-56 shrink-0">
              <div className="lg:sticky lg:top-28">
                <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {modules.map((mod, i) => (
                    <button
                      key={mod.id}
                      onClick={() => setActiveModule(i)}
                      className={`text-left whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[48px] ${
                        activeModule === i
                          ? 'bg-petrol text-white'
                          : 'text-muted hover:text-petrol hover:bg-petrol/5'
                      }`}
                    >
                      {mod.name}
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
                  <div className="bg-white rounded-2xl p-8 md:p-12 border border-ink/[0.04]">
                    <span className="font-mono text-xs text-flame uppercase tracking-widest">
                      {modules[activeModule].name}
                    </span>
                    <h2 className="font-heading text-3xl md:text-4xl text-petrol tracking-tight mt-3 mb-4">
                      {modules[activeModule].headline}
                    </h2>
                    <p className="text-muted leading-relaxed mb-8 max-w-xl">
                      {modules[activeModule].description}
                    </p>

                    {/* Status badge */}
                    <div className="inline-block font-mono text-sm bg-petrol/5 text-petrol px-3 py-1.5 rounded-md mb-8">
                      {modules[activeModule].status.slice(0, -1)}
                      <span className="text-flame">.</span>
                    </div>

                    {/* Visual placeholder */}
                    <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-petrol/[0.04] to-flame/[0.02] border border-ink/[0.03] mb-8 flex items-center justify-center">
                      <p className="font-mono text-xs text-muted/30">
                        {modules[activeModule].name} — screenshot
                      </p>
                    </div>

                    {/* Highlights */}
                    <h3 className="font-semibold text-sm text-petrol mb-4">Wat je krijgt</h3>
                    <ul className="space-y-3">
                      {modules[activeModule].highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-flame mt-2 shrink-0" />
                          <span className="text-ink/70">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site text-center">
          <SectionReveal>
            <h2 className="font-heading text-2xl text-petrol mb-6">
              Alles voor &euro;49 per maand<span className="text-flame">.</span>
            </h2>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  )
}
