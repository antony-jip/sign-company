'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import SectionReveal from '../SectionReveal'
import WachtlijstForm from '../WachtlijstForm'

const modules = [
  {
    id: 'projecten',
    name: 'Projecten',
    color: '#1A535C',
    image: '/images/modules/projecten-transparent.webp',
    headline: 'Eén cockpit. Alles gedaan.',
    description: 'Je opent een project en alles zit erin. Offerte, werkbon, planning, factuur, klantcommunicatie. Wat jij in de offerte schrijft, leest je monteur op de werkbon. Wat je klant goedkeurt in het portaal, zie jij direct terug. Niks valt tussen wal en schip.',
    highlights: ['Offerte, werkbon, factuur en planning in één project', 'Wat in de offerte staat, staat op de werkbon', 'Je klant volgt mee via het portaal', 'Situatiefoto\'s, bestanden en taken per project'],
    detail: 'Je maakt een project aan en koppelt alles eraan. Offerte verstuurd? Zit in het project. Werkbon voor de monteur? Komt uit het project. Factuur na oplevering? Eén klik vanuit het project. Je klant volgt mee via het portaal en keurt goed zonder in te loggen. Jij ziet in de activiteiten-timeline precies wat er wanneer is gebeurd.',
  },
  {
    id: 'offertes',
    name: 'Offertes',
    color: '#F15025',
    image: '/images/modules/offertes-transparent.webp',
    headline: 'Offerte? Zo gedaan.',
    description: 'Maak je eigen producten aan, sla templates op voor gevelreclame, autobelettering of lichtreclame. Stel je inkoopprijs en marge in. doen. berekent de verkoopprijs. Upload je werktekening en de omschrijving wordt er automatisch bij gezet.',
    highlights: ['Eigen producten en templates voor elk type werk', 'Inkoopprijs + marge = verkoopprijs, automatisch', 'Werktekening uploaden met automatische omschrijving', 'Verstuur als PDF of laat goedkeuren via het klantportaal'],
    detail: 'Je bouwt één keer je producten op. Daarna selecteer je ze bij elke offerte. Combineer losse onderdelen tot één prijs. Lever je inkoopofferte van de leverancier aan, doen. leest hem uit. Je klant keurt goed via het portaal of per mail. Wijzigingen? Versioning houdt alles bij.',
  },
  {
    id: 'portaal',
    name: 'Klantportaal',
    color: '#6A5A8A',
    image: '/images/modules/klantportaal-transparent.webp',
    headline: 'Niet mailen. Gewoon delen.',
    description: 'Je klant krijgt een link en ziet alles. Tekeningen, offertes, opdrachtbevestigingen, facturen en foto\'s. Goedkeuren, reageren en betalen vanuit één plek. Geen bijlages, geen inlog.',
    highlights: ['Tekening, offerte, opdrachtbevestiging, factuur en foto\'s delen', 'Klant keurt goed en betaalt direct vanuit het portaal', 'Automatische herinneringen bij geen reactie of open factuur', 'Meerdere contactpersonen per project uitnodigen'],
    detail: 'Stuur je tekening, je klant bekijkt en reageert. Stuur je offerte, je klant keurt goed met één klik. Stuur je opdrachtbevestiging, je klant tekent digitaal. Stuur je factuur, je klant betaalt via iDEAL. Stuur foto\'s van de montage, je klant ziet het resultaat. Alles in hetzelfde portaal. Geen losse mails, geen verloren bijlages.',
  },
  {
    id: 'planning',
    name: 'Planning',
    color: '#9A5A48',
    image: '/images/modules/planning-transparent.png',
    headline: 'Sleep. Drop. Gepland.',
    description: 'Sleep een project naar een dag en het staat ingepland. Per monteur of per ploeg. De werkbon zit er direct aan vast. Je monteur opent zijn telefoon en weet wat hij moet doen, waar hij moet zijn en wat het weerbericht is.',
    highlights: ['Sleep een project naar een dag in de kalender', 'Per monteur of per ploeg inplannen', 'Werkbon, locatie en contactgegevens direct zichtbaar', 'Weerbericht en waarschuwing bij dubbele boeking'],
    detail: 'Je ziet je hele week in één overzicht. Sleep een project naar maandag, wijs het toe aan Mark en Sophie. De werkbon wordt automatisch aangemaakt met alle offerteregels. Je monteur opent de app, ziet tijd, adres en werkbon. Buiten-montage bij regen? Het weerbericht staat erbij. Dubbel geboekt? doen. waarschuwt je voordat het misgaat.',
  },
  {
    id: 'werkbonnen',
    name: 'Werkbonnen',
    color: '#C44830',
    image: '/images/modules/werkbonnen-transparent.png',
    headline: 'Offerte in. Werkbon uit.',
    description: 'Alle offerteregels staan 1:1 op de werkbon. Je monteur opent zijn telefoon, ziet wat hij moet doen, registreert uren, maakt foto\'s en laat de klant tekenen. Alles komt direct terug in het project.',
    highlights: ['Offerteregels automatisch overgenomen op de werkbon', 'Uren registreren en foto\'s maken op locatie', 'Klant tekent digitaal op de werkbon', 'Opmerkingen en instructiefoto\'s per regel'],
    detail: 'De werkbon is het verlengstuk van je offerte. Wat jij aanbiedt, voert je monteur uit. Op locatie registreert hij uren, maakt foto\'s van het resultaat en laat de klant tekenen. Alles komt automatisch terug in het project. Jij ziet direct wat er is gedaan zonder te bellen.',
  },
  {
    id: 'facturen',
    name: 'Facturen',
    color: '#2D6B48',
    image: '/images/modules/facturen.jpg',
    headline: 'Verstuurd. Herinnerd. Gedaan.',
    description: 'Eén klik vanuit de offerte of helemaal zelf opbouwen. Je klant betaalt direct via Mollie. Herinneringen? Die doet doen. automatisch. Jij hoeft er niet meer naar om te kijken.',
    highlights: ['Vanuit offerte of vanaf scratch', 'Mollie betaallink (iDEAL, creditcard)', 'Automatische herinneringen', 'Voorschot- en deelfacturen'],
    detail: 'Factureren zonder nadenken. Offerte goedgekeurd? Factuur staat klaar. Betaallink erbij via Mollie. Niet betaald? doen. herinnert. Op het moment dat jij instelt.',
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    color: '#9A5A48',
    image: '/images/modules/visualizer.jpg',
    headline: 'Laat zien. Niet vertellen.',
    description: 'Upload een schets, AI doet de rest. Autobelettering, gevelreclame, lichtreclame. Claude verbetert je input, Nano Banana visualiseert het. Koppel aan je project, deel via het portaal.',
    highlights: ['Schets uploaden → AI visualiseert', 'Claude Sonnet verbetert je input', 'Koppel aan project of offerte', '10 credits, bijkopen wanneer je wilt'],
    detail: 'Je klant ziet het eindresultaat voordat je begint. Upload een schets of foto. AI brengt het tot leven. Deel het via het portaal. Het beeld doet het verkoopwerk.',
  },
  {
    id: 'ai',
    name: 'AI-assistent',
    color: '#1A535C',
    image: '/images/modules/ai-assistant.jpg',
    headline: 'Daan doet het denkwerk.',
    description: 'Hoeveel staat er open? Wie is je grootste klant? Daan weet het. Selecteer tekst, Daan verbetert het. Mail binnengekomen? Daan vat samen. Vierkante meters uitrekenen? Daan doet het.',
    highlights: ['Kent al je bedrijfsdata', 'Tekst verbeteren en verlengen', 'Mails samenvatten en schrijven', 'Draait op Claude Sonnet 4.6'],
    detail: 'Daan is de collega die nooit vrij neemt. Vraag wat je wilt, wanneer je wilt. Offerteteksten, calculaties, samenvattingen. Hoe meer je vraagt, hoe slimmer Daan wordt.',
  },
]

const faq = [
  { q: 'Kan ik doen. eerst uitproberen?', a: 'Ja, de eerste 30 dagen zijn gratis. Geen creditcard nodig. Je hebt direct toegang tot alle modules.' },
  { q: 'Hoeveel kost doen. na de proefperiode?', a: '€79 per maand ex. btw, tot 10 gebruikers. Meer gebruikers? Neem contact op voor een prijs op maat. Geen opzetkosten, geen verborgen kosten.' },
  { q: 'Kan ik mijn bestaande data importeren?', a: 'Ja, we helpen je met het importeren van je klanten en producten. Neem contact op via hello@doen.team.' },
  { q: 'Werkt doen. op mijn telefoon?', a: 'Ja. De planning en werkbonnen zijn geoptimaliseerd voor mobiel. Je monteur opent de werkbon op zijn telefoon en registreert direct uren en foto\'s.' },
  { q: 'Hoe werkt het klantportaal?', a: 'Je klant ontvangt een unieke link per mail. Geen inlog nodig. Ze bekijken tekeningen, keuren offertes goed en reageren op bestanden. Je stelt zelf in wanneer herinneringen uitgaan.' },
  { q: 'Wat is de Visualizer?', a: 'Upload een schets of foto en AI genereert een realistische visualisatie van het eindresultaat. Je begint met 10 credits en koopt bij wanneer je wilt.' },
  { q: 'Zit AI echt overal in?', a: 'Ja. Daan (onze AI-assistent) draait op Claude Sonnet 4.6. Hij kent je bedrijfsdata, schrijft teksten, helpt met calculaties en wordt steeds slimmer.' },
  { q: 'Kan ik doen. koppelen aan mijn boekhouding?', a: 'We werken aan een koppeling met Exact Online. Mollie (iDEAL, creditcard) is al geïntegreerd voor online betalingen.' },
]

