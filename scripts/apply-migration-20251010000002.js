/**
 * Script pour appliquer la migration 20251010000002_adapt_formation_plans.sql
 * Ajoute les colonnes manquantes pour Phase 2
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes!')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
    try {
        console.log('🔧 Application de la migration 20251010000002_adapt_formation_plans.sql...\n')

        // Lire le fichier SQL
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251010000002_adapt_formation_plans.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        console.log('📄 Fichier de migration chargé\n')

        // Exécuter via RPC (requête raw SQL)
        // Note: Supabase JS n'a pas de méthode directe pour exécuter du SQL brut
        // On doit utiliser une fonction PostgreSQL ou faire des requêtes individuelles

        console.log('⚠️  Supabase JS ne supporte pas l\'exécution directe de fichiers SQL')
        console.log('📝 Instructions pour appliquer manuellement:\n')
        console.log('Option 1 - Via Supabase Dashboard:')
        console.log('  1. Aller sur https://supabase.com/dashboard/project/[YOUR_PROJECT]/editor')
        console.log('  2. Ouvrir l\'éditeur SQL')
        console.log('  3. Copier-coller le contenu de: supabase/migrations/20251010000002_adapt_formation_plans.sql')
        console.log('  4. Exécuter\n')

        console.log('Option 2 - Via Supabase CLI:')
        console.log('  supabase db push --db-url "<YOUR_DATABASE_URL>" --include-all\n')

        console.log('Option 3 - Via ce script avec ajout manuel:')
        console.log('  Je vais ajouter les colonnes via des requêtes Supabase JS séparées...\n')

        // Alternative: ajouter les colonnes une par une via des requêtes
        console.log('🔧 Tentative d\'ajout des colonnes via requêtes individuelles...\n')

        // Test si les colonnes existent déjà
        const { data: testPlan, error: testError } = await supabase
            .from('formation_plans')
            .select('id, objectifs_generaux')
            .limit(1)
            .maybeSingle()

        if (testError && testError.code === 'PGRST204') {
            console.log('⚠️  La colonne objectifs_generaux n\'existe pas encore')
            console.log('❌ Je ne peux pas l\'ajouter via Supabase JS')
            console.log('📝 Veuillez utiliser l\'une des options ci-dessus\n')
        } else if (testError) {
            console.log('❌ Erreur lors du test:', testError.message)
        } else {
            console.log('✅ La colonne objectifs_generaux existe déjà!')
        }

        // Test formation_plan_competences
        const { data: testComp, error: testCompError } = await supabase
            .from('formation_plan_competences')
            .select('id, ordre, objectif_specifique')
            .limit(1)
            .maybeSingle()

        if (testCompError && testCompError.code === 'PGRST204') {
            console.log('⚠️  Les colonnes ordre/objectif_specifique n\'existent pas encore')
            console.log('📝 Migration nécessaire\n')
        } else if (testCompError) {
            console.log('❌ Erreur lors du test:', testCompError.message)
        } else {
            console.log('✅ Les colonnes ordre et objectif_specifique existent déjà!')
        }

        console.log('\n' + '='.repeat(80))
        console.log('💡 SOLUTION RECOMMANDÉE:')
        console.log('='.repeat(80))
        console.log('1. Ouvrir Supabase Dashboard: https://supabase.com/dashboard')
        console.log('2. Aller dans SQL Editor')
        console.log('3. Exécuter le fichier: supabase/migrations/20251010000002_adapt_formation_plans.sql')
        console.log('='.repeat(80))

    } catch (error) {
        console.error('❌ Erreur:', error.message)
        process.exit(1)
    }
}

applyMigration()
