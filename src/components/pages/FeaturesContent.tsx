'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
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

export default function FeaturesContent({ initialModule = 0, moduleSlug }: { initialModule?: number; moduleSlug?: string }) {
  const [activeModule, setActiveModule] = useState(initialModule)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mod = modules[activeModule]

  function selectModule(index: number) {
    setActiveModule(index)
    if (scrollRef.current) {
      const child = scrollRef.current.children[index] as HTMLElement
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  const heroConfigs: Record<string, { label: string; heading: [string, string]; sub: string; image: string; imageW: number; imageH: number; overlays?: { image: string; alt: string; w: number; h: number; label: string; pos: React.CSSProperties; from: { x: number; y: number } }[] }> = {
    projecten: {
      label: 'Projecten',
      heading: ['Eén cockpit', 'Alles gedaan'],
      sub: 'Klant belt? Project aanmaken. Offerte, werkbon, montage, factuur. Alles vanuit één cockpit.',
      image: '/images/features/hero-projecten-float.png',
      imageW: 2400, imageH: 1350,
      overlays: [
        { image: '/images/features/portaal-overlay.webp', alt: 'Klantportaal', w: 1024, h: 572, label: 'Klantportaal', pos: { left: '-20%', top: '10%', width: '45%' }, from: { x: -40, y: 20 } },
        { image: '/images/features/acties-overlay.webp', alt: 'Project acties', w: 1024, h: 572, label: 'Acties', pos: { right: '-16%', top: '2%', width: '38%' }, from: { x: 40, y: 20 } },
        { image: '/images/features/activiteit-overlay.webp', alt: 'Activiteiten log', w: 1434, h: 1070, label: 'Activiteiten', pos: { right: '-8%', bottom: '8%', width: '35%' }, from: { x: 30, y: 30 } },
      ],
    },
    offertes: {
      label: 'Offertes',
      heading: ['Offerte?', 'Zo gedaan'],
      sub: 'Eigen templates, eigen producten, eigen calculatie. Combineer elementen tot één prijs. Verstuur per mail of laat goedkeuren via het portaal.',
      image: '/images/features/hero-offertes.webp',
      imageW: 1536, imageH: 857,
      overlays: [
        { image: '/images/features/overzicht-offerte.webp', alt: 'Offerte overzicht', w: 1147, h: 1536, label: 'Overzicht', pos: { right: '-14%', top: '5%', width: '35%' }, from: { x: 40, y: 20 } },
        { image: '/images/features/offerte-calculatie.webp', alt: 'Offerte calculatie', w: 1536, h: 1350, label: 'Calculatie', pos: { left: '-16%', top: '15%', width: '40%' }, from: { x: -40, y: 20 } },
      ],
    },
  }

  const heroConfig = moduleSlug ? heroConfigs[moduleSlug] : undefined
  const showHero = !!heroConfig

  return (
    <div className={showHero ? '' : 'pt-28 md:pt-36'}>
      {showHero ? (
        <section>
          {/* Dark hero block — full bleed */}
          <div className="relative overflow-hidden min-h-[90vh] md:min-h-[100vh] flex flex-col" style={{ background: 'linear-gradient(180deg, #0D2B30 0%, #143F46 25%, #1A535C 50%, #143F46 85%, #0D2B30 100%)' }}>

            {/* Animated glow orbs — flame dominant */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '800px', height: '800px', top: '25%', left: '50%', x: '-50%', background: 'radial-gradient(circle, rgba(241,80,37,0.18) 0%, rgba(241,80,37,0.05) 40%, transparent 70%)', filter: 'blur(80px)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '500px', height: '500px', top: '45%', left: '15%', background: 'radial-gradient(circle, rgba(241,80,37,0.12) 0%, transparent 60%)', filter: 'blur(70px)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '500px', height: '500px', top: '40%', right: '10%', background: 'radial-gradient(circle, rgba(241,80,37,0.14) 0%, transparent 60%)', filter: 'blur(70px)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            />
            {/* Subtle warm ambient under the laptop */}
            <div
              className="absolute pointer-events-none"
              style={{ width: '100%', height: '400px', bottom: '5%', left: 0, background: 'radial-gradient(ellipse 50% 80% at 50% 100%, rgba(241,80,37,0.08) 0%, transparent 70%)' }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: i % 4 === 0 ? 3 : 2,
                    height: i % 4 === 0 ? 3 : 2,
                    left: `${(i * 5.3 + 3) % 100}%`,
                    top: `${(i * 7.1 + 10) % 90}%`,
                    backgroundColor: i % 3 === 0 ? '#F15025' : 'rgba(255,255,255,0.2)',
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.2, 0.7, 0.2],
                  }}
                  transition={{
                    duration: 4 + (i % 3) * 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
            />

            {/* Text content */}
            <div className="container-site text-center pt-40 md:pt-48 relative z-10">
              <motion.p
                className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase mb-6"
                style={{ color: '#F15025' }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.label}
              </motion.p>
              <motion.h1
                className="font-heading text-[44px] md:text-[64px] lg:text-[76px] font-extrabold tracking-[-3px] leading-[0.9] mb-7 text-white"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.heading[0]}<span className="text-flame">.</span><br />{' '}{heroConfig!.heading[1]}<span className="text-flame">.</span>
              </motion.h1>
              <motion.p
                className="text-[16px] md:text-[19px] max-w-lg mx-auto leading-relaxed mb-10 md:mb-14"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.sub}
              </motion.p>
            </div>

            {/* Laptop — floating with perspective */}
            <div className="flex-1 flex items-end justify-center relative z-10" style={{ perspective: '1200px' }}>
              <motion.div
                className="relative w-full px-4 md:px-0"
                style={{ maxWidth: '1050px' }}
                initial={{ opacity: 0, y: 80, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 1.2, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Screen glow reflection */}
                <div
                  className="absolute -inset-8 md:-inset-16 rounded-[40px] pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
                />
                <Image
                  src={heroConfig!.image}
                  alt={`doen. ${heroConfig!.label} op MacBook`}
                  width={heroConfig!.imageW}
                  height={heroConfig!.imageH}
                  priority
                  className="w-full h-auto relative"
                  style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.5)) drop-shadow(0 15px 40px rgba(241,80,37,0.15)) drop-shadow(0 0 120px rgba(241,80,37,0.08))' }}
                />

                {/* Dynamic floating overlays */}
                {heroConfig!.overlays?.map((overlay, i) => (
                  <motion.div
                    key={overlay.label}
                    className="absolute hidden md:block"
                    style={overlay.pos}
                    initial={{ opacity: 0, x: overlay.from.x, y: overlay.from.y }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.div
                      animate={{ y: [0, -5 - (i % 2), 0] }}
                      transition={{ duration: 4.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i }}
                    >
                      <div className="relative">
                        <Image
                          src={overlay.image}
                          alt={overlay.alt}
                          width={overlay.w}
                          height={overlay.h}
                          className="w-full h-auto rounded-xl"
                          style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))' }}
                        />
                        <div className="absolute -bottom-3 right-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#F15025' }}>
                          <span className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase text-white">{overlay.label}</span>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Bottom fade into page */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20" style={{ background: 'linear-gradient(to top, #0D2B30 0%, transparent 100%)' }} />

            {/* Spectrum bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] z-30" style={{ background: 'linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%)' }} />
          </div>

          {/* Three pillars section — only for modules with overlays */}
          {heroConfig!.overlays && <div style={{ background: '#0D2B30' }}>
            <div className="container-site py-16 md:py-24">
              <SectionReveal>
                <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-center mb-3" style={{ color: '#F15025' }}>
                  De kern van elk project
                </p>
                <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-white tracking-[-1.5px] text-center mb-14 md:mb-20">
                  Eén project<span className="text-flame">.</span> Drie pijlers<span className="text-flame">.</span>
                </h2>
              </SectionReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                {[
                  {
                    image: '/images/features/acties-overlay.webp',
                    alt: 'Project acties',
                    label: 'Acties',
                    title: 'Alles vanuit het project',
                    description: 'Offerte, werkbon, factuur, montage, email. Eén klik vanuit het project. Alles blijft gekoppeld — niks zoeken, niks vergeten.',
                    width: 1024,
                    height: 572,
                  },
                  {
                    image: '/images/features/portaal-overlay.webp',
                    alt: 'Klantportaal',
                    label: 'Klantportaal',
                    title: 'Je klant doet mee',
                    description: 'Offerte goedkeuren, tekeningen bekijken, vragen stellen. Alles via één link. Geen inlog. Reageert de klant niet? doen. herinnert automatisch.',
                    width: 1024,
                    height: 572,
                  },
                  {
                    image: '/images/features/activiteit-overlay.webp',
                    alt: 'Activiteiten log',
                    label: 'Activiteiten',
                    title: 'Alles wat er gebeurt',
                    description: 'Offerte verstuurd, klant akkoord, werkbon aangemaakt, montage ingepland. Elke stap zichtbaar in één timeline. Niks missen.',
                    width: 1434,
                    height: 1070,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#143F46' }}>
                      <Image
                        src={item.image}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="mt-5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>
                        {item.label}
                      </p>
                      <h3 className="text-[17px] md:text-[19px] font-bold text-white tracking-tight mt-1.5">
                        {item.title}<span className="text-flame">.</span>
                      </h3>
                      <p className="text-[13px] md:text-[14px] leading-[1.7] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>}
        </section>
      ) : (
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
      )}

      {/* Module thumbnail grid */}
      <section className="bg-white pt-4 pb-0">
        <div className="container-site">
          <div
            ref={scrollRef}
            className="flex justify-center gap-3 md:gap-4 flex-wrap pb-8"
          >
            {modules.map((m, i) => (
              <Link
                key={m.id}
                href={`/features/${m.id}`}
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
              </Link>
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
