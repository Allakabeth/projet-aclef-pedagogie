-- Table pour stocker les segmentations personnalisées + enregistrements vocaux
CREATE TABLE IF NOT EXISTS enregistrements_syllabes (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL,
    segmentation_personnalisee TEXT[] NOT NULL, -- Array des syllabes
    audio_urls TEXT[], -- Array URLs Supabase Storage (1 URL par syllabe)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(apprenant_id, mot_normalise)
);

-- Table pour les demandes de doute (apprenant/formateur demande avis admin)
CREATE TABLE IF NOT EXISTS demandes_validation_syllabes (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL,
    segmentation_proposee TEXT[] NOT NULL,
    message_doute TEXT, -- Message optionnel de l'apprenant
    statut VARCHAR(20) DEFAULT 'en_attente', -- en_attente | validee | rejetee
    reponse_admin TEXT, -- Réponse de l'admin
    admin_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_enreg_syll_apprenant ON enregistrements_syllabes(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_demandes_statut ON demandes_validation_syllabes(statut);

-- Commentaires pour documentation
COMMENT ON TABLE enregistrements_syllabes IS 'Segmentations syllabiques personnalisées par apprenant avec enregistrements vocaux';
COMMENT ON TABLE demandes_validation_syllabes IS 'Demandes de validation admin pour les segmentations douteuses';
