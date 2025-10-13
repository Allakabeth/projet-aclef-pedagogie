-- Migration : Création de la table categories_outils_pedagogiques
-- Date : 2025-10-10

-- Table des catégories d'outils pédagogiques
CREATE TABLE IF NOT EXISTS categories_outils_pedagogiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    couleur TEXT, -- Code couleur hex pour l'affichage
    ordre INTEGER DEFAULT 0, -- Ordre d'affichage
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter le champ categorie_id à la table formation_exercices
ALTER TABLE formation_exercices
ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES categories_outils_pedagogiques(id) ON DELETE SET NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_formation_exercices_categorie
ON formation_exercices(categorie_id);

CREATE INDEX IF NOT EXISTS idx_categories_outils_ordre
ON categories_outils_pedagogiques(ordre);

-- Insertion de catégories par défaut
INSERT INTO categories_outils_pedagogiques (nom, description, emoji, couleur, ordre) VALUES
('Lecture', 'Exercices de compréhension écrite et déchiffrage', '📖', '#10b981', 1),
('Écriture', 'Exercices d''orthographe et production écrite', '✏️', '#3b82f6', 2),
('Calcul', 'Exercices de mathématiques et numération', '🔢', '#8b5cf6', 3),
('Vocabulaire', 'Enrichissement du vocabulaire', '📚', '#6366f1', 4),
('Grammaire', 'Règles de grammaire et conjugaison', '📝', '#f59e0b', 5),
('Compréhension orale', 'Écoute et compréhension', '🎧', '#ec4899', 6),
('Expression orale', 'Pratique de l''oral', '🗣️', '#14b8a6', 7),
('Culture générale', 'Connaissances générales', '🌍', '#06b6d4', 8)
ON CONFLICT DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_categories_outils_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_categories_outils_updated_at
    BEFORE UPDATE ON categories_outils_pedagogiques
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_outils_updated_at();

COMMENT ON TABLE categories_outils_pedagogiques IS 'Catégories pour organiser les outils pédagogiques (exercices)';
COMMENT ON COLUMN formation_exercices.categorie_id IS 'Catégorie thématique de l''exercice (optionnel)';
