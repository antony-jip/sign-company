'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const benefits = [
  {
    number: '01',
    title: 'Offerte tot factuur in één lijn',
    description: 'Maak een offerte, zet hem om in een werkbon, factureer in één klik. Geen overtypen, geen losse documenten. Alles zit aan elkaar vast.',
  },
  {
    number: '02',
    title: 'Altijd weten waar je staat',
    description: 'Zie per project je marge, uren en kosten. Niet achteraf, maar terwijl je bezig bent. Geen verrassingen meer bij de eindafrekening.',
  },
  {
    number: '03',
    title: 'Werkbonnen op locatie',
    description: "Je monteurs vullen ter plekke hun uren, materiaal en foto's in. Op hun telefoon. Het kantoor ziet het direct. Geen papier meer kwijt.",
  },
  {
    number: '04',
    title: 'Planning die iedereen snapt',
    description: 'Wie doet wat, wanneer. Eén agenda voor het hele team. Geen WhatsApp-groepen meer om te vragen wie er morgen op locatie staat.',
  },
  {
    number: '05',
    title: 'Je klant regelt het zelf',
    description: 'Via het klantportaal keurt je klant offertes goed, bekijkt facturen en stuurt berichten. Minder bellen, sneller akkoord.',
  },
  {
    number: '06',
    title: 'AI die voor je werkt',
    description: 'Laat AI je teksten verbeteren, signing visualiseren voor je klant, of stel een vraag over je administratie. Gebouwd voor jouw dagelijkse werk.',
  },
];

const audiences = [
  'Signbedrijven & reclamemakers',
  'Interieurbouwers',
  'Print & wrapping bedrijven',
  'Belettering & montage',
  'Gevelreclame & lichtreclame',
  'Creatieve maakbedrijven',
];

const painPoints = [
  { label: 'Gedateerde software', detail: 'Tools die eruitzien alsof ze in 2005 zijn gemaakt' },
  { label: 'Geen overzicht', detail: 'Bij grotere projecten weet je niet meer waar je staat' },
  { label: 'Uren kwijt', detail: 'Werkbonnen op papier, uren die nooit worden ingevoerd' },
  { label: 'Alles apart', detail: 'Offerte hier, factuur daar, planning in WhatsApp' },
];

