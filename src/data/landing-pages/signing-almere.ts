import { LandingPageData } from '@/types/landing-page';

export const signingAlmere: LandingPageData = {
  slug: 'signing-almere',
  phase: 3,
  priority: 3,

  metaTitle: 'Signing Almere | Gevelreclame & Autobelettering',
  metaDescription:
    'Signing en reclame in Almere. Van gevelreclame tot voertuigbelettering. Sign Company brengt ambachtelijk vakmanschap naar de Flevopolder.',
  h1: 'Signing & Reclame Almere',

  primaryKeywords: [
    'signing almere',
    'signbedrijf almere',
    'reclame almere',
  ],
  secondaryKeywords: [
    'reclamebureau almere',
    'gevelreclame almere',
    'autobelettering almere',
    'lichtreclame almere',
  ],

  heroIntro:
    'Sign Company brengt ambachtelijk vakmanschap naar Almere. Van gevelreclame tot autobelettering, uw complete signing partner in Flevoland.',

  contentFocus: [
    'Grootste stad in Flevoland',
    'Meer concurrentie, dus differentiëren',
    'Familiebedrijf vs. grote ketens',
    'Premium materialen benadrukken',
    'Snelle bereikbaarheid',
  ],

  services: [
    {
      title: 'Gevelreclame',
      description: 'Doosletters, freesletters en lichtreclame voor bedrijven.',
      icon: 'sign',
    },
    {
      title: 'Autobelettering',
      description: 'Professionele voertuigbelettering en carwrapping.',
      icon: 'car',
    },
    {
      title: 'Interieur signing',
      description: 'Kantoor branding en wanddecoratie.',
      icon: 'interior',
    },
    {
      title: 'Bewegwijzering',
      description: 'Binnen- en buitenbewegwijzering.',
      icon: 'wayfinding',
    },
    {
      title: 'Evenement signing',
      description: 'Banners, vlaggen en beursmaterialen.',
      icon: 'sign',
    },
    {
      title: 'Reclamezuilen',
      description: 'Pylons voor optimale zichtbaarheid.',
      icon: 'sign',
    },
  ],

  usps: [
    {
      title: 'Familiebedrijf',
      description: 'Persoonlijke service van een familiebedrijf met 42 jaar ervaring.',
    },
    {
      title: 'Premium kwaliteit',
      description: 'Alleen de beste materialen voor langdurige resultaten.',
    },
    {
      title: 'Alles in-house',
      description: 'Ontwerp, productie en montage onder één dak.',
    },
    {
      title: 'Snelle service',
      description: 'Korte lijntjes en snelle levering.',
    },
  ],

  portfolio: [
    {
      title: 'Winkelcentrum Almere Centrum',
      description: 'Gevelreclame voor diverse winkels.',
      image: '/images/portfolio/winkelcentrum-almere.jpg',
      location: 'Almere',
      category: 'Retail',
    },
    {
      title: 'Kantoorpand Almere Poort',
      description: 'Complete signing voor modern kantoorgebouw.',
      image: '/images/portfolio/kantoor-almere.jpg',
      location: 'Almere',
      category: 'B2B',
    },
  ],

  faqs: [
    {
      question: 'Waarom kiezen voor Sign Company in plaats van een Almere bedrijf?',
      answer:
        'Sign Company biedt 42 jaar ervaring, volledige in-house productie en persoonlijke service van een familiebedrijf. U krijgt ambachtelijk vakmanschap tegen eerlijke prijzen.',
    },
    {
      question: 'Hoe snel kunnen jullie in Almere zijn?',
      answer:
        'Vanuit Enkhuizen zijn we binnen 40-45 minuten in Almere. We komen graag langs voor advies en opmeting.',
    },
    {
      question: 'Werken jullie in alle stadsdelen van Almere?',
      answer:
        'Ja, wij bedienen heel Almere: Centrum, Haven, Buiten, Poort en alle bedrijventerreinen.',
    },
  ],

  location: {
    city: 'Almere',
    region: 'Flevoland',
    nearbyAreas: ['Lelystad', 'Amsterdam', 'Naarden', 'Huizen', 'Zeewolde'],
    distanceFromEnkhuizen: '45 minuten',
  },

  relatedPages: [
    {
      title: 'Signing Lelystad',
      slug: 'signing-lelystad',
      description: 'Signing in Lelystad.',
    },
    {
      title: 'Gevelreclame Hoorn',
      slug: 'gevelreclame-hoorn',
      description: 'Gevelreclame in Hoorn.',
    },
    {
      title: 'Carwrapping Lelystad',
      slug: 'carwrapping-lelystad',
      description: 'Carwrapping in Flevoland.',
    },
  ],
};
