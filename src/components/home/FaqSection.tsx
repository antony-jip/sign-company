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
    a: 'Natuurlijk. De **eerste 30 dagen zijn gratis**, geen creditcard nodig, geen verplichtingen. Je hebt **direct toegang tot alle modules** — niks uitgegrijsd of achter een muur.',
  },
  {
    category: 'prijs',
    q: 'Hoeveel kost doen. na de proefperiode?',
    a: '**€79 per maand ex. btw**, tot **10 gebruikers**. Dat is alles. Geen opzetkosten, geen add-ons, geen aparte prijs per gebruiker die later omhoog duikt. Heb je een groter team? Stuur ons een bericht — dan maken we een prijs op maat.',
  },
  {
    category: 'prijs',
    q: 'Moet ik een contract tekenen?',
    a: 'Nee. **Maandelijks opzegbaar.** Je blijft omdat het werkt, niet omdat je vastzit aan een jaarcontract. Eerlijk gedeal.',
  },
  {
    category: 'prijs',
    q: 'Zijn er opzetkosten of verborgen kosten?',
    a: 'Nee. **Alles zit in het abonnement**, inclusief toekomstige updates. Geen opzetkosten, geen premium-tiers, geen "pakket uitbreiden om feature X te gebruiken". Wat je ziet is wat je krijgt.',
  },
  {
    category: 'prijs',
    q: 'Wat als ik meer dan 10 gebruikers heb?',
    a: 'Stuur ons een mail, dan maken we een **prijs op maat**. Alles uit het abonnement blijft hetzelfde, we passen alleen de schaal aan. Geen ingewikkelde gesprekken.',
  },
  {
    category: 'prijs',
    q: 'Kan ik gebruikers wisselen in mijn team?',
    a: 'Ja, wanneer je wilt. **Voeg iemand toe, verwijder of vervang ze** — allemaal binnen je abonnement. Monteur uit dienst? Deactiveer het account en voeg de nieuwe collega toe. Zolang je **binnen de 10 gebruikers** blijft, verandert je prijs niet.',
  },

  // ── Product ──────────────────────────────────────────────
  {
    category: 'product',
    q: 'Zit AI echt overal in?',
    a: 'Ja, overal waar het helpt. **Daan** is onze AI-assistent (draait op **Claude Sonnet 4.6**). Hij kent je bedrijfsdata, schrijft offerteteksten, vat binnengekomen mails samen, rekent vierkante meters uit. **Geen extra kosten** — gewoon onderdeel van het abonnement.',
  },
  {
    category: 'product',
    q: 'Wat is het verschil tussen Planning en Taken?',
    a: '**Planning is voor de montage.** Sleep een project naar een dag in de kalender, de werkbon hangt er automatisch aan. **Taken is voor al het werk eromheen**: offertes opvolgen, inkoop regelen, drukproeven binnenhalen, bestanden opvragen bij de klant. Twee aparte modules, want het is twee aparte soorten werk.',
  },
  {
    category: 'product',
    q: 'Hoe werkt het klantportaal?',
    a: 'Je klant krijgt een **unieke link per mail** en ziet direct alles: tekeningen, offertes, opdrachtbevestigingen, facturen, foto\'s van de montage. **Geen inlog, geen wachtwoord**, geen "welk app moet ik downloaden". Hij keurt goed of tekent met één klik. Jij krijgt een notificatie.',
  },
  {
    category: 'product',
    q: 'Wat is de Visualizer en hoe zitten de credits in elkaar?',
    a: 'Upload een schets of foto van de locatie, en de Visualizer maakt er een realistische visualisatie van — autobelettering, gevelreclame, lichtreclame, belettering. Draait op **Nano Banana 2** (Google\'s image-model). Je begint met **10 credits inbegrepen**. Daarna **koop je extra credits via een credit-pack** wanneer je ze nodig hebt.',
  },
  {
    category: 'product',
    q: 'Kan ik rollen en rechten per gebruiker instellen?',
    a: 'Ja. Je bepaalt **per gebruiker wat hij of zij kan zien en doen**: admin, werkvoorbereider, monteur. Je monteur ziet wel zijn werkbonnen en planning, maar **niet je marges of financiële overzichten**. Fijn voor iedereen.',
  },
  {
    category: 'product',
    q: 'Werkt doen. op mijn telefoon?',
    a: 'Ja. Planning en werkbonnen zijn **specifiek voor mobiel ontworpen** — niet zomaar een desktop-site op klein scherm gepropt. Je monteur opent de werkbon op zijn telefoon, registreert **uren en foto\'s direct**, laat de klant **digitaal tekenen**. Klaar.',
  },

  // ── Security & privacy ───────────────────────────────────
  {
    category: 'security',
    q: 'Waar staat mijn data?',
    a: 'In de **EU**, op Supabase (AWS Frankfurt). **Geen data verlaat Europa.** We slapen allemaal rustiger zo.',
  },
  {
    category: 'security',
    q: 'Is doen. AVG-compliant?',
    a: 'Ja. Gebouwd volgens de **Europese AVG-richtlijnen**. Jouw klantdata blijft van jou en wordt **nooit gedeeld met derden** voor iets anders dan het leveren van de dienst. Heb je een verwerkersovereenkomst nodig voor je klanten? We tekenen er eentje **op aanvraag**.',
  },
  {
    category: 'security',
    q: 'Hoe zit het met backups?',
    a: '**Dagelijkse automatische backups** met point-in-time recovery. Als er iets misgaat in je data, kunnen we **terug naar een eerder moment**. Jij hoeft hier niks voor te regelen — gewoon ingebakken.',
  },
  {
    category: 'security',
    q: 'Is twee-factor-authenticatie (2FA) mogelijk?',
    a: 'Ja. Je activeert 2FA in je account-instellingen. We raden het **sterk aan voor alle admin-gebruikers** — één extra stap bij inloggen, een stuk rustiger slapen.',
  },
  {
    category: 'security',
    q: 'Wat gebeurt er met mijn data als ik opzeg?',
    a: 'Tijdens je opzegperiode **exporteer je al je data** (CSV, PDF) wanneer je wilt. Na afloop bewaren we je data nog **30 dagen** — voor het geval je terug wilt. Daarna wordt alles **definitief verwijderd**. Geen hostage-taking.',
  },

  // ── Support & onboarding ─────────────────────────────────
  {
    category: 'support',
    q: 'Welke support krijg ik en in welke taal?',
    a: '**Nederlandse support** van echte mensen via email en chat, op werkdagen. Reactietijd meestal **binnen een paar uur**. Vastgelopen op iets ingewikkelds? Dan plannen we een **scherm-deling-sessie** zodat we het samen oplossen.',
  },
  {
    category: 'support',
    q: 'Hoe lang duurt de implementatie?',
    a: 'De meeste bedrijven zijn **binnen een week live**. Wij helpen met de basisinrichting: producten, templates, team, eerste klanten importeren. Zodat je niet twee weken rommelt voordat je productief bent.',
  },
  {
    category: 'support',
    q: 'Kan ik overstappen vanuit mijn huidige systeem?',
    a: 'Ja. We hebben **migratiepaden voor de gangbare pakketten** die maakbedrijven gebruiken. Stuur ons een export van je klanten en producten, dan zetten wij het netjes in doen. Geen handmatig overtypen — dat is 2026-waardig werk. Laat het weten via **hello@doen.team**.',
  },
  {
    category: 'support',
    q: 'Krijg ik uitleg of training?',
    a: 'Zeker. Elke nieuwe klant krijgt een **live onboarding-sessie van ~1 uur** waarin we het systeem doorlopen en jouw inrichting samen opzetten. Daarna blijven onze kennisbank en support gewoon beschikbaar — je staat er nooit alleen voor.',
  },
  {
    category: 'support',
    q: 'Kan ik een nieuwe feature aanvragen?',
    a: 'Graag zelfs. doen. wordt **gebouwd samen met onze klanten** — hun ideeën zijn al in het product terechtgekomen. Stuur je idee naar **hello@doen.team**. Wordt het een grote feature? Dan nemen we \'m op in de **publieke roadmap** zodat je kunt meekijken.',
  },

  // ── Technisch ────────────────────────────────────────────
  {
    category: 'technisch',
    q: 'Kan ik doen. koppelen aan mijn boekhouding?',
    a: 'Ja. Factuurgegevens **gaan rechtstreeks van doen. naar Exact Online** (one-way), zodat je boekhouder niks dubbel hoeft in te voeren. Voor online betalingen is **Mollie (iDEAL, creditcard)** geïntegreerd. De betaalstatus zet je zelf op **betaald** zodra het geld binnen is. **Inkoopfacturen** ontvang je op een **aparte mailbox** en worden door je team goedgekeurd in doen.',
  },
  {
    category: 'technisch',
    q: 'Hoe werkt de email-koppeling?',
    a: 'Iedere gebruiker koppelt zijn **eigen zakelijke mailbox via IMAP/SMTP**. Je **privé-inbox blijft privé** — niemand ziet je persoonlijke mail. Alleen mails die bij een klant of project horen worden in de projectcontext zichtbaar voor je team. Persoonlijk waar het moet, gedeeld waar het helpt.',
  },
  {
    category: 'technisch',
    q: 'Kan ik mijn data exporteren?',
    a: '**Altijd.** CSV, PDF, wat je nodig hebt, wanneer je wilt. **Jouw data is van jou.** Geen lock-in, geen barrières, geen "dit zit niet in je pakket".',
  },
  {
    category: 'technisch',
    q: 'Op welke apparaten werkt doen.?',
    a: 'doen. draait **in de browser** — geen app-store gedoe. Werkt op **desktop, laptop, tablet en telefoon**. Geen installatie, geen updates, geen "welke versie heb jij?". Chrome, Safari, Firefox, Edge — allemaal prima.',
  },
  {
    category: 'technisch',
    q: 'Is er een API beschikbaar?',
    a: 'We werken aan een **publieke API** voor integraties met je eigen systemen. Heb je een specifieke koppelingswens? Laat het weten via **hello@doen.team** — dan kijken we of het in de roadmap past, of direct als maatwerk kan.',
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
