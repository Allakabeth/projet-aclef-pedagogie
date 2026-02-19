-- Migration: Création de la table compter_sessions
-- Date: 2026-02-19
-- Description: Enregistre les résultats des sessions d'exercices du module Compter

CREATE TABLE IF NOT EXISTS public.compter_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercice VARCHAR(100) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    duree_secondes INTEGER NOT NULL DEFAULT 0,
    termine BOOLEAN NOT NULL DEFAULT false,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_compter_sessions_user ON compter_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_compter_sessions_exercice ON compter_sessions(exercice);
CREATE INDEX IF NOT EXISTS idx_compter_sessions_created_at ON compter_sessions(created_at);
