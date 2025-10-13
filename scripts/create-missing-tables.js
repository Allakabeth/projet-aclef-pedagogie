const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateTables() {
    console.log('🔍 Vérification des tables...\n')

    // Vérifier categories_outils_pedagogiques
    console.log('📋 Vérification de categories_outils_pedagogiques...')
    const { data: catData, error: catError } = await supabase
        .from('categories_outils_pedagogiques')
        .select('id')
        .limit(1)

    if (catError) {
        console.log('❌ Table categories_outils_pedagogiques n\'existe pas')
        console.log('⚠️  Veuillez exécuter la migration via le dashboard Supabase ou psql:')
        console.log('   supabase/migrations/20251010000004_create_categories_outils.sql')
    } else {
        console.log('✅ Table categories_outils_pedagogiques existe')

        // Compter les catégories
        const { count, error: countError } = await supabase
            .from('categories_outils_pedagogiques')
            .select('*', { count: 'exact', head: true })

        if (!countError) {
            console.log(`   → ${count || 0} catégories trouvées`)
        }
    }

    // Vérifier code_route_vocabulaire
    console.log('\n📚 Vérification de code_route_vocabulaire...')
    const { data: vocabData, error: vocabError } = await supabase
        .from('code_route_vocabulaire')
        .select('id')
        .limit(1)

    if (vocabError) {
        console.log('❌ Table code_route_vocabulaire n\'existe pas')
        console.log('⚠️  Veuillez exécuter la migration via le dashboard Supabase ou psql:')
        console.log('   supabase/migrations/20251010000005_create_code_route_tables.sql')
    } else {
        console.log('✅ Table code_route_vocabulaire existe')

        const { count, error: countError } = await supabase
            .from('code_route_vocabulaire')
            .select('*', { count: 'exact', head: true })

        if (!countError) {
            console.log(`   → ${count || 0} termes trouvés`)
        }
    }

    // Vérifier code_route_exercices
    console.log('\n✏️  Vérification de code_route_exercices...')
    const { data: exData, error: exError } = await supabase
        .from('code_route_exercices')
        .select('id')
        .limit(1)

    if (exError) {
        console.log('❌ Table code_route_exercices n\'existe pas')
        console.log('⚠️  Veuillez exécuter la migration via le dashboard Supabase ou psql:')
        console.log('   supabase/migrations/20251010000005_create_code_route_tables.sql')
    } else {
        console.log('✅ Table code_route_exercices existe')

        const { count, error: countError } = await supabase
            .from('code_route_exercices')
            .select('*', { count: 'exact', head: true })

        if (!countError) {
            console.log(`   → ${count || 0} exercices trouvés`)
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📝 INSTRUCTIONS POUR EXÉCUTER LES MIGRATIONS:')
    console.log('='.repeat(60))
    console.log('\nOption 1 - Via le Dashboard Supabase:')
    console.log('1. Aller sur https://supabase.com/dashboard')
    console.log('2. Sélectionner le projet')
    console.log('3. Aller dans "SQL Editor"')
    console.log('4. Copier/coller le contenu des fichiers de migration')
    console.log('5. Exécuter')
    console.log('\nOption 2 - Via Supabase CLI (si installé):')
    console.log('cd "C:\\Projet ACLEF\\projet-aclef-pédagogie"')
    console.log('npx supabase db push')
    console.log('\nOption 3 - Via psql (si accès direct):')
    console.log('psql "postgresql://..." < supabase/migrations/20251010000004_create_categories_outils.sql')
    console.log('psql "postgresql://..." < supabase/migrations/20251010000005_create_code_route_tables.sql')
    console.log('')
}

checkAndCreateTables().catch(console.error)
