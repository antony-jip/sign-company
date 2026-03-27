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
    headline: 'Eén cockpit. Alles gedaan.',
    description: 'Klant belt? Project aanmaken. Offerte, werkbon, montage, factuur. Alles vanuit één cockpit. De offertetekst gaat 1:1 naar de werkbon. Je monteur weet precies wat er bedoeld wordt. Je klant volgt mee via het portaal.',
    highlights: ['Offertes, taken, bestanden en portaal op één plek', 'Offertetekst 1:1 in de werkbon', 'Situatiefoto\'s delen met je klant', 'Van eerste vraag tot oplevering'],
    detail: 'Het project is de kern van doen. Hier begint alles en hier komt alles samen. Geen losse documenten, geen vergeten taken. Alles gekoppeld, alles zichtbaar. Jij houdt de regie, je klant volgt mee.',
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    image: '/images/modules/offertes.jpg',
    headline: 'Offerte? Zo gedaan.',
    description: 'Eigen templates, eigen producten, eigen calculatie. Combineer elementen tot één prijs. Werktekening erbij? Upload en klaar. Wordt automatisch een liggende tekening met omschrijving. Geen Illustrator nodig.',
    highlights: ['Templates en producten hergebruiken', 'Calculator: elementen → één prijs', 'Werktekening direct in de offerte', 'PDF per mail of akkoord via het portaal'],
    detail: 'Geen Excel meer. Bouw templates voor gevelreclame, autobelettering, lichtreclame. Producten als vaste items. Meerdere offertes per project. Je klant keurt goed via mail of het portaal. Wijzigingen? Versioning doet de rest.',
  },
  {
    id: 'portaal',
    name: 'Klantportaal',
    color: '#6A5A8A',
    image: '/images/modules/klantportaal.jpg',
    headline: 'Niet mailen. Gewoon delen.',
    description: 'Je klant krijgt een link. Geen inlog, geen gedoe. Tekeningen bekijken, offertes goedkeuren, reageren op bestanden. Reageert de klant niet? doen. stuurt automatisch een herinnering.',
    highlights: ['Unieke link, geen inlog nodig', 'Reageren op tekeningen, offertes en facturen', 'Automatische herinneringen met eigen template', 'Meerdere contactpersonen per klant'],
    detail: 'Geen eindeloze mailthreads meer. Alles op één plek, voor jou én je klant. Ze reageren direct op bestanden. Na 3 dagen geen reactie? doen. herinnert ze. Met jouw eigen tekst.',
  },
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    image: '/images/modules/planning.jpg',
    headline: 'Sleep. Drop. Gepland.',
    description: 'Zet een project op "te plannen" of sleep het direct naar een dag. Per monteur, per ploeg. Werkbon zit eraan vast. Weerbericht erbij. Dubbel geboekt? doen. waarschuwt je.',
    highlights: ['Drag-and-drop naar een dag', 'Per monteur of per ploeg', 'Werkbon gekoppeld aan de afspraak', 'Weerbericht en conflict-detectie'],
    detail: 'Je monteur pakt het zelf op of jij plant het in. Elke afspraak toont tijd, locatie, project en werkbon. Buiten-montage bij regen? Je ziet het direct. Zo simpel kan het zijn.',
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#1A535C',
    image: '/images/modules/werkbonnen.jpg',
    headline: 'Wat in de offerte staat, doet de monteur.',
    description: 'Alle offerte-regels 1:1 in de werkbon. Instructiefoto\'s erbij. Je monteur opent het op zijn telefoon, registreert uren, maakt foto\'s. Of print hem uit. Alles komt terug in het project.',
    highlights: ['Offerte-regels 1:1 overgenomen', 'Instructiefoto\'s toevoegen', 'Uren en foto\'s op locatie', 'Telefoon of uitprinten'],
    detail: 'Geen misverstanden meer. Wat jij aanbiedt, is wat je monteur uitvoert. De werkbon is het verlengstuk van de offerte. Op locatie: uren tikken, foto maken, klaar.',
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    image: '/images/modules/facturen.jpg',
    headline: 'Verstuurd. Herinnerd. Gedaan.',
    description: 'Eén klik vanuit de offerte of helemaal zelf opbouwen. Je klant betaalt direct via Mollie. Herinneringen? Die doet doen. automatisch. Jij hoeft er niet meer naar om te kijken.',
    highlights: ['Vanuit offerte of vanaf scratch', 'Mollie betaallink (iDEAL, creditcard)', 'Automatische herinneringen', 'Voorschot- en deelfacturen'],
    detail: 'Factureren zonder nadenken. Offerte goedgekeurd? Factuur staat klaar. Betaallink erbij via Mollie. Niet betaald? doen. herinnert. Op het moment dat jij instelt.',
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    color: '#9A5A48',
    image: '/images/modules/visualizer.jpg',
    headline: 'Laat zien. Niet vertellen.',
    description: 'Upload een schets, AI doet de rest. Autobelettering, gevelreclame, lichtreclame. Claude verbetert je input, Nano Banana visualiseert het. Koppel aan je project, deel via het portaal.',
    highlights: ['Schets uploaden → AI visualiseert', 'Claude Sonnet verbetert je input', 'Koppel aan project of offerte', '10 credits, bijkopen wanneer je wilt'],
    detail: 'Je klant ziet het eindresultaat voordat je begint. Upload een schets of foto. AI brengt het tot leven. Deel het via het portaal. Het beeld doet het verkoopwerk.',
  },
  {
    id: 'ai',
    name: 'AI-assistent',
    color: '#1A535C',
    image: '/images/modules/ai-assistant.jpg',
    headline: 'Daan doet het denkwerk.',
    description: 'Hoeveel staat er open? Wie is je grootste klant? Daan weet het. Selecteer tekst, Daan verbetert het. Mail binnengekomen? Daan vat samen. Vierkante meters uitrekenen? Daan doet het.',
    highlights: ['Kent al je bedrijfsdata', 'Tekst verbeteren en verlengen', 'Mails samenvatten en schrijven', 'Draait op Claude Sonnet 4.6'],
    detail: 'Daan is de collega die nooit vrij neemt. Vraag wat je wilt, wanneer je wilt. Offerteteksten, calculaties, samenvattingen. Hoe meer je vraagt, hoe slimmer Daan wordt.',
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
            <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">8 modules. Eén systeem.</p>
            <h1 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-5">
              Niet erover praten<span className="text-flame">.</span><br />
              <span className="text-petrol/40">Gewoon</span> doen<span className="text-flame">.</span>
            </h1>
            <p className="text-[17px] max-w-lg mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
              Elke module is gebouwd voor hoe jij werkt. Van eerste klantvraag tot oplevering. Klik op een module en ontdek wat erin zit.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Module thumbnail grid */}
      <section className="bg-white pt-4 pb-0">
        <div className="container-site">
          <div
            ref={scrollRef}
            className="flex justify-center gap-3 md:gap-4 flex-wrap pb-8"
          >
            {modules.map((m, i) => (
              <button
                key={m.id}
                onClick={() => selectModule(i)}
                className={`transition-all duration-300 ${
                  activeModule === i ? 'scale-100' : 'scale-[0.97] opacity-50 hover:opacity-75'
                }`}
              >
                <div className="w-[72px] md:w-[88px] rounded-xl overflow-hidden transition-all duration-300"
                  style={activeModule === i ? { boxShadow: `0 0 0 2px ${m.color}, 0 4px 16px ${m.color}15` } : {}}
                >
                  <Image
                    src={m.image}
                    alt={m.name}
                    width={200}
                    height={200}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <p className={`text-[10px] md:text-[11px] mt-1.5 font-semibold transition-colors duration-300 ${
                  activeModule === i ? '' : 'text-[#9B9B95]'
                }`} style={activeModule === i ? { color: m.color } : {}}>
                  {m.name}<span style={{ color: m.color }}>.</span>
                </p>
              </button>
            ))}
          </div>

          {/* Divider */}
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
                    {mod.headline.split('.').filter(Boolean).map((part, i, arr) => (
                      <span key={i}>
                        {part.trim()}
                        {i < arr.length - 1 && <span className="text-flame">.</span>}
                        {i < arr.length - 1 && ' '}
                      </span>
                    ))}
                    <span className="text-flame">.</span>
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
                    Zo doe je het met doen<span className="text-flame">.</span>
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
              Vragen<span className="text-flame">?</span> Gewoon doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-12" style={{ color: '#6B6B66' }}>
              Alles wat je wilt weten voordat je begint.
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
