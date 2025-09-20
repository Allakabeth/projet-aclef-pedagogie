const { createClient } = require('@supabase/supabase-js');

// Notre base de données pédagogie
const supabase = createClient(
  'https://mkbchdhbgdynxwfhpxbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'
);

async function testOurDatabase() {
  console.log('🔍 Test de notre base de données pédagogie...');

  try {
    // Tables quiz à tester
    const quizTables = ['quiz_categories', 'quiz', 'quiz_sessions'];

    for (const tableName of quizTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ Table "${tableName}" existe dans notre BDD`);
      } else if (error.message.includes('does not exist')) {
        console.log(`❌ Table "${tableName}" n'existe pas dans notre BDD`);
      } else {
        console.log(`⚠️ Table "${tableName}" - erreur: ${error.message}`);
      }
    }

    // Test de la table users
    console.log('\n👥 Test table users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);

    if (!usersError) {
      console.log('✅ Table users existe');
      console.log('Utilisateurs:', users);

      // Vérifier si le champ id est UUID
      if (users.length > 0) {
        const firstUserId = users[0].id;
        console.log(`Type d'ID utilisateur: ${typeof firstUserId} (${firstUserId})`);

        // Vérifier si c'est un UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstUserId);
        console.log(`ID au format UUID: ${isUUID ? '✅' : '❌'}`);
      }
    } else {
      console.log('❌ Erreur table users:', usersError.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testOurDatabase();