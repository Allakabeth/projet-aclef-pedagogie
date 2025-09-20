const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://eialndnxyxkcknrjpupp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYWxuZG54eXhrY2tucmpwdXBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4MzQ5NywiZXhwIjoyMDcyNjU5NDk3fQ.okrEsM2wyspZoPPgwV90eBaFVnNJRQgRNvuvhKkFMVU'
);

async function examineQuizTables() {
  console.log('🔍 Examen des tables quiz...');

  try {
    // 1. Examiner quiz_categories
    console.log('\n📋 TABLE QUIZ_CATEGORIES:');
    const { data: categories, error: catError } = await supabase
      .from('quiz_categories')
      .select('*')
      .limit(10);

    if (!catError) {
      console.log('Exemple de catégories:', categories);
      console.log('Nombre de catégories:', categories.length);
    } else {
      console.log('❌ Erreur quiz_categories:', catError.message);
    }

    // 2. Examiner quiz
    console.log('\n🎯 TABLE QUIZ:');
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz')
      .select('*')
      .limit(5);

    if (!quizError) {
      console.log('Exemple de quiz:', quizzes);
      console.log('Nombre de quiz:', quizzes.length);
      if (quizzes.length > 0) {
        console.log('Structure d\'un quiz:', Object.keys(quizzes[0]));
      }
    } else {
      console.log('❌ Erreur quiz:', quizError.message);
    }

    // 3. Examiner quiz_sessions
    console.log('\n📊 TABLE QUIZ_SESSIONS:');
    const { data: sessions, error: sessError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .limit(5);

    if (!sessError) {
      console.log('Exemple de sessions:', sessions);
      console.log('Nombre de sessions:', sessions.length);
      if (sessions.length > 0) {
        console.log('Structure d\'une session:', Object.keys(sessions[0]));
      }
    } else {
      console.log('❌ Erreur quiz_sessions:', sessError.message);
    }

    // 4. Examiner users
    console.log('\n👥 TABLE USERS:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .limit(5);

    if (!usersError) {
      console.log('Exemple d\'utilisateurs:', users);
      console.log('Nombre d\'utilisateurs:', users.length);
      if (users.length > 0) {
        console.log('Structure d\'un utilisateur:', Object.keys(users[0]));
      }
    } else {
      console.log('❌ Erreur users:', usersError.message);
    }

    // 5. Rechercher d'autres tables quiz potentielles
    console.log('\n🔍 RECHERCHE D\'AUTRES TABLES:');
    const possibleTables = [
      'quiz_questions', 'quiz_answers', 'quiz_responses', 'quiz_results',
      'questions', 'answers', 'responses', 'user_answers', 'quiz_attempts'
    ];

    for (const tableName of possibleTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ Table "${tableName}" existe !`);

        // Si on trouve une table, on examine sa structure
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        if (!sampleError && sample.length > 0) {
          console.log(`   Structure: ${Object.keys(sample[0]).join(', ')}`);
          console.log(`   Nombre d'enregistrements: ${sample.length}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

examineQuizTables();