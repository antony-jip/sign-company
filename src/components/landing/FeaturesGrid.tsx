'use client';

import { useInView } from '@/hooks/useInView';

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </svg>
    ),
    title: 'Offertes met marge-inzicht',
    description: 'Inkoop, verkoop en marge direct zichtbaar. Verstuur als PDF of deel een link. Je klant keurt online goed.',
    color: 'bg-lavender-light text-lavender-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Werkbonnen op locatie',
    description: "Foto's uploaden, uren bijhouden, materiaal noteren. Op je telefoon. De kantoormanager ziet het direct.",
    color: 'bg-sage-light text-sage-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 17.5v-11" />
      </svg>
    ),
    title: 'Facturen in één klik',
    description: 'Automatisch vanuit de offerte. Betaallink voor je klant, UBL-export voor je boekhouder.',
    color: 'bg-[#FEF3C7] text-[#92400E]',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Klantportaal',
    description: 'Je klant logt in, bekijkt offertes, keurt goed en stuurt berichten. Geen e-mails meer heen en weer.',
    color: 'bg-mist-light text-mist-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    title: 'E-mail in je projecten',
    description: 'Alle e-mails automatisch gekoppeld aan klanten en projecten. Nooit meer zoeken in je inbox.',
    color: 'bg-cream-light text-cream-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
    title: 'AI-assistent Forgie',
    description: 'Teksten schrijven, offertes verbeteren, inzichten krijgen. Inbegrepen met €5 AI-tegoed per maand.',
    color: 'bg-blush-light text-blush-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    title: 'Planning & agenda',
    description: 'Wie doet wat, wanneer. Sleep projecten in je planning. Je team ziet het direct op hun telefoon.',
    color: 'bg-peach-light text-peach-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
    title: 'Sign Visualiser',
    description: 'Upload een foto en logo, genereer een AI-visualisatie. Laat je klant het resultaat zien voor je begint.',
    color: 'bg-blush-light text-blush-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
      </svg>
    ),
    title: 'Projecten met overzicht',
    description: 'Alle documenten, mails, werkbonnen en uren bij elkaar. Eén klik en je ziet je marge.',
    color: 'bg-sage-light text-sage-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    title: 'PDF & UBL-export',
    description: 'Professionele PDF-offertes met je logo. UBL-facturen direct naar je boekhouder.',
    color: 'bg-mist-light text-mist-deep',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 17v2" />
        <path d="M13 11v2" />
      </svg>
    ),
    title: 'Betaallinks',
    description: 'Stuur een betaallink mee met je factuur. Je klant betaalt direct online. Geld sneller binnen.',
    color: 'bg-[#FEF3C7] text-[#92400E]',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    ),
    title: 'Geen opslaglimiet',
    description: 'Onbeperkt documenten, foto\'s en bestanden. Geen extra kosten als je groeit.',
    color: 'bg-peach-light text-peach-deep',
  },
];

export default function FeaturesGrid() {
  const { ref: headerRef, isInView: headerVisible } = useInView();
  const { ref: gridRef, isInView: gridVisible } = useInView();

  return (
    <section style={{ paddingTop: 120, paddingBottom: 120 }}>
      <div className="container">
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
            Geen losse modules of verborgen kosten. Eén prijs, alles erin. Vanaf &euro;49 per maand.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[960px] mx-auto"
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-ink-10 bg-white p-6 transition-all hover:shadow-lg hover:border-ink-20 hover:-translate-y-1"
              style={{
                opacity: gridVisible ? 1 : 0,
                transform: gridVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 * i}s`,
              }}
            >
              <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-[15px] font-bold text-ink mb-1.5">{feature.title}</h3>
              <p className="text-[14px] leading-[1.6] text-ink-60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
