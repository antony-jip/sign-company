-- Credits: gebruikers mogen hun eigen credits record aanmaken en bijwerken
-- Dit is nodig omdat de client-side code credits beheert (met server-side enforcement via API)

-- Users kunnen hun eigen credits record aanmaken (bij eerste gebruik)
CREATE POLICY "Users can insert own credits" ON visualizer_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users kunnen hun eigen credits bijwerken
CREATE POLICY "Users can update own credits" ON visualizer_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users kunnen hun eigen transacties aanmaken
CREATE POLICY "Users can insert own transactions" ON credit_transacties
  FOR INSERT WITH CHECK (auth.uid() = user_id);
