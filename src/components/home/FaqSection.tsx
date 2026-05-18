'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import SerifItalic from '@/components/SerifItalic'
import { TrimCorners } from '@/components/brand/BrandMarks'

const categories = [
  { id: 'prijs', label: 'Prijs' },
  { id: 'product', label: 'Product' },
  { id: 'security', label: 'Security' },
  { id: 'support', label: 'Support' },
  { id: 'technisch', label: 'Technisch' },
] as const

type CategoryId = typeof categories[number]['id']

const faqs: { category: CategoryId; q: string; a: string }[] = [
  {
    category: 'prijs',
    q: 'Kan ik doen. eerst gratis proberen?',
    a: 'Natuurlijk. De **eerste 30 dagen zijn gratis**, geen creditcard nodig, geen verplichtingen. Je hebt **direct toegang tot alle modules** — niks uitgegrijsd of achter een muur.',
  },
  {
    category: 'prijs',
    q: 'Hoeveel kost doen. na de proefperiode?',
    a: '**€79 per maand ex. btw**, tot **10 gebruikers**. Dat is alles. Geen opzetkosten, geen add-ons, geen aparte prijs per gebruiker die later omhoog duikt. Heb je een groter team? Stuur ons een bericht.',
  },
  {
    category: 'prijs',
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. **Maandelijks opzegbaar.** Je blijft omdat het werkt, niet omdat je vastzit aan een jaarcontract.',
  },
  {
    category: 'prijs',
    q: 'Zijn er opzetkosten of verborgen kosten?',
    a: 'Nee. **Alles zit in het abonnement**, inclusief toekomstige updates. Geen opzetkosten, geen premium-tiers, geen "pakket uitbreiden om feature X te gebruiken".',
  },
  {
    category: 'prijs',
    q: 'Wat als ik meer dan 10 gebruikers heb?',
    a: 'Stuur ons een mail, dan maken we een **prijs op maat**. Alles uit het abonnement blijft hetzelfde, we passen alleen de schaal aan.',
  },

  {
    category: 'product',
    q: 'Zit AI echt overal in?',
    a: 'Ja, overal waar het helpt. **Daan** is onze AI-assistent (draait op het nieuwste **Claude**-model van Anthropic). Hij kent je bedrijfsdata, schrijft offerteteksten, vat binnengekomen mails samen, leest inkoopfacturen uit. **Geen extra kosten** — onderdeel van het abonnement.',
  },
  {
    category: 'product',
    q: 'Hoe werkt de inkoopfactuur-AI?',
    a: 'Leverancier mailt een PDF naar je inkoop-inbox. **doen. haalt de mail elk kwartier op**, leest de factuur uit (leverancier, factuurnummer, datum, regels, btw) en zet hem klaar ter goedkeuring. Je controleert, keurt goed, klaar. **Boekhouding gaat one-way door naar Exact Online**.',
  },
  {
    category: 'product',
    q: 'Wat is Sales Inbox / "Opvolgen"?',
    a: 'Een aparte view bovenop je mailbox. **Mails waarop nog geen antwoord kwam** krijgen automatisch de Opvolgen-vlag. Komt het antwoord binnen, vlag eraf. Zo zie je in één oogopslag wie er nog wacht op jou. Geen losse spreadsheet meer.',
  },
  {
    category: 'product',
    q: 'Kan mijn monteur alles vanaf zijn telefoon?',
    a: 'Ja. **Planning, werkbonnen, taken en email** hebben dedicated mobiele weergaven. Werkbon openen, uren tikken, foto\'s erbij, klant laten tekenen — allemaal op een telefoon. Geen aparte app om te installeren.',
  },
  {
    category: 'product',
    q: 'Wat is het verschil tussen Planning en Taken?',
    a: '**Planning is voor de montage.** Sleep een project naar een dag in de kalender, de werkbon hangt er automatisch aan. **Taken is voor al het werk eromheen**: offertes opvolgen, inkoop regelen, drukproeven binnenhalen.',
  },
  {
    category: 'product',
    q: 'Hoe werkt het klantportaal?',
    a: 'Je klant krijgt een **unieke link per mail** en ziet direct alles: tekeningen, offertes, opdrachtbevestigingen, facturen. **Geen inlog, geen wachtwoord**. Hij keurt goed of tekent met één klik. Jij krijgt een notificatie.',
  },
  {
    category: 'product',
    q: 'Werkt doen. op mijn telefoon?',
    a: 'Ja. Planning en werkbonnen zijn **specifiek voor mobiel ontworpen**. Je monteur opent de werkbon op zijn telefoon, registreert **uren en foto\'s direct**, laat de klant **digitaal tekenen**.',
  },

  {
    category: 'security',
    q: 'Waar staat mijn data?',
    a: 'In de **EU**, op Supabase (AWS Frankfurt). **Geen data verlaat Europa.**',
  },
  {
    category: 'security',
    q: 'Is doen. AVG-compliant?',
    a: 'Ja. Gebouwd volgens de **Europese AVG-richtlijnen**. Jouw klantdata blijft van jou en wordt **nooit gedeeld met derden**. Verwerkersovereenkomst op aanvraag.',
  },
  {
    category: 'security',
    q: 'Hoe zit het met backups?',
    a: '**Dagelijkse automatische backups** met point-in-time recovery. Als er iets misgaat, kunnen we **terug naar een eerder moment**.',
  },
  {
    category: 'security',
    q: 'Wat gebeurt er met mijn data als ik opzeg?',
    a: 'Tijdens je opzegperiode **exporteer je al je data** (CSV, PDF) wanneer je wilt. Na afloop bewaren we je data nog **30 dagen** — voor het geval je terug wilt. Daarna wordt alles **definitief verwijderd**.',
  },

  {
    category: 'support',
    q: 'Welke support krijg ik en in welke taal?',
    a: '**Nederlandse support** van echte mensen via email en chat, op werkdagen. Reactietijd meestal **binnen een paar uur**. Vastgelopen op iets ingewikkelds? Dan plannen we een **scherm-deling-sessie**.',
  },
  {
    category: 'support',
    q: 'Hoe lang duurt de implementatie?',
    a: 'De meeste bedrijven zijn **binnen een week live**. Wij helpen met de basisinrichting: producten, templates, team, eerste klanten importeren.',
  },
  {
    category: 'support',
    q: 'Kan ik overstappen vanuit mijn huidige systeem?',
    a: 'Ja. We hebben **migratiepaden voor de gangbare pakketten**. Stuur ons een export van je klanten en producten, dan zetten wij het netjes in doen. Laat het weten via **info@signcompany.nl**.',
  },
  {
    category: 'support',
    q: 'Krijg ik uitleg of training?',
    a: 'Zeker. Elke nieuwe klant krijgt een **live onboarding-sessie van ~1 uur** waarin we het systeem doorlopen.',
  },

  {
    category: 'technisch',
    q: 'Kan ik doen. koppelen aan mijn boekhouding?',
    a: 'Ja. Factuurgegevens **gaan rechtstreeks van doen. naar Exact Online** (one-way). Voor online betalingen is **Mollie** geïntegreerd.',
  },
  {
    category: 'technisch',
    q: 'Hoe werkt de email-koppeling?',
    a: 'Iedere gebruiker koppelt zijn **eigen zakelijke mailbox via IMAP/SMTP**. Je **privé-inbox blijft privé**. Alleen mails die bij een klant of project horen worden in de projectcontext zichtbaar.',
  },
  {
    category: 'technisch',
    q: 'Kan ik mijn data exporteren?',
    a: '**Altijd.** CSV, PDF, wat je nodig hebt, wanneer je wilt. **Jouw data is van jou.**',
  },
  {
    category: 'technisch',
    q: 'Op welke apparaten werkt doen.?',
    a: 'doen. draait **in de browser**. Werkt op **desktop, laptop, tablet en telefoon**. Geen installatie, geen updates. Chrome, Safari, Firefox, Edge — allemaal prima.',
  },
]

