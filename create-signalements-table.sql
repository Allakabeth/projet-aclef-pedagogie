-- Création de la table pour les signalements de syllabification
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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_signalements_mot ON signalements_syllabification(mot);
CREATE INDEX IF NOT EXISTS idx_signalements_traite ON signalements_syllabification(traite);
CREATE INDEX IF NOT EXISTS idx_signalements_date ON signalements_syllabification(date_signalement);

-- Commentaires
COMMENT ON TABLE signalements_syllabification IS 'Table pour stocker les signalements d''erreurs de syllabification';
COMMENT ON COLUMN signalements_syllabification.mot IS 'Le mot pour lequel l''erreur est signalée';
COMMENT ON COLUMN signalements_syllabification.segmentation_utilisateur IS 'Segmentation proposée par l''utilisateur';
COMMENT ON COLUMN signalements_syllabification.segmentation_systeme IS 'Segmentation du système qui était incorrecte';
COMMENT ON COLUMN signalements_syllabification.utilisateur IS 'Identifiant de l''utilisateur qui signale';
COMMENT ON COLUMN signalements_syllabification.traite IS 'Indique si le signalement a été traité par un admin';