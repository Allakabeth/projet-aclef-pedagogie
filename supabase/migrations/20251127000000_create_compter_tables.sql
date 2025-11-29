-- Migration: Création des tables pour le module COMPTER
-- Date: 2025-11-27
-- Description: Tables pour les activités logico-mathématiques (Piaget)

-- Table des contextes d'exercices
CREATE TABLE IF NOT EXISTS compter_contextes (
    id SERIAL PRIMARY KEY,
    activite VARCHAR(20) NOT NULL CHECK (activite IN ('ranger', 'trier', 'associer', 'compter', 'memoriser')),
    code VARCHAR(50) NOT NULL,
    nom_affiche VARCHAR(100) NOT NULL,
    consigne TEXT NOT NULL,
    consigne_audio_url TEXT,
    niveau_difficulte INTEGER DEFAULT 1 CHECK (niveau_difficulte BETWEEN 1 AND 3),
    nb_elements_min INTEGER DEFAULT 4,
    nb_elements_max INTEGER DEFAULT 6,
    critere_tri VARCHAR(100), -- Pour RANGER: "prix", "taille", "chronologie", etc.
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(activite, code)
);

COMMENT ON TABLE compter_contextes IS 'Configuration des contextes pour chaque activité du module COMPTER';
COMMENT ON COLUMN compter_contextes.activite IS 'Type d''activité: ranger, trier, associer, compter, memoriser';
COMMENT ON COLUMN compter_contextes.code IS 'Code unique du contexte (ex: courses, cuisine, budget)';
COMMENT ON COLUMN compter_contextes.critere_tri IS 'Critère de tri pour l''activité RANGER (prix, taille, etc.)';

