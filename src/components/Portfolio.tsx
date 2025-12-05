import React from 'react';
import { PortfolioItem } from '@/types/landing-page';

interface PortfolioProps {
  title?: string;
  subtitle?: string;
  items: PortfolioItem[];
  showMoreLink?: string;
}

export const Portfolio: React.FC<PortfolioProps> = ({
  title = 'Onze Projecten',
  subtitle,
  items,
  showMoreLink = '/projecten',
}) => {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition-shadow duration-300"
            >
              <div className="aspect-w-16 aspect-h-10 bg-gray-200 relative overflow-hidden">
                <div
                  className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold"
                  style={{
                    backgroundImage: item.image ? `url(${item.image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!item.image && item.title.charAt(0)}
                </div>
                <div className="absolute top-4 left-4">
                  <span className="bg-secondary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 mb-3">{item.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {item.location}
                </div>
              </div>
            </div>
          ))}
        </div>
        {showMoreLink && (
          <div className="text-center mt-12">
            <a
              href={showMoreLink}
              className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-200"
            >
              Bekijk meer projecten
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default Portfolio;
