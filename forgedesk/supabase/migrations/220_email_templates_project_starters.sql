-- Vier extra mail-templates voor het handmatig mailen vanuit een project.
-- Ze staan naast de zes uit STANDAARD_TEMPLATES (EmailTab.tsx) en zijn
-- gewone custom-templates (is_systeem = false), dus volledig te bewerken
-- en te verwijderen via Instellingen > E-mail > Templates.
--
-- De review-template staat alleen bij Sign Company (org 226bf02a): daar zit
-- een vaste Google-reviewlink in die voor andere organisaties naar het
-- verkeerde bedrijf wijst.
--
-- Placeholders volgen de bestaande conventie in het compose-scherm
-- ([naam], [projectnaam], [datum]): die vult de afzender zelf in, ze
-- worden bij verzenden niet automatisch vervangen.

BEGIN;

-- Generiek, voor elke organisatie.
INSERT INTO email_templates (organisatie_id, naam, is_systeem, onderwerp, body)
SELECT o.id, t.naam, false, t.onderwerp, t.body
FROM organisaties o
CROSS JOIN (VALUES
  (
    'Nieuwe offerte',
    $sub$Offerte [projectnaam]$sub$,
    $body$Hoi [naam],

Hierbij de offerte voor [projectnaam]. Alles wat we besproken hebben staat erin: de uitvoering, de materialen en de prijs.

Neem het op je gemak door. Zit er iets tussen dat anders moet, of wil je een variant zien? Laat het weten, dan pas ik het aan.

Groet!$body$
  ),
  (
    'Herinnering offerte',
    $sub$Herinnering: offerte [projectnaam]$sub$,
    $body$Hoi [naam],

Op [datum] stuurde ik je de offerte voor [projectnaam]. Heb je hem kunnen bekijken?

Zijn er nog vragen, of twijfel je over een onderdeel? Dan denk ik graag mee. Wil je liever een aangepaste versie, dan maak ik die zo voor je.

Laat je even weten hoe je erin staat?

Groet!$body$
  ),
  (
    'Opdrachtbevestiging',
    $sub$Opdrachtbevestiging [projectnaam]$sub$,
    $body$Hoi [naam],

Top, bedankt voor je akkoord op [projectnaam]. Hierbij de bevestiging van wat we hebben afgesproken:

- Wat we maken: [omschrijving]
- Bedrag: [bedrag]
- Productie klaar: [datum]
- Montage: [datum]

Klopt dit zo? Dan zetten we het in de planning. Zie je iets wat anders moet, laat het dan meteen weten.

Groet!$body$
  )
) AS t(naam, onderwerp, body)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates e
  WHERE e.organisatie_id = o.id
    AND e.naam = t.naam
    AND e.is_systeem = false
);

-- Alleen Sign Company: de reviewlink hieronder wijst naar hun eigen
-- Google-profiel (De Drie Kronen 115, Enkhuizen).
INSERT INTO email_templates (organisatie_id, naam, is_systeem, onderwerp, body)
SELECT o.id, t.naam, false, t.onderwerp, t.body
FROM organisaties o
CROSS JOIN (VALUES
  (
    'Vraag om review',
    $sub$Tevreden over [projectnaam]?$sub$,
    $body$Hoi [naam],

[projectnaam] staat er, en we hopen dat je er blij mee bent.

Zou je ons willen helpen met een korte review op Google? Nieuwe klanten kijken daar echt naar, en het kost je een minuut.

Review achterlaten: https://search.google.com/local/writereview?placeid=ChIJ11FPtZSjyEcR9TeZ9HIB5bc

Alvast bedankt!$body$
  )
) AS t(naam, onderwerp, body)
WHERE o.id = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'
  AND NOT EXISTS (
    SELECT 1 FROM email_templates e
    WHERE e.organisatie_id = o.id
      AND e.naam = t.naam
      AND e.is_systeem = false
  );

COMMIT;

INSERT INTO doen_migraties (bestand) VALUES ('220_email_templates_project_starters.sql') ON CONFLICT DO NOTHING;
