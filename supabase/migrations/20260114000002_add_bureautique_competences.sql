-- ============================================================================
-- MIGRATION: Compétences Bureautique
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Ajoute les catégories et compétences pour le domaine Bureautique
-- Basé sur: Profils N0, N1, N2A, N2B
-- ============================================================================

-- 1. CRÉER LES CATÉGORIES POUR BUREAUTIQUE
INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Bases informatiques',
    'Manipulation de base de l''ordinateur (souris, clavier, bureau)',
    1
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Gestion de fichiers',
    'Créer, organiser et manipuler les fichiers et dossiers',
    2
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Traitement de texte',
    'Utilisation de Word ou équivalent',
    3
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Tableur',
    'Utilisation d''Excel ou équivalent',
    4
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
ON CONFLICT DO NOTHING;

INSERT INTO formation_categories_competences (domaine_id, nom, description, ordre)
SELECT
    d.id,
    'Présentation',
    'Utilisation de PowerPoint ou équivalent',
    5
FROM formation_domaines d
WHERE d.nom = 'Bureautique'
ON CONFLICT DO NOTHING;

-- 2. COMPÉTENCES BASES INFORMATIQUES
-- Degré 1 (N0)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-01',
    'Allumer et éteindre l''ordinateur',
    'Savoir démarrer et arrêter correctement un ordinateur',
    1,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-02',
    'Utiliser la souris',
    'Maîtriser le clic, double-clic, clic droit et le glisser-déposer',
    1,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-03',
    'Utiliser le clavier',
    'Connaître les touches principales (lettres, chiffres, entrée, suppr, espace)',
    1,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-04',
    'Reconnaître les éléments du bureau',
    'Identifier les icônes, la barre des tâches, le menu démarrer',
    1,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

-- Degré 2 (N1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-05',
    'Ouvrir et fermer des applications',
    'Lancer un programme et le fermer correctement',
    2,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-BASE-06',
    'Utiliser plusieurs fenêtres',
    'Basculer entre plusieurs applications ouvertes',
    2,
    6
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Bases informatiques'
ON CONFLICT DO NOTHING;

-- 3. COMPÉTENCES GESTION DE FICHIERS
-- Degré 2 (N1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-FICH-01',
    'Créer et enregistrer un fichier',
    'Créer un nouveau document et l''enregistrer',
    2,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Gestion de fichiers'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-FICH-02',
    'Créer et organiser des dossiers',
    'Créer des dossiers et y ranger des fichiers',
    2,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Gestion de fichiers'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-FICH-03',
    'Copier, couper et coller',
    'Utiliser les fonctions copier, couper et coller pour fichiers et texte',
    2,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Gestion de fichiers'
ON CONFLICT DO NOTHING;

-- Degré 3 (N2A)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-FICH-04',
    'Rechercher un fichier',
    'Utiliser la fonction de recherche pour retrouver un fichier',
    3,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Gestion de fichiers'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-FICH-05',
    'Utiliser une clé USB',
    'Brancher une clé USB, y copier des fichiers et la retirer en sécurité',
    3,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Gestion de fichiers'
ON CONFLICT DO NOTHING;

-- 4. COMPÉTENCES TRAITEMENT DE TEXTE
-- Degré 2 (N1)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-01',
    'Créer un document texte simple',
    'Ouvrir Word, saisir du texte et enregistrer',
    2,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

-- Degré 3 (N2A)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-02',
    'Mettre en forme un texte',
    'Appliquer gras, italique, souligné, changer la taille et la police',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-03',
    'Créer un tableau simple dans Word',
    'Insérer un tableau et y saisir des informations',
    3,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-04',
    'Insérer une image',
    'Ajouter une image dans un document Word',
    3,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

-- Degré 4 (N2B)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-05',
    'Créer un document complexe',
    'Utiliser en-têtes, pieds de page, numérotation',
    4,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TXT-06',
    'Utiliser les styles et la mise en page',
    'Appliquer des styles, gérer les marges et l''orientation',
    4,
    6
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Traitement de texte'
ON CONFLICT DO NOTHING;

-- 5. COMPÉTENCES TABLEUR
-- Degré 3 (N2A)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TAB-01',
    'Créer un tableau Excel simple',
    'Ouvrir Excel, saisir des données dans les cellules',
    3,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Tableur'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TAB-02',
    'Effectuer des calculs basiques',
    'Utiliser les fonctions SOMME et MOYENNE',
    3,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Tableur'
ON CONFLICT DO NOTHING;

-- Degré 4 (N2B)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TAB-03',
    'Utiliser des formules Excel',
    'Créer des formules avec références de cellules',
    4,
    3
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Tableur'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TAB-04',
    'Créer des graphiques',
    'Transformer des données en graphiques simples',
    4,
    4
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Tableur'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-TAB-05',
    'Trier et filtrer des données',
    'Utiliser les fonctions de tri et de filtre',
    4,
    5
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Tableur'
ON CONFLICT DO NOTHING;

-- 6. COMPÉTENCES PRÉSENTATION
-- Degré 4 (N2B)
INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-PRES-01',
    'Créer une présentation PowerPoint',
    'Créer des diapositives avec texte et images',
    4,
    1
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Présentation'
ON CONFLICT DO NOTHING;

INSERT INTO formation_competences (categorie_id, code, intitule, description, degre_anlci, ordre)
SELECT
    cat.id,
    'BUR-PRES-02',
    'Appliquer un thème et des transitions',
    'Personnaliser l''apparence de la présentation',
    4,
    2
FROM formation_categories_competences cat
JOIN formation_domaines d ON cat.domaine_id = d.id
WHERE d.nom = 'Bureautique' AND cat.nom = 'Présentation'
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
    WHERE d.nom = 'Bureautique';

    RAISE NOTICE 'Migration 20260114000002: % compétences Bureautique créées', v_count;
END $$;
