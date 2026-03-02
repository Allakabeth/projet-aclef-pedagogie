-- ============================================================================
-- MIGRATION: Liaison compétences existantes aux degrés ANLCI
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Assigne le degré ANLCI (1-4) aux compétences Lecture, Écriture, Maths
-- ============================================================================

-- ============================================================================
-- LECTURE - Acquisition (Degré 1-2)
-- ============================================================================

-- Degré 1 : Bases (lettres, mots globaux, syllabes simples)
UPDATE formation_competences SET degre_anlci = 1
WHERE code IN ('LECT-ACQ-01', 'LECT-ACQ-02', 'LECT-ACQ-03', 'LECT-ACQ-04');

-- Degré 2 : Consolidation (plus de lettres, accès phrase)
UPDATE formation_competences SET degre_anlci = 2
WHERE code IN ('LECT-ACQ-05', 'LECT-ACQ-06', 'LECT-ACQ-07');

-- ============================================================================
-- LECTURE - Textes références (Degré 2)
-- ============================================================================

-- Degré 2 : Travail sur les textes de référence
UPDATE formation_competences SET degre_anlci = 2
WHERE code LIKE 'LECT-TR-%';

-- ============================================================================
-- LECTURE - Suite (Degré 3-4)
-- ============================================================================

-- Degré 3 : Compréhension et hypothèses
UPDATE formation_competences SET degre_anlci = 3
WHERE code IN ('LECT-SUI-01', 'LECT-SUI-02', 'LECT-SUI-03', 'LECT-SUI-04',
               'LECT-SUI-05', 'LECT-SUI-06', 'LECT-SUI-07');

-- Degré 4 : Autonomie en lecture
UPDATE formation_competences SET degre_anlci = 4
WHERE code IN ('LECT-SUI-08', 'LECT-SUI-09', 'LECT-SUI-10', 'LECT-SUI-11',
               'LECT-SUI-12', 'LECT-SUI-13', 'LECT-SUI-14');

-- ============================================================================
-- ÉCRITURE - Acquisition (Degré 1-2)
-- ============================================================================

-- Degré 1 : Graphie, copie, mots/syllabes simples
UPDATE formation_competences SET degre_anlci = 1
WHERE code IN ('ECR-ACQ-01', 'ECR-ACQ-02', 'ECR-ACQ-03', 'ECR-ACQ-04',
               'ECR-ACQ-05', 'ECR-ACQ-06');

-- Degré 2 : Phrases avec outils, dictée-recherche
UPDATE formation_competences SET degre_anlci = 2
WHERE code IN ('ECR-ACQ-07', 'ECR-ACQ-08', 'ECR-ACQ-09', 'ECR-ACQ-10',
               'ECR-ACQ-11', 'ECR-ACQ-12');

-- ============================================================================
-- ÉCRITURE - Suite (Degré 3-4)
-- ============================================================================

-- Degré 3 : Accords, grammaire, présent
UPDATE formation_competences SET degre_anlci = 3
WHERE code IN ('ECR-SUI-01', 'ECR-SUI-02', 'ECR-SUI-03', 'ECR-SUI-04');

-- Degré 4 : Conjugaison avancée, autonomie
UPDATE formation_competences SET degre_anlci = 4
WHERE code IN ('ECR-SUI-05', 'ECR-SUI-06', 'ECR-SUI-07', 'ECR-SUI-08');

-- ============================================================================
-- MATHÉMATIQUES - Numération (Degré 2)
-- ============================================================================

UPDATE formation_competences SET degre_anlci = 2
WHERE code LIKE 'MATH-NUM-%';

-- ============================================================================
-- MATHÉMATIQUES - Opérations (Degré 2-3)
-- ============================================================================

-- Degré 2 : Addition, soustraction, multiplication simple
UPDATE formation_competences SET degre_anlci = 2
WHERE code IN ('MATH-OPS-01', 'MATH-OPS-02', 'MATH-OPS-03', 'MATH-OPS-04');

-- Degré 3 : Multiplication/division avancée, calculette
UPDATE formation_competences SET degre_anlci = 3
WHERE code IN ('MATH-OPS-05', 'MATH-OPS-06', 'MATH-OPS-07', 'MATH-OPS-08');

-- ============================================================================
-- MATHÉMATIQUES - Fractions (Degré 3)
-- ============================================================================

UPDATE formation_competences SET degre_anlci = 3
WHERE code LIKE 'MATH-FRAC-%';

-- ============================================================================
-- MATHÉMATIQUES - Mesure (Degré 2-3)
-- ============================================================================

-- Degré 2 : Longueur, parcours, périmètre, euro
UPDATE formation_competences SET degre_anlci = 2
WHERE code IN ('MATH-MES-01', 'MATH-MES-02', 'MATH-MES-03', 'MATH-MES-04', 'MATH-MES-05');

-- Degré 3 : Masse, capacité, volumes
UPDATE formation_competences SET degre_anlci = 3
WHERE code IN ('MATH-MES-06', 'MATH-MES-07', 'MATH-MES-08');

-- ============================================================================
-- MATHÉMATIQUES - Proportionnalité (Degré 4)
-- ============================================================================

UPDATE formation_competences SET degre_anlci = 4
WHERE code LIKE 'MATH-PROP-%';

-- ============================================================================
-- MATHÉMATIQUES - Temps (Degré 2)
-- ============================================================================

UPDATE formation_competences SET degre_anlci = 2
WHERE code LIKE 'MATH-TPS-%';

-- ============================================================================
-- MATHÉMATIQUES - Espace (Degré 3)
-- ============================================================================

UPDATE formation_competences SET degre_anlci = 3
WHERE code LIKE 'MATH-ESP-%';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_total INTEGER;
    v_sans_degre INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM formation_competences;
    SELECT COUNT(*) INTO v_sans_degre FROM formation_competences WHERE degre_anlci IS NULL;

    RAISE NOTICE 'Migration 20260114000004: % compétences au total, % sans degré ANLCI', v_total, v_sans_degre;
END $$;
