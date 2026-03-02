-- ============================================================================
-- SEED: Étapes de parcours par profil
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Insère les étapes de progression pour chaque profil
-- Source: docs/Profil Alpha.pdf et docs/Profil illetrisme.pdf
-- ============================================================================

-- ============================================================================
-- PROFIL GD - GRAND DÉBUTANT (Lecture)
-- Source: Profil illetrisme.pdf page 11
-- ============================================================================

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Reconnaître un texte (approche analytique) constitué de mots issus de ses références',
    'Produire une phrase simple avec ses références',
    150,
    350,
    'Lit ses textes références en entier. Isole les groupes de sens et les mots.',
    1
FROM formation_profils p
WHERE p.code = 'GD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Accéder à un texte de 10 lignes avec 20% de mots jamais rencontrés',
    'Produire des phrases plus élaborées avec ses outils',
    200,
    300,
    'Comprend un texte simple de 10 lignes. Écrit une phrase avec dictée-recherche.',
    2
FROM formation_profils p
WHERE p.code = 'GD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    3,
    'Étape 3',
    'Accéder à un texte de 20 lignes (ex: le hamster)',
    'Produire un message de 4 lignes avec ses références',
    250,
    350,
    'Comprend texte 20 lignes. Produit texte court avec outils.',
    3
FROM formation_profils p
WHERE p.code = 'GD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    4,
    'Étape 4',
    'Entrer dans les nuances de l''écrit. Comprendre un texte de 30 lignes',
    'Produire un message de 4 lignes sans ses références',
    250,
    400,
    'Autonomie en lecture 30 lignes. Écrit 4 lignes sans outils.',
    4
FROM formation_profils p
WHERE p.code = 'GD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFIL PD - PETIT DÉBUTANT (Lecture)
-- ============================================================================

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Consolider la reconnaissance des lettres et syllabes simples',
    'Améliorer le tracé des lettres et la copie',
    100,
    200,
    'Reconnaît toutes les lettres. Copie correctement.',
    1
FROM formation_profils p
WHERE p.code = 'PD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Déchiffrer des mots et phrases simples',
    'Écrire des mots simples par encodage',
    150,
    250,
    'Lit des phrases simples. Écrit des mots courants.',
    2
FROM formation_profils p
WHERE p.code = 'PD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    3,
    'Étape 3',
    'Accéder à des textes courts avec compréhension',
    'Produire des phrases simples',
    200,
    300,
    'Comprend textes courts. Écrit phrases simples.',
    3
FROM formation_profils p
WHERE p.code = 'PD' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFIL D - DÉCHIFFREUR (Lecture)
-- ============================================================================

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Fluidifier la lecture syllabique',
    'Consolider l''encodage des mots',
    100,
    200,
    'Lecture plus fluide. Écrit plus de mots sans erreur.',
    1
FROM formation_profils p
WHERE p.code = 'D' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Améliorer la compréhension pendant la lecture',
    'Produire des textes courts',
    150,
    250,
    'Comprend ce qu''il lit. Écrit des messages courts.',
    2
FROM formation_profils p
WHERE p.code = 'D' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFIL PLNS - PETIT LECTEUR NON SCRIPTEUR (Lecture)
-- ============================================================================

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Améliorer la fluidité de lecture',
    'Débloquer l''écriture, production guidée',
    100,
    200,
    'Lit plus fluidement. Commence à produire de l''écrit.',
    1
FROM formation_profils p
WHERE p.code = 'PLNS' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Lecture variée et autonome',
    'Production écrite avec moins d''aide',
    150,
    250,
    'Lit des textes variés. Écrit des messages sans aide.',
    2
FROM formation_profils p
WHERE p.code = 'PLNS' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFIL LPS - LECTEUR PETIT SCRIPTEUR (Lecture)
-- ============================================================================

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Perfectionnement de la lecture',
    'Amélioration de l''orthographe',
    100,
    150,
    'Lecture fluide et expressive. Moins d''erreurs orthographiques.',
    1
FROM formation_profils p
WHERE p.code = 'LPS' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Lecture de documents complexes',
    'Production de textes élaborés',
    100,
    200,
    'Lit et comprend documents administratifs. Rédige courriers.',
    2
FROM formation_profils p
WHERE p.code = 'LPS' AND p.type_public = 'Lecture'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFILS FLE - A1, A2, A3
-- Source: Profil Alpha.pdf
-- ============================================================================

