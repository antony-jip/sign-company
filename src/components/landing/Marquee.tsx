'use client';

import { motion } from 'framer-motion';

const items = [
  'Offertes',
  'Werkbonnen',
  'Planning',
  'Facturen',
  'Klantportaal',
  'Sign Visualiser',
  'AI-assistent',
  'Marge-inzicht',
  'PDF-export',
  'Betaallinks',
];

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const content = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="flex overflow-hidden">
      <motion.div
        className="flex shrink-0 gap-4"
        animate={{ x: reverse ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {content.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-4 shrink-0"
          >
            <span className="font-heading text-[18px] md:text-[22px] font-bold text-ink-60 whitespace-nowrap tracking-tight">
              {item}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-blush-vivid opacity-40 shrink-0" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Marquee() {
  return (
    <section className="relative bg-bg border-y border-ink-10 overflow-hidden" style={{ paddingTop: 20, paddingBottom: 20 }}>
      <MarqueeRow />
    </section>
  );
}
