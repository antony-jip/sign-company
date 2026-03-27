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
    description: 'Klant vraagt een offerte aan? Maak een project aan. Vanuit de cockpit doe je alles: offertes maken, situatiefoto\'s uploaden, taken toewijzen, bestanden delen via het portaal. De offertetekst wordt 1:1 overgenomen in de werkbon, zodat je monteur exact weet wat er bedoeld wordt.',
    highlights: ['Cockpit: offertes, taken, bestanden en portaal op één plek', 'Offertetekst wordt 1:1 overgenomen in werkbonnen', 'Situatiefoto\'s uploaden en delen met je klant', 'Klantportaal: bestanden delen en overzicht houden', 'Statusflow: actief → te plannen → gepland → in review → te factureren → afgerond'],
    detail: 'Het project is de kern van doen. Alles begint hier. Vanuit de cockpit heb je overzicht op de hele flow: van eerste klantvraag tot oplevering. Taken toewijzen, offertes opstellen, werkbonnen klaarzetten, montage plannen. Alles is gekoppeld, niks valt tussen wal en schip. Je monteur ziet exact wat er in de offerte staat, je klant volgt mee via het portaal.',
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    image: '/images/modules/offertes.jpg',
    headline: 'Professioneel in minuten.',
    description: 'Maak je eigen calculatie-templates aan voor jouw diensten. Producten zoals wrapfolie voeg je toe als vaste items. De calculator combineert verschillende elementen tot één prijs. Upload een werktekening en die wordt direct opgeslagen als liggende tekening met omschrijving — geen Illustrator nodig.',
    highlights: ['Calculatie-templates en producten aanmaken', 'Calculator: meerdere elementen → één prijs', 'Werktekening uploaden direct in de offerte', 'Verstuur als PDF per mail of via het portaal', 'Statusflow: concept → verstuurd → bekeken → akkoord → gefactureerd'],
    detail: 'Geen losse Excel-sheets meer. Bouw je eigen templates voor je meest voorkomende diensten: gevelreclame, autobelettering, lichtreclame. Voeg producten toe als vaste items zodat je ze steeds hergebruikt. Upload een werktekening direct in de offerte — die wordt automatisch opgeslagen als liggende tekening met omschrijving. Meerdere offertes per project, versioning bij wijzigingen, en je klant keurt goed via mail of het portaal.',
  },
  {
    id: 'portaal',
    name: 'Klantportaal',
    color: '#6A5A8A',
    image: '/images/modules/klantportaal.jpg',
    headline: 'Deel, bespreek, accordeer.',
    description: 'Open het portaal en je klant ontvangt een unieke link per mail. Geen inloggen nodig. Je klant reageert direct op werktekeningen, visualisaties, offertes en facturen. Meerdere contactpersonen per klant.',
    highlights: ['Unieke link per project, geen inlog nodig', 'Klant reageert op tekeningen, offertes en facturen', 'Notificaties bij nieuwe items in het portaal', 'Automatische herinneringen (instelbaar + eigen template)', 'Meerdere contactpersonen per klant'],
    detail: 'Geen eindeloos mailen meer. Je klant krijgt een persoonlijke link en ziet alles op één plek: werktekeningen, visualisaties, offertes, facturen. Ze reageren direct op bestanden — geen losse mailthreads. Reageert de klant niet? Na 3 dagen gaat er automatisch een herinnering uit, met jouw eigen template. Meerdere contactpersonen van dezelfde klant kunnen allemaal mee.',
  },
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    image: '/images/modules/planning.jpg',
    headline: 'Sleep je week in elkaar.',
    description: 'Maak vanuit een project een montage-afspraak aan, of zet het op "te plannen" zodat je monteur het zelf inplant. Weekoverzicht per monteur of per ploeg. Elke afspraak toont tijd, locatie, projectnaam en de gekoppelde werkbon.',
    highlights: ['Drag-and-drop vanuit "te plannen" naar een dag', 'Plan per monteur of per ploeg', 'Werkbon direct gekoppeld aan de afspraak', 'Weerbericht per dag in de planning', 'Filter op monteur en conflict-detectie'],
    detail: 'Planning hoeft niet ingewikkeld te zijn. Zet een project op "te plannen" en je monteur pakt het zelf op, of sleep het naar een dag in het weekoverzicht. Elke afspraak toont alles wat je monteur nodig heeft: tijd, locatie, projectnaam en de werkbon. Het weerbericht zit geïntegreerd, zodat je buiten-montages slim plant. Dubbel geboekt? Conflict-detectie waarschuwt je.',
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#1A535C',
    image: '/images/modules/werkbonnen.jpg',
    headline: 'Digitaal op locatie.',
    description: 'De werkbon neemt alle regels uit de offerte 1:1 over, of maak er een vanaf scratch. Upload tot 2 afbeeldingen (4:3) als instructie. Je monteur opent de werkbon op zijn telefoon, registreert uren, maakt foto\'s op locatie.',
    highlights: ['Offerte-regels worden 1:1 overgenomen', 'Afbeeldingen toevoegen als instructie', 'Monteur registreert uren en foto\'s op locatie', 'Werkbon op telefoon of uitprinten', 'Vanaf scratch of vanuit een offerte'],
    detail: 'De werkbon is het verlengstuk van de offerte. Alle regels worden 1:1 overgenomen, zodat je monteur precies weet wat er bedoeld wordt. Voeg instructiefoto\'s toe zodat er geen twijfel is. Op locatie opent je monteur de werkbon op zijn telefoon: uren registreren, foto\'s maken van het resultaat. Liever papier? Print hem uit. Alles komt automatisch terug in het project.',
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    image: '/images/modules/facturen.jpg',
    headline: 'Verstuurd, herinnerd, betaald.',
    description: 'Maak een factuur vanuit een goedgekeurde offerte of vanaf scratch. Volledig gecustomized: eigen layout, eigen teksten. Klant betaalt direct via Mollie of ontvangt een losse factuur-PDF.',
    highlights: ['Factuur vanuit offerte of vanaf scratch', 'Mollie betaallink (iDEAL, creditcard)', 'Automatische herinneringen (zelf instelbaar)', 'Voorschotfacturen en deelfacturen', 'Volledig gecustomized layout en teksten'],
    detail: 'Factureren zonder gedoe. Met één klik maak je een factuur vanuit een goedgekeurde offerte — alle regels worden overgenomen. Of maak er een vanaf scratch. Je klant betaalt direct via Mollie (iDEAL, creditcard) of ontvangt een PDF. Herinneringen worden automatisch verstuurd vanuit doen., op het moment dat jij instelt. Voorschotfacturen en deelfacturen voor grote projecten.',
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    color: '#9A5A48',
    image: '/images/modules/visualizer.jpg',
    headline: 'AI toont het eindresultaat.',
    description: 'Upload een schets of foto en AI brengt het tot leven. Autobelettering, gevelreclame, lichtreclame — je input wordt verbeterd door Claude Sonnet en gevisualiseerd via Nano Banana.',
    highlights: ['Upload schets of foto → AI visualiseert het resultaat', 'Input wordt verbeterd door Claude Sonnet', 'Koppel aan project of offerte binnen doen.', '10 credits standaard, bijkopen wanneer je wilt', 'Deel via het portaal met je klant'],
    detail: 'Laat je klant zien hoe het eindresultaat eruitziet, nog vóór je begint. Upload een schets van de autobelettering of een foto van de gevel. Claude Sonnet verbetert je input en Nano Banana genereert een realistische visualisatie. Koppel het aan een project of offerte en deel het via het portaal. Je begint met 10 credits en koopt bij wanneer je wilt.',
  },
  {
    id: 'ai',
    name: 'AI-assistent',
    color: '#1A535C',
    image: '/images/modules/ai-assistant.jpg',
    headline: 'Je slimste collega.',
    description: 'Daan ziet al je data: facturen, projecten, offertes, klanten. Vraag "hoeveel staat er open?" of "welke projecten lopen?" en je hebt antwoord. Selecteer tekst en Daan verbetert of verlengt het.',
    highlights: ['Ziet al je bedrijfsdata: facturen, projecten, klanten', 'Tekst selecteren → verbeteren of verlengen', 'Mails samenvatten en schrijven', 'Helpt met calculaties en vierkante meters', 'Draait op Claude Sonnet 4.6'],
    detail: 'Daan is je AI-collega die alles weet van je bedrijf. Vraag hoeveel er openstaat, wie je grootste klant is, of welke projecten vertraging hebben. Selecteer tekst in een offerte of mail en Daan verbetert of verlengt het. Laat Daan je mails samenvatten of een offertetekst schrijven. Moet je vierkante meters uitrekenen voor een calculatie? Daan helpt. Draait op Claude Sonnet 4.6 en wordt steeds slimmer.',
  },
]

