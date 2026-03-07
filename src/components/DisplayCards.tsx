'use client';

import React from 'react';

interface DisplayCard {
  title: string;
  subtitle: string;
  detail: string;
  accentColor: string;
  icon: React.ReactNode;
}

interface DisplayCardsProps {
  cards?: DisplayCard[];
}

const defaultCards: DisplayCard[] = [
  {
    title: 'Offertes',
    subtitle: 'Professioneel in minuten',
    detail: '12 offertes deze week',
    accentColor: '#F0D9D0', // blush
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: 'Planning',
    subtitle: 'Overzicht in één blik',
    detail: '3 projecten ingepland',
    accentColor: '#C8D5CC', // sage
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Facturen',
    subtitle: 'Automatisch verstuurd',
    detail: '€14.850 deze maand',
    accentColor: '#CDD5DE', // mist
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

export const DisplayCards: React.FC<DisplayCardsProps> = ({ cards = defaultCards }) => {
  return (
    <div className="display-cards-container">
      {cards.map((card, index) => (
        <div
          key={index}
          className="display-card"
          style={{
            '--card-accent': card.accentColor,
            '--card-index': index,
          } as React.CSSProperties}
        >
          <div className="display-card-inner">
            <div
              className="display-card-icon"
              style={{ color: card.accentColor }}
            >
              {card.icon}
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">{card.title}</h3>
            <p className="text-sm text-[#6B6B6B] mb-2">{card.subtitle}</p>
            <p className="text-xs text-[#A0A0A0]">{card.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DisplayCards;
