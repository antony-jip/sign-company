-- ============================================================
-- 057: RLS offerte_items updaten naar organisatie-breed
--
-- Huidige policy: user_id = auth.uid() (alleen eigen items zichtbaar)
-- Probleem: collega's kunnen elkaars offerte-items niet zien/bewerken
-- Oplossing: offerte_items erven isolatie via parent offertes tabel
-- ============================================================

-- Verwijder oude user_id policy
DROP POLICY IF EXISTS "Users see own data" ON offerte_items;

-- Nieuwe policy: items zichtbaar als de parent offerte bij de organisatie hoort
CREATE POLICY "Org members manage offerte_items" ON offerte_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM offertes
      WHERE offertes.id = offerte_items.offerte_id
        AND offertes.organisatie_id = auth_organisatie_id()
    )
  );
