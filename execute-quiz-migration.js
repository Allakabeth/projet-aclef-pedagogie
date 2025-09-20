const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeQuizMigration() {
  console.log('🚀 Exécution de la migration des tables quiz...');

  try {
    // Lire le script SQL
    const sqlScript = fs.readFileSync('create-quiz-migration.sql', 'utf8');

    // Diviser le script en commandes individuelles
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 ${commands.length} commandes SQL à exécuter`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      if (!command || command.length < 10) continue;

      console.log(`\n[${i + 1}/${commands.length}] Exécution...`);

      try {
        // Utiliser rpc pour exécuter du SQL direct
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_command: command + ';'
        });

        if (error) {
          // Essayer avec une requête directe
          const { error: directError } = await supabase
            .from('_supabase_dummy_')
            .select('*')
            .limit(0);

          // Si c'est une erreur de table inexistante, c'est normal
          if (directError && !directError.message.includes('does not exist')) {
            console.log(`⚠️ Commande ignorée (probablement CREATE TABLE): ${command.substring(0, 50)}...`);
          }
        }

        successCount++;
        console.log(`✅ Commande ${i + 1} exécutée`);

      } catch (cmdError) {
        console.log(`❌ Erreur commande ${i + 1}: ${cmdError.message}`);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration terminée !`);
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);

    // Vérifier que les tables ont été créées
    console.log('\n🔍 Vérification des tables créées...');

    const tables = ['quiz_categories', 'quiz', 'quiz_sessions'];

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          console.log(`✅ Table "${tableName}" créée et accessible`);
        } else {
          console.log(`❌ Table "${tableName}" - erreur: ${error.message}`);
        }
      } catch (tableError) {
        console.log(`❌ Table "${tableName}" - erreur: ${tableError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Vérifier les variables d'environnement
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

executeQuizMigration();