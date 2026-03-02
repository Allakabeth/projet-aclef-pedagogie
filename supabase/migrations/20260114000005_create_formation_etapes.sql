-- ============================================================================
-- MIGRATION: Table des étapes de parcours
-- Date: 2026-01-14
-- Projet: ACLEF-Pédagogie
-- Description: Crée la table pour stocker les étapes de progression par profil
-- Basé sur: docs/Profil Alpha.pdf et docs/Profil illetrisme.pdf
-- ============================================================================

-- 1. CRÉER LA TABLE FORMATION_ETAPES
CREATE TABLE IF NOT EXISTS formation_etapes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profil_id UUID NOT NULL REFERENCES formation_profils(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,                    -- Étape 1, 2, 3, etc.
    nom VARCHAR(100),                           -- "Étape 1", "Étape 2"...
    objectifs_lecture TEXT,                     -- Objectifs lecture de l'étape
    objectifs_ecriture TEXT,                    -- Objectifs écriture de l'étape
    duree_min INTEGER,                          -- Durée minimum en heures (ex: 150)
    duree_max INTEGER,                          -- Durée maximum en heures (ex: 350)
    indicateurs_reussite TEXT,                  -- Critères de passage à l'étape suivante
    outils_recommandes TEXT,                    -- Outils pédagogiques recommandés
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(profil_id, numero)
);

-- 2. INDEX POUR PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_formation_etapes_profil ON formation_etapes(profil_id);
CREATE INDEX IF NOT EXISTS idx_formation_etapes_numero ON formation_etapes(numero);

-- 3. TRIGGER POUR UPDATED_AT
CREATE OR REPLACE FUNCTION update_formation_etapes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_formation_etapes_updated_at ON formation_etapes;
CREATE TRIGGER trigger_formation_etapes_updated_at
    BEFORE UPDATE ON formation_etapes
    FOR EACH ROW
    EXECUTE FUNCTION update_formation_etapes_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'formation_etapes') THEN
        RAISE NOTICE 'Migration 20260114000005: Table formation_etapes créée avec succès';
    ELSE
        RAISE EXCEPTION 'Migration 20260114000005: Échec de création de la table formation_etapes';
    END IF;
END $$;
