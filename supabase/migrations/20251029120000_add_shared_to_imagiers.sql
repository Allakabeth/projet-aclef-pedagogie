-- Migration: Ajout du champ 'shared' à la table imagiers
-- Date: 2025-10-29
-- Description: Permet de partager des imagiers entre utilisateurs

-- Ajouter la colonne 'shared' avec valeur par défaut false
ALTER TABLE imagiers
ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT false;

-- Créer un index pour optimiser les requêtes sur les imagiers partagés
CREATE INDEX IF NOT EXISTS idx_imagiers_shared ON imagiers(shared) WHERE shared = true;

-- Commentaire sur la colonne
COMMENT ON COLUMN imagiers.shared IS 'Indique si l''imagier est partagé avec tous les apprenants';
