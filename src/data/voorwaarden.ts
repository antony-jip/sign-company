/* Algemene voorwaarden doen.
   ---------------------------------------------------------------
   Opzet volgt de Nederlandse SaaS-praktijk: Moneybird zet de
   verwerkersbepalingen in de voorwaarden zelf, Teamleader hangt ze als
   bijlage eraan en laat beide bij aanmelding accepteren. Hier staat
   alles in één document, met de verwerkersovereenkomst als Bijlage A
   en de sub-verwerkers als Bijlage B.

   De sub-verwerkers in Bijlage B zijn afgeleid uit de code: elke
   integratie met een eigen API-sleutel of externe host in
   forgedesk/api. Komt er een koppeling bij, dan hoort die hier ook bij.

   Contractspartij is Sign Company VOF. Let op: een VOF is geen
   rechtspersoon, dus de vennoten zijn hoofdelijk aansprakelijk. Dat maakt
   de aansprakelijkheidsbeperking in artikel 18 extra belangrijk om door een
   jurist te laten toetsen. Zie JURIDISCH.md. */

export const VOORWAARDEN_VERSIE = '1.1'
export const VOORWAARDEN_DATUM = '9 augustus 2026'

export type Artikel = {
  nr: string
  titel: string
  leden: string[]
}

export type Hoofdstuk = {
  titel: string
  intro?: string
  artikelen: Artikel[]
}

