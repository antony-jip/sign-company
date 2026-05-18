'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import {
  LayoutGrid, Folder, Users, FileText, Receipt, FileSignature, CheckSquare,
  ClipboardCheck, Calendar, Mail, Wallet, Search, Bell, Sun, CloudRain, CloudSun,
  Sparkles, Send, DollarSign, Eye, Upload, Plus, Download, AlertCircle,
  Activity, CheckCircle2, ArrowUpRight, Wrench, ChevronRight, Image as ImageIcon,
  Pencil, Camera, Inbox, Archive, Paperclip, Pin, Clock, FileEdit, Trash2,
  CalendarClock, ArrowLeft, MoreHorizontal, Copy, ChevronDown, ChevronsRight,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import SerifItalic from '@/components/SerifItalic'

const PETROL = '#1A535C'
const PETROL_DEEP = '#0F3A42'
const FLAME = '#F15025'
const INK = '#1A1A1A'
const MUTED = '#6B6B66'
const LINE = 'rgba(26,83,92,0.08)'
const BG = '#F8F7F5'
const CARD = '#FFFFFF'

type View = 'dashboard' | 'projecten' | 'detail' | 'klanten' | 'offerte' | 'email' | 'factuur' | 'inkoop' | 'taken' | 'planning'

type NavItem = { icon: LucideIcon; label: string; activeOn: View[] }
const nav: NavItem[] = [
  { icon: LayoutGrid, label: 'Dashboard', activeOn: ['dashboard'] },
  { icon: Folder, label: 'Projecten', activeOn: ['projecten', 'detail'] },
  { icon: Users, label: 'Klanten', activeOn: ['klanten'] },
  { icon: FileText, label: 'Offertes', activeOn: ['offerte'] },
  { icon: Receipt, label: 'Facturen', activeOn: ['factuur'] },
  { icon: FileSignature, label: 'Inkoopfacturen', activeOn: ['inkoop'] },
  { icon: CheckSquare, label: 'Taken', activeOn: ['taken'] },
  { icon: ClipboardCheck, label: 'Werkbonnen', activeOn: [] },
  { icon: Calendar, label: 'Planning', activeOn: ['planning'] },
  { icon: Mail, label: 'Email', activeOn: ['email'] },
  { icon: Wallet, label: 'Financieel', activeOn: [] },
]

export default function AppShowcase() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [view, setView] = useState<View>('dashboard')

  return (
    <section ref={ref} className="relative" style={{ backgroundColor: '#F3F2ED' }}>
      <div className="container-site relative py-20 md:py-28">

        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-10 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px" style={{ backgroundColor: FLAME }} />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: MUTED }}>
              Dit is doen.
            </span>
          </div>
          <h2
            className="font-heading font-bold tracking-[-1px] md:tracking-[-2.5px] leading-[1.0] md:leading-[0.95] mb-5"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)', color: PETROL }}
          >
            Stop met scrollen<span style={{ color: FLAME }}>.</span>{' '}
            <span style={{ color: MUTED }}>
              Ga <SerifItalic>klikken</SerifItalic>
              <span style={{ color: FLAME }}>.</span>
            </span>
          </h2>
          <p className="text-[15px] md:text-[18px] leading-[1.6] max-w-xl" style={{ color: '#3F3F3A' }}>
            <span className="md:hidden">Negen schermen. Geen mockup. Het echte werk.</span>
            <span className="hidden md:inline">
              Negen schermen, allemaal echt. Wissel tussen dashboard, projecten, offerte, mail, factuur, planning en taken — geen mockup, geen video, het ding zelf.
            </span>
          </p>
        </motion.div>

        {/* TOGGLE — view switcher */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-5 md:mb-6 flex p-1 rounded-full overflow-x-auto max-w-full"
          style={{
            backgroundColor: CARD,
            border: `1px solid ${LINE}`,
            boxShadow: '0 1px 2px rgba(20,40,40,0.04)',
            width: 'fit-content',
          }}
          role="tablist"
        >
          {([
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'projecten', label: 'Projecten' },
            { id: 'detail', label: 'Project-detail' },
            { id: 'klanten', label: 'Klanten' },
            { id: 'offerte', label: 'Offerte' },
            { id: 'email', label: 'Email' },
            { id: 'factuur', label: 'Factuur' },
            { id: 'inkoop', label: 'Inkoopfacturen' },
            { id: 'taken', label: 'Taken' },
            { id: 'planning', label: 'Planning' },
          ] as { id: View; label: string }[]).map((t) => {
            const active = view === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setView(t.id)}
                className="relative px-4 md:px-5 h-9 inline-flex items-center text-[12px] md:text-[13px] font-semibold rounded-full transition-colors"
                style={{
                  color: active ? '#FFFFFF' : MUTED,
                  backgroundColor: active ? PETROL : 'transparent',
                }}
              >
                {t.label}
                <span style={{ color: active ? FLAME : 'transparent' }}>.</span>
              </button>
            )
          })}
        </motion.div>

        {/* App shell — browser frame */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[16px] overflow-hidden mx-auto"
          style={{
            backgroundColor: BG,
            border: `1px solid ${LINE}`,
            boxShadow: '0 4px 10px rgba(20,40,40,0.05), 0 36px 80px -20px rgba(19,62,69,0.22)',
            maxWidth: 1240,
          }}
        >
          {/* Browser bar */}
          <div
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ backgroundColor: '#F0EEE8', borderBottom: `1px solid ${LINE}` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E5A4A4' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E5CFA4' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A4D9B8' }} />
            </div>
            <div
              className="flex-1 mx-3 px-3 py-1 rounded-full font-mono text-[10px] md:text-[11px] tracking-wide hidden sm:block"
              style={{ backgroundColor: BG, color: MUTED, border: `1px solid ${LINE}` }}
            >
              app.doen.team / {
                view === 'dashboard' ? 'dashboard'
                : view === 'projecten' ? 'projecten'
                : view === 'detail' ? 'projecten / PRJ-2026-044'
                : view === 'klanten' ? 'klanten'
                : view === 'offerte' ? 'offertes / OFF-2026-236'
                : view === 'email' ? 'email / inbox'
                : view === 'factuur' ? 'facturen / 2026234'
                : view === 'inkoop' ? 'inkoopfacturen'
                : view === 'taken' ? 'taken / week-21'
                : 'planning / week-21'
              }
            </div>
          </div>

          {/* Top nav (modules) */}
          <TopNav view={view} setView={setView} />

          {/* Sub-tab strip */}
          <SubTabs view={view} setView={setView} />

          {/* CONTENT */}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {view === 'dashboard' && <DashboardView setView={setView} />}
              {view === 'projecten' && <ProjectenView setView={setView} />}
              {view === 'detail' && <ProjectDetailView setView={setView} />}
              {view === 'klanten' && <KlantenView />}
              {view === 'offerte' && <OfferteView />}
              {view === 'email' && <EmailView />}
              {view === 'factuur' && <FactuurView />}
              {view === 'inkoop' && <InkoopView />}
              {view === 'taken' && <TakenView />}
              {view === 'planning' && <PlanningView />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Pinpoints — wat kan je op deze tab */}
        <FeatureList view={view} />
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────
   FEATURE LIST — what you can do in this view
   ────────────────────────────────────────────────────────────── */

const viewMeta: Record<View, { titel: string; sub: string; bullets: string[] }> = {
  dashboard: {
    titel: 'Dashboard',
    sub: 'In één oogopslag zie je waar je aan moet werken vandaag.',
    bullets: [
      'Welcome-card met datum, weer en 5-daagse forecast voor je montages',
      'Daan AI suggereert direct waar je vandaag op moet letten',
      'Live cijfers: openstaande pijplijn, deze week verzonden, te factureren',
      'Vandaag-blok met taken die op je wachten + verantwoordelijke',
      'Opvolg-blok: offertes zonder reactie met bedrag en wachttijd',
      'Activiteit-stream van team en klantportaal in real-time',
    ],
  },
  projecten: {
    titel: 'Projecten',
    sub: 'Alle lopende opdrachten op één plek, gesorteerd zoals jij wil.',
    bullets: [
      'Filter per status: actief, gepland, in review, te factureren, on-hold',
      'Filter op leeftijd: hoe lang staat een project al open?',
      'Groepeer per status, klant of geen groepering',
      'Status-KPI cards bovenaan: met aandacht, actief, te factureren, afgerond',
      'Zoek per project, klantnaam of project-nummer',
      'Importeer in bulk vanuit Excel of CSV',
      'Exporteer selectie naar CSV of Excel',
    ],
  },
  detail: {
    titel: 'Project-detail',
    sub: 'De cockpit van één opdracht. Hier komt alles samen.',
    bullets: [
      'Briefing-veld met Daan AI suggesties voor specs en aanpak',
      'Taken per project met deadline en verantwoordelijke',
      'Gekoppelde offertes en concept-versies in één klik',
      'Actie-blok: offerte versturen, werkbon maken, montage inplannen, factureren',
      'Klantportaal in één klik delen — geen inlog voor je klant',
      'Bestanden en situatiefoto&apos;s uploaden of slepen',
      'Mail-knop direct naar contactpersoon, met project-context',
      'Volledige activiteit-timeline: wie deed wat, wanneer',
    ],
  },
  klanten: {
    titel: 'Klanten',
    sub: 'Je hele klantenbestand op één plek, met status, labels en projecthistorie.',
    bullets: [
      'KPI-cards: met aandacht, actief, prospect, inactief',
      'Filter op status, labels (vooruit betalen, niet helpen, voorrang, grote klant, wanbetaler)',
      'Filter op statussen (normaal, geblokkeerd, voorrang)',
      'Zoek op naam, email, stad of tag',
      'Sorteer op naam, stad, status of datum',
      'Per klant: contactpersonen, projecten, openstaand bedrag, communicatie',
      'Importeer in bulk vanuit Excel of CSV',
      'Export naar CSV of Excel',
    ],
  },
  offerte: {
    titel: 'Offerte',
    sub: 'Bouw je offerte zoals jij rekent — met inkoop, marge en tekening per regel.',
    bullets: [
      'Eigen items met velden voor aantal, materiaal, afmeting, montage en lay-out',
      'Inkoopprijs + marge = automatisch je verkoopprijs',
      'Tekening of bijlage per item, klant ziet alles in PDF en portaal',
      'Live margecalculatie: inkoop, verkoop, winst en marge%',
      'Klant tekent digitaal via klantportaal — direct project',
      'Verstuur als PDF, mail of klantportaal-link',
      'Versioning: oude offerte-versies blijven bewaard',
      'Templates voor terugkerende producten of pakketten',
    ],
  },
  email: {
    titel: 'Email',
    sub: 'Je eigen zakelijke mailbox, slim gekoppeld aan klanten en projecten.',
    bullets: [
      'IMAP/SMTP-koppeling met je eigen domein per gebruiker',
      'Mails worden automatisch aan klant en project gekoppeld',
      'Opvolgen-vlag voor mails waar nog geen antwoord op kwam',
      'Daan vat lange mails samen in 2 zinnen',
      'Focus-modus voor diep werk: alleen ongelezen en gevlagd',
      'Sjablonen voor herhaal-antwoorden (offerte-akkoord, drukproef etc.)',
      'Inplannen voor later versturen',
      'Zoek door bijlagen en threads, niet alleen onderwerp',
    ],
  },
  factuur: {
    titel: 'Factuur',
    sub: 'Van offerte naar factuur in één klik. Betaling en boekhouding meegekoppeld.',
    bullets: [
      'Eén klik vanuit een goedgekeurde offerte — alle regels overgenomen',
      'Mollie-betaallink automatisch in de mail (iDEAL, creditcard)',
      'Automatische herinneringen op dag 7, 14 en 30 — in jouw toon',
      'Door naar Exact Online (one-way) zodat je boekhouder hem ook ziet',
      'Markeer handmatig &quot;Betaald&quot; zodra je geld binnen ziet',
      'PDF-export of mailen via doen.',
      'Btw-percentage en grootboek per regel instelbaar',
    ],
  },
  inkoop: {
    titel: 'Inkoopfacturen',
    sub: 'Leveranciers mailen hun PDF, Daan leest hem uit, jij keurt goed.',
    bullets: [
      'Aparte inkoop-inbox per organisatie — leverancier mailt direct',
      'Daan leest leverancier, factuurnummer, datum, regels en BTW uit',
      'Status-flow: Nieuw → Te reviewen → Goedgekeurd → Afgewezen',
      'Goedkeuren met één klik, of vraag om aanpassing',
      'Synchroniseer goedgekeurde facturen door naar Exact Online',
      'Filter op leverancier, status of bedrag',
      'KPI&apos;s: openstaand, deze maand, wachtend op goedkeuring',
    ],
  },
  taken: {
    titel: 'Taken',
    sub: 'Alle losse to-do&apos;s naast de montage — per project of per klant.',
    bullets: [
      'Voor al het werk náást de planning (opvolgen, inkoop, drukproef, bestellen)',
      'Per project of per klant koppelen — automatisch in de context',
      'Toewijzen aan teamlid met deadline',
      'Week- of maandweergave, of per persoon',
      'Filter op Alle, Project, Los of speciale labels (Montage etc.)',
      'Afvinken in de kalender — direct gesynct met activiteit-log',
      'Notificaties bij wijziging of vervaldatum',
    ],
  },
  planning: {
    titel: 'Planning',
    sub: 'Sleep een project naar een dag. Werkbon, route en weer komen automatisch mee.',
    bullets: [
      'Drag-and-drop projecten naar dagen — per monteur of per ploeg',
      'Werkbon wordt automatisch aangemaakt met alle offerteregels',
      'Weerbericht en regen-waarschuwing per dag voor buitenmontages',
      'Conflict-waarschuwing bij dubbele boeking van monteur of materiaal',
      'Werkbon op telefoon van monteur: route, uren, foto&apos;s, handtekening',
      'Print- of mail-vriendelijke weekplanning',
      'Filter op Iedereen, Mijn week of een specifieke monteur',
    ],
  },
}

function FeatureList({ view }: { view: View }) {
  const meta = viewMeta[view]
  return (
    <div className="mt-12 md:mt-16 max-w-[1240px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-12 items-start"
        >
          {/* Left: title + sub */}
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-6 h-px" style={{ backgroundColor: FLAME }} />
              <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: MUTED }}>
                Wat je hier kunt doen
              </span>
            </div>
            <h3
              className="font-heading font-bold tracking-tight leading-[1.05] mb-3"
              style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', color: PETROL }}
            >
              {meta.titel}<span style={{ color: FLAME }}>.</span>
            </h3>
            <p className="text-[14px] md:text-[16px] leading-[1.6]" style={{ color: '#3F3F3A' }}>
              {meta.sub}
            </p>
          </div>

          {/* Right: bullets in 2 columns */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 md:gap-x-8 gap-y-2.5">
            {meta.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13px] md:text-[14px] leading-[1.5]"
                style={{ color: INK }}
              >
                <span
                  className="w-4 h-4 rounded-[4px] inline-flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(241,80,37,0.10)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} />
                </span>
                <span dangerouslySetInnerHTML={{ __html: b.replace(/&apos;/g, "'").replace(/&quot;/g, '"') }} />
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   APP CHROME — Top nav + Sub-tabs
   ────────────────────────────────────────────────────────────── */

function TopNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div
      className="flex items-center gap-1 md:gap-2 px-4 md:px-6 pt-4 pb-0 overflow-x-auto"
      style={{ borderBottom: `1px solid ${LINE}` }}
    >
      <button
        type="button"
        onClick={() => setView('dashboard')}
        className="font-heading font-bold text-[20px] tracking-tighter mr-4 md:mr-6 shrink-0 cursor-pointer"
        style={{ color: PETROL }}
      >
        doen<span style={{ color: FLAME }}>.</span>
      </button>
      <div className="hidden lg:flex items-center gap-1 flex-1 overflow-hidden">
        {nav.map((item) => <NavTab key={item.label} item={item} view={view} setView={setView} compact={false} />)}
      </div>
      <div className="flex lg:hidden items-center gap-1 flex-1 overflow-hidden">
        {nav.slice(0, 5).map((item) => <NavTab key={item.label} item={item} view={view} setView={setView} compact={true} />)}
      </div>
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md mr-2 ml-auto"
        style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: '#9B9B95' }} />
        <span className="font-mono text-[11px]" style={{ color: '#9B9B95' }}>Zoeken…</span>
      </div>
      <Bell className="hidden md:block w-4 h-4 mr-2" style={{ color: MUTED }} strokeWidth={1.8} />
      <span
        className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full shrink-0"
        style={{ border: `1px solid ${LINE}` }}
      >
        <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[10px] font-bold text-white" style={{ backgroundColor: PETROL }}>J</span>
        <span className="text-[12px] font-semibold hidden md:inline" style={{ color: INK }}>Jan</span>
      </span>
    </div>
  )
}

