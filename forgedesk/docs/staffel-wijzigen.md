# Een organisatie op een andere staffel zetten

De staffel staat op `organisaties` (migratie 172). De app leest die kolommen,
maar Mollie int wat er in de subscription staat. Die twee lopen niet vanzelf
gelijk. **Zet je de database zonder Mollie bij te trekken, dan ziet de klant een
ander bedrag dan er wordt afgeschreven, en volgt de factuur uit de webhook het
bedrag van Mollie.**

Daarom staan hier de twee stappen bij elkaar. Doe ze achter elkaar, niet los.

## De treden

| gebruikers | `abonnement_bedrag_excl` | `ai_maandlimiet` |
|---|---|---|
| tot 10 | leeg (valt terug op 129) | leeg (valt terug op 15) |
| tot 20 | 199 | 30 |
| tot 35 | 279 | 50 |

`max_gebruikers` is het aantal gekochte plekken, niet gebruikte. Gedeactiveerde
teamleden en verlopen uitnodigingen bezetten geen plek.

## Stap 1 · de database

Alleen via de SQL-editor of een backend-route. De trigger uit 172 weigert deze
kolommen voor gewone gebruikers, ook voor een admin van de klant.

```sql
update organisaties
   set max_gebruikers         = 20,
       abonnement_bedrag_excl = 199,
       ai_maandlimiet         = 30
 where id = '<organisatie_id>';

select naam, max_gebruikers, abonnement_bedrag_excl, ai_maandlimiet
  from organisaties where id = '<organisatie_id>';
```

## Stap 2 · Mollie er direct achteraan

```
POST /api/update-subscription-bedrag
Authorization: Bearer <jouw access token>
{ "organisatie_id": "<organisatie_id>" }
```

Alleen de eigenaar mag deze route aanroepen, niet een admin van de klant: die
zou anders zelf kunnen bepalen wanneer een prijswijziging ingaat.

De route leest het bedrag uit de database en trekt de lopende subscription
daarheen. Hij doet niets als het bedrag al klopt, weigert op een geannuleerd
abonnement, weigert een bedrag van nul of lager, en schrijft een regel in
`audit_log`.

Antwoord bij succes:

```json
{ "gewijzigd": true, "vorig_bedrag_incl": "156.09",
  "bedrag_incl": "240.79", "bedrag_excl": 199 }
```

Staat er `"gewijzigd": false`, dan liep Mollie al gelijk. Krijg je een 409, dan
loopt er geen abonnement dat bijgewerkt kan worden en moet de klant eerst
activeren.

## Controleren dat het klopt

1. In de app onder Instellingen → Abonnement: bedrag en aantal plekken komen uit
   de database.
2. In het teamscherm: "x van y plekken in gebruik", en de uitnodigknop gaat op
   slot bij vol.
3. In Mollie: het bedrag van de subscription is gelijk aan het incl-bedrag uit
   het antwoord hierboven.
4. De AI-meter in Instellingen toont de nieuwe limiet.

## Terug naar de eerste trede

Zet de twee bedragkolommen op `NULL` in plaats van op 129 en 15. Dan valt de
code terug op zijn eigen constanten en is er één plek minder die uit de pas kan
lopen. `max_gebruikers` gaat wel expliciet terug naar 10. Roep daarna weer
stap 2 aan.