export const hoofdstukken: Hoofdstuk[] = [
  {
    titel: 'Algemeen',
    artikelen: [
      {
        nr: '1',
        titel: 'Wie wij zijn',
        leden: [
          'doen. is een online softwaredienst van Sign Company VOF, gevestigd aan De Drie Kronen 115, 1601 MT Enkhuizen, ingeschreven bij de Kamer van Koophandel onder nummer 36011150, btw-nummer NL006284267B01. In deze voorwaarden noemen we onszelf "doen.", "wij" of "ons".',
          'Met "jij" of "je" bedoelen we de onderneming die een account aanmaakt of gebruikt. doen. is een zakelijke dienst. We leveren niet aan consumenten, en het herroepingsrecht voor consumenten is daarom niet van toepassing.',
          'Je bereikt ons via het contactformulier op doen.team/contact of telefonisch op +31 228 351 960. Vragen over deze voorwaarden of over je gegevens beantwoorden we binnen vijf werkdagen.',
        ],
      },
      {
        nr: '2',
        titel: 'Waarop deze voorwaarden van toepassing zijn',
        leden: [
          'Deze voorwaarden gelden voor elk gebruik van doen.: de webapplicatie op app.doen.team, het klantportaal, de bijbehorende website en alle onderdelen die wij daarbinnen aanbieden.',
          'Je aanvaardt deze voorwaarden op het moment dat je een account aanmaakt. Bij het aanmaken vink je aan dat je ze gelezen hebt. Zonder die aanvaarding komt er geen overeenkomst tot stand.',
          'Bijlage A (verwerkersovereenkomst) en Bijlage B (sub-verwerkers) horen bij deze voorwaarden en aanvaard je tegelijk. Bijlage A is de verwerkersovereenkomst zoals de AVG die voorschrijft. Je hoeft daar niet apart om te vragen.',
          'Afwijken van deze voorwaarden kan, maar alleen schriftelijk en alleen als wij dat bevestigen. Jouw eigen inkoopvoorwaarden wijzen wij uitdrukkelijk van de hand.',
          'Is één bepaling ongeldig, dan blijven de overige gewoon gelden. We vervangen de ongeldige bepaling dan door een geldige die er qua strekking het dichtst bij komt.',
        ],
      },
    ],
  },
  {
    titel: 'Je account',
    artikelen: [
      {
        nr: '3',
        titel: 'Account aanmaken en proefperiode',
        leden: [
          'Je maakt zelf een account aan. Je zorgt dat de gegevens die je invult juist zijn en blijven, waaronder je bedrijfsnaam, factuurgegevens en het e-mailadres waarop wij je kunnen bereiken.',
          'Je krijgt 30 dagen gratis toegang tot alle onderdelen. Er is geen creditcard nodig en de proefperiode loopt vanzelf af. Activeer je daarna geen abonnement, dan sluiten wij de toegang. Je gegevens blijven bewaard volgens artikel 17.',
          'Tijdens de proefperiode gelden dezelfde regels als daarna, met uitzondering van de betalingsverplichting.',
          'Je bent verantwoordelijk voor wat er onder jouw account gebeurt. Bewaar inloggegevens zorgvuldig en deel ze niet. Vermoed je dat iemand anders toegang heeft, meld dat dan direct bij ons.',
        ],
      },
      {
        nr: '4',
        titel: 'Gebruikers en teamleden',
        leden: [
          'Het abonnement geeft toegang aan het aantal gebruikers dat bij jouw staffel hoort: tien, twintig of vijfendertig. Elke gebruiker heeft een eigen inlog. Eén inlog delen met meerdere personen is niet toegestaan.',
          'Heb je meer gebruikers nodig, dan schuif je een staffel op. De tarieven staan in artikel 11. Boven vijfendertig gebruikers maken we een aparte afspraak. De rest van deze voorwaarden verandert daardoor niet.',
          'Je kunt teamleden zelf uitnodigen en verwijderen. Wat een teamlid in doen. doet, gebeurt onder jouw verantwoordelijkheid.',
        ],
      },
      {
        nr: '5',
        titel: 'Wat je met doen. wel en niet mag doen',
        leden: [
          'Je gebruikt doen. voor de bedrijfsvoering van je eigen onderneming. Je krijgt daarvoor een niet-exclusief, niet-overdraagbaar gebruiksrecht voor de duur van het abonnement.',
          'Je verhuurt, verkoopt of leent doen. niet uit aan derden, en biedt het niet aan als onderdeel van je eigen dienst.',
          'Je probeert de software niet te kopiëren, te decompileren of na te bouwen, en je omzeilt geen beveiliging, limieten of betaalmuren.',
          'Je gebruikt doen. niet voor iets dat in strijd is met de wet, en je zet er geen gegevens in die je niet mag verwerken.',
          'Je belast onze systemen niet onevenredig zwaar, bijvoorbeeld door geautomatiseerd grote hoeveelheden verzoeken te doen buiten het normale gebruik om.',
          'Zien wij dat een van deze regels wordt overtreden, dan nemen wij eerst contact op. Bij ernstige of herhaalde overtreding mogen wij de toegang opschorten of de overeenkomst beëindigen, zonder dat wij schadevergoeding verschuldigd zijn.',
        ],
      },
    ],
  },
  {
    titel: 'De dienst',
    artikelen: [
      {
        nr: '6',
        titel: 'Wat doen. doet, en wat het niet is',
        leden: [
          'doen. is bedrijfssoftware voor signmakers en reclamebedrijven: projecten, offertes, een klantportaal, planning, werkbonnen, taken, e-mail, facturatie en de daarbij horende onderdelen.',
          'doen. is geen boekhoudpakket en geen vervanging van je accountant. Facturatiegegevens kunnen worden doorgegeven aan je boekhoudsoftware, maar de boekhouding zelf blijft jouw verantwoordelijkheid, net als de juistheid van je btw-aangifte en je administratieplicht.',
          'doen. geeft geen juridisch, fiscaal of financieel advies. Teksten die de software voorstelt, waaronder offerteteksten en algemene voorwaarden van jouw eigen offertes, controleer je zelf voordat je ze gebruikt.',
          'Wij ontwikkelen doen. door. Onderdelen kunnen worden toegevoegd, gewijzigd of vervangen. Vervalt een onderdeel dat voor jou wezenlijk is, dan laten wij dat minimaal 30 dagen van tevoren weten en mag je opzeggen tegen de datum van de wijziging.',
        ],
      },
      {
        nr: '7',
        titel: 'Beschikbaarheid, onderhoud en support',
        leden: [
          'Wij doen ons best om doen. continu beschikbaar te houden, maar geven geen gegarandeerd beschikbaarheidspercentage. Er geldt dus geen SLA, tenzij wij dat apart schriftelijk met je afspreken.',
          'Voor onderhoud kan de dienst tijdelijk niet bereikbaar zijn. Gepland onderhoud proberen wij buiten kantooruren te doen en kondigen wij vooraf aan. Bij spoed, bijvoorbeeld een beveiligingslek, mogen wij direct ingrijpen.',
          'Support krijg je via het contactformulier en de chat, op werkdagen. Wij reageren zo snel als redelijkerwijs mogelijk is, meestal binnen enkele uren, maar wij garanderen geen reactietijd of oplostijd.',
          'Storingen die hun oorzaak hebben buiten onze dienst, bijvoorbeeld bij je internetverbinding, je eigen mailserver of een gekoppelde partij, vallen buiten onze verantwoordelijkheid.',
        ],
      },
      {
        nr: '8',
        titel: 'AI-functies',
        leden: [
          'doen. bevat AI-functies. De assistent Daan vat e-mail samen, stelt teksten voor, leest inkoopfacturen uit en beantwoordt vragen over je eigen gegevens. Studio maakt visualisaties op basis van een foto en een beschrijving.',
          'Om dat te kunnen doen, sturen wij de betreffende inhoud naar de AI-leveranciers in Bijlage B. Dat kan de tekst van een e-mail zijn, een inkoopfactuur als document, of een foto die je uploadt. Wij sturen niet meer mee dan voor de gevraagde bewerking nodig is.',
          'De uitkomst van een AI-functie is een voorstel, geen vaststaand feit. AI kan zich vergissen, ook bij bedragen, data en namen. Je controleert de uitkomst voordat je die naar een klant stuurt, in je administratie verwerkt of erop besluit. Wij zijn niet aansprakelijk voor schade die ontstaat doordat een AI-uitkomst ongecontroleerd is overgenomen.',
          'Onze AI-leveranciers gebruiken jouw invoer niet om hun modellen te trainen. Dat is contractueel met hen vastgelegd.',
          'Bij het abonnement hoort een AI-budget dat meeschaalt met je staffel: € 15, € 30 of € 50 per maand, per organisatie en niet per gebruiker. Dat is ruim voldoende voor het normale werk. Beeldgeneratie in Studio kost aanmerkelijk meer dan tekst, dus wie daar veel gebruik van maakt kan het budget opmaken. Is het op, dan koop je bij of wacht je tot de volgende maand. Het budget telt per kalendermaand en ongebruikt budget schuift niet door.',
          'Upload in Studio geen foto\'s waarop personen herkenbaar in beeld zijn, tenzij je daarvoor een grondslag hebt. Let ook op kentekens en andere gegevens die op een foto van een bedrijfspand of voertuig kunnen staan.',
        ],
      },
      {
        nr: '9',
        titel: 'Koppelingen met andere partijen',
        leden: [
          'Je kunt doen. koppelen aan diensten van derden, waaronder je boekhoudpakket, je betaaldienst, je eigen mailbox en het Handelsregister. Die koppelingen leg je zelf aan met je eigen inloggegevens of machtiging.',
          'Op zo\'n gekoppelde dienst gelden de voorwaarden van die partij zelf. Wij zijn niet verantwoordelijk voor hun beschikbaarheid, hun tarieven of wijzigingen die zij doorvoeren, ook niet als een koppeling daardoor stopt met werken.',
          'Factuurgegevens gaan van doen. naar je boekhoudpakket en niet andersom. Wat je in je boekhouding wijzigt, komt dus niet terug in doen.',
          'Koppel je je eigen mailbox, dan slaan wij de toegangsgegevens versleuteld op en gebruiken wij ze uitsluitend om namens jou te verzenden en te ontvangen.',
        ],
      },
      {
        nr: '10',
        titel: 'Het klantportaal',
        leden: [
          'Met het klantportaal deel je documenten en berichten met jouw klant. Je klant opent het portaal met een unieke link en hoeft niet in te loggen.',
          'Die link geeft toegang tot de inhoud van dat portaal. Jij bepaalt wat je erin zet en met wie je de link deelt. Ga er zorgvuldig mee om, zoals je dat met een e-mailbijlage ook zou doen.',
          'Een portaal heeft een geldigheidsduur en verloopt daarna vanzelf. Je kunt een portaal ook zelf sluiten of verlengen.',
          'Wat jouw klant via het portaal bij ons achterlaat, verwerken wij namens jou, onder de voorwaarden van Bijlage A.',
        ],
      },
    ],
  },
  {
    titel: 'Prijs en betaling',
    artikelen: [
      {
        nr: '11',
        titel: 'Prijs',
        leden: [
          'Het abonnement kost € 129 per maand, exclusief btw, voor maximaal tien gebruikers. Alle onderdelen zitten erbij, net als de onboarding waarin wij doen. aan jou uitleggen. Er zijn geen opstartkosten.',
          'Heb je meer gebruikers nodig, dan geldt een staffel: € 199 per maand tot twintig gebruikers en € 279 per maand tot vijfendertig, allebei exclusief btw. De staffel telt het aantal gebruikersplekken dat je afneemt, niet het aantal mensen dat in een bepaalde maand inlogt. Wij rekenen niet per gebruiker af en alle onderdelen zitten in elke staffel.',
          'Het AI-budget zit bij de prijs in en schaalt mee met de staffel: € 15 per maand tot tien gebruikers, € 30 tot twintig en € 50 tot vijfendertig. Het budget geldt voor je organisatie samen. Extra budget koop je los bij tegen het tarief dat op dat moment in de app staat. Bijgekocht budget is niet inwisselbaar voor geld.',
          'Wil je dat wij bij jou op locatie langskomen om doen. aan je team uit te leggen, dan rekenen wij daarvoor eenmalig € 250, exclusief btw, plus reiskosten. Dat spreken wij vooraf af en het staat los van het abonnement.',
          'Wij mogen de prijs aanpassen. Een verhoging kondigen wij minimaal 30 dagen van tevoren per e-mail aan. Ben je het er niet mee eens, dan mag je opzeggen tegen de datum waarop de nieuwe prijs ingaat.',
        ],
      },
      {
        nr: '12',
        titel: 'Betaling',
        leden: [
          'Betaling gaat vooraf, per maand, via automatische incasso of kaartbetaling. Wij gebruiken daarvoor een betaaldienstverlener. Je betaalgegevens komen bij die partij terecht en niet bij ons.',
          'De factuur ontvang je per e-mail. Kunnen wij niet incasseren, dan proberen wij het opnieuw en sturen wij je bericht.',
          'Blijft betaling uit, dan mogen wij na een herinnering de toegang opschorten. Je gegevens blijven in die periode bewaard. Betaal je alsnog, dan zetten wij de toegang direct weer open.',
          'Bij verzuim ben je de wettelijke handelsrente en redelijke incassokosten verschuldigd.',
        ],
      },
    ],
  },
  {
    titel: 'Gegevens, privacy en beveiliging',
    artikelen: [
      {
        nr: '13',
        titel: 'Jouw gegevens blijven van jou',
        leden: [
          'Alles wat jij en je team in doen. zetten, blijft van jou. Wij worden daar geen eigenaar van en wij gebruiken het niet voor eigen commerciële doeleinden.',
          'Wij gebruiken jouw gegevens alleen om de dienst te leveren, te beveiligen en te ondersteunen, en verder alleen wanneer jij daar zelf om vraagt, bijvoorbeeld bij een supportvraag.',
          'Wij analyseren geanonimiseerde en geaggregeerde gebruiksgegevens om doen. te verbeteren. Daaruit is niet af te leiden wie jij bent of wie jouw klanten zijn.',
          'De software, het ontwerp en de onderliggende techniek van doen. blijven van ons. Je krijgt een gebruiksrecht, geen eigendom.',
        ],
      },
      {
        nr: '14',
        titel: 'Persoonsgegevens',
        leden: [
          'In doen. staan persoonsgegevens: van jou en je teamleden, en van jouw klanten en hun contactpersonen.',
          'Voor de gegevens van jou en je teamleden zijn wij verwerkingsverantwoordelijke. Wij hebben die nodig om je account te beheren, te factureren en je te kunnen bereiken.',
          'Voor de gegevens die jij in doen. zet over jouw eigen klanten zijn wij verwerker en ben jij verwerkingsverantwoordelijke. Jij bepaalt wat je erin zet en waarom. Hoe wij daarmee omgaan staat in Bijlage A.',
          'Wij verkopen geen gegevens en zetten ze niet in voor advertenties.',
        ],
      },
      {
        nr: '15',
        titel: 'Beveiliging en datalekken',
        leden: [
          'Wij nemen passende technische en organisatorische maatregelen. Daaronder vallen versleuteling van verkeer, versleutelde opslag van gekoppelde inloggegevens, gescheiden toegang per organisatie op databaseniveau, en foutmonitoring waarbij persoonsgegevens worden gefilterd.',
          'Geen enkel systeem is volledig veilig. Ontdek je een kwetsbaarheid, meld die dan bij ons via het contactformulier voordat je die met anderen deelt. Wij reageren binnen vijf werkdagen en verhalen niets op melders die zorgvuldig handelen.',
          'Bij een datalek dat jouw gegevens raakt, informeren wij je zonder onredelijke vertraging en uiterlijk binnen 48 uur nadat wij het hebben vastgesteld. Wij geven je daarbij de informatie die je nodig hebt om zelf te kunnen beoordelen of je moet melden bij de Autoriteit Persoonsgegevens.',
        ],
      },
      {
        nr: '16',
        titel: 'Geheimhouding',
        leden: [
          'Wij houden vertrouwelijk wat wij van jou zien of horen, en jij doet hetzelfde met wat je van ons ziet dat niet openbaar is.',
          'Deze verplichting geldt ook na afloop van de overeenkomst, en vervalt alleen voor informatie die al openbaar was of die wij op grond van de wet moeten verstrekken.',
        ],
      },
    ],
  },
  {
    titel: 'Aansprakelijkheid en einde',
    artikelen: [
      {
        nr: '17',
        titel: 'Opzeggen en wat er daarna met je gegevens gebeurt',
        leden: [
          'Het abonnement loopt per maand en is elke maand opzegbaar. Je zegt op in de app. De opzegging gaat in aan het einde van de periode die je al betaald hebt. Tot die datum blijf je gewoon werken.',
          'Wij kunnen de overeenkomst beëindigen bij een ernstige overtreding van deze voorwaarden, bij langdurige wanbetaling, of als wij doen. stoppen. In dat laatste geval geldt een opzegtermijn van drie maanden.',
          'Tot de einddatum exporteer je zelf al je gegevens. Export naar CSV en PDF zit in de dienst.',
          'Na de einddatum bewaren wij je gegevens nog 30 dagen, zodat je terug kunt komen of alsnog kunt exporteren. Daarna verwijderen wij ze definitief uit de actieve systemen. Back-ups lopen daarna nog maximaal 30 dagen door en worden daarna overschreven.',
          'Wil je dat we eerder verwijderen, laat het weten. Wij doen dat dan binnen 14 dagen, behalve voor gegevens die wij wettelijk moeten bewaren, zoals facturen voor de fiscale bewaarplicht.',
        ],
      },
      {
        nr: '18',
        titel: 'Aansprakelijkheid',
        leden: [
          'Wij zijn aansprakelijk voor directe schade die het gevolg is van een toerekenbare tekortkoming van onze kant.',
          'Onze aansprakelijkheid is per gebeurtenis en per jaar beperkt tot het bedrag dat je in de twaalf maanden voorafgaand aan de gebeurtenis aan ons hebt betaald, met een maximum van € 5.000. Een reeks samenhangende gebeurtenissen geldt als één gebeurtenis.',
          'Wij zijn niet aansprakelijk voor indirecte schade, waaronder gederfde winst, gemiste opdrachten, reputatieschade en schade door verlies van gegevens die jij zelf had kunnen exporteren.',
          'Wij zijn evenmin aansprakelijk voor schade die ontstaat doordat een AI-uitkomst zonder controle is gebruikt, doordat een gekoppelde partij van derden uitvalt of wijzigt, of doordat jij of een teamlid onzorgvuldig met inloggegevens of portaallinks is omgegaan.',
          'Deze beperkingen vervallen bij opzet of bewuste roekeloosheid van onze kant, en voor zover de wet ze niet toestaat.',
          'Je vrijwaart ons tegen aanspraken van derden, waaronder jouw eigen klanten, die voortkomen uit de gegevens die jij in doen. hebt gezet of uit de manier waarop jij doen. gebruikt.',
          'Een aanspraak vervalt als je die niet binnen twaalf maanden na ontdekking schriftelijk bij ons meldt.',
        ],
      },
      {
        nr: '19',
        titel: 'Overmacht',
        leden: [
          'Bij overmacht mogen wij onze verplichtingen opschorten zonder schadevergoeding verschuldigd te zijn. Daaronder valt in elk geval uitval van hostingpartijen, grootschalige internetstoringen, cyberaanvallen, stroomuitval, oorlog en overheidsmaatregelen.',
          'Duurt de overmacht langer dan twee maanden, dan mogen beide partijen de overeenkomst beëindigen. Wij betalen dan het deel van de vooruitbetaalde periode terug dat niet is geleverd.',
        ],
      },
      {
        nr: '20',
        titel: 'Wijziging van deze voorwaarden',
        leden: [
          'Wij mogen deze voorwaarden en de bijlagen wijzigen. Bij een wijziging die voor jou nadelig is, laten wij dat minimaal 30 dagen van tevoren per e-mail weten.',
          'Ben je het niet eens met de wijziging, dan mag je opzeggen tegen de ingangsdatum. Blijf je doen. daarna gebruiken, dan geldt de nieuwe versie.',
          'Van elke versie houden wij de datum en het versienummer bij. Deze versie is versie ' + VOORWAARDEN_VERSIE + ', geldig vanaf ' + VOORWAARDEN_DATUM + '.',
        ],
      },
      {
        nr: '21',
        titel: 'Klachten, toepasselijk recht en geschillen',
        leden: [
          'Heb je een klacht, laat het ons eerst weten via het contactformulier. Wij reageren binnen vijf werkdagen en proberen het samen op te lossen.',
          'Op deze overeenkomst is Nederlands recht van toepassing.',
          'Komen we er samen niet uit, dan leggen wij het geschil voor aan de bevoegde rechter van de rechtbank Noord-Holland.',
        ],
      },
    ],
  },
]

