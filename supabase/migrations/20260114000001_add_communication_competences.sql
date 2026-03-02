-- ============================================================================
-- MIGRATION: Compétences Communication orale (FLE)
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Ajoute les catégories et compétences pour le domaine Communication orale
-- Basé sur: docs/Profil Alpha.pdf (profils A1, A2, A3)
-- ============================================================================

-- 1. CRÉER LES CATÉGORIES POUR COMMUNICATION ORALE
INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Compréhension orale',
    'Capacité à écouter et comprendre le français parlé',
    1
FROM formation_domaines d
WHERE d.nom = 'Communication orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Expression orale',
    'Capacité à parler et communiquer en français',
    2
FROM formation_domaines d
WHERE d.nom = 'Communication orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Interaction',
    'Capacité à échanger et dialoguer en français',
    3
FROM formation_domaines d
WHERE d.nom = 'Communication orale'
ON CONFLICT DO NOTHING;

-- 2. COMPÉTENCES COMPRÉHENSION ORALE
-- Degré 1 (A1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-01',
    'Comprendre quelques mots isolés',
    'Reconnaître et comprendre des mots simples et courants du quotidien',
    1,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-02',
    'Reconnaître les sons de la langue française',
    'Identifier et distinguer les phonèmes du français',
    1,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

-- Degré 2 (A2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-03',
    'Comprendre des phrases simples',
    'Comprendre des phrases courtes et des consignes simples',
    2,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-04',
    'Comprendre des situations de la vie courante',
    'Comprendre des échanges simples dans des contextes familiers',
    2,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

-- Degré 3 (A3)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-05',
    'Comprendre les expressions familières et quotidiennes',
    'Comprendre le sens global de conversations courantes',
    3,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-COMP-06',
    'Comprendre des textes oraux de niveau FLE 1',
    'Comprendre des documents audio simples (annonces, messages)',
    3,
    6
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Compréhension orale'
ON CONFLICT DO NOTHING;

-- 3. COMPÉTENCES EXPRESSION ORALE
-- Degré 1 (A1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-01',
    'Répéter des mots simples',
    'Prononcer et répéter des mots courants du français',
    1,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-02',
    'Apprendre le vocabulaire de la vie courante',
    'Acquérir et utiliser le vocabulaire de base (salutations, chiffres, jours)',
    1,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

-- Degré 2 (A2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-03',
    'Faire des phrases simples',
    'Construire et prononcer des phrases courtes et correctes',
    2,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-04',
    'Se présenter et parler de soi',
    'Savoir se présenter, parler de sa famille, de son travail',
    2,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

-- Degré 3 (A3)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-05',
    'Donner son opinion',
    'Exprimer son avis sur des sujets simples',
    3,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-06',
    'Raconter un événement',
    'Décrire des expériences passées de manière simple',
    3,
    6
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-EXPR-07',
    'Donner des explications',
    'Expliquer simplement une situation ou un problème',
    3,
    7
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Expression orale'
ON CONFLICT DO NOTHING;

-- 4. COMPÉTENCES INTERACTION
-- Degré 2
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-INTER-01',
    'Poser et répondre à des questions simples',
    'Échanger dans un dialogue simple avec des questions/réponses basiques',
    2,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Interaction'
ON CONFLICT DO NOTHING;

-- Degré 3
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-INTER-02',
    'Participer à une conversation simple',
    'Maintenir un échange sur des sujets familiers',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Interaction'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'COM-INTER-03',
    'Demander et donner des renseignements',
    'Échanger des informations pratiques (horaires, directions)',
    3,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Communication orale' AND cat.nom = 'Interaction'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM formation_competences c
    JOIN formation_categories_competences cat ON c.categorie_id = cat.id
    JOIN formation_domaines d ON cat.domaine_id = d.id
    WHERE d.nom = 'Communication orale';

    RAISE NOTICE 'Migration 20260114000001: % compétences Communication orale créées', v_count;
END $$;