function renderAnswer(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#1A535C', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function FaqSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [activeCategory, setActiveCategory] = useState<CategoryId>('prijs')
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const filtered = faqs.filter((f) => f.category === activeCategory)

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ backgroundColor: '#F3F2ED' }}
    >
      <TrimCorners inset={28} size={16} color="rgba(26,83,92,0.28)" />
      {/* Soft blurred ambient blobs */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E8E1D0', opacity: 0.6, filter: 'blur(80px)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-20 w-[440px] h-[440px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#E4DBC6', opacity: 0.5, filter: 'blur(90px)' }}
      />
      {/* Flame accent */}
      <div
        aria-hidden
        className="absolute top-[35%] right-[20%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ backgroundColor: '#F15025', opacity: 0.05, filter: 'blur(100px)' }}
      />

      {/* Subtle dots */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='0.7' fill='%231A1A1A' opacity='0.08'/></svg>")`,
          backgroundSize: '22px 22px',
        }}
      />

      <div className="container-site relative py-24 md:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-7">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: '#F15025', opacity: 0.45 }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F15025' }} />
            </span>
            <span
              className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase"
              style={{ color: '#6B6B66' }}
            >
              Veelgestelde vragen
            </span>
          </div>

          <h2
            className="font-heading font-bold tracking-[-1.5px] md:tracking-[-2.5px] leading-[0.95]"
            style={{ fontSize: 'clamp(36px, 5vw, 68px)', color: '#1A535C' }}
          >
            <span className="block">Vragen<span style={{ color: '#F15025' }}>?</span></span>
            <span className="block" style={{ color: '#6B6B66' }}>
              <SerifItalic style={{ letterSpacing: '-2px' }}>Stel</SerifItalic> ze
              <span style={{ color: '#F15025' }}>.</span>
            </span>
          </h2>

          <p className="text-[16px] md:text-[18px] leading-[1.55] max-w-lg mt-6" style={{ color: '#3F3F3A' }}>
            Of lees alvast wat anderen vroegen.
          </p>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-2 mb-10 md:mb-12"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            const count = faqs.filter((f) => f.category === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  setOpenFaq(null)
                }}
                className="inline-flex items-center gap-2 px-4 h-[40px] rounded-full font-mono text-[11px] font-bold tracking-[0.15em] uppercase transition-all duration-200"
                style={{
                  backgroundColor: isActive ? '#1A535C' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#1A535C',
                  border: isActive
                    ? '1px solid #1A535C'
                    : '1px solid rgba(26,83,92,0.18)',
                }}
              >
                {cat.label}
                <span
                  className="text-[10px] tabular-nums"
                  style={{
                    color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(26,83,92,0.45)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </motion.div>

        {/* FAQ list */}
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              {filtered.map((faq, i) => {
                const faqKey = `${activeCategory}-${i}`
                const isOpen = openFaq === faqKey
                return (
                  <motion.div
                    key={faqKey}
                    className="rounded-[10px] overflow-hidden bg-white transition-all duration-300"
                    style={{
                      border: '1px solid rgba(26,83,92,0.08)',
                      boxShadow: isOpen
                        ? '0 12px 28px -10px rgba(20,40,40,0.16)'
                        : '0 1px 2px rgba(20,40,40,0.04)',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faqKey)}
                      aria-expanded={isOpen}
                      aria-controls={`${faqKey}-content`}
                      className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A535C] rounded-[10px]"
                    >
                      <span
                        className="text-[15px] md:text-[16px] font-semibold pr-4 transition-colors group-hover:text-[#F15025]"
                        style={{ color: '#1A535C' }}
                      >
                        {faq.q}
                      </span>
                      <motion.span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        animate={{
                          backgroundColor: isOpen ? '#F15025' : '#F3F2ED',
                          rotate: isOpen ? 45 : 0,
                        }}
                        transition={{ duration: 0.25 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M6 2V10M2 6H10"
                            stroke={isOpen ? 'white' : '#1A535C'}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          id={`${faqKey}-content`}
                          role="region"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p
                            className="text-[14px] md:text-[15px] leading-[1.65] px-5 md:px-6 pb-5"
                            style={{ color: '#3F3F3A' }}
                          >
                            {renderAnswer(faq.a)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* Bottom CTA */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-center text-[14px] md:text-[15px] mt-12"
            style={{ color: '#6B6B66' }}
          >
            Staat jouw vraag er niet bij?{' '}
            <a
              href="/contact"
              className="font-semibold transition-opacity hover:opacity-70 group inline-flex items-center gap-1"
              style={{ color: '#1A535C' }}
            >
              <span className="relative">
                Stel hem direct
                <span
                  className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-100 transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: '#1A535C' }}
                />
              </span>
              <span style={{ color: '#F15025' }}>.</span>
            </a>
          </motion.p>
        </div>
      </div>
    </section>
  )
}