-- Table des éléments (banque d'éléments réutilisables)
CREATE TABLE IF NOT EXISTS compter_elements (
    id SERIAL PRIMARY KEY,
    contexte_id INTEGER REFERENCES compter_contextes(id) ON DELETE CASCADE,
    activite VARCHAR(20) NOT NULL CHECK (activite IN ('ranger', 'trier', 'associer', 'compter', 'memoriser')),
    categorie VARCHAR(50), -- Pour TRIER: catégorie de destination
    label VARCHAR(200) NOT NULL,
    valeur DECIMAL(10,2), -- Pour RANGER: valeur numérique pour le tri
    image_url TEXT,
    audio_url TEXT,
    paire_id INTEGER, -- Pour ASSOCIER: référence à l'élément apparié
    ordre_correct INTEGER, -- Pour RANGER: position correcte dans l'ordre
    metadata JSONB DEFAULT '{}',
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE compter_elements IS 'Banque d''éléments pour les exercices du module COMPTER';
COMMENT ON COLUMN compter_elements.valeur IS 'Valeur numérique pour le tri (prix, taille, etc.)';
COMMENT ON COLUMN compter_elements.paire_id IS 'ID de l''élément apparié pour l''activité ASSOCIER';
COMMENT ON COLUMN compter_elements.ordre_correct IS 'Position correcte pour l''activité RANGER';

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_compter_elements_contexte ON compter_elements(contexte_id);
CREATE INDEX IF NOT EXISTS idx_compter_elements_activite ON compter_elements(activite);
CREATE INDEX IF NOT EXISTS idx_compter_elements_categorie ON compter_elements(categorie);

-- Table de progression des apprenants
CREATE TABLE IF NOT EXISTS compter_progression (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activite VARCHAR(20) NOT NULL CHECK (activite IN ('ranger', 'trier', 'associer', 'compter', 'memoriser')),
    contexte_id INTEGER REFERENCES compter_contextes(id) ON DELETE SET NULL,
    contexte_code VARCHAR(50), -- Backup du code contexte si supprimé
    date_realisation TIMESTAMP DEFAULT NOW(),
    reussi BOOLEAN NOT NULL,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    temps_secondes INTEGER,
    nb_erreurs INTEGER DEFAULT 0,
    nb_tentatives INTEGER DEFAULT 1,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE compter_progression IS 'Résultats et progression des apprenants dans le module COMPTER';
COMMENT ON COLUMN compter_progression.score IS 'Score en pourcentage (0-100)';
COMMENT ON COLUMN compter_progression.details IS 'Détails supplémentaires de l''exercice (éléments utilisés, erreurs, etc.)';

-- Index pour les requêtes de progression
CREATE INDEX IF NOT EXISTS idx_compter_progression_apprenant ON compter_progression(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_compter_progression_activite ON compter_progression(activite);
CREATE INDEX IF NOT EXISTS idx_compter_progression_date ON compter_progression(date_realisation DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_compter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compter_contextes_updated
    BEFORE UPDATE ON compter_contextes
    FOR EACH ROW
    EXECUTE FUNCTION update_compter_updated_at();

CREATE TRIGGER trigger_compter_elements_updated
    BEFORE UPDATE ON compter_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_compter_updated_at();

-- ============================================
-- DONNÉES INITIALES - CONTEXTES
-- ============================================

-- Contextes pour RANGER
INSERT INTO compter_contextes (activite, code, nom_affiche, consigne, critere_tri, nb_elements_min, nb_elements_max) VALUES
('ranger', 'courses_prix', 'Courses - Prix', 'Rangez du moins cher au plus cher', 'prix', 4, 6),
('ranger', 'cuisine_taille', 'Cuisine - Taille', 'Rangez du plus petit au plus grand', 'taille', 4, 5),
('ranger', 'planning_chronologie', 'Planning - Journée', 'Rangez dans l''ordre de la journée', 'chronologie', 4, 5),
('ranger', 'vetements_taille', 'Vêtements - Taille', 'Rangez de la plus petite à la plus grande taille', 'taille', 4, 5),
('ranger', 'temperature', 'Météo - Température', 'Rangez du plus froid au plus chaud', 'temperature', 4, 5)
ON CONFLICT (activite, code) DO NOTHING;

-- Contextes pour TRIER
INSERT INTO compter_contextes (activite, code, nom_affiche, consigne, nb_elements_min, nb_elements_max) VALUES
('trier', 'supermarche', 'Supermarché', 'Triez les produits dans les bons rayons', 6, 10),
('trier', 'courrier', 'Courrier', 'Triez le courrier selon son importance', 5, 8),
('trier', 'linge', 'Linge', 'Triez le linge pour la machine à laver', 6, 8),
('trier', 'dechets', 'Tri des déchets', 'Triez les déchets dans les bonnes poubelles', 6, 10),
('trier', 'rangement_maison', 'Rangement maison', 'Rangez les objets dans les bonnes pièces', 6, 9)
ON CONFLICT (activite, code) DO NOTHING;

-- Contextes pour ASSOCIER
INSERT INTO compter_contextes (activite, code, nom_affiche, consigne, nb_elements_min, nb_elements_max) VALUES
('associer', 'mots_images', 'Mots et Images', 'Reliez chaque mot à son image', 4, 6),
('associer', 'quantites', 'Quantités', 'Reliez le nombre au bon groupe d''objets', 4, 6),
('associer', 'monnaie', 'Monnaie', 'Reliez le montant aux pièces ou billets', 4, 5),
('associer', 'panneaux', 'Panneaux routiers', 'Reliez chaque panneau à sa signification', 4, 6)
ON CONFLICT (activite, code) DO NOTHING;

-- Contextes pour COMPTER (conservation)
INSERT INTO compter_contextes (activite, code, nom_affiche, consigne, nb_elements_min, nb_elements_max) VALUES
('compter', 'jetons', 'Jetons', 'Y en a-t-il toujours autant ?', 1, 1),
('compter', 'liquide', 'Liquides', 'Y a-t-il toujours la même quantité d''eau ?', 1, 1),
('compter', 'monnaie_equivalence', 'Équivalence monnaie', 'Est-ce la même valeur ?', 1, 1),
('compter', 'pizza', 'Pizza', 'Y a-t-il toujours autant de pizza ?', 1, 1)
ON CONFLICT (activite, code) DO NOTHING;

-- Contextes pour MÉMORISER
INSERT INTO compter_contextes (activite, code, nom_affiche, consigne, nb_elements_min, nb_elements_max, niveau_difficulte) VALUES
('memoriser', 'liste_courses', 'Liste de courses', 'Mémorisez les produits puis retrouvez-les', 4, 6, 1),
('memoriser', 'objets_tiroir', 'Objets du tiroir', 'Mémorisez ce qu''il y a dans le tiroir', 4, 5, 1),
('memoriser', 'sequence', 'Séquence', 'Mémorisez l''ordre d''apparition', 4, 5, 2),
('memoriser', 'position', 'Position', 'Mémorisez où étaient placés les objets', 4, 6, 2)
ON CONFLICT (activite, code) DO NOTHING;

-- ============================================
-- DONNÉES INITIALES - ÉLÉMENTS RANGER (Courses - Prix)
-- ============================================

INSERT INTO compter_elements (contexte_id, activite, label, valeur, ordre_correct, image_url)
SELECT c.id, 'ranger', e.label, e.valeur, e.ordre_correct, e.image_url
FROM compter_contextes c,
(VALUES
    ('Baguette', 1.10, 1, '/images/compter/courses/baguette.jpg'),
    ('Lait', 1.50, 2, '/images/compter/courses/lait.jpg'),
    ('Yaourts', 2.30, 3, '/images/compter/courses/yaourts.jpg'),
    ('Fromage', 3.20, 4, '/images/compter/courses/fromage.jpg'),
    ('Jambon', 4.50, 5, '/images/compter/courses/jambon.jpg'),
    ('Poulet', 8.50, 6, '/images/compter/courses/poulet.jpg')
) AS e(label, valeur, ordre_correct, image_url)
WHERE c.code = 'courses_prix' AND c.activite = 'ranger'
ON CONFLICT DO NOTHING;

-- Éléments RANGER (Cuisine - Taille)
INSERT INTO compter_elements (contexte_id, activite, label, valeur, ordre_correct, image_url)
SELECT c.id, 'ranger', e.label, e.valeur, e.ordre_correct, e.image_url
FROM compter_contextes c,
(VALUES
    ('Cuillère à café', 1, 1, '/images/compter/cuisine/cuillere_cafe.jpg'),
    ('Cuillère à soupe', 2, 2, '/images/compter/cuisine/cuillere_soupe.jpg'),
    ('Fourchette', 3, 3, '/images/compter/cuisine/fourchette.jpg'),
    ('Louche', 4, 4, '/images/compter/cuisine/louche.jpg'),
    ('Écumoire', 5, 5, '/images/compter/cuisine/ecumoire.jpg')
) AS e(label, valeur, ordre_correct, image_url)
WHERE c.code = 'cuisine_taille' AND c.activite = 'ranger'
ON CONFLICT DO NOTHING;

-- Éléments RANGER (Planning - Chronologie)
INSERT INTO compter_elements (contexte_id, activite, label, valeur, ordre_correct, image_url)
SELECT c.id, 'ranger', e.label, e.valeur, e.ordre_correct, e.image_url
FROM compter_contextes c,
(VALUES
    ('Petit-déjeuner', 1, 1, '/images/compter/planning/petit_dejeuner.jpg'),
    ('Matin', 2, 2, '/images/compter/planning/matin.jpg'),
    ('Déjeuner', 3, 3, '/images/compter/planning/dejeuner.jpg'),
    ('Après-midi', 4, 4, '/images/compter/planning/apres_midi.jpg'),
    ('Dîner', 5, 5, '/images/compter/planning/diner.jpg')
) AS e(label, valeur, ordre_correct, image_url)
WHERE c.code = 'planning_chronologie' AND c.activite = 'ranger'
ON CONFLICT DO NOTHING;

-- ============================================
-- DONNÉES INITIALES - ÉLÉMENTS TRIER (Supermarché)
-- ============================================

INSERT INTO compter_elements (contexte_id, activite, categorie, label, image_url)
SELECT c.id, 'trier', e.categorie, e.label, e.image_url
FROM compter_contextes c,
(VALUES
    ('Fruits & Légumes', 'Pomme', '/images/compter/courses/pomme.jpg'),
    ('Fruits & Légumes', 'Carotte', '/images/compter/courses/carotte.jpg'),
    ('Fruits & Légumes', 'Banane', '/images/compter/courses/banane.jpg'),
    ('Produits laitiers', 'Lait', '/images/compter/courses/lait.jpg'),
    ('Produits laitiers', 'Yaourt', '/images/compter/courses/yaourt.jpg'),
    ('Produits laitiers', 'Fromage', '/images/compter/courses/fromage.jpg'),
    ('Viandes', 'Poulet', '/images/compter/courses/poulet.jpg'),
    ('Viandes', 'Jambon', '/images/compter/courses/jambon.jpg'),
    ('Boissons', 'Jus d''orange', '/images/compter/courses/jus_orange.jpg'),
    ('Boissons', 'Eau', '/images/compter/courses/eau.jpg')
) AS e(categorie, label, image_url)
WHERE c.code = 'supermarche' AND c.activite = 'trier'
ON CONFLICT DO NOTHING;

-- Éléments TRIER (Tri des déchets)
INSERT INTO compter_elements (contexte_id, activite, categorie, label, image_url)
SELECT c.id, 'trier', e.categorie, e.label, e.image_url
FROM compter_contextes c,
(VALUES
    ('Poubelle jaune', 'Bouteille plastique', '/images/compter/dechets/bouteille_plastique.jpg'),
    ('Poubelle jaune', 'Carton', '/images/compter/dechets/carton.jpg'),
    ('Poubelle jaune', 'Canette', '/images/compter/dechets/canette.jpg'),
    ('Poubelle verte', 'Épluchures', '/images/compter/dechets/epluchures.jpg'),
    ('Poubelle verte', 'Restes repas', '/images/compter/dechets/restes.jpg'),
    ('Verre', 'Bouteille verre', '/images/compter/dechets/bouteille_verre.jpg'),
    ('Verre', 'Bocal', '/images/compter/dechets/bocal.jpg'),
    ('Verre', 'Pot confiture', '/images/compter/dechets/pot_confiture.jpg')
) AS e(categorie, label, image_url)
WHERE c.code = 'dechets' AND c.activite = 'trier'
ON CONFLICT DO NOTHING;

-- ============================================
-- DONNÉES INITIALES - ÉLÉMENTS ASSOCIER (Monnaie)
-- ============================================

-- Pour ASSOCIER, on crée des paires (on met à jour paire_id après insertion)
INSERT INTO compter_elements (contexte_id, activite, label, image_url, metadata)
SELECT c.id, 'associer', e.label, e.image_url, e.metadata::jsonb
FROM compter_contextes c,
(VALUES
    ('1 euro', '/images/compter/argent/piece_1euro.jpg', '{"type": "montant", "valeur": 1}'),
    ('Pièce de 1€', '/images/compter/argent/piece_1euro_photo.jpg', '{"type": "piece", "valeur": 1}'),
    ('2 euros', '/images/compter/argent/piece_2euros.jpg', '{"type": "montant", "valeur": 2}'),
    ('Pièce de 2€', '/images/compter/argent/piece_2euros_photo.jpg', '{"type": "piece", "valeur": 2}'),
    ('5 euros', '/images/compter/argent/billet_5euros.jpg', '{"type": "montant", "valeur": 5}'),
    ('Billet de 5€', '/images/compter/argent/billet_5euros_photo.jpg', '{"type": "billet", "valeur": 5}'),
    ('10 euros', '/images/compter/argent/billet_10euros.jpg', '{"type": "montant", "valeur": 10}'),
    ('Billet de 10€', '/images/compter/argent/billet_10euros_photo.jpg', '{"type": "billet", "valeur": 10}')
) AS e(label, image_url, metadata)
WHERE c.code = 'monnaie' AND c.activite = 'associer'
ON CONFLICT DO NOTHING;

-- ============================================
-- DONNÉES INITIALES - ÉLÉMENTS MÉMORISER
-- ============================================

INSERT INTO compter_elements (contexte_id, activite, label, image_url)
SELECT c.id, 'memoriser', e.label, e.image_url
FROM compter_contextes c,
(VALUES
    ('Pomme', '/images/compter/courses/pomme.jpg'),
    ('Lait', '/images/compter/courses/lait.jpg'),
    ('Pain', '/images/compter/courses/baguette.jpg'),
    ('Fromage', '/images/compter/courses/fromage.jpg'),
    ('Œufs', '/images/compter/courses/oeufs.jpg'),
    ('Beurre', '/images/compter/courses/beurre.jpg'),
    ('Yaourt', '/images/compter/courses/yaourt.jpg'),
    ('Jambon', '/images/compter/courses/jambon.jpg'),
    ('Salade', '/images/compter/courses/salade.jpg'),
    ('Tomate', '/images/compter/courses/tomate.jpg')
) AS e(label, image_url)
WHERE c.code = 'liste_courses' AND c.activite = 'memoriser'
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Activer RLS sur les tables
ALTER TABLE compter_contextes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compter_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compter_progression ENABLE ROW LEVEL SECURITY;

-- Politique pour compter_contextes : lecture publique (données partagées)
CREATE POLICY "Lecture publique contextes compter" ON compter_contextes
    FOR SELECT USING (true);

-- Politique pour compter_elements : lecture publique (données partagées)
CREATE POLICY "Lecture publique elements compter" ON compter_elements
    FOR SELECT USING (true);

-- Politique pour compter_progression : chaque apprenant voit uniquement sa progression
CREATE POLICY "Apprenants voient leur progression" ON compter_progression
    FOR SELECT USING (auth.uid() = apprenant_id);

CREATE POLICY "Apprenants insèrent leur progression" ON compter_progression
    FOR INSERT WITH CHECK (auth.uid() = apprenant_id);

-- Note: Les admins auront accès via le service role key (bypass RLS)
