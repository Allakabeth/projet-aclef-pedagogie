-- ==============================================
-- Configuration du système de corrections centralisées
-- ==============================================

-- 1. Table des signalements (déjà créée précédemment)
CREATE TABLE IF NOT EXISTS signalements_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL,
    segmentation_utilisateur TEXT[] NOT NULL,
    segmentation_systeme TEXT[] NOT NULL,
    utilisateur TEXT,
    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traite BOOLEAN DEFAULT FALSE,
    commentaire_admin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des corrections centralisées pour la syllabification
CREATE TABLE IF NOT EXISTS corrections_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL UNIQUE, -- Un seul enregistrement par mot
    segmentation_correcte TEXT[] NOT NULL,
    type_correction VARCHAR(20) DEFAULT 'syllabification', -- syllabification, mono_multi
    statut VARCHAR(20) DEFAULT 'actif', -- actif, inactif, test
    source VARCHAR(50) DEFAULT 'admin', -- admin, signalement, automatique
    admin_correcteur TEXT,
    signalement_origine_id INTEGER REFERENCES signalements_syllabification(id),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_applications INTEGER DEFAULT 0, -- Nombre de fois que cette correction a été appliquée
    commentaire TEXT
);

-- 3. Table des corrections mono/multi-syllabes
CREATE TABLE IF NOT EXISTS corrections_mono_multi (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL UNIQUE,
    classification_correcte VARCHAR(20) NOT NULL, -- 'monosyllabe' ou 'multisyllabe'
    ancienne_classification VARCHAR(20),
    source VARCHAR(50) DEFAULT 'admin',
    admin_correcteur TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_applications INTEGER DEFAULT 0,
    commentaire TEXT
);

-- 4. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_corrections_syllabification_mot ON corrections_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_corrections_syllabification_statut ON corrections_syllabification(statut);
CREATE INDEX IF NOT EXISTS idx_corrections_mono_multi_mot ON corrections_mono_multi(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_mot ON signalements_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_traite ON signalements_syllabification(traite);
CREATE INDEX IF NOT EXISTS idx_signalements_date ON signalements_syllabification(date_signalement);

-- 5. Fonction pour mettre à jour automatiquement les timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Triggers pour les timestamps automatiques
CREATE TRIGGER update_corrections_syllabification_modtime 
    BEFORE UPDATE ON corrections_syllabification 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_corrections_mono_multi_modtime 
    BEFORE UPDATE ON corrections_mono_multi 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_signalements_modtime 
    BEFORE UPDATE ON signalements_syllabification 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 7. Vues pour faciliter les requêtes
CREATE OR REPLACE VIEW v_corrections_actives AS
SELECT 
    'syllabification' as type_correction,
    mot,
    segmentation_correcte as correction,
    NULL as classification,
    source,
    admin_correcteur,
    date_creation,
    nombre_applications,
    commentaire
FROM corrections_syllabification 
WHERE statut = 'actif'
UNION ALL
SELECT 
    'mono_multi' as type_correction,
    mot,
    NULL as correction,
    classification_correcte as classification,
    source,
    admin_correcteur,
    date_creation,
    nombre_applications,
    commentaire
FROM corrections_mono_multi;

-- 8. Fonction pour appliquer une correction et incrémenter le compteur
CREATE OR REPLACE FUNCTION appliquer_correction_syllabification(mot_param TEXT)
RETURNS TEXT[] AS $$
DECLARE
    correction TEXT[];
BEGIN
    -- Récupérer la correction et incrémenter le compteur
    UPDATE corrections_syllabification 
    SET nombre_applications = nombre_applications + 1 
    WHERE mot = mot_param AND statut = 'actif'
    RETURNING segmentation_correcte INTO correction;
    
    RETURN correction;
END;
$$ LANGUAGE plpgsql;

-- 9. Fonction pour appliquer une correction mono/multi
CREATE OR REPLACE FUNCTION appliquer_correction_mono_multi(mot_param TEXT)
RETURNS TEXT AS $$
DECLARE
    classification TEXT;
BEGIN
    -- Récupérer la classification et incrémenter le compteur
    UPDATE corrections_mono_multi 
    SET nombre_applications = nombre_applications + 1 
    WHERE mot = mot_param
    RETURNING classification_correcte INTO classification;
    
    RETURN classification;
END;
$$ LANGUAGE plpgsql;

-- 10. Commentaires pour la documentation
COMMENT ON TABLE signalements_syllabification IS 'Signalements d''erreurs envoyés par les utilisateurs';
COMMENT ON TABLE corrections_syllabification IS 'Corrections centralisées de syllabification appliquées à tous les utilisateurs';
COMMENT ON TABLE corrections_mono_multi IS 'Corrections centralisées de classification mono/multi-syllabes';
COMMENT ON VIEW v_corrections_actives IS 'Vue unifiée de toutes les corrections actives';

-- 11. Données d'exemple pour tester (à supprimer en production)
INSERT INTO corrections_syllabification (mot, segmentation_correcte, source, commentaire) 
VALUES 
    ('châteaux', ARRAY['châ', 'teaux'], 'admin', 'Correction suite à signalement utilisateur'),
    ('enfants', ARRAY['en', 'fants'], 'admin', 'Segmentation pédagogique standard')
ON CONFLICT (mot) DO NOTHING;

INSERT INTO corrections_mono_multi (mot, classification_correcte, source, commentaire)
VALUES 
    ('avec', 'monosyllabe', 'admin', 'Mot courant à ne pas segmenter'),
    ('très', 'monosyllabe', 'admin', 'Monosyllabe standard')
ON CONFLICT (mot) DO NOTHING;

-- 12. Afficher un résumé de la configuration
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Système de corrections centralisées configuré avec succès !';
    RAISE NOTICE 'Tables créées : signalements_syllabification, corrections_syllabification, corrections_mono_multi';
    RAISE NOTICE 'Fonctions créées : appliquer_correction_syllabification, appliquer_correction_mono_multi';
    RAISE NOTICE 'Vue créée : v_corrections_actives';
END $$;