import React from 'react';
import { LocationInfo, RelatedPage } from '@/types/landing-page';

interface LocationProps {
  title?: string;
  location: LocationInfo;
  relatedPages: RelatedPage[];
}

export const Location: React.FC<LocationProps> = ({
  title = 'Werkgebied',
  location,
  relatedPages,
}) => {
  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-6">
              {title}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              FORGEdesk is gevestigd in Enkhuizen en bedient {location.city} en omgeving.
              {location.distanceFromEnkhuizen && (
                <span> Wij zijn op slechts {location.distanceFromEnkhuizen} van uw locatie.</span>
              )}
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Wij komen ook naar:
              </h3>
              <div className="flex flex-wrap gap-2">
                {location.nearbyAreas.map((area, index) => (
                  <span
                    key={index}
                    className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Onze diensten in {location.region}
              </h3>
              <div className="space-y-3">
                {relatedPages.map((page, index) => (
                  <a
                    key={index}
                    href={`/${page.slug}/`}
                    className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">{page.title}</h4>
                      <p className="text-sm text-gray-600">{page.description}</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-primary-100 rounded-2xl aspect-square flex items-center justify-center">
              <div className="text-center p-8">
                <svg
                  className="w-24 h-24 text-primary-400 mx-auto mb-4"
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
                <p className="text-primary-600 font-medium">
                  Interactieve kaart komt hier
                </p>
                <p className="text-sm text-primary-500 mt-2">
                  FORGEdesk - {location.city}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