const faq = [
  { q: 'Kan ik doen. eerst uitproberen?', a: 'Ja, de eerste 30 dagen zijn gratis. Geen creditcard nodig. Je hebt direct toegang tot alle modules.' },
  { q: 'Hoeveel kost doen. na de proefperiode?', a: '€49 per maand voor 3 gebruikers. Elke extra gebruiker is €10 per maand. Geen opzetkosten, geen verborgen kosten.' },
  { q: 'Kan ik mijn bestaande data importeren?', a: 'Ja, we helpen je met het importeren van je klanten en producten. Neem contact op via hello@doen.team.' },
  { q: 'Werkt doen. op mijn telefoon?', a: 'Ja. De planning en werkbonnen zijn geoptimaliseerd voor mobiel. Je monteur opent de werkbon op zijn telefoon en registreert direct uren en foto\'s.' },
  { q: 'Hoe werkt het klantportaal?', a: 'Je klant ontvangt een unieke link per mail. Geen inlog nodig. Ze bekijken tekeningen, keuren offertes goed en reageren op bestanden. Je stelt zelf in wanneer herinneringen uitgaan.' },
  { q: 'Wat is de Visualizer?', a: 'Upload een schets of foto en AI genereert een realistische visualisatie van het eindresultaat. Je begint met 10 credits en koopt bij wanneer je wilt.' },
  { q: 'Zit AI echt overal in?', a: 'Ja. Daan (onze AI-assistent) draait op Claude Sonnet 4.6. Hij kent je bedrijfsdata, schrijft teksten, helpt met calculaties en wordt steeds slimmer.' },
  { q: 'Kan ik doen. koppelen aan mijn boekhouding?', a: 'We werken aan een koppeling met Exact Online. Mollie (iDEAL, creditcard) is al geïntegreerd voor online betalingen.' },
]

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid #EBEBEB' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[15px] md:text-[16px] font-semibold text-petrol pr-4">{question}</span>
        <motion.span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: open ? '#F15025' : '#F8F7F5' }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2V10M2 6H10" stroke={open ? 'white' : '#9B9B95'} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] md:text-[15px] leading-[1.7] pb-5" style={{ color: '#6B6B66' }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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
      <section className="bg-white pt-8 pb-10 md:pb-14">
        <div className="container-site">
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {modules.map((m, i) => (
              <button
                key={m.id}
                onClick={() => selectModule(i)}
                className={`flex-shrink-0 snap-center transition-all duration-300 ${
                  activeModule === i ? 'scale-100 opacity-100' : 'scale-95 opacity-60 hover:opacity-80'
                }`}
              >
                <div className={`w-[100px] md:w-[120px] rounded-xl overflow-hidden transition-all duration-300`}
                  style={activeModule === i ? { boxShadow: `0 0 0 2px ${m.color}, 0 4px 20px ${m.color}20` } : {}}
                >
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
        </div>

        {/* Divider */}
        <div className="container-site mt-6">
          <div className="h-px" style={{ backgroundColor: '#EBEBEB' }} />
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

              {/* Detail section */}
              <motion.div
                className="mt-12 md:mt-16 rounded-2xl p-8 md:p-10"
                style={{ backgroundColor: `${mod.color}08`, border: `1px solid ${mod.color}12` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                    <span className="font-mono text-[13px] font-bold" style={{ color: mod.color }}>i</span>
                  </div>
                  <h3 className="font-heading text-[18px] md:text-[20px] font-bold text-petrol tracking-tight">
                    Waarom {mod.name.toLowerCase()} in doen<span className="text-flame">.</span>
                  </h3>
                </div>
                <p className="text-[15px] leading-[1.8] max-w-3xl" style={{ color: '#6B6B66' }}>
                  {mod.detail}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] text-center mb-4">
              Veelgestelde vragen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-12" style={{ color: '#6B6B66' }}>
              Alles wat je wilt weten over doen.
            </p>
          </SectionReveal>
          <div className="max-w-2xl mx-auto space-y-0">
            {faq.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="rounded-2xl p-10 md:p-14 text-center" style={{ backgroundColor: '#1A535C' }}>
            <p className="text-[13px] text-flame font-semibold mb-3 tracking-wide">Binnenkort live</p>
            <h2 className="font-heading text-[24px] md:text-[32px] font-bold text-white tracking-tight mb-3">
              Schrijf je in voor early access<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8">
              Alles zit erin. Geen add-ons. We mailen je zodra doen. live gaat.
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
