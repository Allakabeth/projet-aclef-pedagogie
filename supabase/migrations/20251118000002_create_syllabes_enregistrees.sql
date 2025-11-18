-- Table pour stocker les syllabes uniques enregistrées par chaque apprenant
-- Une syllabe n'est enregistrée qu'UNE SEULE FOIS, puis réutilisée partout

CREATE TABLE IF NOT EXISTS syllabes_enregistrees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    syllabe TEXT NOT NULL, -- Syllabe normalisée (minuscules, sans accents)
    syllabe_affichee TEXT, -- Syllabe avec accents/casse pour affichage
    audio_url TEXT NOT NULL, -- URL de l'enregistrement audio
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contrainte unique : un apprenant ne peut avoir qu'UN enregistrement par syllabe
    UNIQUE(apprenant_id, syllabe)
);

-- Index pour recherche rapide
CREATE INDEX idx_syllabes_enregistrees_apprenant ON syllabes_enregistrees(apprenant_id);
CREATE INDEX idx_syllabes_enregistrees_syllabe ON syllabes_enregistrees(syllabe);

-- Commentaire
COMMENT ON TABLE syllabes_enregistrees IS 'Syllabes enregistrées une seule fois par apprenant, réutilisables partout';
COMMENT ON COLUMN syllabes_enregistrees.syllabe IS 'Syllabe normalisée (minuscules, sans accents) pour matching';
COMMENT ON COLUMN syllabes_enregistrees.syllabe_affichee IS 'Syllabe originale avec accents pour affichage';
