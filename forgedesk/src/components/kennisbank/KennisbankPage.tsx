import { useState, useMemo, type ReactNode } from 'react'
import {
  Search, BookOpen, FolderKanban, FileText, Receipt, Users, ClipboardCheck,
  Calendar, CheckCircle, Mail, Globe, PiggyBank, Sparkles, ChevronRight,
  Wrench, ArrowLeft, Zap, Shield, BarChart3, Palette, Bell, Heart, SmilePlus,
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
  {
    id: 'welkom',
    category: 'start',
    icon: Zap,
    iconColor: '#F15025',
    titel: 'Welkom bij Doen.',
    subtitel: 'Alles wat je nodig hebt, op één plek',
    inhoud: [
      'Doen. is gebouwd voor **creatieve maakbedrijven**. Signing, reclame, interieurbouw. Bedrijven die ideeën omzetten in fysieke producten.',
      'Van het eerste klantcontact tot de laatste factuur. **Projecten, offertes, werkbonnen, planning, email** en een klantportaal. Allemaal verbonden, allemaal snel.',
    ],
    tips: [
      'Begin met een klant aanmaken en je eerste project starten',
      'Stel je bedrijfsprofiel in via Instellingen > Profiel',
      'Verbind je email via Instellingen > E-mail',
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
      '1. **Klant aanmaken.** Bedrijfsnaam, contactpersoon, adres. Dat is alles.',
      '2. **Offerte maken.** Selecteer de klant, voeg items toe met je prijscalculatie, verstuur direct per email met PDF.',
      '3. **Project starten.** Zodra de offerte goedgekeurd is maak je een project aan. Taken toewijzen, montage plannen.',
      '4. **Uitvoeren.** Werkbon genereren voor de monteurs, planning bijhouden, foto\'s uploaden vanuit het veld.',
      '5. **Factureren.** Met één klik een factuur op basis van de offerte. Betaallink via Mollie, automatische herinneringen.',
    ],
  },
  {
    id: 'projecten-cockpit',
    category: 'projecten',
    icon: FolderKanban,
    iconColor: '#1A535C',
    titel: 'De project cockpit',
    subtitel: 'Alles over je project in één scherm',
    inhoud: [
      'Elk project heeft een cockpit. Je **commandocentrum**. Briefing, taken, offertes, montage-afspraken, bestanden en activiteit in één overzicht.',
      'Bovenaan staan **quick actions**: Taak, Offerte, Werkbon, Montage, Factuur. Eén klik en je bent bezig.',
      'De briefing is je projectomschrijving. Klik om te typen. Geen gedoe met formulieren, gewoon schrijven wat er moet gebeuren.',
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
      'Elk project doorloopt een traject: **Gepland → Actief → Te plannen → Te factureren → Gefactureerd → Afgerond.**',
      'Doen. suggereert automatisch de volgende stap. Alle taken afgerond? "Klaar voor montage?" verschijnt. Montage klaar? "Klaar om te factureren."',
      'Statussen kun je ook handmatig wijzigen via de header van het project.',
    ],
  },
  {
    id: 'offertes-maken',
    category: 'offertes',
    icon: FileText,
    iconColor: '#F15025',
    titel: 'Offertes maken',
    subtitel: 'Professionele offerte in minuten',
    inhoud: [
      'Selecteer een klant, kies een contactpersoon, geef je offerte een titel en je bent bezig. Items toevoegen met beschrijving, aantal, prijs, **BTW en korting**.',
      'De offerte wordt **automatisch opgeslagen** terwijl je werkt. Download als PDF, verstuur per email, of deel via het klantportaal.',
      'Offertes hebben **versioning**. Maak een nieuwe versie aan als de klant wijzigingen wil. De historie blijft bewaard.',
    ],
    tips: [
      'Gebruik calculatie-templates voor terugkerende producten',
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
      'Stel **automatische opvolging** in voor verstuurde offertes. Na X dagen krijgt de klant automatisch een herinnering, of je krijgt een notificatie om zelf na te bellen.',
      'Configureer je opvolg-strategie in Instellingen > Offertes > Opvolging. Kies het aantal dagen, de emailtekst en of het automatisch of handmatig gaat.',
    ],
  },
  {
    id: 'klanten-beheer',
    category: 'klanten',
    icon: Users,
    iconColor: '#3A6B8C',
    titel: 'Klantenbeheer',
    subtitel: 'Alle klantinformatie op één plek',
    inhoud: [
      'Elke klant heeft een profiel met bedrijfsgegevens, **contactpersonen**, **vestigingen** en een complete historie van projecten, offertes en facturen.',
      'Meerdere contactpersonen per bedrijf. Markeer wie de primaire is. Vestigingen voor bedrijven met meerdere locaties.',
      'De klantkaart toont alles: openstaande offertes, lopende projecten, factuurhistorie. Je weet altijd waar je staat.',
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
      'Activeer het portaal voor een project en je klant krijgt een **unieke link**. Daar kan de klant offertes bekijken en goedkeuren, tekeningen inzien, berichten sturen en bestanden uploaden.',
      'Geen inloggen nodig. De link is het toegangsbewijs. Veilig en simpel.',
      'Je krijgt een **notificatie** als de klant reageert of een offerte goedkeurt.',
    ],
    link: '/portalen',
  },
  {
    id: 'facturen',
    category: 'financieel',
    icon: Receipt,
    iconColor: '#2D6B48',
    titel: 'Factureren',
    subtitel: 'Professionele facturen met betaallink',
    inhoud: [
      'Maak facturen aan op basis van goedgekeurde offertes. **Alle regels worden automatisch overgenomen.** Of maak een losse factuur.',
      'Facturen worden verstuurd per email met **PDF bijlage**. Optioneel met Mollie betaallink zodat klanten direct online kunnen betalen.',
      'Automatische herinneringen bij vervallen facturen: **1e na 7 dagen, 2e na 14, 3e na 21, aanmaning na 30 dagen.**',
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
      'Het financieel dashboard toont je **omzet deze maand**, openstaande facturen, te factureren bedragen en je hit rate op offertes.',
      'Filter op periode, klant of project. Exporteer naar **CSV** voor je boekhouder.',
      'Grootboekrekeningen en BTW-codes configureer je in Instellingen > Financieel.',
    ],
    link: '/financieel',
  },
  {
    id: 'werkbonnen',
    category: 'uitvoering',
    icon: ClipboardCheck,
    iconColor: '#F15025',
    titel: 'Werkbonnen',
    subtitel: 'Instructies voor je monteurs',
    inhoud: [
      'Een werkbon is de opdracht voor je monteur: wat moet er gedaan worden, waar, en met welke materialen. **Koppel aan een project en offerte**, alles wordt overgenomen.',
      'Voeg items toe met beschrijving en afbeeldingen. De monteur ziet dit op zijn telefoon of tablet.',
      'Na afloop kan de monteur **uren registreren**, opmerkingen toevoegen, foto\'s uploaden en een klanthandtekening laten zetten.',
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
      'De montageplanning toont een **weekoverzicht** met alle montage-afspraken per dag. Sleep "te plannen" projecten direct naar een dag om in te plannen.',
      'Filter op monteur om per persoon te zien wat er gepland staat. Het **weerbericht** is geïntegreerd, handig voor buitenwerk.',
      'Statusbeheer: **Gepland → Onderweg → Bezig → Afgerond.** Met conflict-detectie als monteurs dubbel gepland staan.',
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
      'Taken zijn je to-do lijst, gekoppeld aan projecten of los. Wijs taken toe aan teamleden, stel **deadlines** in en volg de voortgang.',
      'Prioriteiten: **Kritiek, Hoog, Medium, Laag.** Het dashboard toont altijd je top 5 taken op prioriteit.',
      'In de weekplanning zie je taken op een tijdlijn. Sleep ze naar een ander tijdslot of dag.',
    ],
    link: '/taken',
  },
  {
    id: 'email',
    category: 'communicatie',
    icon: Mail,
    iconColor: '#6A5A8A',
    titel: 'Geïntegreerde email',
    subtitel: 'Verstuur en ontvang email vanuit Doen.',
    inhoud: [
      'Koppel je emailadres (Gmail, Outlook, of eigen SMTP) en verstuur offertes, facturen en berichten **direct vanuit de app**.',
      'Inkomende emails worden gesynchroniseerd en **automatisch gekoppeld aan klanten** op basis van emailadres.',
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
      'Upload een foto van de locatie en laat AI een **visualisatie** maken van het eindresultaat. Gevelreclame, signing, interieurbelettering. De klant ziet direct wat je bedoelt.',
      'Deel visualisaties via het klantportaal of voeg ze toe aan je offerte. Verhoog je **conversie** door verwachtingen te managen.',
    ],
    link: '/visualizer',
  },
  {
    id: 'dashboard',
    category: 'slim-werken',
    icon: BarChart3,
    iconColor: '#1A535C',
    titel: 'Het dashboard',
    subtitel: 'Je dag begint hier',
    inhoud: [
      'Het dashboard toont in één oogopslag: **omzet, openstaande offertes, planning vandaag**, prioritaire taken en recente activiteit.',
      'Widgets zijn verplaatsbaar en resizable. Verberg wat je niet nodig hebt, maak groter wat belangrijk is.',
      'Het **weerbericht** is geïntegreerd. Direct zien of buitenwerk mogelijk is.',
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
      'Upload je logo, stel je bedrijfskleuren in, en alle documenten (offertes, facturen, werkbonnen) worden automatisch **in jouw stijl** gegenereerd.',
      'Kies je lettertype, pas de kleur van de accent-balk aan, voeg je KvK- en BTW-nummer toe aan de voettekst.',
      'Configureer dit **eenmalig** in Instellingen > Producten > Document stijl.',
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
      'Doen. draait op Supabase met **Row Level Security**. Elke gebruiker ziet alleen data van zijn eigen organisatie.',
      'Wachtwoorden en API-keys worden **versleuteld** opgeslagen. Email-wachtwoorden worden server-side geëncrypt met AES-256.',
      'Alle communicatie gaat via HTTPS. Geen data wordt gedeeld met derden.',
    ],
  },
]

