# DAAN-UX (bronwaarheid uit de app-code, 11 sep 2026)

Kleuren: flame #D24620, petrol #1A535C, petrol-dark #143F46. Panelen: .doen-panel, .doen-wash, .doen-subtitel, .badge-flame. Elke kop eindigt op een Flame-punt.

## Widget: FAB en chatpaneel (src/components/forgie/ForgieChatWidget.tsx)
Rechtsonder een 48x48 knop, radius 14, petrol, MessageSquare wit, label "Daan." bij de eerste sessie. Paneel 440 px breed, radius 12, border 0.5px #E6E4E0, shadow 0 8px 32px rgba(120,90,50,0.12). Header petrol-gradient (135deg petrol naar petrol-dark) met avatartegel 34x34 bg-white/10 en letter "D" (extrabold) plus flame-stip, titel "Daan." en "je digitale collega". Openingsbericht: "Hoi, ik ben Daan. Stel me een vraag over je klanten, projecten, offertes of facturen, of vraag me iets aan te maken." Daan-bubbel: wit, rounded-2xl rounded-bl-md, border, text-[13px], avatar w-6 h-6 rounded-full bg-petrol met "D". Gebruikersbubbel: bg-petrol text-white rounded-2xl rounded-br-md. Suggestiechips (pill 10px, border 0.5px): "Maak een offerte voor een klant", "Zet een nieuw project op", "Wat staat er open?", "Omzet deze maand". Laadstaat: drie bounce-bolletjes plus "Daan denkt na…". Geheugenregel onder een antwoord: "Genoteerd: <feit>." Invoer: bg-muted/50 rounded-lg, placeholder "Zeg het tegen Daan…", verzendknop 36x36 rounded-lg bg-flame met Send.

## Actieplan in de chat (src/components/forgie/DaanActiePlan.tsx)
Kaart rounded-xl border bg-card shadow-sm; kop bg-flame-light met Sparkles flame en "DAAN ZET DIT KLAAR" (11px bold uppercase tracking-wider text-flame-text). Stappen: Check groen bij klaar, Loader2 flame bij bezig, Circle 2px grijs bij wachten. Labels: "Klant gekoppeld · Florex", "Project aanmaken…", "Project", "Offerte", "Taak". Daarna "Wil je hier ook een offerte bij maken?" met "Ja, offerte erbij" en "Nee, klaar"; afsluitend link "Bekijk het project" in petrol.

## Aanvraagherkenning in de mail (src/components/email/AanvraagKaart.tsx)
Onder het bericht: doen-panel doen-wash, linkerstreep 3px flame-gradient, badge "Aanvraag", "87% zeker" in DM Mono, samenvatting, knop "Project aanmaken" (h-10 px-5 bg-flame), "Offerte starten" (outline petrol), status "Klant zoeken..." dan "Onder Florex" (Building2) of "Nieuwe klant". Na de actie: groene kaart #E8F5EC met "Project aangemaakt" en "Ga naar project".

## Samenvatten en concept (src/components/email/reader/DaanBlok.tsx)
Rechts op de actieregel: Sparkles #9B8EC4, "Samenvatten" · "Concept door Daan". Resultaatpaneel met mono-kop "SAMENVATTING DOOR DAAN".

## Projectbriefing (src/components/projects/cockpit/BriefingCard.tsx)
Knop "Daan AI" (Sparkles) wordt "Daan schrijft…" en herschrijft de notitie ter plekke in de textarea; geen dialoog.

## Dashboard (src/components/dashboard/DaanBriefingBlok.tsx, VannachtGeleerdBlok.tsx)
"Verdient vandaag aandacht." met doen-subtitel intro en mono "4 punten · uit 17 signalen", per punt icoon petrol, vette titel 14px, toelichting 13px, ArrowRight. Daaronder "Vannacht geleerd." met sub "Daan stelt voor dit te onthouden." en mono "3 voorstellen"; per voorstel tekst 14px, mono 11px "Florex · uit 4 sporen" of "bedrijfsbreed", knoppen "Aannemen" (text-xs font-semibold text-white bg-flame px-3 py-1.5 rounded-md) en "Afwijzen". Toast: "Daan onthoudt dit voortaan." met flame-punt.

## Klantkaart (src/components/clients/ClientProfile.tsx)
"Wat Daan weet" met regels en "3× bevestigd"; voettekst "Vastgelegd door Daan uit gesprekken. Wat je houdt, gebruikt hij voortaan overal."

## Overig
Leads: "Schrijf opzetje" / "Daan schrijft…" (LeadsPaneel). Composer: chip "Schrijf met Daan". Offertes: dialoog "Uitschrijven vanuit document" ("Document lezen...", "Regels schrijven..."). Projectsamenvatting: "Laat Daan deze 12 berichten samenvatten". Pagina /forgie: "Je bedrijfsgeheugen". Instellingen-tab "Daan AI".
