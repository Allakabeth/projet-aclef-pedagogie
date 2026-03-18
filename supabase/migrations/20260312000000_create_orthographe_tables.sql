-- ============================================================================
-- MIGRATION: Création des tables pour le module Orthographe (Boîtes Bleues)
-- Date: 2026-03-12
-- Projet: ACLEF-Pédagogie
-- Description: Tables pour les exercices d'orthographe grammaticale
--              adaptés des fiches "Boîtes Bleues" (400 fiches, niveaux A/B/C)
-- ============================================================================

-- ============================================================================
-- Table: orthographe_exercices
-- Description: Exercices d'orthographe avec contenu JSON polymorphique
-- ============================================================================

CREATE TABLE IF NOT EXISTS orthographe_exercices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Classification thématique
    theme_grammatical TEXT NOT NULL,
    sous_theme TEXT,

    -- Type d'exercice
    type TEXT NOT NULL CHECK (type IN (
        'fill_blank',       -- Texte à trous avec options à choisir
        'binary_choice',    -- Choix binaire/multiple en contexte dans la phrase
        'ordering',         -- Remettre des mots en ordre pour former une phrase
        'matching',         -- Appariement : relier des paires (contraires, synonymes...)
        'classification',   -- Tri d'éléments dans des catégories
        'transformation'    -- Transformation guidée d'une phrase (modèle + exercice)
    )),

    -- Informations de base
    titre TEXT NOT NULL,
    consigne TEXT,

    -- Progression (Boîtes Bleues)
    niveau TEXT NOT NULL DEFAULT 'A' CHECK (niveau IN ('A', 'B', 'C')),
    numero_boite INTEGER,
    ordre INTEGER DEFAULT 0,

    -- Difficulté
    difficulte TEXT NOT NULL DEFAULT 'moyen' CHECK (difficulte IN ('facile', 'moyen', 'difficile')),

    -- Contenu de l'exercice (structure JSON selon le type)
    -- fill_blank:      { options: [], phrases: [{ avant, apres, reponse }] }
    -- binary_choice:   { phrases: [{ segments: [{ type, value, options?, correct? }] }] }
    -- ordering:        { phrases: [{ mots: [], ordre_correct: [] }] }
    -- matching:        { pairs: [{ left, right }] }
    -- classification:  { categories: [], items: [{ text, categorie }] }
    -- transformation:  { modele: { avant, apres }, phrases: [{ originale, reponse }] }
    contenu JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Lien avec le référentiel de compétences
    competence_id UUID REFERENCES formation_competences(id) ON DELETE SET NULL,

    -- État
    actif BOOLEAN DEFAULT true,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_theme ON orthographe_exercices(theme_grammatical);
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_sous_theme ON orthographe_exercices(sous_theme);
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_type ON orthographe_exercices(type);
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_niveau ON orthographe_exercices(niveau);
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_competence ON orthographe_exercices(competence_id);
CREATE INDEX IF NOT EXISTS idx_ortho_exercices_actif ON orthographe_exercices(actif);

-- ============================================================================
-- Table: orthographe_sessions
-- Description: Log de chaque tentative d'un apprenant sur un exercice
--              Pas de contrainte UNIQUE : l'apprenant peut rejouer autant qu'il veut
-- ============================================================================

CREATE TABLE IF NOT EXISTS orthographe_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Références
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercice_id UUID NOT NULL REFERENCES orthographe_exercices(id) ON DELETE CASCADE,

    -- Résultats
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    total_questions INTEGER NOT NULL DEFAULT 0,
    bonnes_reponses INTEGER NOT NULL DEFAULT 0,
    duree_secondes INTEGER DEFAULT 0,

    -- Réponses détaillées
    reponses JSONB DEFAULT '{}'::jsonb,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_ortho_sessions_user ON orthographe_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ortho_sessions_exercice ON orthographe_sessions(exercice_id);
CREATE INDEX IF NOT EXISTS idx_ortho_sessions_created ON orthographe_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_ortho_sessions_user_exercice ON orthographe_sessions(user_id, exercice_id);

-- ============================================================================
-- Trigger pour updated_at sur orthographe_exercices
-- ============================================================================

CREATE OR REPLACE FUNCTION update_orthographe_exercices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orthographe_exercices_updated_at
    BEFORE UPDATE ON orthographe_exercices
    FOR EACH ROW
    EXECUTE FUNCTION update_orthographe_exercices_updated_at();

-- ============================================================================
-- Commentaires
-- ============================================================================

COMMENT ON TABLE orthographe_exercices IS 'Exercices d''orthographe grammaticale (Boîtes Bleues) avec contenu JSON polymorphique';
COMMENT ON TABLE orthographe_sessions IS 'Sessions d''entraînement des apprenants - chaque tentative est enregistrée';

COMMENT ON COLUMN orthographe_exercices.theme_grammatical IS 'Thème principal : articles_definis, possessifs, homophones_a_ont, etc.';
COMMENT ON COLUMN orthographe_exercices.sous_theme IS 'Sous-thème optionnel : mon_ma_mes, le_la_l, etc.';
COMMENT ON COLUMN orthographe_exercices.type IS 'Type d''exercice : fill_blank, binary_choice, ordering, matching, classification, transformation';
COMMENT ON COLUMN orthographe_exercices.niveau IS 'Niveau de progression : A (bases), B (intermédiaire), C (avancé)';
COMMENT ON COLUMN orthographe_exercices.numero_boite IS 'Numéro de la fiche originale des Boîtes Bleues (1-400)';
COMMENT ON COLUMN orthographe_exercices.contenu IS 'Contenu JSON de l''exercice - structure varie selon le type';
