'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const modules = [
  {
    id: 'projecten',
    name: 'Projecten',
    color: '#1A535C',
    image: '/images/modules/projecten.jpg',
    headline: 'Alles in één cockpit.',
    description: 'Elk project heeft een cockpit. Briefing, taken, offertes, montage-afspraken, bestanden en activiteit. Bovenaan staan quick actions: Taak, Offerte, Werkbon, Montage, Factuur. Eén klik en je bent bezig.',
    highlights: ['Briefing, taken en bestanden op één plek', 'Quick actions voor elke stap', 'Statusflow: gepland → actief → gefactureerd', 'Situatiefoto\'s en documentbeheer', 'Activiteitfeed per project'],
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    image: '/images/modules/offertes.jpg',
    headline: 'Professioneel in minuten.',
    description: 'Selecteer een klant, voeg items toe met je prijscalculatie, verstuur direct per email met PDF. Autosave terwijl je werkt. Versioning als de klant wijzigingen wil. Klant keurt goed via het portaal.',
    highlights: ['Calculatie-templates voor snellere offertes', 'PDF automatisch als bijlage bij email', 'Versiegeschiedenis bewaard', 'Klant keurt goed via het portaal', 'Kanban pipeline: concept → verstuurd → akkoord'],
  },
  {
    id: 'portaal',
    name: 'Klantportaal',
    color: '#6A5A8A',
    image: '/images/modules/klantportaal.jpg',
    headline: 'Deel, bespreek, accordeer.',
    description: 'Activeer het portaal en je klant krijgt een unieke link. Tekeningen bekijken, offertes goedkeuren, berichten sturen, bestanden uploaden. Geen inloggen nodig. Reageert de klant niet? Automatische herinnering.',
    highlights: ['Unieke link per project', 'Tekeningen goedkeuren met één klik', 'Chat-achtige tijdlijn', 'Automatische herinneringen', 'Eigen branding'],
  },
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    image: '/images/modules/planning.jpg',
    headline: 'Sleep je week in elkaar.',
    description: 'Weekoverzicht met alle montage-afspraken per dag. Sleep "te plannen" projecten direct naar een dag. Filter op monteur. Weerbericht geïntegreerd. Conflict-detectie als monteurs dubbel gepland staan.',
    highlights: ['Drag-and-drop montageplanning', 'Weerbericht per dag', 'Per monteur filteren', 'Conflict-detectie', 'Statusflow: gepland → onderweg → afgerond'],
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#1A535C',
    image: '/images/modules/werkbonnen.jpg',
    headline: 'Digitaal op locatie.',
    description: 'Een werkbon is de opdracht voor je monteur. Koppel aan project en offerte, alles wordt overgenomen. Items met beschrijving en afbeeldingen. Monteur registreert uren, uploadt foto\'s, klant tekent digitaal.',
    highlights: ['Neemt offerte-regels automatisch over', 'Foto\'s uploaden op locatie', 'Digitale klanthandtekening', 'Uren en materiaal registreren', 'PDF werkbon-instructie genereren'],
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    image: '/images/modules/facturen.jpg',
    headline: 'Verstuurd, herinnerd, betaald.',
    description: 'Maak facturen op basis van goedgekeurde offertes. Alle regels worden overgenomen. PDF bijlage bij email. Mollie betaallink zodat klanten direct online betalen. Automatische herinneringen bij verlopen facturen.',
    highlights: ['Eén klik factuur vanuit offerte', 'Mollie betaallink (iDEAL, creditcard)', 'Automatische herinneringen (7, 14, 21, 30 dagen)', 'Creditnota\'s en voorschotfacturen', 'UBL/e-facturatie export'],
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    color: '#9A5A48',
    image: '/images/modules/visualizer.jpg',
    headline: 'AI toont het eindresultaat.',
    description: 'Upload een foto van de locatie. AI visualiseert het eindresultaat. Gevelreclame, lichtreclame, autobelettering. Koppel aan project of offerte, deel via het portaal. Draait op Nano Banana 2.',
    highlights: ['Upload foto → AI genereert visualisatie', 'Koppel aan project of offerte', 'Deel via het klantportaal', 'Betaal per visualisatie (krediet bijkopen)', 'Gevelreclame, lichtreclame, autobelettering'],
  },
  {
    id: 'ai',
    name: 'AI-assistent',
    color: '#1A535C',
    image: '/images/modules/ai-assistant.jpg',
    headline: 'Je slimste collega.',
    description: 'Daan kent je bedrijfsdata. Schrijft offerteteksten, vat projecten samen, beantwoordt vragen. "Hoeveel offertes staan open?" "Wie is mijn grootste klant?" Email schrijfassistent. Wordt steeds slimmer.',
    highlights: ['AI chatbot die je data kent', 'Offerteteksten genereren en verbeteren', 'Business analytics via chat', 'Email schrijfassistent', 'Powered by Claude'],
  },
]