export default function OverOnsContent() {
  return (
    <>
      {/* ── Hero — dark, direct ──────────────────────────────── */}
      <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.07), transparent 65%)', filter: 'blur(100px)' }}
        />

        <div className="container relative z-10" style={{ paddingTop: 160, paddingBottom: 100 }}>
          <div className="max-w-[750px]">
            <motion.p
              className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring' as const, damping: 25, stiffness: 100, delay: 0.2 }}
            >
              <span className="inline-block w-8 h-px bg-blush-vivid mr-3 align-middle" />
              Onze oplossing
            </motion.p>

            <motion.h1
              className="font-heading text-white leading-tight mb-6"
              style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring' as const, damping: 20, stiffness: 80, delay: 0.4 }}
            >
              Eén systeem voor{' '}
              <span className="text-blush-vivid">je hele bedrijf.</span>
            </motion.h1>

            <motion.p
              className="text-[20px] leading-[1.7] text-ink-40 max-w-[520px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring' as const, damping: 25, stiffness: 100, delay: 0.6 }}
            >
              Van offerte tot factuur, van werkbon tot planning. Alles op één plek — zodat jij kunt doen waar je goed in bent.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── Het probleem — herkenbaar ────────────────────────── */}
      <section className="bg-bg border-b border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="container">
          <motion.div
            className="max-w-[600px] mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
              <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
              Herkenbaar?
            </p>
            <h2
              className="font-heading text-ink leading-tight"
              style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}
            >
              Je weet dat het beter kan. Maar de tools werken niet mee.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {painPoints.map((point, i) => (
              <motion.div
                key={point.label}
                className="border-t border-ink-10 py-6 pr-8"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring' as const, damping: 25, stiffness: 120, delay: i * 0.06 }}
              >
                <p className="text-[17px] font-bold text-ink mb-1">{point.label}</p>
                <p className="text-[14px] text-ink-40 leading-relaxed">{point.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wat je krijgt — concrete benefits ────────────────── */}
      <section className="bg-bg" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="container">
          <motion.div
            className="max-w-[600px] mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
              <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
              Wat je krijgt
            </p>
            <h2
              className="font-heading text-ink leading-tight"
              style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}
            >
              Alles wat je nodig hebt. Niets wat je niet nodig hebt.
            </h2>
          </motion.div>

          <div className="space-y-0">
            {benefits.map((benefit) => (
              <motion.div
                key={benefit.number}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 border-t border-ink-10 items-start"
                style={{ paddingTop: 48, paddingBottom: 48 }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
              >
                <div className="lg:col-span-1">
                  <span className="font-mono text-[13px] font-bold text-blush-vivid">
                    {benefit.number}
                  </span>
                </div>
                <div className="lg:col-span-4">
                  <h3
                    className="font-heading text-ink leading-tight"
                    style={{ fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 900, letterSpacing: '-1px' }}
                  >
                    {benefit.title}
                  </h3>
                </div>
                <div className="lg:col-span-7">
                  <p className="text-[16px] leading-[1.7] text-ink-60 max-w-[460px]">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Voor wie ─────────────────────────────────────────── */}
      <section className="bg-bg border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="container">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
          >
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
                <span className="inline-block w-8 h-px bg-ink-20 mr-3 align-middle" />
                Voor wie
              </p>
              <h2
                className="font-heading text-ink leading-tight mb-5"
                style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px' }}
              >
                Gemaakt voor bedrijven die maken.
              </h2>
              <p className="text-[16px] leading-[1.7] text-ink-60 max-w-[380px]">
                FORGEdesk is gebouwd voor creatieve maakbedrijven. Bedrijven die met hun handen werken en software nodig hebben die daarbij past.
              </p>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              {audiences.map((audience, i) => (
                <motion.div
                  key={audience}
                  className="flex items-center justify-between py-4 border-b border-ink-10"
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring' as const, damping: 25, stiffness: 120, delay: i * 0.06 }}
                >
                  <span className="text-[16px] font-semibold text-ink">{audience}</span>
                  <span className="w-2 h-2 rounded-full bg-sage-vivid" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Ons verhaal — kort, vertrouwen ───────────────────── */}
      <section className="relative bg-forge-dark overflow-hidden noise-overlay-dark" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="container relative z-10">
          <motion.div
            className="max-w-[650px]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-8">
              <span className="inline-block w-8 h-px bg-blush-vivid mr-3 align-middle" />
              Waarom wij
            </p>
            <blockquote
              className="font-heading text-white/90 leading-tight mb-6"
              style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.15 }}
            >
              &ldquo;We hebben 40 jaar signing gemaakt. We weten precies waar het wringt — want wij hadden dezelfde problemen.&rdquo;
            </blockquote>
            <p className="text-[16px] text-ink-40 leading-[1.7] mb-10 max-w-[500px]">
              FORGEdesk is geboren uit frustratie. Niet door een softwarebedrijf dat interviews deed, maar door een signbedrijf dat sinds 1983 elke dag met dezelfde problemen worstelde. We bouwden het systeem dat wij zelf nodig hadden. Nu is het er ook voor jou.
            </p>

            <div className="flex flex-wrap gap-12 mb-10">
              {[
                { number: '1983', label: 'In de branche sinds' },
                { number: '40+', label: 'Jaar ervaring' },
                { number: '€49', label: 'Per maand, alles erin' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-heading text-[28px] font-black text-white tracking-tight leading-none">
                    {stat.number}
                  </p>
                  <p className="text-[12px] text-ink-40 mt-1 font-mono tracking-wide">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Button variant="warm" href="https://app.forgedesk.io">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,169,144,0.06), transparent 70%)', filter: 'blur(80px)' }}
        />
      </section>
    </>
  );
}
