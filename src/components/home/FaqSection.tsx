'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionReveal from '../SectionReveal'

const categories = [
  { id: 'prijs', label: 'Prijs' },
  { id: 'product', label: 'Product' },
  { id: 'security', label: 'Security & privacy' },
  { id: 'support', label: 'Support & onboarding' },
  { id: 'technisch', label: 'Technisch' },
] as const

type CategoryId = typeof categories[number]['id']

const faqs: { category: CategoryId; q: string; a: string }[] = [
  // ── Prijs ────────────────────────────────────────────────
  {
    category: 'prijs',
    q: 'Kan ik doen. eerst gratis proberen?',
    a: 'De **eerste 30 dagen zijn gratis**. Geen creditcard nodig, geen verplichtingen. Je hebt **direct toegang tot alle modules**.',
  },
  {
    category: 'prijs',
    q: 'Hoeveel kost doen. na de proefperiode?',
    a: '**€79 per maand ex. btw**, tot **10 gebruikers**. Groter team? Neem contact op voor een prijs op maat. **Geen opzetkosten, geen verborgen kosten.**',
  },
  {
    category: 'prijs',
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. **Maandelijks opzegbaar.** Je blijft omdat het werkt, niet omdat je vastzit.',
  },
  {
    category: 'prijs',
    q: 'Zijn er opzetkosten of verborgen kosten?',
    a: 'Nee. **Alles zit in het abonnement**, inclusief toekomstige updates. Geen opzetkosten, geen add-ons, geen premium-tiers.',
  },
  {
    category: 'prijs',
    q: 'Wat als ik meer dan 10 gebruikers heb?',
    a: 'Neem contact op. We maken een **prijs op maat** voor grotere teams. Alles uit het Team-plan blijft gelden, geschikt voor grotere organisaties.',
  },
  {
    category: 'prijs',
    q: 'Kan ik gebruikers wisselen in mijn team?',
    a: 'Ja. Je **voegt gebruikers toe, verwijdert of vervangt** ze binnen je abonnement. Gaat iemand uit dienst? Deactiveer het account en voeg je nieuwe collega toe. Zolang je **binnen de 10 gebruikers** blijft, verandert je prijs niet.',
  },

  // ── Product ──────────────────────────────────────────────
  {
    category: 'product',
    q: 'Zit AI echt overal in?',
    a: 'Ja. **Daan**, onze AI-assistent, draait op **Claude Sonnet 4.6**. Hij kent je bedrijfsdata, schrijft teksten, vat mails samen en helpt met calculaties. **Geen extra kosten.**',
  },
  {
    category: 'product',
    q: 'Wat is het verschil tussen Planning en Taken?',
    a: '**Planning is voor de montage.** Sleep een project naar een dag, de werkbon hangt eraan. **Taken is voor al het werk eromheen**: offertes opvolgen, inkoop regelen bij de leverancier, drukproeven binnenhalen, bestanden opvragen bij de klant.',
  },
  {
    category: 'product',
    q: 'Hoe werkt het klantportaal?',
    a: 'Je klant ontvangt een **unieke link per mail**. **Geen inlog nodig**, geen wachtwoord. Ze bekijken tekeningen, keuren offertes goed, tekenen opdrachtbevestigingen en betalen facturen. Jij stelt zelf in wanneer herinneringen uitgaan.',
  },
  {
    category: 'product',
    q: 'Wat is de Visualizer en hoe zitten de credits in elkaar?',
    a: 'Upload een schets of foto en de Visualizer genereert een realistische visualisatie van het eindresultaat: autobelettering, gevelreclame, lichtreclame, belettering. De Visualizer draait op **Nano Banana 2**, Google\'s image-generation model. Je begint met **10 credits inbegrepen** in je abonnement. Daarna **koop je extra credits bij via een credit-pack** wanneer je meer nodig hebt.',
  },
  {
    category: 'product',
    q: 'Kan ik rollen en rechten per gebruiker instellen?',
    a: 'Ja. Je bepaalt **per gebruiker wat hij of zij kan zien en doen**: admin, werkvoorbereider of monteur. Zo ziet je monteur wel zijn werkbonnen en planning, maar **niet je marges** en financiële overzichten.',
  },
  {
    category: 'product',
    q: 'Werkt doen. op mijn telefoon?',
    a: 'Ja. **Mobiel-geoptimaliseerd** voor planning en werkbonnen. Je monteur opent de werkbon op zijn telefoon, registreert **direct uren en foto\'s**, en laat de klant **digitaal tekenen**.',
  },

  // ── Security & privacy ───────────────────────────────────
  {
    category: 'security',
    q: 'Waar staat mijn data?',
    a: 'Jouw data wordt gehost in de **EU op Supabase (AWS Frankfurt)**. **Geen data verlaat Europa.**',
  },
  {
    category: 'security',
    q: 'Is doen. AVG-compliant?',
    a: 'Ja. doen. is gebouwd volgens de **Europese AVG-richtlijnen**. Jouw klantdata blijft van jou en wordt **nooit gedeeld met derden** voor andere doeleinden dan het leveren van de dienst. We tekenen een **verwerkersovereenkomst op aanvraag**.',
  },
  {
    category: 'security',
    q: 'Hoe zit het met backups?',
    a: '**Dagelijkse automatische backups** met point-in-time recovery. Als er iets misgaat in je data, kunnen we **terug naar een eerder moment**. Je hoeft zelf niets te regelen.',
  },
  {
    category: 'security',
    q: 'Is twee-factor-authenticatie (2FA) mogelijk?',
    a: 'Ja. Je activeert 2FA via je account-instellingen. We raden het **sterk aan voor alle admin-gebruikers**.',
  },
  {
    category: 'security',
    q: 'Wat gebeurt er met mijn data als ik opzeg?',
    a: 'Tijdens je opzegperiode **exporteer je al je data** (CSV, PDF) wanneer je wilt. Na afloop bewaren we je data nog **30 dagen** voor het geval je terug wilt. Daarna wordt alles **definitief verwijderd**.',
  },

  // ── Support & onboarding ─────────────────────────────────
  {
    category: 'support',
    q: 'Welke support krijg ik en in welke taal?',
    a: '**Nederlandse support** via email en chat op **werkdagen**. Reactietijd meestal **binnen een paar uur**. Voor complexe vragen plannen we een scherm-deling-sessie.',
  },
  {
    category: 'support',
    q: 'Hoe lang duurt de implementatie?',
    a: 'De meeste bedrijven zijn **binnen een week live**. Wij helpen met de basisinrichting: producten, templates, team, eerste klanten. Zodat je meteen productief bent.',
  },
  {
    category: 'support',
    q: 'Kan ik overstappen vanuit mijn huidige systeem?',
    a: 'Ja. We hebben **migratiepaden voor de gangbare pakketten** in de signbranche. Stuur ons een export van je klanten en producten, dan zorgen wij dat alles netjes in doen. staat. Neem contact op via **hello@doen.team** en we bespreken de overstap.',
  },
  {
    category: 'support',
    q: 'Krijg ik uitleg of training?',
    a: 'Ja. Elke nieuwe klant krijgt een **live onboarding-sessie van ~1 uur** waarin we het systeem doorlopen en jouw inrichting samen opzetten. Daarna blijft onze kennisbank en support beschikbaar.',
  },
  {
    category: 'support',
    q: 'Kan ik een nieuwe feature aanvragen?',
    a: 'Ja. doen. wordt **gebouwd samen met onze klanten**. Stuur je idee naar **hello@doen.team**. Grote features nemen we op in de **publieke roadmap** zodat je kan zien wat eraan komt.',
  },

  // ── Technisch ────────────────────────────────────────────
  {
    category: 'technisch',
    q: 'Kan ik doen. koppelen aan mijn boekhouding?',
    a: 'Ja. Factuurgegevens **gaan rechtstreeks van doen. naar Exact Online** (one-way), zodat je boekhouder niks dubbel hoeft in te voeren. Voor online betalingen is **Mollie (iDEAL, creditcard)** geïntegreerd. Betaalstatus zet je zelf op **betaald** zodra het geld binnen is. **Inkoopfacturen** ontvang je op een **aparte mailbox** en keurt je team goed in doen.',
  },
  {
    category: 'technisch',
    q: 'Hoe werkt de email-koppeling?',
    a: 'Iedere gebruiker koppelt zijn **eigen zakelijke mailbox via IMAP/SMTP**. Je **privé-inbox blijft privé**. Alleen mails die bij een klant of project horen worden in de projectcontext zichtbaar voor je team.',
  },
  {
    category: 'technisch',
    q: 'Kan ik mijn data exporteren?',
    a: '**Altijd.** CSV, PDF, wat je nodig hebt. **Jouw data is van jou.** Geen lock-in, geen barrières.',
  },
  {
    category: 'technisch',
    q: 'Op welke apparaten werkt doen.?',
    a: 'doen. draait **in de browser**. Werkt op **desktop, laptop, tablet en telefoon**. Geen installatie, geen updates, geen gedoe met versies. **Chrome, Safari, Firefox, Edge.**',
  },
  {
    category: 'technisch',
    q: 'Is er een API beschikbaar?',
    a: 'We werken aan een **publieke API** voor integraties met je eigen systemen. Heb je specifieke koppelingswensen? Laat het weten via **hello@doen.team**, dan kijken we of het past in de roadmap.',
  },
]

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'

