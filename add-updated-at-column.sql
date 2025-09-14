-- Ajouter la colonne updated_at manquante

-- 1. Ajouter updated_at à corrections_syllabification
ALTER TABLE corrections_syllabification 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Ajouter updated_at à corrections_mono_multi si elle n'existe pas
ALTER TABLE corrections_mono_multi 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'corrections_syllabification' 
AND column_name = 'updated_at';