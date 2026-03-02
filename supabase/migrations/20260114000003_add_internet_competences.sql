-- ============================================================================
-- MIGRATION: Compétences Internet
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Ajoute les catégories et compétences pour le domaine Internet
-- Basé sur: Profils I0, I1, I2, I3
-- ============================================================================

-- 1. CRÉER LES CATÉGORIES POUR INTERNET
INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Bases Internet',
    'Comprendre et accéder à Internet',
    1
FROM formation_domaines d
WHERE d.nom = 'Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Navigation web',
    'Naviguer et rechercher sur Internet',
    2
FROM formation_domaines d
WHERE d.nom = 'Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Messagerie',
    'Utilisation de l''email',
    3
FROM formation_domaines d
WHERE d.nom = 'Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Démarches en ligne',
    'Services administratifs et e-commerce',
    4
FROM formation_domaines d
WHERE d.nom = 'Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Sécurité numérique',
    'Protection des données et vigilance',
    5
FROM formation_domaines d
WHERE d.nom = 'Internet'
ON CONFLICT DO NOTHING;

-- 2. COMPÉTENCES BASES INTERNET
-- Degré 1 (I0)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-BASE-01',
    'Comprendre ce qu''est Internet',
    'Savoir expliquer simplement ce qu''est Internet et à quoi ça sert',
    1,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Bases Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-BASE-02',
    'Ouvrir un navigateur',
    'Identifier et lancer un navigateur web (Chrome, Firefox, Edge)',
    1,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Bases Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-BASE-03',
    'Taper une adresse web',
    'Saisir une URL dans la barre d''adresse et accéder à un site',
    1,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Bases Internet'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-BASE-04',
    'Connaître les risques de base',
    'Comprendre les dangers potentiels d''Internet (arnaques, virus)',
    1,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Bases Internet'
ON CONFLICT DO NOTHING;

-- 3. COMPÉTENCES NAVIGATION WEB
-- Degré 2 (I1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-01',
    'Utiliser un moteur de recherche',
    'Effectuer une recherche sur Google ou autre moteur',
    2,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-02',
    'Naviguer entre les pages',
    'Utiliser les liens, le bouton retour et les onglets',
    2,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-03',
    'Créer un compte sur un site',
    'S''inscrire sur un site avec email et mot de passe',
    2,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-04',
    'Reconnaître un site sécurisé',
    'Identifier le cadenas et le https dans l''adresse',
    2,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

-- Degré 3 (I2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-05',
    'Gérer les favoris',
    'Ajouter, organiser et utiliser les favoris/marque-pages',
    3,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-NAV-06',
    'Télécharger un fichier',
    'Télécharger et retrouver un fichier depuis Internet',
    3,
    6
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Navigation web'
ON CONFLICT DO NOTHING;

-- 4. COMPÉTENCES MESSAGERIE
-- Degré 3 (I2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-MAIL-01',
    'Créer une adresse email',
    'Créer un compte email (Gmail, Outlook, Yahoo)',
    3,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Messagerie'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-MAIL-02',
    'Envoyer et recevoir des emails',
    'Rédiger, envoyer et lire des emails',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Messagerie'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-MAIL-03',
    'Joindre un fichier à un email',
    'Ajouter une pièce jointe à un message',
    3,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Messagerie'
ON CONFLICT DO NOTHING;

-- Degré 4 (I3)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-MAIL-04',
    'Organiser sa boîte mail',
    'Créer des dossiers, trier et archiver les messages',
    4,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Messagerie'
ON CONFLICT DO NOTHING;

-- 5. COMPÉTENCES DÉMARCHES EN LIGNE
-- Degré 3 (I2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-ADM-01',
    'Accéder aux sites administratifs',
    'Se connecter à CAF, Pôle Emploi, Ameli, impots.gouv.fr',
    3,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Démarches en ligne'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-ADM-02',
    'Effectuer une démarche simple',
    'Faire une déclaration ou une demande en ligne',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Démarches en ligne'
ON CONFLICT DO NOTHING;

-- Degré 4 (I3)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-ADM-03',
    'Remplir un formulaire complexe',
    'Compléter des formulaires avec pièces justificatives',
    4,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Démarches en ligne'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-ADM-04',
    'Acheter en ligne en sécurité',
    'Effectuer des achats sur des sites de confiance',
    4,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Démarches en ligne'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-ADM-05',
    'Utiliser les réseaux sociaux',
    'Créer un profil et communiquer de manière responsable',
    4,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Démarches en ligne'
ON CONFLICT DO NOTHING;

-- 6. COMPÉTENCES SÉCURITÉ NUMÉRIQUE
-- Degré 2 (I1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-SEC-01',
    'Créer un mot de passe sécurisé',
    'Choisir un mot de passe robuste et unique',
    2,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Sécurité numérique'
ON CONFLICT DO NOTHING;

-- Degré 3 (I2)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-SEC-02',
    'Reconnaître un email suspect',
    'Identifier les tentatives de phishing et arnaques',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Sécurité numérique'
ON CONFLICT DO NOTHING;

-- Degré 4 (I3)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-SEC-03',
    'Protéger ses données personnelles',
    'Gérer les paramètres de confidentialité et cookies',
    4,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Sécurité numérique'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'INT-SEC-04',
    'Gérer ses mots de passe',
    'Utiliser un gestionnaire de mots de passe',
    4,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Internet' AND cat.nom = 'Sécurité numérique'
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
    WHERE d.nom = 'Internet';

    RAISE NOTICE 'Migration 20260114000003: % compétences Internet créées', v_count;
END $$;