// Render **bold** markers as <strong> for scan-ability
function renderAnswer(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: PETROL, fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function FaqSection() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('prijs')
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const filtered = faqs.filter((f) => f.category === activeCategory)

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container-site">
        <SectionReveal>
          <div className="text-center mb-10 md:mb-12">
            <p
              className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4"
              style={{ color: FLAME }}
            >
              Veelgestelde vragen
            </p>
            <h2
              className="font-heading text-[32px] md:text-[44px] font-extrabold tracking-[-1.5px] leading-[1.05]"
              style={{ color: PETROL }}
            >
              Vragen<span style={{ color: FLAME }}>?</span> Stel ze
              <span style={{ color: FLAME }}>.</span>
            </h2>
            <p className="text-[15px] md:text-[17px] mt-3 leading-relaxed" style={{ color: MUTED }}>
              Of lees de antwoorden alvast.
            </p>
          </div>
        </SectionReveal>

        {/* Category tabs */}
        <SectionReveal delay={0.08}>
          <div className="flex justify-center gap-2 md:gap-2.5 mb-10 md:mb-14 flex-wrap max-w-3xl mx-auto">
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
                  className="inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-full font-mono text-[10px] md:text-[11px] font-bold tracking-[0.12em] uppercase transition-colors duration-300"
                  style={{
                    backgroundColor: isActive ? PETROL : 'transparent',
                    color: isActive ? '#FFFFFF' : PETROL,
                    border: isActive
                      ? `1.5px solid ${PETROL}`
                      : '1.5px solid rgba(26,83,92,0.18)',
                  }}
                >
                  {cat.label}
                  <span
                    className="text-[10px] font-sans font-medium tabular-nums"
                    style={{
                      color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(26,83,92,0.4)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </SectionReveal>

        {/* FAQ list */}
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {filtered.map((faq, i) => {
                const faqKey = `${activeCategory}-${i}`
                const isOpen = openFaq === faqKey
                return (
                  <div key={faqKey} style={{ borderBottom: '1px solid #EBEBEB' }}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faqKey)}
                      className="w-full flex items-center justify-between py-5 text-left"
                    >
                      <span
                        className="text-[15px] md:text-[16px] font-semibold pr-4"
                        style={{ color: PETROL }}
                      >
                        {faq.q}
                      </span>
                      <motion.span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: isOpen ? FLAME : '#F8F7F5' }}
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M6 2V10M2 6H10"
                            stroke={isOpen ? 'white' : '#9B9B95'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p
                            className="text-[14px] md:text-[15px] leading-[1.7] pb-5"
                            style={{ color: MUTED }}
                          >
                            {renderAnswer(faq.a)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* Bottom CTA */}
          <SectionReveal delay={0.15}>
            <p className="text-center text-[13px] md:text-[14px] mt-10 md:mt-12" style={{ color: '#9B9B95' }}>
              Staat jouw vraag er niet bij?{' '}
              <a
                href="/contact"
                className="font-semibold transition-colors hover:opacity-70"
                style={{ color: PETROL }}
              >
                Stel hem direct
                <span style={{ color: FLAME }}>.</span>
              </a>
            </p>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}
