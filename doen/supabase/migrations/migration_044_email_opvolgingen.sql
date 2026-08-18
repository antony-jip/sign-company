CREATE TABLE IF NOT EXISTS email_opvolgingen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisatie_id UUID NOT NULL REFERENCES organisaties(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email_id TEXT,
  ontvanger TEXT NOT NULL,
  onderwerp TEXT NOT NULL,
  oorspronkelijke_body TEXT NOT NULL,
  dagen INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'wachtend' CHECK (status IN ('wachtend', 'verstuurd', 'geannuleerd', 'reply_ontvangen')),
  gepland_op TIMESTAMPTZ NOT NULL,
  handtekening TEXT DEFAULT '',
  message_id TEXT,
  opvolg_body TEXT,
  verstuurd_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opvolgingen_status ON email_opvolgingen(status);
CREATE INDEX idx_opvolgingen_gepland ON email_opvolgingen(gepland_op);
CREATE INDEX idx_opvolgingen_user ON email_opvolgingen(user_id);
