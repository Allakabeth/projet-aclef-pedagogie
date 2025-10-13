/**
 * Script simple pour vérifier si la migration est nécessaire
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

async function checkSchema() {
    console.log('🔍 Vérification du schéma de la base de données...\n')

    // Test objectifs_generaux
    const { data: testPlan, error: testError } = await supabase
        .from('formation_plans')
        .select('id, objectifs_generaux')
        .limit(1)
        .maybeSingle()

    if (testError && testError.code === 'PGRST204') {
        console.log('❌ Colonne manquante: formation_plans.objectifs_generaux')
    } else if (testError) {
        console.log('⚠️  Erreur test formation_plans:', testError.message)
    } else {
        console.log('✅ formation_plans.objectifs_generaux existe')
    }

    // Test ordre et objectif_specifique
    const { data: testComp, error: testCompError } = await supabase
        .from('formation_plan_competences')
        .select('id, ordre, objectif_specifique')
        .limit(1)
        .maybeSingle()

    if (testCompError && testCompError.code === 'PGRST204') {
        console.log('❌ Colonnes manquantes: formation_plan_competences.ordre ou objectif_specifique')
    } else if (testCompError) {
        console.log('⚠️  Erreur test formation_plan_competences:', testCompError.message)
    } else {
        console.log('✅ formation_plan_competences.ordre et objectif_specifique existent')
    }

    console.log('\n' + '='.repeat(80))
    console.log('📝 INSTRUCTIONS:')
    console.log('='.repeat(80))
    console.log('Si des colonnes manquent, exécutez le fichier SQL via Supabase Dashboard:')
    console.log('  Fichier: supabase/migrations/20251010000002_adapt_formation_plans.sql')
    console.log('  URL: https://supabase.com/dashboard → SQL Editor')
    console.log('='.repeat(80))
}

checkSchema()
