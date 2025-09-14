-- Ajouter la colonne date_modification manquante à signalements_syllabification

ALTER TABLE signalements_syllabification 
ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'signalements_syllabification' 
AND column_name = 'date_modification';