export default function FeaturesContent() {
  const [activeModule, setActiveModule] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mod = modules[activeModule]

  function selectModule(index: number) {
    setActiveModule(index)
    // Scroll the thumbnail into view
    if (scrollRef.current) {
      const child = scrollRef.current.children[index] as HTMLElement
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  return (
    <div className="pt-28 md:pt-36">
      {/* Header */}
      <section className="pb-10 md:pb-14">
        <div className="container-site text-center">
          <SectionReveal>
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">Alles wat je nodig hebt</p>
            <h1 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-5">
              Gebouwd voor hoe<br />jij werkt<span className="text-flame">.</span>
            </h1>
            <p className="text-[17px] max-w-lg mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
              Geen losse tools aan elkaar knopen. Alles in één systeem, alles verbonden. Klik op een module om te ontdekken wat erin zit.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Module illustration slider */}
      <section className="pb-6 bg-white">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-[max(1rem,calc((100vw-1200px)/2))] pb-4"
          style={{ scrollbarWidth: 'none' }}
        >
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => selectModule(i)}
              className={`flex-shrink-0 snap-center transition-all duration-300 ${
                activeModule === i ? 'scale-100 opacity-100' : 'scale-95 opacity-50 hover:opacity-75'
              }`}
            >
              <div className={`w-[120px] md:w-[140px] rounded-xl overflow-hidden transition-all duration-300 ${
                activeModule === i ? 'ring-2 shadow-lg' : ''
              }`} style={activeModule === i ? { ringColor: m.color, boxShadow: `0 4px 20px ${m.color}20` } : {}}>
                <Image
                  src={m.image}
                  alt={m.name}
                  width={500}
                  height={500}
                  className="w-full aspect-square object-cover"
                />
              </div>
              <p className={`text-[11px] md:text-[12px] mt-2 font-semibold transition-colors duration-300 ${
                activeModule === i ? '' : 'text-[#9B9B95]'
              }`} style={activeModule === i ? { color: m.color } : {}}>
                {m.name}<span style={{ color: m.color }}>.</span>
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Active module content */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container-site">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                {/* Left: illustration */}
                <div>
                  <Image
                    src={mod.image}
                    alt={mod.name}
                    width={1000}
                    height={1000}
                    className="w-full max-w-md mx-auto h-auto"
                  />
                </div>

                {/* Right: content */}
                <div>
                  <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: mod.color }}>
                    {mod.name}
                  </span>
                  <h2 className="font-heading text-[32px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[1.05] mt-2 mb-5">
                    {mod.headline}
                  </h2>
                  <p className="text-[16px] leading-[1.7] mb-8" style={{ color: '#6B6B66' }}>
                    {mod.description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-3">
                    {mod.highlights.map((h, i) => (
                      <motion.li
                        key={h}
                        className="flex items-start gap-3 text-[14px]"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: mod.color }} />
                        <span style={{ color: '#1A1A1A' }}>{h}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Accent bar */}
                  <motion.div
                    className="h-[3px] w-12 rounded-full mt-8"
                    style={{ backgroundColor: mod.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 md:py-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] text-center mb-4">
              Koppelingen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-12" style={{ color: '#6B6B66' }}>
              doen. praat met de tools die je al gebruikt.
            </p>
          </SectionReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { name: 'Mollie', desc: 'Je klant betaalt facturen direct online via iDEAL, creditcard of andere methodes.' },
              { name: 'Exact Online', desc: 'Facturen automatisch synchroniseren met je boekhouding.' },
              { name: 'Probo', desc: 'Live printprijzen ophalen vanuit de offerte-editor.' },
              { name: 'KVK', desc: 'Bedrijfsgegevens automatisch ophalen bij het aanmaken van een klant.' },
              { name: 'Email (IMAP/SMTP)', desc: 'Je eigen email in doen. Versturen, ontvangen, templates.' },
              { name: 'AI (Claude)', desc: 'Teksten schrijven, verbeteren, samenvatten, analyseren.' },
            ].map((integ, i) => (
              <div key={i} className="bg-white rounded-xl p-5" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                <p className="font-mono text-[11px] font-bold text-petrol mb-1.5 tracking-wider">{integ.name}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#6B6B66' }}>{integ.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="rounded-2xl p-10 md:p-14 text-center" style={{ backgroundColor: '#1A535C' }}>
            <h2 className="font-heading text-[24px] md:text-[32px] font-bold text-white tracking-tight mb-3">
              Alles zit erin<span className="text-flame">.</span> Geen add-ons.
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8">
              Bij anderen betaal je extra voor planning, klantportaal of AI. Bij ons zit alles erin.
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
