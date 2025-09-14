-- Ajouter les champs manquants dans les tables existantes

-- 1. Ajouter updated_at à la table signalements_syllabification
ALTER TABLE signalements_syllabification 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Créer ou compléter la table corrections_syllabification 
CREATE TABLE IF NOT EXISTS corrections_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL UNIQUE,
    segmentation_correcte TEXT[] NOT NULL,
    type_correction VARCHAR(20) DEFAULT 'syllabification',
    statut VARCHAR(20) DEFAULT 'actif',
    source VARCHAR(50) DEFAULT 'admin',
    admin_correcteur TEXT,
    signalement_origine_id INTEGER REFERENCES signalements_syllabification(id),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_applications INTEGER DEFAULT 0,
    commentaire TEXT
);

-- 3. Créer ou compléter la table corrections_mono_multi
CREATE TABLE IF NOT EXISTS corrections_mono_multi (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL UNIQUE,
    classification_correcte VARCHAR(20) NOT NULL,
    ancienne_classification VARCHAR(20),
    source VARCHAR(50) DEFAULT 'admin',
    admin_correcteur TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_applications INTEGER DEFAULT 0,
    commentaire TEXT
);

-- 4. Ajouter les index de base
CREATE INDEX IF NOT EXISTS idx_corrections_syllabification_mot ON corrections_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_corrections_mono_multi_mot ON corrections_mono_multi(mot);

-- Message de confirmation
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Champs updated_at ajoutés aux tables';
    RAISE NOTICE '✅ Tables corrections créées avec tous les champs nécessaires';
    RAISE NOTICE '🎯 Le système devrait maintenant fonctionner sans erreurs de champs manquants';
END $$;