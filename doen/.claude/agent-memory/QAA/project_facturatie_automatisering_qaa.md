---
name: Facturatie-automatisering QAA-restpunten
description: Open ⚠️'s uit de QAA-eindreview (2026-08-15) van branch feature/facturatie-automatisering — deploy-volgorde Trigger.dev en disconnect-cleanup
type: project
---

QAA-eindreview 2026-08-15 (branch feature/facturatie-automatisering, 12 criteria ✅, 2 ⚠️): groen licht met twee restpunten.

**Why:** beide zijn deploy-/lifecycle-gaten, geen fouten in het geld-pad; ze bijten pas in een specifiek scenario.

**How to apply:** bij een volgende review op deze branch of bij livegang checken of dit gefixt/geborgd is:
1. `src/trigger/factuur-herinnering.ts` selecteert `exact_betaalsync_actief` (kolom uit migratie 211) onvoorwaardelijk — Trigger.dev-redeploy vóór migratie 211 laat de hele herinnerings-run stil uitvallen. Volgorde: eerst migraties 210-213, dan `npx trigger.dev@latest deploy`.
2. `api/exact-disconnect.ts` ruimt `exact_sync_state` niet op — een ontkoppelde org blijft door de staleness-guard permanent gepauzeerd (dagelijkse notificatie).

Bewuste, in REVIEW_NOTES.md gedocumenteerde keuzes (niet opnieuw aankaarten): mengfacturen-backfill, legacy-webhook-venster, settle vertrouwt Exact-status 50, disconnect-race-venster, sync/Deleted niet geïmplementeerd.
