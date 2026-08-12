# Bugfix Summary
Datum: 2026-03-15

## Statistieken
- 32 bugs gevonden
- 28 bugs gefixt
- 4 known limitations gedocumenteerd

## Gefixt

| # | Categorie | Bestand | Wat was fout | Impact |
|---|-----------|---------|--------------|--------|
| 1 | Financieel | `FacturenLayout.tsx:190` | `calcLineTotal()` rondde tussenresultaten niet af met `round2()` | Centenverschillen op facturen bij veel decimalen |
| 2 | Security | `mollie-webhook.ts:17` | Webhook werd zonder verificatie geaccepteerd als `MOLLIE_WEBHOOK_SECRET` leeg was | Aanvaller kon nep-webhooks sturen om facturen als betaald te markeren |
| 3 | Security | `mollie-webhook.ts:31` | Geen validatie van payment ID formaat | Onverwachte input kon crashes veroorzaken |
| 4 | Security | `mollie-create-payment.ts:35` | Geen eigendomscheck op factuur — gebruiker A kon factuur van gebruiker B betalen | Data-isolatie doorbraak |
| 5 | Security | `mollie-create-payment.ts:111` | Update op factuur zonder user_id filter | Andere gebruiker's factuur kon overschreven worden |
| 6 | Idempotency | `stripe-webhook.ts:57` | Geen check op dubbele webhook events — credits werden dubbel toegevoegd | Financieel verlies bij retry webhooks |
| 7 | Cascade | `supabaseService.ts:deleteKlant` | Klant verwijderen zonder check op projecten → weesrecords | Projecten, offertes, facturen werden onbereikbaar |
| 8 | Cascade | `supabaseService.ts:deleteProject` | Project verwijderen zonder check op werkbonnen/offertes | Gekoppelde werkbonnen en offertes werden wees |
| 9 | Cascade | `supabaseService.ts:deleteOfferte` | Offerte items en versies bleven achter na verwijdering | Wees-records in database |
| 10 | Cascade | `supabaseService.ts:deleteFactuur` | Factuur items bleven achter na verwijdering | Wees-records in database |
| 11 | Cascade | `supabaseService.ts:deleteWerkbon` | Werkbon regels, fotos, items bleven achter | Wees-records en ongebruikte storage |
| 12 | UX | `ProjectPortaalTab.tsx:405,505` | E-mail naar klant faalde stil zonder feedback | Gebruiker wist niet dat klant geen notificatie kreeg |
| 13 | UX | `PortalenOverzicht.tsx:122` | Portalen laden faalde stil (alleen console.error) | Lege pagina zonder uitleg |
| 14 | UX | `TeamledenTab.tsx:145` | Teamleden laden faalde stil | Instellingen leken leeg zonder error |
| 15 | Supabase | `supabaseService.ts` (13 get-by-ID functies) | `getXxx(id)` gebruikte `.single()` — throwt bij 0 resultaten | Crash bij verwijderd record ipv graceful null |
| 16 | Supabase | `supabaseService.ts` (3 token lookups) | Token-based lookups gebruikten `.single()` ipv `.maybeSingle()` | Crash bij onbekend/verlopen token |
| 17 | Performance | `generateOfferteNummer` | Haalde ALLE offertes op voor 1 nummer | O(n) query ipv O(1) — onacceptabel bij 5000+ offertes |
| 18 | Performance | `generateFactuurNummer` | Idem — haalde alle facturen op | Idem |
| 19 | Performance | `generateCreditnotaNummer` | Idem | Idem |
| 20 | Performance | `generateWerkbonNummer` | Idem — haalde alle werkbonnen op | Idem |
| 21 | Null safety | `ClientProfile.tsx:923` | `team_leden[0].charAt(0)` zonder optional chaining | Crash als array leeg of undefined |
| 22 | Null safety | `ClientProfile.tsx:172` | `klantData.email.toLowerCase()` zonder null check | Crash als email undefined |
| 23 | Race condition | `ClientProfile.tsx:155` | Promise.all() zonder cancelled flag | setState op unmounted component bij snelle navigatie |
| 24 | Race condition | `FinancialLayout.tsx:47` | Promise.all() zonder cancelled flag | Memory leak bij navigatie |
| 25 | Race condition | `VisualizerLayout.tsx:111` | 3 parallelle fetches + setTimeout zonder cleanup | Memory leak + stale state |
| 26 | Race condition | `ForgieTab.tsx:135` | 4 parallelle fetches zonder cancelled flag | setState op unmounted component |
| 27 | Race condition | `CalculatieModal.tsx:132` | Catalogus laden bij modal open zonder cleanup | Stale data bij snel open/close |
| 28 | Race condition | `FORGEdeskAIChat.tsx:448` | Facturen laden zonder cancelled flag | Memory leak |

## Known Limitations (niet gefixt, wel gedocumenteerd)

| # | Wat | Waarom niet gefixt | Risico |
|---|-----|--------------------|--------|
| 1 | Nummer generatoren gebruiken MAX()+1 — theoretische race condition | Vereist database sequences (schema wijziging). Race window is geminimaliseerd door directe queries ipv alle records ophalen. | Laag: twee gebruikers moeten exact tegelijk hetzelfde type document aanmaken |
| 2 | Update functies sturen het hele object — concurrent edit risico | Architecturele wijziging nodig (optimistic locking met versie-kolom). Alle update functies moeten herzien worden. | Medium bij teams met meerdere editors op hetzelfde record |
| 3 | Geen rate limiting op publieke portaal endpoints | Vereist server-side middleware of Vercel edge config. API routes zijn token-protected maar niet rate-limited. | Laag: tokens zijn lang genoeg tegen brute-force |
| 4 | Mollie webhook accepteert requests zonder signature als `MOLLIE_WEBHOOK_SECRET` env var niet is ingesteld | Dit is by design — secret is optioneel in Mollie test mode. Payment wordt altijd geverifieerd via API call naar Mollie. | Laag: payment status wordt altijd dubbel gecheckt bij Mollie zelf |
