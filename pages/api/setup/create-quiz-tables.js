import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🚀 Début de la création des tables quiz...')

    // Script SQL adapté pour créer les tables quiz
    const sqlScript = `
      -- =========================================
      -- CRÉATION DES TYPES ENUM POUR QUIZ
      -- =========================================

      -- Vérifier et créer les types seulement s'ils n'existent pas
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_quiz') THEN
              CREATE TYPE user_role_quiz AS ENUM ('admin', 'formateur', 'apprenant');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
              CREATE TYPE question_type AS ENUM (
                  'multiple-choice',
                  'true-false',
                  'short-answer',
                  'ordering',
                  'matching'
              );
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
              CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
              CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'abandoned');
          END IF;
      END $$;

      -- =========================================
      -- CRÉATION DES TABLES QUIZ
      -- =========================================

      -- Table des utilisateurs quiz (utilise les utilisateurs existants)
      CREATE TABLE IF NOT EXISTS quiz_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role user_role_quiz NOT NULL DEFAULT 'apprenant',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          last_login TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          preferences JSONB DEFAULT '{
              "font_size": "medium",
              "contrast": "normal",
              "audio_enabled": true,
              "animations_enabled": true
          }'::jsonb
      );

      -- Table des catégories de quiz
      CREATE TABLE IF NOT EXISTS quiz_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          icon VARCHAR(10) DEFAULT '📋',
          color VARCHAR(7) DEFAULT '#3b82f6',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );

      -- Table des quiz
      CREATE TABLE IF NOT EXISTS quiz (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_by UUID NOT NULL,
          category_id INTEGER REFERENCES quiz_categories(id) ON DELETE SET NULL,
          time_limit INTEGER,
          pass_mark INTEGER DEFAULT 70,
          max_attempts INTEGER DEFAULT 3,
          shuffle_questions BOOLEAN DEFAULT false,
          shuffle_answers BOOLEAN DEFAULT true,
          show_correct_answers BOOLEAN DEFAULT false,
          cover_image_url TEXT,
          intro_audio_url TEXT,
          status quiz_status DEFAULT 'draft',
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          tags TEXT[] DEFAULT '{}',
          category VARCHAR(100),
          difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('facile', 'moyen', 'difficile'))
      );

      -- Table des questions
      CREATE TABLE IF NOT EXISTS questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          question_type question_type NOT NULL DEFAULT 'multiple-choice',
          position INTEGER NOT NULL,
          points INTEGER DEFAULT 1,
          image_url TEXT,
          audio_url TEXT,
          video_url TEXT,
          config JSONB DEFAULT '{}',
          explanation TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          UNIQUE(quiz_id, position)
      );

      -- Table des réponses possibles
      CREATE TABLE IF NOT EXISTS answers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          answer_text TEXT NOT NULL,
          is_correct BOOLEAN DEFAULT false,
          position INTEGER NOT NULL,
          image_url TEXT,
          audio_url TEXT,
          feedback TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          UNIQUE(question_id, position)
      );

      -- Table des sessions de quiz
      CREATE TABLE IF NOT EXISTS quiz_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          completed_at TIMESTAMP WITH TIME ZONE,
          time_spent INTEGER,
          score INTEGER DEFAULT 0,
          total_points INTEGER DEFAULT 0,
          percentage DECIMAL(5,2) GENERATED ALWAYS AS (
              CASE WHEN total_points > 0
              THEN (score::DECIMAL / total_points * 100)
              ELSE 0 END
          ) STORED,
          passed BOOLEAN DEFAULT false,
          status session_status DEFAULT 'in_progress',
          attempt_number INTEGER DEFAULT 1,
          session_data JSONB DEFAULT '{}'
      );

      -- Table des réponses utilisateurs
      CREATE TABLE IF NOT EXISTS user_answers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          selected_answer_ids UUID[] DEFAULT '{}',
          text_answer TEXT,
          answer_data JSONB DEFAULT '{}',
          is_correct BOOLEAN,
          points_earned INTEGER DEFAULT 0,
          answered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          time_taken INTEGER,
          UNIQUE(session_id, question_id)
      );

      -- =========================================
      -- CRÉATION DES INDEX
      -- =========================================

      CREATE INDEX IF NOT EXISTS idx_quiz_users_email ON quiz_users(email);
      CREATE INDEX IF NOT EXISTS idx_quiz_users_role ON quiz_users(role);
      CREATE INDEX IF NOT EXISTS idx_quiz_status ON quiz(status);
      CREATE INDEX IF NOT EXISTS idx_quiz_created_by ON quiz(created_by);
      CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON quiz_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_quiz ON quiz_sessions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON quiz_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_user_answers_session ON user_answers(session_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_category ON quiz(category_id);

      -- =========================================
      -- INSERTION DES DONNÉES DE BASE
      -- =========================================

      -- Catégories par défaut
      INSERT INTO quiz_categories (name, description, icon, color) VALUES
        ('Mathématiques', 'Quiz de calcul et numération', '🔢', '#f59e0b'),
        ('Français', 'Quiz de lecture et orthographe', '📖', '#3b82f6'),
        ('Culture générale', 'Connaissances générales', '🌍', '#10b981'),
        ('Sciences', 'Quiz scientifiques', '🔬', '#8b5cf6'),
        ('Histoire', 'Quiz d''histoire', '📚', '#ef4444'),
        ('Géographie', 'Quiz de géographie', '🗺️', '#06b6d4')
      ON CONFLICT (name) DO NOTHING;
    `

    // Exécuter le script
    const { error } = await supabase.rpc('exec_sql', { sql: sqlScript })

    if (error) {
      console.error('❌ Erreur lors de la création des tables:', error)
      return res.status(500).json({
        error: 'Erreur lors de la création des tables',
        details: error.message
      })
    }

    console.log('✅ Tables quiz créées avec succès!')

    res.status(200).json({
      success: true,
      message: 'Tables quiz créées avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}