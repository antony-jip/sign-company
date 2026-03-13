'use client';

import { useInView } from '@/hooks/useInView';

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
    title: 'Offertes met marge-inzicht',
    description: 'Inkoop, verkoop en marge direct zichtbaar. Verstuur als PDF of deel een link.',
    iconBg: 'bg-lavender-light',
    iconColor: 'text-lavender-deep',
    gradient: 'from-lavender-light/60 to-white',
    glowColor: 'rgba(164,139,191,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Werkbonnen op locatie',
    description: "Foto's, uren en materiaal. Op je telefoon. De kantoormanager ziet het direct.",
    iconBg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    gradient: 'from-sage-light/60 to-white',
    glowColor: 'rgba(125,184,138,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 17.5v-11" />
      </svg>
    ),
    title: 'Facturen in één klik',
    description: 'Automatisch vanuit de offerte. Betaallink erbij, UBL naar je boekhouder.',
    iconBg: 'bg-peach-light',
    iconColor: 'text-peach-deep',
    gradient: 'from-peach-light/60 to-white',
    glowColor: 'rgba(240,160,128,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Klantportaal',
    description: 'Je klant logt in, keurt goed en stuurt berichten. Geen e-mails heen en weer.',
    iconBg: 'bg-mist-light',
    iconColor: 'text-mist-deep',
    gradient: 'from-mist-light/60 to-white',
    glowColor: 'rgba(123,163,196,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    title: 'E-mail in je projecten',
    description: 'Automatisch gekoppeld aan klanten en projecten. Nooit meer zoeken.',
    iconBg: 'bg-cream-light',
    iconColor: 'text-cream-deep',
    gradient: 'from-cream-light/60 to-white',
    glowColor: 'rgba(196,184,138,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
    title: 'AI-assistent Forgie',
    description: 'Teksten schrijven, offertes verbeteren. €5 AI-tegoed inbegrepen.',
    iconBg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    gradient: 'from-blush-light/60 to-white',
    glowColor: 'rgba(232,169,144,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    title: 'Planning & agenda',
    description: 'Wie doet wat, wanneer. Je team ziet het direct op hun telefoon.',
    iconBg: 'bg-peach-light',
    iconColor: 'text-peach-deep',
    gradient: 'from-peach-light/60 to-white',
    glowColor: 'rgba(240,160,128,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z" />
        <path d="M12 12h4" />
        <path d="M12 16h4" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="16" r="1" />
        <path d="M5 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1" />
        <path d="M8 8H5" />
      </svg>
    ),
    title: 'Sign Visualiser',
    description: 'Upload een foto en logo, genereer een AI-visualisatie voor je klant.',
    iconBg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    gradient: 'from-blush-light/60 to-white',
    glowColor: 'rgba(232,169,144,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
      </svg>
    ),
    title: 'Projecten met overzicht',
    description: 'Alles bij elkaar. Eén klik en je ziet je marge.',
    iconBg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    gradient: 'from-sage-light/60 to-white',
    glowColor: 'rgba(125,184,138,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    title: 'PDF & UBL-export',
    description: 'Professionele offertes met je logo. UBL direct naar je boekhouder.',
    iconBg: 'bg-mist-light',
    iconColor: 'text-mist-deep',
    gradient: 'from-mist-light/60 to-white',
    glowColor: 'rgba(123,163,196,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
      </svg>
    ),
    title: 'Betaallinks',
    description: 'Betaallink mee met je factuur. Je klant betaalt direct online.',
    iconBg: 'bg-lavender-light',
    iconColor: 'text-lavender-deep',
    gradient: 'from-lavender-light/60 to-white',
    glowColor: 'rgba(164,139,191,0.15)',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    ),
    title: 'Geen opslaglimiet',
    description: 'Onbeperkt documenten en bestanden. Geen extra kosten.',
    iconBg: 'bg-cream-light',
    iconColor: 'text-cream-deep',
    gradient: 'from-cream-light/60 to-white',
    glowColor: 'rgba(196,184,138,0.15)',
  },
];

export default function FeaturesGrid() {
  const { ref: headerRef, isInView: headerVisible } = useInView();
  const { ref: gridRef, isInView: gridVisible } = useInView();

  return (
    <section className="relative bg-mesh-features noise-overlay" style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container relative z-10">
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

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[960px] mx-auto"
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl border border-ink-10 bg-gradient-to-br ${feature.gradient} p-6 neon-card cursor-default`}
              style={{
                opacity: gridVisible ? 1 : 0,
                transform: gridVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 * i}s`,
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${feature.glowColor}, transparent 70%)` }}
              />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  {feature.icon}
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-1.5">{feature.title}</h3>
                <p className="text-[14px] leading-[1.6] text-ink-60">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
