# PRODUCT: wat doen. is en kan (bron voor copy en regie)

Doorlichting van de codebase op 10 september 2026, read-only. Elke claim heeft een pad:regel. Waar de code en de docs elkaar tegenspreken staat dat erbij. Niets hieronder is verzonnen UX: als de app het niet zo doet, doet de film het ook niet.

## 1. doen. in drie zinnen

doen. is één app waarin een signbedrijf een klus van mail tot betaald afhandelt: mail, klant, offerte met calculatie, klantportaal, project, montageplanning, werkbon, uren, factuur en boekhoudkoppeling (docs/DAAN_KNOWLEDGE.md:10-17). Het is gebouwd voor signmakers en reclamebedrijven van ongeveer 3 tot 30 medewerkers, met een AI-collega die Daan heet en die het bedrijf leert kennen uit de mail en het werk (docs/DAAN_KNOWLEDGE.md:12, src/trigger/daan-nachtploeg.ts:146-148). Het is anders omdat alles aan het project hangt (mail, offerte, portaal, werkbon, uren, factuur komen in één cockpit samen) en omdat het bedrijf radicaal transparant is: iedereen ziet en plant alles van iedereen (CLAUDE.md sectie 5, docs/DAAN_KNOWLEDGE.md:22-24).

## 2. De klus als rode draad: van aanvraag tot betaald

Per stap: scherm, letterlijke knop, wat de app zelf doet, wat de gebruiker doet.

