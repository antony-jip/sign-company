# doen. — Development Log

## April 2026 — Taken-module refactor (afgerond)

**Commits:** c4d97cac, 4b6703ac, 0abecff5, ed0d0f65, 34387d06, d0aac7ff, f2ef242d

### Nieuwe patterns om te hergebruiken
- `src/utils/authHelpers.ts` → `isAdminUser(medewerker, user)`
- `src/components/shared/MedewerkerFilterCombobox` — searchable popover met avatars
- Sticky top action-bar met `#1A535C` teal (consistent met Clients/Quotes)
- Delete-buffer met flush-on-unmount (5s undo-window via sonner toast)
- localStorage-override + migration-marker pattern
  - Keys: `doen_taken_filter_override`, `doen_taken_filter_migration_v2`
- Swimlane-view met collapse-state in localStorage
- Filter-consolidatie: één `filteredTaken`-memo ipv per-view duplicatie

### Productkeuze
**doen. is radicaal transparant binnen een organisatie.** Iedereen ziet 
en plant iedereen's taken. Default filter = "Iedereen" voor alle rollen. 
Bij toekomstige externe freelancers of gevoelige projecten: RBAC-laag 
toevoegen.

### Technische schuld
- `toegewezen_aan` op `Taak` is string (naam), geen FK naar medewerkers
  - Risico bij hernoemen en dubbele namen
  - Niet urgent, wel onthouden
