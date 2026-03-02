# Changelog

## [2026-02-26] Deploy Ready Audit

### Fixed
- **Data integriteit:** Ontbrekende `round2()` op 2 financiële berekeningen in QuoteCreation.tsx (handleUpdateItem, handleUpdateItemWithCalculatie)
- **TypeScript:** 9 `as any` casts verwijderd:
  - pdfService.ts: `JsPDFWithAutoTable` interface voor jspdf-autotable extensie
  - aiService.ts & gmailService.ts: Typed error responses als `{ error?: string }`
  - AuthContext.tsx: Expliciete field mapping ipv unsafe `as User` cast
- **Security:** PostgREST filter injection voorkomen in gmailService.ts `.or()` query — speciale characters worden nu geëscaped
- **Memory leaks:** Cancelled-flag pattern toegevoegd aan 3 componenten:
  - NotificatieCenter.tsx (polling interval + async handlers)
  - ClientsLayout.tsx (data fetching)
  - CalendarLayout.tsx (data loading)

### Added
- `supabase/rls_policies.sql` — Complete Row Level Security voor alle 49 tabellen + storage buckets
- `AUDIT_REPORT.md` — Volledige audit rapportage met bevindingen en fixes

## [2026-02-26] Ronde 2: Twee-koloms layout

### Changed
- Offerte pagina omgebouwd van 3-stappen wizard naar permanent twee-koloms layout
- Rechter sidebar (380px, sticky) met klantgegevens + offerte samenvatting
- Header bar met status badges, acties dropdown, PDF/Opslaan/Verstuur knoppen
- Marge drempels geünificeerd: >=65% groen, 50-64% oranje, <50% rood
- Per-item marge breakdown in sidebar
- Mobile responsive: sidebar wordt inklapbaar onder 1024px
- Bestandsgrootte gereduceerd van 2706 naar 2078 regels

### Added
- `IngeplandEmail` en `EmailBijlage` interfaces in types/index.ts
- Inline email compose sectie in offerte pagina