function PortaalDemo() {
  return (
    <div style={{ background: '#0D2B30' }}>
      <div className="container-site py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>
              Zo ziet je klant het
            </p>
            <h2 className="text-[24px] md:text-[32px] font-bold text-white tracking-tight mt-2 mb-5">
              Eén link<span className="text-flame">.</span> Alles erin<span className="text-flame">.</span>
            </h2>
            <p className="text-[14px] md:text-[16px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Je klant opent de link en ziet alles in chronologische volgorde. Tekeningen, offertes, opdrachtbevestigingen, facturen en foto's. Reageren kan direct. Geen inlog, geen app, geen gedoe.
            </p>
            <a
              href="/aanmelden"
              className="inline-flex items-center gap-2 text-white font-semibold text-[14px] px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] mt-8"
              style={{ backgroundColor: '#F15025' }}
            >
              Schrijf je in
              <span className="text-[16px]">→</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Portaal mockup */}
            <div className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden max-w-[420px] mx-auto">
              {/* Header */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1A535C, #143F46)' }}>
                <span className="text-white text-[13px] font-bold tracking-tight">De Vries Reclame</span>
                <span className="font-mono text-[9px] text-white/50">Geldig tot 15 mei 2026</span>
              </div>

              {/* Info bar */}
              <div className="px-5 py-2.5 text-[12px] border-b border-[#E6E4E0]" style={{ backgroundColor: '#FAFAF8', color: '#5A5A55' }}>
                Bekijk de items hieronder en geef uw reactie.
              </div>

              {/* Timeline items */}
              <div className="divide-y divide-[#E6E4E0]">
                {/* Tekening */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#191919]">De Vries Reclame</span>
                    <span className="font-mono text-[10px] text-[#A0A098]">1 apr, 09:15</span>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-lg p-3 mb-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEE8F5' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A5A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#6A5A8A' }}>Tekening</p>
                      <p className="text-[12px] text-[#191919]">Ontwerp-gevelreclame-v2.pdf</p>
                      <p className="text-[10px] text-[#A0A098]">245 KB · PDF</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#5A5A55]">Hierbij de tekening voor jullie gevelreclame. Graag je akkoord zodat we kunnen bestellen.</p>
                </div>

                {/* Offerte — goedgekeurd */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3" style={{ backgroundColor: '#F15025' }} />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-[#191919]">Offerte</p>
                      <p className="text-[11px] text-[#5A5A55]">Gevelreclame LED</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>Goedgekeurd</span>
                  </div>
                  <p className="font-mono text-[15px] font-bold text-[#191919] mt-1">€ 3.850,00</p>
                  <p className="text-[11px] mt-1" style={{ color: '#1A535C' }}>↗ Offerte bekijken</p>
                  <div className="flex items-center gap-2 mt-2 pl-3 border-l-2 border-[#F15025]">
                    <span className="text-[11px] font-semibold" style={{ color: '#1A535C' }}>Goedgekeurd</span>
                    <span className="text-[11px] text-[#A0A098]">— Jan de Vries · 2 apr, 14:32</span>
                  </div>
                </div>

                {/* Opdrachtbevestiging */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3" style={{ backgroundColor: '#1A535C' }} />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-[#191919]">Opdrachtbevestiging</p>
                      <p className="text-[11px] text-[#5A5A55]">OB-2026-0089</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>Getekend</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-3 border-l-2 border-[#1A535C]">
                    <span className="text-[11px] font-semibold" style={{ color: '#1A535C' }}>Digitaal getekend</span>
                    <span className="text-[11px] text-[#A0A098]">— Jan de Vries · 2 apr, 15:10</span>
                  </div>
                </div>

                {/* Foto's montage */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#191919]">De Vries Reclame</span>
                    <span className="font-mono text-[10px] text-[#A0A098]">5 apr, 16:00</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F4F2EE' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0A098" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F4F2EE' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0A098" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F4F2EE' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A0A098" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#5A5A55]">Montage is afgerond. Hier de foto's ter bevestiging.</p>
                </div>

                {/* Factuur */}
                <div className="px-5 py-4">
                  <div className="h-[3px] rounded-full mb-3" style={{ backgroundColor: '#2D6B48' }} />
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-bold text-[#191919]">Factuur</p>
                      <p className="font-mono text-[11px] text-[#5A5A55]">FAC-2026-0089</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>Betaald</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="font-mono text-[15px] font-bold text-[#191919]">€ 3.850,00</p>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E4F0EA', color: '#2D6B48' }}>✓ Betaald via iDEAL</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[#E6E4E0] text-center">
                <span className="text-[10px]" style={{ color: '#A0A098' }}>Aangedreven door <span className="font-semibold" style={{ color: '#1A535C' }}>doen.</span></span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function WerktekeningSection() {
  const [showResult, setShowResult] = useState(false)

  return (
    <div style={{ background: '#0D2B30' }}>
      <div className="container-site py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>
              Werktekening
            </p>
            <h2 className="text-[24px] md:text-[32px] font-bold text-white tracking-tight mt-2 mb-5">
              Upload je tekening<span className="text-flame">.</span> doen<span className="text-flame">.</span> doet de rest<span className="text-flame">.</span>
            </h2>
            <p className="text-[14px] md:text-[16px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Sleep je werktekening in de offerte. De omschrijving van de offerteregel wordt automatisch overgenomen als titel. Je klant ziet een professionele tekening met uitleg. Geen Illustrator nodig.
            </p>
            <a
              href="/aanmelden"
              className="inline-flex items-center gap-2 text-white font-semibold text-[14px] px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] mt-8"
              style={{ backgroundColor: '#F15025' }}
            >
              Schrijf je in
              <span className="text-[16px]">→</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Slider toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowResult(false)}
                className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: !showResult ? '#F15025' : 'rgba(255,255,255,0.08)',
                  color: !showResult ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                Upload
              </button>
              <button
                onClick={() => setShowResult(true)}
                className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase px-4 py-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: showResult ? '#F15025' : 'rgba(255,255,255,0.08)',
                  color: showResult ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                Resultaat
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!showResult ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="bg-white rounded-xl p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
                    <div className="flex items-center justify-between pb-4 border-b border-[#E6E4E0]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F15025] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                        <span className="text-[14px] font-semibold text-[#191919]">Autobelettering bedrijfsbus</span>
                      </div>
                      <span className="font-mono text-[14px] font-semibold text-[#191919]">€ 1.850,00</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A5A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase text-[#6A5A8A]">Tekening / bijlage</span>
                    </div>
                    <div className="border-2 border-dashed border-[#6A5A8A]/30 rounded-lg py-8 md:py-10 flex flex-col items-center justify-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A0A098" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-[13px] text-[#5A5A55]">Sleep, plak of klik om te uploaden</p>
                      <p className="text-[11px] text-[#A0A098]">JPG, PNG of PDF — max 10MB</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* PDF-achtige output */}
                  <div className="bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden">
                    {/* PDF header */}
                    <div className="px-5 md:px-6 pt-5 pb-4 border-b border-[#E6E4E0]">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[#191919] tracking-tight">sign company</span>
                        <div className="flex items-center gap-6 text-[11px] text-[#A0A098]">
                          <span>Omschrijving <span className="text-[#191919] font-medium ml-2">Autobelettering bedrijfsbus</span></span>
                          <span>Aantal <span className="text-[#191919] font-medium ml-2">1 stuk</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Tekening grid */}
                    <div className="p-5 md:p-6" style={{ backgroundColor: '#F4F2EE' }}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Bus zijkant - 2D */}
                        <div className="bg-white rounded-lg p-4 flex items-end justify-center h-[140px] col-span-2">
                          <svg viewBox="0 0 440 120" className="w-full h-auto">
                            {/* Bus body */}
                            <rect x="30" y="20" width="340" height="70" rx="6" fill="#E8E6E2" />
                            {/* Cabine */}
                            <path d="M320 20 L370 20 Q390 20 390 40 L390 90 L320 90 Z" fill="#D4D2CE" />
                            {/* Voorruit */}
                            <path d="M330 28 L365 28 Q380 28 380 40 L380 55 L330 55 Z" fill="#C4C2BE" rx="3" />
                            {/* Belettering op bus */}
                            <text x="100" y="62" fontFamily="var(--font-heading, system-ui)" fontWeight="800" fontSize="28" fill="#1A535C" letterSpacing="-1">doen</text>
                            <text x="186" y="62" fontFamily="var(--font-heading, system-ui)" fontWeight="800" fontSize="28" fill="#F15025">.</text>
                            {/* Tagline */}
                            <text x="100" y="78" fontFamily="var(--font-dm-sans, system-ui)" fontWeight="400" fontSize="9" fill="#8A8A85">doen.team</text>
                            {/* Wielen */}
                            <circle cx="100" cy="90" r="16" fill="#B0AEA8" />
                            <circle cx="100" cy="90" r="8" fill="#D4D2CE" />
                            <circle cx="340" cy="90" r="16" fill="#B0AEA8" />
                            <circle cx="340" cy="90" r="8" fill="#D4D2CE" />
                            {/* Bumper */}
                            <rect x="390" y="70" width="12" height="20" rx="3" fill="#D4D2CE" />
                            {/* Spiegel */}
                            <rect x="392" y="35" width="8" height="12" rx="2" fill="#C4C2BE" />
                          </svg>
                        </div>
                        {/* Tekst variant */}
                        <div className="bg-white rounded-lg p-4 h-[120px] flex flex-col justify-center">
                          <span className="font-heading text-[14px] font-extrabold leading-tight" style={{ color: '#1A535C' }}>
                            doen<span style={{ color: '#F15025' }}>.</span> gedaan<span style={{ color: '#F15025' }}>.</span>
                          </span>
                          <span className="text-[9px] text-[#A0A098] mt-1">doen.team</span>
                        </div>
                        {/* Donkere variant */}
                        <div className="bg-[#191919] rounded-lg p-4 h-[120px] flex items-center justify-center gap-2">
                          <span className="font-heading text-[16px] font-extrabold text-white">d<span style={{ color: '#F15025' }}>.</span></span>
                          <span className="font-heading text-[16px] font-extrabold text-white">doen<span style={{ color: '#F15025' }}>.</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 md:px-6 py-3 border-t border-[#E6E4E0] flex items-center justify-between">
                      <span className="text-[10px] text-[#A0A098]">Pagina 2 van 2</span>
                      <span className="text-[10px] text-[#A0A098]">Automatisch gegenereerd door doen.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid #EBEBEB' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[15px] md:text-[16px] font-semibold text-petrol pr-4">{question}</span>
        <motion.span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: open ? '#F15025' : '#F8F7F5' }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2V10M2 6H10" stroke={open ? 'white' : '#9B9B95'} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] md:text-[15px] leading-[1.7] pb-5" style={{ color: '#6B6B66' }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FeaturesContent({ initialModule = 0, moduleSlug }: { initialModule?: number; moduleSlug?: string }) {
  const [activeModule, setActiveModule] = useState(initialModule)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mod = modules[activeModule]

  function selectModule(index: number) {
    setActiveModule(index)
    if (scrollRef.current) {
      const child = scrollRef.current.children[index] as HTMLElement
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  type Overlay = { image: string; alt: string; w: number; h: number; label: string; pos: React.CSSProperties; from: { x: number; y: number } }
  type Pillar = { image: string; alt: string; label: string; title: string; description: string; width: number; height: number }
  type HeroConfig = { label: string; heading: [string, string]; sub: string; image: string; imageW: number; imageH: number; overlays?: Overlay[]; pillarsTitle?: string; pillarsHeading?: [string, string]; pillars?: Pillar[] }

  const heroConfigs: Record<string, HeroConfig> = {
    projecten: {
      label: 'Projecten',
      heading: ['Eén cockpit', 'Alles gedaan'],
      sub: 'Eén plek waar offerte, werkbon, planning en factuur samenkomen. Je monteur weet wat hij moet doen. Je klant ziet wat er gebeurt.',
      image: '/images/features/hero-projecten-float.png',
      imageW: 2400, imageH: 1350,
      overlays: [
        { image: '/images/features/portaal-overlay.webp', alt: 'Klantportaal', w: 1024, h: 572, label: 'Klantportaal', pos: { left: '-24%', top: '8%', width: '42%' }, from: { x: -40, y: 20 } },
        { image: '/images/features/acties-overlay.webp', alt: 'Project acties', w: 1024, h: 572, label: 'Acties', pos: { right: '-20%', top: '-2%', width: '36%' }, from: { x: 40, y: 20 } },
        { image: '/images/features/activiteit-overlay.webp', alt: 'Activiteiten log', w: 1434, h: 1070, label: 'Activiteiten', pos: { right: '-12%', bottom: '4%', width: '32%' }, from: { x: 30, y: 30 } },
      ],
      pillarsTitle: 'De kern van elk project',
      pillarsHeading: ['Eén project', 'Drie pijlers'],
      pillars: [
        { image: '/images/features/acties-overlay.webp', alt: 'Project acties', label: 'Acties', title: 'Eén klik, de juiste actie', description: 'Offerte maken, werkbon aanmaken, montage inplannen, factuur versturen. Alles start vanuit het project. Je hoeft niet te zoeken waar je gebleven was.', width: 1024, height: 572 },
        { image: '/images/features/portaal-overlay.webp', alt: 'Klantportaal', label: 'Klantportaal', title: 'Je klant ziet wat jij ziet', description: 'Je klant krijgt een link. Geen account, geen wachtwoord. Offerte goedkeuren, tekeningen bekijken, vragen stellen. Geen reactie na drie dagen? doen. stuurt een herinnering.', width: 1024, height: 572 },
        { image: '/images/features/activiteit-overlay.webp', alt: 'Activiteiten log', label: 'Activiteiten', title: 'Nooit meer vragen wat de status is', description: 'Offerte verstuurd, klant akkoord, werkbon aangemaakt, montage ingepland. Elke stap staat in de timeline. Je collega hoeft niet te vragen hoe het ervoor staat.', width: 1434, height: 1070 },
      ],
    },
    offertes: {
      label: 'Offertes',
      heading: ['Offerte?', 'Zo gedaan'],
      sub: 'Eigen templates, eigen producten, eigen calculatie. Combineer elementen tot één prijs. Verstuur per mail of laat goedkeuren via het portaal.',
      image: '/images/features/hero-offertes.webp',
      imageW: 1536, imageH: 857,
      overlays: [
        { image: '/images/features/overzicht-offerte.webp', alt: 'Offerte overzicht', w: 1147, h: 1536, label: 'Overzicht', pos: { right: '-24%', top: '-2%', width: '33%' }, from: { x: 40, y: 20 } },
        { image: '/images/features/offerte-calculatie.webp', alt: 'Offerte calculatie', w: 1536, h: 1350, label: 'Calculatie', pos: { left: '-26%', top: '5%', width: '36%' }, from: { x: -40, y: 20 } },
        { image: '/images/features/verzenden-offerte.webp', alt: 'Offerte verzenden via portaal of email', w: 960, h: 800, label: 'Verzenden', pos: { left: '-30%', bottom: '8%', width: '20%' }, from: { x: -30, y: 30 } },
      ],
      pillarsTitle: 'Van klant tot factuur',
      pillarsHeading: ['Eén offerte', 'Drie stappen'],
      pillars: [
        { image: '/images/features/offerte-calculatie.webp', alt: 'Offerte calculatie', label: 'Calculatie', title: 'Inkoop, marge, verkoopprijs', description: 'Maak je eigen producten en templates. Voer inkoop in, stel de marge in. doen. doet de rest. Combineer losse onderdelen tot één offerteregel. Geen Excel meer.', width: 1536, height: 1350 },
        { image: '/images/features/overzicht-offerte.webp', alt: 'Offerte overzicht', label: 'Overzicht', title: 'Grip op je uren en marge', description: 'Totalen, marge, uren per medewerker. Ook bij grote projecten met tien offerteregels zie je in één oogopslag wat het kost en wat het oplevert. Verstuur als PDF of laat goedkeuren via het portaal.', width: 1147, height: 1536 },
        { image: '/images/features/inkoopofferte.webp', alt: 'Inkoopofferte leveranciers', label: 'Inkoop', title: 'Leveranciersprijzen altijd bij de hand', description: 'Upload de PDF van je leverancier. doen. leest alles uit. Inkoopprijzen zitten direct in je marge. Overtypen hoeft niet meer.', width: 960, height: 1200 },
      ],
    },
    portaal: {
      label: 'Klantportaal',
      heading: ['Niet mailen', 'Gewoon delen'],
      sub: 'Tekening, offerte, opdrachtbevestiging, factuur en foto\'s. Je klant ziet alles via één link. Goedkeuren, reageren en betalen zonder in te loggen.',
      image: '/images/features/hero-portaal.webp',
      imageW: 1536, imageH: 857,
      overlays: [
        { image: '/images/features/portaal-floating.webp', alt: 'Klantportaal chat en goedkeuring', w: 768, h: 1024, label: 'Portaal', pos: { right: '-20%', top: '-2%', width: '32%' }, from: { x: 40, y: 20 } },
        { image: '/images/features/portaal-overlay.webp', alt: 'Portaal overzicht', w: 1024, h: 572, label: 'Overzicht', pos: { left: '-24%', bottom: '5%', width: '36%' }, from: { x: -40, y: 25 } },
      ],
      pillarsTitle: 'Wat je klant ervaart',
      pillarsHeading: ['Eén link', 'Alles geregeld'],
      pillars: [
        { image: '/images/features/portaal-overlay.webp', alt: 'Klantportaal', label: 'Goedkeuren', title: 'Offerte, tekening en OB in één klik', description: 'Je klant bekijkt de offerte, keurt de tekening goed en tekent de opdrachtbevestiging. Alles vanuit dezelfde link. Jij ziet direct wat de status is.', width: 1024, height: 572 },
        { image: '/images/features/portaal-floating.webp', alt: 'Bestanden delen', label: 'Delen', title: 'Alles wat je klant moet zien', description: 'Tekeningen, offertes, foto\'s van de montage, facturen. Je klant ziet het in chronologische volgorde en kan direct reageren. Niks raakt kwijt in een mailbox.', width: 768, height: 1024 },
        { image: '/images/features/activiteit-overlay.webp', alt: 'Herinneringen', label: 'Opvolging', title: 'doen. volgt op, jij hoeft niks te doen', description: 'Geen reactie na drie dagen? doen. stuurt een herinnering met jouw eigen tekst. Factuur niet betaald? Automatische betaalherinnering. Jij bent er klaar mee.', width: 1434, height: 1070 },
      ],
    },
    planning: {
      label: 'Planning',
      heading: ['Sleep. Drop', 'Gepland'],
      sub: 'Sleep een project naar een dag. De werkbon zit er direct aan vast. Je monteur weet wat hij moet doen, waar hij moet zijn en hoe het weer wordt.',
      image: '/images/features/hero-planning.webp',
      imageW: 1536, imageH: 857,
      overlays: [
        { image: '', alt: 'Mobiele planning', w: 0, h: 0, label: '__planning_mobile__', pos: { left: '-20%', top: '5%', width: '22%' }, from: { x: -40, y: 25 } },
        { image: '', alt: 'Planning overzicht', w: 0, h: 0, label: '__planning_mockup__', pos: { right: '-18%', top: '-4%', width: '42%' }, from: { x: 40, y: 20 } },
      ],
      pillarsTitle: 'Hoe je plant met doen.',
      pillarsHeading: ['Eén kalender', 'Alles erin'],
      pillars: [
        { image: '/images/features/planning-kalender.png', alt: 'Planning kalender', label: 'Kalender', title: 'Hele week in één overzicht', description: 'Weekweergave per monteur of per ploeg. Sleep projecten naar een dag. Verplaatsen is net zo makkelijk. Geen apart systeem, geen gedeelde Google Calendar.', width: 1536, height: 857 },
        { image: '/images/features/planning-werkbon.png', alt: 'Werkbon koppeling', label: 'Werkbon', title: 'Ingepland is klaar voor de monteur', description: 'Zodra je een project inplant, wordt de werkbon automatisch aangemaakt met alle offerteregels en instructies. Je monteur opent zijn telefoon en kan direct aan de slag.', width: 1024, height: 572 },
        { image: '/images/features/planning-slim.png', alt: 'Slim plannen', label: 'Slim plannen', title: 'Weer, conflicten en beschikbaarheid', description: 'Buiten-montage gepland? Het weerbericht staat erbij. Monteur al bezet? doen. waarschuwt je. Zo voorkom je dubbele boekingen en verrassingen op locatie.', width: 1434, height: 1070 },
      ],
    },
    werkbonnen: {
      label: 'Werkbonnen',
      heading: ['Offerte erin', 'Werkbon eruit'],
      sub: 'Alle offerteregels staan automatisch op de werkbon. Je monteur ziet wat hij moet doen, registreert uren, maakt foto\'s en laat de klant tekenen.',
      image: '/images/features/hero-werkbonnen.webp',
      imageW: 1536, imageH: 857,
      overlays: [
        { image: '/images/features/werkbon-floating.webp', alt: 'Werkbon afronding met foto en handtekening', w: 768, h: 1024, label: 'Afronding', pos: { right: '-18%', top: '0%', width: '30%' }, from: { x: 40, y: 20 } },
      ],
      pillarsTitle: 'Van offerte naar oplevering',
      pillarsHeading: ['Eén werkbon', 'Alles geregeld'],
      pillars: [
        { image: '/images/features/werkbon-links.png', alt: 'Werkbon regels', label: 'Regels', title: 'Offerteregels worden werkbonregels', description: 'Wat jij in de offerte zet, leest je monteur op de werkbon. Inclusief omschrijving, aantallen en instructiefoto\'s. Geen misverstanden, geen belletjes.', width: 1024, height: 572 },
        { image: '/images/features/werkbon-midden.png', alt: 'Foto en uren', label: 'Op locatie', title: 'Uren, foto\'s en opmerkingen', description: 'Je monteur opent de werkbon op zijn telefoon. Uren tikken, foto\'s maken van het resultaat, opmerkingen toevoegen. Alles komt direct terug in het project.', width: 1024, height: 572 },
        { image: '/images/features/werkbon-rechts.png', alt: 'Handtekening', label: 'Aftekenen', title: 'Klant tekent, jij bent klaar', description: 'De klant tekent digitaal op de telefoon van je monteur. De werkbon is afgerond. Jij ziet het direct in het project en kan factureren.', width: 1024, height: 572 },
      ],
    },
    facturen: {
      label: 'Facturen',
      heading: ['Verstuurd', 'Betaald'],
      sub: 'Eén klik vanuit de offerte en je factuur staat klaar. Betaallink via iDEAL erbij. Niet betaald? doen. herinnert automatisch. Jij hoeft er niet naar om te kijken.',
      image: '',
      imageW: 0, imageH: 0,
      overlays: [],
    },
    visualizer: {
      label: 'Visualizer',
      heading: ['Laat zien', 'Niet vertellen'],
      sub: 'Upload een foto van een bus, gevel of pand. Beschrijf wat je wilt. AI maakt een realistische visualisatie. Je klant ziet het eindresultaat voordat je begint.',
      image: '/images/features/hero-visualizer.webp',
      imageW: 2400, imageH: 857,
      overlays: [],
    },
    ai: {
      label: 'AI-assistent',
      heading: ['Daan doet', 'het denkwerk'],
      sub: 'Hoeveel staat er open? Wie is je grootste klant? Daan weet het. Tekst verbeteren, mails samenvatten, vierkante meters uitrekenen. Vraag het en Daan doet het.',
      image: '',
      imageW: 0, imageH: 0,
      overlays: [],
    },
  }

  const heroConfig = moduleSlug ? heroConfigs[moduleSlug] : undefined
  const showHero = !!heroConfig

  // Prev/next module navigation
  const currentModuleIndex = modules.findIndex(m => m.id === moduleSlug)
  const prevModule = currentModuleIndex > 0 ? modules[currentModuleIndex - 1] : modules[modules.length - 1]
  const nextModule = currentModuleIndex < modules.length - 1 ? modules[currentModuleIndex + 1] : modules[0]

  return (
    <div className={showHero ? '' : 'pt-28 md:pt-36'}>
      {showHero ? (
        <section>
          {/* Dark hero block — full bleed */}
          <div className="relative overflow-hidden min-h-[90vh] md:min-h-[100vh] flex flex-col" style={{ background: 'linear-gradient(180deg, #0D2B30 0%, #143F46 25%, #1A535C 50%, #143F46 85%, #0D2B30 100%)' }}>

            {/* Animated glow orbs — flame dominant */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '800px', height: '800px', top: '25%', left: '50%', x: '-50%', background: 'radial-gradient(circle, rgba(241,80,37,0.18) 0%, rgba(241,80,37,0.05) 40%, transparent 70%)', filter: 'blur(80px)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '500px', height: '500px', top: '45%', left: '15%', background: 'radial-gradient(circle, rgba(241,80,37,0.12) 0%, transparent 60%)', filter: 'blur(70px)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
            <motion.div
              className="absolute pointer-events-none"
              style={{ width: '500px', height: '500px', top: '40%', right: '10%', background: 'radial-gradient(circle, rgba(241,80,37,0.14) 0%, transparent 60%)', filter: 'blur(70px)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            />
            {/* Subtle warm ambient under the laptop */}
            <div
              className="absolute pointer-events-none"
              style={{ width: '100%', height: '400px', bottom: '5%', left: 0, background: 'radial-gradient(ellipse 50% 80% at 50% 100%, rgba(241,80,37,0.08) 0%, transparent 70%)' }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: i % 4 === 0 ? 3 : 2,
                    height: i % 4 === 0 ? 3 : 2,
                    left: `${(i * 5.3 + 3) % 100}%`,
                    top: `${(i * 7.1 + 10) % 90}%`,
                    backgroundColor: i % 3 === 0 ? '#F15025' : 'rgba(255,255,255,0.2)',
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.2, 0.7, 0.2],
                  }}
                  transition={{
                    duration: 4 + (i % 3) * 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
            />

            {/* Text content */}
            <div className="container-site text-center pt-40 md:pt-48 relative z-10">
              <motion.p
                className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase mb-6"
                style={{ color: '#F15025' }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.label}
              </motion.p>
              <motion.h1
                className="font-heading text-[44px] md:text-[64px] lg:text-[76px] font-extrabold tracking-[-3px] leading-[0.9] mb-7 text-white"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.heading[0]}<span className="text-flame">.</span><br />{' '}{heroConfig!.heading[1]}<span className="text-flame">.</span>
              </motion.h1>
              <motion.p
                className="text-[16px] md:text-[19px] max-w-lg mx-auto leading-relaxed mb-10 md:mb-14"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroConfig!.sub}
              </motion.p>

              {/* Portaal icon pills */}
              {moduleSlug === 'portaal' && (
                <motion.div
                  className="flex flex-wrap justify-center gap-3 mb-10 md:mb-14"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {[
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>, label: 'Tekening' },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, label: 'Offerte' },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>, label: 'Opdrachtbevestiging' },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>, label: 'Factuur' },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>, label: "Foto's" },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {item.icon}
                      {item.label}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Visualizer full-width flow — disabled */}
            {false && (
              <div className="flex-1 flex items-end justify-center relative z-10 pb-16 md:pb-24">
                <motion.div
                  className="w-full px-4 md:px-0"
                  style={{ maxWidth: '1100px', margin: '0 auto' }}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Column headers */}
                  <div className="grid grid-cols-3 mb-6 md:mb-8">
                    <p className="font-mono text-[10px] md:text-[12px] font-bold tracking-[0.25em] uppercase text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Input</p>
                    <p className="font-mono text-[10px] md:text-[12px] font-bold tracking-[0.25em] uppercase text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Processing</p>
                    <p className="font-mono text-[10px] md:text-[12px] font-bold tracking-[0.25em] uppercase text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Output</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0 items-center">
                    {/* INPUT card */}
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="rounded-2xl border border-white/10 p-5 mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.04)', maxWidth: '360px' }}>
                        <p className="text-[14px] font-bold text-white">Foto / ontwerp</p>
                        <p className="text-[11px] text-white/40 mt-0.5 mb-3">Gebouw, voertuig, schets of bestaand ontwerp</p>
                        <div className="rounded-lg overflow-hidden bg-white h-[130px] flex items-center justify-center mb-3">
                          <svg viewBox="0 0 220 70" className="w-[160px]">
                            <rect x="10" y="8" width="160" height="48" rx="4" fill="#E8E6E2" />
                            <rect x="140" y="8" width="42" height="32" rx="2" fill="#D4D2CE" />
                            <circle cx="55" cy="56" r="9" fill="#C4C2BE" />
                            <circle cx="55" cy="56" r="4" fill="#D4D2CE" />
                            <circle cx="150" cy="56" r="9" fill="#C4C2BE" />
                            <circle cx="150" cy="56" r="4" fill="#D4D2CE" />
                            <rect x="182" y="28" width="10" height="14" rx="2" fill="#D4D2CE" />
                          </svg>
                        </div>
                        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 mb-3">
                          <p className="text-[11px] text-white/60 leading-relaxed">Kan je van deze bus een mooie visualisatie maken met ons logo? Realistische foto.</p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] text-white/30">Ratio</span>
                          {['1:1', '4:3', '16:9', '9:16'].map((r) => (
                            <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${r === '4:3' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/30'}`}>{r}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[9px] text-white/30">Resolutie</span>
                          {['1K', '2K', '4K'].map((r) => (
                            <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${r === '2K' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/30'}`}>{r}</span>
                          ))}
                        </div>
                        <div className="rounded-xl py-2.5 text-center" style={{ background: 'linear-gradient(135deg, #F15025, #D4453A)' }}>
                          <span className="text-[12px] font-semibold text-white">🔥 Genereer Visualisatie — 1 credit</span>
                        </div>
                      </div>
                    </motion.div>

                    {/* PROCESSING — center arrow */}
                    <motion.div
                      className="hidden md:flex flex-col items-center justify-center px-6 md:px-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-[18px] font-bold text-white">Daan</span>
                      </div>
                      {/* Arrow lines */}
                      <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                        <path d="M10 10 Q40 10 60 20 Q80 30 110 20" stroke="#1A535C" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                        <path d="M10 20 Q40 25 60 20 Q80 15 110 22" stroke="#1A535C" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                        <path d="M10 30 Q40 35 60 25 Q80 20 110 24" stroke="#1A535C" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                        <polygon points="110,18 120,22 110,26" fill="#1A535C" />
                      </svg>
                      <p className="text-[11px] text-white/30 mt-3 font-mono">Claude + Gemini</p>
                    </motion.div>

                    {/* OUTPUT card */}
                    <motion.div
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.7, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="rounded-2xl border border-white/10 p-4 mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.04)', maxWidth: '340px' }}>
                        <div className="rounded-xl overflow-hidden mb-3">
                          <Image
                            src="/images/features/hero-visualizer.webp"
                            alt="AI visualisatie resultaat"
                            width={1536}
                            height={857}
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <span className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                          </span>
                          <span className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                          </span>
                          <span className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-white/30 text-center">2K · 4:3 · 1 credit gebruikt</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Standalone floating overlays (no laptop) */}
            {!heroConfig!.image && heroConfig!.overlays && heroConfig!.overlays.length > 0 && moduleSlug !== 'visualizer' && (
              <div className="flex-1 flex items-end justify-center relative z-10 pb-16 md:pb-24">
                <div className="relative w-full px-4 md:px-0" style={{ maxWidth: '1050px' }}>
                  <div className="flex justify-center gap-6 md:gap-10 flex-wrap">
                    {heroConfig!.overlays.map((overlay, i) => (
                      <motion.div
                        key={overlay.label}
                        initial={{ opacity: 0, x: overlay.from.x, y: overlay.from.y }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <motion.div
                          animate={{ y: [0, -6 - (i % 2), 0] }}
                          transition={{ duration: 4.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i }}
                        >
                          {overlay.label === '__visualizer_input__' ? (
                            <div className="rounded-2xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '320px', backgroundColor: '#1A1A18' }}>
                              <div className="px-5 pt-5 pb-3">
                                <p className="text-[14px] font-bold text-white">Foto / ontwerp</p>
                                <p className="text-[11px] text-white/40 mt-0.5">Gebouw, voertuig, schets of bestaand ontwerp</p>
                              </div>
                              <div className="mx-5 rounded-lg overflow-hidden bg-white h-[130px] flex items-center justify-center">
                                <svg viewBox="0 0 200 60" className="w-[150px]">
                                  <rect x="10" y="5" width="150" height="45" rx="4" fill="#E8E6E2" />
                                  <rect x="130" y="5" width="40" height="30" rx="2" fill="#D4D2CE" />
                                  <circle cx="50" cy="50" r="8" fill="#C4C2BE" />
                                  <circle cx="140" cy="50" r="8" fill="#C4C2BE" />
                                  <rect x="170" y="25" width="8" height="12" rx="2" fill="#D4D2CE" />
                                </svg>
                              </div>
                              <div className="mx-5 mt-3 rounded-lg bg-white/5 border border-white/10 px-3 py-3">
                                <p className="text-[12px] text-white/70 leading-relaxed">Kan je van deze bus een mooie visualisatie maken met ons logo? Realistische foto.</p>
                              </div>
                              <div className="px-5 mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-white/40">Ratio</span>
                                {['1:1', '4:3', '16:9', '9:16'].map((r) => (
                                  <span key={r} className={`text-[10px] px-2 py-1 rounded-md font-mono ${r === '4:3' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/40'}`}>{r}</span>
                                ))}
                              </div>
                              <div className="px-5 mt-2 flex items-center gap-2">
                                <span className="text-[10px] text-white/40">Resolutie</span>
                                {['1K', '2K', '4K'].map((r) => (
                                  <span key={r} className={`text-[10px] px-2 py-1 rounded-md font-mono ${r === '2K' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/40'}`}>{r}</span>
                                ))}
                              </div>
                              <div className="mx-5 mt-4 mb-5 rounded-xl py-3 text-center" style={{ background: 'linear-gradient(135deg, #F15025, #D4453A)' }}>
                                <span className="text-[13px] font-semibold text-white">🔥 Genereer Visualisatie — 1 credit</span>
                              </div>
                            </div>
                          ) : overlay.label === '__visualizer_output__' ? (
                            <div className="rounded-2xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '300px', backgroundColor: '#1A1A18' }}>
                              <div className="p-4">
                                <div className="rounded-xl overflow-hidden">
                                  <Image
                                    src="/images/features/hero-visualizer.webp"
                                    alt="AI visualisatie resultaat"
                                    width={1536}
                                    height={857}
                                    className="w-full h-auto"
                                  />
                                </div>
                              </div>
                              <div className="px-4 pb-2 flex items-center justify-center gap-4">
                                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                </span>
                                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                </span>
                                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                </span>
                              </div>
                              <div className="px-4 pb-4 text-center">
                                <span className="font-mono text-[10px] text-white/40">2K · 4:3 · 1 credit gebruikt</span>
                              </div>
                            </div>
                          ) : null}
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Laptop — floating with perspective */}
            {heroConfig!.image && <div className="flex-1 flex items-end justify-center relative z-10" style={{ perspective: '1200px' }}>
              <motion.div
                className="relative w-full px-4 md:px-0"
                style={{ maxWidth: '1050px' }}
                initial={{ opacity: 0, y: 80, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 1.2, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Screen glow reflection */}
                <div
                  className="absolute -inset-8 md:-inset-16 rounded-[40px] pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
                />
                <Image
                  src={heroConfig!.image}
                  alt={`doen. ${heroConfig!.label} op MacBook`}
                  width={heroConfig!.imageW}
                  height={heroConfig!.imageH}
                  priority
                  className="w-full h-auto relative"
                  style={{ filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.5)) drop-shadow(0 15px 40px rgba(241,80,37,0.15)) drop-shadow(0 0 120px rgba(241,80,37,0.08))' }}
                />

                {/* Dynamic floating overlays */}
                {heroConfig!.overlays?.map((overlay, i) => (
                  <motion.div
                    key={overlay.label}
                    className="absolute hidden md:block"
                    style={overlay.pos}
                    initial={{ opacity: 0, x: overlay.from.x, y: overlay.from.y }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <motion.div
                      animate={{ y: [0, -5 - (i % 2), 0] }}
                      transition={{ duration: 4.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i }}
                    >
                      {overlay.label === '__visualizer_input__' ? (
                        /* Visualizer input card */
                        <div className="rounded-2xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '320px', backgroundColor: '#1A1A18' }}>
                          <div className="px-5 pt-5 pb-3">
                            <p className="text-[14px] font-bold text-white">Foto / ontwerp</p>
                            <p className="text-[11px] text-white/40 mt-0.5">Gebouw, voertuig, schets of bestaand ontwerp</p>
                          </div>
                          <div className="mx-5 rounded-lg overflow-hidden bg-white h-[140px] flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-full h-[120px] bg-[#F4F2EE] flex items-center justify-center">
                                <svg viewBox="0 0 200 60" className="w-[160px]">
                                  <rect x="10" y="5" width="150" height="45" rx="4" fill="#E8E6E2" />
                                  <rect x="130" y="5" width="40" height="30" rx="2" fill="#D4D2CE" />
                                  <circle cx="50" cy="50" r="8" fill="#C4C2BE" />
                                  <circle cx="140" cy="50" r="8" fill="#C4C2BE" />
                                  <rect x="170" y="25" width="8" height="12" rx="2" fill="#D4D2CE" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="mx-5 mt-3 rounded-lg bg-white/5 border border-white/10 px-3 py-3">
                            <p className="text-[12px] text-white/70 leading-relaxed">Kan je van deze bus een mooie visualisatie maken met ons logo? Realistische foto.</p>
                          </div>
                          <div className="px-5 mt-3 flex items-center gap-2">
                            <span className="text-[10px] text-white/40">Ratio</span>
                            {['1:1', '4:3', '16:9', '9:16'].map((r) => (
                              <span key={r} className={`text-[10px] px-2 py-1 rounded-md font-mono ${r === '4:3' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/40'}`}>{r}</span>
                            ))}
                          </div>
                          <div className="px-5 mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-white/40">Resolutie</span>
                            {['1K', '2K', '4K'].map((r) => (
                              <span key={r} className={`text-[10px] px-2 py-1 rounded-md font-mono ${r === '2K' ? 'bg-[#1A535C] text-white font-bold' : 'bg-white/5 text-white/40'}`}>{r}</span>
                            ))}
                          </div>
                          <div className="mx-5 mt-4 mb-5 rounded-xl py-3 text-center" style={{ background: 'linear-gradient(135deg, #F15025, #D4453A)' }}>
                            <span className="text-[13px] font-semibold text-white">🔥 Genereer Visualisatie — 1 credit</span>
                          </div>
                        </div>
                      ) : overlay.label === '__visualizer_output__' ? (
                        /* Visualizer output card */
                        <div className="rounded-2xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '300px', backgroundColor: '#1A1A18' }}>
                          <div className="p-4">
                            <div className="rounded-xl overflow-hidden">
                              <Image
                                src="/images/features/hero-visualizer.webp"
                                alt="AI visualisatie resultaat"
                                width={1536}
                                height={857}
                                className="w-full h-auto"
                              />
                            </div>
                          </div>
                          <div className="px-4 pb-2 flex items-center justify-center gap-4">
                            <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </span>
                            <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            </span>
                            <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                            </span>
                          </div>
                          <div className="px-4 pb-4 text-center">
                            <span className="font-mono text-[10px] text-white/40">2K · 4:3 · 1 credit gebruikt</span>
                          </div>
                        </div>
                      ) : overlay.label === '__planning_mobile__' ? (
                        /* Mobiele planning kalender */
                        <div className="bg-white rounded-2xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '220px' }}>
                          {/* Mobile top bar */}
                          <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#1A535C' }}>
                            <span className="w-5 h-5 rounded-md text-[8px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#143F46' }}>D</span>
                            <span className="w-5 h-5 rounded-md text-[8px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#F15025' }}>+</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <div className="relative ml-auto">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /></svg>
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#F15025]" />
                            </div>
                          </div>

                          {/* Title + tabs */}
                          <div className="px-3 pt-3 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-heading text-[16px] font-extrabold text-[#191919] tracking-tight">Planning<span className="text-flame">.</span></span>
                              <span className="text-[8px] font-semibold px-2 py-1 rounded-md border border-[#E6E4E0] text-[#191919]">Kalender</span>
                              <span className="text-[8px] text-[#A0A098] px-2 py-1">Montage</span>
                            </div>
                            {/* Stat pills */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="text-[7px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>1 vandaag</span>
                              <span className="text-[7px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>3 deze week</span>
                              <span className="text-[7px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2EE] text-[#5A5A55]">3 monteurs</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[7px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FDE8E2', color: '#C03A18' }}>8 openstaand</span>
                              <span className="text-[8px] font-semibold text-white px-2.5 py-1 rounded-md" style={{ backgroundColor: '#F15025' }}>+ Taak inplannen</span>
                            </div>
                          </div>

                          {/* Week nav */}
                          <div className="mx-3 px-2 py-1.5 rounded-lg border border-[#E6E4E0] flex items-center justify-between mb-2">
                            <span className="text-[8px] font-semibold text-[#191919] border border-[#E6E4E0] rounded px-1.5 py-0.5">Vandaag</span>
                            <span className="text-[8px] text-[#A0A098]">‹</span>
                            <span className="font-mono text-[8px] font-bold text-[#191919]">14 Apr. - 18 Apr. 2026</span>
                            <span className="text-[8px] text-[#A0A098]">›</span>
                          </div>

                          {/* Calendar grid */}
                          <div className="mx-3 mb-2">
                            <div className="grid grid-cols-3 border border-[#E6E4E0] rounded-lg overflow-hidden">
                              {/* Day headers */}
                              <div className="px-2 py-1.5 border-r border-b border-[#E6E4E0] text-center">
                                <p className="text-[7px] font-mono uppercase text-[#A0A098]">Ma</p>
                                <p className="text-[14px] font-bold text-[#191919]">14</p>
                              </div>
                              <div className="px-2 py-1.5 border-r border-b border-[#E6E4E0] text-center">
                                <p className="text-[7px] font-mono uppercase text-[#A0A098]">Di</p>
                                <p className="text-[14px] font-bold text-[#191919]">15</p>
                                <span className="inline-block w-1 h-1 rounded-full bg-[#1A535C]" />
                              </div>
                              <div className="px-2 py-1.5 border-b border-[#E6E4E0] text-center">
                                <p className="text-[7px] font-mono uppercase text-[#A0A098]">Wo</p>
                                <p className="text-[14px] font-bold text-[#191919]">16</p>
                              </div>
                              {/* Montage block */}
                              <div className="col-span-3 p-2">
                                <div className="rounded-md px-2 py-2 text-[8px]" style={{ backgroundColor: '#E2F0F0', borderLeft: '2px solid #1A535C' }}>
                                  <p className="font-semibold text-[#191919]">Gevelreclame LED</p>
                                  <p className="text-[#1A535C] mt-0.5">08:00 – 16:00</p>
                                  <div className="flex gap-1 mt-1">
                                    <span className="text-[7px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#1A535C', color: 'white' }}>MV</span>
                                    <span className="text-[7px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#2D6B48', color: 'white' }}>SD</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom nav */}
                          <div className="border-t border-[#E6E4E0] grid grid-cols-5 py-2">
                            {['Home', 'Klanten', 'Offertes', 'Projecten', 'Meer'].map((tab) => (
                              <div key={tab} className="text-center">
                                <span className={`text-[7px] ${tab === 'Meer' ? 'text-[#1A535C] font-semibold' : 'text-[#A0A098]'}`}>{tab}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : overlay.label === '__planning_mockup__' ? (
                        /* Planning team overzicht mockup — nagebouwd uit de app */
                        <div className="bg-white rounded-xl overflow-hidden" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))', width: '420px' }}>
                          {/* Top bar — tabs */}
                          <div className="px-4 py-2.5 border-b border-[#E6E4E0] flex items-center justify-between bg-[#FAFAF8]">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-[#A0A098]">Kalender</span>
                              <span className="text-[10px] font-semibold text-[#191919] border-b-2 border-[#9A5A48] pb-0.5">Montage</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-[#A0A098]">Print week</span>
                              <span className="text-[9px] font-semibold text-white px-2 py-1 rounded-md" style={{ backgroundColor: '#F15025' }}>+ Nieuw</span>
                            </div>
                          </div>
                          {/* Team sidebar + grid */}
                          <div className="flex">
                            {/* Sidebar */}
                            <div className="w-[100px] border-r border-[#E6E4E0] bg-[#FAFAF8]">
                              <div className="px-3 py-2 border-b border-[#E6E4E0]">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-[#A0A098]">Team</span>
                              </div>
                              <div className="px-3 py-2 bg-white border-b border-[#E6E4E0]">
                                <span className="text-[9px] font-semibold text-[#1A535C]">Overzicht</span>
                              </div>
                              {[
                                { initials: 'MV', name: 'Mark Visser', color: '#1A535C' },
                                { initials: 'RK', name: 'Rick Kuiper', color: '#F15025' },
                                { initials: 'SD', name: 'Sophie Dekker', color: '#2D6B48' },
                              ].map((m) => (
                                <div key={m.initials} className="px-3 py-1.5 flex items-center gap-1.5 border-b border-[#E6E4E0]">
                                  <span className="w-4 h-4 rounded-full text-[7px] font-bold flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</span>
                                  <span className="text-[8px] text-[#191919] truncate">{m.name}</span>
                                </div>
                              ))}
                            </div>
                            {/* Grid */}
                            <div className="flex-1">
                              {/* Week header */}
                              <div className="px-3 py-2 border-b border-[#E6E4E0] flex items-center gap-2">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A5A48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                <span className="text-[10px] font-semibold text-[#191919]">Team overzicht</span>
                                <span className="text-[9px] text-[#A0A098]">‹</span>
                                <span className="font-mono text-[10px] font-bold" style={{ color: '#9A5A48' }}>Week 16</span>
                                <span className="text-[9px] text-[#A0A098]">›</span>
                              </div>
                              {/* Day columns header */}
                              <div className="grid grid-cols-5 text-[8px] border-b border-[#E6E4E0]">
                                {[
                                  { day: 'Ma', date: '14/4', weather: '14°', icon: '☀' },
                                  { day: 'Di', date: '15/4', weather: '12°', icon: '⛅' },
                                  { day: 'Wo', date: '16/4', weather: '9°', icon: '☁' },
                                  { day: 'Do', date: '17/4', weather: '16°', icon: '☀' },
                                  { day: 'Vr', date: '18/4', weather: '13°', icon: '⛅' },
                                ].map((d) => (
                                  <div key={d.day} className="px-1.5 py-1.5 border-l border-[#E6E4E0] first:border-l-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono uppercase text-[#A0A098]">{d.day} <span className="text-[#191919]">{d.date}</span></span>
                                    </div>
                                    <span className="text-[7px] text-[#A0A098]">{d.icon} {d.weather}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Monteur rows */}
                              {[
                                {
                                  name: 'Mark Visser', initials: 'MV', color: '#1A535C', sub: '2 deze week',
                                  slots: [
                                    { title: 'Gevelreclame LED', client: 'Bakker BV', time: '08:00 – 16:00', bg: '#E2F0F0', border: '#1A535C' },
                                    { title: 'Gevelreclame LED', client: 'Bakker BV', time: '08:00 – 12:00', bg: '#E2F0F0', border: '#1A535C' },
                                    null, null, null,
                                  ],
                                },
                                {
                                  name: 'Rick Kuiper', initials: 'RK', color: '#F15025', sub: '2 deze week',
                                  slots: [
                                    null, null,
                                    { title: 'Autobelettering', client: 'Van Dijk Transport', time: '09:00 – 17:00', bg: '#FDE8E2', border: '#F15025' },
                                    null,
                                    { title: 'Reclamezuil', client: 'Sporthal Oost', time: '08:00 – 14:00', bg: '#FDE8E2', border: '#F15025' },
                                  ],
                                },
                                {
                                  name: 'Sophie Dekker', initials: 'SD', color: '#2D6B48', sub: '1 deze week',
                                  slots: [
                                    null, null, null,
                                    { title: 'Raambelettering', client: 'Kapsalon Fris', time: '10:00 – 15:00', bg: '#E4F0EA', border: '#2D6B48' },
                                    null,
                                  ],
                                },
                              ].map((monteur) => (
                                <div key={monteur.initials} className="grid grid-cols-[100px_1fr] border-b border-[#E6E4E0] last:border-b-0">
                                  <div className="px-3 py-3 flex items-start gap-2 border-r border-[#E6E4E0]">
                                    <span className="w-5 h-5 rounded-full text-[7px] font-bold flex items-center justify-center text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: monteur.color }}>{monteur.initials}</span>
                                    <div>
                                      <p className="text-[9px] font-semibold text-[#191919] leading-tight">{monteur.name}</p>
                                      <p className="text-[7px] text-[#A0A098]">{monteur.sub}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-5">
                                    {monteur.slots.map((slot, si) => (
                                      <div key={si} className="px-1 py-2 border-l border-[#E6E4E0] first:border-l-0 min-h-[52px]">
                                        {slot && (
                                          <div className="rounded-md px-1.5 py-1 text-[7px]" style={{ backgroundColor: slot.bg, borderLeft: `2px solid ${slot.border}` }}>
                                            <p className="font-semibold text-[#191919] truncate">{slot.title}</p>
                                            <p className="text-[#5A5A55] truncate">{slot.client}</p>
                                            <p className="text-[#1A535C] mt-0.5">{slot.time}</p>
                                            <div className="flex gap-0.5 mt-0.5">
                                              <span className="text-[6px] font-bold text-[#1A535C]">{monteur.initials}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {/* Footer */}
                              <div className="px-3 py-1.5 border-t border-[#E6E4E0] bg-[#FAFAF8]">
                                <span className="text-[8px] text-[#A0A098]">5 montages deze week</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <Image
                            src={overlay.image}
                            alt={overlay.alt}
                            width={overlay.w}
                            height={overlay.h}
                            className="w-full h-auto rounded-xl"
                            style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5)) drop-shadow(0 8px 25px rgba(241,80,37,0.15))' }}
                          />
                          <div className="absolute -bottom-3 right-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#F15025' }}>
                            <span className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase text-white">{overlay.label}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>}

            {/* Prev/Next module arrows */}
            {showHero && (
              <>
                <Link
                  href={`/features/${prevModule.id}`}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 group"
                >
                  <motion.div
                    className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300"
                    whileHover={{ x: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </div>
                    <span className="hidden md:block font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-white/50 group-hover:text-white/80 transition-colors duration-300">
                      {prevModule.name}
                    </span>
                  </motion.div>
                </Link>
                <Link
                  href={`/features/${nextModule.id}`}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 group"
                >
                  <motion.div
                    className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300"
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <span className="hidden md:block font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-white/50 group-hover:text-white/80 transition-colors duration-300">
                      {nextModule.name}
                    </span>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </motion.div>
                </Link>
              </>
            )}

            {/* Bottom fade into page */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20" style={{ background: 'linear-gradient(to top, #0D2B30 0%, transparent 100%)' }} />

            {/* Spectrum bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] z-30" style={{ background: 'linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%)' }} />
          </div>

          {/* Three pillars section */}
          {heroConfig!.pillars && <div style={{ background: '#0D2B30' }}>
            <div className="container-site py-16 md:py-24">
              <SectionReveal>
                <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-center mb-3" style={{ color: '#F15025' }}>
                  {heroConfig!.pillarsTitle}
                </p>
                <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-white tracking-[-1.5px] text-center mb-14 md:mb-20">
                  {heroConfig!.pillarsHeading![0]}<span className="text-flame">.</span> {heroConfig!.pillarsHeading![1]}<span className="text-flame">.</span>
                </h2>
              </SectionReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                {heroConfig!.pillars.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="rounded-xl overflow-hidden h-[280px] md:h-[320px] flex items-center justify-center p-8"
                      style={{ backgroundColor: '#143F46' }}
                    >
                      <Image
                        src={item.image}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        className="w-full h-full object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                      />
                    </div>
                    <div className="mt-5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>
                        {item.label}
                      </p>
                      <h3 className="text-[17px] md:text-[19px] font-bold text-white tracking-tight mt-1.5">
                        {item.title}<span className="text-flame">.</span>
                      </h3>
                      <p className="text-[13px] md:text-[14px] leading-[1.7] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA onder pijlers */}
              <motion.div
                className="mt-14 md:mt-20 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  href="/aanmelden"
                  className="inline-flex items-center gap-2 text-white font-semibold text-[14px] px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  style={{ backgroundColor: '#F15025' }}
                >
                  Schrijf je in
                  <span className="text-[16px]">→</span>
                </a>
                <p className="text-[12px] mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  30 dagen gratis. Geen creditcard nodig.
                </p>
              </motion.div>
            </div>
          </div>}

          {/* Werktekening section — only for offertes */}
          {moduleSlug === 'offertes' && (
            <WerktekeningSection />
          )}

          {/* Portaal demo — only for portaal */}
          {moduleSlug === 'portaal' && (
            <PortaalDemo />
          )}

          {/* Visualizer flow — input → processing → output */}
          {moduleSlug === 'visualizer' && (
            <div style={{ background: 'linear-gradient(180deg, #0D2B30 0%, #1A1A18 100%)' }}>
              <div className="container-site py-16 md:py-24">
                <SectionReveal>
                  <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.3em] uppercase text-center mb-3" style={{ color: '#F15025' }}>
                    Hoe het werkt
                  </p>
                  <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-white tracking-[-1.5px] text-center mb-14 md:mb-20">
                    Foto erin<span className="text-flame">.</span> Visualisatie eruit<span className="text-flame">.</span>
                  </h2>
                </SectionReveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
                  {/* Input */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="rounded-xl p-6 h-[200px] md:h-[220px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, rgba(241,80,37,0.12), rgba(241,80,37,0.04))' }}>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(241,80,37,0.15)' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F15025" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                        <p className="text-[13px] font-bold text-white">Upload je foto</p>
                        <p className="text-[11px] text-white/40 mt-1">Bus, gevel, pand of schets</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>Input</p>
                      <h3 className="text-[17px] md:text-[19px] font-bold text-white tracking-tight mt-1.5">
                        Foto en beschrijving<span className="text-flame">.</span>
                      </h3>
                      <p className="text-[13px] md:text-[14px] leading-[1.7] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Upload een foto van het voertuig, de gevel of het pand. Beschrijf wat je wilt zien. Kies de ratio en resolutie.
                      </p>
                    </div>
                  </motion.div>

                  {/* Processing */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="rounded-xl p-6 h-[200px] md:h-[220px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, rgba(26,83,92,0.15), rgba(26,83,92,0.05))' }}>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(26,83,92,0.2)' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <p className="text-[13px] font-bold text-white">Daan verwerkt</p>
                        <p className="text-[11px] text-white/40 mt-1">Claude + Gemini</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>Processing</p>
                      <h3 className="text-[17px] md:text-[19px] font-bold text-white tracking-tight mt-1.5">
                        Daan maakt het visueel<span className="text-flame">.</span>
                      </h3>
                      <p className="text-[13px] md:text-[14px] leading-[1.7] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Daan verbetert je prompt, kiest de juiste stijl en genereert een realistische visualisatie. Binnen seconden klaar.
                      </p>
                    </div>
                  </motion.div>

                  {/* Output */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="rounded-xl p-6 h-[200px] md:h-[220px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, rgba(241,80,37,0.12), rgba(45,107,72,0.08))' }}>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(45,107,72,0.15)' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6B48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                        <p className="text-[13px] font-bold text-white">Klaar. Delen.</p>
                        <p className="text-[11px] text-white/40 mt-1">Download, deel of regenereer</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <p className="font-mono text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#F15025' }}>Output</p>
                      <h3 className="text-[17px] md:text-[19px] font-bold text-white tracking-tight mt-1.5">
                        Delen via het portaal<span className="text-flame">.</span>
                      </h3>
                      <p className="text-[13px] md:text-[14px] leading-[1.7] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Koppel de visualisatie aan je project of offerte. Deel het via het klantportaal. Je klant ziet het resultaat voordat je begint.
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                  className="mt-14 md:mt-20 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <a
                    href="/aanmelden"
                    className="inline-flex items-center gap-2 text-white font-semibold text-[14px] px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    style={{ backgroundColor: '#F15025' }}
                  >
                    Schrijf je in
                    <span className="text-[16px]">→</span>
                  </a>
                  <p className="text-[12px] mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    10 credits inbegrepen. Bijkopen wanneer je wilt.
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="pb-10 md:pb-14">
          <div className="container-site text-center">
            <SectionReveal>
              <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase text-flame mb-4">8 modules. Eén systeem.</p>
              <h1 className="font-heading text-[40px] md:text-[56px] font-bold text-petrol tracking-[-2.5px] leading-[0.95] mb-5">
                Niet erover praten<span className="text-flame">.</span><br />
                <span className="text-petrol/40">Gewoon</span> doen<span className="text-flame">.</span>
              </h1>
              <p className="text-[17px] max-w-lg mx-auto leading-relaxed" style={{ color: '#6B6B66' }}>
                Elke module is gebouwd voor hoe jij werkt. Van eerste klantvraag tot oplevering. Klik op een module en ontdek wat erin zit.
              </p>
            </SectionReveal>
          </div>
        </section>
      )}

      {/* Module thumbnail grid */}
      <section className="bg-white pt-4 pb-0">
        <div className="container-site">
          <div
            ref={scrollRef}
            className="flex justify-center gap-3 md:gap-4 flex-wrap pb-8"
          >
            {modules.map((m, i) => (
              <Link
                key={m.id}
                href={`/features/${m.id}`}
                className={`transition-all duration-300 ${
                  activeModule === i ? 'scale-100' : 'scale-[0.97] opacity-50 hover:opacity-75'
                }`}
              >
                <div className="w-[72px] md:w-[88px] rounded-xl overflow-hidden transition-all duration-300"
                  style={activeModule === i ? { boxShadow: `0 0 0 2px ${m.color}, 0 4px 16px ${m.color}15` } : {}}
                >
                  <Image
                    src={m.image}
                    alt={m.name}
                    width={200}
                    height={200}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <p className={`text-[10px] md:text-[11px] mt-1.5 font-semibold transition-colors duration-300 ${
                  activeModule === i ? '' : 'text-[#9B9B95]'
                }`} style={activeModule === i ? { color: m.color } : {}}>
                  {m.name}<span style={{ color: m.color }}>.</span>
                </p>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: '#EBEBEB' }} />
        </div>
      </section>

      {/* Active module content */}
      <section className="py-16 md:py-24" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF7 30%, #FAFAF7 100%)' }}>
        <div className="container-site">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left: illustration */}
                <div>
                  <Image
                    src={mod.image}
                    alt={mod.name}
                    width={1000}
                    height={1000}
                    className="w-full max-w-md mx-auto h-auto"
                  />
                </div>

                {/* Right: content */}
                <div>
                  <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: mod.color }}>
                    {mod.name}
                  </span>
                  <h2 className="font-heading text-[32px] md:text-[40px] font-bold text-petrol tracking-[-1.5px] leading-[1.05] mt-2 mb-5">
                    {mod.headline.split('.').filter(Boolean).map((part, i, arr) => (
                      <span key={i}>
                        {part.trim()}
                        {i < arr.length - 1 && <span className="text-flame">.</span>}
                        {i < arr.length - 1 && ' '}
                      </span>
                    ))}
                    <span className="text-flame">.</span>
                  </h2>
                  <p className="text-[16px] leading-[1.7] mb-8" style={{ color: '#6B6B66' }}>
                    {mod.description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-3.5">
                    {mod.highlights.map((h, i) => (
                      <motion.li
                        key={h}
                        className="flex items-start gap-3 text-[14px]"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: mod.color }} />
                        <span style={{ color: '#1A1A1A' }}>{h}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <a
                    href="/aanmelden"
                    className="inline-flex items-center gap-2 font-semibold text-[14px] px-6 py-3 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] mt-8 text-white"
                    style={{ backgroundColor: mod.color }}
                  >
                    Schrijf je in
                    <span className="text-[16px]">→</span>
                  </a>
                </div>
              </div>

              {/* Detail section */}
              <motion.div
                className="mt-14 md:mt-20 bg-white rounded-2xl p-8 md:p-10 border border-[#E6E4E0]/60"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}12` }}>
                    <span className="font-mono text-[13px] font-bold" style={{ color: mod.color }}>i</span>
                  </div>
                  <h3 className="font-heading text-[18px] md:text-[20px] font-bold text-petrol tracking-tight">
                    Zo doe je het met doen<span className="text-flame">.</span>
                  </h3>
                </div>
                <p className="text-[15px] leading-[1.8] max-w-3xl" style={{ color: '#6B6B66' }}>
                  {mod.detail}
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container-site">
          <SectionReveal>
            <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] text-center mb-4">
              Vragen<span className="text-flame">?</span> Gewoon doen<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-center max-w-md mx-auto mb-12" style={{ color: '#6B6B66' }}>
              Alles wat je wilt weten voordat je begint.
            </p>
          </SectionReveal>
          <div className="max-w-2xl mx-auto space-y-0">
            {faq.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 md:pb-32">
        <div className="container-site">
          <div className="rounded-2xl p-10 md:p-14 text-center" style={{ backgroundColor: '#1A535C' }}>
            <p className="text-[13px] text-flame font-semibold mb-3 tracking-wide">Binnenkort live</p>
            <h2 className="font-heading text-[24px] md:text-[32px] font-bold text-white tracking-tight mb-3">
              Schrijf je in voor early access<span className="text-flame">.</span>
            </h2>
            <p className="text-[15px] text-white/40 max-w-md mx-auto mb-8">
              Alles zit erin. Geen add-ons. We mailen je zodra doen. live gaat.
            </p>
            <div className="flex justify-center">
              <WachtlijstForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
