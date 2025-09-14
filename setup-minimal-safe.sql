-- ==============================================
-- Configuration MINIMALE et SÉCURISÉE
-- Seulement la table des signalements pour commencer
-- ==============================================

-- ÉTAPE 1 : Créer seulement la table des signalements (sécurisé)
CREATE TABLE IF NOT EXISTS signalements_syllabification (
    id SERIAL PRIMARY KEY,
    mot TEXT NOT NULL,
    segmentation_utilisateur TEXT[] NOT NULL,
    segmentation_systeme TEXT[] NOT NULL,
    utilisateur TEXT,
    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traite BOOLEAN DEFAULT FALSE,
    commentaire_admin TEXT
);

-- ÉTAPE 2 : Index basique pour les performances (sécurisé)
CREATE INDEX IF NOT EXISTS idx_signalements_mot ON signalements_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_traite ON signalements_syllabification(traite);

-- ÉTAPE 3 : Test simple (sécurisé)
INSERT INTO signalements_syllabification (mot, segmentation_utilisateur, segmentation_systeme, utilisateur) 
VALUES ('test', ARRAY['test'], ARRAY['test'], 'test_user')
ON CONFLICT DO NOTHING;

-- ÉTAPE 4 : Vérification
SELECT COUNT(*) as nombre_signalements FROM signalements_syllabification;

-- Message de confirmation
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Configuration minimale terminée - Table signalements_syllabification créée';
    RAISE NOTICE '⚠️  Les corrections centralisées ne sont pas encore actives (plus sûr)';
    RAISE NOTICE '💡 Les signalements fonctionnent maintenant et sont sauvés en BDD';
END $$;