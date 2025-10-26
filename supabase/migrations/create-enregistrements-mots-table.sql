-- ============================================================================
-- TABLE: enregistrements_mots
-- Description: Enregistrements vocaux des apprenants pour des mots individuels
-- Utilisé dans l'exercice Mono/Multisyllabes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enregistrements_mots (
    id BIGSERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mot TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    texte_id INTEGER REFERENCES public.textes_references(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEX pour améliorer les performances
-- ============================================================================

-- Index sur apprenant_id (requêtes fréquentes par apprenant)
CREATE INDEX IF NOT EXISTS idx_enregistrements_mots_apprenant
ON public.enregistrements_mots(apprenant_id);

-- Index sur mot (recherche par mot)
CREATE INDEX IF NOT EXISTS idx_enregistrements_mots_mot
ON public.enregistrements_mots(mot);

-- Index composite pour requêtes apprenant + mot
CREATE INDEX IF NOT EXISTS idx_enregistrements_mots_apprenant_mot
ON public.enregistrements_mots(apprenant_id, mot);

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.enregistrements_mots IS
'Enregistrements vocaux des apprenants pour des mots individuels (exercice Mono/Multisyllabes)';

COMMENT ON COLUMN public.enregistrements_mots.mot IS
'Le mot enregistré (en minuscules, normalisé)';

COMMENT ON COLUMN public.enregistrements_mots.audio_url IS
'URL Supabase Storage du fichier audio (bucket: enregistrements-audio)';

COMMENT ON COLUMN public.enregistrements_mots.texte_id IS
'Optionnel: texte de référence d''où provient le mot';

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE public.enregistrements_mots ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : L'apprenant peut voir ses propres enregistrements
CREATE POLICY "Les apprenants peuvent voir leurs propres enregistrements de mots"
ON public.enregistrements_mots
FOR SELECT
USING (apprenant_id = (current_setting('request.jwt.claims', true)::json->>'apprenant_id')::uuid);

-- Politique INSERT : L'apprenant peut créer ses propres enregistrements
CREATE POLICY "Les apprenants peuvent créer leurs propres enregistrements de mots"
ON public.enregistrements_mots
FOR INSERT
WITH CHECK (apprenant_id = (current_setting('request.jwt.claims', true)::json->>'apprenant_id')::uuid);

-- Politique DELETE : L'apprenant peut supprimer ses propres enregistrements
CREATE POLICY "Les apprenants peuvent supprimer leurs propres enregistrements de mots"
ON public.enregistrements_mots
FOR DELETE
USING (apprenant_id = (current_setting('request.jwt.claims', true)::json->>'apprenant_id')::uuid);

-- ============================================================================
-- TRIGGER pour updated_at
-- ============================================================================

-- Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_enregistrements_mots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER trigger_update_enregistrements_mots_updated_at
BEFORE UPDATE ON public.enregistrements_mots
FOR EACH ROW
EXECUTE FUNCTION update_enregistrements_mots_updated_at();

-- ============================================================================
-- CONTRAINTES
-- ============================================================================

-- Le mot ne doit pas être vide
ALTER TABLE public.enregistrements_mots
ADD CONSTRAINT check_mot_not_empty CHECK (LENGTH(TRIM(mot)) > 0);

-- Un apprenant ne peut avoir qu'un seul enregistrement par mot
CREATE UNIQUE INDEX IF NOT EXISTS unique_apprenant_mot
ON public.enregistrements_mots(apprenant_id, LOWER(mot));
