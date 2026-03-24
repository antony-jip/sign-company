'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const modules = [
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    lightBg: '#F2E8E5',
    headline: 'Wie doet wat, wanneer, waar.',
    status: 'gepland.',
    description: 'Een visueel planbord waar je taken en montages inplant per medewerker. Drag-and-drop, gekoppeld aan projecten, zichtbaar voor je hele team. Je monteur weet precies waar hij wanneer moet zijn.',
    highlights: [
      'Visueel planbord per week/maand',
      'Drag-and-drop planning',
      'Per medewerker of per project',
      'Automatische notificaties',
      'Mobiel toegankelijk voor je team',
      'Koppeling met projecten en werkbonnen',
    ],
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#C44830',
    lightBg: '#FAE5E0',
    headline: 'Digitaal. Op locatie. Getekend.',
    status: 'getekend.',
    description: 'Geen papieren werkbonnen meer die kwijtraken in het busje. Je monteur opent de app, ziet zijn taken, maakt foto\'s, laat de klant tekenen. Alles digitaal, alles vastgelegd.',
    highlights: [
      'Digitale werkbonnen op je telefoon',
      'Foto\'s uploaden op locatie',
      'Digitale handtekening van de klant',
      'Uren en materiaal registreren',
      'Automatisch koppelen aan project',
      'Direct factureerbaar',
    ],
  },
  {
    id: 'klantportaal',
    name: 'Klantportaal',
    color: '#3A6B8C',
    lightBg: '#E5ECF6',
    headline: 'Je klant ziet wat hij moet zien.',
    status: 'goedgekeurd.',
    description: 'Geef je klant een eigen inlogomgeving. Daar ziet hij de status van zijn project, kan hij ontwerpen goedkeuren, facturen inzien en berichten sturen. Minder bellen, meer vertrouwen.',
    highlights: [
      'Eigen login voor elke klant',
      'Projectstatus en timeline',
      'Ontwerp goedkeuring',
      'Factuuroverzicht',
      'Berichten uitwisselen',
      'Professionele uitstraling',
    ],
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    lightBg: '#FDE8E2',
    headline: 'Professionele offertes in minuten.',
    status: 'verstuurd.',
    description: 'Geen Word-documenten meer kopiëren en plakken. Kies een sjabloon, selecteer je producten, pas de prijzen aan en verstuur. Je klant ontvangt een offerte die er professioneel uitziet, met digitale akkoordknop.',
    highlights: [
      'Sjablonen met je eigen huisstijl',
      'Herbruikbare productbibliotheek',
      'Digitale handtekening en akkoord',
      'Automatisch project aanmaken bij akkoord',
      'PDF export',
      'Offertehistorie per klant',
    ],
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    lightBg: '#E4F0EA',
    headline: 'Verstuurd. Herinnerd. Betaald.',
    status: 'betaald.',
    description: 'Genereer facturen vanuit je offertes of werkbonnen. Automatische herinneringen sturen als de betaaltermijn verstrekt. Je ziet altijd welke facturen openstaan en welke betaald zijn.',
    highlights: [
      'Een klik factuur vanuit offerte of werkbon',
      'Automatische betalingsherinneringen',
      'Betaalstatus realtime bijgehouden',
      'Factuuroverzicht met filters',
      'Voldoet aan Nederlandse factuureisen',
      'Creditnota\'s en deelfacturatie',
    ],
  },
  {
    id: 'daan-ai',
    name: 'Daan AI',
    color: '#6A5A8A',
    lightBg: '#EEE8F5',
    headline: 'Je slimste collega werkt 24/7.',
    status: 'slim.',
    description: 'Daan AI helpt je met het schrijven van offerteteksten, het samenvatten van projecten en het doen van slimme suggesties. Geen vervanging van jou, een versterking. Als een collega die altijd beschikbaar is.',
    highlights: [
      'Offerteteksten genereren',
      'Projectsamenvattingen',
      'Slimme suggesties op basis van je data',
      'Teksten verbeteren en herschrijven',
      'Altijd beschikbaar',
      'Wordt steeds slimmer',
    ],
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
              Zes modules die samenwerken. Alles erin, geen add-ons.
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

                      {/* Visual placeholder */}
                      <div
                        className="w-full aspect-[16/9] rounded-xl border border-black/[0.03] mb-8 flex items-center justify-center"
                        style={{ background: `linear-gradient(160deg, ${mod.lightBg} 0%, ${mod.lightBg}80 100%)` }}
                      >
                        <div className="text-center">
                          <div
                            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                            style={{ backgroundColor: mod.color + '15' }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{ backgroundColor: mod.color + '30' }}
                            />
                          </div>
                          <p className="font-mono text-xs" style={{ color: mod.color + '60' }}>
                            {mod.name}
                          </p>
                        </div>
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

      {/* Note about all features included */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="bg-petrol/[0.04] rounded-2xl p-8 md:p-12 text-center border border-petrol/10">
            <p className="font-heading text-xl md:text-2xl text-petrol mb-2">
              Alle zes modules zitten in elk plan<span className="text-flame">.</span>
            </p>
            <p className="text-muted text-sm max-w-md mx-auto mb-6">
              Geen add-ons. Geen premium features. Bij anderen betaal je extra voor
              planning, klantportaal of AI. Bij ons zit alles erin.
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
