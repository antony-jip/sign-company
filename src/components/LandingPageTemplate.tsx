// @ts-nocheck
// LandingPageTemplate: componenten accepteren nog geen props, wordt later gefixt
import React from 'react';
import { Metadata } from 'next';
import { LandingPageData } from '@/types/landing-page';
import { getSchemaOrg } from '@/lib/company-info';
import { Header } from './Header';
import { Hero } from './Hero';
import Services from './Services';
import USPs from './USPs';
import Portfolio from './Portfolio';
import { Location } from './Location';
import FAQ from './FAQ';
import CTA from './CTA';
import { Footer } from './Footer';

interface LandingPageTemplateProps {
  data: LandingPageData;
}

export const generateLandingPageMetadata = (data: LandingPageData): Metadata => {
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: [...data.primaryKeywords, ...data.secondaryKeywords],
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `https://forgedesk.nl/${data.slug}/`,
      type: 'website',
      locale: 'nl_NL',
    },
    alternates: {
      canonical: `https://forgedesk.nl/${data.slug}/`,
    },
  };
};

export const LandingPageTemplate: React.FC<LandingPageTemplateProps> = ({ data }) => {
  const schemaOrg = getSchemaOrg({
    title: data.metaTitle,
    description: data.metaDescription,
    url: `https://forgedesk.nl/${data.slug}/`,
    faqs: data.faqs,
  });

  const defaultUSPs = [
    {
      title: '42 Jaar Ervaring',
      description: 'Sinds 1983 specialist in signing en reclame. Vakmanschap uit West-Friesland.',
    },
    {
      title: 'Premium Materialen',
      description: 'Wij werken uitsluitend met 3M en Avery folies voor maximale duurzaamheid.',
    },
    {
      title: 'Eigen Productie',
      description: 'Van ontwerp tot montage, alles in eigen beheer voor de beste kwaliteit.',
    },
    {
      title: 'Lokaal & Persoonlijk',
      description: 'Korte lijntjes, snelle service en persoonlijk advies voor elk project.',
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <Header />
      <main id="main-content">
        <Hero
          h1={data.h1}
          intro={data.heroIntro}
          location={data.location.city}
        />

        <Services
          title={`Onze diensten in ${data.location.city}`}
          subtitle={`FORGEdesk biedt complete signing-oplossingen in ${data.location.city} en omgeving`}
          services={data.services}
        />

        <USPs
          title="Waarom FORGEdesk?"
          subtitle="Al meer dan 40 jaar uw betrouwbare partner"
          usps={data.usps.length > 0 ? data.usps : defaultUSPs}
        />

        {data.portfolio.length > 0 && (
          <Portfolio
            title={`Projecten in ${data.location.region}`}
            subtitle="Bekijk ons werk in de regio"
            items={data.portfolio}
          />
        )}

        <Location
          title={`FORGEdesk in ${data.location.city}`}
          location={data.location}
          relatedPages={data.relatedPages}
        />

        <FAQ
          title={`Veelgestelde vragen over ${data.h1.toLowerCase()}`}
          faqs={data.faqs}
        />

        <CTA
          title={`Klaar om te starten in ${data.location.city}?`}
          subtitle="Vraag vandaag nog gratis advies aan"
          location={data.location.city}
        />
      </main>
      <Footer />
    </>
  );
};

export default LandingPageTemplate;