1. Mail komt binnen. Scherm: Email, map "Inbox" (src/components/email/shell/mapConfig.ts:14-23). Automatisch: de cron haalt elke 3 minuten mail op (vercel.json, cron-email-sync */3), en direct na elke sync beoordeelt api/classificeer-aanvraag.ts (regel 8-16) onbeoordeelde inbox-mail in drie lagen (SQL-voorfilter, gratis afzenderfilter, dan Claude Haiku) en zet `is_aanvraag`. Met de schakelaar "Inbox gesplitst door Daan" verschijnen de tabs "Aanvragen", "Klanten", "Leveranciers", "Overig" (mapConfig.ts:57-63). Eerlijk: die schakelaar staat standaard uit (src/lib/functies.ts:69) en de tabindeling zelf is regelwerk op afzender, geen AI-call (shell/afzenderClassificatie.ts:43-49).
2. Aanvraag wordt klant en project. Scherm: de mailreader met de AanvraagKaart. Knoppen: klant aanmaken of koppelen en project aanmaken (src/components/email/AanvraagKaart.tsx:6-7). Handmatig: de gebruiker klikt; er ontstaat geen project vanzelf. Rechts staat de klantkaart met open offertes en projecten van de afzender, en de mail kan naar een project gesleept worden (src/components/changelog/ChangelogPage.tsx:94). Koppelen kan ook met "Aan project koppelen" (src/components/email/EmailActionsPopover.tsx:446-452) en geldt voor de hele thread (reader/KoppelPopover.tsx:187).
3. Projectcockpit. Scherm: /projecten/:id. Kaarten: fasebalk, Briefing, Klant, Team, Tijd, Taken en offertes, Acties, Activiteit, Bestanden, Portaal (src/components/projects/cockpit/*). De fasebalk kent zes stappen: Gepland, In review, Akkoord klant, Actief, Ingepland, Te factureren (ProjectFaseBar.tsx:6-13). Acties-tegels: "Offerte", "Werkbon", "Montage", "Factuur" (ActiesCard.tsx:29-32), plus "Pakbon", "Bevestiging", "Te plannen" (ActiesCard.tsx:87-113).
4. Offerte met calculatie. Scherm: /offertes/nieuw (QuoteCreation.tsx). Per regel opent de calculatie met kolommen "Inkoop", "Verkoop", "Marge" (src/components/quotes/CalculatieModal.tsx:658-673); marge kleurt groen vanaf 65 procent, oranje 50 tot 64, rood eronder (CHANGELOG.md, ronde 2). Interne notitie per regel: "Dit ziet de klant NIET op de offerte." (CalculatieModal.tsx:750). Optioneel: "Laten checken." door een collega (OfferteCheckDialog.tsx:64) en "Uitschrijven vanuit document" waarbij Claude een klantspecificatie in posten knipt maar nooit prijzen verzint (api/offerte-uitschrijven.ts:1-13). Handmatig: de calculatie is handwerk; de app rekent alleen de marge uit.
5. Versturen. Knop: split-button "Verstuur" (QuoteHeader.tsx:374) met de keuze "Via portaal" ("Klant bekijkt online + email-notificatie") of "Via email" ("PDF-bijlage + gepersonaliseerde email") (QuoteHeader.tsx:380-425). Via portaal vereist een gekoppeld project ("Koppel eerst een project"). Automatisch: status wordt `verzonden` (QuoteCreation.tsx:1806, 2012), er komt een portaal-item, en zodra de klant de offerte voor het eerst opent krijgt de maker de melding "Je offerte wordt bekeken" (api/portaal-bekeken.ts:46). Opvolging: de cron van 08:00 loopt de opvolgstappen af en mailt of meldt per verzendwijze (src/trigger/offerte-opvolging.ts:20,120-239).
6. Klant tekent. Scherm: /portaal/:token, zonder inlog, magic link met vervaldatum (api/portaal-create.ts:103-116). In de feed: "Offerte bekijken" (PortaalFeedItemOfferte.tsx:273) opent /offerte-bekijken/:token met "Offerte accepteren" (OffertePubliekPagina.tsx:1066), naam, vinkje "Ik ga akkoord met deze offerte" (:1131), handtekeningveld (verplicht, api/offerte-accepteren.ts:203-210) en knop "Bevestigen" (:1145). Tekeningen keurt de klant per afbeelding goed: "Ja, goedkeuren" of "Ja, revisie" (PortaalFeedItemTekening.tsx:229). Automatisch: het project springt naar `akkoord-klant` (api/offerte-accepteren.ts:352-357), de maker krijgt een in-app melding plus mail, en met de schakelaar "Prospect wordt klant bij akkoord" wordt de prospect klant (functies.ts:52).
7. Vervolg. Dialoog "Vervolg." met "Naar project", "Direct factureren", "Afgewezen" (OfferteVervolgDialog.tsx:134-173). "Naar project" zet de offerte op `goedgekeurd` en maakt een project met budget gelijk aan het offertetotaal (offerteService.ts:340-359); spoed maakt de prioriteit `kritiek` (OfferteVervolgDialog.tsx:69-71).
8. Montage plannen. Scherm: Planning, met de zijlijst "Te plannen" (MontagePlanningLayout.tsx:2779). Handmatig: één sleep op de week- of maandkalender. Automatisch: bij het aanmaken van een montageafspraak springt het project naar `ingepland`, alleen vooruit (MontagePlanningLayout.tsx:1429-1440); is er precies één werkbon, dan wordt die vanzelf gekozen (:1277-1283). Eerlijk: van `akkoord-klant` naar `te-plannen` gaat niet vanzelf; "Te plannen" is een handmatige toggle in de cockpit (ProjectDetail.tsx:2220-2234).
9. Werkbon en uren op locatie. Scherm: monteursweergave op de telefoon (WerkbonMonteurView.tsx, statuslabels "Open", "In uitvoering", "Afgetekend", "Gefactureerd" op :47-52). Monteur maakt foto's (met offline wachtrij, WerkbonMonteurFeedback.tsx:296-345), vult uren en opmerkingen, klant tekent op het scherm, knop "Werkbon afronden" (:412). Automatisch bij afronden: uren worden op het project geboekt (toast "X uur geboekt op het project", werkbonUrenService.ts:69) en de montageafspraak gaat op afgerond ("Montage automatisch afgerond", :538-544). Inklokken kan los op de Tijd-kaart: "Inklokken" en "Uitklokken" (TijdCard.tsx:160-172); één sessie per persoon is een database-constraint (LOG.md, 19 augustus 2026).
10. Mail uit het project. Scherm: ProjectMailComposer in de cockpit. Knop "Uit project" voegt een bestand uit het project toe als bijlage (ProjectMailComposer.tsx:1489). Schakelaar "Opvolgen" ("Deze mail opvolgen als er geen reactie komt", composer/Composer.tsx:723) zet `wacht_op_reactie`; de map "Opvolgen" leegt zichzelf zodra de klant antwoordt (emailService.ts:880-940, ChangelogPage.tsx:93). Na "Verzenden" blijft de mail 8 seconden staan met "Ongedaan maken" (functies.ts:66, composer/verzenden.tsx:249-336).
11. Factureren. Vanuit de cockpit "Factureren" (ProjectDetail.tsx:2491) of "Direct factureren" uit het vervolg. Dialoog "Wat wil je factureren?" voor deelfactuur en aanbetaling (WatFacturerenDialog.tsx:151-223). Knop "Versturen" (FactuurEditor.tsx:3064). De klant ziet op de betaalpagina "Betaal nu · {bedrag}" (BetaalPagina.tsx:483). Eerlijk: versturen is altijd een klik, ook voor de maandelijkse conceptmelding ("Verstuurt niets zelf; dat blijft een bewuste klik in Facturen", api/cron-conceptfacturen-klaar.ts:4).
12. Betaald. Automatisch: de Mollie-webhook zet de factuur op `betaald` (api/mollie-webhook.ts:273-306); de Exact-betaalsync doet hetzelfde dagelijks om 05:45 UTC voor afgeletterde termijnen (api/cron-exact-betaalsync.ts). Herinneringen lopen via een ladder (herinnering na 7 en 14 dagen, aanmaning na 30; herinnering 3 staat standaard uit) maar alleen als de organisatie dat aanzet (src/trigger/factuur-herinnering.ts). Na de Exact-sync is de factuur vergrendeld: "Naar Exact op {datum}. Wijzigen kan via een creditfactuur." (FactuurEditor.tsx:3301). Nacalculatie toont daarna offerte tegen werkelijk met "Winstgevend", "Krap", "Verliesgevend" (NacalculatieLayout.tsx:194-215), maar alleen voor projecten met status `afgerond` (:95).

## 3. Per module

Alle modules uit src/lib/navigatie.ts, plus Dashboard, Instellingen, Support, Nieuwsbrief en Daan.

Dashboard. Tien blokken die de gebruiker zelf aan- of uitzet: Weerbericht, Portaalmeldingen, Cijfers, Briefing van Daan, Vannacht geleerd, Vandaag, Opvolgen, Deze week, Activiteit, Team (src/components/dashboard/dashboardBlokken.ts:9-33), met presets "Alles", "Montage", "Verkoop" (:44-63). Voor de signmaker: de briefing van vannacht en het blok Opvolgen. Bewijs: "Wie alleen montages draait heeft niets aan omzetcijfers" (dashboardBlokken.ts:3-6).

Projecten. De cockpit per klus (sectie 2, stap 3). Meest waard: de fasebalk als hartslag, de Acties-kaart met vier tegels, en de activiteitenfeed die offerte, montage, werkbon, factuur, taak, foto, portaal en tijd op één tijdlijn zet (ActiviteitFeed.tsx:11). Filter "Met aandacht" ("blijft te lang liggen", ProjectsList.tsx:1099). Achter schakelaars: kanban per fase met het bedrag per kolom en projectsjablonen (functies.ts:55-56). Belangrijkste knop: "Factureren".

Offertes. Calculatie per regel met inkoop, verkoop, marge; varianten per regel en optionele regels die de klant zelf aanvinkt (types/index.ts:540, QuoteCreation.tsx:553-554); condities "Standaard of Spoed" en staffelprijzen als schakelaar (functies.ts:45-46); collega-check met "Laten checken." en "Akkoord geven" (QuoteCreation.tsx:2278); "Opdrachtbevestiging" als PDF (QuoteHeader.tsx:523, pdfService.ts:1521); automatische opvolging via de 08:00-cron. Statussen: concept, verzonden, bekeken, goedgekeurd, afgewezen, verlopen, gefactureerd, wijziging_gevraagd (types/index.ts:360). Belangrijkste knop: "Verstuur".

Klanten. Klantkaart met contactpersonen, projecten, offertes en de kaart "Wat Daan weet" (memory Daan-geheugen). KvK-zoeken op naam en op nummer (api/kvk-zoeken.ts:64, api/kvk-basisprofiel.ts). Gepinde notitie als waarschuwing: "Toon als waarschuwing op offerte, project, werkbon, bestelbon en inkoopfactuur" (AddEditClient.tsx:809). Tags en prospect naar klant bij akkoord (functies.ts:50-52). Statussen: actief, inactief, prospect (ClientsLayout.tsx:64-75).

Leveranciers. Leveranciers met contactpersonen (migratie 152_contactpersonen_leveranciers), bestelbonnen met statussen "Concept", "Besteld", "Deels ontvangen", "Ontvangen", "Geannuleerd" (BestelbonDetail.tsx:434-438) en een PDF; inkoopoffertes worden pas op verzoek door AI uitgelezen, twijfelregels krijgen `twijfelachtig` (inkoopOfferteService.ts:8-11, 90-92). Eerlijk: bestelbonnen gaan niet automatisch naar de leverancier, alleen als PDF (BestelbonDetail.tsx:326-359).

Werkbonnen. Instructieblad voor de monteur als PDF (werkbonPdfService.ts:82) en de monteursweergave op de telefoon met foto's, uren, opmerkingen en klanthandtekening (sectie 2, stap 9). Uren kunnen over meerdere monteurs verdeeld worden (werkbonUrenService.ts:32-42). Belangrijkste knop: "Werkbon afronden".

Maatjes. Buitendienstfoto met daarop getekende maatlijnen, pijlen en tekst; "Kladblok met losse maatjes, nog niet gekoppeld." (MaatjeKladblok.tsx:329-330), later koppelen aan een project (MaatjeBeheer.tsx:207). Camera direct vanaf de telefoon, tekenen met touch en pinch-zoom, offline wachtrij in IndexedDB (maatjeOfflineQueue.ts:3-7). Eerlijk: de app meet niet zelf; de monteur schrijft de maat op de foto (migratie 121_maatjes.sql:7).

Studio. Gevelfoto plus omschrijving wordt een mockup: Claude schrijft de prompt, fal.ai (nano-banana-2/edit) maakt het beeld (api/generate-signing-mockup.ts:158-362). Credits per resolutie (1K en 2K één credit, 4K twee), te koop via Mollie (CreditsPakketDialog.tsx:68-106). Hele module hangt achter de flag `module_studio` (featureFlags.ts:91).

Nacalculatie. Per afgerond project offerte tegen werkelijk (uren maal tarief plus uitgaven), kolommen "Werkelijk", "Verschil", "Marge" (NacalculatieLayout.tsx:516-522). In de cockpit toont UrenPerBewerkingCard lopend begroot tegen geschreven uren per bewerking. Eerlijk: materiaal is een restpost, geen inkoopregistratie (:139).

Facturen. Versturen met PDF en betaallink, "Markeer als betaald" (FacturenLayout.tsx:2619), opvolgstappen "Herinnering 1/2/3", "Aanmaning" (FactuurOpvolgStepper.tsx:12-15), tab "Vanavond de deur uit" met wat klaarstaat (FacturenLayout.tsx:2565), deelfactuur en aanbetaling, creditnota met verplichte reden (FactuurEditor.tsx:4009-4021), UBL-export (ublService.ts), vergrendeling na Exact. Statussen: concept, open, verzonden, betaald, vervallen, gecrediteerd (types/index.ts:1147). Belangrijkste knop: "Versturen".

Inkoopfacturen. Een eigen inkoop-postvak wordt per IMAP gelezen (api/inkoopfactuur-sync.ts:4-5), Claude haalt de regels uit de PDF (api/inkoopfactuur-extract.ts:406), de app stelt een project voor (InkoopfacturenLayout.tsx:358-450) en onthoudt betaaltermijn en grootboek per leverancier (functies.ts:64). Boeken naar Exact, Moneybird, SnelStart of e-Boekhouden.

Inkoopoffertes. Zie Leveranciers: upload "Inkoopofferte uploaden" (InkoopOffertePaneel.tsx:376), regels op verzoek uitlezen.

Financieel. Omzet, openstaand en cashflow in één blik (KennisbankPage.tsx:191). Grootboek en btw-codes per boekhoudpakket (api/exact-grootboeken.ts, exact-btw-codes.ts).

Rapportages. "Totale omzet", "Indicatieve winst", "Conversieratio", "Omzet per maand", "Top klanten", "Openstaand per ouderdom" (0-30, 31-60, 61-90, 91+), "Project winstgevendheid", "Offerte conversie", "Medewerker productiviteit" (RapportagesLayout.tsx:812-1487). Bewijs dat de getallen eerst klopten voor ze in het menu kwamen: LOG.md, auditronde augustus 2026.

Forecast. Prognose op 6 of 12 maanden (ForecastLayout.tsx:38). Eerlijk: de titel in de app is nog Engels, "Sales Forecasting" (:188).

Planning. Alleen montage; "Taken is al het werk om de montage heen" (TasksLayout.tsx:1726). Week, maand en tijdlijn, drag en drop, zijlijst "Te plannen", prioriteit, afwezigheid en verlof met conflictsignaal (MontagePlanningLayout.tsx:1063-1076), dagnotities, "Herhalen" (:2286), "Opgeslagen weergaven" (:2902), bezetting per week vier weken vooruit (functies.ts:60). Mobiele variant MontagePlanningLayoutMobile.tsx. Belangrijkste handeling: de sleep.

Taken. Week, stapel, maand en teamweergave "Team" (TasksLayout.tsx:1651), bijlagen, koppeling aan offerte, en "taken uit bewerkingen": één taak per verkochte bewerking uit de offerte, idempotent (projectTakenService.ts:16-50). Eerlijk: toewijzen logt wel, maar er is geen aparte melding gevonden in TasksLayout zelf (wel migratie 179_melding_bij_taak_toewijzing; verifieer live voor je het claimt).

Email. Gesprekken in plaats van losse mails, toetsenbord (j, k, e, r, c), snooze met "Snooze tot" (SnoozeMenu.tsx:20-38), later verzenden ("Bewerken en opnieuw plannen", IngeplandeBerichtenLijst.tsx:180), concepten op elk apparaat, meerdere postvakken en een gedeeld postvak met "Toewijzen aan" en filters "Van mij" en "Niet toegewezen" (mapConfig.ts:37-40), regels, eigen labels, handtekening per postvak, Daan-blok met "Samenvatten" en antwoord genereren (reader/DaanBlok.tsx:118-141). Gmail en Microsoft via OAuth of app-wachtwoord, verzenden via SMTP (api/send-email.ts:2-3). Belangrijkste knoppen: "Verzenden" en "Opvolgen".

Aanvragen. Website-formulier en chatwidget komen binnen met statussen "Nieuw", "Bekeken", "Afgehandeld" (WebsiteAanvragenLayout.tsx:22-26); knop "Klant + project aanmaken" (VerwerkAanvraagDialog.tsx:145-148). Losse leadmodule met "Nieuw", "Benaderd", "Gereageerd", "Geen interesse", "Later opvolgen" (leadsService.ts:7-13).

Portaal. Overzicht van alle klantportalen (PortalenOverzicht.tsx) en in de cockpit het portaalblok met "Bekijk als klant" (PortaalCompactBlock.tsx:822). Feed-items: offerte, tekening, factuur, bericht, afbeelding, opdrachtbevestiging (types/index.ts:2286). Klant reageert ("Typ uw reactie...", PortaalReactieFormInline.tsx:155), uploadt foto's, betaalt online. Verlopen link: "Nieuwe link aanvragen" (PortaalVerlopen.tsx).

Instellingen. Team met rollen admin, medewerker, monteur (types/index.ts:2, authHelpers.ts:19), uitnodigen alleen door admin (api/invite-team-member.ts:168), briefpapier en huisstijl, e-mailsjablonen, functies-schakelaars per organisatie in zeven groepen (functies.ts:22-30), integraties Exact Online, Moneybird, SnelStart, e-Boekhouden, Mollie, Google Drive (IntegratiesTab.tsx:31-33, 77, 960), abonnement en AVG-export (DataExportKaart.tsx).

Support. Chat met een mens in hetzelfde paneel als Daan; de kop wisselt tussen "Daan." en "Support." (ForgieChatWidget.tsx:613-663).

Nieuwsbrief. Bouwer, lijsten, segmenten, A/B en herzenden, meten via Resend-webhook (migraties 224-228, api/nieuwsbrief-*.ts). Eerlijk: alleen zichtbaar voor één vast account (Sidebar.tsx:48, ADMIN_USER_ID), dus niet claimen als feature voor klanten.

Daan. Chat met de eigen bedrijfsdata ("Vraag het aan Daan...", ForgieChatPage.tsx:235), kan project, offerte of taak klaarzetten ("Aangemaakt door Daan", ForgieActieKaart.tsx:265-270), schrijft en herschrijft mail, vat threads samen, classificeert aanvragen, leert uit mail van bekende klanten (migratie 166, standaard aan), en draait elke nacht om 05:00 de nachtploeg die voorstellen in "Vannacht geleerd" zet en een dagelijkse briefing maakt (src/trigger/daan-nachtploeg.ts:146-148; geverifieerd live op 14 augustus 2026 in memory). Daan verstuurt nooit zelf mail (docs/DAAN_KNOWLEDGE.md:889-890). Kostenrem: 15 euro AI-budget per maand per organisatie, nachtploeg valt daarbuiten (api/ai-email.ts:309).

## 4. Tien dingen die doen. uniek maken voor een signmaker

1. Alles hangt aan het project. Mail, offerte, portaal, werkbon, uren, foto's en factuur op één tijdlijn (ActiviteitFeed.tsx:11). In beeld: cockpit die openvouwt, feed die volloopt.
2. Marge vóór verzenden. Inkoop, verkoop, marge per regel met kleurdrempels (CalculatieModal.tsx:658-673). In beeld: calculatie open, percentage kleurt groen.
3. Klant tekent zonder inlog. Magic link, naam, vinkje, handtekening, "Bevestigen"; project springt naar Akkoord klant (OffertePubliekPagina.tsx:1145, api/offerte-accepteren.ts:352-357). In beeld: telefoon van de klant, dan de fasebalk op kantoor.
4. Daan herkent de aanvraag in de mail. Direct na de sync, drie lagen, drempel 70 (api/classificeer-aanvraag.ts:8-50). In beeld: AanvraagKaart verschijnt naast de mail.
5. Planning is alleen montage. Eén sleep, project op Ingepland (MontagePlanningLayout.tsx:1429-1440, TasksLayout.tsx:1726). In beeld: kaart landt op donderdag, fase springt.
6. Werkbon afronden boekt de uren en sluit de montage. Eén knop, twee gevolgen (WerkbonMonteurFeedback.tsx:412-544). In beeld: telefoon op locatie, toast "uur geboekt op het project".
7. Opvolgen dat zichzelf opruimt. Schakelaar bij verzenden, map "Opvolgen" leegt bij antwoord (Composer.tsx:723, emailService.ts:880-940). In beeld: schakelaar aan, later verdwijnt de mail uit Opvolgen.
8. Betaald zonder omkijken. Mollie-webhook en Exact-betaalsync zetten de factuur op betaald; vergrendeld na sync (api/mollie-webhook.ts:273-306, FactuurEditor.tsx:1338). In beeld: melding "betaald." komt binnen.
9. Maatjes: meten op de foto vanaf de bouwplaats, offline (maatjeOfflineQueue.ts:3-7). In beeld: foto, maatlijn, cijfer erop.
10. Daan leert 's nachts. Sporen uit mail en werk worden om 05:00 voorstellen en een briefing (daan-nachtploeg.ts:146-148, dashboardBlokken.ts). In beeld: dashboard in de ochtend, blok "Vannacht geleerd".

## 5. Taal van de app

Schrijf ze zoals de app ze schrijft. Statuswoorden in de film lowercase met Flame-punt (CLAUDE.md sectie 6).

1. "Verstuur" (QuoteHeader.tsx:374)
2. "Via portaal" en "Via email" (QuoteHeader.tsx:380-425)
3. "Laten checken." (OfferteCheckDialog.tsx:64)
4. "Offerte accepteren", "Ik ga akkoord met deze offerte", "Bevestigen" (OffertePubliekPagina.tsx:1066-1145)
5. "Ja, goedkeuren" en "Ja, revisie" (PortaalFeedItemTekening.tsx:229)
6. "Je offerte wordt bekeken" (api/portaal-bekeken.ts:46)
7. "Akkoord klant", "In review", "Ingepland", "Te factureren" (ProjectFaseBar.tsx:6-13)
8. "Naar project", "Direct factureren", "Afgewezen" (OfferteVervolgDialog.tsx:144-173)
9. "Te plannen" (ActiesCard.tsx:107, MontagePlanningLayout.tsx:2779)
10. "Werkbon afronden" (WerkbonMonteurFeedback.tsx:412)
11. "Inklokken" en "Uitklokken" (TijdCard.tsx:160-172)
12. "Week indienen" (Weekstaat.tsx:255)
13. "Uit project" (ProjectMailComposer.tsx:1489)
14. "Opvolgen" (Composer.tsx:723, mapConfig.ts:14-23)
15. "Ongedaan maken" (undoToast.ts:14-18)
16. "Aan project koppelen" (EmailActionsPopover.tsx:446)
17. "Aanvragen", "Klanten", "Leveranciers", "Overig" (mapConfig.ts:57-63)
18. "Bekijk als klant" (PortaalCompactBlock.tsx:822)
19. "Versturen", "Markeer als betaald", "Vanavond de deur uit" (FactuurEditor.tsx:3064, FacturenLayout.tsx:2619, 2565)
20. "Betaal nu" (BetaalPagina.tsx:483), "Vannacht geleerd" en "Briefing van Daan" (dashboardBlokken.ts:9-33), "Met aandacht" (ProjectsList.tsx:1099)

Statuswoorden: concept, verzonden, bekeken, goedgekeurd (offerte); gepland, in review, akkoord klant, actief, ingepland, te factureren, gefactureerd (project); open, in uitvoering, afgetekend (werkbon); concept, open, verzonden, betaald (factuur). Niet gebruiken: "Betaal online" (bestaat niet), "Akkoord" als portaalknop (de knop heet "Bevestigen" of "Accepteren", PortaalFeedItemOfferte.tsx:369).

## 6. Wat je NIET moet claimen

- Regelgroepen met verborgen details op de offerte: gereserveerd, `binnenkort: true`, niet gebouwd (functies.ts:44).
- Support tijdelijk toegang geven: `binnenkort: true` (functies.ts:73).
- Studio kan per organisatie uitstaan (flag `module_studio`, featureFlags.ts:91); toon hem alleen als bijzaak.
- Split-inbox door Daan staat standaard uit en is regelwerk, geen AI (functies.ts:69, afzenderClassificatie.ts:43-49). Zeg "Daan herkent de aanvraag", niet "Daan sorteert je inbox".
- Betalingsherinneringen lopen alleen automatisch als de organisatie dat aanzet (factuur-herinnering.ts); herinnering 3 staat uit. Zeg niet "automatische herinneringen" zonder "als je wilt".
- Uren goedkeuren, herhaald inplannen, kanban, sjablonen, condities, staffels, collega-check verplicht, conceptfacturen samenvoegen, urenherinnering: allemaal standaard uit (functies.ts, `standaard: false`).
- Probo-integratie: alleen twee kolommen in migratie 021, geen code die ze leest. Niet claimen.
- Dubbele klanten samenvoegen: alleen migratie 157, geen knop in de klantmodule gevonden.
- Offline werken: sw.js doet alleen push (public/sw.js:1-6); docs/plan-pwa-offline.md is een ongebouwd plan. Alleen de foto-wachtrij van de werkbon en de maatjes werken offline.
- Mailsync-wachtrij (cron-mailsync-werker) en offline mutatiewachtrij: achter een flag die uit staat (LOG.md, auditronde).
- OAuth-knoppen voor Google en Microsoft mail staan op "Binnenkort" tot de apps geregistreerd zijn (memory mail-ombouw); tweede postvak schrijfkant nog niet af (migraties 245 en 246 liggen stil).
- Nieuwsbrief is een persoonlijke tool van één account (Sidebar.tsx:48), geen klantfeature.
- Deals, Booking, Voorraad, Documenten, Bestelbonnen, Leveringsbonnen en Tijdregistratie zijn routes zonder menu-item (App.tsx:311-358, alleen via zoeken); niet als module tonen.
- Project springt niet vanzelf op "te plannen" na akkoord en niet vanzelf op "te factureren" na montage (ProjectDetail.tsx:991-993); de film mag de fasebalk laten springen naar Akkoord klant (automatisch) en Ingepland (automatisch bij plannen), maar Te factureren is een klik.
- Daan verstuurt nooit zelf mail en maakt niets aan zonder bevestiging (docs/DAAN_KNOWLEDGE.md:889-895).
- "Forecast" heet in de app "Sales Forecasting" (ForecastLayout.tsx:188); liever niet in beeld.
- Team-toewijzing van een taak: melding niet bevestigd in code, alleen migratie 179.

## 7. Cijfers en feiten die geloofwaardig zijn

- 19 modules in het menu in vier secties (WERK 8, FINANCIEEL 6, PLANNING 2, COMMUNICATIE 3) plus Dashboard, Instellingen, Support (src/lib/navigatie.ts). Mobiel: drie eigen modules plus vaste vakjes "Daan" en "Meer" (navigatie.ts MOBIELE_NAV_MAX, MobileTabBar.tsx:146-167).
- 113 serverless functies in api/, 63 domeinservices, 278 migraties, 76 testbestanden, 13 Trigger.dev-achtergrondjobs (src/trigger/, zonder example.ts), 11 Vercel-crons (vercel.json).
- Integraties die echt in de code staan: Mollie (betalen en abonnement), Exact Online, Moneybird, SnelStart, e-Boekhouden, Resend (systeemmail), Gmail en Microsoft 365 via IMAP/SMTP en OAuth, Google Drive, KvK, Anthropic Claude (Daan), fal.ai (Studio), webpush, Sentry.
- Prijs: 129 euro per maand ex btw tot 10 gebruikers, 199 tot 20, 279 tot 35; AI-budget 15, 30, 50 euro per maand inbegrepen; alle modules in elke maat (migratie 172_staffel_op_organisaties.sql:11-14, docs/DAAN_KNOWLEDGE.md:1363-1379, api/create-subscription.ts:40). Eerste 30 dagen gratis (migraties 029 en 217, `NOW() + INTERVAL '30 days'`). Maandelijks opzegbaar (marketingsite sign-company/src/components/pages/PrijzenContent.tsx:129).
- Studio-credits: 0,99 euro per credit, goedkoper per pakket tot 0,595 (src/utils/visualizerDefaults.ts:110-128).
- Doelgroep volgens de app zelf: signmakers en reclamebedrijven van 3 tot 30 medewerkers (docs/DAAN_KNOWLEDGE.md:12).
- Tijdlijn: git-historie begint 5 december 2025 (toen nog Workmate), rebrand naar FORGEdesk 2 maart 2026, naar doen. en Daan op 20 maart 2026 (git log). De in-app changelog zegt "Doen. is live" op 1 februari 2025 (ChangelogPage.tsx:195); dat is niet uit git te staven, gebruik het niet als datum. Veilig: "gebouwd in 2026 door een signmaker", versie 1.6.2 van 6 september 2026 (ChangelogPage.tsx:55-56).
- Gemaakt door Sign Company (Antony Bootsma); contactadres antony@signcompany.nl (docs/DAAN_KNOWLEDGE.md:26). App draait op app.doen.team (vercel.json CORS-header).
- Hosting Vercel regio Dublin, Supabase, Europa (vercel.json "regions": ["dub1"]). AVG-export voor admins over 99 tabellen (LOG.md, auditronde).
- Mail: sync elke 3 minuten, ingeplande berichten en snooze elke minuut, nieuwsbriefverzending elk kwartier (vercel.json crons). Nachtploeg 05:00, offerte-opvolging 08:00, portaalherinnering en trial-reminder 09:00 Europe/Amsterdam (src/trigger/*.ts).
