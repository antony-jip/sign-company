# CLAUDE.md — Regels voor Claude Code

## App
- **Naam**: doen. (lowercase, altijd)
- **AI-assistent**: Daan (nooit Forgie, nooit FORGEdesk)
- **Locatie**: `forgedesk/` subfolder
- **Stack**: Vite + React 18 + TypeScript + Tailwind + Shadcn/UI + Supabase
- **Design systeem**: Lees `.claude/skills/doen-design/SKILL.md` bij elke visuele wijziging

## Coderegels

### Validatie
- `npm run build` na ELKE wijziging. Geen uitzonderingen.
- Fix ALLE TypeScript errors voordat je doorgaat.

### Comments
- Schrijf GEEN overbodige comments.
- Code moet zelfverklarend zijn door goede naamgeving.
- Alleen comments bij: complexe businesslogica, niet-voor-de-hand-liggende keuzes, waarom iets zo is (niet wat het doet).
- NOOIT comments die herhalen wat de code al zegt.
- Verwijder bestaande nutteloze comments als je ze tegenkomt.

### Refactoring
- Refactor NIET tenzij expliciet gevraagd.
- Als je een bug fixt, fix alleen die bug. Niet "even" imports opruimen, variabelen hernoemen, of code verplaatsen.
- Als je iets ziet dat beter kan, noem het in je rapport maar wijzig het niet.

### Geen scope creep
- Doe wat gevraagd is. Niet meer, niet minder.
- Als een taak 3 bestanden raakt, raak er geen 8 aan.
- Als je merkt dat een wijziging cascade-effecten heeft, stop en rapporteer.

### Analyse voor actie
- Bij grote taken: analyseer EERST, rapporteer wat je vindt, wacht op goedkeuring.
- Bij kleine fixes: direct uitvoeren.
- "Groot" = meer dan 3 bestanden of meer dan 100 regels wijziging.

### Packages
- Geen nieuwe npm packages installeren tenzij expliciet goedgekeurd.

### Data isolatie
- `organisatie_id` is de isolatiesleutel, NIET `user_id`.
- Alle team members binnen een organisatie delen data.

### Naamgeving
- Nederlandse variabelen en functies in de app (klant, offerte, factuur, werkbon).
- Types en interfaces: PascalCase met Nederlandse namen (Klant, Offerte, FactuurItem).
- Bestanden: PascalCase voor componenten, camelCase voor services/utils.

### Git
- Duidelijke commit messages in het Engels.
- Eén concern per commit. Niet alles in één grote commit.

## Bekende risico's
- `supabaseService.ts` is 5700+ regels — kan Claude Code sessies laten crashen. Gebruik grep, niet cat.
- `types/index.ts` is 1700+ regels — zelfde issue.
- Vercel serverless functions kunnen GEEN lokale modules importeren — alles inline.
