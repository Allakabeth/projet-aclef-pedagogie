-- ============================================================================
-- MIGRATION: Données initiales Module Formation
-- Date: 2025-10-10
-- Projet: ACLEF-Pédagogie
-- Description: Insertion des domaines, catégories et compétences basées sur
--              les documents de positionnement ACLEF (Lecture, Écriture, Maths)
-- ============================================================================

-- ============================================================================
-- DOMAINES DE FORMATION
-- ============================================================================

INSERT INTO formation_domaines (nom, emoji, description, ordre, actif) VALUES
    ('Lecture', '📖', 'Compétences de lecture et compréhension écrite', 1, true),
    ('Écriture', '✍️', 'Compétences d''écriture et production écrite', 2, true),
    ('Mathématiques', '🔢', 'Compétences en calcul et raisonnement mathématique', 3, true)
ON CONFLICT (nom) DO NOTHING;

-- ============================================================================
-- CATÉGORIES - LECTURE
-- ============================================================================

DO $$
DECLARE
    domaine_lecture_id UUID;
    categorie_acquisition_id UUID;
    categorie_textes_ref_id UUID;
    categorie_suite_id UUID;
BEGIN
    -- Récupérer l'ID du domaine Lecture
    SELECT id INTO domaine_lecture_id FROM formation_domaines WHERE nom = 'Lecture';

    -- Catégorie: Acquisition
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_lecture_id, 'Acquisition', 'Compétences d''acquisition initiale de la lecture', 1)
    RETURNING id INTO categorie_acquisition_id;

    -- Compétences Acquisition
    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_acquisition_id, 'LECT-ACQ-01', 'Connaissance des lettres de l''alphabet ?', 1),
        (categorie_acquisition_id, 'LECT-ACQ-02', 'Quelques mots en global ?', 2),
        (categorie_acquisition_id, 'LECT-ACQ-03', 'Quelques syllabes ?', 3),
        (categorie_acquisition_id, 'LECT-ACQ-04', '2 lettres ?', 4),
        (categorie_acquisition_id, 'LECT-ACQ-05', '3 lettres ?', 5),
        (categorie_acquisition_id, 'LECT-ACQ-06', '+ ... ?', 6),
        (categorie_acquisition_id, 'LECT-ACQ-07', 'Accès à une phrase ?', 7);

    -- Catégorie: Textes références
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_lecture_id, 'Textes références', 'Travail sur les textes références personnels', 2)
    RETURNING id INTO categorie_textes_ref_id;

    -- Compétences Textes références
    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_textes_ref_id, 'LECT-TR-01', 'Quantité de textes références ?', 1),
        (categorie_textes_ref_id, 'LECT-TR-02', 'Sait-il les dire en entier ?', 2),
        (categorie_textes_ref_id, 'LECT-TR-03', 'Sait-il trouver le groupe de sens ?', 3),
        (categorie_textes_ref_id, 'LECT-TR-04', 'Sait-il reconnaître le groupe de sens ?', 4),
        (categorie_textes_ref_id, 'LECT-TR-05', 'Sait-il isoler les mots ?', 5),
        (categorie_textes_ref_id, 'LECT-TR-06', 'Sait-il isoler les mots « affectifs » ?', 6),
        (categorie_textes_ref_id, 'LECT-TR-07', 'Sait-il isoler tous les mots ?', 7),
        (categorie_textes_ref_id, 'LECT-TR-08', 'Sait-il se repérer dans son classeur ?', 8),
        (categorie_textes_ref_id, 'LECT-TR-09', 'Sait-il reconnaître les étiquettes mélangées d''un texte ?', 9),
        (categorie_textes_ref_id, 'LECT-TR-10', 'Sait-il reconnaître les étiquettes mélangées de plusieurs textes ?', 10),
        (categorie_textes_ref_id, 'LECT-TR-11', 'Sait-il lire ses gammes accordéons ?', 11),
        (categorie_textes_ref_id, 'LECT-TR-12', 'Sait-il lire ses histoires sur carton (groupe de sens) ?', 12),
        (categorie_textes_ref_id, 'LECT-TR-13', 'Sait-il lire ses histoires sur carton (mot isolé) ?', 13),
        (categorie_textes_ref_id, 'LECT-TR-14', 'Combien d''analogies découvertes ?', 14);

    -- Catégorie: Suite (Lecture avancée)
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_lecture_id, 'Suite', 'Compétences de lecture avancée et compréhension', 3)
    RETURNING id INTO categorie_suite_id;

    -- Compétences Suite
    INSERT INTO formation_competences (categorie_id, code, intitule, contexte, ordre) VALUES
        (categorie_suite_id, 'LECT-SUI-01', 'Sait-il faire des hypothèses sur le sens par comparaison ?', 'Avec le texte', 1),
        (categorie_suite_id, 'LECT-SUI-02', 'Sait-il découvrir un mot nouveau par référence ?', 'Sur un mot référence', 2),
        (categorie_suite_id, 'LECT-SUI-03', 'Peut-il lire le contenu de chaque cas ?', NULL, 3),
        (categorie_suite_id, 'LECT-SUI-04', 'Fait-il la correspondance syllabes graphiques / phonologiques ?', NULL, 4),
        (categorie_suite_id, 'LECT-SUI-05', 'Comprend-il un texte de 20 lignes environ au vocabulaire simple ?', 'après lecture silencieuse', 5),
        (categorie_suite_id, 'LECT-SUI-06', 'Avec question du formateur ?', NULL, 6),
        (categorie_suite_id, 'LECT-SUI-07', 'Sans question du formateur ?', NULL, 7),
        (categorie_suite_id, 'LECT-SUI-08', 'Combien de temps ?', NULL, 8),
        (categorie_suite_id, 'LECT-SUI-09', 'En lecture orale, sait identifier les différents mots de ce texte ?', NULL, 9),
        (categorie_suite_id, 'LECT-SUI-10', 'Comprend-il un texte plus long (30 lignes et +) ?', NULL, 10),
        (categorie_suite_id, 'LECT-SUI-11', 'Sait-il construire le sens et mémoriser les informations ?', NULL, 11),
        (categorie_suite_id, 'LECT-SUI-12', 'Sait-il construire le sens de la totalité du texte ?', NULL, 12),
        (categorie_suite_id, 'LECT-SUI-13', 'Est capable de construire du sens dans des paragraphes ?', NULL, 13),
        (categorie_suite_id, 'LECT-SUI-14', 'En lecture orale, sait-il déchiffrer les différents mots de ce texte ?', NULL, 14);

    RAISE NOTICE 'Domaine Lecture créé avec 3 catégories et compétences';
