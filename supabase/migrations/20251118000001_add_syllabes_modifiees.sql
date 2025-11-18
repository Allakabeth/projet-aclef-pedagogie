-- Ajouter colonne syllabes_modifiees pour stocker les modifications de syllabes
-- Exemple: ['cour', 'se'] pour le mot 'courses' segmenté en ['cour', 'ses']
-- NULL dans l'array = pas de modification pour cette syllabe

ALTER TABLE enregistrements_syllabes
ADD COLUMN IF NOT EXISTS syllabes_modifiees TEXT[];

-- Commentaire pour documentation
COMMENT ON COLUMN enregistrements_syllabes.syllabes_modifiees IS 'Syllabes modifiées par l''apprenant (null si pas modifié). Permet d''enlever les lettres muettes.';
