// @ts-nocheck
import { CompanyInfo } from '@/types/landing-page';

export const companyInfo: CompanyInfo = {
  name: 'Sign Company',
  slogan: 'Van idee naar icoon',
  address: {
    street: 'Havenweg 1',
    city: 'Enkhuizen',
    postalCode: '1601 GA',
    country: 'Nederland',
  },
  phone: '+31 (0)228 123 456',
  whatsapp: '+31 6 12345678',
  email: 'info@signcompany.nl',
  yearsExperience: 42,
  foundedYear: 1983,
};

export const getSchemaOrg = (pageData: {
  title: string;
  description: string;
  url: string;
  faqs?: Array<{ question: string; answer: string }>;
}) => {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://signcompany.nl/#organization',
    name: companyInfo.name,
    description: companyInfo.slogan,
    url: 'https://signcompany.nl',
    telephone: companyInfo.phone,
    email: companyInfo.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: companyInfo.address.street,
      addressLocality: companyInfo.address.city,
      postalCode: companyInfo.address.postalCode,
      addressCountry: 'NL',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 52.7033,
      longitude: 5.2917,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '17:30',
      },
    ],
    foundingDate: companyInfo.foundedYear.toString(),
    priceRange: '€€',
    areaServed: [
      { '@type': 'City', name: 'Enkhuizen' },
      { '@type': 'City', name: 'Hoorn' },
      { '@type': 'City', name: 'Medemblik' },
      { '@type': 'AdministrativeArea', name: 'West-Friesland' },
      { '@type': 'AdministrativeArea', name: 'Noord-Holland' },
    ],
    sameAs: [
      'https://www.facebook.com/signcompany',
      'https://www.instagram.com/signcompany',
      'https://www.linkedin.com/company/signcompany',
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageData.title,
    description: pageData.description,
    url: pageData.url,
    isPartOf: {
      '@id': 'https://signcompany.nl/#website',
    },
    about: {
      '@id': 'https://signcompany.nl/#organization',
    },
  };

  const schemas = [baseSchema, webPageSchema];

  if (pageData.faqs && pageData.faqs.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pageData.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
    schemas.push(faqSchema);
  }

  return schemas;
};
