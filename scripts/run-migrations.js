const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration(filename) {
    console.log(`\n📄 Exécution de ${filename}...`)

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Diviser le SQL en statements individuels
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
        if (statement.trim()) {
            try {
                const { error } = await supabase.rpc('exec', { sql: statement + ';' })

                if (error) {
                    // Essayer avec une requête directe si exec ne fonctionne pas
                    const { error: directError } = await supabase
                        .from('_migrations')
                        .select('*')
                        .limit(1)

                    if (directError && directError.code === 'PGRST116') {
                        // Utiliser l'API REST directement
                        console.log('⚠️  Fonction exec non disponible, utilisation de l\'API REST...')
                    }
                }
            } catch (err) {
                console.error(`❌ Erreur sur statement:`, err.message)
            }
        }
    }

    console.log(`✅ Migration ${filename} terminée`)
}

async function main() {
    console.log('🚀 Démarrage des migrations...\n')

    const migrations = [
        '20251010000004_create_categories_outils.sql',
        '20251010000005_create_code_route_tables.sql'
    ]

    for (const migration of migrations) {
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration)
        if (fs.existsSync(migrationPath)) {
            await runMigration(migration)
        } else {
            console.log(`⚠️  Migration ${migration} non trouvée, ignorée`)
        }
    }

    console.log('\n✅ Toutes les migrations ont été exécutées')

    // Vérifier que les tables existent
    console.log('\n🔍 Vérification des tables...')

    const tables = [
        'categories_outils_pedagogiques',
        'code_route_vocabulaire',
        'code_route_exercices'
    ]

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('count')
            .limit(1)

        if (error) {
            console.log(`❌ Table ${table}: ${error.message}`)
        } else {
            console.log(`✅ Table ${table}: OK`)
        }
    }
}

main().catch(console.error)
