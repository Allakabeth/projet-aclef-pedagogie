-- Migration: Création de la table phrases_pregenerees
-- Date: 2025-11-15
-- Description: Système de pré-génération de phrases pour l'exercice "Construis phrases"
--              Permet de générer une seule fois les phrases et de les réutiliser
--              pour réduire les coûts tokens IA et améliorer la latence

-- ====================================================================
-- TABLE PRINCIPALE: phrases_pregenerees
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.phrases_pregenerees (
    id SERIAL PRIMARY KEY,

    -- Combinaison de textes (ex: [1,2,3])
    -- Toujours trié pour normalisation: [3,1,2] → [1,2,3]
    texte_ids INTEGER[] NOT NULL,

    -- Contenu de la phrase
    phrase TEXT NOT NULL,

    -- Liste des mots de la phrase (pour validation)
    mots TEXT[] NOT NULL,

    -- Longueur de la phrase (3, 4, 5, 6, ou 7 mots)
    longueur_mots INTEGER NOT NULL CHECK (longueur_mots >= 3 AND longueur_mots <= 7),

    -- Propriétaire des textes (apprenant)
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Source de génération ('gemini' | 'groq')
    source TEXT DEFAULT 'gemini',

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contrainte d'unicité: pas de doublons pour une combinaison donnée
    UNIQUE(texte_ids, phrase, user_id)
);

-- ====================================================================
-- INDEX POUR PERFORMANCES
-- ====================================================================

-- Index GIN pour recherche rapide sur les tableaux d'IDs
CREATE INDEX idx_phrases_texte_ids ON public.phrases_pregenerees USING GIN(texte_ids);

-- Index sur user_id pour filtrer par apprenant
CREATE INDEX idx_phrases_user_id ON public.phrases_pregenerees(user_id);

-- Index sur longueur_mots pour filtrer par taille
CREATE INDEX idx_phrases_longueur ON public.phrases_pregenerees(longueur_mots);

-- Index composite pour requêtes fréquentes
CREATE INDEX idx_phrases_user_textes ON public.phrases_pregenerees(user_id, texte_ids);

-- ====================================================================
-- TRIGGER: Mise à jour automatique de updated_at
-- ====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phrases_pregenerees_updated_at
    BEFORE UPDATE ON public.phrases_pregenerees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- COMMENTAIRES
-- ====================================================================

COMMENT ON TABLE public.phrases_pregenerees IS 'Stockage des phrases pré-générées par IA pour l''exercice Construis phrases. Génération proactive à la création d''un texte pour réduire coûts tokens.';

COMMENT ON COLUMN public.phrases_pregenerees.texte_ids IS 'Tableau d''IDs de textes (toujours trié). Ex: [1,2,3] signifie "phrases générées à partir des mots des textes 1, 2 et 3"';

COMMENT ON COLUMN public.phrases_pregenerees.phrase IS 'Texte de la phrase générée par l''IA. Ex: "Le chat mange."';

COMMENT ON COLUMN public.phrases_pregenerees.mots IS 'Liste des mots contenus dans la phrase (pour validation). Ex: ["le", "chat", "mange"]';

COMMENT ON COLUMN public.phrases_pregenerees.longueur_mots IS 'Nombre de mots dans la phrase (3-7 mots)';

COMMENT ON COLUMN public.phrases_pregenerees.user_id IS 'UUID de l''apprenant propriétaire des textes sources';

COMMENT ON COLUMN public.phrases_pregenerees.source IS 'Service d''IA utilisé pour la génération: "gemini" ou "groq"';
