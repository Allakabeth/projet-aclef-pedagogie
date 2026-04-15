-- Migration: Tables pour le Module 2 "Dans la phrase" de la séquence "Les Sons du G"
-- Date: 2026-04-13
-- Description:
--   - phrases_sons_g : banque de phrases pré-générées (2 mots cibles avec g par phrase)
--   - enregistrements_sons_g : enregistrements audio des syllabes par l'apprenant (réutilisables)

-- ============================================================
-- Table 1 : Banque de phrases
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phrases_sons_g (
    id SERIAL PRIMARY KEY,
    phrase TEXT NOT NULL,
    mot1 VARCHAR(100) NOT NULL,
    mot2 VARCHAR(100) NOT NULL,
    son1 VARCHAR(20) NOT NULL,  -- étiquette interne : 'g_dur'|'g_doux'|'gu'|'gn'|'gl'|'gr'
    son2 VARCHAR(20) NOT NULL,
    emoji1 TEXT NOT NULL,
    emoji2 TEXT NOT NULL,
    meme_son BOOLEAN NOT NULL,  -- true si son1 et son2 produisent le même phonème
    ordre INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_phrases_sons_g_actif ON phrases_sons_g(actif);
CREATE INDEX IF NOT EXISTS idx_phrases_sons_g_ordre ON phrases_sons_g(ordre);

-- ============================================================
-- Table 2 : Enregistrements audio de l'apprenant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enregistrements_sons_g (
    id BIGSERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    syllabe VARCHAR(20) NOT NULL,       -- ex: 'ga', 'ge', 'gi', 'gn', 'gl', 'gr'
    mot_source VARCHAR(100),            -- ex: 'gâteau' (contexte d'où la syllabe a été extraite)
    son_g VARCHAR(20),                  -- étiquette interne : 'g_dur'|'g_doux'|'gu'|'gn'|'gl'|'gr'
    audio_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(apprenant_id, syllabe)
);

CREATE INDEX IF NOT EXISTS idx_enreg_sons_g_apprenant ON enregistrements_sons_g(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_enreg_sons_g_syllabe ON enregistrements_sons_g(syllabe);

-- ============================================================
-- Seed : 15 phrases validées
-- ============================================================
INSERT INTO public.phrases_sons_g (phrase, mot1, mot2, son1, son2, emoji1, emoji2, meme_son, ordre) VALUES
('La souris mange du gâteau.',            'mange',      'gâteau',     'g_doux', 'g_dur',  '😋',  '🍰', false, 1),
('Le gorille a des gants.',               'gorille',    'gants',      'g_dur',  'g_dur',  '🦍',  '🧤', true,  2),
('Le garçon porte un gilet.',             'garçon',     'gilet',      'g_dur',  'g_doux', '👦',  '🦺', false, 3),
('Le tigre aime la grenouille.',          'tigre',      'grenouille', 'gr',     'gr',     '🐅',  '🐸', true,  4),
('La girafe est sur la montagne.',        'girafe',     'montagne',   'g_doux', 'gn',     '🦒',  '🏔️', false, 5),
('La girafe voit une orange.',            'girafe',     'orange',     'g_doux', 'g_doux', '🦒',  '🍊', true,  6),
('Le magicien joue de la guitare.',       'magicien',   'guitare',    'g_doux', 'gu',     '🧙',  '🎸', false, 7),
('L''escargot est sur la règle.',         'escargot',   'règle',      'g_dur',  'gl',     '🐌',  '📏', false, 8),
('La guêpe pique le garçon.',             'guêpe',      'garçon',     'gu',     'g_dur',  '🐝',  '👦', true,  9),
('La grenouille est sur la glace.',       'grenouille', 'glace',      'gr',     'gl',     '🐸',  '🧊', false, 10),
('L''aigle vole sur le village.',         'aigle',      'village',    'gl',     'g_doux', '🦅',  '🏘️', false, 11),
('Le singe trouve un champignon.',        'singe',      'champignon', 'g_doux', 'gn',     '🐒',  '🍄', false, 12),
('Le nuage est sur la plage.',            'nuage',      'plage',      'g_doux', 'g_doux', '☁️',  '🏖️', true,  13),
('Le champignon est sur la vigne.',       'champignon', 'vigne',      'gn',     'gn',     '🍄',  '🍇', true,  14),
('L''igloo est sur la glace.',            'igloo',      'glace',      'gl',     'gl',     '🛖',  '🧊', true,  15);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.phrases_sons_g ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enregistrements_sons_g ENABLE ROW LEVEL SECURITY;

-- phrases_sons_g : lecture publique, écriture service_role
CREATE POLICY "Lecture publique phrases_sons_g"
    ON public.phrases_sons_g FOR SELECT
    USING (true);

CREATE POLICY "Modification admin phrases_sons_g"
    ON public.phrases_sons_g FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- enregistrements_sons_g : chaque apprenant ne voit/modifie que ses propres enregistrements
CREATE POLICY "Apprenant lit ses enregistrements_sons_g"
    ON public.enregistrements_sons_g FOR SELECT
    USING (auth.uid() = apprenant_id OR auth.role() = 'service_role');

CREATE POLICY "Service role écrit enregistrements_sons_g"
    ON public.enregistrements_sons_g FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
