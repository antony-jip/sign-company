# EIGENAAR ACTIES — Workmate Productie Checklist

## Vereiste Configuratie

### 1. Supabase Instellen (VEREIST)
- [ ] Maak een Supabase project aan op https://supabase.com
- [ ] Kopieer de `SUPABASE_URL` en `SUPABASE_ANON_KEY`
- [ ] Maak een `.env` bestand aan in `/workmate/`:
  ```
  VITE_SUPABASE_URL=https://jouw-project.supabase.co
  VITE_SUPABASE_ANON_KEY=jouw-anon-key
  ```
- [ ] Voer de database migraties uit (SQL in Supabase SQL editor)

> **Let op:** Zonder Supabase werkt de app in localStorage-modus. Alle data blijft lokaal in de browser.

### 2. Email Configuratie (OPTIONEEL)
- [ ] SMTP instellingen configureren via Instellingen → Integraties
- [ ] Of: Gmail API koppelen voor directe inbox integratie
- [ ] Test email verzenden vanuit de app

### 3. KvK API (OPTIONEEL)
- [ ] API key aanvragen bij de Kamer van Koophandel
- [ ] Configureer via Instellingen → Integraties → KvK
- [ ] Zonder API key werkt de KvK zoekfunctie met demo-data

### 4. AI Assistent (OPTIONEEL)
- [ ] OpenAI API key configureren via Instellingen → Integraties
- [ ] Zonder key is de AI Assistent niet beschikbaar

### 5. Online Betaling (OPTIONEEL)
- [ ] Betaalprovider (Mollie/Stripe) configureren
- [ ] Webhook URL instellen voor betalingsbevestigingen

---

## Aanbevolen Eerste Stappen

### Stap 1: Bedrijfsgegevens
- [ ] Ga naar Instellingen → Bedrijfsgegevens
- [ ] Vul in: bedrijfsnaam, adres, KvK nummer, BTW nummer, IBAN
- [ ] Upload je bedrijfslogo

### Stap 2: Offerte Instellingen
- [ ] Stel offerte prefix in (bijv. "OFF" of je eigen code)
- [ ] Stel standaard geldigheid in (bijv. 30 dagen)
- [ ] Pas standaard voorwaarden aan
- [ ] Configureer standaard BTW percentage

### Stap 3: Calculatie Instellingen
- [ ] Pas standaard marge percentage aan
- [ ] Voeg materiaal categorieën toe
- [ ] Stel standaard eenheden in

### Stap 4: Team
- [ ] Voeg teamleden toe via Team pagina
- [ ] Stel uurtarieven in per medewerker

### Stap 5: Eerste Klant + Offerte
- [ ] Maak je eerste klant aan
- [ ] Maak een testofferte
- [ ] Controleer PDF output
- [ ] Test email verzending (indien geconfigureerd)

---

## Bekende Beperkingen (Huidige Versie)

### Functioneel
1. **Voorschot verrekening** — Voorschotfacturen worden aangemaakt maar de eindafrekening vereist handmatige controle
2. **Tijd → Factuur** — Tijdregistratie wordt niet automatisch als factuurregels overgenomen; handmatig invoeren
3. **Concurrent nummer generatie** — Bij gelijktijdig aanmaken door meerdere gebruikers kan een dubbel nummer ontstaan (database constraint aanbevolen)

### Technisch
1. **localStorage modus** — Zonder Supabase is data beperkt tot één browser/apparaat
2. **Grote componenten** — SettingsLayout.tsx (3700+ regels) en FacturenLayout.tsx (2400+ regels) zijn kandidaten voor opsplitsing
3. **Offline modus** — Geen offline-first ondersteuning; vereist internetverbinding voor Supabase

---

## Database Setup (Supabase)

### Vereiste Tabellen
De app verwacht de volgende tabellen in Supabase. Maak deze aan via de SQL editor:

```
klanten, projecten, taken, offertes, offerte_items, facturen, factuur_items,
documenten, emails, kalender_events, tijdregistraties, medewerkers,
werkbonnen, werkbon_regels, uitgaven, leveranciers, bestelbonnen,
bestelbon_regels, leveringsbonnen, leveringsbon_regels, voorraad_artikelen,
voorraad_mutaties, deals, deal_activiteiten, lead_formulieren,
lead_inzendingen, notificaties, booking_afspraken, nieuwsbrieven,
email_sequenties
```

### Row Level Security (RLS)
- [ ] Schakel RLS in op alle tabellen
- [ ] Voeg policies toe die filteren op `user_id = auth.uid()`
- [ ] Test dat gebruikers alleen hun eigen data zien

### Unieke Constraints (AANBEVOLEN)
```sql
ALTER TABLE offertes ADD CONSTRAINT unique_offerte_nummer UNIQUE (user_id, nummer);
ALTER TABLE facturen ADD CONSTRAINT unique_factuur_nummer UNIQUE (user_id, nummer);
ALTER TABLE werkbonnen ADD CONSTRAINT unique_werkbon_nummer UNIQUE (user_id, nummer);
ALTER TABLE bestelbonnen ADD CONSTRAINT unique_bestelbon_nummer UNIQUE (user_id, nummer);
ALTER TABLE leveringsbonnen ADD CONSTRAINT unique_leveringsbon_nummer UNIQUE (user_id, nummer);
```

---

## Productie Deployment

### Vite Build
```bash
cd workmate
npm install
npm run build
```

Output staat in `workmate/dist/` — dit is een statische SPA.

### Hosting Opties
- **Vercel**: Automatische Vite detectie, gratis tier beschikbaar
- **Netlify**: Vergelijkbaar met Vercel
- **Cloudflare Pages**: Snelle CDN, gratis tier
- **Eigen server**: Serveer `dist/` via nginx/apache

### Environment Variables (Productie)
```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-productie-anon-key
```

---

## Support & Onderhoud

### Logs
- Browser console (F12) voor client-side errors
- Supabase dashboard voor database errors
- Logger utility filtert op development/production modus

### Updates
- `npm audit` voor security patches
- `npm update` voor dependency updates
- Test na elke update met `npm run build`