/* ── Bijlage A · verwerkersovereenkomst ─────────────────────────── */

export const bijlageA: Artikel[] = [
  {
    nr: 'A1',
    titel: 'Rollen en toepasselijkheid',
    leden: [
      'Deze bijlage is de verwerkersovereenkomst zoals bedoeld in artikel 28 lid 3 AVG. Hij geldt automatisch zodra je een account aanmaakt. Je hoeft er niet apart om te vragen en er hoeft niets apart getekend te worden.',
      'Jij bent verwerkingsverantwoordelijke voor de persoonsgegevens die je in doen. zet over jouw klanten, hun contactpersonen en andere betrokkenen. Wij zijn verwerker.',
      'Voor de gegevens van jou en je teamleden als gebruikers van doen. zijn wij zelf verwerkingsverantwoordelijke. Daarop is deze bijlage niet van toepassing.',
      'Bij tegenstrijdigheid tussen deze bijlage en de rest van de voorwaarden gaat deze bijlage voor, voor zover het de verwerking van persoonsgegevens betreft.',
    ],
  },
  {
    nr: 'A2',
    titel: 'Onderwerp, aard, doel en duur',
    leden: [
      'Onderwerp en doel: het leveren van doen. als bedrijfssoftware, zodat jij je projecten, offertes, planning, werkbonnen, communicatie en facturatie kunt uitvoeren.',
      'Aard van de verwerking: opslaan, ordenen, raadplegen, wijzigen, verzenden, verwijderen, en het geautomatiseerd samenvatten of uitlezen van door jou aangeboden inhoud met behulp van AI.',
      'Duur: zolang de overeenkomst loopt, plus de bewaartermijn uit artikel 17.',
      'Wij verwerken uitsluitend op jouw instructie. Deze overeenkomst en jouw gebruik van de functies in de app vormen samen die instructie. Krijgen wij een instructie die naar ons oordeel in strijd is met de wet, dan melden wij dat.',
    ],
  },
  {
    nr: 'A3',
    titel: 'Welke gegevens en welke betrokkenen',
    leden: [
      'Categorieën betrokkenen: jouw klanten en hun contactpersonen, jouw leveranciers, ontvangers van jouw offertes en facturen, bezoekers van jouw klantportalen, en jouw eigen medewerkers voor zover je hen in projecten, planning of werkbonnen opvoert.',
      'Categorieën gegevens: naam, bedrijfsnaam, adres, e-mailadres, telefoonnummer, functie, inhoud van correspondentie, offerte- en factuurgegevens, betaalstatus, projectgegevens, geregistreerde uren, foto\'s van locaties en uitgevoerd werk, en handtekeningen op werkbonnen.',
      'doen. is niet bedoeld voor bijzondere categorieën persoonsgegevens zoals gezondheidsgegevens, en ook niet voor burgerservicenummers. Zet die er niet in.',
      'Let op bij foto\'s en handtekeningen: een foto van een locatie kan personen of kentekens bevatten, en een handtekening is een persoonsgegeven. Jij beoordeelt of je daarvoor een grondslag hebt.',
    ],
  },
  {
    nr: 'A4',
    titel: 'Beveiliging',
    leden: [
      'Wij nemen passende technische en organisatorische maatregelen als bedoeld in artikel 32 AVG, waaronder: versleuteld transport, versleutelde opslag van gekoppelde inloggegevens en van gevoelige documenten, toegangsscheiding per organisatie op databaseniveau, toegang op basis van rollen, en logging van handelingen op gevoelige onderdelen.',
      'Onze medewerkers en ingeschakelde personen zijn tot geheimhouding verplicht.',
      'Wij beoordelen deze maatregelen periodiek en stellen ze bij wanneer de stand van de techniek daarom vraagt.',
    ],
  },
  {
    nr: 'A5',
    titel: 'Sub-verwerkers',
    leden: [
      'Je geeft ons algemene toestemming om sub-verwerkers in te schakelen. De actuele lijst staat in Bijlage B.',
      'Voegen wij een sub-verwerker toe of vervangen wij er een, dan melden wij dat minimaal 30 dagen van tevoren per e-mail. Heb je een gegrond bezwaar, laat het dan binnen die termijn weten. Komen we er niet uit, dan mag je opzeggen zonder kosten voor de resterende periode.',
      'Met elke sub-verwerker leggen wij dezelfde verplichtingen vast als in deze bijlage staan. Voor hun handelen zijn wij tegenover jou aansprakelijk alsof het ons eigen handelen is.',
    ],
  },
  {
    nr: 'A6',
    titel: 'Doorgifte buiten de Europese Economische Ruimte',
    leden: [
      'Je gegevens worden opgeslagen binnen de EU, op servers in Frankfurt.',
      'Voor een deel van de verwerking maken wij gebruik van partijen buiten de EER. Dat betreft in elk geval de AI-functies. Bij die partijen kan de inhoud die je door AI laat bewerken buiten de EER worden verwerkt.',
      'Voor die doorgifte gelden de standaardcontractbepalingen van de Europese Commissie, aangevuld met de maatregelen die de betreffende partij treft. Bijlage B vermeldt per partij waar de verwerking plaatsvindt en op welke grondslag.',
      'Wil je doen. gebruiken zonder doorgifte buiten de EER, dan kun je de AI-functies laten uitschakelen. Neem daarvoor contact met ons op.',
    ],
  },
  {
    nr: 'A7',
    titel: 'Rechten van betrokkenen',
    leden: [
      'Krijg je een verzoek van een betrokkene, bijvoorbeeld om inzage, correctie of verwijdering, dan handel je dat zelf af. Het grootste deel kun je rechtstreeks in de app doen.',
      'Lukt dat niet zelfstandig, dan helpen wij je binnen vijf werkdagen, tegen kostprijs als het om substantieel werk gaat.',
      'Komt een verzoek per ongeluk bij ons binnen, dan sturen wij de betrokkene door naar jou en behandelen wij het verzoek niet zelf.',
    ],
  },
  {
    nr: 'A8',
    titel: 'Datalekken',
    leden: [
      'Stellen wij een inbreuk in verband met persoonsgegevens vast, dan melden wij dat bij jou zonder onredelijke vertraging en uiterlijk binnen 48 uur.',
      'Wij geven daarbij: wat er gebeurd is, welke categorieën gegevens en betrokkenen het raakt, wat de waarschijnlijke gevolgen zijn en welke maatregelen wij hebben genomen.',
      'De melding aan de Autoriteit Persoonsgegevens en eventueel aan de betrokkenen doe jij, want jij bent verwerkingsverantwoordelijke. Wij leveren de informatie die je daarvoor nodig hebt.',
    ],
  },
  {
    nr: 'A9',
    titel: 'Controle',
    leden: [
      'Op jouw verzoek geven wij de informatie die nodig is om aan te tonen dat wij ons aan deze bijlage houden.',
      'Eens per jaar mag je een audit laten uitvoeren door een onafhankelijke deskundige die tot geheimhouding is gehouden. Je kondigt die minimaal 30 dagen van tevoren aan. De kosten zijn voor jou, tenzij uit de audit blijkt dat wij tekortschieten.',
      'Een audit mag de dienstverlening aan andere klanten niet verstoren en geeft geen toegang tot gegevens van andere klanten.',
    ],
  },
  {
    nr: 'A10',
    titel: 'Teruggave en verwijdering',
    leden: [
      'Bij het einde van de overeenkomst kun je je gegevens exporteren zoals beschreven in artikel 17.',
      'Daarna verwijderen wij de persoonsgegevens volgens de termijnen in artikel 17, tenzij wij ze wettelijk moeten bewaren.',
      'Op verzoek bevestigen wij de verwijdering schriftelijk.',
    ],
  },
]

