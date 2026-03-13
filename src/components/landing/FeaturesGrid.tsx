'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

/* ── 3 categorieën met features ────────────────────────────────── */

const categories = [
  {
    title: 'Verkoop & facturatie',
    subtitle: 'Van offerte tot betaling',
    iconSrc: '/images/icons/cat-verkoop.png',
    borderColor: 'border-blush/20',
    gradient: 'from-blush-light/20 via-white to-white',
    features: [
      { name: 'Offertes met marge-inzicht', desc: 'Inkoop, verkoop en marge direct zichtbaar', icon: '/images/icons/feat-offertes.png' },
      { name: 'Facturen in één klik', desc: 'Automatisch vanuit de offerte', icon: '/images/icons/feat-facturen.png' },
      { name: 'PDF & UBL-export', desc: 'Professioneel met je logo, direct naar je boekhouder', icon: '/images/icons/feat-pdf-ubl.png' },
      { name: 'Betaallinks', desc: 'Je klant betaalt direct online', icon: '/images/icons/feat-betaallinks.png' },
    ],
  },
  {
    title: 'Projecten & planning',
    subtitle: 'Overzicht van kantoor tot bouwplaats',
    iconSrc: '/images/icons/cat-projecten.png',
    borderColor: 'border-sage/20',
    gradient: 'from-sage-light/20 via-white to-white',
    features: [
      { name: 'Werkbonnen op locatie', desc: "Foto's, uren en materiaal op je telefoon", icon: '/images/icons/feat-werkbonnen.png' },
      { name: 'Planning & agenda', desc: 'Wie doet wat, wanneer', icon: '/images/icons/feat-planning.png' },
      { name: 'Projecten met overzicht', desc: 'Eén klik en je ziet je marge', icon: '/images/icons/feat-projecten.png' },
      { name: 'E-mail in je projecten', desc: 'Automatisch gekoppeld, nooit meer zoeken', icon: '/images/icons/feat-email.png' },
    ],
  },
  {
    title: 'Slim & uniek',
    subtitle: 'Wat ons anders maakt',
    iconSrc: '/images/icons/cat-slim.png',
    borderColor: 'border-lavender/20',
    gradient: 'from-lavender-light/20 via-white to-white',
    features: [
      { name: 'Sign Visualiser', desc: 'AI-visualisatie van signing voor je klant', icon: '/images/icons/feat-visualiser.png' },
      { name: 'AI-assistent Forgie', desc: 'Teksten schrijven, offertes verbeteren', icon: '/images/icons/feat-forgie.png' },
      { name: 'Klantportaal', desc: 'Je klant logt in, keurt goed en stuurt berichten', icon: '/images/icons/feat-klantportaal.png' },
      { name: 'Geen opslaglimiet', desc: 'Onbeperkt documenten en bestanden', icon: '/images/icons/feat-opslag.png' },
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
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={cat.iconSrc}
                    alt={cat.title}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
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
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 mt-0.5">
                      <Image
                        src={feature.icon}
                        alt={feature.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
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
