'use client';

import React from 'react';

const industries = [
  { name: 'Signing bedrijven', bg: 'bg-blush-light/60', text: 'text-blush-deep', border: 'border-blush/20' },
  { name: 'Reclamebureaus', bg: 'bg-sage-light/60', text: 'text-sage-deep', border: 'border-sage/20' },
  { name: 'Drukkerijen', bg: 'bg-mist-light/60', text: 'text-mist-deep', border: 'border-mist/20' },
  { name: 'Interieurbouwers', bg: 'bg-cream-light/60', text: 'text-cream-deep', border: 'border-cream/20' },
  { name: 'Wrapping studios', bg: 'bg-lavender-light/60', text: 'text-lavender-deep', border: 'border-lavender/20' },
  { name: 'Schildersbedrijven', bg: 'bg-peach-light/60', text: 'text-peach-deep', border: 'border-peach/20' },
  { name: 'Grafisch ontwerpers', bg: 'bg-blush-light/60', text: 'text-blush-deep', border: 'border-blush/20' },
  { name: 'Standbouwers', bg: 'bg-sage-light/60', text: 'text-sage-deep', border: 'border-sage/20' },
  { name: 'Graveerders', bg: 'bg-mist-light/60', text: 'text-mist-deep', border: 'border-mist/20' },
  { name: 'Print & sign shops', bg: 'bg-lavender-light/60', text: 'text-lavender-deep', border: 'border-lavender/20' },
];

export const SocialProof: React.FC = () => {
  const doubled = [...industries, ...industries];

  return (
    <section className="py-6 bg-white/60 backdrop-blur-sm border-y border-gray-100/50 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center px-5 py-2 mx-2 rounded-full text-sm font-medium border ${item.bg} ${item.text} ${item.border}`}
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
};

export default SocialProof;