END $$;

-- ============================================================================
-- CATÉGORIES - ÉCRITURE
-- ============================================================================

DO $$
DECLARE
    domaine_ecriture_id UUID;
    categorie_acquisition_id UUID;
    categorie_suite_id UUID;
BEGIN
    -- Récupérer l'ID du domaine Écriture
    SELECT id INTO domaine_ecriture_id FROM formation_domaines WHERE nom = 'Écriture';

    -- Catégorie: Acquisition
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_ecriture_id, 'Acquisition', 'Compétences d''acquisition initiale de l''écriture', 1)
    RETURNING id INTO categorie_acquisition_id;

    -- Compétences Acquisition
    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_acquisition_id, 'ECR-ACQ-01', 'Peut-il graphier les lettres ?', 1),
        (categorie_acquisition_id, 'ECR-ACQ-02', 'Transférer écriture/cursive avec majuscules ?', 2),
        (categorie_acquisition_id, 'ECR-ACQ-03', 'Copie avec segmentation des mots ?', 3),
        (categorie_acquisition_id, 'ECR-ACQ-04', 'Sait-il écrire quelques mots ?', 4),
        (categorie_acquisition_id, 'ECR-ACQ-05', 'Sait-il écrire quelques syllabes ?', 5),
        (categorie_acquisition_id, 'ECR-ACQ-06', 'Sait-il produire une phrase ?', 6),
        (categorie_acquisition_id, 'ECR-ACQ-07', 'Sait-il produire une phrase avec ses outils ?', 7),
        (categorie_acquisition_id, 'ECR-ACQ-08', 'Sous la dictée-recherche, sait-il retrouver des groupes de sens ?', 8),
        (categorie_acquisition_id, 'ECR-ACQ-09', 'Sous la dictée-recherche, sait-il retrouver des mots ?', 9),
        (categorie_acquisition_id, 'ECR-ACQ-10', 'Sous la dictée-recherche, sait-il transcrire un groupe de sens ?', 10),
        (categorie_acquisition_id, 'ECR-ACQ-11', 'Sait-il produire un texte avec ses outils (4-5 lignes) ?', 11),
        (categorie_acquisition_id, 'ECR-ACQ-12', 'Sait-il produire les syllabes repères et classées dans son cahier d''analogies ?', 12);

    -- Catégorie: Suite (Orthographe et grammaire)
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_ecriture_id, 'Suite', 'Orthographe, grammaire et production autonome', 2)
    RETURNING id INTO categorie_suite_id;

    -- Compétences Suite
    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_suite_id, 'ECR-SUI-01', 'Accords des adjectifs ?', 1),
        (categorie_suite_id, 'ECR-SUI-02', 'Accords des noms ?', 2),
        (categorie_suite_id, 'ECR-SUI-03', 'Règles de grammaire', 3),
        (categorie_suite_id, 'ECR-SUI-04', 'Présent ?', 4),
        (categorie_suite_id, 'ECR-SUI-05', 'Passé ?', 5),
        (categorie_suite_id, 'ECR-SUI-06', 'Imparfait ?', 6),
        (categorie_suite_id, 'ECR-SUI-07', 'Futur ?', 7),
        (categorie_suite_id, 'ECR-SUI-08', 'Sait-il construire un texte (5/6 lignes) orthographe et structure sans ses outils ?', 8);

    RAISE NOTICE 'Domaine Écriture créé avec 2 catégories et compétences';
