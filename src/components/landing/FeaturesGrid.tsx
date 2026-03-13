'use client';

import { motion } from 'framer-motion';

/* ── SVG Icon components (Lucide-stijl, 24x24, strokeWidth 1.5) ── */

const icons = {
  // Categorie-iconen
  invoice: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  ),
  clipboard: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  sparkles: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),

  // Feature-iconen — Verkoop & facturatie
  offertes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 15h6" />
      <path d="M9 11h6" />
    </svg>
  ),
  facturen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-5a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  ),
  pdf: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13v-1h6v1" />
      <path d="M11 18.5v-6" />
      <path d="M13 18.5v-6" />
    </svg>
  ),
  betaallinks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),

  // Feature-iconen — Projecten & planning
  werkbonnen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
      <path d="M9 6h6" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
    </svg>
  ),
  planning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  ),
  projecten: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6" />
      <path d="m9 13 3-3 3 3" />
    </svg>
  ),
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),

  // Feature-iconen — Slim & uniek
  visualiser: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  forgie: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  ),
  klantportaal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  opslag: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  ),
};

/* ── 3 categorieën met features ────────────────────────────────── */

const categories = [
  {
    title: 'Verkoop & facturatie',
    subtitle: 'Van offerte tot betaling',
    icon: icons.invoice,
    iconBg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    borderColor: 'border-blush/20',
    gradient: 'from-blush-light/20 via-white to-white',
    accentColor: 'text-blush-vivid',
    features: [
      { name: 'Offertes met marge-inzicht', desc: 'Inkoop, verkoop en marge direct zichtbaar', icon: icons.offertes },
      { name: 'Facturen in één klik', desc: 'Automatisch vanuit de offerte', icon: icons.facturen },
      { name: 'PDF & UBL-export', desc: 'Professioneel met je logo, direct naar je boekhouder', icon: icons.pdf },
      { name: 'Betaallinks', desc: 'Je klant betaalt direct online', icon: icons.betaallinks },
    ],
  },
  {
    title: 'Projecten & planning',
    subtitle: 'Overzicht van kantoor tot bouwplaats',
    icon: icons.clipboard,
    iconBg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    borderColor: 'border-sage/20',
    gradient: 'from-sage-light/20 via-white to-white',
    accentColor: 'text-sage-vivid',
    features: [
      { name: 'Werkbonnen op locatie', desc: "Foto's, uren en materiaal op je telefoon", icon: icons.werkbonnen },
      { name: 'Planning & agenda', desc: 'Wie doet wat, wanneer', icon: icons.planning },
      { name: 'Projecten met overzicht', desc: 'Eén klik en je ziet je marge', icon: icons.projecten },
      { name: 'E-mail in je projecten', desc: 'Automatisch gekoppeld, nooit meer zoeken', icon: icons.email },
    ],
  },
  {
    title: 'Slim & uniek',
    subtitle: 'Wat ons anders maakt',
    icon: icons.sparkles,
    iconBg: 'bg-lavender-light',
    iconColor: 'text-lavender-deep',
    borderColor: 'border-lavender/20',
    gradient: 'from-lavender-light/20 via-white to-white',
    accentColor: 'text-lavender-vivid',
    features: [
      { name: 'Sign Visualiser', desc: 'AI-visualisatie van signing voor je klant', icon: icons.visualiser },
      { name: 'AI-assistent Forgie', desc: 'Teksten schrijven, offertes verbeteren', icon: icons.forgie },
      { name: 'Klantportaal', desc: 'Je klant logt in, keurt goed en stuurt berichten', icon: icons.klantportaal },
      { name: 'Geen opslaglimiet', desc: 'Onbeperkt documenten en bestanden', icon: icons.opslag },
    ],
  },
];

/* ── Animation variants ────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 100 },
  },
};

const featureItem = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', damping: 25, stiffness: 150 },
  },
};

/* ── Component ─────────────────────────────────────────────────── */

export default function FeaturesGrid() {
  return (
    <section className="relative bg-mesh-features noise-overlay" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Alles inbegrepen
          </p>
          <h2 className="font-heading section-heading text-ink mb-5">
            Dit zit er allemaal in.
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[540px] mx-auto">
            Geen losse modules of verborgen kosten. E&eacute;n prijs, alles erin. Vanaf &euro;49 per maand.
          </p>
        </motion.div>

        {/* 3 Category boxes */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1000px] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          {categories.map((cat) => (
            <motion.div
              key={cat.title}
              className={`
                group relative rounded-2xl border ${cat.borderColor}
                bg-gradient-to-br ${cat.gradient}
                p-7 neon-card cursor-default
              `}
              variants={cardVariant}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-11 h-11 rounded-xl ${cat.iconBg} ${cat.iconColor} flex items-center justify-center`}>
                  {cat.icon}
                </div>
                <h3 className="text-[17px] font-bold text-ink leading-tight">{cat.title}</h3>
              </div>
              <p className="text-[13px] text-ink-40 mb-6">{cat.subtitle}</p>

              {/* Feature list — staggered */}
              <motion.ul
                className="space-y-5"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
              >
                {cat.features.map((feature) => (
                  <motion.li key={feature.name} className="flex items-start gap-3" variants={featureItem}>
                    <div className={`${cat.accentColor} opacity-50 flex-shrink-0 mt-0.5`}>
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-ink leading-tight">{feature.name}</p>
                      <p className="text-[13px] text-ink-60 leading-snug mt-0.5">{feature.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
