import { useState } from 'react'
import { Zap, ChevronRight, Sparkles, ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_URL } from '@/lib/contact'

// ── Types ──

interface Feature {
  titel: string
  beschrijving: string
}

interface ChangelogEntry {
  versie: string
  datum: string
  label: 'Nieuw' | 'Verbeterd' | 'Fix'
  titel: string
  beschrijving: string
  features: Feature[]
}

const LABEL_STYLE: Record<string, { bg: string; text: string }> = {
  Nieuw: { bg: '#D24620', text: '#FFFFFF' },
  Verbeterd: { bg: '#1A535C', text: '#FFFFFF' },
  Fix: { bg: '#2D6B48', text: '#FFFFFF' },
}

// ── All features currently in the app ──

const APP_FEATURES = [
  { naam: 'Dashboard', desc: 'Omzet, taken, planning en activiteit in één overzicht. Widgets verplaatsen en resizen.', kleur: '#1A535C' },
  { naam: 'Projecten', desc: 'Cockpit per project met briefing, taken, offertes, montage en bestanden.', kleur: '#1A535C' },
  { naam: 'Offertes', desc: 'Professionele offertes met calculatie, PDF, autosave en versioning.', kleur: '#D24620' },
  { naam: 'Facturen', desc: 'Factureren op basis van offertes. Mollie betaallink, automatische herinneringen.', kleur: '#2D6B48' },
  { naam: 'Klantenbeheer', desc: 'Contactpersonen, vestigingen, complete klanthistorie.', kleur: '#3A6B8C' },
  { naam: 'Klantportaal', desc: 'Deel tekeningen, offertes en updates. Klant keurt goed met één klik.', kleur: '#6A5A8A' },
  { naam: 'Werkbonnen', desc: 'Opdracht voor de monteur. Neemt offerte over, foto\'s, klanthandtekening.', kleur: '#D24620' },
  { naam: 'Montageplanning', desc: 'Weekoverzicht met drag-and-drop. Weerbericht, conflict-detectie.', kleur: '#1A535C' },
  { naam: 'Takenbeheer', desc: 'Taken toewijzen met deadlines en prioriteiten. Weekplanning met tijdlijn.', kleur: '#5A5A55' },
  { naam: 'Email', desc: 'Gesprekken, toetsenbord, bedenktijd en snooze. Gekoppeld aan klant, project en offerte.', kleur: '#6A5A8A' },
  { naam: 'AI Visualizer', desc: 'Upload een foto, laat AI het eindresultaat visualiseren voor je klant.', kleur: '#9A5A48' },
  { naam: 'Financieel', desc: 'Omzet, openstaand, cashflow. Grootboek, BTW-codes, exporteer naar CSV.', kleur: '#2D6B48' },
  { naam: 'Kennisbank', desc: 'Handleidingen en procedures. Alles over Doen. op één plek.', kleur: '#1A535C' },
  { naam: 'Calculatie-templates', desc: 'Sla veelgebruikte producten op als template voor snellere offertes.', kleur: '#D24620' },
  { naam: 'Document stijl', desc: 'Logo, kleuren en lettertype. Alle documenten automatisch in jouw huisstijl.', kleur: '#9A5A48' },
  { naam: 'Automatische opvolging', desc: 'Herinneringen voor openstaande offertes. Nooit meer een deal missen.', kleur: '#D24620' },
  { naam: 'Bestelbonnen', desc: 'Materiaal bestellen bij leveranciers, gekoppeld aan projecten.', kleur: '#1A535C' },
  { naam: 'Importeren', desc: 'Klanten, producten en data importeren vanuit CSV.', kleur: '#3A6B8C' },
]

// ── Changelog entries ──