-- A1 - Grand Débutant FLE
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Découverte de l''alphabet latin et des sons du français',
    'Apprentissage du tracé des lettres',
    200,
    400,
    'Reconnaît les lettres. Comprend quelques mots isolés à l''oral.',
    1
FROM formation_profils p
WHERE p.code = 'A1' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Déchiffrage de syllabes et mots simples',
    'Copie de mots et phrases courtes',
    200,
    350,
    'Lit des mots simples. Copie correctement.',
    2
FROM formation_profils p
WHERE p.code = 'A1' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- A2 - Débutant FLE
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Lecture de phrases simples avec compréhension',
    'Écriture de mots du vocabulaire de base',
    150,
    300,
    'Lit et comprend phrases simples. Écrit le vocabulaire courant.',
    1
FROM formation_profils p
WHERE p.code = 'A2' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Lecture de textes courts de la vie quotidienne',
    'Production de phrases simples',
    150,
    250,
    'Comprend textes simples. Écrit des phrases correctes.',
    2
FROM formation_profils p
WHERE p.code = 'A2' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- A3 - Intermédiaire FLE
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Lecture autonome de textes variés',
    'Production de textes courts structurés',
    100,
    200,
    'Lit et comprend textes courants. Écrit des messages structurés.',
    1
FROM formation_profils p
WHERE p.code = 'A3' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Compréhension fine et lecture expressive',
    'Rédaction de textes plus longs',
    100,
    200,
    'Autonomie en lecture. Rédige courriers et formulaires.',
    2
FROM formation_profils p
WHERE p.code = 'A3' AND p.type_public = 'FLE'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- PROFILS ILLETTRISME ORAL - B1, B2, BA
-- Note: Ces profils ont l'oral acquis, focus sur lecture/écriture
-- ============================================================================

-- B1 - Non Scolarisé
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Apprentissage de l''alphabet et correspondance sons/lettres',
    'Apprentissage du geste graphique',
    200,
    400,
    'Connaît l''alphabet. Trace les lettres correctement.',
    1
FROM formation_profils p
WHERE p.code = 'B1' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Déchiffrage de syllabes et mots',
    'Copie et encodage de mots simples',
    200,
    350,
    'Lit des syllabes et mots. Écrit sous dictée simple.',
    2
FROM formation_profils p
WHERE p.code = 'B1' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    3,
    'Étape 3',
    'Lecture de phrases et textes courts',
    'Production de phrases simples',
    250,
    400,
    'Comprend textes courts. Écrit des messages.',
    3
FROM formation_profils p
WHERE p.code = 'B1' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- B2 - Peu Scolarisé
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Réactivation des acquis de lecture',
    'Réactivation du geste graphique et de l''encodage',
    100,
    200,
    'Retrouve ses acquis. Copie et écrit des mots.',
    1
FROM formation_profils p
WHERE p.code = 'B2' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Consolidation de la lecture',
    'Production écrite de phrases et messages',
    150,
    250,
    'Lit avec plus de fluidité. Écrit des messages courts.',
    2
FROM formation_profils p
WHERE p.code = 'B2' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- BA - Scolarisé avec Difficultés
INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    1,
    'Étape 1',
    'Identification des points de blocage en lecture',
    'Identification des difficultés en écriture',
    50,
    100,
    'Points de blocage identifiés et travaillés.',
    1
FROM formation_profils p
WHERE p.code = 'BA' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

INSERT INTO formation_etapes (profil_id, numero, nom, objectifs_lecture, objectifs_ecriture, duree_min, duree_max, indicateurs_reussite, ordre)
SELECT
    p.id,
    2,
    'Étape 2',
    'Perfectionnement ciblé en lecture',
    'Travail sur l''orthographe et la syntaxe',
    100,
    200,
    'Lecture plus fluide. Moins d''erreurs à l''écrit.',
    2
FROM formation_profils p
WHERE p.code = 'BA' AND p.type_public = 'Illettrisme'
ON CONFLICT (profil_id, numero) DO UPDATE SET
    objectifs_lecture = EXCLUDED.objectifs_lecture,
    objectifs_ecriture = EXCLUDED.objectifs_ecriture,
    duree_min = EXCLUDED.duree_min,
    duree_max = EXCLUDED.duree_max;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM formation_etapes;
    RAISE NOTICE 'Seed 20260114000006: % étapes de parcours insérées', v_count;
END $$;
