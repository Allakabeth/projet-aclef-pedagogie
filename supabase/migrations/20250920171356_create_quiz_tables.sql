-- Quiz tables creation migration
-- Created for ACLEF pedagogie project

-- 1. Quiz categories table
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

-- 2. Quiz table with JSONB data structure
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

-- 3. Quiz sessions table
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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_quiz_categories_active ON quiz_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_categories_order ON quiz_categories(order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_active ON quiz(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_created_by ON quiz(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_category ON quiz(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_completed ON quiz_sessions(completed);

-- Default categories (without special characters to avoid encoding issues)
INSERT INTO quiz_categories (name, description, icon, color, order_index) VALUES
  ('Mathematiques', 'Quiz de calcul et logique mathematique', '🔢', '#dc3545', 1),
  ('Francais', 'Quiz de grammaire et vocabulaire', '📚', '#28a745', 2),
  ('Histoire', 'Quiz sur les evenements historiques', '🏛️', '#ffc107', 3),
  ('Geographie', 'Quiz sur les pays et capitales', '🌍', '#17a2b8', 4),
  ('Sciences', 'Quiz de physique chimie et sciences naturelles', '🔬', '#6f42c1', 5),
  ('Culture Generale', 'Quiz de connaissances generales', '🧠', '#fd7e14', 6),
  ('Sport', 'Quiz sur les sports et competitions', '⚽', '#20c997', 7),
  ('Technologie', 'Quiz sur informatique et nouvelles technologies', '💻', '#6c757d', 8)
ON CONFLICT (name) DO NOTHING;

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for quiz_categories
DROP TRIGGER IF EXISTS update_quiz_categories_updated_at ON quiz_categories;
CREATE TRIGGER update_quiz_categories_updated_at
    BEFORE UPDATE ON quiz_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();