const CHANGELOG: ChangelogEntry[] = [
  {
    versie: '1.6.2',
    datum: '6 september 2026',
    label: 'Nieuw',
    titel: 'Tweede postvak koppelen',
    beschrijving: 'Lees je naast je eigen adres ook studio@ of info@? Die koppel je nu zelf onder Instellingen, E-mail, Verbinding.',
    features: [
      { titel: 'Postvak toevoegen', beschrijving: 'Boven het formulier staat de lijst met je postvakken, met onderaan "Postvak toevoegen". Provider kiezen, adres en app-wachtwoord invullen, testen, opslaan.' },
      { titel: 'Hernoemen en standaard', beschrijving: 'Geef een postvak een naam als Studio, en wijs aan welk postvak standaard is. Een gedeeld postvak van het team staat er met het label gedeeld bij.' },
      { titel: 'Ontkoppelen zonder mail kwijt te raken', beschrijving: 'Ontkoppelen haalt alleen de koppeling en het wachtwoord weg. De mail van dat postvak blijft in doen. staan.' },
      { titel: 'Alles blijft bij het oude met één postvak', beschrijving: 'Heb je één mailbox, dan verandert er niets: geen lijst, geen kiezer, geen Van-regel.' },
    ],
  },
  {
    versie: '1.6.1',
    datum: '6 september 2026',
    label: 'Nieuw',
    titel: 'Meerdere postvakken, een gedeeld postvak en regels',
    beschrijving: 'Meer dan één mailbox in doen., een postvak dat van het team is, en regels die je inbox opruimen terwijl je iets anders doet.',
    features: [
      { titel: 'Meerdere postvakken', beschrijving: 'Een kiezer boven de mappen met een bolletje per postvak. Alles door elkaar, of één postvak tegelijk. In de composer kies je op de regel Van waar het bericht vandaan komt.' },
      { titel: 'Gedeeld postvak', beschrijving: 'Info@ of verkoop@ als teampostvak. Wijs een gesprek toe aan een collega; zijn initialen staan in de lijst, zodat niemand twee keer antwoordt. Filters Van mij en Niet toegewezen erbij.' },
      { titel: 'Interne notities', beschrijving: 'Een aantekening onder het gesprek die nooit naar de klant gaat. Noem een collega met @ en hij krijgt een melding.' },
      { titel: 'Regels', beschrijving: 'Als de afzender, het onderwerp, het domein of het aan-adres iets bevat: archiveren, labelen, als gelezen markeren, aan een project koppelen of aan een collega geven. Sleep ze in volgorde; de bovenste die past, wint.' },
      { titel: 'Eigen labels', beschrijving: 'Labels met een eigen naam en kleur, in het labelmenu en als filter onder de mappen. De vaste vier blijven bestaan.' },
    ],
  },
  {
    versie: '1.6.0',
    datum: '6 september 2026',
    label: 'Nieuw',
    titel: 'Mail op Outlook-niveau',
    beschrijving: 'Je mailbox in doen. is nu een volwaardig mailprogramma. Lezen, antwoorden en koppelen zonder te wisselen. Vier schakelaars onder Instellingen > doen. > Functies, groep Mail.',
    features: [
      { titel: 'Gesprekken in plaats van losse mails', beschrijving: 'Lijst links, het hele gesprek rechts. Geciteerde tekst ingeklapt, alleen het nieuwe leest mee.' },
      { titel: 'Toetsenbord', beschrijving: 'j en k door de lijst, e archiveert, r antwoordt, c schrijft. Druk op ? voor de kaart.' },
      { titel: 'Bedenktijd na verzenden', beschrijving: 'Een paar seconden "Ongedaan maken" na Verzenden. Verkeerde prijs of vergeten tekening: terughalen.' },
      { titel: 'Later verzenden', beschrijving: 'Vanavond 18:00, morgen 09:00 of een eigen moment. Bewerken kan tot hij de deur uit gaat.' },
      { titel: 'Concepten op elk apparaat', beschrijving: 'Begin op de zaak, maak af op je telefoon. Elke twee seconden bewaard, nooit een vraag bij sluiten.' },
      { titel: 'Snooze en opvolgen', beschrijving: 'Zet een mail weg tot donderdag; hij komt ongelezen terug. Opvolgen verdwijnt vanzelf als de klant antwoordt.' },
      { titel: 'Klantkaart en slepen naar project', beschrijving: 'Rechts zie je open offertes en projecten van de afzender. Sleep de mail naar een project en het team ziet hem daar.' },
      { titel: 'Zoeken met chips', beschrijving: 'Van, aan, met bijlage, periode, klant. Combineren mag.' },
      { titel: 'Externe afbeeldingen pas na klik', beschrijving: 'Nieuwsbrieven laden hun plaatjes pas als jij het wilt. Afzenders zien niet wanneer je leest.' },
      { titel: 'Je mailbox loopt mee', beschrijving: 'Verzonden mail komt ook in je eigen Verzonden-map, gelezen en gearchiveerd gaat twee kanten op. Een gezondheidskaart onder Instellingen > E-mail zegt of alles loopt.' },
    ],
  },
  {
    versie: '1.5.2',
    datum: '6 september 2026',
    label: 'Verbeterd',
    titel: 'Sneller, zuiniger en steviger voor grotere teams',
    beschrijving: 'Doorlichting voor 50 organisaties. Niets nieuws om aan te zetten; je merkt het aan een rustiger dashboard en snellere schermen.',
    features: [
      { titel: 'Rustiger dashboard', beschrijving: 'Ververst elke vijf minuten in plaats van elke minuut, en direct na een wijziging. Scheelt tot 80 procent dataverkeer.' },
      { titel: 'Gericht laden', beschrijving: 'Projectkaart, klantkaart, werkbon op de telefoon, zoeken en de factuureditor halen alleen op wat ze tonen.' },
      { titel: 'Uren factureren in één keer', beschrijving: 'Alle regels en registraties in één stap, dus geen halve factuur meer als de verbinding wegvalt.' },
      { titel: 'Achtergrondwerk per organisatie', beschrijving: 'Herinneringen en opvolging gaan door als het bij één organisatie misgaat. Alle crons melden fouten.' },
      { titel: 'Abonnement en koppelingen voor admins', beschrijving: 'Abonnementsgegevens, boekhoudkoppelingen en de inkoop-mailbox zijn alleen door een admin in te zien en te wijzigen.' },
    ],
  },
  {
    versie: '1.5.1',
    datum: '6 september 2026',
    label: 'Nieuw',
    titel: 'Weekstaat, uren goedkeuren en bezetting',
    beschrijving: 'Voor wie op uren stuurt. Allebei achter een schakelaar; goedkeuren staat standaard uit.',
    features: [
      { titel: 'Weekstaat', beschrijving: 'Uren per dag in een weekraster bovenaan Tijdregistratie, met de dagnorm uit je werktijden ernaast. Naast het inklokken.' },
      { titel: 'Uren goedkeuren', beschrijving: 'Week indienen, beheerder keurt goed, alleen goedgekeurde uren naar de factuur. Optioneel.' },
      { titel: 'Werktijden en bezetting', beschrijving: 'Uren per weekdag per medewerker, en per week gepland tegenover beschikbaar, vier weken vooruit.' },
    ],
  },
  {
    versie: '1.5.0',
    datum: '5 september 2026',
    label: 'Nieuw',
    titel: 'Handigheden voor wie van Gripp of James Pro komt',
    beschrijving: 'Achter schakelaars per organisatie (Instellingen > doen. > Functies), zodat de app rustig blijft voor wie ze niet gebruikt.',
    features: [
      { titel: 'Vervolg na de offerte', beschrijving: 'Naar project, direct factureren of afgewezen met reden in één scherm. Plus markeren als verzonden en een handtekening bij online akkoord.' },
      { titel: 'Condities en staffels', beschrijving: 'Standaard of Spoed als set voor geldigheid, betaaltermijn en voorwaarden. Staffelprijzen per product, automatisch overgenomen.' },
      { titel: 'Vaste klantnotitie als waarschuwing', beschrijving: 'Eén zin op de klant die opduikt op offerte, project, werkbon, bestelbon en inkoopfactuur. Met tags en standaardwaarden per klant.' },
      { titel: 'Wat wil je factureren?', beschrijving: 'Deelfactuur per regel met de aanbetaling automatisch verrekend.' },
      { titel: 'Opvolgstappen op de factuur', beschrijving: 'Stepper bovenin, tabblad Vanavond de deur uit, vergrendeld na Exact, conceptfacturen samenvoegen, ouderdom per klant.' },
      { titel: 'Kolommen per fase en projectsjablonen', beschrijving: 'Kanban met bedrag per fase; een project opslaan als sjabloon.' },
      { titel: 'Planning: weergaven en herhalen', beschrijving: 'Bewaar een filterstand als weergave; plan een montage wekelijks of maandelijks in.' },
      { titel: 'Meldingen en @-noemen', beschrijving: 'Meldingsvoorkeuren per persoon, collega noemen in notities, herinnering als er nog geen uren staan.' },
    ],
  },
  {
    versie: '1.4.0',
    datum: '26 maart 2025',
    label: 'Nieuw',
    titel: 'Kennisbank & drag-and-drop planning',
    beschrijving: 'Grote update met kennisbank, verbeterde montageplanning en compactere formulieren.',
    features: [
      { titel: 'Kennisbank', beschrijving: 'Nieuwe pagina met alle handleidingen over Doen. Visueel workflow spectrum, zoekfunctie en categorie filters.' },
      { titel: 'Drag-and-drop planning', beschrijving: 'Sleep "te plannen" projecten direct naar een dag in de montageplanning. Smooth drag met custom ghost images.' },
      { titel: 'Compactere formulieren', beschrijving: 'Project aanmaken en offerte wizard in minder stappen. Alles past op één scherm.' },
      { titel: 'PDF bij factuur email', beschrijving: 'Factuur PDF wordt nu automatisch als bijlage meegestuurd bij het versturen per email.' },
      { titel: 'Dashboard redesign', beschrijving: 'Nieuwe statistieken kaarten met kleur-iconen, hit rate ring chart en hover effecten.' },
    ],
  },
  {
    versie: '1.3.0',
    datum: '18 maart 2025',
    label: 'Nieuw',
    titel: 'Klantportaal & automatische opvolging',
    beschrijving: 'Deel offertes en tekeningen met je klant via een uniek portaal. Plus automatische offerte opvolging.',
    features: [
      { titel: 'Klantportaal', beschrijving: 'Activeer een portaal per project. Klant kan offertes goedkeuren, berichten sturen en bestanden uploaden.' },
      { titel: 'Offerte opvolging', beschrijving: 'Stel automatische herinneringen in voor verstuurde offertes. Configureerbaar per aantal dagen.' },
      { titel: 'AI Visualizer', beschrijving: 'Upload een situatiefoto en laat AI visualiseren hoe het eindresultaat eruitziet.' },
    ],
  },
  {
    versie: '1.2.0',
    datum: '4 maart 2025',
    label: 'Verbeterd',
    titel: 'Werkbonnen & montageplanning',
    beschrijving: 'Werkbonnen genereren vanuit offertes en montages plannen met weerbericht integratie.',
    features: [
      { titel: 'Werkbonnen', beschrijving: 'Maak werkbonnen aan gekoppeld aan project en offerte. Alle regels worden overgenomen.' },
      { titel: 'Montageplanning', beschrijving: 'Weekoverzicht per monteur met weerbericht, conflict-detectie en status management.' },
      { titel: 'Monteur feedback', beschrijving: 'Uren registreren, opmerkingen, foto\'s uploaden en klanthandtekening op de werkbon.' },
    ],
  },
  {
    versie: '1.1.0',
    datum: '17 februari 2025',
    label: 'Nieuw',
    titel: 'Facturatie & Mollie betalingen',
    beschrijving: 'Professionele facturen met online betaallink en automatische herinneringen.',
    features: [
      { titel: 'Facturatie', beschrijving: 'Facturen aanmaken op basis van goedgekeurde offertes. PDF generatie en email verzending.' },
      { titel: 'Mollie integratie', beschrijving: 'Online betaallink op je factuur. Klant betaalt met iDEAL, creditcard of bankoverschrijving.' },
      { titel: 'Automatische herinneringen', beschrijving: 'Bij vervallen facturen: herinnering na 7, 14 en 21 dagen, aanmaning na 30 dagen.' },
    ],
  },
  {
    versie: '1.0.0',
    datum: '1 februari 2025',
    label: 'Nieuw',
    titel: 'Doen. is live',
    beschrijving: 'De eerste versie van Doen. Projecten, offertes, klanten en het dashboard.',
    features: [
      { titel: 'Projecten', beschrijving: 'Project cockpit met briefing, taken, bestanden en activiteit feed.' },
      { titel: 'Offertes', beschrijving: 'Professionele offertes met calculatie, PDF download en email verzending.' },
      { titel: 'Klantenbeheer', beschrijving: 'Klantprofielen met contactpersonen, vestigingen en volledige historie.' },
      { titel: 'Dashboard', beschrijving: 'Omzet, openstaande offertes, planning en taken in één overzicht.' },
    ],
  },
]

