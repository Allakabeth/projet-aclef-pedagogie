-- ============================================================================
-- SEED: Profils de référence pour le positionnement ACLEF
-- Date: 2026-01-08
-- ============================================================================

-- ============================================================================
-- PROFILS FLE (Public ne pouvant pas communiquer en français oral)
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
-- A1 - Grand débutant FLE
('A1', 'Grand Débutant FLE', 'FLE', 1, 1, '#e74c3c',
 'Public non francophone sans aucune base en français',
 'Aucune compréhension du français oral. Ne peut pas communiquer même pour des besoins élémentaires. Peut être analphabète dans sa langue d''origine.',
 'Alphabétisation + FLE intensif. Apprentissage des bases de la communication orale et écrite.'
),

-- A2 - Débutant FLE
('A2', 'Débutant FLE', 'FLE', 2, 2, '#e67e22',
 'Public non francophone avec compréhension fragmentaire',
 'Compréhension fragmentaire du français. Peut comprendre quelques mots isolés. Communication très limitée.',
 'FLE intensif. Renforcement de la compréhension orale et développement du vocabulaire de base.'
),

-- A3 - Intermédiaire FLE
('A3', 'Intermédiaire FLE', 'FLE', 3, 3, '#f1c40f',
 'Public non francophone avec compréhension partielle',
 'Compréhension partielle du français. Peut comprendre des phrases simples. Communication possible sur des sujets familiers.',
 'FLE perfectionnement. Amélioration de la fluidité et élargissement du vocabulaire.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS ILLETTRISME (Public pouvant communiquer en français oral)
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
-- B1 - Non scolarisé
('B1', 'Non Scolarisé', 'Illettrisme', 1, 1, '#9b59b6',
 'Public francophone n''ayant jamais été scolarisé',
 'N''a jamais appris à lire ni à écrire. Communique parfaitement à l''oral. Peut avoir développé des stratégies de contournement.',
 'Alphabétisation complète. Apprentissage de la lecture et de l''écriture depuis les bases.'
),

-- B2 - Peu scolarisé
('B2', 'Peu Scolarisé', 'Illettrisme', 2, 2, '#8e44ad',
 'Public francophone ayant été peu scolarisé ou ayant oublié',
 'Scolarisation courte ou ancienne. Apprentissages partiellement oubliés. Peut reconnaître quelques mots.',
 'Remise à niveau. Réactivation des apprentissages et consolidation des acquis.'
),

-- BA - Scolarisé avec difficultés
('BA', 'Scolarisé avec Difficultés', 'Illettrisme', 3, 3, '#3498db',
 'Public francophone scolarisé mais avec des difficultés persistantes',
 'Scolarisation normale mais difficultés à l''écrit. Lecture lente, écriture laborieuse. Peut avoir des difficultés spécifiques.',
 'Perfectionnement ciblé. Travail sur les points de blocage et renforcement de l''autonomie.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS LECTURE (Niveaux de compétence en lecture)
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
-- GD - Grand Débutant
('GD', 'Grand Débutant', 'Lecture', 1, 1, '#c0392b',
 'Ne déchiffre pas, ne reconnaît pas les lettres',
 'Ne reconnaît pas les lettres de l''alphabet. Ne peut pas associer les lettres aux sons. Aucune capacité de déchiffrage.',
 'Apprentissage de l''alphabet et des correspondances graphèmes-phonèmes. Travail sur la conscience phonologique.'
),

-- PD - Petit Débutant
('PD', 'Petit Débutant', 'Lecture', 1, 2, '#e74c3c',
 'Reconnaît quelques lettres, déchiffrage très lent',
 'Reconnaît une partie des lettres. Déchiffrage très lent et laborieux. Peut lire quelques syllabes simples.',
 'Consolidation de l''alphabet. Entraînement au déchiffrage syllabique. Automatisation progressive.'
),

-- D - Déchiffreur
('D', 'Déchiffreur', 'Lecture', 2, 3, '#e67e22',
 'Lit syllabe par syllabe, compréhension limitée',
 'Déchiffre syllabe par syllabe. Lecture lente qui limite la compréhension. Peut lire des mots et phrases simples.',
 'Fluidification de la lecture. Travail sur la compréhension. Élargissement du vocabulaire visuel.'
),

-- PLNS - Petit Lecteur Non Scripteur
('PLNS', 'Petit Lecteur Non Scripteur', 'Lecture', 3, 4, '#f39c12',
 'Lit des textes simples mais n''écrit pas',
 'Peut lire des textes simples avec compréhension. Lecture encore lente. Difficultés majeures en écriture.',
 'Amélioration de la fluidité. Travail parallèle sur l''écriture. Lecture de textes variés.'
),

-- LPS - Lecteur Petit Scripteur
('LPS', 'Lecteur Petit Scripteur', 'Lecture', 4, 5, '#27ae60',
 'Lit et écrit avec quelques difficultés',
 'Lit de manière fonctionnelle. Écrit avec des difficultés orthographiques. Autonome pour les écrits simples.',
 'Perfectionnement de la lecture. Amélioration de l''orthographe. Travail sur les écrits complexes.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS ÉCRITURE (Niveaux de compétence en écriture)
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
-- GD Écriture
('GD', 'Grand Débutant', 'Ecriture', 1, 1, '#c0392b',
 'Ne peut pas écrire, ne trace pas les lettres',
 'Ne peut pas tracer les lettres. Aucune correspondance phonie-graphie. Peut avoir des difficultés de motricité fine.',
 'Apprentissage du geste graphique. Correspondances sons-lettres. Copie de lettres et mots.'
),

-- PD Écriture
('PD', 'Petit Débutant', 'Ecriture', 1, 2, '#e74c3c',
 'Trace quelques lettres, copie laborieuse',
 'Peut tracer une partie des lettres. Copie très lente. Ne peut pas écrire sous dictée.',
 'Consolidation du tracé. Entraînement à la copie. Début de l''encodage.'
),

-- D Écriture
('D', 'Déchiffreur', 'Ecriture', 2, 3, '#e67e22',
 'Écrit des mots simples, encodage phonétique',
 'Peut écrire des mots simples en encodant. Écriture phonétique avec erreurs. Phrases très courtes.',
 'Amélioration de l''encodage. Travail sur l''orthographe de base. Production de phrases.'
),

-- PLNS Écriture
('PLNS', 'Petit Lecteur Non Scripteur', 'Ecriture', 3, 4, '#f39c12',
 'Difficultés majeures en production écrite',
 'Peut copier mais difficultés en production. Écriture très laborieuse. Évite les situations d''écriture.',
 'Déblocage de l''écriture. Production guidée. Valorisation des écrits.'
),

-- LPS Écriture
('LPS', 'Lecteur Petit Scripteur', 'Ecriture', 4, 5, '#27ae60',
 'Écrit avec difficultés orthographiques',
 'Peut produire des textes courts. Erreurs orthographiques fréquentes. Autonome pour les écrits simples.',
 'Amélioration orthographique. Production de textes variés. Relecture et correction.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS MATHÉMATIQUES
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
-- M0
('M0', 'Niveau 0', 'Maths', 1, 0, '#95a5a6',
 'Aucune notion mathématique',
 'Ne reconnaît pas les chiffres. Aucune notion de quantité. Pas de manipulation des nombres.',
 'Apprentissage des chiffres. Notion de quantité. Dénombrement de base.'
),

-- M1
('M1', 'Niveau 1', 'Maths', 1, 1, '#e74c3c',
 'Numération jusqu''à 100, opérations simples',
 'Reconnaît les chiffres. Compte jusqu''à 100. Addition et soustraction simples.',
 'Consolidation de la numération. Maîtrise des opérations de base. Problèmes simples.'
),

-- M2
('M2', 'Niveau 2', 'Maths', 2, 2, '#e67e22',
 'Numération jusqu''à 1000, 4 opérations',
 'Numération jusqu''à 1000. Maîtrise les 4 opérations de base. Peut résoudre des problèmes guidés.',
 'Extension de la numération. Automatisation des opérations. Problèmes multi-étapes.'
),

-- M3
('M3', 'Niveau 3', 'Maths', 3, 3, '#f1c40f',
 'Opérations complexes, fractions, pourcentages',
 'Maîtrise les grands nombres. Travaille avec les fractions et pourcentages. Résout des problèmes complexes.',
 'Fractions et décimaux. Proportionnalité. Problèmes de la vie quotidienne.'
),

-- M4
('M4', 'Niveau 4', 'Maths', 4, 4, '#27ae60',
 'Autonomie mathématique complète',
 'Autonome en calcul. Peut utiliser les maths dans des contextes variés. Raisonnement logique développé.',
 'Perfectionnement. Applications professionnelles. Préparation aux certifications.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS BUREAUTIQUE
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
('N0', 'Niveau 0', 'Bureautique', 1, 0, '#95a5a6',
 'Aucune utilisation de l''ordinateur',
 'N''a jamais utilisé d''ordinateur. Ne connaît pas le clavier ni la souris. Peut avoir une appréhension.',
 'Découverte de l''ordinateur. Manipulation souris/clavier. Environnement Windows de base.'
),

('N1', 'Niveau 1', 'Bureautique', 2, 1, '#e67e22',
 'Utilisation basique de l''ordinateur',
 'Sait allumer/éteindre. Utilise la souris. Peut ouvrir des applications simples.',
 'Traitement de texte basique. Gestion des fichiers. Utilisation d''applications courantes.'
),

('N2A', 'Niveau 2A', 'Bureautique', 3, 2, '#f1c40f',
 'Utilisation fonctionnelle',
 'Utilise le traitement de texte. Sait créer et enregistrer des documents. Navigation dans les dossiers.',
 'Approfondissement traitement de texte. Initiation tableur. Organisation des fichiers.'
),

('N2B', 'Niveau 2B', 'Bureautique', 4, 3, '#27ae60',
 'Utilisation avancée',
 'Maîtrise traitement de texte et tableur. Peut créer des documents complexes. Autonome.',
 'Fonctions avancées. Tableur niveau intermédiaire. Préparation certification.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- PROFILS INTERNET
-- ============================================================================

INSERT INTO formation_profils (code, nom, type_public, degre_anlci, ordre, couleur, description, caracteristiques, besoins_formation)
VALUES
('I0', 'Niveau 0', 'Internet', 1, 0, '#95a5a6',
 'Aucune utilisation d''Internet',
 'N''a jamais utilisé Internet. Ne connaît pas les navigateurs. Peut avoir des craintes.',
 'Découverte d''Internet. Navigation de base. Sécurité élémentaire.'
),

('I1', 'Niveau 1', 'Internet', 2, 1, '#e67e22',
 'Navigation basique',
 'Sait ouvrir un navigateur. Peut visiter des sites connus. Utilise les moteurs de recherche simplement.',
 'Recherches efficaces. Utilisation de sites pratiques. Sensibilisation aux risques.'
),

('I2', 'Niveau 2', 'Internet', 3, 2, '#f1c40f',
 'Utilisation fonctionnelle',
 'Navigue de manière autonome. Utilise la messagerie. Peut effectuer des démarches en ligne simples.',
 'Démarches administratives. E-commerce. Réseaux sociaux responsables.'
),

('I3', 'Niveau 3', 'Internet', 4, 3, '#27ae60',
 'Utilisation avancée',
 'Totalement autonome sur Internet. Effectue toutes démarches en ligne. Bonne culture numérique.',
 'Perfectionnement. Services avancés. Citoyenneté numérique.'
)
ON CONFLICT (type_public, code) DO UPDATE SET
    nom = EXCLUDED.nom,
    degre_anlci = EXCLUDED.degre_anlci,
    description = EXCLUDED.description,
    caracteristiques = EXCLUDED.caracteristiques,
    besoins_formation = EXCLUDED.besoins_formation;

-- ============================================================================
-- LIAISON PROFILS ↔ DOMAINES (si domaines existent)
-- ============================================================================

-- Mettre à jour les profils Lecture avec le domaine_id correspondant
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom ILIKE '%Lecture%'
AND p.type_public = 'Lecture';

-- Mettre à jour les profils Écriture
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom ILIKE '%criture%'
AND p.type_public = 'Ecriture';

-- Mettre à jour les profils Maths
UPDATE formation_profils p
SET domaine_id = d.id
FROM formation_domaines d
WHERE d.nom ILIKE '%Math%'
AND p.type_public = 'Maths';

-- ============================================================================
-- CONFIRMATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM formation_profils;
    RAISE NOTICE 'Seed 20260108000001: % profils de référence insérés/mis à jour', v_count;
END $$;
