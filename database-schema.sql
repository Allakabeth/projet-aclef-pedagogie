-- Structure BDD pour les textes de référence avec groupes de sens

-- Table principale des textes de référence
CREATE TABLE IF NOT EXISTS textes_references (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Métadonnées du texte
    nombre_groupes INTEGER DEFAULT 0,
    nombre_mots_total INTEGER DEFAULT 0,
    nombre_mots_multi_syllabes INTEGER DEFAULT 0
);

-- Table des groupes de sens
CREATE TABLE IF NOT EXISTS groupes_sens (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    ordre_groupe INTEGER NOT NULL, -- Position du groupe dans le texte
    contenu TEXT NOT NULL, -- Le texte du groupe
    type_groupe VARCHAR(20) DEFAULT 'text', -- 'text' ou 'linebreak'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des mots extraits (pour l'entraînement)
CREATE TABLE IF NOT EXISTS mots_extraits (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    groupe_sens_id INTEGER REFERENCES groupes_sens(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL, -- Version minuscule, sans accents
    nombre_syllabes INTEGER NOT NULL,
    position_dans_groupe INTEGER NOT NULL, -- Position du mot dans le groupe
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des syllabes-mots (mots monosyllabiques complets)
CREATE TABLE IF NOT EXISTS syllabes_mots (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    mot_complet VARCHAR(50) NOT NULL, -- Le mot monosyllabique entier
    mot_normalise VARCHAR(50) NOT NULL, -- Version normalisée
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des syllabes (morceaux des mots polysyllabiques)
CREATE TABLE IF NOT EXISTS syllabes (
    id SERIAL PRIMARY KEY,
    mot_extrait_id INTEGER REFERENCES mots_extraits(id) ON DELETE CASCADE,
    syllabe VARCHAR(50) NOT NULL,
    position_syllabe INTEGER NOT NULL, -- 1, 2, 3...
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des mots classifiés (mono/multi) par les utilisateurs
CREATE TABLE IF NOT EXISTS mots_classifies (
    id SERIAL PRIMARY KEY,
    texte_reference_id INTEGER REFERENCES textes_references(id) ON DELETE CASCADE,
    apprenant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mot VARCHAR(100) NOT NULL,
    mot_normalise VARCHAR(100) NOT NULL, -- Version minuscule, sans accents
    classification VARCHAR(10) NOT NULL, -- 'mono' ou 'multi'
    valide_par_admin BOOLEAN DEFAULT FALSE,
    score_utilisateur INTEGER DEFAULT NULL, -- Score obtenu sur ce mot (1=correct, 0=incorrect)
    created_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP DEFAULT NULL,
    validated_by INTEGER REFERENCES users(id) -- Admin qui a validé
);

-- Table des demandes de corrections d'utilisateurs
CREATE TABLE IF NOT EXISTS corrections_demandees (
    id SERIAL PRIMARY KEY,
    mot_classifie_id INTEGER REFERENCES mots_classifies(id) ON DELETE CASCADE,
    demandeur_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    classification_actuelle VARCHAR(10) NOT NULL, -- 'mono' ou 'multi'
    correction_proposee VARCHAR(10) NOT NULL, -- 'mono' ou 'multi'
    raison TEXT, -- Optionnel : raison de la demande
    statut VARCHAR(20) DEFAULT 'en_attente', -- 'en_attente', 'accepte', 'rejete'
    created_at TIMESTAMP DEFAULT NOW(),
    traite_at TIMESTAMP DEFAULT NULL,
    traite_by INTEGER REFERENCES users(id), -- Admin qui a traité
    commentaire_admin TEXT -- Commentaire de l'admin
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_textes_references_apprenant ON textes_references(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_groupes_sens_texte ON groupes_sens(texte_reference_id, ordre_groupe);
CREATE INDEX IF NOT EXISTS idx_mots_extraits_texte ON mots_extraits(texte_reference_id);
CREATE INDEX IF NOT EXISTS idx_mots_extraits_mot ON mots_extraits(mot_normalise);
CREATE INDEX IF NOT EXISTS idx_syllabes_mots_texte ON syllabes_mots(texte_reference_id);
CREATE INDEX IF NOT EXISTS idx_syllabes_mot ON syllabes(mot_extrait_id, position_syllabe);
CREATE INDEX IF NOT EXISTS idx_mots_classifies_texte ON mots_classifies(texte_reference_id);
CREATE INDEX IF NOT EXISTS idx_mots_classifies_apprenant ON mots_classifies(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_mots_classifies_valide ON mots_classifies(valide_par_admin);
CREATE INDEX IF NOT EXISTS idx_corrections_statut ON corrections_demandees(statut);
CREATE INDEX IF NOT EXISTS idx_corrections_demandeur ON corrections_demandees(demandeur_id);