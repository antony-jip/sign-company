import React from 'react';
import { USP } from '@/types/landing-page';

interface USPsProps {
  title?: string;
  subtitle?: string;
  usps: USP[];
}

export const USPs: React.FC<USPsProps> = ({
  title = 'Waarom Sign Company?',
  subtitle,
  usps,
}) => {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {usps.map((usp, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-secondary-100 text-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">{index + 1}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {usp.title}
              </h3>
              <p className="text-gray-600">{usp.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 bg-primary-900 rounded-2xl p-8 md:p-12 text-center text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary-400 mb-2">42+</div>
              <div className="text-primary-200">Jaar ervaring</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary-400 mb-2">1983</div>
              <div className="text-primary-200">Opgericht</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary-400 mb-2">500+</div>
              <div className="text-primary-200">Projecten per jaar</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary-400 mb-2">100%</div>
              <div className="text-primary-200">Eigen productie</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default USPs;
