-- AI Usage tracking voor Forgie (Anthropic Claude)
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  maand text NOT NULL,
  aantal_calls integer DEFAULT 0,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  geschatte_kosten numeric(10,4) DEFAULT 0,
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_user_maand ON ai_usage(user_id, maand);
