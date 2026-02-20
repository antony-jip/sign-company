# Antony's Persoonlijke Actielijst - Workmate

## Status: Alle code-fixes zijn klaar. Nu moet JIJ actie ondernemen.

---

## STAP 1: SUPABASE CONFIGUREREN (Prioriteit: KRITIEK)

**Zonder dit werkt NIETS - alle data gaat nu naar localStorage**

### Heb je al een Supabase project?
- **Ja** -> Ga naar je Supabase Dashboard en pak je credentials
- **Nee** -> Ga naar https://supabase.com en maak een GRATIS project aan

### Wat je nodig hebt:
1. **Project URL** -> Supabase Dashboard -> Settings -> API -> Project URL
2. **Anon Key** -> Supabase Dashboard -> Settings -> API -> anon/public key

### Wat je moet doen:
1. Open `.env` in de `workmate/` map
2. Vul in:
   ```
   VITE_SUPABASE_URL=https://jouw-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=jouw-echte-anon-key-hier
   ```
3. Herstart de dev server: `npm run dev`

### Database tabellen aanmaken:
- Check of er een `supabase/migrations/` map bestaat met SQL bestanden
- Ga naar Supabase Dashboard -> SQL Editor
- Plak en run de SQL uit die migration bestanden

---

## STAP 2: RLS POLICIES ACTIVEREN (Prioriteit: KRITIEK)

**Zonder dit kan elke gebruiker alle data zien van alle andere gebruikers**

De service-laag filtert bewust NIET op user_id in de frontend. Dit is because:
1. In localStorage-modus is er maar 1 gebruiker
2. In Supabase-modus moet RLS (Row Level Security) dit afdwingen op database-niveau

### Wat je moet doen:
1. Ga naar Supabase Dashboard -> SQL Editor
2. Voer dit SQL script uit voor ELKE tabel:

```sql
-- Activeer RLS op alle tabellen
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE projecten ENABLE ROW LEVEL SECURITY;
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE offertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenten ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE factuur_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tijdregistraties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medewerkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE montage_afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE nieuwsbrieven ENABLE ROW LEVEL SECURITY;
ALTER TABLE tekening_goedkeuringen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Maak policies aan (herhaal voor elke tabel)
-- Voorbeeld voor klanten:
CREATE POLICY "Users can view own klanten" ON klanten
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own klanten" ON klanten
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own klanten" ON klanten
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own klanten" ON klanten
  FOR DELETE USING (auth.uid() = user_id);

-- Herhaal bovenstaande 4 policies voor:
-- projecten, taken, offertes, offerte_items, documenten, emails,
-- events, facturen, factuur_items, tijdregistraties, medewerkers,
-- notificaties, montage_afspraken, nieuwsbrieven, tekening_goedkeuringen,
-- ai_chats, app_settings, profiles

-- Publieke tabellen (geen user_id nodig):
ALTER TABLE grootboek ENABLE ROW LEVEL SECURITY;
ALTER TABLE btw_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kortingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_producten ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculatie_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerte_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON grootboek FOR SELECT USING (true);
CREATE POLICY "Public read access" ON btw_codes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON kortingen FOR SELECT USING (true);
CREATE POLICY "Public read access" ON calculatie_producten FOR SELECT USING (true);
CREATE POLICY "Public read access" ON calculatie_templates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON offerte_templates FOR SELECT USING (true);
```

3. Controleer in Supabase Dashboard -> Authentication -> Policies dat ze actief zijn

---

## STAP 3: OPENAI API KEY (Optioneel)

**Alleen nodig voor AI features**

1. Ga naar https://platform.openai.com/api-keys
2. Maak een API key aan
3. Voeg toe aan `.env`: `OPENAI_API_KEY=sk-jouw-key-hier`
4. LET OP: GEEN `VITE_` prefix! Alleen server-side

---

## STAP 4: BUILD VERIFICATIE

**Moet je lokaal doen:**

```bash
cd workmate
npm install
npx tsc --noEmit    # TypeScript check - moet 0 fouten geven
npm run build       # Production build - moet slagen
```

Als er fouten zijn: kopieer de output en vraag Claude Code om ze te fixen.

---

## STAP 5: HANDMATIG TESTEN

### Test 1: Account & Login
- [ ] Maak een nieuw account aan
- [ ] Log in met dat account
- [ ] Log uit en weer in
- [ ] Zie je alleen jouw eigen data?

### Test 2: Klant aanmaken & bewerken
- [ ] Maak een nieuwe klant aan met contactpersonen
- [ ] Sla op
- [ ] Open de klant opnieuw -> klik "Bewerken"
- [ ] CHECK: zijn de contactpersonen er nog?
- [ ] Wijzig iets en sla op
- [ ] Contactpersonen nog steeds intact?

### Test 3: Offerte met BTW
- [ ] Maak een offerte met items op 21% BTW
- [ ] Voeg een item toe op 9% BTW
- [ ] Check: wordt BTW per tarief apart getoond?
- [ ] Genereer PDF -> kloppen de bedragen?
- [ ] Check: geen afrondingsfouten in totalen?

### Test 4: Project flow
- [ ] Maak een project aan gekoppeld aan een klant
- [ ] Voeg taken toe
- [ ] Genereer een factuur -> check het factuurnummer (FAC-2026-XXXXXX format)
- [ ] Check: verschijnt de deadline in de kalender?

### Test 5: Verwijderen
- [ ] Probeer een klant te verwijderen -> komt er een bevestiging?
- [ ] Probeer een project te verwijderen -> bevestiging?
- [ ] Probeer een offerte te verwijderen -> bevestiging?
- [ ] Annuleer de bevestiging -> is de data er nog?

### Test 6: Edge cases
- [ ] Open de app in een nieuw incognito venster -> zie je login scherm?
- [ ] Bekijk een module zonder data -> zie je een nette "geen data" melding?

---

## STAP 6: DEPLOYMENT

### Optie A: Vercel (Aanbevolen)
1. Ga naar https://vercel.com
2. Connect je GitHub repo
3. Selecteer branch: `claude/build-workmate-app-YDJd3`
4. Stel Environment Variables in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (optioneel)
5. Deploy

### Na deployment:
- [ ] Test de live URL met dezelfde tests
- [ ] Check of Supabase data correct laadt
- [ ] Check browser console op CORS errors

---

## OVERZICHT

| Taak | Status | Prioriteit |
|------|--------|------------|
| Alle code-fixes | GEDAAN | - |
| Supabase credentials | TE DOEN | KRITIEK |
| RLS policies activeren | TE DOEN | KRITIEK |
| OpenAI API key | TE DOEN | Optioneel |
| Build verificatie (npm) | TE DOEN | Hoog |
| Handmatig testen | TE DOEN | Hoog |
| Deployment | TE DOEN | Na testen |

## Geschatte tijd: 2-3 uur totaal
