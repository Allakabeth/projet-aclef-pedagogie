-- ============================================================================
-- MIGRATION: Adaptation structure formation_plans et formation_plan_competences
-- Date: 2025-10-10
-- Description: Ajout des colonnes manquantes pour Phase 2 (Plans de Formation)
-- ============================================================================

-- ============================================================================
-- 1. AJOUT COLONNES formation_plans
-- ============================================================================

-- Ajouter objectifs_generaux (en plus de objectif_principal)
ALTER TABLE formation_plans
ADD COLUMN IF NOT EXISTS objectifs_generaux TEXT;

COMMENT ON COLUMN formation_plans.objectifs_generaux IS 'Objectifs généraux du plan (texte libre, optionnel)';

-- Modifier statut pour ajouter valeurs 'brouillon', 'actif', 'archive'
-- Note: on garde aussi 'en_cours', 'termine', 'abandonne' pour compatibilité
-- Les nouveaux statuts:
-- - brouillon: plan en cours de création
-- - actif: plan actif (remplace 'en_cours')
-- - termine: plan terminé (déjà existant)
-- - archive: plan archivé (nouvelle valeur)

-- On ne modifie pas la contrainte CHECK pour garder la rétrocompatibilité

-- ============================================================================
-- 2. AJOUT COLONNES formation_plan_competences
-- ============================================================================

-- Ajouter colonne ordre pour le tri pédagogique
ALTER TABLE formation_plan_competences
ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0;

COMMENT ON COLUMN formation_plan_competences.ordre IS 'Ordre pédagogique de la compétence dans le plan (0 = non ordonné)';

-- Créer index sur ordre
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_ordre
ON formation_plan_competences(plan_id, ordre);

-- Ajouter objectif_specifique pour objectifs détaillés par compétence
ALTER TABLE formation_plan_competences
ADD COLUMN IF NOT EXISTS objectif_specifique TEXT;

COMMENT ON COLUMN formation_plan_competences.objectif_specifique IS 'Objectif spécifique pour cette compétence dans le plan';

-- ============================================================================
-- 3. VUES UTILITAIRES (optionnel)
-- ============================================================================

-- Vue pour faciliter les requêtes avec les nouveaux champs
CREATE OR REPLACE VIEW formation_plans_complets AS
SELECT
    p.*,
    -- Alias pour compatibilité code
    COALESCE(p.objectif_principal, p.objectifs_generaux, 'Objectif non défini') as objectif,
    -- Normalisation statut
    CASE
        WHEN p.statut = 'en_cours' THEN 'actif'
        WHEN p.statut = 'abandonne' THEN 'archive'
        ELSE p.statut
    END as statut_normalise,
    COUNT(pc.id) as nombre_competences,
    COUNT(pc.id) FILTER (WHERE pc.statut = 'acquis') as nombre_acquises,
    COUNT(pc.id) FILTER (WHERE pc.statut = 'en_cours') as nombre_en_cours,
    COUNT(pc.id) FILTER (WHERE pc.statut = 'a_travailler') as nombre_a_travailler
FROM formation_plans p
LEFT JOIN formation_plan_competences pc ON pc.plan_id = p.id
GROUP BY p.id;

COMMENT ON VIEW formation_plans_complets IS 'Vue enrichie des plans avec statistiques de compétences';

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour normaliser les priorités (1,2,3 ↔ haute,moyenne,faible)
CREATE OR REPLACE FUNCTION formation_priorite_to_text(priorite INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN priorite = 1 THEN 'haute'
        WHEN priorite = 2 THEN 'moyenne'
        WHEN priorite = 3 THEN 'faible'
        ELSE 'moyenne'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION formation_priorite_to_int(priorite VARCHAR)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE
        WHEN LOWER(priorite) = 'haute' THEN 1
        WHEN LOWER(priorite) = 'moyenne' THEN 2
        WHEN LOWER(priorite) = 'faible' THEN 3
        ELSE 2
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION formation_priorite_to_text IS 'Convertit priorité INTEGER (1,2,3) en texte (haute,moyenne,faible)';
COMMENT ON FUNCTION formation_priorite_to_int IS 'Convertit priorité texte (haute,moyenne,faible) en INTEGER (1,2,3)';

-- Fonction pour normaliser les statuts plan
CREATE OR REPLACE FUNCTION formation_normaliser_statut_plan(statut VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN statut = 'en_cours' THEN 'actif'
        WHEN statut = 'abandonne' THEN 'archive'
        WHEN statut IN ('brouillon', 'actif', 'termine', 'archive') THEN statut
        ELSE 'actif'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION formation_normaliser_statut_plan IS 'Normalise les statuts de plan (en_cours→actif, abandonne→archive)';

-- Fonction pour normaliser les statuts compétence
CREATE OR REPLACE FUNCTION formation_normaliser_statut_competence(statut VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN statut = 'a_faire' THEN 'a_travailler'
        WHEN statut = 'valide' THEN 'acquis'
        WHEN statut IN ('a_travailler', 'en_cours', 'acquis') THEN statut
        ELSE 'a_travailler'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION formation_normaliser_statut_competence IS 'Normalise les statuts de compétence (a_faire→a_travailler, valide→acquis)';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 20251010000002_adapt_formation_plans.sql appliquée avec succès';
    RAISE NOTICE '✅ Colonnes ajoutées: objectifs_generaux, ordre, objectif_specifique';
    RAISE NOTICE '✅ Vue formation_plans_complets créée';
    RAISE NOTICE '✅ Fonctions de normalisation créées';
    RAISE NOTICE '📝 Statuts plan supportés: brouillon, actif, termine, archive (+ en_cours, abandonne pour rétrocompat)';
    RAISE NOTICE '📝 Statuts compétence: a_travailler, en_cours, acquis (+ a_faire, valide pour rétrocompat)';
    RAISE NOTICE '📝 Priorités: 1=haute, 2=moyenne, 3=faible (fonctions de conversion disponibles)';
END $$;
