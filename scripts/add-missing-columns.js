/**
 * Script pour ajouter les colonnes manquantes directement via RPC SQL
 * Utilise l'API REST de Supabase pour exécuter du SQL
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Lire .env.local manuellement
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')

let supabaseUrl = null
let supabaseKey = null

envLines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        supabaseKey = line.split('=')[1].trim()
    }
})

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement manquantes!')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
})

async function addColumns() {
    console.log('🔧 Ajout des colonnes manquantes...\n')

    try {
        // Note: Supabase JS client ne supporte pas l'exécution de SQL brut
        // On doit utiliser les fonctions PostgreSQL ou l'API REST directe

        // Approche: créer une fonction temporaire qui fait les ALTER TABLE
        console.log('📝 Création des colonnes via API REST...\n')

        // 1. Ajouter objectifs_generaux à formation_plans
        const sql1 = `
ALTER TABLE formation_plans
ADD COLUMN IF NOT EXISTS objectifs_generaux TEXT;
        `.trim()

        // 2. Ajouter ordre et objectif_specifique à formation_plan_competences
        const sql2 = `
ALTER TABLE formation_plan_competences
ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS objectif_specifique TEXT;
        `.trim()

        // 3. Créer index
        const sql3 = `
CREATE INDEX IF NOT EXISTS idx_formation_plan_competences_ordre
ON formation_plan_competences(plan_id, ordre);
        `.trim()

        console.log('⚠️  Supabase JS ne permet pas d\'exécuter directement du SQL ALTER TABLE')
        console.log('📝 Vous devez exécuter manuellement ces commandes SQL:\n')
        console.log('='.repeat(80))
        console.log(sql1)
        console.log()
        console.log(sql2)
        console.log()
        console.log(sql3)
        console.log('='.repeat(80))
        console.log('\n💡 Comment exécuter:')
        console.log('1. Aller sur: https://supabase.com/dashboard')
        console.log('2. Sélectionner votre projet')
        console.log('3. Aller dans "SQL Editor" (menu gauche)')
        console.log('4. Créer une "New query"')
        console.log('5. Copier-coller les commandes ci-dessus')
        console.log('6. Cliquer sur "Run" ou appuyer sur Ctrl+Enter')
        console.log('\nOU utiliser tout le fichier migration:')
        console.log('  supabase/migrations/20251010000002_adapt_formation_plans.sql\n')

    } catch (error) {
        console.error('❌ Erreur:', error.message)
        process.exit(1)
    }
}

addColumns()
