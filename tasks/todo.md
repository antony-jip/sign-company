# Workmate App - Takenlijst

## Setup & Configuratie
- [x] Tasks directory aanmaken met todo.md en lessons.md
- [x] Ongebruikte dependencies verwijderd (accordion, alert-dialog, toggle, toggle-group)
- [x] Code review: alle 143 TSX bestanden, 62 imports, 6 contexts, 5 hooks geverifieerd
- [ ] Dependencies installeren (`cd workmate && npm install`)
- [ ] TypeScript compilatie verificatie (`npx tsc --noEmit`)
- [ ] Production build verificatie (`npm run build`)

## Code Review Bevindingen (2026-02-23)
- **Alle imports geldig** - geen missende bestanden
- **Geen circular dependencies** in contexts/hooks
- **Minor**: EmailSequence types bestaan maar CRUD service functies ontbreken
- **Minor**: OfferteTemplateRegel type inconsistentie met OfferteItem (mist volgorde/totaal)

## Eigenaar Acties (Antony)
- [ ] Supabase credentials configureren (.env)
- [ ] RLS policies activeren in Supabase
- [ ] OpenAI API key instellen (optioneel)
- [ ] Handmatig testen (zie workmate/ANTONY_TODO.md)
- [ ] Deployment naar Vercel

## Toekomstige Verbeteringen
- [ ] EmailSequence service functies toevoegen in supabaseService.ts
- [ ] Tests toevoegen (Vitest aanbevolen)
- [ ] CI/CD pipeline opzetten
- [ ] Performance optimalisatie
