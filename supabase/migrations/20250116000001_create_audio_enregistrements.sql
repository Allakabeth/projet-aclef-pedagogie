-- Création de la table pour stocker les enregistrements audio des apprenants
-- Chaque apprenant peut enregistrer sa voix pour chaque groupe de sens d'un texte

CREATE TABLE IF NOT EXISTS audio_enregistrements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texte_id UUID NOT NULL REFERENCES textes_references(id) ON DELETE CASCADE,
    groupe_sens_id UUID NOT NULL REFERENCES groupes_sens(id) ON DELETE CASCADE,
    audio_data TEXT NOT NULL, -- Stockage en base64
    duree_secondes DECIMAL(5,2), -- Durée de l'enregistrement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Un seul enregistrement par apprenant par groupe de sens
    UNIQUE(apprenant_id, groupe_sens_id)
);

-- Index pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_audio_enregistrements_apprenant ON audio_enregistrements(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_audio_enregistrements_texte ON audio_enregistrements(texte_id);
CREATE INDEX IF NOT EXISTS idx_audio_enregistrements_groupe ON audio_enregistrements(groupe_sens_id);

-- RLS (Row Level Security)
ALTER TABLE audio_enregistrements ENABLE ROW LEVEL SECURITY;

-- Politique : Un apprenant peut voir, créer, modifier et supprimer uniquement ses propres enregistrements
CREATE POLICY "Apprenants peuvent gérer leurs enregistrements"
    ON audio_enregistrements
    FOR ALL
    USING (apprenant_id = auth.uid())
    WITH CHECK (apprenant_id = auth.uid());

-- Politique : Les admins peuvent tout voir et gérer
CREATE POLICY "Admins peuvent tout gérer"
    ON audio_enregistrements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_audio_enregistrements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audio_enregistrements_updated_at
    BEFORE UPDATE ON audio_enregistrements
    FOR EACH ROW
    EXECUTE FUNCTION update_audio_enregistrements_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE audio_enregistrements IS 'Enregistrements vocaux des apprenants pour chaque groupe de sens';
COMMENT ON COLUMN audio_enregistrements.audio_data IS 'Audio encodé en base64 (format webm/ogg)';
COMMENT ON COLUMN audio_enregistrements.duree_secondes IS 'Durée de l''enregistrement en secondes';
