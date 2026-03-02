-- ============================================================================
-- MIGRATION: Table formation_etape_competences (M2M etapes ↔ competences)
-- Date: 2026-02-25
-- Description: Lie les etapes de parcours aux competences du referentiel
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_etape_competences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etape_id UUID NOT NULL REFERENCES formation_etapes(id) ON DELETE CASCADE,
    competence_id UUID NOT NULL REFERENCES formation_competences(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(etape_id, competence_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_etape_comp_etape ON formation_etape_competences(etape_id);
CREATE INDEX IF NOT EXISTS idx_formation_etape_comp_competence ON formation_etape_competences(competence_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260225000000: Table formation_etape_competences creee';
END $$;
