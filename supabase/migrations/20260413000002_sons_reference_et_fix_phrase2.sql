-- Migration: Ajustements pour Module 2 "Dans la phrase"
-- Date: 2026-04-13
-- Description:
--   1. Ajout de 'gamelle' dans la banque mots_sons_g
--   2. Fix phrase 2 : gants → gamelle (car gorille + gants était trop simple visuellement)
--   3. Table sons_reference_g : enregistrements des syllabes par le formateur (référence)

-- 1. Ajout du mot 'gamelle'
INSERT INTO public.mots_sons_g (mot, son_g) VALUES ('gamelle', 'g_dur')
ON CONFLICT (mot) DO NOTHING;

-- 2. Fix phrase 2
UPDATE public.phrases_sons_g
SET mot2 = 'gamelle',
    emoji2 = '🥣',
    phrase = 'Le gorille boit dans sa gamelle.'
WHERE ordre = 2;

-- 3. Table des sons de référence enregistrés par le formateur
CREATE TABLE IF NOT EXISTS public.sons_reference_g (
    id BIGSERIAL PRIMARY KEY,
    syllabe VARCHAR(20) NOT NULL UNIQUE,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sons_reference_g_syllabe ON sons_reference_g(syllabe);

ALTER TABLE public.sons_reference_g ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique sons_reference_g"
    ON public.sons_reference_g FOR SELECT
    USING (true);

CREATE POLICY "Modification admin sons_reference_g"
    ON public.sons_reference_g FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
