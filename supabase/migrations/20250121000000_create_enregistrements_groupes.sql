-- Migration: Création table enregistrements_groupes + bucket Supabase Storage
-- Date: 2025-01-21
-- Description: Permet aux apprenants d'enregistrer leur voix pour chaque groupe de sens

-- ============================================================================
-- 1. CRÉATION DE LA TABLE enregistrements_groupes
-- ============================================================================

CREATE TABLE IF NOT EXISTS enregistrements_groupes (
    id SERIAL PRIMARY KEY,
    groupe_sens_id INTEGER NOT NULL REFERENCES groupes_sens(id) ON DELETE CASCADE,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,           -- Chemin dans Supabase Storage
    duree_secondes DECIMAL(10,2),      -- Durée de l'enregistrement
    taille_bytes INTEGER,              -- Taille du fichier en octets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contrainte : Un seul enregistrement par apprenant par groupe
    CONSTRAINT unique_enregistrement_par_apprenant_groupe
        UNIQUE(groupe_sens_id, apprenant_id)
);

-- ============================================================================
-- 2. INDEX POUR PERFORMANCES
-- ============================================================================

-- Index sur apprenant_id pour requêtes par utilisateur
CREATE INDEX idx_enregistrements_groupes_apprenant
    ON enregistrements_groupes(apprenant_id);

-- Index sur groupe_sens_id pour requêtes par groupe
CREATE INDEX idx_enregistrements_groupes_groupe
    ON enregistrements_groupes(groupe_sens_id);

-- Index composite pour requêtes fréquentes
CREATE INDEX idx_enregistrements_groupes_apprenant_groupe
    ON enregistrements_groupes(apprenant_id, groupe_sens_id);

-- ============================================================================
-- 3. TRIGGER POUR updated_at
-- ============================================================================

-- Fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_enregistrements_groupes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur UPDATE
CREATE TRIGGER trigger_update_enregistrements_groupes_updated_at
    BEFORE UPDATE ON enregistrements_groupes
    FOR EACH ROW
    EXECUTE FUNCTION update_enregistrements_groupes_updated_at();

-- ============================================================================
-- 4. COMMENTAIRES POUR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE enregistrements_groupes IS
    'Enregistrements audio personnels des apprenants pour chaque groupe de sens';

COMMENT ON COLUMN enregistrements_groupes.groupe_sens_id IS
    'Référence vers le groupe de sens enregistré';

COMMENT ON COLUMN enregistrements_groupes.apprenant_id IS
    'Apprenant ayant réalisé l''enregistrement';

COMMENT ON COLUMN enregistrements_groupes.audio_url IS
    'Chemin du fichier audio dans Supabase Storage (format: [apprenant_id]/[texte_id]/groupe_[groupe_id].webm)';

COMMENT ON COLUMN enregistrements_groupes.duree_secondes IS
    'Durée de l''enregistrement en secondes (calculée côté client)';

COMMENT ON COLUMN enregistrements_groupes.taille_bytes IS
    'Taille du fichier audio en octets';

-- ============================================================================
-- 5. BUCKET SUPABASE STORAGE (à créer via interface ou API)
-- ============================================================================

-- IMPORTANT: Le bucket doit être créé manuellement ou via API Supabase
-- Nom du bucket: 'enregistrements-audio'
-- Configuration recommandée:
--   - public: false (fichiers privés)
--   - fileSizeLimit: 10485760 (10 MB)
--   - allowedMimeTypes: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg']

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE enregistrements_groupes ENABLE ROW LEVEL SECURITY;

-- Politique: Les apprenants peuvent LIRE leurs propres enregistrements
CREATE POLICY "Users can read their own recordings"
    ON enregistrements_groupes
    FOR SELECT
    USING (apprenant_id = auth.uid());

-- Politique: Les apprenants peuvent CRÉER leurs propres enregistrements
CREATE POLICY "Users can create their own recordings"
    ON enregistrements_groupes
    FOR INSERT
    WITH CHECK (apprenant_id = auth.uid());

-- Politique: Les apprenants peuvent METTRE À JOUR leurs propres enregistrements
CREATE POLICY "Users can update their own recordings"
    ON enregistrements_groupes
    FOR UPDATE
    USING (apprenant_id = auth.uid())
    WITH CHECK (apprenant_id = auth.uid());

-- Politique: Les apprenants peuvent SUPPRIMER leurs propres enregistrements
CREATE POLICY "Users can delete their own recordings"
    ON enregistrements_groupes
    FOR DELETE
    USING (apprenant_id = auth.uid());

-- Politique: Les admins peuvent TOUT faire
CREATE POLICY "Admins can manage all recordings"
    ON enregistrements_groupes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- 7. FONCTION UTILITAIRE: Récupérer les enregistrements d'un texte
-- ============================================================================

CREATE OR REPLACE FUNCTION get_enregistrements_by_texte(
    p_texte_id INTEGER,
    p_apprenant_id UUID
)
RETURNS TABLE (
    id INTEGER,
    groupe_sens_id INTEGER,
    ordre_groupe INTEGER,
    audio_url TEXT,
    duree_secondes DECIMAL,
    taille_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.groupe_sens_id,
        g.ordre_groupe,
        e.audio_url,
        e.duree_secondes,
        e.taille_bytes,
        e.created_at
    FROM enregistrements_groupes e
    INNER JOIN groupes_sens g ON e.groupe_sens_id = g.id
    WHERE g.texte_reference_id = p_texte_id
      AND e.apprenant_id = p_apprenant_id
    ORDER BY g.ordre_groupe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_enregistrements_by_texte IS
    'Récupère tous les enregistrements d''un apprenant pour un texte donné, triés par ordre des groupes';

-- ============================================================================
-- 8. VÉRIFICATIONS
-- ============================================================================

-- Vérifier que la table a été créée
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'enregistrements_groupes'
    ) THEN
        RAISE NOTICE '✅ Table enregistrements_groupes créée avec succès';
    ELSE
        RAISE EXCEPTION '❌ Échec de la création de la table enregistrements_groupes';
    END IF;
END $$;

-- Afficher les index créés
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'enregistrements_groupes';

    RAISE NOTICE '✅ % index créés sur enregistrements_groupes', index_count;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
