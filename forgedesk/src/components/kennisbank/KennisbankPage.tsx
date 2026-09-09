import { useState, useMemo, useEffect, type ReactNode } from 'react'
import {
  Search, BookOpen, FolderKanban, FileText, Receipt, Users, ClipboardCheck,
  Calendar, CheckCircle, Mail, Globe, PiggyBank, Sparkles, ChevronRight,
  Wrench, ArrowLeft, Zap, Shield, BarChart3, Palette, Bell,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { moduleUitgezet } from '@/lib/featureFlags'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'

// ── Article data ──

interface KbArticle {
  id: string
  category: string
  icon: React.ElementType
  iconColor: string
  titel: string
  subtitel: string
  inhoud: string[]  // paragraphs
  tabel?: { kop: string[]; rijen: string[][] }  // na de tekst, vóór de tips
  tips?: string[]
  link?: string     // navigate to this route
}

const CATEGORIES = [
  { id: 'start', label: 'Aan de slag', icon: Zap, color: '#D24620' },
  { id: 'projecten', label: 'Projecten', icon: FolderKanban, color: '#1A535C' },
  { id: 'offertes', label: 'Offertes', icon: FileText, color: '#D24620' },
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
    iconColor: '#D24620',
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
    iconColor: '#D24620',
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
    iconColor: '#D24620',
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
    iconColor: '#D24620',
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
    link: '/planning',
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
    id: 'mail-outlook-niveau',
    category: 'communicatie',
    icon: Mail,
    iconColor: '#6A5A8A',
    titel: 'Mail in doen.: zo werkt het',
    subtitel: 'Lezen, antwoorden en koppelen zonder je mailbox te verlaten',
    inhoud: [
      '**Split view en conversatie.** Links je lijst, rechts het gesprek. Een klant die vier keer heen en weer mailt over dezelfde gevel zie je als één conversatie, nieuwste onderaan. Het geciteerde deel van elk bericht zit ingeklapt achter "···", zodat je alleen leest wat nieuw is.',
      '**Toetsenbord.** Alles gaat zonder muis. De toetsen werken zodra je niet in een tekstveld staat; druk op **?** voor de kaart in de app. De volledige lijst staat in de tabel hieronder.',
      '**Verzenden met bedenktijd.** Na Verzenden blijft de mail een paar seconden staan met "Ongedaan maken". Verkeerde prijs, vergeten bijlage, verkeerde klant: terughalen in plaats van een tweede mail. **Later verzenden** zit onder het pijltje naast Verzenden: over een uur, vanavond 18:00, morgen 09:00, maandag 09:00 of een eigen moment. Tot dat moment kun je hem nog bewerken.',
      '**Concepten op elk apparaat.** Elke twee seconden wordt je concept bewaard. Begin op de zaak, maak af op je telefoon bij de klant. Sluiten hoeft niet bevestigd te worden: je concept staat in de map Concepten.',
      '**Snooze.** Mail die je pas donderdag nodig hebt zet je weg met **z**. Hij komt op dat moment ongelezen terug bovenaan je inbox, met een melding als je die aan hebt staan.',
      '**Opvolgen.** Zet bij het verzenden "Opvolgen" aan als je een antwoord verwacht. Komt de reactie binnen, dan verdwijnt de mail uit Opvolgen. Blijft het stil, dan staat hij daar tot je zelf belt.',
      '**Klantkaart en koppelen.** Rechts naast het gesprek zie je wie het is: open offertes, lopende projecten, laatste factuur. Sleep een mail naar een project in de zijkolom en hij hangt eraan, voor het hele team zichtbaar in het projectdossier. Koppelen kan ook aan een klant, offerte, factuur, aanvraag, taak of lead.',
      '**Zoeken met chips.** Typ in het zoekveld en kies een chip: van, aan, onderwerp, met bijlage, periode, klant. Combineer ze. "van: gemeente, met bijlage, laatste maand" vindt de vergunningstekening zonder scrollen.',
      '**Afbeeldingen blokkeren.** Externe plaatjes in nieuwsbrieven en cold outreach laden pas als je erom vraagt. Zo ziet een afzender niet wanneer je een mail opent. Mail van bekende klanten laadt gewoon.',
      '**Wat er in je mailbox gebeurt.** Wat je via doen. verstuurt komt ook in de Verzonden-map van je eigen mailbox, dus ook op je telefoon en in Outlook. Lezen, archiveren, verwijderen en pinnen gaan twee kanten op: doe je het in doen., dan ziet je mailbox het, en andersom.',
      '**Mailbox-gezondheid.** Onder Instellingen, E-mail, Verbinding staat een kaart: groen met "laatst 2 min geleden" als alles loopt, oranje met de fout als het hapert, rood als de server te vaak weigerde. Eén knop "Opnieuw verbinden" zet de synchronisatie weer aan.',
      '**Mobiel.** Swipe naar links archiveert (of verwijdert, dat kies je zelf), naar rechts markeert als gelezen. De ronde knop rechtsonder start een nieuwe mail. De composer neemt het hele scherm, je handtekening schaalt mee.',
      '**Wat stel je in.** Vier schakelaars onder Instellingen, doen., Functies, groep Mail: **Bedenktijd na verzenden** (met het aantal seconden), **Externe afbeeldingen pas na klik**, **Verzonden mail ook in je mailbox** en **Inbox gesplitst door Daan** (Aanvragen, Klanten, Leveranciers, Overig). Drie voorkeuren per persoon, in het menu van de maillijst: **dichtheid** (comfortabel of compact), **labels op de mappenrail** aan of uit, en wat **swipe naar links** doet (archiveren of verwijderen).',
      '**Een tweede postvak toevoegen.** Ga naar Instellingen, E-mail, Verbinding. Boven het formulier staat de lijst met je gekoppelde postvakken, met onderaan "Postvak toevoegen". Kies de provider, vul adres en app-wachtwoord in, klik Test verbinding en sla op. Per postvak kun je daarna hernoemen (bijvoorbeeld "Studio"), het als standaard instellen of het ontkoppelen; ontkoppelen haalt alleen de koppeling en het wachtwoord weg, je mail blijft gewoon in doen. staan.',
      '**Meerdere postvakken.** Heb je meer dan één mailbox gekoppeld, dan staat boven de mappen een kiezer met een bolletje per postvak. "Alle postvakken" toont alles door elkaar; kies je er één, dan zie je alleen die mail. In de composer verschijnt dan een regel **Van**, zodat je per bericht kiest waar het vandaan komt; je antwoord gaat altijd de deur uit vanuit het postvak dat daar staat. Met één postvak zie je hier niets van.',
      '**Gedeeld postvak.** Een postvak als info@ of verkoop@ kan van het team zijn. Iedereen ziet dezelfde mail, en met **Toewijzen aan** geef je een gesprek aan een collega. Zijn initialen staan daarna in de lijstregel, zodat niemand twee keer antwoordt. Boven de lijst staan dan twee extra filters: **Van mij** en **Niet toegewezen**. Onder het gesprek staat een blok **Interne notitie**: een aantekening voor je collega\'s die nooit naar de klant gaat. Noem iemand met @ en die krijgt een melding.',
      '**Regels.** Onder Instellingen, E-mail, Regels en labels leg je vast wat er automatisch gebeurt. Een regel kijkt naar de afzender, het onderwerp, het domein, het aan-adres of de aanwezigheid van een bijlage, en kan de mail archiveren, een label geven, als gelezen markeren, aan een project koppelen of aan een collega toewijzen. Sleep ze in de volgorde die je wilt: de bovenste die past, wint. Met "Nu toepassen op de laatste 200 mails" haal je je inbox in één keer bij.',
      '**Eigen labels.** In dezelfde kaart maak je labels met een naam en een kleur uit acht tinten. Ze staan in het labelmenu van de lijst en het gesprek, en onder de mappen als filter. De vaste labels offerte, klant, project en leverancier blijven gewoon bestaan.',
    ],
    tabel: {
      kop: ['Toets', 'Doet'],
      rijen: [
        ['j / k', 'Volgende / vorige mail'],
        ['o of Enter', 'Openen'],
        ['e', 'Archiveren (springt naar de volgende)'],
        ['#', 'Verwijderen'],
        ['r', 'Antwoorden'],
        ['a', 'Allen antwoorden'],
        ['f', 'Doorsturen'],
        ['c', 'Nieuwe mail'],
        ['z', 'Snooze-menu'],
        ['p', 'Pinnen'],
        ['l', 'Label'],
        ['u', 'Markeren als ongelezen'],
        ['/', 'Zoeken'],
        ['g dan i', 'Naar inbox'],
        ['g dan s', 'Naar verzonden'],
        ['?', 'Toetsenkaart'],
        ['Esc', 'Sluit lezer of composer (concept blijft)'],
        ['Cmd+Enter', 'Verzenden'],
        ['Cmd+K', 'Commandopalet'],
      ],
    },
    tips: [
      'Werk je inbox leeg met j, o, e: lezen, archiveren, volgende. Zonder muis.',
      'Sleep de offerte-aanvraag meteen naar het project, dan vindt je monteur hem terug',
      'Zet Bedenktijd op 15 seconden als je vaak vanaf de telefoon verstuurt',
    ],
    link: '/email',
  },
  {
    id: 'mail-koppelen',
    category: 'communicatie',
    icon: Mail,
    iconColor: '#6A5A8A',
    titel: 'Mailbox koppelen: Gmail, Microsoft, overig',
    subtitel: 'Vijf minuten, daarna komt je mail vanzelf binnen',
    inhoud: [
      'Ga naar **Instellingen, E-mail**. Het scherm opent op Verbinding met drie kaarten: Google, Microsoft 365 / Outlook.com en Overig. Iedere gebruiker koppelt zijn eigen mailbox; je collega ziet alleen de mail die aan een project hangt.',
      '**Google (Gmail en Workspace).** 1. Zet 2-stapsverificatie aan op je Google-account. 2. Maak een app-wachtwoord op myaccount.google.com/apppasswords. 3. Plak de 16 tekens bij Wachtwoord, sla op en klik Test verbinding. De knop "Aanmelden met Google" staat klaar voor koppelen in twee klikken; zodra hij actief is, hoef je geen app-wachtwoord meer te maken.',
      '**Microsoft 365 en Outlook.com.** Microsoft staat wachtwoord-login voor mailprogramma\'s niet meer toe. Zodra de knop "Aanmelden met Microsoft" actief is, koppel je in twee klikken. Heeft je beheerder SMTP AUTH en IMAP nog aanstaan, dan werkt een app-wachtwoord soms nog; probeer het met Test verbinding.',
      '**Overig (eigen hosting).** Vraag je hostingpartij om de IMAP-server (ontvangen, meestal poort 993) en de SMTP-server (verzenden, meestal poort 587). Vul ze in bij de kaart Overig, samen met je adres en wachtwoord.',
      '**Test verbinding** controleert IMAP en SMTP los van elkaar en zegt precies welke van de twee weigert. Daarna zie je bovenaan de gezondheidskaart: groen zodra de eerste synchronisatie klaar is.',
      '**SPF.** Mail je vanaf een eigen domein via Google, zet dan include:_spf.google.com in het SPF-record van je domein. Anders belandt je offerte bij de klant in de spam.',
      '**Meldingen** bij nieuwe mail regel je onder Instellingen, Account, Meldingen. Die staan los van de koppeling.',
    ],
    tips: [
      'Loopt de synchronisatie vast na een wachtwoordwissel: nieuw app-wachtwoord plakken, opslaan, klaar',
      'Verwijderen onder de kaart haalt de koppeling en het wachtwoord weg, je mail in doen. blijft staan',
    ],
    link: '/instellingen?tab=email&sub=verbinding',
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
  {
    id: 'functies-schakelaars',
    category: 'start',
    icon: Sparkles,
    iconColor: '#1A535C',
    titel: 'Functies aan en uit',
    subtitel: 'Zet aan wat je gebruikt, de rest zie je niet',
    inhoud: [
      'Onder **Instellingen > doen. > Functies** staan schakelaars per organisatie. Wat uit staat, verschijnt nergens in de app. Zo blijft doen. rustig voor een bedrijf van drie mensen en compleet voor een bedrijf van twintig.',
      'De schakelaars zijn gegroepeerd per module: offertes, klanten, projecten, planning, facturen en inkoop, team en meldingen. Alleen een **beheerder** kan ze wijzigen. Een paar schakelaars hebben een getal erbij, zoals het bedrag waarboven een offerte eerst door een collega gecheckt moet worden.',
      'Kom je van Gripp of James Pro? De functies die je daar gewend was staan hier klaar: vervolg na de offerte, vaste klantnotitie als waarschuwing, deelfactuur met aanbetaling, opvolgstappen op de factuur, opgeslagen planningweergaven, herhaald inplannen en collega noemen met @.',
    ],
    tips: [
      'Standaard staan de rustige functies aan en de zwaardere uit; begin met wat je mist',
      'Een schakelaar omzetten heeft geen gevolgen voor bestaande gegevens, alleen voor wat je ziet',
    ],
    link: '/instellingen?tab=functies',
  },
  {
    id: 'offerte-vervolg',
    category: 'offertes',
    icon: ChevronRight,
    iconColor: '#D24620',
    titel: 'Vervolg na de offerte',
    subtitel: 'Naar project, direct factureren of afgewezen met reden',
    inhoud: [
      'Op een verstuurde of goedgekeurde offerte staat de knop **Vervolg**. In één scherm kies je: naar een project (uren en bewerkingen gaan mee), direct factureren, of afgewezen met een reden (te duur, te late levering, iets anders). De reden blijft zichtbaar op de offerte en gaat mee naar de deal.',
      'Mail of print je de offerte buiten de app? Kies **Markeer als verzonden**. De status wordt verzonden zonder dat er een mail uitgaat, en de opvolging loopt gewoon.',
      'Accepteert de klant via de offertelink, dan tekent hij met een **handtekening** op het scherm. Die staat daarna bij de offerte, met naam en datum. Akkoord via het klantportaal blijft zonder handtekening.',
    ],
    tips: [
      'Een afgewezen offerte met reden is waardevoller dan een die stil verloopt: je ziet later waarom je verliest',
      'Grote offerte? Zet in Functies een bedrag waarboven een collega eerst moet checken',
    ],
    link: '/offertes',
  },
  {
    id: 'offerte-condities-staffels',
    category: 'offertes',
    icon: FileText,
    iconColor: '#D24620',
    titel: 'Condities, staffels en interne notities',
    subtitel: 'Standaard of Spoed in één keuze',
    inhoud: [
      'Een **conditie** is een set: geldigheid, levertijd, betalingsconditie en voorwaarden. Kies op de offerte Standaard of Spoed en alles staat goed. Spoed geeft het project bij akkoord meteen prioriteit. Condities beheer je bij Instellingen > Offertes > Calculatie.',
      'Een **staffel** op een calculatieproduct geeft vanaf een aantal een andere inkoop- en verkoopprijs. De editor neemt de juiste staffel over en laat stil zien wat de volgende stap is: "vanaf 25 st: 8,40".',
      'De gele **interne notitie** per regel komt nooit op de offerte of in het portaal. Voor PMS-nummers, montage-afspraken en waarschuwingen aan jezelf. Het veld **Referentie klant** komt wel op de PDF, als "Uw referentie"; bij klanten met PO-nummer verplicht kan de offerte niet zonder de deur uit.',
    ],
    tips: [
      'Zet de interne notitie ook op de werkbon: de monteur ziet hem, de klant niet',
      'Nettowinst-indicatie in de zijbalk rekent met de kostprijs per uur uit Instellingen > Calculatie',
    ],
    link: '/offertes',
  },
  {
    id: 'klant-waarschuwing-tags',
    category: 'klanten',
    icon: Users,
    iconColor: '#3A6B8C',
    titel: 'Vaste notitie, tags en standaardwaarden',
    subtitel: 'Wat je over een klant moet weten, waar je het nodig hebt',
    inhoud: [
      'Zet op de klant een **gepinde notitie** en vink "toon als waarschuwing" aan. De notitie verschijnt dan bovenaan de offerte, het project, de werkbon, de bestelbon en de inkoopfactuur. "Altijd PO-nummer vragen." "Levering alleen via de achterkant."',
      'Per klant leg je **standaardwaarden** vast: verzendvoorkeur (e-mail, post of portaal), btw verlegd, PO-nummer verplicht en geen betalingsherinneringen. Offerte en factuur houden er rekening mee.',
      '**Tags** zijn vrije labels zoals Kerstkaart of Beurs. Je filtert de klantenlijst erop. Een **prospect** wordt automatisch klant zodra een offerte wordt geaccepteerd.',
    ],
    tips: [
      'Gebruik de waarschuwing spaarzaam: één zin die de monteur of calculator echt moet lezen',
      'Tags staan in Functies en staan standaard aan; zet ze uit als je ze niet gebruikt',
    ],
    link: '/klanten',
  },
  {
    id: 'project-kanban-sjablonen',
    category: 'projecten',
    icon: FolderKanban,
    iconColor: '#1A535C',
    titel: 'Kolommen per fase en projectsjablonen',
    subtitel: 'Wat er in productie hangt, in euro\'s',
    inhoud: [
      'Zet de projectenlijst om naar **kolommen per fase**. Boven elke kolom staat het aantal projecten en de som van de projectwaarde. Sleep een project naar de volgende fase; op de telefoon veeg je door de kolommen.',
      'Sla een project op als **sjabloon** (met bewerkingen en taken, zonder klant en datums) en start een nieuw project daaruit: autobelettering, gevelframe, doosletters. Sjablonen staan niet tussen je gewone projecten.',
      'Op offerte en factuur vind je **Geschiedenis**: wie wat wanneer deed, uit het activiteitenlogboek. Het project heeft daarvoor zijn eigen activiteitenfeed.',
    ],
    tips: [
      'De kolomweergave werkt het best met een projectwaarde ingevuld; die komt uit de offerte',
    ],
    link: '/projecten',
  },
  {
    id: 'deelfactuur-aanbetaling',
    category: 'financieel',
    icon: Receipt,
    iconColor: '#2D6B48',
    titel: 'Wat wil je factureren?',
    subtitel: 'Deelfactuur en aanbetaling in één scherm',
    inhoud: [
      'Klik op een project op **Factureren** en je krijgt de offerteregels met een vinkje en een aantal. Standaard staat het nog niet gefactureerde deel klaar. Een betaald **voorschot** wordt automatisch als verrekenregel toegevoegd.',
      'Kies **Nieuwe factuur** of voeg de regels toe aan een bestaande conceptfactuur van dezelfde klant. Vink aan of het project meteen op te factureren of gefactureerd mag, en of open taken afgerond worden.',
      'Per factuurregel wordt onthouden uit welke offerteregel hij komt, zodat de volgende deelfactuur precies weet wat er nog open staat.',
    ],
    tips: [
      'Vijftig procent vooraf? Maak eerst een voorschotfactuur; de eindfactuur verrekent hem vanzelf',
      'Regels van vóór deze functie hebben geen koppeling en tellen als niet gefactureerd',
    ],
    link: '/facturen',
  },
  {
    id: 'factuur-opvolging-stepper',
    category: 'financieel',
    icon: Bell,
    iconColor: '#2D6B48',
    titel: 'Opvolgstappen op de factuur',
    subtitel: 'Zie in één oogopslag waar hij staat',
    inhoud: [
      'Bovenin een verzonden factuur staan de **opvolgstappen**: factuur, herinnering 1, herinnering 2, aanmaning. Gedane stappen zijn petrol, de actieve stap heeft een oranje rand, met eronder "staat klaar" of "gepauzeerd".',
      'Het tabblad **Vanavond de deur uit** toont welke herinneringen de nachtploeg vanavond verstuurt, met per factuur een pauzeknop. **Ouderdom per klant** in Rapportages laat openstaand zien in 0-30, 31-60, 61-90 en 91+ dagen.',
      'Een factuur die naar **Exact** is gegaan, is daarna **vergrendeld**: bedragen en regels veranderen niet meer. Corrigeren gaat via een creditfactuur. Meerdere concepten voor dezelfde klant voeg je samen tot één factuur.',
    ],
    tips: [
      'Zet in Functies "Concepten op de eerste werkdag melden" aan en je krijgt elke maand een seintje met wat er klaarstaat; versturen blijft een bewuste klik',
    ],
    link: '/facturen',
  },
  {
    id: 'inkoop-leverancier',
    category: 'financieel',
    icon: PiggyBank,
    iconColor: '#2D6B48',
    titel: 'Leverancier onthouden',
    subtitel: 'Eén keer invullen, daarna herkend',
    inhoud: [
      'Koppel een inkoopfactuur aan een **leverancier** uit je lijst; doen. stelt hem voor op naam. Bij goedkeuren kun je de betaaltermijn en de grootboekrekening **onthouden** voor die leverancier.',
      'De volgende factuur van dezelfde leverancier krijgt de vervaldatum en het grootboek dan alvast ingevuld. Bij Leveranciers zie en wijzig je de onthouden waarden.',
    ],
    link: '/inkoopfacturen',
  },
  {
    id: 'planning-weergaven-herhalen',
    category: 'uitvoering',
    icon: Calendar,
    iconColor: '#1A535C',
    titel: 'Opgeslagen weergaven en herhaald inplannen',
    subtitel: '"Ploeg Noord deze week" in één klik',
    inhoud: [
      'Stel het montagebord in zoals je het wilt (wie, week of maand, groepering, statussen) en kies **Huidige weergave opslaan**. Deel de weergave met het team of houd hem voor jezelf. Daarna staat hij in de keuzelijst bovenin.',
      'Een montageafspraak kun je **herhalen**: wekelijks, elke twee weken of maandelijks tot een datum. De afspraken staan los op het bord, elk met een eigen werkbon en uren. Verwijderen kan per afspraak of voor de rest van de reeks.',
    ],
    tips: [
      'Onderhoudsrondes en vaste werkvoorbereidingsmiddagen zijn de klassieke herhalers',
    ],
    link: '/planning',
  },
  {
    id: 'uren-weekstaat',
    category: 'uitvoering',
    icon: Calendar,
    iconColor: '#1A535C',
    titel: 'Weekstaat en uren goedkeuren',
    subtitel: 'Je week in één raster, goedkeuren als je dat wilt',
    inhoud: [
      'Bovenaan Tijdregistratie staat de **weekstaat**: rijen zijn de projecten en bewerkingen waar je deze of vorige week aan werkte, kolommen zijn de dagen. Typ een getal in een cel en het uur staat vast. Onder elke dag zie je het totaal en, als er werktijden zijn ingesteld, de dagnorm met de afwijking.',
      'Inklokken blijft bestaan en vult dezelfde uren. De weekstaat is voor wie liever achteraf invult, of om een dag te corrigeren.',
      '**Uren goedkeuren** is een aparte schakelaar in Functies, standaard uit. Aan betekent: nieuwe uren zijn concept, je dient je week in met één knop, een beheerder keurt goed in de kaart "Te keuren", en alleen goedgekeurde uren gaan naar de factuur. Uit betekent: elk uur telt meteen mee, zoals altijd.',
    ],
    tips: [
      'Werktijden per medewerker stel je in bij Team, in het blok Werktijden; daar komt de dagnorm vandaan',
      'Een teruggestuurde week krijgt de opmerking van de beheerder als melding',
    ],
    link: '/tijdregistratie',
  },
  {
    id: 'planning-bezetting',
    category: 'uitvoering',
    icon: Users,
    iconColor: '#1A535C',
    titel: 'Werktijden en bezetting',
    subtitel: '13 van 40 uur, vier weken vooruit',
    inhoud: [
      'Geef elke medewerker **werktijden** per weekdag (Team, medewerker bewerken, blok Werktijden). Verandert het rooster, dan maak je een nieuw rooster met een ingangsdatum; het oude blijft gelden tot die dag.',
      'De tab **Bezetting** bij Team laat per medewerker per week zien hoeveel er gepland staat tegenover wat er beschikbaar is: werktijden min verlof, afwezigheid en sluitingsdagen. Gepland zijn de montageafspraken plus taken met een deadline in die week. Tik op een cel voor de opbouw.',
      'Vanuit het montagebord kom je er via het menu rechtsboven.',
    ],
    tips: [
      'Boven 110 procent kleurt de cel amber, boven 130 rood: tijd om te schuiven of iemand erbij te zetten',
      'Zonder werktijden is er geen noemer; begin daar',
    ],
    link: '/team?tab=bezetting',
  },
  {
    id: 'meldingen-noemen',
    category: 'communicatie',
    icon: Bell,
    iconColor: '#6A5A8A',
    titel: 'Meldingen naar jouw hand en collega noemen',
    subtitel: 'Typ @ en de collega weet het',
    inhoud: [
      'Onder **Instellingen > Meldingen** kies je per categorie of een melding in de app komt en als push op je telefoon. Iedereen regelt dat voor zichzelf.',
      'Typ **@** in een notitie op een project of klant en kies een collega. Die krijgt een melding met een link naar de plek. Handig voor "@Youp let op de hoogwerker".',
      'Met **Herinnering als er nog geen uren staan** krijgt wie aan het eind van de dag niets schreef een seintje. Een getekende werkbon telt als geschreven uren.',
    ],
    link: '/instellingen?tab=meldingen',
  },
]

// Render **bold** markdown as <strong>
function renderBold(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
  )
}

