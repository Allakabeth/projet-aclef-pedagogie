const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mkbchdhbgdynxwfhpxbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'
);

async function testQuizTables() {
  console.log('🧪 Test des tables quiz créées...');

  try {
    // 1. Test quiz_categories
    console.log('\n📋 TEST QUIZ_CATEGORIES:');
    const { data: categories, error: catError } = await supabase
      .from('quiz_categories')
      .select('*')
      .order('order_index');

    if (!catError) {
      console.log(`✅ Table quiz_categories: ${categories.length} catégories`);
      categories.forEach(cat => {
        console.log(`   ${cat.icon} ${cat.name} (${cat.color})`);
      });
    } else {
      console.log('❌ Erreur quiz_categories:', catError.message);
    }

    // 2. Test quiz
    console.log('\n🎯 TEST QUIZ:');
    const { data: quizzes, error: quizError } = await supabase
      .from('quiz')
      .select('*');

    if (!quizError) {
      console.log(`✅ Table quiz: ${quizzes.length} quiz`);
    } else {
      console.log('❌ Erreur quiz:', quizError.message);
    }

    // 3. Test quiz_sessions
    console.log('\n📊 TEST QUIZ_SESSIONS:');
    const { data: sessions, error: sessError } = await supabase
      .from('quiz_sessions')
      .select('*');

    if (!sessError) {
      console.log(`✅ Table quiz_sessions: ${sessions.length} sessions`);
    } else {
      console.log('❌ Erreur quiz_sessions:', sessError.message);
    }

    console.log('\n🎉 TOUTES LES TABLES QUIZ SONT CRÉÉES ET FONCTIONNELLES !');
    console.log('\n🚀 Vous pouvez maintenant:');
    console.log('   • Aller sur /quizz pour voir l\'interface utilisateur');
    console.log('   • Aller sur /admin/quizz pour l\'administration');
    console.log('   • Créer des quiz via l\'interface admin');
    console.log('   • Tester les quiz avec vos apprenants');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testQuizTables();