# 📋 MIGRATIONS À EXÉCUTER

## ⚠️ Actions requises

Les tables suivantes doivent être créées dans la base de données Supabase :
- `categories_outils_pedagogiques` - Catégories thématiques pour exercices de formation
- `exercices_code_route` - Exercices basés sur le vocabulaire Code de la Route

**Note:** La table `vocabulaire_code_route` existe déjà et contient le vocabulaire du Code de la Route.

## 🌐 Accès au Dashboard Supabase

**URL:** https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw/sql/new

## 📝 Instructions

1. Ouvrir le lien ci-dessus (SQL Editor de Supabase)
2. Copier/coller le SQL ci-dessous
3. Cliquer sur "Run" (ou F9)
4. Vérifier qu'il n'y a pas d'erreurs
5. Relancer le serveur: `npm run dev`

---

## 🗂️ SQL À EXÉCUTER

```sql
-- ============================================================================
-- MIGRATION 1 : Catégories d'outils pédagogiques
-- ============================================================================

-- Table des catégories d'outils pédagogiques
CREATE TABLE IF NOT EXISTS categories_outils_pedagogiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    couleur TEXT,
    ordre INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter le champ categorie_id à la table formation_exercices
ALTER TABLE formation_exercices
ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES categories_outils_pedagogiques(id) ON DELETE SET NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_formation_exercices_categorie
ON formation_exercices(categorie_id);

CREATE INDEX IF NOT EXISTS idx_categories_outils_ordre
ON categories_outils_pedagogiques(ordre);

-- Insertion de catégories par défaut
INSERT INTO categories_outils_pedagogiques (nom, description, emoji, couleur, ordre) VALUES
('Lecture', 'Exercices de compréhension écrite et déchiffrage', '📖', '#10b981', 1),
('Écriture', 'Exercices d''orthographe et production écrite', '✏️', '#3b82f6', 2),
('Calcul', 'Exercices de mathématiques et numération', '🔢', '#8b5cf6', 3),
('Vocabulaire', 'Enrichissement du vocabulaire', '📚', '#6366f1', 4),
('Grammaire', 'Règles de grammaire et conjugaison', '📝', '#f59e0b', 5),
('Compréhension orale', 'Écoute et compréhension', '🎧', '#ec4899', 6),
('Expression orale', 'Pratique de l''oral', '🗣️', '#14b8a6', 7),
('Culture générale', 'Connaissances générales', '🌍', '#06b6d4', 8)
ON CONFLICT DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_categories_outils_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_categories_outils_updated_at
    BEFORE UPDATE ON categories_outils_pedagogiques
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_outils_updated_at();

COMMENT ON TABLE categories_outils_pedagogiques IS 'Catégories pour organiser les outils pédagogiques (exercices)';
COMMENT ON COLUMN formation_exercices.categorie_id IS 'Catégorie thématique de l''exercice (optionnel)';


-- ============================================================================
-- MIGRATION 2 : Table exercices Code de la Route
-- ============================================================================
-- Note: La table vocabulaire_code_route existe déjà

-- Table des exercices Code de la Route
CREATE TABLE IF NOT EXISTS exercices_code_route (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorie TEXT NOT NULL,
    type TEXT NOT NULL,
    titre TEXT NOT NULL,
    description TEXT,
    contenu JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_exercices_code_route_categorie
ON exercices_code_route(categorie);

CREATE INDEX IF NOT EXISTS idx_exercices_code_route_type
ON exercices_code_route(type);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_exercices_code_route_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exercices_code_route_updated_at
    BEFORE UPDATE ON exercices_code_route
    FOR EACH ROW
    EXECUTE FUNCTION update_exercices_code_route_updated_at();

-- Commentaires
COMMENT ON TABLE exercices_code_route IS 'Exercices basés sur le vocabulaire du Code de la Route';
COMMENT ON COLUMN exercices_code_route.type IS 'Type d''exercice: qcm, vrai_faux, association, completion';
COMMENT ON COLUMN exercices_code_route.contenu IS 'Contenu structuré de l''exercice au format JSON';
```

---

## ✅ Après l'exécution

1. Vérifier qu'il n'y a pas d'erreurs dans le SQL Editor
2. Fermer et relancer le serveur Next.js :
   ```bash
   npm run dev
   ```
3. Tester l'accès aux pages :
   - http://localhost:3000/admin/formation/outils-pedagogiques/categories
   - http://localhost:3000/admin/code-route/vocabulaire/liste
   - http://localhost:3000/admin/code-route/exercice

## 🔍 Vérification

Pour vérifier que les tables ont bien été créées, exécuter dans le SQL Editor :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'categories_outils_pedagogiques',
    'vocabulaire_code_route',
    'exercices_code_route'
);
```

Vous devriez voir 3 lignes dans les résultats (vocabulaire_code_route existe déjà normalement).
