import { useState, useMemo } from 'react'
import {
  Search, BookOpen, FolderKanban, FileText, Receipt, Users, ClipboardCheck,
  Calendar, CheckCircle, Mail, Globe, PiggyBank, Sparkles, ChevronRight,
  Wrench, ArrowLeft, Zap, Shield, BarChart3, Palette, Bell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

// ── Article data ──

interface KbArticle {
  id: string
  category: string
  icon: React.ElementType
  iconColor: string
  titel: string
  subtitel: string
  inhoud: string[]  // paragraphs
  tips?: string[]
  link?: string     // navigate to this route
}

const CATEGORIES = [
  { id: 'start', label: 'Aan de slag', icon: Zap, color: '#F15025' },
  { id: 'projecten', label: 'Projecten', icon: FolderKanban, color: '#1A535C' },
  { id: 'offertes', label: 'Offertes', icon: FileText, color: '#F15025' },
  { id: 'klanten', label: 'Klanten', icon: Users, color: '#3A6B8C' },
  { id: 'financieel', label: 'Financieel', icon: PiggyBank, color: '#2D6B48' },
  { id: 'uitvoering', label: 'Uitvoering', icon: Wrench, color: '#1A535C' },
  { id: 'communicatie', label: 'Communicatie', icon: Mail, color: '#6A5A8A' },
  { id: 'slim-werken', label: 'Slim werken', icon: Sparkles, color: '#9A5A48' },
]

const ARTICLES: KbArticle[] = [
  // ── Aan de slag ──
  {
    id: 'welkom',
    category: 'start',
    icon: Zap,
    iconColor: '#F15025',
    titel: 'Welkom bij Doen.',
    subtitel: 'Alles wat je nodig hebt, op één plek',
    inhoud: [
      'Doen. is gebouwd voor creatieve maakbedrijven. Signing, reclame, interieurbouw — bedrijven die ideeën omzetten in fysieke producten. Geen overbodige complexiteit, wel alles wat je nodig hebt.',
      'Van het eerste klantcontact tot de laatste factuur: projecten, offertes, werkbonnen, planning, email en een klantportaal. Allemaal verbonden, allemaal snel.',
    ],
    tips: [
      'Begin met een klant aanmaken en je eerste project starten',
      'Stel je bedrijfsprofiel in via Instellingen > Profiel',
      'Verbind je email via Instellingen > E-mail voor directe communicatie',
    ],
  },
  {
    id: 'snelstart',
    category: 'start',
    icon: ChevronRight,
    iconColor: '#1A535C',
    titel: 'De snelste workflow',
    subtitel: 'In 5 stappen van klant naar factuur',
    inhoud: [
      '1. Klant aanmaken — bedrijfsnaam, contactpersoon, adres. Dat is alles.',
      '2. Offerte maken — selecteer de klant, voeg items toe met je prijscalculatie, verstuur direct per email met PDF bijlage.',
      '3. Project starten — zodra de offerte goedgekeurd is, maak je een project aan. Taken toewijzen, montage plannen.',
      '4. Uitvoeren — werkbon genereren voor de monteurs, planning bijhouden, foto\'s uploaden vanuit het veld.',
      '5. Factureren — met één klik een factuur aanmaken op basis van de offerte. Betaallink via Mollie, automatische herinneringen.',
    ],
  },

  // ── Projecten ──
  {
    id: 'projecten-cockpit',
    category: 'projecten',
    icon: FolderKanban,
    iconColor: '#1A535C',
    titel: 'De project cockpit',
    subtitel: 'Alles over je project in één scherm',
    inhoud: [
      'Elk project heeft een cockpit — je commandocentrum. Hier zie je in één oogopslag: briefing, taken, offertes, montage-afspraken, bestanden en activiteit.',
      'Bovenaan staan quick actions: Taak, Offerte, Werkbon, Montage, Factuur. Eén klik en je bent bezig.',
      'De briefing is je projectomschrijving. Klik om te typen. Geen gedoe met formulieren — gewoon schrijven wat er moet gebeuren.',
    ],
    tips: [
      'Gebruik de briefing als interne opdracht voor je team',
      'Taken worden automatisch afgevinkt als montage is afgerond',
      'Upload situatiefoto\'s direct in het project',
    ],
    link: '/projecten',
  },
  {
    id: 'project-statussen',
    category: 'projecten',
    icon: BarChart3,
    iconColor: '#1A535C',
    titel: 'Project statussen',
    subtitel: 'Van gepland tot gefactureerd',
    inhoud: [
      'Elk project doorloopt een traject: Gepland → Actief → Te plannen → Te factureren → Gefactureerd → Afgerond.',
      'Doen. suggereert automatisch de volgende stap. Alle taken afgerond? "Klaar voor montage?" verschijnt. Montage klaar? "Klaar om te factureren."',
      'Je kunt statussen ook handmatig wijzigen via de header van het project.',
    ],
  },

  // ── Offertes ──
  {
    id: 'offertes-maken',
    category: 'offertes',
    icon: FileText,
    iconColor: '#F15025',
    titel: 'Offertes maken',
    subtitel: 'Van idee naar professionele offerte in minuten',
    inhoud: [
      'Selecteer een klant, kies een contactpersoon, geef je offerte een titel en je bent bezig. Items toevoegen met beschrijving, aantal, prijs, BTW en korting.',
      'De offerte wordt automatisch opgeslagen terwijl je werkt (autosave). Download als PDF, verstuur per email, of deel via het klantportaal.',
      'Offertes hebben versioning — maak een nieuwe versie aan als de klant wijzigingen wil. De historie blijft bewaard.',
    ],
    tips: [
      'Gebruik calculatie-templates voor terugkerende producten (Instellingen > Calculatie)',
      'De PDF wordt automatisch als bijlage meegestuurd bij email',
      'Klanten kunnen offertes goedkeuren via het portaal met één klik',
    ],
    link: '/offertes',
  },
  {
    id: 'offerte-opvolging',
    category: 'offertes',
    icon: Bell,
    iconColor: '#F15025',
    titel: 'Automatische opvolging',
    subtitel: 'Nooit meer een offerte vergeten',
    inhoud: [
      'Stel automatische opvolging in voor verstuurde offertes. Na X dagen krijgt de klant automatisch een herinnering — of je krijgt een notificatie om zelf na te bellen.',
      'Configureer je opvolg-strategie in Instellingen > Offertes > Opvolging. Kies het aantal dagen, de emailtekst en of het automatisch of handmatig gaat.',
    ],
  },

  // ── Klanten ──
  {
    id: 'klanten-beheer',
    category: 'klanten',
    icon: Users,
    iconColor: '#3A6B8C',
    titel: 'Klantenbeheer',
    subtitel: 'Alle klantinformatie op één plek',
    inhoud: [
      'Elke klant heeft een profiel met bedrijfsgegevens, contactpersonen, vestigingen en een complete historie van projecten, offertes en facturen.',
      'Meerdere contactpersonen per bedrijf — markeer wie de primaire contactpersoon is. Vestigingen voor bedrijven met meerdere locaties.',
      'De klantkaart toont alles: openstaande offertes, lopende projecten, factuurhistorie. Zodat je altijd weet waar je staat.',
    ],
    tips: [
      'Importeer klanten vanuit een CSV via Importeren',
      'Contactpersonen kun je direct aanmaken vanuit een offerte',
    ],
    link: '/klanten',
  },
  {
    id: 'klantportaal',
    category: 'klanten',
    icon: Globe,
    iconColor: '#6A5A8A',
    titel: 'Klantportaal',
    subtitel: 'Deel tekeningen, offertes en updates met je klant',
    inhoud: [
      'Activeer het portaal voor een project en je klant krijgt een unieke link. Daar kan de klant offertes bekijken en goedkeuren, tekeningen inzien, berichten sturen en bestanden uploaden.',
      'Geen inloggen nodig — de link is het toegangsbewijs. Veilig en simpel.',
      'Je krijgt een notificatie als de klant reageert of een offerte goedkeurt.',
    ],
    link: '/portalen',
  },

  // ── Financieel ──
  {
    id: 'facturen',
    category: 'financieel',
    icon: Receipt,
    iconColor: '#2D6B48',
    titel: 'Factureren',
    subtitel: 'Professionele facturen met betaallink',
    inhoud: [
      'Maak facturen aan op basis van goedgekeurde offertes — alle regels worden automatisch overgenomen. Of maak een losse factuur.',
      'Facturen worden verstuurd per email met PDF bijlage. Optioneel met Mollie betaallink zodat klanten direct online kunnen betalen.',
      'Automatische herinneringen bij vervallen facturen: 1e herinnering na 7 dagen, 2e na 14, 3e na 21, aanmaning na 30 dagen.',
    ],
    tips: [
      'Koppel Mollie via Instellingen > Integraties voor online betalingen',
      'Creditnota\'s maken kan direct vanuit een bestaande factuur',
      'UBL/e-facturatie export voor je boekhouding',
    ],
    link: '/facturen',
  },
  {
    id: 'financieel-overzicht',
    category: 'financieel',
    icon: PiggyBank,
    iconColor: '#2D6B48',
    titel: 'Financieel overzicht',
    subtitel: 'Omzet, openstaand en cashflow in één oogopslag',
    inhoud: [
      'Het financieel dashboard toont je omzet deze maand, openstaande facturen, te factureren bedragen en je hit rate op offertes.',
      'Filter op periode, klant of project. Exporteer naar CSV voor je boekhouder.',
      'Grootboekrekeningen en BTW-codes configureer je in Instellingen > Financieel.',
    ],
    link: '/financieel',
  },

  // ── Uitvoering ──
  {
    id: 'werkbonnen',
    category: 'uitvoering',
    icon: ClipboardCheck,
    iconColor: '#F15025',
    titel: 'Werkbonnen',
    subtitel: 'Instructies voor je monteurs',
    inhoud: [
      'Een werkbon is de opdracht voor je monteur: wat moet er gedaan worden, waar, en met welke materialen. Koppel aan een project en offerte.',
      'Voeg items toe met beschrijving en afbeeldingen. De monteur ziet dit op zijn telefoon of tablet.',
      'Na afloop kan de monteur uren registreren, opmerkingen toevoegen, foto\'s uploaden en een klanthandtekening laten zetten.',
    ],
    tips: [
      'Genereer een PDF werkbon-instructie voor de monteur',
      'Deel de werkbon via WhatsApp met je team',
    ],
    link: '/werkbonnen',
  },
  {
    id: 'planning',
    category: 'uitvoering',
    icon: Calendar,
    iconColor: '#1A535C',
    titel: 'Montage planning',
    subtitel: 'Weekoverzicht met drag-and-drop',
    inhoud: [
      'De montageplanning toont een weekoverzicht met alle montage-afspraken per dag. Sleep "te plannen" projecten direct naar een dag om een afspraak in te plannen.',
      'Filter op monteur om per persoon te zien wat er gepland staat. Het weerbericht is geïntegreerd — handig voor buitenwerk.',
      'Statusbeheer: Gepland → Onderweg → Bezig → Afgerond. Met conflict-detectie als monteurs dubbel gepland staan.',
    ],
    tips: [
      'Gebruik het "Overzicht" filter om alle monteurs tegelijk te zien',
      'Klik op een afspraak om details te bewerken of een werkbon te koppelen',
    ],
    link: '/planning?modus=montage',
  },
  {
    id: 'taken',
    category: 'uitvoering',
    icon: CheckCircle,
    iconColor: '#5A5A55',
    titel: 'Takenbeheer',
    subtitel: 'Wat moet er nog gebeuren?',
    inhoud: [
      'Taken zijn je to-do lijst, gekoppeld aan projecten of los. Wijs taken toe aan teamleden, stel deadlines in en volg de voortgang.',
      'Prioriteiten: Kritiek, Hoog, Medium, Laag. Het dashboard toont altijd je top 5 taken op prioriteit.',
      'In de weekplanning zie je taken op een tijdlijn — sleep ze naar een ander tijdslot of dag.',
    ],
    link: '/taken',
  },

  // ── Communicatie ──
  {
    id: 'email',
    category: 'communicatie',
    icon: Mail,
    iconColor: '#6A5A8A',
    titel: 'Geïntegreerde email',
    subtitel: 'Verstuur en ontvang email vanuit Doen.',
    inhoud: [
      'Koppel je emailadres (Gmail, Outlook, of eigen SMTP) en verstuur offertes, facturen en berichten direct vanuit de app.',
      'Inkomende emails worden gesynchroniseerd en automatisch gekoppeld aan klanten op basis van emailadres.',
      'Email templates voor offertes en facturen worden automatisch gegenereerd met je bedrijfskleuren en logo.',
    ],
    link: '/email',
  },
  {
    id: 'visualizer',
    category: 'communicatie',
    icon: Sparkles,
    iconColor: '#9A5A48',
    titel: 'AI Visualizer',
    subtitel: 'Laat je klant zien hoe het eruit gaat zien',
    inhoud: [
      'Upload een foto van de locatie en laat AI een visualisatie maken van het eindresultaat. Gevelreclame, signing, interieurbelettering — de klant ziet direct wat je bedoelt.',
      'Deel visualisaties via het klantportaal of voeg ze toe aan je offerte. Verhoog je conversie door verwachtingen te managen.',
    ],
    link: '/visualizer',
  },

  // ── Slim werken ──
  {
    id: 'dashboard',
    category: 'slim-werken',
    icon: BarChart3,
    iconColor: '#1A535C',
    titel: 'Het dashboard',
    subtitel: 'Je dag begint hier',
    inhoud: [
      'Het dashboard toont in één oogopslag: omzet, openstaande offertes, planning vandaag, prioritaire taken en recente activiteit.',
      'Widgets zijn verplaatsbaar en resizable. Verberg wat je niet nodig hebt, maak groter wat belangrijk is.',
      'Het weerbericht is geïntegreerd — direct zien of buitenwerk mogelijk is.',
    ],
    link: '/',
  },
  {
    id: 'document-stijl',
    category: 'slim-werken',
    icon: Palette,
    iconColor: '#9A5A48',
    titel: 'Huisstijl & documenten',
    subtitel: 'Professionele uitstraling zonder moeite',
    inhoud: [
      'Upload je logo, stel je bedrijfskleuren in, en alle documenten (offertes, facturen, werkbonnen) worden automatisch in jouw stijl gegenereerd.',
      'Kies je lettertype, pas de kleur van de accent-balk aan, voeg je KvK- en BTW-nummer toe aan de voettekst.',
      'Configureer dit eenmalig in Instellingen > Producten > Document stijl.',
    ],
  },
  {
    id: 'beveiliging',
    category: 'slim-werken',
    icon: Shield,
    iconColor: '#1A535C',
    titel: 'Veiligheid & privacy',
    subtitel: 'Je data is van jou',
    inhoud: [
      'Doen. draait op Supabase met Row Level Security — elke gebruiker ziet alleen data van zijn eigen organisatie.',
      'Wachtwoorden en API-keys worden versleuteld opgeslagen. Email-wachtwoorden worden server-side geëncrypt met AES-256.',
      'Alle communicatie gaat via HTTPS. Geen data wordt gedeeld met derden.',
    ],
  },
]

// ── The DOEN workflow — the visual spectrum ──

const FLOW_STEPS = [
  { icon: Users, label: 'Klant', desc: 'Leg je klant vast', color: '#3A6B8C', category: 'klanten' },
  { icon: FolderKanban, label: 'Project', desc: 'Start het traject', color: '#1A535C', category: 'projecten' },
  { icon: FileText, label: 'Offerte', desc: 'Maak de deal', color: '#F15025', category: 'offertes' },
  { icon: Globe, label: 'Portaal', desc: 'Deel met je klant', color: '#6A5A8A', category: 'klanten' },
  { icon: ClipboardCheck, label: 'Werkbon', desc: 'Geef de opdracht', color: '#9A5A48', category: 'uitvoering' },
  { icon: Calendar, label: 'Planning', desc: 'Plan de montage', color: '#1A535C', category: 'uitvoering' },
  { icon: Receipt, label: 'Factuur', desc: 'Stuur de rekening', color: '#2D6B48', category: 'financieel' },
  { icon: CheckCircle, label: 'Klaar', desc: 'Klant is blij', color: '#3A7D52', category: 'start' },
]

// ── Component ──

export function KennisbankPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<KbArticle | null>(null)

  const filtered = useMemo(() => {
    let list = ARTICLES
    if (activeCategory) list = list.filter(a => a.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.titel.toLowerCase().includes(q) ||
        a.subtitel.toLowerCase().includes(q) ||
        a.inhoud.some(p => p.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeCategory, search])

  // ── Article detail view ──
  if (activeArticle) {
    const cat = CATEGORIES.find(c => c.id === activeArticle.category)
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in-up">
        <button
          onClick={() => setActiveArticle(null)}
          className="flex items-center gap-1.5 text-[13px] font-medium mb-6 transition-colors hover:text-[#1A535C]"
          style={{ color: '#9B9B95' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Terug naar kennisbank
        </button>

        {cat && (
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '15' }}>
              <cat.icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
          </div>
        )}

        <h1 className="font-heading text-[32px] font-bold tracking-tight leading-[1.1] mb-2" style={{ color: '#1A1A1A' }}>
          {activeArticle.titel}
        </h1>
        <p className="text-[16px] mb-10" style={{ color: '#6B6B66' }}>{activeArticle.subtitel}</p>

        <div className="space-y-5">
          {activeArticle.inhoud.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.8] animate-stagger-item" style={{ color: '#3A3A3A', animationDelay: `${i * 60}ms` }}>{p}</p>
          ))}
        </div>

        {activeArticle.tips && activeArticle.tips.length > 0 && (
          <div className="mt-10 rounded-2xl p-6 animate-stagger-item" style={{ backgroundColor: '#1A535C', animationDelay: `${activeArticle.inhoud.length * 60 + 100}ms` }}>
            <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3 text-white/60">Tips</h3>
            <ul className="space-y-2.5">
              {activeArticle.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-white/90">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#F15025]" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeArticle.link && (
          <button
            onClick={() => navigate(activeArticle.link!)}
            className="mt-8 inline-flex items-center gap-2 h-11 px-6 text-[14px] font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#F15025' }}
          >
            Bekijk in de app
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  // ── Main view ──
  return (
    <div className="animate-fade-in-up">
      {/* ── Hero with workflow spectrum ── */}
      <div className="relative overflow-hidden rounded-3xl mx-4 mb-10" style={{ background: 'linear-gradient(135deg, #1A535C 0%, #237580 40%, #1A535C 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-40px] w-[200px] h-[200px] rounded-full opacity-[0.06] bg-white" />
        <div className="absolute bottom-[-30px] left-[10%] w-[120px] h-[120px] rounded-full opacity-[0.04] bg-white" />

        <div className="relative px-8 pt-10 pb-8">
          <div className="max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">Kennisbank</p>
            <h1 className="font-heading text-[36px] font-bold tracking-tight leading-[1.05] text-white mb-3">
              Doen<span style={{ color: '#F15025' }}>.</span> is de kracht<br />achter doeners.
            </h1>
            <p className="text-[15px] text-white/60 max-w-lg leading-relaxed">
              Van eerste klantcontact tot factuur. Alles verbonden, niets overbodig. Klik op een stap om te leren hoe het werkt.
            </p>
          </div>

          {/* ── Flow spectrum ── */}
          <div className="mt-8 grid grid-cols-8 gap-0 overflow-x-auto pb-2">
            {FLOW_STEPS.map((step, idx) => {
              const StepIcon = step.icon
              const isLast = idx === FLOW_STEPS.length - 1
              return (
                <button
                  key={step.label}
                  onClick={() => { setActiveCategory(step.category); setSearch('') }}
                  className="group flex flex-col items-center text-center relative animate-stagger-item"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute top-[18px] left-[calc(50%+18px)] h-[2px] right-[-2px]" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      <div
                        className="h-full rounded-full animate-stagger-item"
                        style={{ backgroundColor: FLOW_STEPS[idx + 1]?.color || '#fff', opacity: 0.4, animationDelay: `${idx * 80 + 200}ms` }}
                      />
                    </div>
                  )}
                  {/* Icon circle */}
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative z-10"
                    style={{ backgroundColor: step.color }}
                  >
                    <StepIcon className="h-4 w-4 text-white" />
                  </div>
                  {/* Label */}
                  <span className="text-[11px] font-bold text-white mt-2 whitespace-nowrap">{step.label}</span>
                  <span className="text-[10px] text-white/40 whitespace-nowrap">{step.desc}</span>
                  {/* Glow on hover */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-9 rounded-xl opacity-0 group-hover:opacity-30 blur-md transition-opacity" style={{ backgroundColor: step.color }} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
            placeholder="Zoek op onderwerp..."
            className="w-full h-11 pl-11 pr-4 text-[14px] rounded-2xl outline-none transition-shadow focus:ring-2 focus:ring-[#1A535C]/20"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB', boxShadow: '0 2px 8px rgba(130,100,60,0.04)' }}
          />
        </div>

        {/* ── Category pills ── */}
        <div className="flex items-center gap-2 flex-wrap justify-center mb-8">
          <button
            onClick={() => { setActiveCategory(null); setSearch('') }}
            className={cn(
              'h-8 px-4 rounded-full text-[12px] font-semibold transition-all duration-200',
              !activeCategory && !search ? 'text-white shadow-sm' : 'hover:bg-[#F4F2EE]'
            )}
            style={!activeCategory && !search ? { backgroundColor: '#1A535C' } : { color: '#6B6B66', border: '1px solid #EBEBEB' }}
          >
            Alles
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(activeCategory === cat.id ? null : cat.id); setSearch('') }}
              className={cn(
                'h-8 px-4 rounded-full text-[12px] font-semibold transition-all duration-200 inline-flex items-center gap-1.5',
                activeCategory === cat.id ? 'text-white shadow-sm' : 'hover:bg-[#F4F2EE]'
              )}
              style={activeCategory === cat.id ? { backgroundColor: cat.color } : { color: '#6B6B66', border: '1px solid #EBEBEB' }}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || activeCategory) && (
          <p className="text-[12px] font-mono mb-4" style={{ color: '#9B9B95' }}>
            {filtered.length} {filtered.length === 1 ? 'artikel' : 'artikelen'}
            {search && <> voor &ldquo;{search}&rdquo;</>}
            {activeCategory && !search && <> in {CATEGORIES.find(c => c.id === activeCategory)?.label}</>}
          </p>
        )}

        {/* ── Articles grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-20" style={{ color: '#9B9B95' }} />
            <p className="text-[14px] font-medium" style={{ color: '#6B6B66' }}>Geen artikelen gevonden</p>
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="text-[13px] font-medium mt-2" style={{ color: '#F15025' }}>
              Toon alles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((article, idx) => {
              const cat = CATEGORIES.find(c => c.id === article.category)
              return (
                <button
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="group text-left bg-white rounded-2xl p-5 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_8px_30px_rgba(130,100,60,0.12)] animate-stagger-item"
                  style={{ border: '1px solid #EBEBEB', animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: (cat?.color || '#1A535C') + '12' }}
                    >
                      <article.icon className="h-4 w-4" style={{ color: cat?.color || '#1A535C' }} />
                    </div>
                    {cat && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[14px] font-bold leading-snug mb-1 group-hover:text-[#1A535C] transition-colors" style={{ color: '#1A1A1A' }}>
                    {article.titel}
                  </h3>
                  <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#9B9B95' }}>
                    {article.subtitel}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#1A535C' }}>
                    Lees meer <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 pb-8">
          <p className="text-[13px] font-medium" style={{ color: '#9B9B95' }}>
            Doen<span style={{ color: '#F15025' }}>.</span> — De onderliggende kracht voor doeners
          </p>
        </div>
      </div>
    </div>
  )
}
