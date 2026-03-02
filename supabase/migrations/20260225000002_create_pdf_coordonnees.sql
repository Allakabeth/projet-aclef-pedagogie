-- ============================================================================
-- MIGRATION: Table formation_pdf_coordonnees (stockage coordonnees OMR)
-- Date: 2026-02-25
-- Description: Stocke les coordonnees JSON des cases a cocher des PDF vierges
--              generes pour le positionnement OMR
-- ============================================================================

CREATE TABLE IF NOT EXISTS formation_pdf_coordonnees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    positionnement_id UUID REFERENCES formation_positionnements(id) ON DELETE CASCADE,
    apprenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    formateur TEXT,
    date_positionnement TEXT,
    dispositif TEXT,
    domaines_ids UUID[] DEFAULT '{}',
    json_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_pdf_coord_positionnement ON formation_pdf_coordonnees(positionnement_id);
CREATE INDEX IF NOT EXISTS idx_pdf_coord_apprenant ON formation_pdf_coordonnees(apprenant_id);

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260225000002: Table formation_pdf_coordonnees creee';
END $$;
