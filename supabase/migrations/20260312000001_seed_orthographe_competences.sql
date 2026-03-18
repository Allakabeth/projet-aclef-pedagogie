-- ============================================================================
-- MIGRATION: Compétences Orthographe grammaticale (Boîtes Bleues)
-- Date: 2026-03-12
-- Projet: ACLEF-Pédagogie
-- Description: Ajout d'une catégorie "Orthographe grammaticale" sous le
--              domaine Écriture, avec 20 compétences fines mappant les
--              thèmes des fiches Boîtes Bleues
-- ============================================================================

DO $$
DECLARE
    domaine_ecriture_id UUID;
    categorie_ortho_id UUID;
BEGIN
    -- Récupérer l'ID du domaine Écriture
    SELECT id INTO domaine_ecriture_id FROM formation_domaines WHERE nom = 'Écriture';

    IF domaine_ecriture_id IS NULL THEN
        RAISE EXCEPTION 'Domaine Écriture non trouvé. Assurez-vous que le seed formation_data a été appliqué.';
    END IF;

    -- Créer la catégorie Orthographe grammaticale (ordre 3, après Acquisition et Suite)
    INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
    VALUES (
        domaine_ecriture_id,
        'Orthographe grammaticale',
        'Compétences d''orthographe grammaticale issues des Boîtes Bleues - exercices progressifs de niveau A à C',
        3
    )
    RETURNING id INTO categorie_ortho_id;

    -- ========================================================================
    -- COMPÉTENCES : Articles et déterminants
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-01',
         'Articles définis (le, la, l'', les)',
         'Savoir choisir le bon article défini selon le genre et le nombre du nom',
         1),

        (categorie_ortho_id, 'ECR-OG-02',
         'Articles indéfinis (un, une, des)',
         'Savoir choisir le bon article indéfini selon le genre et le nombre du nom',
         2),

        (categorie_ortho_id, 'ECR-OG-03',
         'Possessifs (mon/ma/mes, ton/ta/tes, son/sa/ses)',
         'Savoir utiliser les adjectifs possessifs en fonction du genre, du nombre et de la personne',
         3),

        (categorie_ortho_id, 'ECR-OG-04',
         'Démonstratifs (ce, cet, cette, ces)',
         'Savoir utiliser les adjectifs démonstratifs en contexte',
         4);

    -- ========================================================================
    -- COMPÉTENCES : Pronoms
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-05',
         'Pronoms personnels sujets',
         'Savoir utiliser je, tu, il/elle, on, nous, vous, ils/elles dans une phrase',
         5);

    -- ========================================================================
    -- COMPÉTENCES : Accords (genre et nombre)
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-06',
         'Singulier et pluriel des noms',
         'Savoir accorder le nom au singulier ou au pluriel selon le contexte',
         6),

        (categorie_ortho_id, 'ECR-OG-07',
         'Masculin et féminin',
         'Savoir identifier et produire le masculin et le féminin des noms et adjectifs',
         7),

        (categorie_ortho_id, 'ECR-OG-08',
         'Accords des adjectifs',
         'Savoir accorder l''adjectif en genre et en nombre avec le nom qu''il qualifie',
         8);

    -- ========================================================================
    -- COMPÉTENCES : Homophones grammaticaux
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-09',
         'Homophones a/à',
         'Distinguer le verbe avoir (a) de la préposition (à)',
         9),

        (categorie_ortho_id, 'ECR-OG-10',
         'Homophones on/ont',
         'Distinguer le pronom (on) du verbe avoir (ont)',
         10),

        (categorie_ortho_id, 'ECR-OG-11',
         'Homophones et/est',
         'Distinguer la conjonction (et) du verbe être (est)',
         11),

        (categorie_ortho_id, 'ECR-OG-12',
         'Homophones son/sont, ou/où',
         'Distinguer son/sont (possessif vs verbe être) et ou/où (conjonction vs lieu)',
         12);

    -- ========================================================================
    -- COMPÉTENCES : Vocabulaire
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-13',
         'Contraires et synonymes',
         'Savoir identifier et produire les contraires (antonymes) et synonymes d''un mot',
         13),

        (categorie_ortho_id, 'ECR-OG-14',
         'Familles de mots',
         'Savoir reconnaître et produire des mots de la même famille (dérivation)',
         14);

    -- ========================================================================
    -- COMPÉTENCES : Syntaxe et construction
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-15',
         'Conjonctions (mais, et, ou)',
         'Savoir utiliser les conjonctions de coordination pour relier des phrases',
         15),

        (categorie_ortho_id, 'ECR-OG-16',
         'Négation',
         'Savoir construire la forme négative (ne...pas, ne...plus, ne...jamais)',
         16),

        (categorie_ortho_id, 'ECR-OG-17',
         'Construction de phrases (syntaxe)',
         'Savoir ordonner les mots pour construire une phrase correcte avec majuscule et ponctuation',
         17);

    -- ========================================================================
    -- COMPÉTENCES : Conjugaison
    -- ========================================================================

    INSERT INTO formation_competences (categorie_id, code, intitule, description, ordre) VALUES
        (categorie_ortho_id, 'ECR-OG-18',
         'Conjugaison présent',
         'Savoir conjuguer les verbes courants au présent de l''indicatif',
         18),

        (categorie_ortho_id, 'ECR-OG-19',
         'Conjugaison passé composé',
         'Savoir conjuguer les verbes courants au passé composé',
         19),

        (categorie_ortho_id, 'ECR-OG-20',
         'Conjugaison imparfait et futur',
         'Savoir conjuguer les verbes courants à l''imparfait et au futur simple',
         20);

    RAISE NOTICE 'Catégorie "Orthographe grammaticale" créée avec 20 compétences sous le domaine Écriture';
END $$;
