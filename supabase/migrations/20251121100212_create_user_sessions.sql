-- Migration: Création de la table user_sessions pour tracking des sessions actives
-- Date: 2025-11-21
-- Description: Permet de tracker qui est connecté en temps réel

-- Créer la table user_sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contrainte : un seul enregistrement par utilisateur
    UNIQUE(user_id)
);

-- Index pour performances
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity);

-- Activer RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy : Seuls les admins peuvent voir les sessions
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.email = current_user
        AND users.role = 'admin'
    )
);

-- Policy : Les utilisateurs peuvent insérer/mettre à jour leur propre session
CREATE POLICY "Users can upsert their own session"
ON public.user_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own session"
ON public.user_sessions FOR UPDATE
USING (true);

-- Fonction pour nettoyer les sessions anciennes (> 2 heures)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE last_activity < NOW() - INTERVAL '2 hours';
END;
$$;

-- Commentaires
COMMENT ON TABLE public.user_sessions IS 'Tracking des sessions actives des utilisateurs pour savoir qui est connecté';
COMMENT ON COLUMN public.user_sessions.last_activity IS 'Dernier heartbeat de l''utilisateur';
COMMENT ON COLUMN public.user_sessions.user_agent IS 'User agent du navigateur';
COMMENT ON COLUMN public.user_sessions.ip_address IS 'Adresse IP de l''utilisateur';
