-- ========================================
-- VOCABULAIRE CODE DE LA ROUTE
-- ========================================

-- Table principale du vocabulaire
CREATE TABLE IF NOT EXISTS vocabulaire_code_route (
    id SERIAL PRIMARY KEY,
    categorie VARCHAR(100) NOT NULL,
    mot TEXT NOT NULL,
    definition_simple TEXT NOT NULL,
    emoji VARCHAR(10),
    ordre_categorie INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des définitions personnalisées par apprenant
CREATE TABLE IF NOT EXISTS definitions_personnalisees_code_route (
    id SERIAL PRIMARY KEY,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ma_definition TEXT,
    mon_exemple TEXT,
    audio_url TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW(),
    UNIQUE(vocabulaire_id, apprenant_id)
);

-- Table de progression par apprenant
CREATE TABLE IF NOT EXISTS progression_vocabulaire_code_route (
    id SERIAL PRIMARY KEY,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    statut VARCHAR(20) DEFAULT 'nouveau',  -- nouveau, en_cours, maitrise
    nombre_revisions INTEGER DEFAULT 0,
    derniere_revision TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(apprenant_id, vocabulaire_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_vocabulaire_categorie ON vocabulaire_code_route(categorie);
CREATE INDEX IF NOT EXISTS idx_definitions_apprenant ON definitions_personnalisees_code_route(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_progression_apprenant ON progression_vocabulaire_code_route(apprenant_id);

-- Vue pour récupérer le vocabulaire avec les définitions personnalisées
CREATE OR REPLACE VIEW v_vocabulaire_apprenant AS
SELECT
    v.id,
    v.categorie,
    v.mot,
    v.definition_simple,
    v.emoji,
    v.ordre_categorie,
    dp.apprenant_id,
    dp.ma_definition,
    dp.mon_exemple,
    dp.audio_url,
    dp.date_modification as date_definition,
    p.statut as statut_progression,
    p.nombre_revisions,
    p.derniere_revision
FROM vocabulaire_code_route v
LEFT JOIN definitions_personnalisees_code_route dp ON v.id = dp.vocabulaire_id
LEFT JOIN progression_vocabulaire_code_route p ON v.id = p.vocabulaire_id AND dp.apprenant_id = p.apprenant_id;

-- Commentaires
COMMENT ON TABLE vocabulaire_code_route IS 'Vocabulaire officiel du code de la route avec définitions simples';
COMMENT ON TABLE definitions_personnalisees_code_route IS 'Définitions personnalisées créées par les apprenants';
COMMENT ON TABLE progression_vocabulaire_code_route IS 'Suivi de la progression d''apprentissage par apprenant';