// Render **bold** markdown as <strong>
function renderBold(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-[#1A1A1A]">{part}</strong> : part
  )
}

// ── The DOEN workflow — the visual spectrum ──

const FLOW_STEPS = [
  { icon: Users, label: 'Klant', desc: 'Leg je klant vast', color: '#3A6B8C', category: 'klanten', voordelen: ['Contactpersonen', 'Vestigingen', 'Volledige historie'] },
  { icon: FolderKanban, label: 'Project', desc: 'Start het traject', color: '#1A535C', category: 'projecten', voordelen: ['Taken toewijzen', 'Bestanden delen', 'Voortgang bijhouden'] },
  { icon: FileText, label: 'Offerte', desc: 'Maak de deal', color: '#F15025', category: 'offertes', voordelen: ['PDF genereren', 'Direct versturen', 'Calculatie-templates'] },
  { icon: Globe, label: 'Portaal', desc: 'Deel met je klant', color: '#6A5A8A', category: 'klanten', voordelen: ['Tekeningen delen', 'Offertes goedkeuren', 'Berichten sturen'] },
  { icon: ClipboardCheck, label: 'Werkbon', desc: 'Geef de opdracht', color: '#9A5A48', category: 'uitvoering', voordelen: ['Neemt offerte over', 'Foto\'s uploaden', 'Klant handtekening'] },
  { icon: Calendar, label: 'Planning', desc: 'Plan de montage', color: '#1A535C', category: 'uitvoering', voordelen: ['Drag & drop', 'Weer integratie', 'Per monteur filteren'] },
  { icon: Receipt, label: 'Factuur', desc: 'Stuur de rekening', color: '#2D6B48', category: 'financieel', voordelen: ['Mollie betaallink', 'Auto herinneringen', 'PDF bijlage'] },
  { icon: Heart, label: 'Blije klant', desc: 'Dat is het doel', color: '#F15025', category: 'start', voordelen: ['Transparant proces', 'Snelle oplevering', 'Professionele uitstraling'] },
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
            <p key={i} className="text-[15px] leading-[1.8] animate-stagger-item" style={{ color: '#3A3A3A', animationDelay: `${i * 60}ms` }}>{renderBold(p)}</p>
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
      <div className="relative rounded-3xl mx-4 mb-10" style={{ background: 'linear-gradient(160deg, #0F3A42 0%, #1A535C 30%, #237580 60%, #1A535C 100%)' }}>
        {/* Decorative bg elements — clipped to banner shape */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-[-80px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-[0.05] bg-white" />
          <div className="absolute bottom-[-50px] left-[5%] w-[180px] h-[180px] rounded-full opacity-[0.03] bg-white" />
        </div>
        {/* Pulsing heart glow — clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-[15%] right-[8%] w-[100px] h-[100px] rounded-full animate-pulse" style={{ backgroundColor: '#F15025', opacity: 0.06 }} />
          <div className="absolute top-[18%] right-[9.5%] w-[60px] h-[60px] rounded-full animate-pulse" style={{ backgroundColor: '#F15025', opacity: 0.08, animationDelay: '0.5s' }} />
        </div>

        <div className="relative px-8 md:px-12 pt-12 pb-10">
          {/* Title + mission */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <h1 className="font-heading text-[44px] md:text-[56px] font-bold tracking-[-2.5px] leading-[0.95] text-white mb-4">
                Doen<span style={{ color: '#F15025' }}>.</span><br />
                <span className="text-white/40">de kracht achter</span><br />
                doeners.
              </h1>
              <p className="text-[16px] text-white/45 max-w-md leading-relaxed">
                Eén doel: je klant tevreden houden. Van eerste contact tot oplevering — alles in Doen. is gebouwd rond die missie.
              </p>
            </div>
            {/* The goal — visual anchor */}
            <div className="hidden md:flex flex-col items-center animate-stagger-item" style={{ animationDelay: '600ms' }}>
              <div className="h-20 w-20 rounded-3xl flex items-center justify-center relative" style={{ backgroundColor: '#F15025', boxShadow: '0 8px 30px rgba(241,80,37,0.4)' }}>
                <Heart className="h-9 w-9 text-white" fill="white" />
              </div>
              <span className="text-[13px] font-bold text-white mt-3">Blije klant</span>
              <span className="text-[11px] text-white/35">Dat is het doel</span>
            </div>
          </div>

          {/* ── Flow spectrum ── */}
          <div>
            {/* The journey — visual flow */}
            <div className="flex items-center gap-0 mb-2 overflow-x-auto">
              {FLOW_STEPS.map((step, idx) => {
                const StepIcon = step.icon
                const isLast = idx === FLOW_STEPS.length - 1
                return (
                  <div key={step.label} className="flex items-center animate-stagger-item" style={{ animationDelay: `${idx * 80}ms` }}>
                    <button
                      onClick={() => { setActiveCategory(step.category); setSearch('') }}
                      className="group/step flex flex-col items-center text-center flex-shrink-0 relative"
                      style={{ minWidth: isLast ? 80 : 0 }}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center transition-all duration-300 group-hover/step:scale-110 relative z-10",
                          isLast ? "h-14 w-14 rounded-2xl" : "h-11 w-11 rounded-xl"
                        )}
                        style={{ backgroundColor: step.color, boxShadow: `0 4px 16px ${step.color}40` }}
                      >
                        <StepIcon className={cn("text-white", isLast ? "h-6 w-6" : "h-4.5 w-4.5")} fill={isLast ? 'white' : 'none'} />
                      </div>
                      {/* Label */}
                      <span className={cn("font-bold text-white mt-2 whitespace-nowrap", isLast ? "text-[13px]" : "text-[11px]")}>{step.label}</span>
                      <span className="text-[10px] text-white/30 whitespace-nowrap leading-tight">{step.desc}</span>
                      {/* Hover tooltip with voordelen — above */}
                      <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 opacity-0 scale-95 group-hover/step:opacity-100 group-hover/step:scale-100 transition-all duration-200 pointer-events-none z-30">
                        <div className="relative rounded-xl px-4 py-3 shadow-xl min-w-[160px]" style={{ backgroundColor: step.color }}>
                          {/* Arrow pointing down */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{ backgroundColor: step.color }} />
                          <ul className="space-y-1.5 relative">
                            {step.voordelen.map(v => (
                              <li key={v} className="flex items-center gap-2 text-[11px] text-white/90 whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-white/50 flex-shrink-0" />
                                {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </button>

                    {/* Connector arrow */}
                    {!isLast && (
                      <div className="flex items-center px-1 md:px-2 flex-shrink-0 -mt-5">
                        <div className="h-[2px] w-4 md:w-8 rounded-full animate-stagger-item" style={{
                          background: `linear-gradient(90deg, ${step.color}, ${FLOW_STEPS[idx + 1].color})`,
                          opacity: 0.5,
                          animationDelay: `${idx * 80 + 150}ms`,
                        }} />
                        <ChevronRight className="h-3 w-3 -ml-1 animate-stagger-item" style={{ color: FLOW_STEPS[idx + 1].color, opacity: 0.4, animationDelay: `${idx * 80 + 200}ms` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Spectrum bar */}
            <div className="h-1 rounded-full mt-4 mx-2" style={{ background: `linear-gradient(90deg, #3A6B8C, #1A535C, #F15025, #6A5A8A, #9A5A48, #1A535C, #2D6B48, #F15025)` }} />
          </div>
        </div>
      </div>

      {/* ── Search + filters + articles ── */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Search — pulled up into hero overlap */}
        <div className="relative max-w-2xl mx-auto -mt-6 mb-8 z-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#9B9B95]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
            placeholder="Zoek op onderwerp, module of functie..."
            className="w-full h-13 pl-12 pr-5 text-[15px] rounded-2xl outline-none transition-all focus:ring-2 focus:ring-[#1A535C]/20 focus:shadow-[0_4px_20px_rgba(26,83,92,0.1)]"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E4E0', boxShadow: '0 4px 16px rgba(130,100,60,0.08)' }}
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap justify-center mb-10">
          <button
            onClick={() => { setActiveCategory(null); setSearch('') }}
            className={cn(
              'h-9 px-5 rounded-full text-[12px] font-bold transition-all duration-200',
              !activeCategory && !search ? 'text-white shadow-md' : 'hover:bg-[#F4F2EE]'
            )}
            style={!activeCategory && !search ? { backgroundColor: '#1A535C' } : { color: '#6B6B66', border: '1px solid #E6E4E0' }}
          >
            Alles
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(activeCategory === cat.id ? null : cat.id); setSearch('') }}
              className={cn(
                'h-9 px-5 rounded-full text-[12px] font-bold transition-all duration-200 inline-flex items-center gap-1.5',
                activeCategory === cat.id ? 'text-white shadow-md' : 'hover:bg-[#F4F2EE]'
              )}
              style={activeCategory === cat.id ? { backgroundColor: cat.color } : { color: '#6B6B66', border: '1px solid #E6E4E0' }}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || activeCategory) && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-[13px] font-medium" style={{ color: '#6B6B66' }}>
              {filtered.length} {filtered.length === 1 ? 'artikel' : 'artikelen'}
              {search && <> voor &ldquo;{search}&rdquo;</>}
              {activeCategory && !search && <> in <strong>{CATEGORIES.find(c => c.id === activeCategory)?.label}</strong></>}
            </p>
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="text-[12px] font-semibold" style={{ color: '#F15025' }}>
              Wis filter
            </button>
          </div>
        )}

        {/* ── Articles grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-10 w-10 mx-auto mb-4 opacity-15" style={{ color: '#9B9B95' }} />
            <p className="text-[15px] font-semibold" style={{ color: '#1A1A1A' }}>Geen artikelen gevonden</p>
            <p className="text-[13px] mt-1" style={{ color: '#9B9B95' }}>Probeer een ander zoekwoord</p>
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="text-[13px] font-bold mt-3 inline-flex items-center gap-1" style={{ color: '#F15025' }}>
              Toon alles <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((article, idx) => {
              const cat = CATEGORIES.find(c => c.id === article.category)
              const catColor = cat?.color || '#1A535C'
              return (
                <button
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="group text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(130,100,60,0.12)] animate-stagger-item"
                  style={{ border: '1px solid #E6E4E0', animationDelay: `${idx * 40}ms` }}
                >
                  {/* Color top bar */}
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}60)` }} />
                  <div className="bg-white p-5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-sm"
                        style={{ backgroundColor: catColor + '10' }}
                      >
                        <article.icon className="h-4 w-4" style={{ color: catColor }} />
                      </div>
                      {cat && (
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catColor }}>
                          {cat.label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-bold leading-snug mb-1.5 group-hover:text-[#1A535C] transition-colors" style={{ color: '#1A1A1A' }}>
                      {article.titel}
                    </h3>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#9B9B95' }}>
                      {article.subtitel}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-200" style={{ color: catColor }}>
                      Lees meer <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-20 pb-10">
          <div className="h-px w-16 mx-auto mb-6" style={{ backgroundColor: '#E6E4E0' }} />
          <p className="text-[14px] font-heading font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
            Doen<span style={{ color: '#F15025' }}>.</span>
          </p>
          <p className="text-[12px] mt-1" style={{ color: '#9B9B95' }}>
            Gebouwd voor creatieve maakbedrijven
          </p>
        </div>
      </div>
    </div>
  )
}
