-- Visualizer credits systeem
-- Credits worden bijgehouden per user, opgewaardeerd via Stripe

CREATE TABLE IF NOT EXISTS visualizer_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo INTEGER NOT NULL DEFAULT 0,
  totaal_gekocht INTEGER NOT NULL DEFAULT 0,
  totaal_gebruikt INTEGER NOT NULL DEFAULT 0,
  laatst_bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS credit_transacties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('aankoop', 'gebruik', 'handmatig_toegevoegd', 'correctie')),
  aantal INTEGER NOT NULL,
  saldo_na INTEGER NOT NULL,
  beschrijving TEXT,
  visualisatie_id TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visualizer_credits_user ON visualizer_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transacties_user ON credit_transacties(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transacties_created ON credit_transacties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transacties_stripe ON credit_transacties(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- RLS policies
ALTER TABLE visualizer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transacties ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can view own credits" ON visualizer_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own transactions
CREATE POLICY "Users can view own transactions" ON credit_transacties
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for webhook)
CREATE POLICY "Service role full access credits" ON visualizer_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access transacties" ON credit_transacties
  FOR ALL USING (auth.role() = 'service_role');
