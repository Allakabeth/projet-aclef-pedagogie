const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSchema() {
  console.log('🚀 Création des tables quiz...');

  try {
    // 1. Créer les types ENUM
    console.log('📝 Création des types ENUM...');

    const enumQueries = [
      `DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_quiz') THEN
              CREATE TYPE user_role_quiz AS ENUM ('admin', 'formateur', 'apprenant');
          END IF;
      END $$;`,

      `DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
              CREATE TYPE question_type AS ENUM (
                  'multiple-choice',
                  'true-false',
                  'short-answer',
                  'ordering',
                  'matching'
              );
          END IF;
      END $$;`,

      `DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
              CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');
          END IF;
      END $$;`,

      `DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
              CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'abandoned');
          END IF;
      END $$;`
    ];

    for (const query of enumQueries) {
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) {
        console.log('Tentative alternative pour créer les ENUM...');
        // Ignorer l'erreur si le type existe déjà
      }
    }

    // 2. Créer les tables
    console.log('🏗️ Création des tables...');

    // Table des catégories
    const { error: categoriesError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS quiz_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(10) DEFAULT '📋',
        color VARCHAR(7) DEFAULT '#3b82f6',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );`
    });

    if (categoriesError) {
      console.log('❌ Erreur création quiz_categories:', categoriesError);
    } else {
      console.log('✅ Table quiz_categories créée');
    }

    // Table des quiz
    const { error: quizError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS quiz (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category_id INTEGER REFERENCES quiz_categories(id) ON DELETE SET NULL,
        time_limit INTEGER,
        pass_mark INTEGER DEFAULT 70,
        max_attempts INTEGER DEFAULT 3,
        shuffle_questions BOOLEAN DEFAULT false,
        shuffle_answers BOOLEAN DEFAULT true,
        show_correct_answers BOOLEAN DEFAULT false,
        cover_image_url TEXT,
        intro_audio_url TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        tags TEXT[] DEFAULT '{}',
        category VARCHAR(100),
        difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('facile', 'moyen', 'difficile'))
      );`
    });

    if (quizError) {
      console.log('❌ Erreur création quiz:', quizError);
    } else {
      console.log('✅ Table quiz créée');
    }

    // Table des questions
    const { error: questionsError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT 'multiple-choice',
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
      );`
    });

    if (questionsError) {
      console.log('❌ Erreur création questions:', questionsError);
    } else {
      console.log('✅ Table questions créée');
    }

    // Table des réponses
    const { error: answersError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS answers (
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
      );`
    });

    if (answersError) {
      console.log('❌ Erreur création answers:', answersError);
    } else {
      console.log('✅ Table answers créée');
    }

    // Table des sessions
    const { error: sessionsError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS quiz_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        completed_at TIMESTAMP WITH TIME ZONE,
        time_spent INTEGER,
        score INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        passed BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'in_progress',
        attempt_number INTEGER DEFAULT 1,
        session_data JSONB DEFAULT '{}'
      );`
    });

    if (sessionsError) {
      console.log('❌ Erreur création quiz_sessions:', sessionsError);
    } else {
      console.log('✅ Table quiz_sessions créée');
    }

    // Table des réponses utilisateurs
    const { error: userAnswersError } = await supabase.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS user_answers (
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
      );`
    });

    if (userAnswersError) {
      console.log('❌ Erreur création user_answers:', userAnswersError);
    } else {
      console.log('✅ Table user_answers créée');
    }

    // 3. Créer les index
    console.log('📊 Création des index...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_quiz_status ON quiz(status);',
      'CREATE INDEX IF NOT EXISTS idx_quiz_created_by ON quiz(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_quiz_category ON quiz(category_id);',
      'CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);',
      'CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON quiz_sessions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_sessions_quiz ON quiz_sessions(quiz_id);',
      'CREATE INDEX IF NOT EXISTS idx_sessions_status ON quiz_sessions(status);',
      'CREATE INDEX IF NOT EXISTS idx_user_answers_session ON user_answers(session_id);'
    ];

    for (const indexQuery of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexQuery });
      if (error) {
        console.log('Index probablement déjà existant:', indexQuery.split(' ')[5]);
      }
    }

    // 4. Insérer les catégories par défaut
    console.log('📋 Insertion des catégories par défaut...');
    const { error: insertError } = await supabase.rpc('exec', {
      sql: `INSERT INTO quiz_categories (name, description, icon, color) VALUES
        ('Mathématiques', 'Quiz de calcul et numération', '🔢', '#f59e0b'),
        ('Français', 'Quiz de lecture et orthographe', '📖', '#3b82f6'),
        ('Culture générale', 'Connaissances générales', '🌍', '#10b981'),
        ('Sciences', 'Quiz scientifiques', '🔬', '#8b5cf6'),
        ('Histoire', 'Quiz d''histoire', '📚', '#ef4444'),
        ('Géographie', 'Quiz de géographie', '🗺️', '#06b6d4')
      ON CONFLICT (name) DO NOTHING;`
    });

    if (insertError) {
      console.log('❌ Erreur insertion catégories:', insertError);
    } else {
      console.log('✅ Catégories par défaut insérées');
    }

    console.log('🎉 Schéma quiz créé avec succès !');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

executeSchema();