// ── The DOEN workflow · the visual spectrum ──

const FLOW_STEPS = [
  { icon: Users, label: 'Klant', desc: 'Leg je klant vast', color: '#3A6B8C', category: 'klanten', voordelen: ['Contactpersonen', 'Vestigingen', 'Volledige historie'] },
  { icon: FolderKanban, label: 'Project', desc: 'Start het traject', color: '#1A535C', category: 'projecten', voordelen: ['Taken toewijzen', 'Bestanden delen', 'Voortgang bijhouden'] },
  { icon: FileText, label: 'Offerte', desc: 'Maak de deal', color: '#D24620', category: 'offertes', voordelen: ['PDF genereren', 'Direct versturen', 'Calculatie-templates'] },
  { icon: Globe, label: 'Portaal', desc: 'Deel met je klant', color: '#6A5A8A', category: 'klanten', voordelen: ['Tekeningen delen', 'Offertes goedkeuren', 'Berichten sturen'] },
  { icon: ClipboardCheck, label: 'Werkbon', desc: 'Geef de opdracht', color: '#9A5A48', category: 'uitvoering', voordelen: ['Neemt offerte over', 'Foto\'s uploaden', 'Klant handtekening'] },
  { icon: Calendar, label: 'Planning', desc: 'Plan de montage', color: '#1A535C', category: 'uitvoering', voordelen: ['Drag & drop', 'Weer integratie', 'Per monteur filteren'] },
  { icon: Receipt, label: 'Factuur', desc: 'Stuur de rekening', color: '#2D6B48', category: 'financieel', voordelen: ['Mollie betaallink', 'Auto herinneringen', 'PDF bijlage'] },
  { icon: CheckCircle, label: 'Gedaan.', desc: 'Klant tevreden', color: '#D24620', category: 'start', voordelen: ['Transparant proces', 'Snelle oplevering', 'Professionele uitstraling'] },
]

