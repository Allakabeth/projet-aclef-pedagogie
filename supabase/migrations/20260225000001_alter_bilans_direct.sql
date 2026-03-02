-- ============================================================================
-- MIGRATION: Support bilans directs (sans plan) + commentaires par domaine
-- Date: 2026-02-25
-- Description: Permet de creer des bilans sans plan de formation associe
-- ============================================================================

-- Permettre les bilans sans plan (bilans directs)
ALTER TABLE formation_bilans ALTER COLUMN plan_id DROP NOT NULL;

-- Ajouter colonne commentaires par domaine (JSON)
ALTER TABLE formation_bilans ADD COLUMN IF NOT EXISTS domaine_comments JSONB DEFAULT '{}';

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260225000001: formation_bilans adapte pour bilans directs';
END $$;