function NavTab({ item, view, setView, compact }: { item: NavItem; view: View; setView: (v: View) => void; compact: boolean }) {
  const Icon = item.icon
  const active = item.activeOn.includes(view)
  const target: View | null = item.activeOn[0] ?? null
  return (
    <button
      type="button"
      onClick={() => target && setView(target)}
      disabled={!target}
      className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 text-[11px]' : 'px-2.5 text-[12px]'} pt-2 pb-3 -mb-px font-semibold whitespace-nowrap transition-colors ${target ? 'cursor-pointer hover:text-[#1A535C]' : 'cursor-not-allowed opacity-60'}`}
      style={{
        color: active ? INK : '#6B6B66',
        borderBottom: active ? `2px solid ${PETROL}` : '2px solid transparent',
      }}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={active ? 2.4 : 1.8} />
      {item.label}<span style={{ color: FLAME }}>.</span>
    </button>
  )
}

function SubTabs({ view, setView }: { view: View; setView: (v: View) => void }) {
  type Tab = { t: string; active?: boolean; goto?: View }
  const tabs: Tab[] =
    view === 'dashboard'
      ? [{ t: 'Offertes', goto: 'offerte' }, { t: 'Klanten' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Dashboard', active: true }]
      : view === 'projecten'
      ? [{ t: 'Offertes', goto: 'offerte' }, { t: 'Klanten' }, { t: 'Dashboard', goto: 'dashboard' }, { t: 'Projecten', active: true }]
      : view === 'detail'
      ? [{ t: 'Dashboard', goto: 'dashboard' }, { t: 'Projecten', goto: 'projecten' }, { t: 'PRJ-2026-044', active: true }]
      : view === 'klanten'
      ? [{ t: 'Offertes', goto: 'offerte' }, { t: 'Dashboard', goto: 'dashboard' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Klanten', active: true }]
      : view === 'offerte'
      ? [{ t: 'Klanten' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Facturen', goto: 'factuur' }, { t: 'Offerte', active: true }]
      : view === 'email'
      ? [{ t: 'Offertes', goto: 'offerte' }, { t: 'Klanten' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Email', active: true }]
      : view === 'factuur'
      ? [{ t: 'Dashboard', goto: 'dashboard' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Facturen', goto: 'factuur' }, { t: 'FAC-2026234', active: true }]
      : view === 'inkoop'
      ? [{ t: 'Dashboard', goto: 'dashboard' }, { t: 'Facturen', goto: 'factuur' }, { t: 'Inkoopfacturen', active: true }]
      : view === 'taken'
      ? [{ t: 'Dashboard', goto: 'dashboard' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Planning', goto: 'planning' }, { t: 'Taken', active: true }]
      : [{ t: 'Offertes', goto: 'offerte' }, { t: 'Klanten' }, { t: 'Projecten', goto: 'projecten' }, { t: 'Facturen', goto: 'factuur' }, { t: 'Planning', active: true }]

  return (
    <div className="flex items-center gap-5 px-4 md:px-6 pt-3 pb-3 overflow-x-auto" style={{ borderBottom: `1px solid ${LINE}` }}>
      {tabs.map((t) => (
        <button
          key={t.t}
          type="button"
          onClick={() => t.goto && setView(t.goto)}
          disabled={t.active || !t.goto}
          className={`text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${t.active ? 'cursor-default' : t.goto ? 'cursor-pointer hover:text-[#1A1A1A]' : 'cursor-not-allowed'}`}
          style={{ color: t.active ? INK : '#9B9B95' }}
        >
          {t.t}
          {t.active && <span className="text-[14px] leading-none">×</span>}
        </button>
      ))}
      <span className="font-mono text-[14px] font-bold" style={{ color: '#C8C8C0' }}>+</span>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   DASHBOARD VIEW
   ────────────────────────────────────────────────────────────── */

const forecast = [
  { d: 'Morgen', t: '14°', icon: CloudRain },
  { d: 'Overmorgen', t: '16°', icon: CloudRain },
  { d: 'do 21', t: '18°', icon: CloudRain },
  { d: 'vr 22', t: '22°', icon: CloudSun },
  { d: 'za 23', t: '25°', icon: CloudSun },
]

const opvolgen = [
  { naam: 'Jansen Bouw',          ref: 'OFF-2026-019', bedrag: '€ 1.960,20', dagen: '13 dagen.' },
  { naam: 'Bakkerij Steeg',       ref: 'OFF-2026-157', bedrag: '€ 744,39',   dagen: '7 dagen.'  },
  { naam: 'De Vries Reclame',     ref: 'OFF-2026-162', bedrag: '€ 6.392,43', dagen: '6 dagen.'  },
  { naam: 'Kemper B.V.',          ref: 'OFF-2026-163', bedrag: '€ 7.929,71', dagen: '5 dagen.'  },
  { naam: 'Atelier 9',            ref: 'OFF-2026-160', bedrag: '€ 65,34',    dagen: '5 dagen.'  },
]

const activiteit: { icon: LucideIcon; titel: string; sub: string; tijd: string }[] = [
  { icon: Send,       titel: 'Offerte verstuurd', sub: 'Van Meer & Co',  tijd: 'ongeveer 7 uur'  },
  { icon: DollarSign, titel: 'Factuur betaald',   sub: 'De Wit Bouw',    tijd: 'ongeveer 18 uur' },
  { icon: Send,       titel: 'Offerte verstuurd', sub: 'Groenland BV',   tijd: '3 dagen'         },
  { icon: Eye,        titel: 'Offerte bekeken',   sub: 'Café De Zon',    tijd: '5 dagen'         },
]

const gedaan = [
  { wie: 'MV', naam: 'Mark',   wat: 'Montage afgerond · Bakkerij Steeg',   tijd: 'ongeveer 5 uur' },
  { wie: 'SH', naam: 'Sven',   wat: 'Montage afgerond · Van Meer & Co',    tijd: 'ongeveer 6 uur' },
  { wie: 'JV', naam: 'Jeroen', wat: 'Montage afgerond · De Vries Reclame', tijd: 'ongeveer 6 uur' },
]

function DashboardView({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 p-4 md:p-6">
      <div className="space-y-4 md:space-y-5">

        {/* Welcome hero card */}
        <div
          className="rounded-[14px] p-5 md:p-7 relative overflow-hidden grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-5"
          style={{ backgroundColor: PETROL_DEEP, color: '#FFFFFF' }}
        >
          <div className="relative">
            <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: '#A8C5C8' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: FLAME }} />
              Maandag 18 mei
            </p>
            <h3 className="font-heading font-bold tracking-[-1px] leading-[1.05]" style={{ fontSize: 'clamp(22px, 2.6vw, 36px)' }}>
              Klaar om te <SerifItalic>afronden</SerifItalic>, Jan<span style={{ color: FLAME }}>.</span>
            </h3>
          </div>
          <div className="relative">
            <div className="flex items-end gap-3 mb-3">
              <Sun className="w-6 h-6" style={{ color: '#FFD584' }} />
              <span className="font-heading font-bold text-[40px] md:text-[52px] leading-none">13<span style={{ color: FLAME }}>°</span></span>
              <span className="text-[13px] mb-1.5 italic" style={{ color: '#A8C5C8', fontFamily: '"Instrument Serif", Georgia, serif' }}>
                Helder maar trui aan.
              </span>
            </div>
            <div className="flex items-end gap-3 md:gap-5 overflow-x-auto">
              {forecast.map((f, i) => {
                const Icon = f.icon
                return (
                  <div key={i} className="text-center shrink-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] mb-1.5" style={{ color: '#A8C5C8' }}>{f.d}</p>
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: '#A8C5C8' }} strokeWidth={1.8} />
                    <p className="text-[12px] font-semibold">{f.t}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div
            className="rounded-[12px] p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(150deg, #EEE8F5 0%, #FAFAF8 70%)', border: `1px solid ${LINE}` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(106,90,138,0.15)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#6A5A8A' }} strokeWidth={2} />
              </span>
              <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                doen<span style={{ color: FLAME }}>.</span>
              </span>
            </div>
            <p className="text-[13px] italic leading-snug mb-4" style={{ color: '#3F3F3A', fontFamily: '"Instrument Serif", Georgia, serif' }}>
              CSV erin slepen, Daan begrijpt &apos;m. Doe je zo.
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: '#6A5A8A' }}>Daan AI</span>
              <span className="font-mono text-[10px] tabular-nums" style={{ color: MUTED }}>07/33</span>
            </div>
            <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(106,90,138,0.15)' }}>
              <div className="h-full rounded-full" style={{ width: '21%', backgroundColor: '#6A5A8A' }} />
            </div>
          </div>

          <KpiCard label="In pijplijn" value="€ 34.040,54" sub="8 offertes" tone="#2D6B48" icon={<FileText className="w-3.5 h-3.5" />} />
          <KpiCard label="Deze week" value="€ 2.593,33" sub="22 montages" tone="#2D6B48" icon={<ClipboardCheck className="w-3.5 h-3.5" />} />
        </div>

        {/* Vandaag + Opvolgen */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3 md:gap-4">
          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-heading text-[18px] font-bold tracking-tight" style={{ color: INK }}>
                Vandaag<span style={{ color: FLAME }}>.</span>
                <span className="ml-2 text-[12px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>
                  wat staat er klaar
                </span>
              </p>
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: '#9B9B95' }}>2 taken</span>
            </div>
            {[
              { titel: 'Design bestanden maken', sub: 'Plafond signing' },
              { titel: 'Drukproef goedkeuren', sub: 'Van Meer & Co' },
            ].map((t) => (
              <button
                key={t.titel}
                type="button"
                onClick={() => setView('taken')}
                className="w-full flex items-center gap-3 py-3 text-left transition-colors cursor-pointer hover:bg-[rgba(26,83,92,0.03)] rounded-md -mx-1 px-1"
                style={{ borderTop: `1px solid ${LINE}` }}
              >
                <span className="w-7 h-7 rounded-[6px] inline-flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(45,107,72,0.10)' }}>
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2D6B48' }} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: INK }}>{t.titel}</p>
                  {t.sub && <p className="text-[11px]" style={{ color: MUTED }}>{t.sub}</p>}
                </div>
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[9px] font-bold text-white" style={{ backgroundColor: '#7BB89A' }}>AB</span>
              </button>
            ))}
            <button type="button" onClick={() => setView('planning')} className="w-full text-right text-[12px] font-semibold mt-3 cursor-pointer hover:underline" style={{ color: PETROL }}>
              Volledige planning →
            </button>
          </div>

          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
              <p className="font-heading text-[18px] font-bold tracking-tight" style={{ color: INK }}>
                Opvolgen<span style={{ color: FLAME }}>.</span>
                <span className="ml-2 text-[12px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>
                  wacht op antwoord
                </span>
              </p>
              <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: '#9B9B95' }}>€ 17.092,07 in de pijplijn</span>
            </div>
            <ul>
              {opvolgen.map((o) => (
                <li key={o.ref}>
                  <button
                    type="button"
                    onClick={() => setView('offerte')}
                    className="w-full flex items-center gap-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-[rgba(241,80,37,0.04)] rounded-md -mx-1 px-1"
                    style={{ borderTop: `1px solid ${LINE}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate" style={{ color: INK }}>{o.naam}</p>
                      <p className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>{o.ref}</p>
                    </div>
                    <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: PETROL }}>{o.bedrag}</span>
                    <span className="font-mono text-[10px] tabular-nums w-14 text-right" style={{ color: MUTED }}>{o.dagen}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setView('offerte')} className="w-full text-right text-[12px] font-semibold mt-3 cursor-pointer hover:underline" style={{ color: PETROL }}>
              Alle offertes →
            </button>
          </div>
        </div>
      </div>

      <aside className="hidden xl:flex flex-col gap-4">
        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-[15px] font-bold" style={{ color: INK }}>
              Deze week<span style={{ color: FLAME }}>.</span>{' '}
              <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>week 21</span>
            </p>
            <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: '#9B9B95' }}>{'<'} MEI 2026 {'>'}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {['Iedereen', 'AB', 'JB', 'LB', '+1'].map((p) => (
              <span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ border: `1px solid ${p === 'AB' ? '#2D6B48' : LINE}`, color: p === 'AB' ? '#2D6B48' : MUTED }}>
                {p}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {['M', 'D', 'W', 'D', 'V', 'Z', 'Z'].map((d, i) => (
              <span key={i} className="font-mono text-[9px] tracking-[0.1em]" style={{ color: '#9B9B95' }}>{d}</span>
            ))}
            {[18, 19, 20, 21, 22, 23, 24].map((n) => {
              const isToday = n === 18
              return (
                <span
                  key={n}
                  className="font-heading text-[14px] font-bold py-1 rounded-md"
                  style={{ backgroundColor: isToday ? PETROL : 'transparent', color: isToday ? '#FFFFFF' : INK }}
                >
                  {n}
                </span>
              )
            })}
          </div>
          <div className="rounded-[8px] p-2.5 flex gap-3 items-start" style={{ backgroundColor: '#FAFAF8' }}>
            <div className="text-center shrink-0">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>WO</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: PETROL }}>08:00</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: INK }}>Signing vernieuwen</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Jan · Beemster</p>
            </div>
            <span className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: FLAME }} />
          </div>
        </div>

        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <p className="font-heading text-[15px] font-bold mb-3" style={{ color: INK }}>
            Activiteit<span style={{ color: FLAME }}>.</span>{' '}
            <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>portaal-logs</span>
          </p>
          <ul className="space-y-1">
            {activiteit.map((a, i) => {
              const Icon = a.icon
              const target: View = a.titel === 'Factuur betaald' ? 'factuur' : 'offerte'
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setView(target)}
                    className="w-full flex items-start gap-2.5 py-1.5 text-left transition-colors cursor-pointer hover:bg-[rgba(26,83,92,0.04)] rounded-md px-1 -mx-1"
                  >
                    <span className="w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(26,83,92,0.08)' }}>
                      <Icon className="w-3 h-3" style={{ color: PETROL }} strokeWidth={2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold" style={{ color: INK }}>{a.titel}</p>
                      <p className="text-[11px] truncate" style={{ color: MUTED }}>{a.sub}</p>
                    </div>
                    <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: '#9B9B95' }}>{a.tijd}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-[15px] font-bold" style={{ color: INK }}>
              Gedaan<span style={{ color: FLAME }}>.</span>{' '}
              <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>team-log</span>
            </p>
            <span className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>3 actief</span>
          </div>
          <ul className="space-y-2.5">
            {gedaan.map((g, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-md inline-flex items-center justify-center font-mono text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#7BB89A' }}>{g.wie}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold" style={{ color: INK }}>{g.naam}</p>
                  <p className="text-[10.5px] truncate" style={{ color: MUTED }}>{g.wat}</p>
                </div>
                <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: '#9B9B95' }}>{g.tijd}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function KpiCard({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[12px] p-4 relative" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="w-7 h-7 rounded-full inline-flex items-center justify-center" style={{ backgroundColor: `${tone}15`, color: tone }}>
          {icon}
        </span>
        <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: MUTED }}>{label}</span>
      </div>
      <p className="font-heading text-[24px] md:text-[28px] font-bold tabular-nums tracking-tight leading-none mb-2" style={{ color: INK }}>
        {value}
      </p>
      <div className="flex items-end justify-between">
        <p className="text-[11.5px]" style={{ color: MUTED }}>{sub}</p>
        <svg width="56" height="18" viewBox="0 0 56 18" className="opacity-80">
          <polyline points="0,15 8,12 16,13 24,9 32,10 40,6 48,7 56,3" fill="none" stroke={tone} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   PROJECTEN VIEW — list with KPI strip + filters + table
   ────────────────────────────────────────────────────────────── */

type ProjStatus = 'te-factureren' | 'actief' | 'gepland' | 'afgerond'
const statusMeta: Record<ProjStatus, { label: string; color: string }> = {
  'te-factureren': { label: 'Te factureren.', color: '#2D6B48' },
  actief:           { label: 'Actief.',         color: '#3A6B8C' },
  gepland:          { label: 'Gepland.',        color: '#9A5A48' },
  afgerond:         { label: 'Afgerond.',       color: '#2D6B48' },
}

const projecten: { naam: string; sub?: string; ref: string; klant: string; klantInitial: string; status: ProjStatus; bedrag: string; datum: string }[] = [
  { naam: 'Inkooporder: 3721-Marlborough', sub: 'Snijden',                ref: 'PRJ-2026-045', klant: 'Van Meer Yacht Service',  klantInitial: 'V', status: 'te-factureren', bedrag: '€ 48,40',  datum: '18 mei' },
  { naam: 'Geveltekst / Stalen letters',  sub: 'Voor consument Amsterdam', ref: 'PRJ-2026-044', klant: 'De Vries Reclame',         klantInitial: 'D', status: 'actief',        bedrag: '—',         datum: '16 mei' },
  { naam: 'Bordje De Wit',                                                ref: 'PRJ-2026-043', klant: 'De Wit Bouw',              klantInitial: 'D', status: 'actief',        bedrag: '—',         datum: '16 mei' },
  { naam: 'Ordernr. 125330',              sub: 'Boottekst',                ref: 'PRJ-2026-042', klant: 'Jachtwerf Kemper',         klantInitial: 'J', status: 'gepland',       bedrag: '€ 73,51',  datum: '16 mei' },
  { naam: 'Doek voor hek',                                                ref: 'PRJ-2026-041', klant: 'Bouwbedrijf Atelier 9',    klantInitial: 'A', status: 'gepland',       bedrag: '€ 824,74', datum: '15 mei' },
  { naam: 'Koekoeken',                                                     ref: 'PRJ-2026-040', klant: 'Café De Zon',              klantInitial: 'C', status: 'afgerond',      bedrag: '€ 206,18', datum: '14 mei' },
  { naam: 'Gevelreclame',                                                  ref: 'PRJ-2026-039', klant: 'Bakkerij Steeg',           klantInitial: 'B', status: 'actief',        bedrag: '—',         datum: '14 mei' },
]

const kpis = [
  { icon: AlertCircle, label: 'Met aandacht.', value: '46', sub: 'in-review of >30d open', tone: FLAME },
  { icon: Activity,    label: 'Actief.',        value: '67', sub: 'in uitvoering',           tone: FLAME },
  { icon: Receipt,     label: 'Te factureren.', value: '4',  sub: 'wachten op factuur',      tone: FLAME },
  { icon: CheckCircle2,label: 'Afgerond.',      value: '14', sub: 'klaar.',                  tone: FLAME },
]

function ProjectenView({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold tracking-tight leading-none flex items-baseline gap-3" style={{ fontSize: 'clamp(28px, 4vw, 44px)', color: INK }}>
          Projecten<span style={{ color: FLAME }}>.</span>
          <span className="font-mono text-[13px] font-semibold" style={{ color: MUTED }}>124</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}`, backgroundColor: CARD }}>
            <Upload className="w-3.5 h-3.5" strokeWidth={2} /> Importeer
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: FLAME }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Nieuw project
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5" style={{ color: k.tone }} strokeWidth={2} />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: INK }}>{k.label}</span>
              </div>
              <p className="font-heading text-[28px] md:text-[34px] font-bold leading-none tabular-nums" style={{ color: INK }}>
                {k.value}
                <span className="ml-2 text-[11px] font-normal italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>· {k.sub}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* Filter / search bar */}
      <div className="rounded-[12px] p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-md" style={{ border: `1px solid ${LINE}`, backgroundColor: BG }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#9B9B95' }} />
            <span className="font-mono text-[11px]" style={{ color: '#9B9B95' }}>Zoek project of klant…</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#9B9B95', border: `1px solid ${LINE}` }}>/</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] inline-flex items-center gap-1" style={{ color: MUTED }}>
              <Download className="w-3 h-3" /> CSV
            </span>
            <span className="font-mono text-[11px] inline-flex items-center gap-1" style={{ color: MUTED }}>
              <FileText className="w-3 h-3" /> Excel
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5 mb-3 overflow-x-auto whitespace-nowrap">
          {[
            { l: 'Alle', n: '124', active: true },
            { l: 'Actief', n: '67' },
            { l: 'Gepland', n: '19' },
            { l: 'In review', n: '2' },
            { l: 'Te factureren', n: '4' },
            { l: 'Gefactureerd', n: '15' },
            { l: 'On-hold', n: '3' },
            { l: 'Afgerond', n: '14' },
          ].map((f) => (
            <span key={f.l} className="text-[12px] font-semibold inline-flex items-baseline gap-1.5" style={{ color: f.active ? INK : MUTED, borderBottom: f.active ? `2px solid ${PETROL}` : '2px solid transparent', paddingBottom: 4 }}>
              {f.l}<span className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>{f.n}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
            <span className="font-mono italic" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>open sinds·</span>
            {['alles', '<7d', '7-14d', '14-30d', '30-90d', '>90d'].map((s, i) => (
              <span key={s} className="font-mono" style={{ color: i === 0 ? INK : MUTED, fontWeight: i === 0 ? 700 : 400 }}>{s}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
            <span className="font-mono italic" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>groep·</span>
            {['geen', 'status', 'klant'].map((s) => (
              <span key={s} className="font-mono" style={{ color: s === 'geen' ? INK : MUTED, fontWeight: s === 'geen' ? 700 : 400 }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[12px] overflow-x-auto" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="grid grid-cols-[1.4fr_1.2fr_1fr_0.7fr_0.5fr_0.3fr] gap-3 px-5 py-3 font-mono text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: MUTED, borderBottom: `1px solid ${LINE}`, minWidth: 760 }}>
          <span>Project ↑↓</span>
          <span>Klant</span>
          <span>Status</span>
          <span className="text-right">Bedrag</span>
          <span>Datum ↓</span>
          <span className="text-right">Team</span>
        </div>
        {projecten.map((p) => {
          const sm = statusMeta[p.status]
          return (
            <div
              key={p.ref}
              role="button"
              tabIndex={0}
              onClick={() => setView('detail')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('detail') } }}
              className="grid grid-cols-[1.4fr_1.2fr_1fr_0.7fr_0.5fr_0.3fr] gap-3 px-5 py-4 items-center w-full text-left transition-colors cursor-pointer hover:bg-[rgba(26,83,92,0.03)]"
              style={{ borderTop: `1px solid ${LINE}`, borderLeft: `3px solid ${sm.color}`, minWidth: 760 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ border: `1.5px solid ${sm.color}` }} />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: INK }}>
                    {p.naam} <span className="font-mono text-[10px] font-normal ml-1" style={{ color: '#9B9B95' }}>{p.ref}</span>
                  </p>
                  {p.sub && <p className="text-[11px] truncate" style={{ color: MUTED }}>{p.sub}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: '#FAFAF8', color: INK, border: `1px solid ${LINE}` }}>{p.klantInitial}</span>
                <span className="text-[12.5px] truncate" style={{ color: INK }}>{p.klant}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sm.color }} />
                <span className="text-[12px] font-semibold" style={{ color: sm.color }}>{sm.label}</span>
              </div>
              <span className="text-right font-mono text-[12px] tabular-nums" style={{ color: INK }}>{p.bedrag}</span>
              <span className="font-mono text-[11px]" style={{ color: MUTED }}>{p.datum}</span>
              <span className="text-right">
                <Users className="w-3.5 h-3.5 ml-auto" style={{ color: '#C8C8C0' }} strokeWidth={1.8} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   PROJECT-DETAIL VIEW
   ────────────────────────────────────────────────────────────── */

function ProjectDetailView({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
      {/* MAIN */}
      <div className="space-y-4">

        {/* Title block */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: MUTED }}>
              PRJ-2026-044 · <span style={{ color: '#3A6B8C' }}>Actief.</span>
            </p>
            <h1 className="font-heading text-[26px] md:text-[32px] font-bold tracking-tight leading-none" style={{ color: INK }}>
              Geveltekst / Stalen letters<span style={{ color: FLAME }}>.</span>
            </h1>
            <p className="text-[12.5px] mt-1.5" style={{ color: MUTED }}>De Vries Reclame · 16 mei 2026</p>
          </div>
        </div>

        {/* Briefing card */}
        <div className="rounded-[12px] p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-heading text-[16px] font-bold tracking-tight inline-flex items-baseline gap-2" style={{ color: INK }}>
              <FileText className="w-3.5 h-3.5" style={{ color: PETROL }} strokeWidth={2} />
              Briefing<span style={{ color: FLAME }}>.</span>
              <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>· wat moet er gebeuren</span>
            </p>
            <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-[11px] font-semibold" style={{ color: '#6A5A8A', border: `1px solid rgba(106,90,138,0.30)`, backgroundColor: 'rgba(106,90,138,0.05)' }}>
              <Sparkles className="w-3 h-3" strokeWidth={2} />
              Daan AI
            </span>
          </div>
          <div className="rounded-[8px] p-3 text-[13px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK, minHeight: 92 }}>
            Voor consument in Amsterdam. Stalen letters laser-gesneden, 8mm geborsteld zwart, montage met chemische ankers. Klant wil mock-up vóór bestellen.
          </div>
        </div>

        {/* Taken + Offertes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[12px] p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-heading text-[15px] font-bold inline-flex items-baseline gap-2" style={{ color: INK }}>
                <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2D6B48' }} strokeWidth={2} />
                Taken<span style={{ color: FLAME }}>.</span>
              </p>
              <span className="text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: FLAME }}>
                <Plus className="w-3 h-3" /> Taak
              </span>
            </div>
            <div className="rounded-[8px] py-8 text-center" style={{ border: `1px dashed ${LINE}`, backgroundColor: BG }}>
              <CheckSquare className="w-5 h-5 mx-auto mb-2" style={{ color: '#C8C8C0' }} strokeWidth={1.8} />
              <p className="text-[13px] font-semibold" style={{ color: INK }}>Eerste taak toevoegen</p>
              <p className="text-[11px] italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>wat moet er gebeuren?</p>
            </div>
          </div>

          <div className="rounded-[12px] p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-heading text-[15px] font-bold inline-flex items-baseline gap-2" style={{ color: INK }}>
                <FileText className="w-3.5 h-3.5" style={{ color: FLAME }} strokeWidth={2} />
                Offertes<span style={{ color: FLAME }}>.</span>
                <span className="text-[10px] font-mono ml-1 w-4 h-4 rounded-full inline-flex items-center justify-center text-white" style={{ backgroundColor: FLAME }}>1</span>
              </p>
              <span className="text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: FLAME }}>
                <Plus className="w-3 h-3" /> Offerte
              </span>
            </div>
            <button
              type="button"
              onClick={() => setView('offerte')}
              className="w-full flex items-center justify-between py-2 px-3 rounded-[8px] text-left transition-colors cursor-pointer hover:bg-[rgba(241,80,37,0.05)]"
              style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}
            >
              <div>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>Geveltekst / Stalen letters</p>
                <p className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>
                  OFF-2026-236
                  <span className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(155,155,149,0.15)', color: MUTED }}>Concept</span>
                </p>
              </div>
              <p className="font-mono text-[13px] font-bold tabular-nums" style={{ color: INK }}>€ 0,00</p>
            </button>
          </div>
        </div>

        {/* Activiteit (collapsed) */}
        <div className="rounded-[12px] p-4 flex items-center justify-between" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-2" style={{ color: INK }}>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
            <Activity className="w-3.5 h-3.5" style={{ color: PETROL }} strokeWidth={2} />
            Activiteit<span style={{ color: FLAME }}>.</span>
            <span className="text-[10px] font-mono ml-1" style={{ color: MUTED }}>32</span>
          </p>
        </div>

        {/* Portaal banner */}
        <div className="rounded-[12px] p-4 flex items-center justify-between" style={{ backgroundColor: PETROL_DEEP, color: '#FFFFFF' }}>
          <div className="flex items-center gap-2.5">
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase">Portaal</span>
            <span className="text-[12px] font-semibold" style={{ color: '#A4D9B8' }}>Actief<span style={{ color: FLAME }}>.</span></span>
            <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>1 gedeeld</span>
          </div>
          <span className="text-[12px] font-semibold inline-flex items-center gap-1.5">
            Openen <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
          </span>
        </div>
      </div>

      {/* RIGHT RAIL */}
      <aside className="space-y-4">
        {/* Contactpersoon */}
        <div>
          <button
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[13px] font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            style={{ backgroundColor: PETROL_DEEP }}
            type="button"
            onClick={() => setView('email')}
          >
            <Mail className="w-3.5 h-3.5" strokeWidth={2} />
            Mail contactpersoon
          </button>
          <p className="text-[12px] mt-3 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
            <Pencil className="w-3 h-3" /> Bewerk Lars de Boer
          </p>
          <p className="text-[12px] mt-1.5 inline-flex items-center gap-1.5" style={{ color: PETROL }}>
            <Plus className="w-3 h-3" /> Nieuw contactpersoon
          </p>
        </div>

        {/* Acties */}
        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-[14px] font-bold" style={{ color: INK }}>Acties<span style={{ color: FLAME }}>.</span></p>
            <p className="text-[10px] italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>wat is de volgende stap?</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { icon: FileText,        label: 'Offerte',  sub: 'Stuur een p…', goto: 'offerte' as View },
              { icon: ClipboardCheck,  label: 'Werkbon',  sub: 'Voor de mo…', goto: 'taken' as View },
              { icon: Wrench,          label: 'Montage',  sub: 'Plan de uit…', goto: 'planning' as View },
              { icon: Receipt,         label: 'Factuur',  sub: 'Verstuur d…', goto: 'factuur' as View },
            ]).map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setView(a.goto)}
                  className="rounded-[10px] p-2.5 text-left transition-all cursor-pointer hover:border-[rgba(26,83,92,0.25)] hover:bg-white"
                  style={{ border: `1px solid ${LINE}`, backgroundColor: BG }}
                >
                  <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color: PETROL }} strokeWidth={2} />
                  <p className="text-[12px] font-bold" style={{ color: INK }}>{a.label}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{a.sub}</p>
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px]" style={{ color: MUTED }}>
            <span className="inline-flex items-center gap-1"><Folder className="w-3 h-3" /> Pakbon</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Bevestiging</span>
          </div>
        </div>

        {/* Bestanden */}
        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-1.5" style={{ color: INK }}>
              <FileText className="w-3.5 h-3.5" style={{ color: PETROL }} strokeWidth={2} />
              Bestanden<span style={{ color: FLAME }}>.</span>
            </p>
            <span className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: PETROL }}>
              <Upload className="w-3 h-3" /> Upload
            </span>
          </div>
          <div className="rounded-[8px] py-6 text-center" style={{ border: `1px dashed ${LINE}`, backgroundColor: BG }}>
            <Upload className="w-5 h-5 mx-auto mb-2" style={{ color: '#C8C8C0' }} strokeWidth={1.8} />
            <p className="text-[12px] font-semibold" style={{ color: INK }}>Eerste bestand uploaden</p>
            <p className="text-[10px] italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>sleep of klik om te kiezen</p>
          </div>
        </div>

        {/* Situatiefoto's */}
        <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
          <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-1.5 mb-3" style={{ color: INK }}>
            <Camera className="w-3.5 h-3.5" style={{ color: FLAME }} strokeWidth={2} />
            Situatiefoto&apos;s<span style={{ color: FLAME }}>.</span>
          </p>
          <div className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-[8px] text-[12px] font-semibold" style={{ border: `1px dashed ${FLAME}`, color: FLAME }}>
            <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} />
            Foto&apos;s toevoegen
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   EMAIL VIEW
   ────────────────────────────────────────────────────────────── */

const mailboxen: { icon: LucideIcon; label: string; count?: string; active?: boolean }[] = [
  { icon: Inbox, label: 'Inbox', active: true },
  { icon: Send, label: 'Verzonden' },
  { icon: Clock, label: 'Opvolgen' },
  { icon: CheckCircle2, label: 'Beantwoord' },
  { icon: Archive, label: 'Gesnoozed', count: '1' },
  { icon: FileEdit, label: 'Concepten' },
  { icon: Trash2, label: 'Prullenbak' },
  { icon: CalendarClock, label: 'Ingeplande berichten' },
]

const emails: { av: string; avBg: string; sender: string; subject: string; preview: string; time: string; unread?: boolean; pinned?: boolean }[] = [
  { av: 'L', avBg: '#FAE5D5', sender: 'Lars de Boer',          subject: 'Vraag over geveltekst',                                     preview: 'Hoi Antony, wij willen onze gevel aankleden met stalen letters, kun je…',     time: '20:04' },
  { av: 'G', avBg: '#FBE0D5', sender: 'Glashandel Bos',        subject: 'Alleen in mei: bespaar tot € 30,– op verzendkosten',         preview: '[In de browser weergeven]([link]) Dag Sign Company, mei is er — de pe…',   time: '20:00' },
  { av: 'D', avBg: '#E2F0F0', sender: 'doen.team',             subject: 'Contact via doen.team — Test',                              preview: 'Naam: Test Email: test@example.nl Bericht: Testbericht via curl op lo…',     time: '19:58' },
  { av: 'V', avBg: '#F2E8E5', sender: 'Videoland',             subject: 'Dé serie waar we allemaal naar uitkeken!',                  preview: 'Videoland [link] Geen Flodd',                                                  time: '19:55', pinned: true },
  { av: 'W', avBg: '#E5ECF6', sender: 'WooPayments',           subject: '🛡 Actie vereist: verifieer je gegevens met WooPayments',    preview: 'Loop je betalingen niet mis!',                                                 time: '19:54' },
  { av: 'L', avBg: '#FBE0D5', sender: 'LinkedIn',              subject: 'U hebt 4 nieuwe berichten',                                 preview: 'U hebt 4 nieuwe berichten. Berichten weergeven: [link]',                       time: '19:36' },
  { av: 'M', avBg: '#EEE8F5', sender: 'Mailchimp',             subject: 'Je weekrapport is klaar — campagne mei 18',                 preview: 'Open rate 38%, click-through 9%. Bekijk je volledige stats in de app.',        time: '19:26' },
  { av: 'P', avBg: '#FBE0D5', sender: 'Pro & Co',              subject: '⏳ 48 — antony, less than 48 hours left on the Spring Bundle', preview: 'Spring Mega Bundle eindigt dinsdag. ([link])',                                 time: '19:25' },
  { av: 'P', avBg: '#FAE5D5', sender: 'PWN',                   subject: 'Geef uw watermeterstand door',                              preview: 'Beste klant, het is weer tijd om uw watermeterstand door te geven.',           time: '19:25', unread: true },
  { av: 'J', avBg: '#E4F0EA', sender: 'Familie de Jong',       subject: 'The best time of the year 🏔️',                              preview: 'Hoi Antony, we zijn er weer aan toe! Kom je dit jaar mee skiën?',              time: '19:17' },
  { av: 'P', avBg: '#FBE0D5', sender: 'Probo',                 subject: 'Bevestiging van je bestelling: Kunstdoekjes',               preview: 'We hebben je bestelling (1260305765 - Kunstdoekjes) ontvangen en gaan zo snel m…', time: '19:07' },
  { av: 'S', avBg: '#E2F0F0', sender: 'Shutterstock',          subject: 'Klaar om te downloaden: De gratis afbeeldingen van deze week', preview: 'Shutterstock &',                                                              time: '19:05' },
  { av: 'S', avBg: '#FAE5D5', sender: 'Sanne Visser',          subject: 'Verandering huisstijl',                                     preview: 'Hallo Mark, ik heb enige tijd geleden raam- en autostickers bij jullie laten maken voor…', time: '18:54' },
  { av: 'G', avBg: '#E5ECF6', sender: 'The Google Workspace',  subject: 'Herinnering over gekoppelde Google-services',               preview: 'Google Workspace logo Je kunt je keuzes altijd wijzigen in je Google-account. Vo…', time: '18:46' },
]

function EmailView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]" style={{ minHeight: 560 }}>
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col p-4 gap-3" style={{ borderRight: `1px solid ${LINE}`, backgroundColor: CARD }}>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 h-10 rounded-[10px] font-semibold text-[13px] text-white"
          style={{ backgroundColor: FLAME, boxShadow: '0 6px 16px rgba(241,80,37,0.28)' }}
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={2.4} />
          Nieuw bericht
        </button>
        <ul className="mt-2 space-y-0.5">
          {mailboxen.map((m) => {
            const Icon = m.icon
            return (
              <li
                key={m.label}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12.5px] font-medium"
                style={{
                  backgroundColor: m.active ? 'rgba(26,83,92,0.07)' : 'transparent',
                  color: m.active ? PETROL : '#3F3F3A',
                }}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="flex-1">{m.label}</span>
                {m.count && <span className="font-mono text-[10px] tabular-nums" style={{ color: MUTED }}>{m.count}</span>}
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Main */}
      <div className="flex flex-col">
        {/* Top strip */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div />
          <div className="inline-flex items-center gap-2 text-[11px]" style={{ color: MUTED }}>
            <span>Focus modus</span>
            <span className="w-7 h-4 rounded-full inline-flex items-center px-0.5" style={{ backgroundColor: '#E6E1D5' }}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CARD, boxShadow: '0 1px 2px rgba(0,0,0,0.10)' }} />
            </span>
          </div>
        </div>

        {/* Tabs + view toolbar */}
        <div className="flex items-center gap-2 px-4 md:px-5 py-3 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
          <span className="w-4 h-4 rounded-[4px] inline-block" style={{ border: `1.5px solid ${LINE}` }} />
          {[
            { l: 'Alle', active: true },
            { l: 'Ongelezen' },
            { l: 'Vastgepind' },
            { l: 'Bijlagen' },
          ].map((t) => (
            <span key={t.l} className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{
              color: t.active ? INK : MUTED,
              backgroundColor: t.active ? 'rgba(26,83,92,0.07)' : 'transparent',
            }}>{t.l}</span>
          ))}
          <span className="ml-auto inline-flex items-center gap-3" style={{ color: MUTED }}>
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span className="font-mono text-[11px]" style={{ color: '#9B9B95' }}>A</span>
            <span className="font-mono text-[12px] font-bold" style={{ color: INK }}>A</span>
            <span className="font-mono text-[13px]" style={{ color: '#9B9B95' }}>A</span>
          </span>
        </div>

        {/* Search */}
        <div className="px-4 md:px-5 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#9B9B95' }} />
            <span className="text-[12px]" style={{ color: '#9B9B95' }}>Zoek in emails…</span>
          </div>
        </div>

        {/* Date divider */}
        <div className="px-4 md:px-5 pt-3 pb-1">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#9B9B95' }}>Vandaag</p>
        </div>

        {/* Email rows */}
        <ul>
          {emails.map((e, i) => (
            <li
              key={i}
              className="grid grid-cols-[16px_28px_minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-5 py-3"
              style={{
                borderTop: i === 0 ? 'none' : `1px solid ${LINE}`,
                backgroundColor: e.unread ? 'rgba(26,83,92,0.04)' : 'transparent',
                borderLeft: e.unread ? `3px solid ${PETROL}` : '3px solid transparent',
                paddingLeft: e.unread ? 'calc(1rem - 3px)' : '1rem',
              }}
            >
              <span className="w-3.5 h-3.5 rounded-[3px] inline-block" style={{ border: `1.5px solid ${LINE}` }} />
              <span className="w-7 h-7 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: e.avBg, color: INK }}>
                {e.av}
              </span>
              <div className="min-w-0 grid grid-cols-[180px_1fr] gap-3">
                <span className="text-[13px] truncate" style={{ color: INK, fontWeight: e.unread ? 700 : 500 }}>{e.sender}</span>
                <span className="text-[13px] truncate" style={{ color: e.unread ? INK : '#3F3F3A' }}>
                  <span style={{ fontWeight: e.unread ? 700 : 600 }}>{e.subject}</span>
                  <span className="ml-2" style={{ color: '#9B9B95' }}>{e.preview}</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 shrink-0">
                {e.pinned && <Pin className="w-3 h-3" style={{ color: MUTED }} strokeWidth={2} />}
                <span className="font-mono text-[11px] tabular-nums" style={{ color: e.unread ? PETROL : MUTED, fontWeight: e.unread ? 700 : 400 }}>{e.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   FACTUUR VIEW
   ────────────────────────────────────────────────────────────── */

function FactuurView() {
  return (
    <div className="p-4 md:p-6">
      {/* Top header */}
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold mb-2" style={{ color: MUTED }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={2} /> Facturen
          </p>
          <h1 className="font-heading text-[26px] md:text-[30px] font-bold tracking-tight leading-none" style={{ color: INK }}>
            Factuur 2026234
          </h1>
          <p className="font-mono text-[11px] mt-1" style={{ color: MUTED }}>2026234</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold" style={{ color: '#2D6B48', border: `1px solid rgba(45,107,72,0.30)`, backgroundColor: 'rgba(45,107,72,0.07)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> Markeer als betaald
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-wide" style={{ color: '#2D6B48', border: `1px solid rgba(45,107,72,0.30)`, backgroundColor: 'rgba(45,107,72,0.07)' }}>
            <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Exact
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-wide" style={{ color: '#2D6B48', border: `1px solid rgba(45,107,72,0.30)`, backgroundColor: 'rgba(45,107,72,0.07)' }}>
            <Paperclip className="w-3 h-3" strokeWidth={2} /> Bijlage
          </span>
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-md" style={{ border: `1px solid ${LINE}`, color: MUTED }}>
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: PETROL_DEEP }}>
            <FileEdit className="w-3.5 h-3.5" strokeWidth={2} /> Bijwerken
          </span>
        </div>
      </div>

      {/* Status banner */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-5 flex-wrap">
        <p className="text-[13px] font-semibold inline-flex items-center gap-2" style={{ color: INK }}>
          <Send className="w-3.5 h-3.5" style={{ color: PETROL }} strokeWidth={2} />
          Verstuurd · <span className="italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>wachtend op betaling</span>
        </p>
        <p className="font-mono text-[10px] truncate max-w-[60%]" style={{ color: '#9B9B95' }}>
          app.doen.team/betalen/3d752882-ddc7-…
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Klant */}
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-1.5 mb-3" style={{ color: PETROL }}>
              <Folder className="w-3.5 h-3.5" strokeWidth={2} />
              Klant
            </p>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: MUTED }}>Klant</p>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-[8px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold text-white shrink-0" style={{ backgroundColor: '#7BA89A' }}>S</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: INK }}>Slagerij Janssen</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>Beemster</p>
                </div>
              </div>
              <span className="text-[14px]" style={{ color: '#9B9B95' }}>×</span>
            </div>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mt-4 mb-2" style={{ color: FLAME }}>Verzenden naar</p>
            <div className="flex items-center justify-between p-2.5 rounded-[8px]" style={{ border: `1px solid ${LINE}` }}>
              <span className="text-[12px] font-semibold" style={{ color: INK }}>Mark Janssen</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
            </div>
            <p className="text-[11.5px] inline-flex items-center gap-1.5 mt-2.5" style={{ color: MUTED }}>
              <Plus className="w-3 h-3" /> Nieuwe contactpersoon toevoegen
            </p>
            <p className="text-[11px] inline-flex items-center gap-1.5 mt-2" style={{ color: MUTED }}>
              <span className="w-3 h-3 rounded-full" style={{ border: `1.5px solid ${FLAME}` }} />
              Altijd gebruiken voor facturen van deze klant
            </p>
          </div>

          {/* Factuurgegevens */}
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-1.5 mb-3" style={{ color: PETROL }}>
              <FileText className="w-3.5 h-3.5" strokeWidth={2} />
              Factuurgegevens
            </p>
            <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Factuurnummer</p>
            <div className="p-2 rounded-[6px] text-[12.5px] mb-3" style={{ border: `1px solid ${LINE}`, color: INK }}>2026234</div>
            <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Titel</p>
            <div className="p-2 rounded-[6px] text-[12.5px] mb-3" style={{ border: `1px solid ${LINE}`, color: INK }}>Geveltekst aluminium</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Factuurdatum</p>
                <div className="p-2 rounded-[6px] text-[12px] inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, color: INK }}>18 mei 2026 <Calendar className="w-3 h-3" style={{ color: MUTED }} /></div>
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Vervaldatum</p>
                <div className="p-2 rounded-[6px] text-[12px] inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, color: INK }}>1 jun. 2026 <Calendar className="w-3 h-3" style={{ color: MUTED }} /></div>
              </div>
            </div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-3 px-2 py-1 rounded-[6px]" style={{ backgroundColor: 'rgba(58,107,140,0.08)', color: '#3A6B8C' }}>
              <DollarSign className="w-3 h-3" />
              Vanuit offerte geïmporteerd
            </p>
          </div>

          {/* Financieel */}
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[14px] font-bold inline-flex items-baseline gap-1.5 mb-3" style={{ color: PETROL }}>
              <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
              Financieel
            </p>
            <div className="flex justify-between text-[12.5px] py-1" style={{ color: INK }}>
              <span>Subtotaal</span>
              <span className="font-mono tabular-nums">€ 225,00</span>
            </div>
            <div className="flex justify-between text-[12.5px] py-1" style={{ color: INK }}>
              <span>BTW 21%</span>
              <span className="font-mono tabular-nums">€ 47,25</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 mt-2 border-t" style={{ borderColor: LINE }}>
              <span className="text-[13px] font-bold" style={{ color: FLAME }}>Totaal incl. BTW</span>
              <span className="font-heading text-[20px] font-bold tabular-nums" style={{ color: FLAME }}>€ 272,25</span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[14px] font-bold mb-3" style={{ color: INK }}>Intro tekst</p>
            <div className="rounded-[8px] p-3 text-[12.5px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: '#9B9B95', minHeight: 80 }}>
              Optionele intro tekst bovenaan de factuur…
            </div>
          </div>

          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-heading text-[14px] font-bold" style={{ color: INK }}>Factuurregels (1)</p>
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold" style={{ color: PETROL, border: `1px solid ${LINE}` }}>
                <Plus className="w-3 h-3" /> Regel
              </span>
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
            <div className="grid grid-cols-[2.4fr_0.5fr_0.6fr_0.5fr_0.5fr_0.7fr_0.7fr] gap-2 font-mono text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: MUTED, minWidth: 620 }}>
              <span>Omschrijving</span>
              <span>Aantal</span>
              <span>Prijs</span>
              <span>BTW%</span>
              <span>Kort.%</span>
              <span>Grootboek</span>
              <span className="text-right">Totaal</span>
            </div>
            <div className="grid grid-cols-[2.4fr_0.5fr_0.6fr_0.5fr_0.5fr_0.7fr_0.7fr] gap-2 items-center" style={{ minWidth: 620 }}>
              <div className="p-2 rounded-[6px] text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: INK }}>Geveltekst aluminium</div>
              <div className="p-2 rounded-[6px] text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: INK }}>1</div>
              <div className="p-2 rounded-[6px] text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: INK }}>225</div>
              <div className="p-2 rounded-[6px] text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: INK }}>21</div>
              <div className="p-2 rounded-[6px] text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: INK }}>0</div>
              <div className="p-2 rounded-[6px] text-[12.5px] inline-flex items-center justify-between" style={{ border: `1px solid ${LINE}`, color: MUTED }}>— <ChevronDown className="w-3 h-3" /></div>
              <div className="text-right font-mono text-[12.5px] tabular-nums inline-flex items-center justify-end gap-1.5" style={{ color: INK }}>€ 225,00 <Copy className="w-3 h-3" style={{ color: '#C8C8C0' }} /></div>
            </div>
            </div>
            <div className="flex justify-between items-baseline pt-3 mt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <span className="text-[13px] font-bold" style={{ color: PETROL }}>Totaal</span>
              <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: PETROL }}>€ 225,00</span>
            </div>
            <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold mt-4" style={{ color: FLAME }}>
              <Plus className="w-3 h-3" /> Regel toevoegen
            </p>
          </div>

          <div className="rounded-[12px] p-4 flex items-center justify-between" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="text-[13px]" style={{ color: INK }}>
              <span className="font-bold">Extra tekst</span>{' '}
              <span className="italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>outro, voorwaarden en notities</span>
            </p>
            <ChevronsRight className="w-4 h-4" style={{ color: MUTED }} strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   PLANNING VIEW
   ────────────────────────────────────────────────────────────── */

type CalEvent = { day: number; from: string; to: string; titel: string; sub: string; ref?: string; tone: string }

const planEvents: CalEvent[] = [
  { day: 1, from: '09:00', to: '11:00', titel: 'Op locatie inmeten',     sub: 'De Wit Bouw',   tone: PETROL },
  { day: 1, from: '11:00', to: '12:00', titel: 'Voorbespreking',         sub: 'Bakkerij Steeg', ref: 'WB-2026-035', tone: PETROL },
  { day: 1, from: '13:00', to: '18:00', titel: 'Drukproef voorbereiding', sub: 'Atelier 9',    tone: PETROL },
  { day: 2, from: '08:00', to: '12:00', titel: 'Montage gevelletters',   sub: 'Van Meer & Co',  ref: 'WB-2026-036', tone: '#9A5A48' },
  { day: 3, from: '10:00', to: '11:30', titel: 'Klantbespreking',        sub: 'Café De Zon',    tone: '#2D6B48' },
  { day: 4, from: '14:00', to: '17:00', titel: 'Wrap bedrijfsauto',      sub: 'Groenland BV',   ref: 'WB-2026-037', tone: '#6A5A8A' },
]

const planDays = [
  { d: 'Maandag',   date: '18 mei', weather: 'rain', temp: '15°', perc: '100%', today: true },
  { d: 'Dinsdag',   date: '19 mei', weather: 'rain', temp: '15°', perc: '100%' },
  { d: 'Woensdag',  date: '20 mei', weather: 'rain', temp: '14°', perc: '77%'  },
  { d: 'Donderdag', date: '21 mei', weather: 'rain', temp: '16°', perc: '97%'  },
  { d: 'Vrijdag',   date: '22 mei', weather: 'sun',  temp: '18°', perc: ''     },
]

const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']

function PlanningView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]" style={{ minHeight: 620 }}>
      {/* Sidebar */}
      <aside className="hidden md:block p-4 md:p-5" style={{ borderRight: `1px solid ${LINE}`, backgroundColor: CARD }}>
        <h1 className="font-heading text-[20px] font-bold tracking-tight leading-none mb-1 inline-flex items-baseline gap-2" style={{ color: INK }}>
          Planning<span style={{ color: FLAME }}>.</span>
          <span className="font-mono text-[12px] font-semibold" style={{ color: MUTED }}>22</span>
        </h1>
        <div className="flex items-center justify-between mt-5 mb-2">
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: FLAME }}>Te plannen</p>
          <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: FLAME }}>0</span>
        </div>
        <p className="text-[12px] inline-flex items-center gap-1.5" style={{ color: MUTED }}>
          <CheckCircle2 className="w-3 h-3" style={{ color: '#2D6B48' }} strokeWidth={2} />
          Niets te plannen
        </p>
      </aside>

      {/* Main planning */}
      <div className="flex flex-col">
        {/* Top filter bar */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}` }}>
              <Users className="w-3.5 h-3.5" strokeWidth={2} /> Iedereen
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}` }}>
              <Users className="w-3.5 h-3.5" strokeWidth={2} /> Mijn week
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold text-white" style={{ backgroundColor: PETROL_DEEP }}>
              <Users className="w-3.5 h-3.5" strokeWidth={2} /> Mark Visser
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </span>
          </div>
          <div className="inline-flex p-0.5 rounded-md" style={{ border: `1px solid ${LINE}` }}>
            <span className="px-3 h-7 inline-flex items-center text-[12px] font-bold rounded-[6px] text-white" style={{ backgroundColor: PETROL_DEEP }}>Week</span>
            <span className="px-3 h-7 inline-flex items-center text-[12px] font-bold" style={{ color: MUTED }}>Maand</span>
          </div>
        </div>

        {/* Sub header — person + week + actions */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: INK }}>
              <Users className="w-3.5 h-3.5" strokeWidth={2} /> Mark Visser
            </span>
            <span className="text-[12px] font-semibold" style={{ color: INK }}>
              {'<'} Week <span className="font-mono text-[13px]">21</span> {'>'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: MUTED }}>
              <FileText className="w-3.5 h-3.5" strokeWidth={2} /> Print
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: FLAME }}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Nieuw
            </span>
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-md" style={{ border: `1px solid ${LINE}` }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
            </span>
          </div>
        </div>

        {/* Weekly grid */}
        <div className="overflow-x-auto">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, minmax(150px, 1fr))', minWidth: 800 }}>
            {/* Weather row */}
            <div />
            {planDays.map((day, i) => {
              const Icon = day.weather === 'rain' ? CloudRain : Sun
              return (
                <div key={i} className="px-3 py-2 inline-flex items-center justify-center gap-2 text-[11px]" style={{ borderBottom: `1px solid ${LINE}`, color: MUTED }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.8} />
                  <span className="font-mono">{day.temp}</span>
                  {day.perc && <span className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>{day.perc}</span>}
                </div>
              )
            })}

            {/* Days header row */}
            <div className="px-2 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ borderBottom: `1px solid ${LINE}`, color: MUTED }}>
              Tijd
            </div>
            {planDays.map((day, i) => (
              <div
                key={i}
                className="px-3 py-3"
                style={{
                  borderBottom: `1px solid ${LINE}`,
                  backgroundColor: day.today ? 'rgba(241,80,37,0.04)' : 'transparent',
                  borderTop: day.today ? `2px solid ${FLAME}` : 'none',
                }}
              >
                <p className="text-[13px] font-bold inline-flex items-baseline gap-1.5" style={{ color: INK }}>
                  {day.d}
                  <span className="font-mono text-[11px] font-normal" style={{ color: MUTED }}>{day.date}</span>
                </p>
              </div>
            ))}

            {/* Time slots — 10 hours */}
            {HOURS.map((h, hourIdx) => (
              <FragmentRow key={h}>
                <div className="px-2 py-4 font-mono text-[10px] tabular-nums" style={{ color: '#9B9B95', borderBottom: `1px dashed ${LINE}` }}>
                  {h}
                </div>
                {planDays.map((day, dayIdx) => {
                  // Find events that start in this hour
                  const evts = planEvents.filter((e) => e.day === dayIdx && parseInt(e.from) === parseInt(h))
                  return (
                    <div
                      key={dayIdx}
                      className="relative"
                      style={{
                        borderBottom: `1px dashed ${LINE}`,
                        borderLeft: dayIdx === 0 ? `1px solid ${LINE}` : 'none',
                        borderRight: `1px solid ${LINE}`,
                        minHeight: 56,
                        backgroundColor: day.today && hourIdx === 0 ? 'rgba(241,80,37,0.02)' : 'transparent',
                      }}
                    >
                      {evts.map((e, i) => {
                        const fromH = parseInt(e.from)
                        const toH = parseInt(e.to)
                        const fromMin = parseInt(e.from.split(':')[1] || '0')
                        const toMin = parseInt(e.to.split(':')[1] || '0')
                        const durationH = toH + toMin / 60 - (fromH + fromMin / 60)
                        return (
                          <div
                            key={i}
                            className="absolute left-1 right-1 top-1 rounded-[6px] px-2 py-1.5 overflow-hidden"
                            style={{
                              height: `${durationH * 56 - 4}px`,
                              backgroundColor: 'rgba(26,83,92,0.08)',
                              borderLeft: `3px solid ${e.tone}`,
                            }}
                          >
                            <p className="text-[11.5px] font-bold leading-tight truncate" style={{ color: INK }}>{e.titel}</p>
                            <p className="text-[10.5px] truncate" style={{ color: MUTED }}>{e.sub}</p>
                            <p className="font-mono text-[10px] mt-1 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                              <Clock className="w-2.5 h-2.5" />{e.from} - {e.to}
                              {e.ref && <span className="inline-flex items-center gap-0.5 ml-1"><FileText className="w-2.5 h-2.5" />{e.ref}</span>}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </FragmentRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/* ──────────────────────────────────────────────────────────────
   OFFERTE VIEW
   ────────────────────────────────────────────────────────────── */

function OfferteView() {
  const [calcOpen, setCalcOpen] = useState(false)
  return (
    <div className="relative p-4 md:p-6">
      {calcOpen && <CalculatieModal onClose={() => setCalcOpen(false)} />}
      {/* Top header */}
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold mb-2" style={{ color: MUTED }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={2} /> Offertes
            <span>·</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>OFF-2026-236</span>
          </p>
          <h1 className="font-heading text-[26px] md:text-[32px] font-bold tracking-tight leading-none" style={{ color: INK }}>
            Offerte bewerken<span style={{ color: FLAME }}>.</span>
            <span className="ml-3 font-mono text-[12px] font-normal italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>t/m 16 jun</span>
          </h1>
          <p className="text-[12.5px] mt-2 inline-flex items-center gap-1.5" style={{ color: '#3A6B8C' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3A6B8C' }} />
            De Vries Reclame
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}`, backgroundColor: CARD }}>
            <Download className="w-3.5 h-3.5" strokeWidth={2} /> PDF
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: PETROL_DEEP }}>
            <FileEdit className="w-3.5 h-3.5" strokeWidth={2} /> Opslaan
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: FLAME, boxShadow: '0 6px 16px rgba(241,80,37,0.28)' }}>
            <Send className="w-3.5 h-3.5" strokeWidth={2.4} /> Verstuur
            <ChevronDown className="w-3 h-3 ml-0.5" strokeWidth={2} />
          </span>
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-md" style={{ border: `1px solid ${LINE}`, color: MUTED }}>
            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>

      {/* Project pill */}
      <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold mt-3 mb-5 px-2.5 py-1 rounded-md" style={{ backgroundColor: 'rgba(26,83,92,0.06)', color: PETROL }}>
        <Folder className="w-3 h-3" strokeWidth={2} />
        Project: Geveltekst / Stalen letters
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* LEFT — main */}
        <div className="space-y-4">
          {/* Introductietekst */}
          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[15px] font-bold mb-3 inline-flex items-baseline gap-2" style={{ color: INK }}>
              Introductietekst<span style={{ color: FLAME }}>.</span>
              <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>optioneel</span>
            </p>
            <div className="flex items-center gap-2 mb-3">
              {[
                { l: 'Standaard', active: true },
                { l: 'Na gesprek' },
                { l: 'Bedankt' },
              ].map((p) => (
                <span key={p.l} className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{
                  color: p.active ? INK : MUTED,
                  border: `1px solid ${p.active ? PETROL : LINE}`,
                  backgroundColor: p.active ? 'rgba(26,83,92,0.05)' : 'transparent',
                }}>{p.l}</span>
              ))}
            </div>
            <div className="rounded-[8px] p-3 text-[13px] leading-[1.55]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK, minHeight: 80 }}>
              Bedankt voor je aanvraag. Hieronder vind je onze offerte, op basis van wat we hebben besproken. Heb je vragen of wil je iets aanpassen? Laat het weten, dan regelen we dat.
            </div>
          </div>

          {/* Offerte-items */}
          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[15px] font-bold mb-4 inline-flex items-baseline gap-2" style={{ color: INK }}>
              Offerte-items<span style={{ color: FLAME }}>.</span>
              <span className="text-[10px] font-mono w-4 h-4 rounded-full inline-flex items-center justify-center text-white" style={{ backgroundColor: FLAME }}>1</span>
            </p>

            {/* Item card */}
            <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ backgroundColor: BG, borderBottom: `1px solid ${LINE}` }}>
                <div className="inline-flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full inline-flex items-center justify-center font-mono text-[12px] font-bold text-white" style={{ backgroundColor: FLAME }}>1</span>
                  <span className="text-[13px] font-bold" style={{ color: INK }}>Item 1</span>
                </div>
                <div className="inline-flex items-center gap-3">
                  <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: INK }}>€ 0,00</span>
                  <Eye className="w-3.5 h-3.5" style={{ color: '#C8C8C0' }} strokeWidth={2} />
                  <Copy className="w-3.5 h-3.5" style={{ color: '#C8C8C0' }} strokeWidth={2} />
                  <Trash2 className="w-3.5 h-3.5" style={{ color: '#C8C8C0' }} strokeWidth={2} />
                </div>
              </div>

              {/* Tekening header */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-[4px]" style={{ backgroundColor: 'rgba(106,90,138,0.10)', color: '#6A5A8A' }}>
                  <ImageIcon className="w-3 h-3" strokeWidth={2} />
                  Tekening / Bijlage
                </span>
                <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
              </div>

              {/* Interne notitie */}
              <div className="px-4 py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
                  <Pencil className="w-3 h-3" /> Interne notitie
                </span>
              </div>

              {/* Specs grid */}
              <div className="p-4 space-y-2">
                {[
                  { l: 'Aantal',     v: '1' },
                  { l: 'Materiaal',  v: 'Aluminium 8mm, geborsteld zwart' },
                  { l: 'Afmeting',   v: '2400 × 380 mm' },
                  { l: 'Montage',    v: 'Chemische ankers, op locatie' },
                  { l: 'Lay-out',    v: 'Per ontwerp v2' },
                ].map((row) => (
                  <div key={row.l} className="grid grid-cols-[120px_1fr] items-center gap-3">
                    <span className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: MUTED }}>{row.l}</span>
                    <div className="px-3 py-1.5 rounded-[6px] text-[12.5px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK }}>{row.v}</div>
                  </div>
                ))}
                <p className="inline-flex items-center gap-1 text-[12px] font-semibold mt-1" style={{ color: FLAME }}>
                  <Plus className="w-3 h-3" /> Beschrijving toevoegen
                </p>
              </div>

              {/* Price row */}
              <div className="grid grid-cols-[0.6fr_1.2fr_0.7fr_0.7fr_0.7fr] gap-3 px-4 py-3 items-end" style={{ borderTop: `1px solid ${LINE}`, backgroundColor: BG }}>
                <div>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Aantal</p>
                  <div className="px-2 py-1.5 rounded-[6px] text-[13px] font-mono tabular-nums inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD, color: INK }}>1 <ChevronDown className="w-3 h-3" style={{ color: MUTED }} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Prijs per stuk</p>
                  <div className="px-2 py-1.5 rounded-[6px] text-[13px] inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD, color: '#9B9B95' }}>€ <Calendar className="w-3 h-3" style={{ color: MUTED }} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>BTW</p>
                  <div className="px-2 py-1.5 rounded-[6px] text-[13px] inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD, color: INK }}>21% <ChevronDown className="w-3 h-3" /></div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Korting</p>
                  <div className="px-2 py-1.5 rounded-[6px] text-[13px] inline-flex items-center justify-between w-full" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD, color: MUTED }}>% <ChevronDown className="w-3 h-3" /></div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Totaal</p>
                  <p className="font-mono text-[14px] font-bold tabular-nums" style={{ color: INK }}>€ 0,00</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap">
                <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: MUTED }}>
                  <Copy className="w-3 h-3" /> Prijsvariant toevoegen
                </p>
                <motion.button
                  type="button"
                  onClick={() => setCalcOpen(true)}
                  className="relative inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-bold tracking-wide cursor-pointer overflow-visible"
                  style={{
                    backgroundColor: PETROL_DEEP,
                    color: '#FFFFFF',
                  }}
                  animate={{
                    boxShadow: [
                      '0 4px 10px rgba(20,40,40,0.18), 0 0 0 0 rgba(241,80,37,0.55)',
                      '0 4px 10px rgba(20,40,40,0.18), 0 0 0 10px rgba(241,80,37,0)',
                    ],
                  }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span aria-hidden style={{ display: 'inline-flex', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="14" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>
                  </span>
                  Open calculatie
                </motion.button>
              </div>
            </div>

            <div className="mt-3 py-3 text-center rounded-[10px] text-[12px] font-semibold inline-flex items-center justify-center gap-2 w-full" style={{ border: `1px dashed ${LINE}`, color: FLAME }}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Item toevoegen
            </div>
          </div>

          {/* Afsluittekst */}
          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[15px] font-bold mb-3 inline-flex items-baseline gap-2" style={{ color: INK }}>
              Afsluittekst<span style={{ color: FLAME }}>.</span>
              <span className="text-[11px] italic font-normal" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>optioneel</span>
            </p>
            <div className="flex items-center gap-2 mb-3">
              {[
                { l: 'Standaard', active: true },
                { l: 'Met vragen' },
                { l: 'Dank' },
              ].map((p) => (
                <span key={p.l} className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{
                  color: p.active ? INK : MUTED,
                  border: `1px solid ${p.active ? PETROL : LINE}`,
                  backgroundColor: p.active ? 'rgba(26,83,92,0.05)' : 'transparent',
                }}>{p.l}</span>
              ))}
            </div>
            <div className="rounded-[8px] p-3 text-[13px] leading-[1.55]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK, minHeight: 60 }}>
              Je kan akkoord geven via het portaal of mail ons terug. Heb je nog vragen of wil je iets aanpassen? Laat het weten, dan kijken we er samen naar.
            </div>
          </div>

          {/* Notities & voorwaarden */}
          <div className="rounded-[12px] p-4 md:p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-heading text-[15px] font-bold mb-4" style={{ color: INK }}>
              Notities &amp; voorwaarden<span style={{ color: FLAME }}>.</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: MUTED }}>Notities</p>
                <div className="rounded-[6px] p-2 text-[12.5px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: '#9B9B95', minHeight: 80 }}>
                  Interne notities of opmerkingen voor de klant…
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: FLAME }}>Voorwaarden</p>
                <div className="rounded-[6px] p-2 text-[12px] leading-[1.55]" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK, minHeight: 80 }}>
                  Om alles duidelijk te houden, zetten we de belangrijkste afspraken even op een rij.{'\n'}{'\n'}
                  Deze offerte is 30 dagen geldig na verzenddatum.{'\n'}
                  Betaling vindt plaats binnen 14 dagen na factuurdatum.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Klant card */}
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full inline-flex items-center justify-center font-mono text-[13px] font-bold text-white" style={{ backgroundColor: '#3A6B8C' }}>D</span>
                <div>
                  <p className="font-heading text-[15px] font-bold" style={{ color: INK }}>De Vries Reclame</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>t.a.v. Lars de Boer</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
            </div>
            <p className="text-[12px] inline-flex items-center gap-1.5 mb-2" style={{ color: PETROL }}>
              <Mail className="w-3 h-3" /> lars@devriesreclame.nl
            </p>
            <p className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase mt-3 mb-1.5" style={{ color: MUTED }}>Contactpersoon</p>
            <div className="flex items-center justify-between p-2 rounded-[6px]" style={{ border: `1px solid ${LINE}` }}>
              <span className="text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ color: INK }}>
                Lars de B… <span className="font-mono text-[10px] font-normal" style={{ color: MUTED }}>(primair)</span>
              </span>
              <ChevronDown className="w-3 h-3" style={{ color: MUTED }} />
            </div>
            <p className="font-mono text-[11px] mt-3" style={{ color: MUTED }}>Deb.nr: 504375</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-semibold" style={{ color: '#3A6B8C', backgroundColor: 'rgba(58,107,140,0.08)' }}>
                <Mail className="w-3 h-3" /> Email
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-semibold" style={{ color: '#2D6B48', backgroundColor: 'rgba(45,107,72,0.08)' }}>
                <ArrowUpRight className="w-3 h-3" /> Profiel
              </span>
            </div>
          </div>

          {/* Totaal incl BTW */}
          <div className="rounded-[12px] p-4 relative overflow-hidden" style={{ backgroundColor: PETROL_DEEP, color: '#FFFFFF' }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Totaal incl btw<span style={{ color: FLAME }}>.</span>
            </p>
            <p className="font-heading text-[34px] font-bold tabular-nums leading-none">€ 0,00</p>
          </div>

          {/* Subtotaal + BTW */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] p-3" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: MUTED }}>Subtotaal</p>
              <p className="font-mono text-[15px] font-bold tabular-nums" style={{ color: INK }}>€ 0,00</p>
            </div>
            <div className="rounded-[10px] p-3" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: MUTED }}>BTW</p>
              <p className="font-mono text-[15px] font-bold tabular-nums" style={{ color: INK }}>€ 0,00</p>
            </div>
          </div>

          {/* Inkoop & verkoop */}
          <div className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: MUTED }}>Inkoop &amp; verkoop<span style={{ color: FLAME }}>.</span></p>
            <div className="flex items-center justify-between py-1.5 text-[13px]" style={{ color: INK }}>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FLAME }} /> Inkoop</span>
              <span className="text-[16px]" style={{ color: MUTED }}>—</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px]" style={{ color: INK }}>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2D6B48' }} /> Verkoop</span>
              <span className="font-mono tabular-nums">€ 0,00</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px] font-semibold" style={{ color: INK }}>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PETROL }} /> Winst</span>
              <span className="text-[16px]" style={{ color: MUTED }}>—</span>
            </div>
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: MUTED }}>Marge<span style={{ color: FLAME }}>.</span></p>
              <div className="flex items-center justify-between p-2 rounded-[6px]" style={{ backgroundColor: BG, border: `1px solid ${LINE}` }}>
                <span className="text-[12px]" style={{ color: MUTED }}>%</span>
                <span className="text-[14px]" style={{ color: MUTED }}>—</span>
              </div>
            </div>
          </div>

          {/* Inkoop card (collapsible-feel) */}
          <div className="rounded-[12px] p-3 flex items-center gap-3" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <span className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(241,80,37,0.10)' }}>
              <DollarSign className="w-4 h-4" style={{ color: FLAME }} strokeWidth={2} />
            </span>
            <div className="flex-1">
              <p className="font-heading text-[13px] font-bold" style={{ color: INK }}>Inkoop<span style={{ color: FLAME }}>.</span></p>
              <p className="text-[11px] italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>leveranciersprijzen</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   INKOOPFACTUREN VIEW
   ────────────────────────────────────────────────────────────── */

type InkoopRow = { datum: string; leverancier: string; nummer: string; bedrag: string; status: 'nieuw' | 'review' }
const inkoopRows: InkoopRow[] = [
  { datum: '18 mei', leverancier: '"M. Verhoef" <m.verhoef@signsupply.nl>', nummer: '-',         bedrag: '€ 0,00',    status: 'nieuw'  },
  { datum: '18 mei', leverancier: 'De heer J. Brouwer',                      nummer: '202614',   bedrag: '€ 1.787,24', status: 'review' },
  { datum: '18 mei', leverancier: 'Vinyl Pro B.V.',                          nummer: '26702333', bedrag: '€ 153,52',   status: 'review' },
  { datum: '18 mei', leverancier: 'Sign Materials BV',                       nummer: '26261036', bedrag: '€ 408,74',   status: 'review' },
  { datum: '18 mei', leverancier: 'Sign Materials BV',                       nummer: '26261035', bedrag: '€ 1.565,62', status: 'review' },
  { datum: '17 mei', leverancier: 'Houtland B.V.',                           nummer: '26701608', bedrag: '€ 331,78',   status: 'review' },
  { datum: '16 mei', leverancier: 'SignTools',                                nummer: 'F00066',   bedrag: '€ 290,40',   status: 'review' },
]

const inkoopKpis = [
  { dot: FLAME,     label: 'Te reviewen.', value: '12',         sub: 'wacht op goedkeuring' },
  { dot: FLAME,     label: 'Open.',         value: '€ 6.329,05', sub: 'totaal openstaand'    },
  { dot: '#2D6B48', label: 'Goedgekeurd.',  value: '28',         sub: 'verwerkt.'             },
  { dot: '#9A5A48', label: 'Deze maand.',   value: '€ 10.954,49', sub: '30 stuks'             },
]

function InkoopView() {
  const [approved, setApproved] = useState<Record<number, boolean>>({})
  return (
    <div className="p-4 md:p-6">
      {/* Top tabs */}
      <div className="flex items-center gap-5 mb-5">
        <span className="text-[13px] font-semibold" style={{ color: MUTED }}>Facturen</span>
        <span className="text-[13px] font-semibold inline-flex items-center gap-1 px-3 py-1 rounded-full" style={{ color: FLAME, backgroundColor: 'rgba(241,80,37,0.08)' }}>
          Inkoopfacturen
        </span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold tracking-tight leading-none inline-flex items-baseline gap-3" style={{ fontSize: 'clamp(28px, 4vw, 44px)', color: INK }}>
          Inkoopfacturen<span style={{ color: FLAME }}>.</span>
          <span className="font-mono text-[13px] font-semibold" style={{ color: MUTED }}>41</span>
        </h1>
        <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold" style={{ color: MUTED, border: `1px solid ${LINE}`, backgroundColor: CARD }}>
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} /> Synchroniseer
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {inkoopKpis.map((k) => (
          <div key={k.label} className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: k.dot }} />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: INK }}>{k.label}</span>
            </div>
            <p className="font-heading text-[26px] md:text-[30px] font-bold leading-none tabular-nums" style={{ color: INK }}>
              {k.value}
              <span className="ml-2 text-[11px] font-normal italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>· {k.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="rounded-[12px] p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-1.5 rounded-md" style={{ border: `1px solid ${LINE}`, backgroundColor: BG }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#9B9B95' }} />
            <span className="font-mono text-[11px]" style={{ color: '#9B9B95' }}>Zoek op leverancier, nummer…</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] inline-flex items-center gap-1" style={{ color: MUTED }}>
              <Download className="w-3 h-3" /> CSV
            </span>
            <span className="font-mono text-[11px] inline-flex items-center gap-1" style={{ color: MUTED }}>
              <FileText className="w-3 h-3" /> Excel
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5 overflow-x-auto whitespace-nowrap">
          {[
            { l: 'Alle', n: '41', active: true },
            { l: 'Nieuw', n: '1' },
            { l: 'Te reviewen', n: '11' },
            { l: 'Goedgekeurd', n: '28' },
            { l: 'Afgewezen', n: '1' },
          ].map((f) => (
            <span key={f.l} className="text-[12px] font-semibold inline-flex items-baseline gap-1.5" style={{
              color: f.active ? FLAME : MUTED,
              borderBottom: f.active ? `2px solid ${FLAME}` : '2px solid transparent',
              paddingBottom: 4,
            }}>
              {f.l}<span className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>{f.n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[12px] overflow-x-auto" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="grid grid-cols-[0.6fr_2fr_1fr_0.8fr_0.8fr] gap-3 px-5 py-3 font-mono text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: MUTED, borderBottom: `1px solid ${LINE}`, minWidth: 720 }}>
          <span>Datum</span>
          <span>Leverancier</span>
          <span>Nummer</span>
          <span className="text-right">Bedrag</span>
          <span>Status</span>
        </div>
        {inkoopRows.map((r, i) => {
          const isApproved = approved[i] === true
          const isNew = r.status === 'nieuw' && !isApproved
          const tone = isApproved ? '#2D6B48' : FLAME
          return (
            <div
              key={i}
              className="grid grid-cols-[0.6fr_2fr_1fr_0.8fr_0.8fr] gap-3 px-5 py-3.5 items-center transition-colors"
              style={{ borderTop: `1px solid ${LINE}`, borderLeft: `3px solid ${tone}`, minWidth: 720 }}
            >
              <div className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ border: `1.5px solid ${tone}` }} />
                <span className="text-[12.5px]" style={{ color: INK }}>{r.datum}</span>
              </div>
              <span className="text-[12.5px] truncate" style={{ color: INK }}>{r.leverancier}</span>
              <span className="font-mono text-[11.5px]" style={{ color: MUTED }}>{r.nummer}</span>
              <span className="text-right font-mono text-[12.5px] tabular-nums" style={{ color: INK }}>{r.bedrag}</span>
              <span>
                <button
                  type="button"
                  onClick={() => setApproved((a) => ({ ...a, [i]: !a[i] }))}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer hover:opacity-80"
                  style={
                    isApproved
                      ? { backgroundColor: 'rgba(45,107,72,0.12)', color: '#2D6B48' }
                      : isNew
                      ? { backgroundColor: 'rgba(241,80,37,0.10)', color: FLAME }
                      : { backgroundColor: 'rgba(229,207,164,0.30)', color: '#9A5A48' }
                  }
                  title={isApproved ? 'Klik om terug te zetten' : 'Klik om goed te keuren'}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isApproved ? '#2D6B48' : isNew ? FLAME : '#9A5A48' }} />
                  {isApproved ? 'Goedgekeurd' : isNew ? 'Nieuw' : 'Te reviewen'}<span>.</span>
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   TAKEN VIEW — week calendar with todo items
   ────────────────────────────────────────────────────────────── */

type Taak = { day: number; hour: number; titel: string; sub?: string; done?: boolean; highlight?: boolean }

const taken: Taak[] = [
  { day: 0, hour: 1.5,  titel: 'Even contact opnemen',         sub: 'Doek voor hek',     done: true },
  { day: 0, hour: 3,    titel: 'Klant bellen',                 sub: 'Doek voor hek',     done: true },
  { day: 0, hour: 4.5,  titel: 'Design bestanden maken',       sub: 'Plafond signing',   highlight: true },
  { day: 0, hour: 6,    titel: 'RE: Voorbeeld letters',        sub: '1.25u',             done: true },
  { day: 0, hour: 7.5,  titel: 'Bordjes bestellen met EPS logo', sub: 'Plaatjes voor nam…', done: true },
  { day: 0, hour: 9,    titel: 'Drukproef goedkeuren',         sub: 'Van Meer & Co',     highlight: true },
  { day: 0, hour: 12,   titel: 'Eindcheck montage',            sub: 'Lichtreclame',      done: true },
  { day: 0, hour: 14.5, titel: 'Werkbonnen maken',             sub: 'Diversen buitenre…', done: true },
  { day: 1, hour: 8,    titel: 'Bestellen?',                   sub: 'Geveltekst',        highlight: true },
  { day: 1, hour: 10,   titel: 'Shirt bestellen',              sub: 'Mokken + Display …', done: true },
  { day: 1, hour: 12,   titel: 'Offerte maken',                sub: 'Logo Bakkerij Steeg', highlight: true },
]

const takenDays = [
  { d: 'Ma', n: 18, today: true,  count: '' },
  { d: 'Di', n: 19,                count: '3' },
  { d: 'Wo', n: 20,                count: '' },
  { d: 'Do', n: 21,                count: '' },
  { d: 'Vr', n: 22,                count: '' },
]
const TAKEN_HOURS = Array.from({ length: 16 }, (_, i) => i + 1)

function TakenView() {
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})
  const toggle = (i: number, current: boolean) =>
    setOverrides((o) => ({ ...o, [i]: !(i in o ? o[i] : current) }))
  return (
    <div className="flex flex-col" style={{ minHeight: 620 }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-heading text-[22px] font-bold tracking-tight leading-none inline-flex items-baseline gap-2" style={{ color: INK }}>
            Taken<span style={{ color: FLAME }}>.</span>
            <span className="font-mono text-[12px] font-semibold" style={{ color: MUTED }}>42/106</span>
          </h1>
          <div className="flex items-center gap-3 text-[12px]" style={{ color: MUTED }}>
            <span style={{ color: INK, fontWeight: 700 }}>Alle</span>
            <span>Project</span>
            <span>Los</span>
            <span>|</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ color: PETROL, backgroundColor: 'rgba(26,83,92,0.06)' }}>
              <Wrench className="w-3 h-3" /> Montage
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-8 h-8 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: '#E2F0F0', color: PETROL }}>J</span>
          <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-[12px] font-semibold" style={{ color: '#2D6B48', backgroundColor: 'rgba(45,107,72,0.08)' }}>
            <span className="w-5 h-5 rounded-full inline-flex items-center justify-center font-mono text-[10px] font-bold" style={{ backgroundColor: '#7BB89A', color: '#FFFFFF' }}>J</span>
            Jan Visser <ChevronDown className="w-3 h-3" />
          </span>
          <div className="inline-flex p-0.5 rounded-md" style={{ border: `1px solid ${LINE}` }}>
            <span className="px-3 h-7 inline-flex items-center text-[12px] font-bold rounded-[6px]" style={{ backgroundColor: INK, color: '#FFFFFF' }}>Week</span>
            <span className="px-3 h-7 inline-flex items-center text-[12px] font-bold" style={{ color: MUTED }}>Maand</span>
            <span className="px-3 h-7 inline-flex items-center text-[12px] font-bold" style={{ color: MUTED }}>Team</span>
          </div>
          <span className="text-[12px] font-semibold" style={{ color: INK }}>{'<'} 18 – 22 mei {'>'}</span>
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: MUTED }}>
            <span>A</span><span style={{ color: INK, fontWeight: 700 }}>A</span>
          </span>
        </div>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto flex-1">
        <div className="grid" style={{ gridTemplateColumns: '40px repeat(5, minmax(150px, 1fr))', minWidth: 800 }}>
          {/* Day headers */}
          <div className="px-2 py-3" style={{ borderBottom: `1px solid ${LINE}` }} />
          {takenDays.map((d, i) => (
            <div
              key={i}
              className="px-3 py-3 text-center"
              style={{
                borderBottom: `1px solid ${LINE}`,
                borderLeft: `1px solid ${LINE}`,
              }}
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mb-1" style={{ color: MUTED }}>{d.d}.</p>
              <p
                className="inline-flex items-center justify-center font-heading text-[18px] font-bold rounded-full"
                style={{
                  width: 30, height: 30,
                  backgroundColor: d.today ? PETROL : 'transparent',
                  color: d.today ? '#FFFFFF' : INK,
                }}
              >
                {d.n}
              </p>
              {d.count && <span className="ml-1 font-mono text-[10px]" style={{ color: '#9B9B95' }}>{d.count}</span>}
              <p className="text-[11px] mt-1" style={{ color: '#C8C8C0' }}>+</p>
            </div>
          ))}

          {/* Hour rows */}
          {TAKEN_HOURS.map((h) => (
            <FragmentRow key={h}>
              <div className="px-2 py-3 font-mono text-[10px] tabular-nums" style={{ color: '#9B9B95', borderBottom: `1px dashed ${LINE}` }}>
                {String(h).padStart(2, '0')}
              </div>
              {takenDays.map((day, dayIdx) => {
                const slot = taken.filter((t) => t.day === dayIdx && Math.floor(t.hour) === h && (t.hour - h) < 1)
                return (
                  <div
                    key={dayIdx}
                    className="relative"
                    style={{
                      borderBottom: `1px dashed ${LINE}`,
                      borderLeft: `1px solid ${LINE}`,
                      minHeight: 56,
                      backgroundColor: day.today ? 'rgba(241,80,37,0.015)' : 'transparent',
                    }}
                  >
                    {slot.map((t) => {
                      const idx = taken.indexOf(t)
                      const offsetMin = (t.hour - h) * 60
                      const done = idx in overrides ? overrides[idx] : Boolean(t.done)
                      return (
                        <div
                          key={idx}
                          className="absolute left-1 right-1 rounded-[6px] px-2.5 py-1.5 transition-colors cursor-pointer hover:bg-[rgba(26,83,92,0.05)]"
                          style={{
                            top: `${offsetMin / 60 * 56 + 2}px`,
                            backgroundColor: t.highlight && !done ? 'rgba(58,107,140,0.10)' : 'transparent',
                            borderLeft: t.highlight && !done ? `3px solid #3A6B8C` : `3px solid transparent`,
                          }}
                          onClick={() => toggle(idx, Boolean(t.done))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(idx, Boolean(t.done)) } }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 inline-flex items-center justify-center transition-colors" style={{ backgroundColor: done ? PETROL : 'transparent', border: done ? 'none' : `1.5px solid ${t.highlight ? '#3A6B8C' : MUTED}` }}>
                              {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold leading-snug truncate" style={{
                                color: done ? '#9B9B95' : t.highlight ? '#3A6B8C' : INK,
                                textDecoration: done ? 'line-through' : 'none',
                              }}>{t.titel}</p>
                              {t.sub && (
                                <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: '#9B9B95' }}>
                                  {String(h).padStart(2, '0')}:{String(Math.round(offsetMin)).padStart(2, '0')}
                                  <span className="ml-1.5">{t.sub}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </FragmentRow>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   CALCULATIE MODAL — opent vanuit Offerte view
   ────────────────────────────────────────────────────────────── */

type CalcRow = { product: string; aantal: number; eenh: string; inkoop: string; verkoop: string; marge: string; korting: string; totaal: string; placeholder?: boolean }

const calcRows: CalcRow[] = [
  { product: 'Montage buiten',     aantal: 1, eenh: 'stuks', inkoop: '€ 40,00', verkoop: '€ 85,20', marge: '113%', korting: '0%', totaal: '€ 85,20' },
  { product: 'Voorbereiding',      aantal: 1, eenh: 'stuks', inkoop: '€ 40,00', verkoop: '€ 85,20', marge: '113%', korting: '0%', totaal: '€ 85,20' },
  { product: 'Inkoop',             aantal: 1, eenh: 'stuks', inkoop: '€ 0,00',  verkoop: '€ 0,00',  marge: '85%',  korting: '0%', totaal: '€ —',     placeholder: true },
  { product: 'Inkoop 2',           aantal: 1, eenh: 'stuks', inkoop: '€ 0,00',  verkoop: '€ 0,00',  marge: '85%',  korting: '0%', totaal: '€ —',     placeholder: true },
  { product: 'Benaderingsmateriaal', aantal: 1, eenh: 'stuks', inkoop: '€ 0,00', verkoop: '€ 0,00', marge: '85%',  korting: '0%', totaal: '€ —',     placeholder: true },
  { product: 'Verzendkosten',      aantal: 1, eenh: 'stuks', inkoop: '€ 0,00',  verkoop: '€ 0,00',  marge: '85%',  korting: '0%', totaal: '€ —',     placeholder: true },
]

function CalculatieModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(20,40,40,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[920px] rounded-[14px] overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 24px 60px -16px rgba(20,40,40,0.40)',
          border: `1px solid ${LINE}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 md:px-7 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h3 className="font-heading text-[22px] md:text-[26px] font-bold tracking-tight leading-none inline-flex items-baseline gap-2" style={{ color: INK }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PETROL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}>
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="8" y1="11" x2="10" y2="11"/>
                <line x1="13" y1="11" x2="16" y2="11"/>
                <line x1="8" y1="15" x2="10" y2="15"/>
                <line x1="13" y1="15" x2="16" y2="15"/>
                <line x1="8" y1="19" x2="16" y2="19"/>
              </svg>
              Calculatie maken
            </h3>
            <p className="text-[13px] mt-2" style={{ color: MUTED }}>
              Bouw hier de prijs op uit losse onderdelen. Vul inkoop- en verkoopprijzen in, de marge wordt automatisch berekend.
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 inline-flex items-center justify-center" aria-label="Sluiten">
            <span className="text-[20px] leading-none" style={{ color: MUTED }}>×</span>
          </button>
        </div>

        {/* Omschrijving + template */}
        <div className="px-5 md:px-7 pb-4">
          <p className="text-[12px] font-semibold mb-2" style={{ color: INK }}>Omschrijving offerte-regel</p>
          <div className="px-3 py-2.5 rounded-[8px] text-[14px] font-semibold mb-3" style={{ backgroundColor: BG, border: `1px solid ${LINE}`, color: INK }}>
            Product inclusief montage
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12px] font-bold" style={{ border: `1px solid ${LINE}`, color: INK, backgroundColor: BG }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 4"/></svg>
              Template laden
            </span>
            <span className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[11px] font-bold tracking-[0.1em] uppercase" style={{ border: `1px solid ${LINE}`, color: MUTED, backgroundColor: BG }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              5 producten in catalogus
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="px-5 md:px-7 overflow-x-auto" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="grid grid-cols-[1.6fr_0.55fr_0.65fr_0.85fr_0.85fr_0.65fr_0.7fr_0.85fr_28px] gap-3 py-3 font-mono text-[10px] font-bold tracking-[0.1em] uppercase items-center" style={{ color: MUTED, minWidth: 720 }}>
            <span>Product</span>
            <span>Aantal</span>
            <span>Eenh.</span>
            <span>Inkoop</span>
            <span>Verkoop</span>
            <span>Marge%</span>
            <span>Korting%</span>
            <span className="text-right">Regeltotaal</span>
            <span />
          </div>
          {calcRows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.6fr_0.55fr_0.65fr_0.85fr_0.85fr_0.65fr_0.7fr_0.85fr_28px] gap-3 py-2.5 items-center text-[12.5px]"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, minWidth: 720 }}
            >
              <span style={{ color: INK }}>{r.product}</span>
              <span className="font-mono tabular-nums" style={{ color: r.placeholder ? MUTED : INK }}>{r.aantal}</span>
              <span className="font-mono inline-flex items-center gap-1" style={{ color: MUTED }}>{r.eenh} <ChevronDown className="w-3 h-3" /></span>
              <span className="font-mono tabular-nums" style={{ color: r.placeholder ? '#C8C8C0' : INK }}>{r.inkoop}</span>
              <span className="font-mono tabular-nums" style={{ color: r.placeholder ? '#C8C8C0' : INK }}>{r.verkoop}</span>
              <span className="font-mono" style={{ color: '#2D6B48' }}>{r.marge}</span>
              <span className="font-mono" style={{ color: MUTED }}>{r.korting}</span>
              <span className="text-right font-mono tabular-nums" style={{ color: r.placeholder ? '#C8C8C0' : INK, fontWeight: r.placeholder ? 400 : 700 }}>{r.totaal}</span>
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#C8C8C0' }} strokeWidth={2} />
            </div>
          ))}
          <div className="my-3 py-3 text-center rounded-[10px] text-[12px] font-bold inline-flex items-center justify-center gap-2 w-full" style={{ border: `1px dashed ${LINE}`, color: INK }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} /> Regel toevoegen
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-4 gap-0 mx-5 md:mx-7 mb-5 rounded-[10px] overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
          <div className="p-3" style={{ backgroundColor: BG }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Totaal inkoop</p>
            <p className="font-heading text-[18px] font-bold tabular-nums" style={{ color: INK }}>€ 80,00</p>
          </div>
          <div className="p-3" style={{ backgroundColor: BG, borderLeft: `1px solid ${LINE}` }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Totaal verkoop</p>
            <p className="font-heading text-[18px] font-bold tabular-nums" style={{ color: INK }}>€ 170,40</p>
          </div>
          <div className="p-3" style={{ backgroundColor: BG, borderLeft: `1px solid ${LINE}` }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Marge (113%)</p>
            <p className="font-heading text-[18px] font-bold tabular-nums" style={{ color: '#2D6B48' }}>€ 90,40</p>
          </div>
          <div className="p-3 text-white" style={{ backgroundColor: PETROL_DEEP }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Verkooptotaal<span style={{ color: FLAME }}>.</span></p>
            <p className="font-heading text-[18px] font-bold tabular-nums">€ 170,40</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 md:px-7 py-4 flex items-center justify-end gap-3" style={{ borderTop: `1px solid ${LINE}`, backgroundColor: BG }}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 px-5 rounded-md text-[13px] font-semibold"
            style={{ border: `1px solid ${LINE}`, color: INK, backgroundColor: CARD }}
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-[13px] font-bold text-white"
            style={{ backgroundColor: FLAME, boxShadow: '0 6px 16px rgba(241,80,37,0.32)' }}
          >
            <FileEdit className="w-3.5 h-3.5" strokeWidth={2.4} />
            Calculatie overnemen
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   KLANTEN VIEW
   ────────────────────────────────────────────────────────────── */

type KlantStatus = 'normaal' | 'vooruit' | 'niet-helpen' | 'voorrang' | 'geblokkeerd'
const klantStatusColor: Record<KlantStatus, string> = {
  normaal: '#9B9B95',
  vooruit: '#9A5A48',
  'niet-helpen': '#C03A18',
  voorrang: '#2D6B48',
  geblokkeerd: '#7A2419',
}

const klanten: { initial: string; avBg: string; naam: string; email?: string; tel?: string; stad: string; projecten: number; status: KlantStatus }[] = [
  { initial: 'A', avBg: '#EEE8F5', naam: 'Atelier 9',              email: 'info@atelier9.nl',          tel: '020 - 555 1234',  stad: 'AMSTERDAM',  projecten: 4, status: 'voorrang' },
  { initial: 'B', avBg: '#E4F0EA', naam: 'Bakkerij Steeg',         email: 'bestelling@bakkerijsteeg.nl', tel: '0299 - 422 100',  stad: 'BEEMSTER',   projecten: 7, status: 'normaal' },
  { initial: 'B', avBg: '#E4F0EA', naam: 'Bouwbedrijf Reus',                                                                  stad: 'VOLENDAM',   projecten: 0, status: 'normaal' },
  { initial: 'C', avBg: '#FBE0D5', naam: 'Café De Zon',            email: 'info@cafedezon.nl',          tel: '0228 - 511 080',  stad: 'ENKHUIZEN',  projecten: 2, status: 'normaal' },
  { initial: 'D', avBg: '#E5ECF6', naam: 'De Vries Reclame',       email: 'admin@devriesreclame.nl',    tel: '075 - 612 9988',  stad: 'ZAANDAM',    projecten: 12, status: 'vooruit' },
  { initial: 'G', avBg: '#E4F0EA', naam: 'Groenland BV',           email: 'facturen@groenland.nl',      tel: '020 - 670 3344',  stad: 'AMSTELVEEN', projecten: 3, status: 'normaal' },
  { initial: 'J', avBg: '#E2F0F0', naam: 'Jachtwerf Kemper',       email: 'info@jachtwerfkemper.nl',    tel: '0228 - 318 000',  stad: 'MEDEMBLIK',  projecten: 1, status: 'normaal' },
  { initial: 'K', avBg: '#F2E8E5', naam: 'Kemper B.V.',            email: 'bestelbon@kemper.nl',        tel: '070 - 800 0044',  stad: 'DEN HAAG',   projecten: 5, status: 'normaal' },
  { initial: 'V', avBg: '#FAE5D5', naam: 'Van Meer & Co',          email: 'admin@vanmeer-co.nl',        tel: '015 - 220 1900',  stad: 'DELFT',      projecten: 9, status: 'voorrang' },
]

const klantKpis = [
  { dot: FLAME,     label: 'Met aandacht.', value: '0',    sub: 'niet helpen of geblokkeerd' },
  { dot: FLAME,     label: 'Actief.',        value: '1875', sub: 'lopende klanten' },
  { dot: FLAME,     label: 'Prospect.',      value: '1',    sub: 'in opvolging' },
  { dot: '#9A5A48', label: 'Inactief.',      value: '0',    sub: 'rust.' },
]

function KlantenView() {
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold tracking-tight leading-none inline-flex items-baseline gap-3" style={{ fontSize: 'clamp(28px, 4vw, 44px)', color: INK }}>
          Klanten<span style={{ color: FLAME }}>.</span>
          <span className="font-mono text-[13px] font-semibold" style={{ color: MUTED }}>1876</span>
        </h1>
        <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: PETROL_DEEP }}>
          <Users className="w-3.5 h-3.5" strokeWidth={2} /> Nieuwe klant
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {klantKpis.map((k) => (
          <div key={k.label} className="rounded-[12px] p-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: k.dot }} />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: INK }}>{k.label}</span>
            </div>
            <p className="font-heading text-[28px] md:text-[34px] font-bold leading-none tabular-nums" style={{ color: INK }}>
              {k.value}
              <span className="ml-2 text-[11px] font-normal italic" style={{ color: MUTED, fontFamily: '"Instrument Serif", Georgia, serif' }}>· {k.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="rounded-[12px] p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        {/* Top: search + view toggle + sort + export */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[180px] px-3 py-1.5 rounded-md" style={{ border: `1px solid ${LINE}`, backgroundColor: BG }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#9B9B95' }} />
            <span className="font-mono text-[11px]" style={{ color: '#9B9B95' }}>Zoek op naam, email, stad, tag…</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#9B9B95', border: `1px solid ${LINE}` }}>/</span>
          </div>
          <div className="inline-flex p-0.5 rounded-md" style={{ border: `1px solid ${LINE}` }}>
            <span className="px-2 h-7 inline-flex items-center" style={{ color: MUTED }}><LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.8} /></span>
            <span className="px-2 h-7 inline-flex items-center rounded-[4px]" style={{ backgroundColor: 'rgba(26,83,92,0.08)', color: PETROL }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></span>
          </div>
          <div className="inline-flex items-center gap-3 text-[12px]">
            <span className="px-3 h-7 inline-flex items-center rounded-md font-semibold" style={{ backgroundColor: 'rgba(45,107,72,0.10)', color: '#2D6B48' }}>Naam ↑</span>
            <span style={{ color: MUTED }}>Stad</span>
            <span style={{ color: MUTED }}>Status</span>
            <span style={{ color: MUTED }}>Datum</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: MUTED }}>
            <span className="inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Import</span>
            <span className="inline-flex items-center gap-1"><Download className="w-3 h-3" /> CSV</span>
            <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> Excel</span>
          </div>
        </div>

        {/* Status filter row */}
        <div className="flex items-center gap-5 mb-3 overflow-x-auto whitespace-nowrap">
          {[
            { l: 'Alle', n: '1876', active: true },
            { l: 'Actief', n: '1875' },
            { l: 'Inactief', n: '0' },
            { l: 'Prospect', n: '1' },
            { l: 'Met aandacht', n: '0' },
          ].map((f) => (
            <span key={f.l} className="text-[12px] font-semibold inline-flex items-baseline gap-1.5" style={{
              color: f.active ? '#2D6B48' : MUTED,
              borderBottom: f.active ? `2px solid #2D6B48` : '2px solid transparent',
              paddingBottom: 4,
            }}>
              {f.l}{f.n !== '0' && <span className="font-mono text-[10px]" style={{ color: '#9B9B95' }}>{f.n}</span>}
            </span>
          ))}
        </div>

        {/* Labels row */}
        <div className="flex items-center gap-4 mb-3 overflow-x-auto whitespace-nowrap text-[12px]" style={{ color: MUTED }}>
          <span className="font-semibold" style={{ color: '#2D6B48', borderBottom: `2px solid #2D6B48`, paddingBottom: 4 }}>Alle labels</span>
          {['Vooruit betalen', 'Niet helpen', 'Voorrang', 'Grote klant', 'Wanbetaler'].map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>

        {/* Statussen row */}
        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[12px]" style={{ color: MUTED }}>
          <span className="font-semibold" style={{ color: '#2D6B48', borderBottom: `2px solid #2D6B48`, paddingBottom: 4 }}>Alle statussen</span>
          {(['normaal', 'vooruit', 'niet-helpen', 'voorrang', 'geblokkeerd'] as KlantStatus[]).map((s) => {
            const label = s === 'vooruit' ? 'Vooruit betalen' : s === 'niet-helpen' ? 'Niet helpen' : s === 'normaal' ? 'Normaal' : s === 'voorrang' ? 'Voorrang' : 'Geblokkeerd'
            return (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: klantStatusColor[s] }} />
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[12px] overflow-x-auto" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
        <div className="grid grid-cols-[40px_2fr_1.6fr_1fr_1fr_0.5fr] gap-3 px-5 py-3 font-mono text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: MUTED, borderBottom: `1px solid ${LINE}`, minWidth: 820 }}>
          <span />
          <span>Bedrijfsnaam</span>
          <span>Email</span>
          <span>Telefoon</span>
          <span>Stad</span>
          <span className="text-right">Projecten</span>
        </div>
        {klanten.map((k, i) => (
          <div
            key={i}
            className="grid grid-cols-[40px_2fr_1.6fr_1fr_1fr_0.5fr] gap-3 px-5 py-3 items-center transition-colors hover:bg-[rgba(26,83,92,0.03)] cursor-pointer"
            style={{ borderTop: `1px solid ${LINE}`, borderLeft: `3px solid ${klantStatusColor[k.status]}`, minWidth: 820 }}
          >
            <span className="w-7 h-7 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: k.avBg, color: INK }}>{k.initial}</span>
            <span className="text-[13px] font-semibold truncate" style={{ color: INK }}>{k.naam}</span>
            <span className="text-[12px] truncate" style={{ color: MUTED }}>{k.email ?? ''}</span>
            <span className="font-mono text-[11.5px]" style={{ color: MUTED }}>{k.tel ?? ''}</span>
            <span className="text-[12px] font-mono uppercase tracking-wide" style={{ color: INK }}>{k.stad}</span>
            <span className="text-right font-mono text-[12px] tabular-nums" style={{ color: k.projecten === 0 ? '#9B9B95' : INK, fontWeight: k.projecten === 0 ? 400 : 700 }}>{k.projecten}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
