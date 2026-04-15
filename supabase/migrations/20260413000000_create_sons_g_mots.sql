-- Migration: Création de la table mots_sons_g
-- Date: 2026-04-13
-- Description: Banque de mots pour la séquence pédagogique "Les Sons du G"
-- Note: la colonne 'son_g' est une étiquette INTERNE, jamais affichée à l'apprenant

CREATE TABLE IF NOT EXISTS public.mots_sons_g (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mot VARCHAR(100) NOT NULL UNIQUE,
    son_g VARCHAR(20) NOT NULL,
    -- Valeurs son_g : 'g_dur' | 'gu' | 'g_doux' | 'gn' | 'gl' | 'gr'
    image_url TEXT,
    audio_url TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_mots_sons_g_son ON mots_sons_g(son_g);
CREATE INDEX IF NOT EXISTS idx_mots_sons_g_actif ON mots_sons_g(actif);

-- Seed : 82 mots concrets et illustrables
INSERT INTO public.mots_sons_g (mot, son_g) VALUES
-- g_dur (g devant a, o, u, consonne)
('gare', 'g_dur'), ('gâteau', 'g_dur'), ('gant', 'g_dur'), ('gants', 'g_dur'),
('garçon', 'g_dur'), ('gomme', 'g_dur'), ('golf', 'g_dur'), ('gorille', 'g_dur'),
('goutte', 'g_dur'), ('légume', 'g_dur'), ('figure', 'g_dur'), ('ragoût', 'g_dur'),
('escargot', 'g_dur'),
-- gu (gu devant e, i)
('guitare', 'gu'), ('guêpe', 'gu'), ('baguette', 'gu'), ('langue', 'gu'),
('vague', 'gu'), ('bague', 'gu'), ('guidon', 'gu'), ('aiguille', 'gu'),
('anguille', 'gu'),
-- g_doux (g devant e, i, y)
('girouette', 'g_doux'), ('girafe', 'g_doux'), ('gilet', 'g_doux'),
('gymnaste', 'g_doux'), ('genou', 'g_doux'), ('géant', 'g_doux'),
('bougie', 'g_doux'), ('magicien', 'g_doux'), ('page', 'g_doux'),
('image', 'g_doux'), ('nuage', 'g_doux'), ('plage', 'g_doux'),
('cage', 'g_doux'), ('étagère', 'g_doux'), ('fromage', 'g_doux'),
('village', 'g_doux'), ('orange', 'g_doux'), ('singe', 'g_doux'),
('neige', 'g_doux'), ('rouge', 'g_doux'),
-- gn
('montagne', 'gn'), ('peigne', 'gn'), ('ligne', 'gn'), ('agneau', 'gn'),
('champignon', 'gn'), ('araignée', 'gn'), ('oignon', 'gn'), ('poignée', 'gn'),
('vigne', 'gn'), ('signe', 'gn'), ('baignoire', 'gn'),
-- gl
('glace', 'gl'), ('glaçon', 'gl'), ('gland', 'gl'), ('igloo', 'gl'),
('glissade', 'gl'), ('règle', 'gl'), ('aigle', 'gl'), ('ongle', 'gl'),
('sangle', 'gl'),
-- gr
('grand', 'gr'), ('gros', 'gr'), ('grain', 'gr'), ('grenouille', 'gr'),
('gruyère', 'gr'), ('ogre', 'gr'), ('tigre', 'gr'), ('grenade', 'gr'),
('vinaigre', 'gr'), ('agrafe', 'gr');

-- RLS
ALTER TABLE public.mots_sons_g ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (apprenants + admin)
CREATE POLICY "Lecture publique mots_sons_g"
    ON public.mots_sons_g FOR SELECT
    USING (true);

-- Seul service_role peut modifier (admin via API)
CREATE POLICY "Modification admin uniquement mots_sons_g"
    ON public.mots_sons_g FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