// ── Component ──

export function ChangelogPage() {
  const [tab, setTab] = useState<'changelog' | 'features'>('changelog')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1A535C' }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-[28px] font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              What's new<span style={{ color: '#D24620' }}>.</span>
            </h1>
            <p className="text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Alles wat we bouwen, in één overzicht</p>
          </div>
        </div>

        {/* Tab switch + feedback */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F4F2EE' }}>
            <button
              onClick={() => setTab('changelog')}
              className={cn('h-9 px-5 rounded-lg text-[13px] font-semibold transition-all', tab === 'changelog' ? 'bg-white text-foreground shadow-sm' : 'text-foreground/70')}
            >
              Changelog
            </button>
            <button
              onClick={() => setTab('features')}
              className={cn('h-9 px-5 rounded-lg text-[13px] font-semibold transition-all', tab === 'features' ? 'bg-white text-foreground shadow-sm' : 'text-foreground/70')}
            >
              Alle features
            </button>
          </div>

          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Suggestie? Laat het weten
          </a>
        </div>
      </div>

      {/* ── Features tab ── */}
      {tab === 'features' && (
        <div>
          <p className="text-[14px] mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Alles wat er nu in Doen. zit. <strong className="text-foreground">{APP_FEATURES.length} features</strong>, gebouwd voor creatieve maakbedrijven.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {APP_FEATURES.map((f, idx) => (
              <div
                key={f.naam}
                className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm animate-stagger-item"
                style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.kleur }} />
                  <span className="text-[14px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{f.naam}</span>
                </div>
                <p className="text-[12px] leading-relaxed pl-[18px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Changelog tab ── */}
      {tab === 'changelog' && (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ backgroundColor: '#E6E4E0' }} />

          <div className="space-y-10">
            {CHANGELOG.map((entry, idx) => {
              const ls = LABEL_STYLE[entry.label]
              return (
                <div key={entry.versie} className="relative pl-12 animate-stagger-item" style={{ animationDelay: `${idx * 60}ms` }}>
                  {/* Timeline dot */}
                  <div className="absolute left-[14px] top-1 w-[12px] h-[12px] rounded-full border-2 border-white z-10" style={{ backgroundColor: ls.bg }} />

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: ls.bg, color: ls.text }}
                    >
                      {entry.label}
                    </span>
                    <span className="text-[14px] font-bold font-mono" style={{ color: 'hsl(var(--foreground))' }}>{entry.versie}</span>
                    <span className="text-[12px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{entry.datum}</span>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: 'hsl(var(--foreground))' }}>{entry.titel}</h3>
                  <p className="text-[13px] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{entry.beschrijving}</p>

                  {/* Features */}
                  <div className="space-y-2">
                    {entry.features.map(f => (
                      <div key={f.titel} className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--background))' }}>
                        <span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{f.titel}</span>
                        <span className="text-[12px] ml-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.beschrijving}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-16 text-center rounded-2xl p-8" style={{ backgroundColor: '#1A535C' }}>
        <h3 className="text-[20px] font-bold text-white mb-2">Iets missen? Laat het weten.</h3>
        <p className="text-[14px] text-white/50 mb-5">We bouwen Doen. samen met onze gebruikers.</p>
        <a
          href={CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-11 px-6 text-[14px] font-bold text-petrol bg-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Neem contact op
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      {/* Footer */}
      <div className="text-center mt-10 pb-8">
        <p className="text-[14px] font-heading font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
          Doen<span style={{ color: '#D24620' }}>.</span>
        </p>
        <p className="text-[12px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Gebouwd voor creatieve maakbedrijven
        </p>
      </div>
    </div>
  )
}
