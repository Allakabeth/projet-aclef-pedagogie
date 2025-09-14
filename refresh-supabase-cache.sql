-- Forcer le rafraîchissement du cache de schéma Supabase

-- 1. Faire un SELECT pour forcer la détection des nouvelles colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'corrections_syllabification';

-- 2. Tester un SELECT avec les nouvelles colonnes
SELECT id, mot, segmentation_correcte, updated_at, date_modification
FROM corrections_syllabification 
LIMIT 1;

-- 3. Si la table n'existe pas encore, la créer maintenant
CREATE TABLE IF NOT EXISTS corrections_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL UNIQUE,
    segmentation_correcte TEXT[] NOT NULL,
    statut VARCHAR(20) DEFAULT 'actif',
    source VARCHAR(50) DEFAULT 'admin',
    admin_correcteur TEXT,
    signalement_origine_id INTEGER,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_applications INTEGER DEFAULT 0,
    commentaire TEXT
);

-- 4. Temporairement désactiver RLS sur ces tables pour tester
ALTER TABLE corrections_syllabification DISABLE ROW LEVEL SECURITY;
ALTER TABLE corrections_mono_multi DISABLE ROW LEVEL SECURITY;

-- 5. Test d'insertion pour valider
INSERT INTO corrections_syllabification (mot, segmentation_correcte, admin_correcteur, commentaire)
VALUES ('test', ARRAY['test'], 'admin', 'Test de validation du schéma')
ON CONFLICT (mot) DO UPDATE SET 
    updated_at = CURRENT_TIMESTAMP,
    commentaire = 'Test mise à jour';

-- 6. Nettoyer le test
DELETE FROM corrections_syllabification WHERE mot = 'test';