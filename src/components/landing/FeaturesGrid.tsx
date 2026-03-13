'use client';

import { useInView } from '@/hooks/useInView';

/* ── 3 categorieën met features ────────────────────────────────── */

const categories = [
  {
    title: 'Verkoop & facturatie',
    subtitle: 'Van offerte tot betaling',
    color: 'blush',
    iconBg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    borderColor: 'border-blush/20',
    gradient: 'from-blush-light/20 via-white to-white',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 17.5v-11" />
      </svg>
    ),
    features: [
      { name: 'Offertes met marge-inzicht', desc: 'Inkoop, verkoop en marge direct zichtbaar' },
      { name: 'Facturen in één klik', desc: 'Automatisch vanuit de offerte' },
      { name: 'PDF & UBL-export', desc: 'Professioneel met je logo, direct naar je boekhouder' },
      { name: 'Betaallinks', desc: 'Je klant betaalt direct online' },
    ],
  },
  {
    title: 'Projecten & planning',
    subtitle: 'Overzicht van kantoor tot bouwplaats',
    color: 'sage',
    iconBg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    borderColor: 'border-sage/20',
    gradient: 'from-sage-light/20 via-white to-white',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    features: [
      { name: 'Werkbonnen op locatie', desc: "Foto's, uren en materiaal op je telefoon" },
      { name: 'Planning & agenda', desc: 'Wie doet wat, wanneer' },
      { name: 'Projecten met overzicht', desc: 'Eén klik en je ziet je marge' },
      { name: 'E-mail in je projecten', desc: 'Automatisch gekoppeld, nooit meer zoeken' },
    ],
  },
  {
    title: 'Slim & uniek',
    subtitle: 'Wat ons anders maakt',
    color: 'lavender',
    iconBg: 'bg-lavender-light',
    iconColor: 'text-lavender-deep',
    borderColor: 'border-lavender/20',
    gradient: 'from-lavender-light/20 via-white to-white',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    ),
    features: [
      { name: 'Sign Visualiser', desc: 'AI-visualisatie van signing voor je klant' },
      { name: 'AI-assistent Forgie', desc: 'Teksten schrijven, offertes verbeteren' },
      { name: 'Klantportaal', desc: 'Je klant logt in, keurt goed en stuurt berichten' },
      { name: 'Geen opslaglimiet', desc: 'Onbeperkt documenten en bestanden' },
    ],
  },
];

/* ── Component ─────────────────────────────────────────────────── */

export default function FeaturesGrid() {
  const { ref: headerRef, isInView: headerVisible } = useInView();
  const { ref: gridRef, isInView: gridVisible } = useInView();

  return (
    <section className="relative bg-mesh-features noise-overlay" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className="text-center mb-16"
          style={{
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
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
        </div>

        {/* 3 Category boxes */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1000px] mx-auto"
        >
          {categories.map((cat, i) => (
            <div
              key={cat.title}
              className={`
                group relative rounded-2xl border ${cat.borderColor}
                bg-gradient-to-br ${cat.gradient}
                p-7 neon-card cursor-default
              `}
              style={{
                opacity: gridVisible ? 1 : 0,
                transform: gridVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.12 * i}s`,
              }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${cat.iconBg} ${cat.iconColor} flex items-center justify-center`}>
                  {cat.icon}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ink leading-tight">{cat.title}</h3>
                </div>
              </div>
              <p className="text-[13px] text-ink-40 mb-6">{cat.subtitle}</p>

              {/* Feature list */}
              <ul className="space-y-4">
                {cat.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-3">
                    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cat.iconColor} opacity-60`} viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.28 10.22l-2-2a.75.75 0 0 1 1.06-1.06L7.78 8.6l2.88-2.88a.75.75 0 0 1 1.06 1.06l-3.41 3.41a.75.75 0 0 1-1.06 0l.03.03Z" />
                    </svg>
                    <div>
                      <p className="text-[14px] font-semibold text-ink leading-tight">{feature.name}</p>
                      <p className="text-[13px] text-ink-60 leading-snug mt-0.5">{feature.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