/* ── Bijlage B · sub-verwerkers ─────────────────────────────────
   Afgeleid uit de integraties in forgedesk: elke partij met een eigen
   API-sleutel of externe host. Wijzigt er iets, werk dan deze lijst bij
   en meld het 30 dagen vooraf (Bijlage A, artikel A5). */

export type SubVerwerker = {
  naam: string
  waarvoor: string
  gegevens: string
  locatie: string
  grondslag: string
}

export const subVerwerkers: SubVerwerker[] = [
  {
    naam: 'Supabase',
    waarvoor: 'Database, bestandsopslag en inloggen',
    gegevens: 'Alle gegevens die je in doen. zet',
    locatie: 'EU (AWS Frankfurt)',
    grondslag: 'Binnen de EER',
  },
  {
    naam: 'Vercel',
    waarvoor: 'Hosting van de applicatie en de website',
    gegevens: 'Verkeersgegevens, IP-adres, gegevens in transit',
    locatie: 'EU, met ondersteuning vanuit de VS',
    grondslag: 'Standaardcontractbepalingen',
  },
  {
    naam: 'Anthropic',
    waarvoor: 'AI-assistent Daan: samenvatten, teksten voorstellen, inkoopfacturen uitlezen',
    gegevens: 'De inhoud die je door AI laat bewerken, waaronder e-mailtekst en documenten',
    locatie: 'Verenigde Staten',
    grondslag: 'Standaardcontractbepalingen, geen training op klantdata',
  },
  {
    naam: 'fal.ai',
    waarvoor: 'Studio: visualisaties genereren',
    gegevens: "Geüploade foto's en de bijbehorende beschrijving",
    locatie: 'Verenigde Staten',
    grondslag: 'Standaardcontractbepalingen, geen training op klantdata',
  },
  {
    naam: 'Mollie',
    waarvoor: 'Betalingen: je abonnement en de betaallinks op jouw facturen',
    gegevens: 'Betaalgegevens, bedrag, factuurreferentie, naam',
    locatie: 'Nederland',
    grondslag: 'Binnen de EER',
  },
  {
    naam: 'Resend',
    waarvoor: 'Verzenden van systeem-e-mail en nieuwsbrieven',
    gegevens: 'E-mailadres, naam, inhoud van het bericht',
    locatie: 'Verenigde Staten, met verzending via EU-regio',
    grondslag: 'Standaardcontractbepalingen',
  },
  {
    naam: 'Sentry',
    waarvoor: 'Foutmeldingen opsporen',
    gegevens: 'Technische foutgegevens; persoonsgegevens worden vooraf gefilterd',
    locatie: 'Verenigde Staten',
    grondslag: 'Standaardcontractbepalingen',
  },
  {
    naam: 'Upstash',
    waarvoor: 'Tijdelijke opslag voor snelheidslimieten en caching',
    gegevens: 'Technische sleutels en tellers, geen inhoudelijke gegevens',
    locatie: 'EU',
    grondslag: 'Binnen de EER',
  },
  {
    naam: 'Trigger.dev',
    waarvoor: 'Achtergrondtaken zoals verzendingen op tijdstip',
    gegevens: 'Verwijzingen naar taken en de gegevens die daarvoor nodig zijn',
    locatie: 'EU',
    grondslag: 'Binnen de EER',
  },
]

