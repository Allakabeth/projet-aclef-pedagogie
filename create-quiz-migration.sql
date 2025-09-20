-- =========================================
-- CRÉATION DES TABLES QUIZ EXACTES COMME LE PROJET ORIGINAL
-- =========================================

-- 1. Table des catégories de quiz (structure exacte)
CREATE TABLE IF NOT EXISTS quiz_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '📋',
    color VARCHAR(7) DEFAULT '#3b82f6',
    order_index INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Table des quiz (structure exacte)
CREATE TABLE IF NOT EXISTS quiz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    category_id UUID REFERENCES quiz_categories(id) ON DELETE SET NULL
);

-- 3. Table des sessions de quiz (structure exacte)
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =========================================
-- CRÉATION DES INDEX
-- =========================================

CREATE INDEX IF NOT EXISTS idx_quiz_categories_active ON quiz_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_categories_order ON quiz_categories(order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_active ON quiz(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_created_by ON quiz(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_category ON quiz(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_completed ON quiz_sessions(completed);

-- =========================================
-- INSERTION DES CATÉGORIES PAR DÉFAUT
-- =========================================

INSERT INTO quiz_categories (name, description, icon, color, order_index) VALUES
  ('Mathématiques', 'Quiz de calcul, géométrie et logique mathématique', '🔢', '#dc3545', 1),
  ('Français', 'Quiz de grammaire, vocabulaire et littérature', '📚', '#28a745', 2),
  ('Histoire', 'Quiz sur les événements historiques et personnages', '🏛️', '#ffc107', 3),
  ('Géographie', 'Quiz sur les pays, capitales et géographie mondiale', '🌍', '#17a2b8', 4),
  ('Sciences', 'Quiz de physique, chimie et sciences naturelles', '🔬', '#6f42c1', 5),
  ('Culture Générale', 'Quiz de connaissances générales variées', '🧠', '#fd7e14', 6),
  ('Sport', 'Quiz sur les sports et les compétitions', '⚽', '#20c997', 7),
  ('Technologie', 'Quiz sur l''informatique et les nouvelles technologies', '💻', '#6c757d', 8)
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- TRIGGERS POUR UPDATED_AT
-- =========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour quiz_categories
DROP TRIGGER IF EXISTS update_quiz_categories_updated_at ON quiz_categories;
CREATE TRIGGER update_quiz_categories_updated_at
    BEFORE UPDATE ON quiz_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();