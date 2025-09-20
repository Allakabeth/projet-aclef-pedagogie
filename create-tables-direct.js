const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('🚀 Création directe des tables quiz...');

  try {
    // 1. Créer la table quiz_categories
    console.log('📋 Création de quiz_categories...');
    const { error: categoriesError } = await supabase
      .from('quiz_categories')
      .insert([
        { name: 'Test Category', description: 'Test', icon: '📋', color: '#3b82f6' }
      ]);

    if (categoriesError && !categoriesError.message.includes('already exists')) {
      console.log('Table quiz_categories n\'existe pas, création via SQL directe nécessaire');
    }

    // Vérifier les tables existantes
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (!tablesError) {
      console.log('📊 Tables existantes:', tables.map(t => t.table_name).filter(name => name.includes('quiz')));
    }

    // Essayer d'insérer les catégories par défaut si la table existe
    console.log('📝 Test insertion catégories...');
    const categoriesData = [
      { name: 'Mathématiques', description: 'Quiz de calcul et numération', icon: '🔢', color: '#f59e0b' },
      { name: 'Français', description: 'Quiz de lecture et orthographe', icon: '📖', color: '#3b82f6' },
      { name: 'Culture générale', description: 'Connaissances générales', icon: '🌍', color: '#10b981' },
      { name: 'Sciences', description: 'Quiz scientifiques', icon: '🔬', color: '#8b5cf6' },
      { name: 'Histoire', description: 'Quiz d\'histoire', icon: '📚', color: '#ef4444' },
      { name: 'Géographie', description: 'Quiz de géographie', icon: '🗺️', color: '#06b6d4' }
    ];

    for (const category of categoriesData) {
      const { error } = await supabase
        .from('quiz_categories')
        .upsert([category], { onConflict: 'name' });

      if (error) {
        console.log(`❌ Erreur pour ${category.name}:`, error.message);
      } else {
        console.log(`✅ Catégorie ${category.name} créée/mise à jour`);
      }
    }

    console.log('✅ Configuration des tables quiz terminée');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createTables();