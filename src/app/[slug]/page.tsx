import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allLandingPages, getLandingPageBySlug } from '@/data/landing-pages';
import { LandingPageTemplate, generateLandingPageMetadata } from '@/components/LandingPageTemplate';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return allLandingPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pageData = getLandingPageBySlug(params.slug);

  if (!pageData) {
    return {
      title: 'Pagina niet gevonden',
    };
  }

  return generateLandingPageMetadata(pageData);
}

export default function LandingPage({ params }: PageProps) {
  const pageData = getLandingPageBySlug(params.slug);

  if (!pageData) {
    notFound();
  }

  return <LandingPageTemplate data={pageData} />;
}
