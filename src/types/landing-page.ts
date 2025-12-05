export interface LandingPageData {
  slug: string;
  phase: 1 | 2 | 3;
  priority: number;

  // SEO
  metaTitle: string;
  metaDescription: string;
  h1: string;

  // Keywords
  primaryKeywords: string[];
  secondaryKeywords: string[];

  // Content
  heroIntro: string;
  contentFocus: string[];

  // Services
  services: Service[];

  // USPs
  usps: USP[];

  // Portfolio
  portfolio: PortfolioItem[];

  // FAQ
  faqs: FAQ[];

  // Location
  location: LocationInfo;

  // Related pages
  relatedPages: RelatedPage[];
}

export interface Service {
  title: string;
  description: string;
  icon: string;
  link?: string;
}

export interface USP {
  title: string;
  description: string;
  icon?: string;
}

export interface PortfolioItem {
  title: string;
  description: string;
  image: string;
  location: string;
  category: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface LocationInfo {
  city: string;
  region: string;
  nearbyAreas: string[];
  distanceFromEnkhuizen?: string;
}

export interface RelatedPage {
  title: string;
  slug: string;
  description: string;
}

export interface CompanyInfo {
  name: string;
  slogan: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  whatsapp: string;
  email: string;
  yearsExperience: number;
  foundedYear: number;
}