/* Koppelingen die jij zelf aanzet. Hier zijn wij geen doorgever maar
   maak jij zelf een verbinding, met je eigen account bij die partij. */
export const eigenKoppelingen: SubVerwerker[] = [
  {
    naam: 'Exact Online, Moneybird, e-Boekhouden, SnelStart',
    waarvoor: 'Doorgeven van factuurgegevens aan je boekhouding',
    gegevens: 'Factuurgegevens, klantnaam, bedragen',
    locatie: 'Nederland',
    grondslag: 'Jouw eigen overeenkomst met die partij',
  },
  {
    naam: 'KvK Handelsregister',
    waarvoor: 'Bedrijfsgegevens ophalen bij het aanmaken van een klant',
    gegevens: 'Bedrijfsnaam, adres, KvK-nummer',
    locatie: 'Nederland',
    grondslag: 'Openbaar register',
  },
  {
    naam: 'Je eigen mailserver (IMAP/SMTP)',
    waarvoor: 'E-mail ontvangen en versturen vanuit doen.',
    gegevens: 'Je e-mailverkeer en de inloggegevens van je mailbox, versleuteld opgeslagen',
    locatie: 'Afhankelijk van je eigen provider',
    grondslag: 'Jouw eigen overeenkomst met die provider',
  },
]
