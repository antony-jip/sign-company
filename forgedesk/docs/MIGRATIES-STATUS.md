# Migraties 190 en verder — wat is gedraaid en wat niet

> Opgeschreven in de auditronde van 12 aug 2026. Reden: er is geen bijgehouden
> migratie-administratie, dus zonder dit bestand is niet af te lezen wat er
> live staat. Migratie 198 lost dat structureel op.

## Gedraaid op productie

Deze drie zijn op 12 aug door Antony in de Supabase SQL Editor gedraaid, met de
verificatie-output teruggelezen. Ze zijn dus **klaar, niet opnieuw draaien**
(hoewel ze idempotent zijn).

| Migratie | Wat | Bevestigd door |
|---|---|---|
| `190_organisatie_delete_intrekken.sql` | DELETE-recht op `organisaties` ingetrokken | drie policies over, geen enkele met `cmd = DELETE` |
| `192_organisatie_id_backfill.sql` | `organisatie_id` gevuld via `profiles` | `emails_zonder_org` en `notificaties_zonder_org` beide 0 |
| `195_legacy_user_policies_droppen.sql` | 49 legacy user_id-policies gedropt over 23 tabellen | 0 overgeslagen, `legacy_policies_over` = 0 |

Effect daarvan: de abonnementsvergrendeling uit migratie 111 werkt sindsdien
echt. Die was ruim een jaar omzeilbaar omdat migratie 048 policynamen dropte die
nergens werden aangemaakt.

## Alleen lezen, veilig, mag altijd

| Migratie | Wat |
|---|---|
| `191_organisatie_id_diagnose.sql` | telt rijen zonder `organisatie_id`. Wijzigt niets. |
| `194_legacy_user_policies_dryrun.sql` | laat zien wat 195 zou droppen. Wijzigt niets. |

## Nog te draaien

**Volgorde maakt hier uit.** Draai ze in deze volgorde en plak de
verificatie-output terug.

| # | Migratie | Waar | Waarom |
|---|---|---|---|
| 1 | `196_organisatie_id_default.sql` | `audit/gate4-opruimen` | `organisatie_id` krijgt `DEFAULT auth_organisatie_id()` op 24 tabellen. Dicht het lek waardoor `getOrgId()` een rij met `NULL` kon wegschrijven, die daarna voor niemand zichtbaar is. Geen `NOT NULL`, dus geen enkel insert-pad breekt. |
| 2 | `197_inkoopfacturen_referentie_kenmerk.sql` | worktree-branch | twee kolommen voor het projectvoorstel op inkoopfacturen. **Tot dit gedraaid is** valt de extractie terug op een update zonder die velden; de ruwe waarden staan wel in `raw_extractie_json`. |
| 3 | `198_doen_migraties_administratie.sql` | worktree-branch | maakt de tabel die dit document overbodig maakt. |

## Waarom 193 mist

Er is geen 193. Dat nummer was gereserveerd voor een `NOT NULL` op
`organisatie_id`, en die is **bewust niet gebouwd**: 9 van de 12 bestanden die in
`notificaties` inserten zetten die kolom niet, waaronder `mollie-webhook`,
`portaal-reactie`, `offerte-accepteren` en `goedkeuring-reactie`. Een blanket
constraint had het klantportaal- en betalingsmeldingspad omgelegd. Migratie 196
lost hetzelfde probleem op met een default in plaats van een verplichting.

## Vanaf 199

Houd `doen_migraties` bij zodra 198 gedraaid is: één regel onderaan elke nieuwe
migratie. Dan is dit bestand geschiedenis en hoef je nooit meer te gokken.

Verder blijft gelden wat in `CLAUDE.md` staat: neem het eerstvolgende vrije
nummer op basis van de bestandsnamen, gebruik alleen het `NNN_`-schema, en
verifieer ná het draaien tegen de database in plaats van tegen de migratiemap.
Die map beschrijft de database niet: `072:62` maakt een policy op `grootboek`
terwijl `001:409` `grootboeken` aanmaakt, `047`/`078` noemen een tabel `events`
die niemand aanmaakt, en `organisaties` wordt door geen enkele migratie
aangemaakt.