// ── Component ──

export function KennisbankPage() {
  const navigate = useNavigate()
  const { staatUit } = useFeatureFlags()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<KbArticle | null>(null)
  // Deep link vanuit de functies-schakelaars: /kennisbank?artikel=<id>
  const [searchParams] = useSearchParams()
  const artikelParam = searchParams.get('artikel')
  useEffect(() => {
    if (!artikelParam) return
    const gevonden = ARTICLES.find((a) => a.id === artikelParam)
    if (gevonden) setActiveArticle(gevonden)
  }, [artikelParam])

  const filtered = useMemo(() => {
    let list = ARTICLES
    if (activeCategory) list = list.filter(a => a.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.titel.toLowerCase().includes(q) ||
        a.subtitel.toLowerCase().includes(q) ||
        a.inhoud.some(p => p.toLowerCase().includes(q)) ||
        (a.tabel?.rijen ?? []).some(r => r.some(cel => cel.toLowerCase().includes(q)))
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
          className="flex items-center gap-1.5 text-[13px] font-medium mb-6 transition-colors hover:text-petrol"
          style={{ color: 'hsl(var(--muted-foreground))' }}
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

        <h1 className="font-heading text-[32px] font-bold tracking-tight leading-[1.1] mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          {activeArticle.titel}
        </h1>
        <p className="text-[16px] mb-10" style={{ color: 'hsl(var(--muted-foreground))' }}>{activeArticle.subtitel}</p>

        <div className="space-y-5">
          {activeArticle.inhoud.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.8] animate-stagger-item" style={{ color: '#3A3A3A', animationDelay: `${i * 60}ms` }}>{renderBold(p)}</p>
          ))}
        </div>

        {activeArticle.tabel && (
          <div className="mt-8 overflow-x-auto rounded-xl border animate-stagger-item" style={{ borderColor: 'hsl(var(--border))', animationDelay: `${activeArticle.inhoud.length * 60 + 60}ms` }}>
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ backgroundColor: 'hsl(var(--muted))' }}>
                  {activeArticle.tabel.kop.map((k) => (
                    <th key={k} className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeArticle.tabel.rijen.map((rij, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                    {rij.map((cel, j) => (
                      <td key={j} className={cn('px-4 py-2 align-top', j === 0 ? 'font-mono font-semibold whitespace-nowrap text-petrol' : 'text-foreground/80')}>{cel}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeArticle.tips && activeArticle.tips.length > 0 && (
          <div className="mt-10 rounded-2xl p-6 animate-stagger-item" style={{ backgroundColor: '#1A535C', animationDelay: `${activeArticle.inhoud.length * 60 + 100}ms` }}>
            <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3 text-white/60">Tips</h3>
            <ul className="space-y-2.5">
              {activeArticle.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-white/90">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-flame" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Wijst het artikel naar een module die uitgezet is, dan geen knop. De
            route stuurt je dan naar de startpagina en dat leest als een bug. */}
        {activeArticle.link && !moduleUitgezet(activeArticle.link, staatUit) && (
          <button
            onClick={() => navigate(activeArticle.link!)}
            className="mt-8 inline-flex items-center gap-2 h-11 px-6 text-[14px] font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#D24620' }}
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
        {/* Decorative bg elements · clipped to banner shape */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-[-80px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-[0.05] bg-white" />
          <div className="absolute bottom-[-50px] left-[5%] w-[180px] h-[180px] rounded-full opacity-[0.03] bg-white" />
        </div>
        {/* Pulsing heart glow · clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-[15%] right-[8%] w-[100px] h-[100px] rounded-full animate-pulse" style={{ backgroundColor: '#D24620', opacity: 0.06 }} />
          <div className="absolute top-[18%] right-[9.5%] w-[60px] h-[60px] rounded-full animate-pulse" style={{ backgroundColor: '#D24620', opacity: 0.08, animationDelay: '0.5s' }} />
        </div>

        <div className="relative px-5 pt-8 pb-6 md:px-12 md:pt-12 md:pb-10">
          {/* Title + mission */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <h1 className="font-heading text-[32px] md:text-[56px] font-bold tracking-[-2.5px] leading-[0.95] text-white mb-4">
                Doen<span style={{ color: '#D24620' }}>.</span><br />
                <span className="text-white/40">de kracht achter</span><br />
                doeners.
              </h1>
              <p className="text-[16px] text-white/45 max-w-md leading-relaxed">
                Eén doel: je klant tevreden houden. Van eerste contact tot oplevering · alles in Doen. is gebouwd rond die missie.
              </p>
            </div>
            {/* The goal · visual anchor */}
            <div className="hidden md:flex flex-col items-center animate-stagger-item" style={{ animationDelay: '600ms' }}>
              <div className="h-20 w-20 rounded-3xl flex items-center justify-center relative" style={{ backgroundColor: '#D24620', boxShadow: '0 8px 30px rgba(210, 70, 32,0.4)' }}>
                <CheckCircle className="h-9 w-9 text-white" />
              </div>
              <span className="text-[15px] font-bold text-white mt-3">Gedaan<span style={{ color: '#D24620' }}>.</span></span>
              <span className="text-[11px] text-white/35">Klant tevreden</span>
            </div>
          </div>

          {/* ── Flow spectrum ── */}
          <div>
            {/* The journey · visual flow */}
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
                        <StepIcon className={cn("text-white", isLast ? "h-6 w-6" : "h-4.5 w-4.5")} />
                      </div>
                      {/* Label */}
                      <span className={cn("font-bold text-white mt-2 whitespace-nowrap", isLast ? "text-[13px]" : "text-[11px]")}>{step.label}</span>
                      <span className="text-[10px] text-white/30 whitespace-nowrap leading-tight">{step.desc}</span>
                      {/* Hover tooltip with voordelen · above */}
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
            <div className="h-1 rounded-full mt-4 mx-2" style={{ background: `linear-gradient(90deg, #3A6B8C, #1A535C, #D24620, #6A5A8A, #9A5A48, #1A535C, #2D6B48, #D24620)` }} />
          </div>
        </div>
      </div>

      {/* ── Search + filters + articles ── */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Search · pulled up into hero overlap */}
        <div className="relative max-w-2xl mx-auto -mt-6 mb-8 z-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
            placeholder="Zoek op onderwerp, module of functie..."
            className="w-full h-13 pl-12 pr-5 text-[15px] rounded-2xl outline-none transition-all focus:ring-2 focus:ring-petrol/20 focus:shadow-[0_4px_20px_rgba(26,83,92,0.1)]"
            style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 16px rgba(130,100,60,0.08)' }}
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap justify-center mb-10">
          <button
            onClick={() => { setActiveCategory(null); setSearch('') }}
            className={cn(
              'h-9 px-5 rounded-full text-[12px] font-bold transition-all duration-200',
              !activeCategory && !search ? 'text-white shadow-md' : 'hover:bg-muted'
            )}
            style={!activeCategory && !search ? { backgroundColor: '#1A535C' } : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
          >
            Alles
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(activeCategory === cat.id ? null : cat.id); setSearch('') }}
              className={cn(
                'h-9 px-5 rounded-full text-[12px] font-bold transition-all duration-200 inline-flex items-center gap-1.5',
                activeCategory === cat.id ? 'text-white shadow-md' : 'hover:bg-muted'
              )}
              style={activeCategory === cat.id ? { backgroundColor: cat.color } : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || activeCategory) && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-[13px] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {filtered.length} {filtered.length === 1 ? 'artikel' : 'artikelen'}
              {search && <> voor &ldquo;{search}&rdquo;</>}
              {activeCategory && !search && <> in <strong>{CATEGORIES.find(c => c.id === activeCategory)?.label}</strong></>}
            </p>
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="text-[12px] font-semibold" style={{ color: '#D24620' }}>
              Wis filter
            </button>
          </div>
        )}

        {/* ── Articles grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-10 w-10 mx-auto mb-4 opacity-15" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <p className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Geen artikelen gevonden</p>
            <p className="text-[13px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Probeer een ander zoekwoord</p>
            <button onClick={() => { setSearch(''); setActiveCategory(null) }} className="text-[13px] font-bold mt-3 inline-flex items-center gap-1" style={{ color: '#D24620' }}>
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
                  style={{ border: '1px solid hsl(var(--border))', animationDelay: `${idx * 40}ms` }}
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
                    <h3 className="text-[15px] font-bold leading-snug mb-1.5 group-hover:text-petrol transition-colors" style={{ color: 'hsl(var(--foreground))' }}>
                      {article.titel}
                    </h3>
                    <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
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
          <p className="text-[14px] font-heading font-bold tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
            Doen<span style={{ color: '#D24620' }}>.</span>
          </p>
          <p className="text-[12px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Gebouwd voor creatieve maakbedrijven
          </p>
        </div>
      </div>
    </div>
  )
}
