-- email_templates (migration 049) krijgt twee extra kolommen zodat
-- trigger-tasks templates per organisatie kunnen ophalen op basis van
-- trigger_task_naam, en zodat systeem-templates te onderscheiden zijn
-- van door de gebruiker zelf aangemaakte custom-templates.
-- Bestaande org-scoped RLS-policies uit 049 dekken deze kolommen.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS trigger_task_naam text;

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS is_systeem boolean NOT NULL DEFAULT false;

-- Niet-unieke lookup-index voor de getTemplate(orgId, triggerTaskNaam) pad.
CREATE INDEX IF NOT EXISTS idx_email_templates_org_task
  ON email_templates (organisatie_id, trigger_task_naam);

-- Partial UNIQUE garandeert maximaal één systeem-template per
-- trigger_task_naam per organisatie. Custom templates (is_systeem=false)
-- mogen vrij dezelfde of geen trigger_task_naam hebben.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_templates_systeem_per_org
  ON email_templates (organisatie_id, trigger_task_naam)
  WHERE is_systeem = true;

-- Seed 12 systeem-templates per bestaande organisatie. Idempotent door
-- partial UNIQUE: tweede run raakt geen rij omdat ON CONFLICT DO NOTHING
-- valt op de bestaande systeem-rij.
INSERT INTO email_templates (organisatie_id, naam, trigger_task_naam, is_systeem, onderwerp, body)
SELECT o.id, t.naam, t.trigger_task_naam, true, t.onderwerp, t.body
FROM organisaties o
CROSS JOIN (VALUES
  (
    'Offerte-opvolging dag 1',
    'offerte_opvolging_dag1',
    $sub$Herinnering: offerte {{offerte_nummer}}$sub$,
    $body$Hoi {{contactpersoon}},

Een paar dagen geleden stuurden we je offerte {{offerte_nummer}}. Heb je de offerte kunnen bekijken? We horen graag of je nog vragen hebt.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Offerte-opvolging dag 7',
    'offerte_opvolging_dag7',
    $sub$Vraag over offerte {{offerte_nummer}}$sub$,
    $body$Hoi {{contactpersoon}},

We hebben nog geen reactie ontvangen op offerte {{offerte_nummer}}. Past het tarief, of zijn er onderdelen die we kunnen aanpassen? Laat het ons gerust weten.

Bekijk de offerte hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Factuur-herinnering 1',
    'factuur_herinnering_1',
    $sub$Vriendelijke herinnering factuur {{factuur_nummer}}$sub$,
    $body$Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} stond vervallen op {{verval_datum}}. Wil je het bedrag overmaken? Heb je de factuur al voldaan, dan kun je dit bericht negeren.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Factuur-herinnering 2',
    'factuur_herinnering_2',
    $sub$Tweede herinnering factuur {{factuur_nummer}}$sub$,
    $body$Hoi {{contactpersoon}},

Factuur {{factuur_nummer}} van {{factuur_bedrag}} is nog niet voldaan. We willen je vriendelijk verzoeken het bedrag binnen 7 dagen over te maken.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Factuur-herinnering 3',
    'factuur_herinnering_3',
    $sub$Laatste herinnering factuur {{factuur_nummer}}$sub$,
    $body$Hoi {{contactpersoon}},

Dit is de laatste herinnering voor factuur {{factuur_nummer}} van {{factuur_bedrag}}. We ontvangen graag binnen 7 dagen je betaling. Mocht er iets in de weg staan, neem dan contact met ons op.

Bekijk de factuur hier: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Portaal-uitnodiging',
    'portaal_uitnodiging',
    $sub$Welkom in het klantportaal van {{bedrijfsnaam}}$sub$,
    $body$Hoi {{contactpersoon}},

Hierbij je persoonlijke toegang tot het klantportaal van {{bedrijfsnaam}}. Je vindt hier alle documenten, offertes en facturen voor project {{project_naam}}.

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Portaal-herinnering',
    'portaal_herinnering',
    $sub$Herinnering: actie nodig in je portaal$sub$,
    $body$Hoi {{contactpersoon}},

Er staat nog een openstaande actie voor je klaar in het portaal van {{bedrijfsnaam}}. Wil je even kijken wanneer het je uitkomt?

Open het portaal: {{portaal_url}}

Met vriendelijke groet,
{{bedrijfsnaam}}$body$
  ),
  (
    'Onboarding dag 3',
    'onboarding_dag3',
    $sub$Aan de slag met doen.$sub$,
    $body$Hey {{voornaam}},

Drie dagen geleden ben je begonnen met doen. Hoe bevalt het? We helpen je graag verder als je ergens vastloopt.

Open je dashboard: {{app_url}}

Vragen? Mail ons op hello@doen.team.$body$
  ),
  (
    'Onboarding dag 7',
    'onboarding_dag7',
    $sub$Hoe gaat het met doen.?$sub$,
    $body$Hey {{voornaam}},

Een week onderweg met doen. Veel gebruikers vinden de combinatie offertes plus portaal de grootste tijdwinst. Heb je dat al uitgeprobeerd?

Open je dashboard: {{app_url}}

Vragen? Mail ons op hello@doen.team.$body$
  ),
  (
    'Trial-reminder 5d',
    'trial_reminder_5',
    $sub$Nog 5 dagen in je proefperiode$sub$,
    $body$Hey {{voornaam}},

Je hebt nog 5 dagen in je proefperiode van doen. Activeer je abonnement wanneer je klaar bent om door te gaan. Je houdt al je data.

Bekijk abonnement: {{abonnement_url}}$body$
  ),
  (
    'Trial-reminder 2d',
    'trial_reminder_2',
    $sub$Je proefperiode loopt bijna af$sub$,
    $body$Hey {{voornaam}},

Je proefperiode van doen. loopt over 2 dagen af. Activeer nu je abonnement om zonder onderbreking door te werken.

Activeer abonnement: {{abonnement_url}}$body$
  ),
  (
    'Trial-reminder 0d',
    'trial_reminder_0',
    $sub$Je proefperiode is vandaag afgelopen$sub$,
    $body$Hey {{voornaam}},

Je proefperiode van doen. is vandaag afgelopen. Je data blijft bewaard. Activeer je abonnement om weer verder te kunnen werken.

Activeer abonnement: {{abonnement_url}}$body$
  )
) AS t(naam, trigger_task_naam, onderwerp, body)
ON CONFLICT DO NOTHING;
