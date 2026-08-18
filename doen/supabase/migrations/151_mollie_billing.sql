-- 151: Mollie billing voor het doen.-abonnement en Studio-credits
--
-- De eigen billing (abonnement €79/mnd ex btw + Studio credit-pakketten)
-- verhuist van Stripe naar Mollie. Stripe-kolommen blijven staan als
-- historie; er waren nog geen actieve Stripe-abonnees.
--
-- abonnement_actief_tot: bij opzegging stopt Mollie direct met incasseren,
-- maar de klant heeft de lopende maand al betaald. Deze kolom markeert het
-- einde van de betaalde periode; cron-trial-expiration zet de status daarna
-- op 'opgezegd'.

ALTER TABLE organisaties
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS abonnement_actief_tot TIMESTAMPTZ;

COMMENT ON COLUMN organisaties.abonnement_actief_tot IS
  'Einde van de betaalde periode na opzegging; cron zet status daarna op opgezegd';
