-- Migration: Création des tables pour le vocabulaire code de la route
-- Date: 2025-10-06

-- Table des définitions personnalisées (avec UUID pour apprenant_id)
CREATE TABLE IF NOT EXISTS definitions_personnalisees_code_route (
    id SERIAL PRIMARY KEY,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    apprenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ma_definition TEXT,
    mon_exemple TEXT,
    audio_url TEXT,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW(),
    UNIQUE(vocabulaire_id, apprenant_id)
);

-- Table de progression (avec UUID pour apprenant_id)
CREATE TABLE IF NOT EXISTS progression_vocabulaire_code_route (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vocabulaire_id INTEGER REFERENCES vocabulaire_code_route(id) ON DELETE CASCADE,
    statut VARCHAR(20) DEFAULT 'nouveau',
    nombre_revisions INTEGER DEFAULT 0,
    derniere_revision TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(apprenant_id, vocabulaire_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_definitions_apprenant ON definitions_personnalisees_code_route(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_progression_apprenant ON progression_vocabulaire_code_route(apprenant_id);

-- Commentaires
COMMENT ON TABLE definitions_personnalisees_code_route IS 'Définitions personnalisées créées par les apprenants pour le code de la route';
COMMENT ON TABLE progression_vocabulaire_code_route IS 'Suivi de la progression d''apprentissage par apprenant pour le code de la route';
