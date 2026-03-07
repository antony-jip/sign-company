'use client';

import React from 'react';

const industries = [
  { name: 'Signing bedrijven', bg: 'bg-blush-light', text: 'text-blush-deep' },
  { name: 'Reclamebureaus', bg: 'bg-sage-light', text: 'text-sage-deep' },
  { name: 'Drukkerijen', bg: 'bg-mist-light', text: 'text-mist-deep' },
  { name: 'Interieurbouwers', bg: 'bg-cream-light', text: 'text-cream-deep' },
  { name: 'Wrapping studios', bg: 'bg-blush-light', text: 'text-blush-deep' },
  { name: 'Schildersbedrijven', bg: 'bg-sage-light', text: 'text-sage-deep' },
  { name: 'Grafisch ontwerpers', bg: 'bg-mist-light', text: 'text-mist-deep' },
  { name: 'Standbouwers', bg: 'bg-cream-light', text: 'text-cream-deep' },
  { name: 'Graveerders', bg: 'bg-blush-light', text: 'text-blush-deep' },
  { name: 'Print & sign shops', bg: 'bg-sage-light', text: 'text-sage-deep' },
];

export const SocialProof: React.FC = () => {
  // Double the list for seamless looping
  const doubled = [...industries, ...industries];

  return (
    <section className="py-8 bg-white border-y border-gray-100 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-5 py-2 mx-3 rounded-full text-sm font-medium ${item.bg} ${item.text}`}
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
};

export default SocialProof;
