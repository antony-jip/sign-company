'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const sources = [
  {
    name: 'James Pro',
    description: 'Exporteer je klanten, projecten en offertes. Wij importeren het.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#EDE9F3" />
        <path d="M12 20c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#7B6B8A" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="12" r="3" stroke="#7B6B8A" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'Gripp',
    description: 'Draai een export, upload het bestand en je bent klaar.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#E4EBE6" />
        <path d="M10 16h12M16 10v12" stroke="#5A8264" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Excel / CSV',
    description: 'Werkte je met spreadsheets? Upload en klaar.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#F6F4EC" />
        <path d="M10 10h4v4h-4zM18 10h4v4h-4zM10 18h4v4h-4zM18 18h4v4h-4z" stroke="#9A8E6E" strokeWidth="1.2" />
      </svg>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 120 },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 120 },
  },
};

export default function SwitchSection() {
  return (
    <section className="border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <div className="container max-w-[800px]">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Overstappen
          </p>
          <h2 className="font-heading section-heading text-ink mb-5">
            Je data meenemen? Geregeld.
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[500px] mx-auto">
            Of je nu van James Pro, Gripp of Excel komt. Wij helpen je met de overstap.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {sources.map((source) => (
            <motion.div
              key={source.name}
              className="rounded-2xl border border-ink-10 bg-white p-6 text-center neon-card"
              variants={cardVariant}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            >
              <div className="flex justify-center mb-3">
                {source.icon}
              </div>
              <h3 className="text-[16px] font-bold text-ink mb-2">{source.name}</h3>
              <p className="text-[14px] leading-[1.6] text-ink-60">{source.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Visual arrow flow */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-ink-20" />
          <motion.div
            className="flex items-center gap-2 text-[13px] text-ink-40 font-medium"
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14m0 0l-4-4m4 4l4-4" stroke="#C0C0BA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Import in minuten
          </motion.div>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-ink-20" />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
            <Button variant="soft" href="https://app.forgedesk.io">
              Start gratis en importeer je data &rarr;
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
