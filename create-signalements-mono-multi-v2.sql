-- Créer la table signalements_mono_multi cohérente avec signalements_syllabification

CREATE TABLE IF NOT EXISTS signalements_mono_multi (
    id BIGSERIAL PRIMARY KEY,
    mot VARCHAR(255) NOT NULL,
    classification_utilisateur VARCHAR(10) NOT NULL, -- 'mono' ou 'multi' (cohérent avec mots_classifies)
    classification_systeme VARCHAR(10) NOT NULL,     -- 'mono' ou 'multi'
    utilisateur VARCHAR(255),
    date_signalement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traite BOOLEAN DEFAULT FALSE,
    commentaire_admin TEXT,
    texte_origine VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_signalements_mono_multi_mot ON signalements_mono_multi(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_mono_multi_traite ON signalements_mono_multi(traite);
CREATE INDEX IF NOT EXISTS idx_signalements_mono_multi_date ON signalements_mono_multi(date_signalement);

-- Vérifier la structure créée
SELECT 'Table signalements_mono_multi créée avec succès' as status;