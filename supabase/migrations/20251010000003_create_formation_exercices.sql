-- Migration: Création des tables pour les exercices pédagogiques
-- Date: 2025-10-10
-- Description: Système de gestion des exercices liés aux compétences

-- ============================================================================
-- Table: formation_exercices
-- Description: Stocke les exercices pédagogiques liés aux compétences
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_exercices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Lien avec la compétence
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,

    -- Type d'exercice (réutilise les types de quiz)
    type TEXT NOT NULL CHECK (type IN ('qcm', 'ordering', 'matching', 'numeric')),

    -- Informations de base
    titre TEXT NOT NULL,
    description TEXT,

    -- Niveau de difficulté
    difficulte TEXT NOT NULL DEFAULT 'moyen' CHECK (difficulte IN ('facile', 'moyen', 'difficile')),

    -- Contenu de l'exercice (structure JSON selon le type)
    -- Pour QCM: { question, options: [{ text, correct }], ... }
    -- Pour ordering: { items: [{ text, order }], ... }
    -- Pour matching: { pairs: [{ left, right }], ... }
    -- Pour numeric: { question, answer, tolerance, unit, ... }
    contenu JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_formation_exercices_competence ON formation_exercices(competence_id);
CREATE INDEX IF NOT EXISTS idx_formation_exercices_type ON formation_exercices(type);
CREATE INDEX IF NOT EXISTS idx_formation_exercices_difficulte ON formation_exercices(difficulte);

-- ============================================================================
-- Table: formation_exercices_assignations
-- Description: Assignation des exercices aux apprenants
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_exercices_assignations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    exercice_id UUID NOT NULL REFERENCES formation_exercices(id) ON DELETE CASCADE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Assignation
    date_assignation TIMESTAMPTZ DEFAULT NOW(),
    date_limite TIMESTAMPTZ, -- Optionnel: date limite pour réaliser l'exercice

    -- Réalisation
    statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'termine')),
    date_debut TIMESTAMPTZ, -- Quand l'apprenant a commencé
    date_fin TIMESTAMPTZ, -- Quand l'apprenant a terminé

    -- Résultats
    score NUMERIC(5,2), -- Score obtenu (ex: 85.50)
    reponses JSONB, -- Stocke les réponses de l'apprenant

    -- Nombre de tentatives
    tentatives INTEGER DEFAULT 0,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contrainte: un apprenant ne peut avoir qu'une seule assignation active par exercice
    UNIQUE(exercice_id, apprenant_id)
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_formation_exercices_assignations_exercice ON formation_exercices_assignations(exercice_id);
CREATE INDEX IF NOT EXISTS idx_formation_exercices_assignations_apprenant ON formation_exercices_assignations(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_formation_exercices_assignations_statut ON formation_exercices_assignations(statut);

-- ============================================================================
-- Triggers pour updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_formation_exercices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_formation_exercices_updated_at
    BEFORE UPDATE ON formation_exercices
    FOR EACH ROW
    EXECUTE FUNCTION update_formation_exercices_updated_at();

CREATE TRIGGER trigger_formation_exercices_assignations_updated_at
    BEFORE UPDATE ON formation_exercices_assignations
    FOR EACH ROW
    EXECUTE FUNCTION update_formation_exercices_updated_at();

-- ============================================================================
-- Commentaires
-- ============================================================================

COMMENT ON TABLE formation_exercices IS 'Exercices pédagogiques liés aux compétences du référentiel';
COMMENT ON TABLE formation_exercices_assignations IS 'Assignation des exercices aux apprenants avec suivi de la progression';

COMMENT ON COLUMN formation_exercices.type IS 'Type d''exercice: qcm, ordering, matching, numeric';
COMMENT ON COLUMN formation_exercices.difficulte IS 'Niveau de difficulté: facile, moyen, difficile';
COMMENT ON COLUMN formation_exercices.contenu IS 'Structure JSON contenant les données de l''exercice selon son type';

COMMENT ON COLUMN formation_exercices_assignations.statut IS 'Statut de l''assignation: a_faire, en_cours, termine';
COMMENT ON COLUMN formation_exercices_assignations.score IS 'Score obtenu par l''apprenant (0-100)';
COMMENT ON COLUMN formation_exercices_assignations.reponses IS 'Réponses de l''apprenant au format JSON';
