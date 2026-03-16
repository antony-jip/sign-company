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

function MarqueeRow({ reverse = false, speed = 30 }: { reverse?: boolean; speed?: number }) {
  const content = [...items, ...items];

  return (
    <div className="flex overflow-hidden">
      <motion.div
        className="flex shrink-0 gap-6"
        animate={{ x: reverse ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {content.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-6 shrink-0"
          >
            <span className="font-heading text-[18px] md:text-[22px] font-bold text-ink-60 whitespace-nowrap tracking-tight hover:text-ink transition-colors duration-300 cursor-default">
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
    <section className="relative bg-bg border-y border-ink-10 overflow-hidden marquee-fade" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="space-y-4">
        <MarqueeRow speed={35} />
        <MarqueeRow reverse speed={28} />
      </div>
    </section>
  );
}