END $$;

-- ============================================================================
-- CATÉGORIES - MATHÉMATIQUES
-- ============================================================================

DO $$
DECLARE
    domaine_maths_id UUID;
    categorie_numeration_id UUID;
    categorie_operations_id UUID;
    categorie_fractions_id UUID;
    categorie_mesures_id UUID;
    categorie_proportionnalite_id UUID;
    categorie_temps_id UUID;
    categorie_espace_id UUID;
BEGIN
    -- Récupérer l'ID du domaine Mathématiques
    SELECT id INTO domaine_maths_id FROM formation_domaines WHERE nom = 'Mathématiques';

    -- Catégorie: Numération
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Numération', 'Compétences de numération et nombres', 1)
    RETURNING id INTO categorie_numeration_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_numeration_id, 'MATH-NUM-01', 'Chiffres romains', 1);

    -- Catégorie: Opérations
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise des opérations', 'Addition, soustraction, multiplication, division', 2)
    RETURNING id INTO categorie_operations_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_operations_id, 'MATH-OPS-01', 'Addition avec retenue', 1),
        (categorie_operations_id, 'MATH-OPS-02', 'Soustraction', 2),
        (categorie_operations_id, 'MATH-OPS-03', 'Multiplication avec retenue', 3),
        (categorie_operations_id, 'MATH-OPS-04', 'Multiplications à un chiffre', 4),
        (categorie_operations_id, 'MATH-OPS-05', 'Multiplications à plusieurs chiffres', 5),
        (categorie_operations_id, 'MATH-OPS-06', 'Utilise de première calculette', 6),
        (categorie_operations_id, 'MATH-OPS-07', 'Division à plusieurs chiffres', 7),
        (categorie_operations_id, 'MATH-OPS-08', 'Fractions de décimaux à un ou plusieurs chiffres', 8);

    -- Catégorie: Fractions
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise des fractions', 'Fractions et opérations avec fractions', 3)
    RETURNING id INTO categorie_fractions_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_fractions_id, 'MATH-FRAC-01', 'Les fractions', 1),
        (categorie_fractions_id, 'MATH-FRAC-02', 'Opérations avec fractions simples', 2);

    -- Catégorie: Mesures
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise de la mesure', 'Longueur, masse, capacité, volumes', 4)
    RETURNING id INTO categorie_mesures_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_mesures_id, 'MATH-MES-01', 'Avec dates, km.', 1),
        (categorie_mesures_id, 'MATH-MES-02', 'La longueur', 2),
        (categorie_mesures_id, 'MATH-MES-03', 'Le parcours', 3),
        (categorie_mesures_id, 'MATH-MES-04', 'Le périmètre', 4),
        (categorie_mesures_id, 'MATH-MES-05', 'L''euro', 5),
        (categorie_mesures_id, 'MATH-MES-06', 'La masse', 6),
        (categorie_mesures_id, 'MATH-MES-07', 'La capacité', 7),
        (categorie_mesures_id, 'MATH-MES-08', 'Les volumes', 8);

    -- Catégorie: Proportionnalité
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise de la proportionnalité', 'Pourcentages et proportions', 5)
    RETURNING id INTO categorie_proportionnalite_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_proportionnalite_id, 'MATH-PROP-01', 'Pourcentage', 1);

    -- Catégorie: Temps
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise du temps', 'Mesure du temps, horaires', 6)
    RETURNING id INTO categorie_temps_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_temps_id, 'MATH-TPS-01', 'Apprend à mesure', 1),
        (categorie_temps_id, 'MATH-TPS-02', 'L''emploi du temps, les horaires (analogique / digital)', 2);

    -- Catégorie: Espace
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (domaine_maths_id, 'Maîtrise de l''espace', 'Plans, repérage spatial', 7)
    RETURNING id INTO categorie_espace_id;

    INSERT INTO formation_competences (categorie_id, code, intitule, ordre) VALUES
        (categorie_espace_id, 'MATH-ESP-01', 'Plan', 1),
        (categorie_espace_id, 'MATH-ESP-02', 'Plan de la ville', 2);

    RAISE NOTICE 'Domaine Mathématiques créé avec 7 catégories et compétences';
END $$;

-- ============================================================================
-- CONFIRMATION
-- ============================================================================

DO $$
DECLARE
    count_domaines INTEGER;
    count_categories INTEGER;
    count_competences INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_domaines FROM formation_domaines;
    SELECT COUNT(*) INTO count_categories FROM formation_categories_competences;
    SELECT COUNT(*) INTO count_competences FROM formation_competences;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 20251010000001_seed_formation_data.sql appliquée avec succès';
    RAISE NOTICE 'Domaines créés: %', count_domaines;
    RAISE NOTICE 'Catégories créées: %', count_categories;
    RAISE NOTICE 'Compétences créées: %', count_competences;
    RAISE NOTICE '===========================================';
END $$;
