# Workmate App - Geleerde Lessen

## Patronen & Regels

### Project Structuur
- Root project = Next.js website (signcompany.nl landing pages)
- `/workmate/` = Vite + React CRM app (apart project met eigen package.json)
- Twee gescheiden package.json's - niet vermengen
- `/src/app/werkplaats/` = Next.js routes die naar workmate-features verwijzen
- `/tasks/` = takenlijst (todo.md) en lessen (lessons.md) voor AI assistants

### Technische Afspraken
- Lucide React v0.312.x: gebruik `Briefcase` i.p.v. `Handshake` (niet beschikbaar)
- Supabase is optioneel - localStorage fallback werkt altijd
- VITE_ prefix voor frontend env vars, geen prefix voor server-side (OPENAI_API_KEY)
- `@/` alias verwijst naar `./src/` (geconfigureerd in vite.config.ts en tsconfig.json)

### Code Kwaliteit
- TypeScript strict mode - alle types moeten kloppen
- shadcn/ui componenten in `workmate/src/components/ui/`
- Nederlandse naamgeving voor business logica (klant, offerte, factuur)
- Engelse naamgeving voor technische code (hooks, utils, services)
- Alle types gedefinieerd in `workmate/src/types/index.ts`
- Service functies in `workmate/src/services/supabaseService.ts` (2192+ regels)

### Dependency Management
- Verwijder ongebruikte @radix-ui packages (accordion, alert-dialog, toggle, toggle-group al verwijderd)
- Check altijd met `grep` of een package daadwerkelijk geïmporteerd wordt voor verwijdering

### Fouten om te Vermijden
- Geen `round2` functie importeren uit supabaseService - gebruik budgetUtils
- CSS opacity: gebruik 0-1 range, niet procenten
- Datums: altijd via date-fns formatteren, niet handmatig
- EmailSequence types bestaan maar service functies ontbreken nog - niet gebruiken tot geïmplementeerd
