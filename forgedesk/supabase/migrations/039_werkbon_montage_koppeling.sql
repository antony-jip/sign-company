-- Werkbon-montage koppeling: voeg werkbon_id toe aan montage_afspraken
ALTER TABLE montage_afspraken
ADD COLUMN IF NOT EXISTS werkbon_id UUID REFERENCES werkbonnen(id) ON DELETE SET NULL;

-- Werkbon nummer cache voor snelle weergave in planning views
ALTER TABLE montage_afspraken
ADD COLUMN IF NOT EXISTS werkbon_nummer TEXT;

-- Bijlagen als JSONB array op montage_afspraken
ALTER TABLE montage_afspraken
ADD COLUMN IF NOT EXISTS bijlagen JSONB DEFAULT '[]';
