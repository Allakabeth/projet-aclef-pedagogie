-- ============================================================================
-- MIGRATION: Ajout des domaines manquants
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Ajoute les domaines Communication orale, Bureautique et Internet
-- ============================================================================

-- 1. DOMAINE COMMUNICATION ORALE (pour FLE A1-A3)
INSERT INTO formation_domaines (nom, description, ordre)
VALUES (
    'Communication orale',
    'Compétences de compréhension et expression orale en français',
    0
)
ON CONFLICT DO NOTHING;

-- 2. DOMAINE BUREAUTIQUE (pour N0-N2B)
INSERT INTO formation_domaines (nom, description, ordre)
VALUES (
    'Bureautique',
    'Compétences en bureautique et informatique de base (Word, Excel, etc.)',
    4
)
ON CONFLICT DO NOTHING;

-- 3. DOMAINE INTERNET (pour I0-I3)
INSERT INTO formation_domaines (nom, description, ordre)
VALUES (
    'Internet',
    'Compétences de navigation web et services en ligne',
    5
)
ON CONFLICT DO NOTHING;

-- 4. Mettre à jour l'ordre des domaines existants pour cohérence
UPDATE formation_domaines SET ordre = 1 WHERE nom = 'Lecture';
UPDATE formation_domaines SET ordre = 2 WHERE nom ILIKE '%criture%';
UPDATE formation_domaines SET ordre = 3 WHERE nom = 'Mathématiques';

-- 5. Lier les profils aux domaines correspondants
-- Communication orale -> profils FLE (A1, A2, A3)
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom = 'Communication orale'
AND p.type_public = 'FLE';

-- Bureautique -> profils Bureautique (N0, N1, N2A, N2B)
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
AND p.type_public = 'Bureautique';

-- Internet -> profils Internet (I0, I1, I2, I3)
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom = 'Internet'
AND p.type_public = 'Internet';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM formation_domaines;
    RAISE NOTICE 'Migration 20260114000000: % domaines au total', v_count;
END $$;
