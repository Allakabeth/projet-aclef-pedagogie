-- Migration : Création de la table exercices Code de la Route
-- Date : 2025-10-10
-- Note : La table vocabulaire_code_route existe déjà

-- Table des exercices Code de la Route
CREATE TABLE IF NOT EXISTS exercices_code_route (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorie TEXT NOT NULL,
    type TEXT NOT NULL, -- qcm, vrai_faux, association, completion
    titre TEXT NOT NULL,
    description TEXT,
    contenu JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_exercices_code_route_categorie
ON exercices_code_route(categorie);

CREATE INDEX IF NOT EXISTS idx_exercices_code_route_type
ON exercices_code_route(type);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_exercices_code_route_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exercices_code_route_updated_at
    BEFORE UPDATE ON exercices_code_route
    FOR EACH ROW
    EXECUTE FUNCTION update_exercices_code_route_updated_at();

-- Commentaires
COMMENT ON TABLE exercices_code_route IS 'Exercices basés sur le vocabulaire du Code de la Route';
COMMENT ON COLUMN exercices_code_route.type IS 'Type d''exercice: qcm, vrai_faux, association, completion';
COMMENT ON COLUMN exercices_code_route.contenu IS 'Contenu structuré de l''exercice au format JSON';
