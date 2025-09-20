const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mkbchdhbgdynxwfhpxbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'
);

async function createTablesStepByStep() {
  console.log('🚀 Création des tables quiz étape par étape...');

  try {
    // 1. Créer la table quiz_categories directement via SQL
    console.log('\n📋 Création de la table quiz_categories...');

    // Test simple d'insertion pour voir si on peut créer des données
    const { data: testData, error: testError } = await supabase
      .from('quiz_categories')
      .insert([{
        name: 'Test Category',
        description: 'Test',
        icon: '📋',
        color: '#3b82f6',
        order_index: 1
      }])
      .select();

    if (testError) {
      console.log('❌ Table quiz_categories n\'existe pas, création nécessaire');
      console.log('Erreur:', testError.message);

      // Essayer de créer via l'interface Supabase API
      console.log('💡 Vous devez créer les tables manuellement dans Supabase Dashboard');
      console.log('📝 Script SQL à copier dans l\'éditeur SQL de Supabase:');
      console.log('\n' + '='.repeat(60));

      const sqlScript = `
-- 1. Table des catégories de quiz
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

-- 2. Table des quiz
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

-- 3. Table des sessions de quiz
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

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_quiz_categories_active ON quiz_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_categories_order ON quiz_categories(order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_active ON quiz(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_created_by ON quiz(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_category ON quiz(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_completed ON quiz_sessions(completed);

-- Données par défaut
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
      `;

      console.log(sqlScript);
      console.log('='.repeat(60));
      console.log('');
      console.log('📝 Instructions:');
      console.log('1. Ouvrez https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw/sql/new');
      console.log('2. Copiez-collez le script SQL ci-dessus');
      console.log('3. Cliquez sur "Run" pour exécuter');
      console.log('4. Les tables seront créées avec les données par défaut');

    } else {
      console.log('✅ Table quiz_categories existe déjà');
      console.log('Données:', testData);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTablesStepByStep();