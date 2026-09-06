# Logboek mail-ombouw

Eén regel per bouwstap, besluit of idee. Nieuwste onderaan per kop. Agents
schrijven onder hun eigen kop; de hoofdsessie onder "Regie".

## Regie

- 6 sep 2026: doorlichting door vier agents, plan in artifact "Mail op Outlook-niveau". Opdracht: alle vier fases uitvoeren, proactieve ideeën toegestaan, alles vastleggen.
- Besluit: geen nieuwe packages. Editor blijft contentEditable maar met één document-state; TipTap blijft een optie voor later.
- Besluit: bodies naar een eigen tabel `email_bodies` in plaats van Storage. Reden: SQL-toegang blijft, RLS identiek aan `emails`, realtime-UPDATE-payloads op `emails` worden licht, en team-lezen via projectkoppeling werkt met dezelfde policy.
- Besluit: concepten als rijen in `emails` (map `concepten`, kolom `concept`), zodat ze op elk apparaat staan en de Concepten-map één bron heeft.
- Besluit: `email_koppelingen` als algemene koppeltabel naast `email_project_koppelingen` (die blijft de bron van de team-leesrechten uit migratie 109).
- Besluit: store zelf gebouwd met `useSyncExternalStore`, geen TanStack Query.
- Besluit: IDLE-pilot op Trigger.dev; OAuth-code met env-placeholders, de app-registraties bij Google en Microsoft doet Antony.
- Migratie 244 geschreven door de regie; agents schrijven geen migraties.
